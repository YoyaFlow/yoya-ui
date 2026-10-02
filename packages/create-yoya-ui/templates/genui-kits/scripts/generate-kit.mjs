#!/usr/bin/env node
/**
 * kit.json 生成器（模板自带：纯 Node、无依赖，随便改）。
 *
 * 职责只有一条：把 `components/<族>/component.json`（组件元数据真相源）编译成
 * `kit.json`（GenUI 宿主唯一要指向的入口）+ `indexes/*.json`（可再生的投影）。
 *
 * 纪律：
 * 1. 组件清单、描述、props 契约都只写在 `component.json` 里，本文件不维护第二份；
 * 2. **版本只有一处**：`package.json` 的 `version` —— 生成时写进 `kit.json`，
 *    同时核对运行时实现（`impl.js`）里的 `KIT_VERSION`，两边不齐就报错（`--check` 同样拦）；
 * 3. `--check` 是 CI 门禁：生成结果与仓库里那份不一致就退出码 1（`npm run kit:check`）。
 *
 * 用法：
 *
 * ```sh
 * npm run kit:generate   # 生成并写盘
 * npm run kit:check      # 门禁：清单与实现同真
 * ```
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const kitPath = join(root, 'kit.json');
const indexesDir = join(root, 'indexes');
const componentsDir = join(root, 'components');
const check = process.argv.includes('--check');

/** 分类词表：超出的分类要先在这里（或 kit.json 的 categoryVocabulary）登记。 */
const DEFAULT_CATEGORY_VOCABULARY = [
  'layout',
  'actions',
  'form',
  'data-display',
  'feedback',
  'navigation',
  'media',
  'basic'
];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/** 只在内容真的变了时写盘；`--check` 下不一致就是门禁失败。 */
async function writeIfChanged(path, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  let current = null;

  try {
    current = await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  if (current === next) return false;

  if (check) {
    console.error(`[kit] 与源码不一致（跑 npm run kit:generate 重生成）：${relative(root, path)}`);
    process.exitCode = 1;
    return false;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next, 'utf8');
  console.log(`[kit] 已写入 ${relative(root, path)}`);
  return true;
}

/** 相对路径必须落在 kit 目录内：runtime.entry / component.entry 都不许逃逸。 */
function safeRelative(baseDir, value, field) {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${field} 必须是非空相对路径`);
  }

  const target = resolve(baseDir, value);
  const relativePath = relative(baseDir, target);

  if (isAbsolute(value) || relativePath.startsWith('..')) {
    throw new Error(`${field} 必须留在 ${relative(root, baseDir) || '.'} 目录内`);
  }

  return relativePath;
}

function assertStringArray(value, field, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label}: ${field} 必须是字符串数组`);
  }
}

/** 运行时实现里的元数据必须与 kit.json 同真（这一段就是门禁的判据）。 */
function assertRuntimeMetadata(implementation, fragments, label) {
  for (const fragment of fragments) {
    if (!implementation.includes(fragment)) {
      throw new Error(
        `${label} 与 kit.json 的元数据不一致：缺少 ${fragment}\n` +
          '        把这段元数据抄进实现文件（或反过来改 kit.json），两边必须同真。'
      );
    }
  }
}

const {
  components: existingComponents,
  generated: existingGenerated,
  ...config
} = await readJson(kitPath);

if (!/^[^/\\@]+\/[^/\\@]+$/.test(config.namespace ?? '')) {
  throw new Error('kit.json 的 namespace 必须形如 owner/repo（如 my-org/my-kit）');
}
if (typeof config.repo !== 'string' || config.repo === '') {
  throw new Error('kit.json 的 repo 必须是非空字符串（组件来源要能追溯）');
}

const packageJson = await readJson(join(root, 'package.json'));
const version = packageJson.version;

if (typeof version !== 'string' || version === '') {
  throw new Error('package.json 缺少 version（版本以它为准）');
}
if (existingComponents !== undefined && !check && config.version !== version) {
  console.log(`[kit] 版本对齐 package.json：${config.version} → ${version}`);
}

const categoryVocabulary = config.categoryVocabulary ?? DEFAULT_CATEGORY_VOCABULARY;

if (
  !Array.isArray(categoryVocabulary) ||
  categoryVocabulary.some((item) => typeof item !== 'string')
) {
  throw new Error('kit.json 的 categoryVocabulary 必须是字符串数组');
}

const allowedCategories = new Set(categoryVocabulary);
const runtime = config.runtime ?? {};

safeRelative(root, runtime.entry, 'runtime.entry');

if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(runtime.export ?? '')) {
  throw new Error('runtime.export 必须是合法的 JavaScript 导出名（kit.json 的 runtime.export）');
}

const entries = (await readdir(componentsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .sort((left, right) => left.name.localeCompare(right.name));
const components = [];
const seenNames = new Set();

/**
 * 一个目录可以声明**多个**组件（`components: [...]`），也可以只声明一个（顶层即组件清单）。
 * 多组件形态共享同一份实现与同一个 runtime 入口 —— 一个 kit 制品注册一族组件，
 * 目录级 `entry` 是默认值，单个组件条目可以覆盖。
 */
for (const entry of entries) {
  const componentRoot = resolve(componentsDir, entry.name);
  const declared = await readJson(join(componentRoot, 'component.json'));
  const listed = Array.isArray(declared.components) ? declared.components : [declared];
  const sharedEntry = typeof declared.entry === 'string' ? declared.entry : undefined;

  if (listed.length === 0) {
    throw new Error(`${entry.name}: component.json 至少要声明一个组件`);
  }
  if (Array.isArray(declared.components) && declared.shortName !== undefined) {
    throw new Error(`${entry.name}: shortName（单组件）与 components[]（多组件）二选一`);
  }

  for (const component of listed) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(component.shortName ?? '')) {
      throw new Error(`${entry.name}: shortName 必须是 PascalCase（如 PanelKit）`);
    }
    if (component.name !== undefined) {
      throw new Error(`${entry.name}: component.json 不写 name —— 全名由生成器按 namespace 展开`);
    }
    if (!allowedCategories.has(component.category ?? '')) {
      throw new Error(
        `${entry.name}: 分类 "${component.category}" 不在词表里（可选：${categoryVocabulary.join(' / ')}）`
      );
    }

    for (const field of ['summary', 'dataContract']) {
      if (typeof component[field] !== 'string' || component[field] === '') {
        throw new Error(`${entry.name}: ${field} 必须是非空字符串（这是给模型选型看的一句话）`);
      }
    }

    for (const field of ['scenes', 'whenToUse', 'notFor', 'pitfalls']) {
      assertStringArray(component[field] ?? [], field, entry.name);
    }

    if (
      !component.props ||
      typeof component.props !== 'object' ||
      Array.isArray(component.props) ||
      Object.values(component.props).some((value) => typeof value !== 'string')
    ) {
      throw new Error(`${entry.name}: props 必须是"属性名 → 契约描述"的对象`);
    }

    const entryRelative = safeRelative(
      componentRoot,
      component.entry ?? sharedEntry,
      `${entry.name}.entry`
    );
    const implementation = await readFile(resolve(componentRoot, entryRelative), 'utf8');
    const fullName = `${config.namespace}#${component.shortName}`;

    if (seenNames.has(fullName)) throw new Error(`组件名重复：${fullName}`);

    seenNames.add(fullName);
    assertRuntimeMetadata(
      implementation,
      [
        `export const KIT_NAMESPACE = '${config.namespace}';`,
        `export const KIT_VERSION = '${version}';`,
        `repo: '${config.repo}',`,
        `source: 'components/${entry.name}/${entryRelative.replaceAll('\\', '/')}'`
      ],
      `components/${entry.name}/${entryRelative.replaceAll('\\', '/')}`
    );

    components.push({
      ...component,
      entry: entryRelative.replaceAll('\\', '/'),
      name: fullName
    });
  }
}

if (components.length === 0) {
  throw new Error('components/ 下没有任何组件目录（每个目录一份 component.json）');
}

const byCategory = {};
const byScene = {};

for (const component of components) {
  (byCategory[component.category] ??= []).push(component.name);

  for (const scene of component.scenes ?? []) {
    (byScene[scene] ??= []).push(component.name);
  }
}

await writeIfChanged(kitPath, {
  ...config,
  version,
  generated: existingGenerated ?? {
    from: 'components/*/component.json',
    command: 'npm run kit:generate'
  },
  components
});
await writeIfChanged(join(indexesDir, 'by-category.json'), byCategory);
await writeIfChanged(join(indexesDir, 'by-scene.json'), byScene);

if (!check) {
  console.log(`[kit] ${components.length} 个组件 · namespace ${config.namespace}@${version}`);
}
