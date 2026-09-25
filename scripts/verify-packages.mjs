// 包边界门禁（`npm run verify:packages`）：不构建，只对**源码 + 包元数据**断言拆分的硬口径。
//
// 断言四件事：
//   1) core 的源码不引用快线（yoya-uiuc / 组件域），core 的 exports 里也没有组件子入口；
//   2) 快线把 core 声明成 peerDependency（^0.7.0），且**不**把它列进 dependencies（不许内联/自带副本）；
//   3) 组件域只在快线里实现（core 目录下不存在 layout/actions/form/… 这类组件域目录）；
//   4) 只有契约包同时 import 两个包（业务源码不许两边都引）。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const failures = [];
const ok = (message) => console.log(`  ✓ ${message}`);
const bad = (message) => {
  failures.push(message);
  console.log(`  ✗ ${message}`);
};

const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const CORE = 'packages/yoya-core';
const UI = 'packages/yoya-ui';

const listJs = (dir) => {
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs)$/.test(entry.name)) out.push(relative(ROOT, full).split('\\').join('/'));
    }
  };
  if (existsSync(join(ROOT, dir))) walk(join(ROOT, dir));
  return out;
};

console.log('包边界门禁（npm run verify:packages）');

// 1) core 不依赖快线
console.log('\n[1] core 不依赖快线');
const coreFiles = listJs(`${CORE}/src`).filter((file) => !file.includes('.test.'));
// `Symbol.for('@yoyaflow/yoya-ui/element-factory')` 是**全局符号键**，拆包时刻意保持不变
// （第三方已经用它互操作）；判定前先把它抹掉，只看真正的依赖引用。
const stripSymbolKeys = (text) => text.replace(/Symbol\.for\(\s*'[^']*'\s*\)/g, 'Symbol.for(...)');
const coreRefs = coreFiles.filter((file) =>
  /@yoyaflow\/yoya-ui/.test(stripSymbolKeys(readFileSync(join(ROOT, file), 'utf8')))
);
if (coreRefs.length === 0) ok(`core 源码 ${coreFiles.length} 个文件里 0 处引用 @yoyaflow/yoya-ui`);
else bad(`core 源码引用了快线：${coreRefs.join(', ')}`);

const corePkg = readJson(`${CORE}/package.json`);
const coreExports = Object.keys(corePkg.exports ?? {});
const leaked = coreExports.filter((key) =>
  /^\.\/(layout|actions|navigation|feedback|form|data-display|async|i18n|theme|effects|router|chart|three)/.test(
    key
  )
);
if (leaked.length === 0) ok(`core 的 exports 只有原语入口：${coreExports.join(' ')}`);
else bad(`core 的 exports 里出现了组件子入口：${leaked.join(', ')}`);

// 2) 快线把 core 当 peer
console.log('\n[2] 快线把 core 当 peerDependency');
const uiPkg = readJson(`${UI}/package.json`);
const peer = uiPkg.peerDependencies?.['@yoyaflow/yoya-core'];
if (typeof peer === 'string' && /^\^0\./.test(peer))
  ok(`peerDependencies: @yoyaflow/yoya-core ${peer}`);
else bad(`组件包的 peerDependencies 缺少 @yoyaflow/yoya-core ^<major>（当前 ${peer ?? '缺失'}）`);
if (uiPkg.dependencies?.['@yoyaflow/yoya-core'])
  bad('组件包把 core 列为 dependencies（会带上副本）');
else ok('组件包没有把 core 列进 dependencies');

// 3) 组件域只在快线里
console.log('\n[3] 组件域只在快线里实现');
const UI_DOMAINS = [
  'layout',
  'actions',
  'navigation',
  'feedback',
  'form',
  'data-display',
  'async',
  'i18n',
  'theme',
  'effects',
  'router',
  'chart',
  'three'
];
const misplaced = UI_DOMAINS.filter((domain) => existsSync(join(ROOT, CORE, 'src', domain)));
if (misplaced.length === 0) ok(`core/src 下没有组件域目录（快线有 ${UI_DOMAINS.length} 个）`);
else bad(`core/src 下出现组件域目录：${misplaced.join(', ')}`);

// 4) 只有契约包同时引两个包
console.log('\n[4] 只有契约包同时 import 两个包');
const dualUsers = [];
for (const file of [...listJs(`${CORE}/src`), ...listJs(`${UI}/src`)]) {
  if (file.includes('.test.')) continue;
  // 编译器是**例外**（票 06「编译器只懂形状」）：它必须认得两个包名，才能把
  // "使用者从哪个入口 import 的"归口到注册表键；它不认识任何组件名。
  if (file.startsWith(`${UI}/src/compiler`) || file === `${UI}/src/compiler.js`) continue;
  const text = readFileSync(join(ROOT, file), 'utf8');
  const importsCore = /from\s*['"]@yoyaflow\/yoya-core/.test(text);
  const importsUi = /from\s*['"]@yoyaflow\/yoya-ui/.test(text);
  if (importsCore && importsUi) dualUsers.push(file);
}
if (dualUsers.length === 0) ok('库源码里只有契约层与编译器同时认得两个包名');
else bad(`这些文件同时 import 两个包：${dualUsers.join(', ')}`);

console.log('');
// 5) 编译器包：不认识组件，且 ui 里只剩壳
console.log('\n[5] 编译器独立成包、且不认识组件');
const COMPILER = 'packages/yoya-compiler';
const compilerPkg = readJson(`${COMPILER}/package.json`);
const UI_DOMAIN_RE =
  /(?:@yoyaflow\/yoya-ui\/(layout|actions|navigation|feedback|form|data-display|async|i18n|theme|effects|router|chart|three))|(?:from '\.\.\/(layout|actions|navigation|feedback|form|data-display|async|i18n|theme|effects|router|chart|three)\/)/;
// 只看**生产代码**：测试里会出现 ui 入口路径当夹具数据（注册表键/入口映射），那不是依赖
const compilerOffenders = listJs(`${COMPILER}/src`)
  .filter((file) => !file.includes('.test.'))
  .filter((file) => !file.includes('/fixtures/'))
  .filter((file) => UI_DOMAIN_RE.test(readFileSync(join(ROOT, file), 'utf8')));
if (compilerOffenders.length === 0) {
  ok('编译器包源码不 import 任何组件域（只消费 core 的接口表 + 可选注册表数据）');
} else {
  bad(`编译器包 import 了组件域：${compilerOffenders.join(', ')}`);
}
if (UI_DOMAIN_RE.test(readFileSync(join(ROOT, `${COMPILER}/package.json`), 'utf8'))) {
  // package.json 里出现组件域只可能是 peer/依赖写错
  bad('编译器包的 package.json 里出现了组件域');
} else {
  ok(
    `编译器包只把 core 当必需 peer，ui 是可选 peer（${Object.keys(compilerPkg.peerDependencies ?? {}).join(' ')}）`
  );
}
if (compilerPkg.dependencies) bad('编译器包不该有 dependencies（构建期依赖走 peer）');
else ok('编译器包没有 dependencies');
// 编译器只依赖 core：源码里不该 **import** ui。
// 注意区分：`@yoyaflow/yoya-ui/compiled-registry`、`/compiler-runtime` 是**产物里要写的说明符**
// （字符串常量，不是依赖）；`isCoreLikeSpecifier` 也刻意同时认两个包名——那是"认入口"，不是"认组件"。
const uiRefs = listJs(`${COMPILER}/src`)
  .filter((file) => !file.includes('.test.'))
  .filter((file) => !file.includes('/fixtures/'))
  .filter((file) =>
    /from\s*['"]@yoyaflow\/yoya-ui/.test(
      readFileSync(join(ROOT, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '') // 注释里的示例 import 不算依赖
        .replace(/^\s*\/\/.*$/gm, '')
    )
  );
if (uiRefs.length === 0) ok('编译器包源码 0 处 import ui（接口表与助手都来自 core）');
else bad(`编译器包 import 了 ui：${uiRefs.join(', ')}`);
const uiCompilerPkg = readJson(`${UI}/package.json`);
if (uiCompilerPkg.peerDependenciesMeta?.['@yoyaflow/yoya-compiler']?.optional) {
  ok('ui 把编译器包声明成**可选** peer（老子入口照旧可用，不强制安装）');
} else {
  bad('ui 的 @yoyaflow/yoya-compiler 必须是可选 peer（否则运行期用户被迫装编译器）');
}
const uiCompilerDir = join(ROOT, UI, 'src/compiler');
const engineLeftovers = existsSync(uiCompilerDir)
  ? readdirSync(uiCompilerDir).filter((name) => name !== 'runtime.js')
  : [];
if (!existsSync(uiCompilerDir)) ok('ui 侧已经没有 compiler/ 目录（引擎与运行期钩子都搬走了）');
else if (engineLeftovers.length === 0) {
  bad('ui 的 compiler/ 目录还在（只应剩转发壳）');
} else {
  bad(`ui 里还留着编译器文件：${engineLeftovers.join(', ')}`);
}
const coreHooks = `${CORE}/src/core/compiler-runtime.js`;
if (existsSync(join(ROOT, coreHooks))) {
  const hooksSource = readFileSync(join(ROOT, coreHooks), 'utf8');
  const uiImport = /from\s*['"]@yoyaflow\/yoya-ui/.test(
    hooksSource.replace(/\/\*[\s\S]*?\*\//g, '')
  );
  if (uiImport) bad('运行期钩子（core）不该 import ui');
  else ok('运行期钩子在 core，且不认识 ui');
} else {
  bad(`core 里找不到运行期钩子：${coreHooks}`);
}

console.log('');
// 6) 发布源码的第三方依赖口径
console.log('\n[6] 发布源码的第三方 import');
const TEST_LIBS =
  /^(vitest|chai|tinyrainbow|jsdom|playwright-core|@vitest\/|@playwright\/|@testing-library\/)/;
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const thirdPartySpecifiers = (text) => {
  const out = [];
  for (const match of stripComments(text).matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const spec = match[1];
    if (spec.startsWith('.') || spec.startsWith('node:') || spec.startsWith('@yoyaflow/')) continue;
    out.push(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
  }
  return out;
};
for (const dir of [CORE, UI, COMPILER]) {
  const pkg = readJson(`${dir}/package.json`);
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {})
  ]);
  // 只查**会发布**的源码：测试文件与 `src/testing/**`（构建脚本已排除，允许 import 测试框架）
  const shipped = listJs(`${dir}/src`).filter(
    (file) => !file.includes('.test.') && !file.includes('/testing/')
  );
  const testLibImports = [];
  const undeclared = [];
  for (const file of shipped) {
    for (const spec of thirdPartySpecifiers(readFileSync(join(ROOT, file), 'utf8'))) {
      if (TEST_LIBS.test(spec)) testLibImports.push(`${file} → ${spec}`);
      else if (!declared.has(spec)) undeclared.push(`${file} → ${spec}`);
    }
  }
  if (testLibImports.length === 0) ok(`${dir}: 发布源码 0 处 import 测试框架`);
  else
    bad(
      `${dir}: 发布源码 import 了测试框架（会被打进 dist 一起发布）：` +
        testLibImports.slice(0, 3).join(' | ')
    );
  if (undeclared.length === 0) ok(`${dir}: 第三方 import 都在 dependencies / peerDependencies 里`);
  else
    bad(
      `${dir}: 有未声明的第三方依赖（external 名单也得跟着改）：` +
        [...new Set(undeclared)].slice(0, 5).join(' | ')
    );
}

console.log('');
if (failures.length) {
  console.log(`verify-packages: ${failures.length} 条不通过`);
  process.exitCode = 1;
} else {
  console.log('verify-packages: 全部通过');
  void statSync;
}
