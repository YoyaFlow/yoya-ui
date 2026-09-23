/**
 * 随包发布的**库内组件注册表**（票 11）。
 *
 * 口径（每一条都为了"核心库 / UI 组件库单元隔离"）：
 *
 * - **形状推导，不写名单**：扫 `src`（排除 `src/examples`、测试与 `src/compiler`）的顶层导出函数 /
 *   类，逐个**试着编**——编得出来就进注册表。编译器不认识任何组件名；
 * - **不碰 src 路径**：生成的模块里对组件的引用一律走**包内入口**（组件按分类入口、`src/svg/*`
 *   按 `/core`），运行期钩子走 `/compiler-runtime`。包只发布 `dist/`，源码路径在包里不存在；
 * - **键按包名**：`@yoyaflow/yoya-ui#vCard`——使用者从 `.` / `/ui` / `/data-display` 哪个入口
 *   import 都命中同一条目（见 `component-key.js` 的 `packageNameOf`）；
 * - **不进任何默认入口**：产物是独立文件 + 独立子路径导出，主入口 / core / UI 入口都不 import 它；
 *
 * 产物：
 *   dist/yoya.compiled-registry.js      运行期注册表（`bind` / `render` / `hash` / `plan`）
 *   dist/yoya.compiled-registry.min.js  压缩版（体积口径）
 *   dist/yoya.compiled-registry.json    纯数据（无 ops，供工具 / 排查）
 *
 * 中间文件（每个组件一个实例化模块）写在 `build/compiled-registry/`，打进上面的 bundle 后就删掉。
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import { buildComponentRegistry } from '../src/compiler/registry.js';
import { componentKeyOf } from '../src/compiler/component-key.js';
import * as core from '../src/yoya.core.js';

const PACKAGE_NAME = JSON.parse(readFileSync('package.json', 'utf8')).name;
const RUNTIME_SPECIFIER = `${PACKAGE_NAME}/compiler-runtime`;
const CORE_SPECIFIER = `${PACKAGE_NAME}/core`;
/** 分类目录 → 包内入口（组件都从分类入口再导出；这份表只描述打包路径，不认识组件名）。 */
const CATEGORY_ENTRIES = {
  actions: 'actions',
  navigation: 'navigation',
  feedback: 'feedback',
  form: 'form',
  'data-display': 'data-display',
  async: 'async'
};

/** 组件文件 → scope 模块的来源：分类入口优先，`svg`（图标）走 core，其余回落 `/ui`。 */
function scopeEntryOf(file) {
  const category = file.replace(/^src[\\/]/, '').split(/[\\/]/)[0];
  if (CATEGORY_ENTRIES[category]) {
    return `${PACKAGE_NAME}/${CATEGORY_ENTRIES[category]}`;
  }
  if (category === 'svg') {
    return CORE_SPECIFIER;
  }
  return `${PACKAGE_NAME}/ui`;
}

/** 扫描目录里的候选组件（顶层导出函数 / 类），排除测试、示例与编译工具本身。 */
function candidateFiles() {
  return readdirSync('src', { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !file.includes('.test.'))
    .filter((file) => !file.split(/[\\/]/)[0].includes('compiler'))
    .filter((file) => !file.split(/[\\/]/)[0].includes('examples'))
    .map((file) => join('src', file));
}

/** 形状扫描：`src` 里所有顶层导出函数 / 类都是候选（编不出来就跳过，不写组件名单）。 */
export function registryCandidates() {
  const entries = [];
  for (const file of candidateFiles()) {
    const source = readFileSync(file, 'utf8');
    const names = [
      ...new Set(
        [...source.matchAll(/export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/g)].map(
          (match) => match[1]
        )
      )
    ];
    names.forEach((name) => entries.push({ file, export: name }));
    // 快捷名条目（票 15 §Q4）：`export const vXxx = createComponentShortcut(VXxx)` ——
    // 调用点写快捷名，所以注册表也要有快捷名的键；编译的是它的定义。
    [
      ...source.matchAll(
        /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*createComponentShortcut\(\s*([A-Za-z_$][\w$]*)/g
      )
    ].forEach((match) => entries.push({ file, export: match[1], definition: match[2] }));
  }
  return entries;
}

/**
 * 产出随包发布的注册表（构建脚本与测试共用同一份口径）。
 *
 * @param {object} [options]
 * @param {string} [options.outDir] 产物目录（默认 `dist`）
 * @param {string} [options.tmpDir] 中间文件目录（默认 `build/compiled-registry`，会被清空）
 */
export async function buildPackagedRegistry({
  outDir = 'dist',
  tmpDir = 'build/compiled-registry'
} = {}) {
  const entries = registryCandidates();
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const built = buildComponentRegistry({
    entries,
    dir: tmpDir,
    core,
    runtime: RUNTIME_SPECIFIER,
    registryName: 'components.registry.js',
    dataName: 'components.registry.json',
    // 键与 scope 都按打包口径（不是"相对项目根的文件路径"）
    keyOf: (entry) => componentKeyOf(PACKAGE_NAME, entry.export),
    scopeSpecifierOf: (entry) => scopeEntryOf(entry.file)
  });

  // 注册表入口：把生成的注册表模块再导出，并带上构建口径的元数据（插件据此判断能不能混用）
  const entryModule = [
    '// 由 scripts/compiler-registry.mjs 生成 —— 请勿手改。',
    '// 库内组件注册表：调用点只做链接；未命中 / 哈希对不上就回落通用路径。',
    `export { components } from './components.registry.js';`,
    `export const coreSpecifier = ${JSON.stringify(CORE_SPECIFIER)};`,
    `export const runtimeSpecifier = ${JSON.stringify(RUNTIME_SPECIFIER)};`,
    `export const registryVersion = 1;`,
    ''
  ].join('\n');
  writeFileSync(join(tmpDir, 'entry.js'), entryModule, 'utf8');

  // 打成单文件入口（`@yoyaflow/yoya-ui/*` 保持 external：由使用者那一侧解析、tree-shake）
  const isExternal = (id) => id.startsWith(`${PACKAGE_NAME}/`);
  // rolldown 的 input 走**绝对路径 + 正斜杠**：相对路径在 Windows 上会给反斜杠，
  // 以 `.` 开头的目录（`.scratch/...`）还会被当成裸模块说明符
  const entryPath = resolve(tmpDir, 'entry.js').replaceAll('\\', '/');
  const bundle = await rolldown({ input: entryPath, external: isExternal });
  await bundle.write({
    dir: outDir,
    format: 'es',
    entryFileNames: 'yoya.compiled-registry.js',
    codeSplitting: false
  });

  const minBundle = await rolldown({ input: entryPath, external: isExternal });
  await minBundle.write({
    dir: outDir,
    format: 'es',
    entryFileNames: 'yoya.compiled-registry.min.js',
    minify: true,
    codeSplitting: false
  });

  // 纯数据（构建期）：`ops` / `factory` 只在**编译调用点**时用（把组件片段嵌进调用方片段），
  // 由插件在 Node 里读这个 JSON——因此它不进使用者的 bundle；模块那边只放运行期要的
  // `bind` / `render` / `hash` / `plan`。
  const data = {
    version: built.registry.version,
    coreSpecifier: CORE_SPECIFIER,
    runtimeSpecifier: RUNTIME_SPECIFIER,
    components: Object.fromEntries(
      Object.entries(built.registry.components).map(([key, entry]) => [
        key,
        {
          file: entry.file,
          export: entry.export,
          hash: entry.hash,
          factory: entry.factory,
          ops: entry.ops,
          plan: entry.plan
        }
      ])
    )
  };
  writeFileSync(
    join(outDir, 'yoya.compiled-registry.json'),
    `${JSON.stringify(data, null, 2)}\n`,
    'utf8'
  );

  const compiled = Object.keys(built.registry.components);
  // 中间产物（每组件一个实例化模块 + 未裁剪的 JSON）已经打进 bundle / 裁成上面的 JSON，删掉它们
  rmSync(tmpDir, { recursive: true, force: true });
  if (compiled.length === 0) {
    throw new Error('库内组件注册表为空：形状扫描没有产出任何可编条目（检查 src 扫描口径）');
  }
  return {
    outDir,
    compiled,
    skipped: built.skipped,
    candidates: entries.length,
    files: {
      module: join(outDir, 'yoya.compiled-registry.js'),
      minModule: join(outDir, 'yoya.compiled-registry.min.js'),
      data: join(outDir, 'yoya.compiled-registry.json')
    }
  };
}

/** 直接跑（`node scripts/compiler-registry.mjs` / `npm run build:registry`）时打印摘要。 */
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const result = await buildPackagedRegistry();
  const size = (path) => (readFileSync(path).length / 1024).toFixed(1);
  console.log(
    `库内组件注册表：候选 ${result.candidates} · 可编 ${result.compiled.length} · 跳过 ${result.skipped.length}`
  );
  console.log(
    `  ${result.files.module} ${size(result.files.module)} KB` +
      ` · .min.js ${size(result.files.minModule)} KB` +
      ` · .json ${size(result.files.data)} KB`
  );
  console.log(
    '  导入面：@yoyaflow/yoya-ui/core（图标）/ /ui / /<分类>（组件）+ /compiler-runtime——不引用 src 路径'
  );
}
