// 构建产物验证（CI 在 `npm run build` 之后执行）：
// 1. SSR + 官方组件单 core 冒烟：dist 的 core/ui/router 共享同一 core chunk；
// 2. 分类子入口 tree-shaking 隔离：仅打包目标类目，不夹带其他类目组件；
// 3. 体积预算门禁：自包含 full 产物与分类按需打包体积不得超过预算。
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';

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
const BUDGET_ARTIFACTS = {
  'yoya.ui-router.full.min.js': 700 * 1024,
  'yoya.ui.full.min.js': 650 * 1024,
  'yoya.router.full.min.js': 150 * 1024,
  'yoya.core.chunk.min.js': 110 * 1024
};

const BUDGET_CATEGORY_BUNDLE = 220 * 1024;

async function verifyBudgets() {
  const report = [];
  for (const [file, budget] of Object.entries(BUDGET_ARTIFACTS)) {
    const size = statSync(join(dist, file)).size;
    report.push({ name: file, size, budget });
    assert(size <= budget, `${file} 超过预算（${kb(size)} > ${kb(budget)}）`);
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

await verifySsrSingleCore();
console.log('SSR 单 core 冒烟通过：core/ui/router 共享同一实例，官方组件可 SSR。');

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

console.log('verify-dist: 全部通过');
