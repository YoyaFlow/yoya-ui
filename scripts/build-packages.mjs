// 两个包的产物构建（拆包后的唯一构建入口）。
//
//   node scripts/build-packages.mjs
//
// 形态：**preserveModules**（dist 是 src 的模块镜像），因为
//   - `@yoyaflow/yoya-core/internal/*` 是库内深引用的正式通道，镜像保证它永远可解析；
//   - 不产生"core 被内联进 ui 产物"的副本（单例禁忌）；
//   - 压缩交给使用者的打包器，包本身只发可读 ESM。
//
// ui 侧把 `@yoyaflow/yoya-core*` 全部 external：core 由 peerDependency 提供。
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import { workspaceSourcePlugin } from './vite-workspace-plugin.mjs';
import { ensureWorkspaceLinks } from './workspace-links.mjs';

// 后续步骤（compiler-registry / 宿主冒烟）按**包名**import，链接先建好
console.log(`workspace 链接：${ensureWorkspaceLinks().join(' ') || '已就绪'}`);

const NODE_BUILTINS = /^node:/;
const CORE_SPECIFIER = /^@yoyaflow\/yoya-core(\/|$)/;

const PACKAGES = [
  { name: 'core', root: 'packages/yoya-core', external: [NODE_BUILTINS] },
  {
    name: 'ui',
    root: 'packages/yoya-ui',
    // 编译器包是 ui `./compiler` 壳的**可选 peer**：保持 external，不内联
    external: [NODE_BUILTINS, CORE_SPECIFIER, /^@yoyaflow\/yoya-compiler(\/|$)/]
  },
  {
    name: 'compiler',
    root: 'packages/yoya-compiler',
    // 编译器是**构建期工具**：`@babel/parser` 与 ui 的组件作者助手（下一步搬进 core）都保持 external；
    // `unplugin`（打包器插件外壳）与 `magic-string`（源码改写）是 plugin 入口的**运行期依赖**，同样 external
    // ——不 external 的话它们（连同 picomatch / @jridgewell/*）会被打进 `dist/node_modules/` 一起发布。
    external: [
      NODE_BUILTINS,
      CORE_SPECIFIER,
      /^@babel\/parser$/,
      /^@yoyaflow\/yoya-ui(\/|$)/,
      /^unplugin$/,
      /^magic-string$/
    ]
  }
];

/**
 * 包内每个源码模块都作为 input：preserveModules 下 dist 就是 src 的镜像。
 *
 * **`src/testing/**` 不进镜像**：那里是测试辅助模块（可以 import vitest 之类的测试框架），
 * 一旦进 dist 就会被 `files: ["dist"]` 一起发布（0.7.0 的 `conformance.js` 就是这么把
 * vitest 连同 chai / @vitest/* 共 0.54 MB 带进包里的）。同一条口径也在
 * `scripts/verify-packages.mjs` 里做了门禁。
 */
function moduleEntries(root) {
  return readdirSync(join(root, 'src'), { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .filter((file) => !file.includes('.test.'))
    .filter(
      (file) => !file.split(/[\\/]/).some((part) => part === 'node_modules' || part === 'testing')
    )
    .map((file) => join(root, 'src', file).replaceAll('\\', '/'));
}

async function buildPackage({ name, root, external }) {
  const dist = join(root, 'dist');
  rmSync(dist, { recursive: true, force: true });
  const bundle = await rolldown({ input: moduleEntries(root), external });
  await bundle.write({
    dir: dist,
    format: 'es',
    preserveModules: true,
    preserveModulesRoot: `${root}/src`
  });
  console.log(`${name}: dist = ${moduleEntries(root).length} 个模块镜像`);
}

for (const pkg of PACKAGES) {
  await buildPackage(pkg);
}

// 组件皮肤与 ECharts 运行时（`new URL('./echarts.min.js', import.meta.url)` 会解析到这里）
cpSync('packages/yoya-ui/src/yoya.ui.css', 'packages/yoya-ui/dist/yoya.ui.css');
mkdirSync('packages/yoya-ui/dist/chart', { recursive: true });
cpSync('packages/yoya-ui/src/chart/echarts.min.js', 'packages/yoya-ui/dist/chart/echarts.min.js');
// 旧发布面的两个位置：dist/yoya.compiler.js（bin，转发壳）与 dist/echarts.min.js
cpSync('packages/yoya-ui/dist/compiler.js', 'packages/yoya-ui/dist/yoya.compiler.js');
cpSync('packages/yoya-ui/dist/chart/echarts.min.js', 'packages/yoya-ui/dist/echarts.min.js');
console.log('assets: yoya.ui.css + chart/echarts.min.js');

// ---------------------------------------------------------------------------
// 发布路径兼容（§16/§17）：ui 的 dist 里**额外**产出旧命名的入口文件。
//
// - 增量入口 → 一行 re-export（core 仍走 peer，不内联）；
// - 自包含入口（core / api / 三个 .full）→ **真捆绑**，把 core 内联成单文件；
// - 同时产出 `.min.js`（旧发布面有它们）。
// 模块镜像（preserveModules）保留：那是 `/internal/*` 深引用的稳定落点。
const LEGACY_INCREMENTAL = [
  ['yoya.ui.js', 'ui.js'],
  ['yoya.actions.js', 'actions.js'],
  ['yoya.navigation.js', 'navigation.js'],
  ['yoya.feedback.js', 'feedback.js'],
  ['yoya.form.js', 'form.js'],
  ['yoya.data-display.js', 'data-display.js'],
  ['yoya.async.js', 'async.js'],
  ['yoya.router.js', 'router.js'],
  ['yoya.ssr.js', 'ssr.js'],
  ['yoya.echart.js', 'echart.js'],
  ['yoya.three.js', 'three.js'],
  ['yoya.devtools.js', 'devtools.js'],
  ['yoya.compiler-runtime.js', 'compiler-runtime.js']
];

const UI_DIST = 'packages/yoya-ui/dist';
for (const [legacy, target] of LEGACY_INCREMENTAL) {
  const code = `// 老路径的转发入口（发布路径兼容）：真正的模块在 \`./${target}\`。\nexport * from './${target}';\n`;
  writeFileSync(join(UI_DIST, legacy), code);
  writeFileSync(join(UI_DIST, legacy.replace(/\.js$/, '.min.js')), code);
}

// 自包含入口：core / api / 三个 .full —— 直接打**源码入口**（core 会内联成单文件）。
// 关键：走 workspace 解析插件（`@yoyaflow/yoya-core*` → `packages/yoya-core/src/*`）。
// 否则裸包名会被解析到 core 的 **dist 镜像**，同一份 bundle 里就出现两份 core（单例失配）。
const SELF_CONTAINED = [
  ['yoya.core.js', 'packages/yoya-core/src/index.js'],
  ['yoya.api.js', 'packages/yoya-core/src/api.js'],
  ['yoya.ui.full.js', 'packages/yoya-ui/src/ui-full.js'],
  ['yoya.router.full.js', 'packages/yoya-ui/src/router-full.js'],
  ['yoya.ui-router.full.js', 'packages/yoya-ui/src/ui-router.js']
];

for (const [legacy, source] of SELF_CONTAINED) {
  for (const minify of [false, true]) {
    const bundle = await rolldown({
      // rolldown 的 input 用**绝对路径 + 正斜杠**（Windows 反斜杠 / 点目录会被当成裸说明符）
      input: resolve(source).replaceAll('\\', '/'),
      external: [NODE_BUILTINS],
      plugins: [workspaceSourcePlugin()]
    });
    await bundle.write({
      dir: UI_DIST,
      format: 'es',
      minify,
      codeSplitting: false,
      entryFileNames: minify ? legacy.replace(/\.js$/, '.min.js') : legacy
    });
  }
}
console.log(
  `legacy 入口：${LEGACY_INCREMENTAL.length} 个转发 + ${SELF_CONTAINED.length} 个自包含（含 .min）`
);
