// 构建产物验证（CI 在 `npm run build` 之后执行）：
// 1. SSR + 官方组件单 core 冒烟：dist 的 core/ui/router 共享同一 core chunk；
// 2. 分类子入口 tree-shaking 隔离：仅打包目标类目，不夹带其他类目组件；
// 3. 体积预算门禁：自包含 full 产物、核心入口、实际下载量与组件皮肤不得超过预算；
// 4. README 体积表与产物一致：表格数字不再靠手工维护，漂移即失败。
// 5. 基准文档表格与 benchmark/results.json 一致：官方基准的数字同样不许手写。
// 6. 基准报告页 benchmark/report.html 由 benchmark/results.json 生成：手改数字即失败。
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rolldown } from 'rolldown';
import { collectBundleReport, compareReadmeSizes } from './bundle-metrics.mjs';
import { compareBenchmarkTables, readBenchmarkResults } from './benchmark-report.mjs';
import { compareHtmlReport, renderHtmlReport } from './benchmark-report-html.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`verify-dist: ${message}`);
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function includesWord(code, word) {
  return new RegExp(`(?<![A-Za-z0-9_$])${word}(?![A-Za-z0-9_$])`).test(code);
}

function withoutComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '');
}

async function loadEntry(name) {
  return import(pathToFileURL(join(dist, name)).href);
}

// ---- 1. SSR + 官方组件单 core 冒烟 -----------------------------------------
async function verifyApiEntry() {
  const core = await loadEntry('yoya.core.js');
  const api = await loadEntry('yoya.api.js');
  assert(typeof api.configureRequest === 'function', 'API 入口缺少 configureRequest');
  assert(typeof api.RequestBase === 'function', 'API 入口缺少 RequestBase');
  assert(typeof api.Result === 'function', 'API 入口缺少 Result');
  assert(core.configureRequest === undefined, 'core 入口仍导出 configureRequest');
  assert(core.RequestBase === undefined, 'core 入口仍导出 RequestBase');
  assert(core.Result === undefined, 'core 入口仍导出 Result');
}

async function verifySsrSingleCore() {
  const core = await loadEntry('yoya.core.js');
  const ui = await loadEntry('yoya.ui.js');
  const router = await loadEntry('yoya.router.js');

  const button = ui.vButton('启动');
  // 组件工厂可能返回 vNode 组件节点（元素机制在视图根上）：单 core 的判据是
  // "ui 产出的节点/根都来自 core 那一份类"，不是"工厂返回值一定是元素节点"。
  const buttonRoot = core.viewRootOf(button);
  assert(
    buttonRoot instanceof core.HtmlElementNode,
    'ui 节点不是 core 的 HtmlElementNode 实例（core 重复实例化）'
  );

  const buildPage = () =>
    core.div((page) => {
      page.child(ui.vCard((card) => card.vCardBody('卡片')));
      page.child(ui.vForm((form) => form.vInput({ name: 'x', value: 'v' })));
      page.child(ui.vTable((table) => table.vTr((row) => row.vTd('单元格'))));
    });

  const first = router.renderToString(buildPage).html;
  const second = router.renderToString(buildPage).html;
  assert(first.length > 0, 'SSR 输出为空');
  assert(second === first, 'SSR 输出不确定');
}

// ---- 1b. 编译路径：运行期钩子冒烟 + 编译器与浏览器产物隔离 --------------------
async function verifyCompilerRuntime() {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const runtime = await loadEntry('yoya.compiler-runtime.js');
  const document = dom.window.document;
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const html = '<tr data-row-id=""><td class="col">0</td></tr>';
    const element = runtime.cloneFragment(html);
    assert(element.tagName === 'TR', 'compiler-runtime 克隆出的片段不是行根元素');
    assert(
      runtime.cloneFragment(html) !== element,
      'compiler-runtime 同一形状每次都应克隆出新实例'
    );

    const host = document.createElement('tbody');
    const list = runtime.createElementList(host, (row) => row.id);
    const offs = [];
    list.sync([{ id: 1 }, { id: 2 }], (row) => {
      const el = runtime.cloneFragment('<tr></tr>');
      runtime.pushOff(offs, runtime.bindText(el, row.id));
      return { el, destroy: () => runtime.setAttr(el, 'data-done', null) };
    });
    assert(host.children.length === 2, 'compiled list 没有把行挂进容器');
    assert(host.children[0].textContent === '1', 'compiled list 没有写入行文本');
    assert(
      host.children[0].getAttribute('data-row-key') === null,
      'compiled list 默认写了 data-row-key（票 18 要求默认不写，键镜像按 keyAttribute 显式打开）'
    );
    list.destroy();
    assert(host.children.length === 0, 'compiled list 的 destroy 没有清空容器');

    // 键镜像按选项显式打开：需要按 key 定位行（DevTools / 排查对账）时才有这个属性。
    const keyedHost = document.createElement('tbody');
    const keyedList = runtime.createElementList(keyedHost, (row) => row.id, {
      keyAttribute: 'data-row-key'
    });
    keyedList.sync([{ id: 7 }], () => ({
      el: runtime.cloneFragment('<tr></tr>'),
      destroy: () => {}
    }));
    assert(
      keyedHost.children[0].getAttribute('data-row-key') === '7',
      'compiled list 开了 keyAttribute 却没有写键镜像'
    );
    keyedList.destroy();
    offs.forEach((off) => off());
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

/** 编译器只在构建期出现：浏览器入口不许带它，CLI 入口必须能独立跑起来。 */
async function verifyCompilerEntry() {
  for (const entry of ['yoya.core.js', 'yoya.ui.js', 'yoya.compiler-runtime.js']) {
    const code = readFileSync(join(dist, entry), 'utf8');
    assert(!code.includes('compileSource'), `${entry} 夹带了构建期编译器`);
    assert(!code.includes('@babel/parser'), `${entry} 引用了构建期依赖 @babel/parser`);
  }

  const compiler = readFileSync(join(dist, 'yoya.compiler.js'), 'utf8');
  assert(
    compiler.includes('@babel/parser'),
    '构建期编译器入口没有把 @babel/parser 外置（会被打进产物）'
  );

  const help = spawnSync(process.execPath, [join(dist, 'yoya.compiler.js'), '--help'], {
    encoding: 'utf8'
  });
  assert(help.status === 0, `yoya.compiler.js --help 退出码 ${help.status}`);
  assert(help.stdout.includes('--report'), 'yoya.compiler.js --help 没有列出 --report');
}

/**
 * 随包发布的库内组件注册表（票 11）：**独立入口 + 单向依赖**。
 *
 * 隔离口径：core / UI / 主入口都不许 import 注册表（不跑编译器、不链接库内组件的人零成本）；
 * 注册表自己只 import 包内入口（`/core` `/ui` `/<分类>` `/compiler-runtime`），既不带构建期编译器、
 * 也不引 `src` 路径；插件默认加载它，读不到就照旧回落通用路径。
 */
async function verifyCompiledRegistry() {
  const { loadPackagedRegistry } = await import('../src/compiler/plugin.js');
  const registrySource = readFileSync(join(dist, 'yoya.compiled-registry.js'), 'utf8');

  for (const entry of ['yoya.core.js', 'yoya.ui.js', 'yoya.ui-router.full.js']) {
    const code = readFileSync(join(dist, entry), 'utf8');
    assert(!code.includes('compiled-registry'), `${entry} 引用了库内组件注册表（应当单向隔离）`);
  }
  assert(
    !registrySource.includes('yoya-ui/compiler"'),
    '注册表入口引用了构建期编译器（应当只 import 运行期入口）'
  );
  [...registrySource.matchAll(/from\s+"([^"]+)"/g)].forEach(([, specifier]) => {
    assert(
      specifier.startsWith('@yoyaflow/yoya-ui/'),
      `注册表 import 了包外路径：${specifier}（应当只走包内入口）`
    );
  });

  const loaded = await loadPackagedRegistry();
  assert(loaded !== null, '插件默认加载拿不到随包注册表（入口模块 + 同目录 JSON）');
  assert(Object.keys(loaded.components.components).length > 0, '随包注册表里没有任何可链接的组件');
  assert(
    (await loadPackagedRegistry({ coreSpecifier: '/custom/core.js' })) === null,
    '调用方换了 core 入口仍然用了随包注册表（会变成两份核心实例）'
  );
}

// ---- 2. 分类子入口 tree-shaking 隔离 ---------------------------------------
const CATEGORY_SCENARIOS = {
  actions: {
    entry: 'yoya.actions.js',
    imports: 'vButton, VButton',
    markers: ['vButton'],
    absent: ['vForm', 'vTable', 'vTabs', 'vTree']
  },
  navigation: {
    entry: 'yoya.navigation.js',
    imports: 'vMenu, VMenu',
    markers: ['vMenu'],
    absent: ['vForm', 'vTable', 'vCarousel', 'vTree']
  },
  feedback: {
    entry: 'yoya.feedback.js',
    imports: 'toast, vDialog, vTooltip',
    markers: ['vDialog'],
    absent: ['vForm', 'vTable', 'vTabs', 'vTree', 'vMenu']
  },
  form: {
    entry: 'yoya.form.js',
    imports: 'vForm, vInput, vSelect',
    markers: ['vForm'],
    absent: ['vTable', 'vTabs', 'vTree', 'vMenu', 'vBadge']
  },
  'data-display': {
    entry: 'yoya.data-display.js',
    imports: 'vTable, vTree, vBadge, vPagination',
    markers: ['vTable'],
    absent: ['vForm', 'vTabs', 'vButton', 'vDialog']
  },
  async: {
    entry: 'yoya.async.js',
    imports: 'vDynamicLoader, vSkeleton, vLazyImage',
    markers: ['vSkeleton'],
    absent: ['vForm', 'vTable', 'vTabs', 'vButton']
  }
};

async function bundleConsumer(entryName, importedNames, minify) {
  const dir = mkdtempSync(join(tmpdir(), 'yoya-verify-dist-'));
  const consumer = join(dir, 'consumer.mjs');
  const entryUrl = pathToFileURL(join(dist, entryName)).href;
  writeFileSync(
    consumer,
    `import { ${importedNames} } from ${JSON.stringify(entryUrl)};\nexport const used = [${importedNames}];\n`,
    'utf8'
  );
  try {
    const bundle = await rolldown({ input: consumer });
    const generated = await bundle.generate({ format: 'es', minify });
    return generated.output.map((chunk) => chunk.code).join('\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---- 3. 体积预算 -------------------------------------------------------------
// 门限口径（2026-09-21 放宽，用户决定：先放宽门限，瘦身留到后续再做）：
// 每个条目 = 当前实测 + 约 25% 余量，取整到整数 KB —— 它只当**防无限制膨胀的兜底**，
// 不再当"每刀都必须抠出字节"的门槛。后续瘦身（开发者文案、图标集、chunk 归并）完成后再逐个收紧。
// 说明：分块不再按目录强判，公共 chunk 由 bundler 按「被多个入口共享」自动生成
// （html / svg / core / shared 等），因此预算改为盯住这些公共 chunk 与各入口产物。
const BUDGET_ARTIFACTS = {
  'yoya.ui-router.full.min.js': 700 * 1024,
  'yoya.ui.full.min.js': 650 * 1024,
  'yoya.router.full.min.js': 170 * 1024,
  // 公共 chunk（引擎、HTML 工厂、SVG 与图标、i18n/a11y 等）
  'html.min.js': 60 * 1024,
  'svg.min.js': 24 * 1024,
  'core.min.js': 13 * 1024,
  // 入口产物
  'yoya.core.min.js': 9 * 1024,
  'yoya.api.min.js': 4 * 1024,
  'yoya.ui.min.js': 20 * 1024,
  'yoya.router.min.js': 42 * 1024,
  // 编译子入口按"导出面 = 发射器能写出的钩子全集"来定：任一钩子漏掉，用户的构建就是一条
  // import 链接错误（见 src/compiler/runtime-exports.test.js）。它不进主入口下载路径，
  // 真正的用户成本看 BUDGET_DOWNLOADS 里的 min+gzip。
  'yoya.compiler-runtime.min.js': 10 * 1024,
  // 库内组件注册表：按形状扫出来的可编子集（图标 + vCard 家族 + 表格部件）打进一个入口。
  // 它不在任何默认下载路径上，只有**链接了库内组件**的构建才会引到它。
  'yoya.compiled-registry.min.js': 42 * 1024,
  'devtools.min.js': 8 * 1024,
  // 节点引擎与 HTML/SVG 工厂的公共 chunk（按当前分块口径）
  'node.min.js': 96 * 1024,
  // 组件皮肤：core 层无皮肤，这里只盯组件样式本身的膨胀。
  // 96 → 100 KB（`050860f`）→ 104 KB（按钮族 / 主题模式切换）→ 108 KB（`menu` + `tree-ranger`）→
  // 112 KB（`context-menu` / `dropdown-menu` / `dialog` / `tooltip` 等波 5 剩下的文件，2026-09-23）：
  // R5 返工批把组件里的**行内静态样式搬进皮肤**（样式总量不变、只是从 JS 行内挪到这里），门限按
  // "实测 + 余量"的兜底口径，不贴着上限。R5 队列已清空；波 5 剩下的文件（`message` / `skeleton` /
  // `split-panel` / `lazy-image` / `transition` / `layout/index`）搬完行内样式后，按票 15 §9 的既定口径
  // **在波 6 收口时用"实测 + 10%"重新收紧**（同时做票 22 的皮肤去重：现状实测只有约 2.4 KB 属于
  // "规则体逐字重复"、可在规则级合并）。
  'yoya.ui.css': 112 * 1024
};

// 首屏真实成本是「入口 + 它引用的公共 chunk」，按实际下载量（min+gzip）单独设预算。
const BUDGET_DOWNLOADS = {
  'yoya.core.js': 38 * 1024,
  'yoya.ui.js': 135 * 1024,
  'yoya.compiler-runtime.js': 27 * 1024
};

const BUDGET_CATEGORY_BUNDLE = 250 * 1024;

async function verifyBudgets() {
  const report = [];
  for (const [file, budget] of Object.entries(BUDGET_ARTIFACTS)) {
    const size = statSync(join(dist, file)).size;
    report.push({ name: file, size, budget });
    assert(size <= budget, `${file} 超过预算（${kb(size)} > ${kb(budget)}）`);
  }

  for (const [entry, budget] of Object.entries(BUDGET_DOWNLOADS)) {
    const size = bundleReport.incremental.find((row) => row.entry === entry).download.gzip;
    report.push({ name: `${entry} 实际下载 (min+gzip)`, size, budget });
    assert(size <= budget, `${entry} 实际下载量超过预算（${kb(size)} > ${kb(budget)}）`);
  }

  for (const [category, scenario] of Object.entries(CATEGORY_SCENARIOS)) {
    const code = await bundleConsumer(scenario.entry, scenario.imports, true);
    const size = Buffer.byteLength(code);
    report.push({ name: `${category} 按需打包 (min)`, size, budget: BUDGET_CATEGORY_BUNDLE });
    assert(
      size <= BUDGET_CATEGORY_BUNDLE,
      `${category} 按需打包超过预算（${kb(size)} > ${kb(BUDGET_CATEGORY_BUNDLE)}）`
    );
  }

  console.log('\n体积预算报告');
  console.log('-'.repeat(58));
  for (const row of report) {
    console.log(
      `${row.name.padEnd(42)} ${kb(row.size).padStart(10)} / ${kb(row.budget).padStart(10)}`
    );
  }
}

// ---- 4. README 体积表与产物一致 ----------------------------------------------
function verifyReadmeSizes() {
  for (const file of ['README.md', 'README.zh-CN.md']) {
    const mismatches = compareReadmeSizes(readFileSync(join(root, file), 'utf8'), bundleReport);
    if (mismatches.length > 0) {
      const lines = mismatches.map(
        (item) =>
          `  ${item.name}: README ${item.actual ? item.actual.join(' / ') : '（缺少该行）'} ≠ 产物 ${item.expected.join(' / ')}`
      );
      throw new Error(
        `${file} 体积表与当前产物不一致：\n${lines.join('\n')}\n  提示：npm run report:bundle:write 可刷新（会同时格式化）`
      );
    }
    console.log(`README 体积表与产物一致：${file}`);
  }
}

async function verifyBenchmarkTables() {
  const mismatches = await compareBenchmarkTables(readBenchmarkResults());
  if (mismatches.length > 0) {
    throw new Error(
      `基准表格与 benchmark/results.json 不一致：${mismatches
        .map((item) => item.file)
        .join('、')}\n  提示：npm run report:bench:write 可重新生成`
    );
  }
  console.log('基准表格与 benchmark/results.json 一致');
}

async function verifyBenchmarkHtml() {
  const mismatches = compareHtmlReport(renderHtmlReport(readBenchmarkResults()));
  if (mismatches.length > 0) {
    throw new Error(
      `${mismatches.join('、')}\n  提示：npm run report:bench:html:write 可重新生成` +
        '（页面数字全部来自 benchmark/results.json）'
    );
  }
  console.log('基准报告页与 benchmark/results.json 一致');
}

// 体积报表同时供预算与 README 校验使用（一次采集，避免重复打包）。
const bundleReport = await collectBundleReport();

await verifyApiEntry();
console.log('API 入口隔离通过：通讯符号只在 yoya.api.js 导出。');

await verifySsrSingleCore();
console.log('SSR 单 core 冒烟通过：core/ui/router 共享同一实例，官方组件可 SSR。');

await verifyCompilerRuntime();
console.log('编译运行期冒烟通过：compiler-runtime 可克隆片段、绑定文本、对账与销毁列表。');

await verifyCompilerEntry();
console.log(
  '编译入口隔离通过：浏览器入口不含编译器，yoya.compiler.js 外置 @babel/parser 且 CLI 可跑。'
);

await verifyCompiledRegistry();
console.log('库内组件注册表通过：独立入口、只依赖包内运行期入口，插件能默认加载它。');

for (const [category, scenario] of Object.entries(CATEGORY_SCENARIOS)) {
  const code = await bundleConsumer(scenario.entry, scenario.imports, false);
  const searchable = withoutComments(code);
  for (const marker of scenario.markers) {
    assert(includesWord(searchable, marker), `${category} 打包缺少本类目符号 ${marker}`);
  }
  for (const absent of scenario.absent) {
    assert(!includesWord(searchable, absent), `${category} 打包夹带了其他类目符号 ${absent}`);
  }
  console.log(`tree-shaking 隔离通过：${category}`);
}

await verifyBudgets();

verifyReadmeSizes();

await verifyBenchmarkTables();
await verifyBenchmarkHtml();

console.log('verify-dist: 全部通过');
