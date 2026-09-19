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
  assert(
    button instanceof core.HtmlElementNode,
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
      host.children[0].getAttribute('data-row-key') === '1',
      'compiled list 没有写 data-row-key'
    );
    list.destroy();
    assert(host.children.length === 0, 'compiled list 的 destroy 没有清空容器');
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
// 预算为当前基线保留约 60% 余量；后续允许小幅上涨，但不能无限膨胀。
// 说明：分块不再按目录强判，公共 chunk 由 bundler 按「被多个入口共享」自动生成
// （html / svg / core / shared 等），因此预算改为盯住这些公共 chunk 与各入口产物。
const BUDGET_ARTIFACTS = {
  'yoya.ui-router.full.min.js': 700 * 1024,
  'yoya.ui.full.min.js': 650 * 1024,
  'yoya.router.full.min.js': 150 * 1024,
  // 公共 chunk（引擎、HTML 工厂、SVG 与图标、i18n/a11y 等）
  'html.min.js': 60 * 1024,
  'svg.min.js': 24 * 1024,
  'core.min.js': 12 * 1024,
  // 入口产物
  'yoya.core.min.js': 9 * 1024,
  'yoya.api.min.js': 4 * 1024,
  'yoya.ui.min.js': 20 * 1024,
  'yoya.router.min.js': 40 * 1024,
  'yoya.compiler-runtime.min.js': 6 * 1024,
  'devtools.min.js': 6 * 1024,
  // 节点引擎与 HTML/SVG 工厂的公共 chunk（按当前分块口径）
  'node.min.js': 96 * 1024,
  // 组件皮肤：core 层无皮肤，这里只盯组件样式本身的膨胀
  'yoya.ui.css': 96 * 1024
};

// 首屏真实成本是「入口 + 它引用的公共 chunk」，按实际下载量（min+gzip）单独设预算。
const BUDGET_DOWNLOADS = {
  'yoya.core.js': 30 * 1024,
  'yoya.ui.js': 130 * 1024,
  'yoya.compiler-runtime.js': 24 * 1024
};

const BUDGET_CATEGORY_BUNDLE = 220 * 1024;

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
