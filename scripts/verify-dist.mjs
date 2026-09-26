// 产物门禁（`npm run verify:dist`）：拆包后的六条检查。
//
//   1. exports 里每个公开子入口在 dist 里真的有文件；
//   2. 边界：core 的 dist 里没有组件域；ui 的 dist 里没有 core 的模块副本；
//   3. ui 的 dist 只通过**裸包名**引 core（不许相对路径钻进 core 目录）；
//   4. 宿主单例冒烟：两包各装一次（workspace 链接），core 原语 + 组件一起渲染成 HTML，
//      且身份判定（componentNameOf）成立——这条正是 docs/ssr.md 的"双副本失配"禁忌；
//   5. compiler bin 可执行（`node dist/compiler.js --help`，顺带验 shebang）；
//   6. README 体积表 + 基准表与当前产物 / 数据源一致。
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compareBenchmarkTables, readBenchmarkResults } from './benchmark-report.mjs';
import { collectBundleReport, compareReadmeSizes } from './bundle-metrics.mjs';
import { ensureWorkspaceLinks } from './workspace-links.mjs';

const ROOT = process.cwd();
const PACKAGES = {
  'yoya-core': 'packages/yoya-core',
  'yoya-ui': 'packages/yoya-ui',
  'yoya-compiler': 'packages/yoya-compiler'
};
const FAILURES = [];
const ok = (message) => console.log(`  ✓ ${message}`);
const bad = (message) => {
  FAILURES.push(message);
  console.log(`  ✗ ${message}`);
};
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(relative(ROOT, full).split('\\').join('/'));
  }
  return out;
};

console.log('产物门禁（npm run verify:dist）');

// 1) exports → dist 文件
console.log('\n[1] exports 指向的产物都在');
for (const [name, dir] of Object.entries(PACKAGES)) {
  const pkg = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    if (key === './package.json' || key.startsWith('./internal/')) continue;
    const target = typeof value === 'string' ? value : value.import;
    if (!target) continue;
    if (
      existsSync(join(ROOT, dir, target)) ||
      existsSync(join(ROOT, dir, target.replace(/\.js$/, '')))
    ) {
      ok(`${name} ${key} → ${target}`);
    } else {
      bad(`${name} ${key} 的产物缺失：${target}`);
    }
  }
}

// 2) 边界
// 1b) 入口口径：exports / main / module 指向的入口必须是**薄入口**
//
// 自包含（core 内联）只允许出现在 CDN 口径的独立文件里（`dist/yoya.*.full*.js`、
// `dist/yoya.core*.js`、`dist/yoya.api.js`）——**入口一律不得指向它们**：
// 指向 full 会让每个打包器用户都内联一份 core，而应用又按 peer 引 core ⇒ 一个 bundle 两份 core。
console.log('\n[1b] 入口口径（不得内联 core）');
// 反向也查：core 的入口不得内联快线（与 [1] 的边界口径同源）
const INLINED_REGION = {
  'yoya-ui': /\/\/#region packages\/yoya-core\//,
  'yoya-compiler': /\/\/#region packages\/yoya-core\//,
  'yoya-core': /\/\/#region packages\/yoya-ui\//
};
const entryTargets = [];
for (const [name, dir] of Object.entries(PACKAGES)) {
  const pkg = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
  for (const field of ['main', 'module']) {
    if (typeof pkg[field] === 'string')
      entryTargets.push([`${name} ${field}`, join(dir, pkg[field])]);
  }
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    if (typeof value === 'string') continue;
    const target = value.import ?? value.default;
    if (!target) continue;
    entryTargets.push([`${name} exports["${key}"].import`, join(dir, target)]);
    if (value.types && !existsSync(join(ROOT, dir, value.types))) {
      bad(`${name} exports["${key}"].types 指向不存在的文件：${value.types}`);
    }
  }
}
const inlinedEntries = [];
for (const [label, rel] of entryTargets) {
  if (!existsSync(join(ROOT, rel))) {
    bad(`入口文件缺失：${label} → ${rel}`);
    continue;
  }
  const pkgName = label.split(' ')[0];
  const pattern = INLINED_REGION[pkgName];
  if (pattern?.test(readFileSync(join(ROOT, rel), 'utf8'))) inlinedEntries.push(label);
}
if (inlinedEntries.length === 0) {
  ok(`${entryTargets.length} 个入口（main / module / exports.*.import）都没有内联另一个包`);
} else {
  bad(`这些入口内联了另一个包（应改指薄入口）：${inlinedEntries.join(' | ')}`);
}

console.log('\n[2] 两个包的 dist 互不内联');
const uiDomains = [
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
  'three',
  'compiler'
];
const coreDist = join(ROOT, PACKAGES['yoya-core'], 'dist');
const uiDist = join(ROOT, PACKAGES['yoya-ui'], 'dist');
const leakedDomains = uiDomains.filter((domain) => existsSync(join(coreDist, domain)));
if (leakedDomains.length === 0) ok('core 的 dist 里没有组件域目录');
else bad(`core 的 dist 里出现组件域：${leakedDomains.join(', ')}`);
const coreModules = [
  'core/node.js',
  'core/v-node.js',
  'core/signals/handle.js',
  'html/index.js',
  'svg/index.js'
];
const inlined = coreModules.filter((module) => existsSync(join(uiDist, module)));
if (inlined.length === 0) ok('ui 的 dist 里没有 core 模块副本（单例）');
else bad(`ui 的 dist 内联了 core：${inlined.join(', ')}`);
// 编译器引擎不该落在运行期包里（只允许转发壳 + 运行期钩子）
const engineFiles = [
  'analyze.js',
  'emit.js',
  'plugin.js',
  'plugin-core.js',
  'rollup.js',
  'unplugin-bridge.js',
  'registry.js',
  'discover.js'
];
const engineLeft = engineFiles.filter((file) => existsSync(join(uiDist, 'compiler', file)));
if (engineLeft.length === 0) ok('ui 的 dist 里没有编译器引擎（只在 @yoyaflow/yoya-compiler）');
else bad(`ui 的 dist 里出现编译器引擎文件：${engineLeft.join(', ')}`);
// 依赖副本不许进 dist：`files: ["dist"]` 会把 dist 里的任何东西一起发布，
// 0.7.0 的 `dist/node_modules/vitest/**`（0.54 MB）就是这么发出去的。
const forVendored = [coreDist, uiDist, join(ROOT, PACKAGES['yoya-compiler'], 'dist')];
const vendored = [];
for (const distDir of forVendored) {
  if (existsSync(join(distDir, 'node_modules'))) {
    vendored.push(`${relative(ROOT, join(distDir, 'node_modules')).split('\\').join('/')}/`);
  }
  for (const file of walk(distDir)) {
    if (!file.endsWith('.js')) continue;
    const text = readFileSync(join(ROOT, file), 'utf8');
    if (/(?:from|import)\s*['"][^'"]*node_modules\//.test(text)) {
      vendored.push(`${file} → import node_modules/…`);
    }
  }
}
if (vendored.length === 0) ok('三个包的 dist 里没有依赖副本（node_modules / 指向它的 import）');
else bad(`dist 里出现依赖副本：${[...new Set(vendored)].slice(0, 5).join(' | ')}`);

// 3) ui → core 只走裸包名
console.log('\n[3] ui 只通过裸包名引 core');
const badSpecifiers = [];
for (const file of walk(uiDist)) {
  if (!file.endsWith('.js')) continue;
  const text = readFileSync(join(ROOT, file), 'utf8');
  for (const match of text.matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
    if (/(^|\/)\.\.\/\.\.\/yoya-core\//.test(match[1]) || match[1].includes('yoya-core/src/')) {
      badSpecifiers.push(`${file}: ${match[1]}`);
    }
  }
}
if (badSpecifiers.length === 0) ok('ui 的产物里没有相对路径钻进 core');
else bad(`这些地方用相对路径引了 core：${badSpecifiers.slice(0, 5).join(' | ')}`);

// 4) 宿主单例冒烟（两包各装一次）
console.log('\n[4] 两包各装一次时的单例冒烟');
ensureWorkspaceLinks(ROOT);
// 单例口径：用**非-full** 入口（`/ui`），core 走 peer ⇒ 全应用一份 core。
const core = await import('@yoyaflow/yoya-core');
const ui = await import('@yoyaflow/yoya-ui/ui');
// `/ui` 是**增量**入口（只含组件，core 由 peer 提供）——元素工厂从 core 取，这正是单例口径
const page = core.div((root) => {
  root.vCard((card) => card.vCardBody('体检'));
  root.child(core.vText('core 原语'));
});
const html = page.toHTML();
if (html.includes('体检') && html.includes('core 原语'))
  ok(`core + 组件渲染成 HTML（${html.length} 字符）`);
else bad(`冒烟渲染结果不含预期内容：${html.slice(0, 120)}`);
const identity = core.componentNameOf(ui.vCard('x'));
if (identity === 'VCard') ok(`身份判定跨包成立：componentNameOf(vCard) = ${identity}`);
else bad(`身份判定失败：componentNameOf(vCard) = ${identity}`);
// `.full` 是**自包含单文件**（core 已内联）：它自己必须能跑，但**不与 core 包混用**（双副本失配）。
const full = await import('@yoyaflow/yoya-ui');
const fullHtml = full.div((root) => root.vCard((card) => card.vCardBody('全量'))).toHTML();
if (fullHtml.includes('全量'))
  ok(`自包含入口 .full 单独可用（${fullHtml.length} 字符，core 内联）`);
else bad(`自包含入口 .full 渲染失败：${fullHtml.slice(0, 120)}`);

// 5) compiler bin
console.log('\n[5] compiler bin');
const bin = join(ROOT, PACKAGES['yoya-ui'], 'dist/compiler.js');
const help = spawnSync(process.execPath, [bin, '--help'], { encoding: 'utf8', cwd: ROOT });
if (help.status === 0) ok('`node dist/compiler.js --help` 退出码 0');
else bad(`compiler bin 失败：${help.status} ${help.stderr?.slice(0, 200)}`);
if (readFileSync(bin, 'utf8').startsWith('#!')) ok('bin 带 shebang');
else bad('bin 缺 shebang（npm 的 POSIX shim 会直接 exec 它）');

// 6) README 体积表 + 基准表
console.log('\n[6] README 体积表 / 基准表');
const bundlereport = await collectBundleReport();
for (const file of ['README.md', 'README.zh-CN.md']) {
  const mismatches = compareReadmeSizes(readFileSync(join(ROOT, file), 'utf8'), bundlereport);
  if (mismatches.length === 0) ok(`${file} 体积表与产物一致`);
  else {
    bad(
      `${file} 体积表与产物不一致（${mismatches.length} 行）：` +
        mismatches
          .slice(0, 3)
          .map((item) => `${item.name} README ${item.actual ?? '缺失'} ≠ 产物 ${item.expected}`)
          .join(' | ')
    );
    console.log('    提示：npm run report:bundle:write 可刷新');
  }
}
const benchmarkMismatches = await compareBenchmarkTables(readBenchmarkResults());
if (benchmarkMismatches.length === 0) ok('基准表与 benchmark/results.json 一致');
else bad(`基准表不一致：${benchmarkMismatches.length} 行`);

console.log('');
if (FAILURES.length) {
  console.log(`verify-dist: ${FAILURES.length} 条不通过`);
  process.exitCode = 1;
} else {
  console.log('verify-dist: 全部通过');
}
