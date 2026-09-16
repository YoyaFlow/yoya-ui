// 产物体积口径的唯一来源：从 dist 采集各入口 / 公共 chunk 的真实体积，并负责
// README「产物与体积」表的读取、核对与刷新。
//
// 为什么是两个口径：增量入口只报「入口文件本身」会让人误以为 core 只有几 KB，
// 所以同时报「实际下载量（入口 + 它引用的公共 chunk）」。构建输出、README 中英表
// 都由这里取值，避免手工维护出偏差。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const DIST = 'dist';
const kb = (bytes) => (bytes / 1024).toFixed(1);
const minName = (name) => name.replace(/\.js$/, '.min.js');

// 报表顺序与 README 表顺序都按这份清单走。
export const BUNDLE_ENTRIES = [
  'yoya.core.js',
  'yoya.api.js',
  'yoya.ui.js',
  'yoya.router.js',
  'yoya.devtools.js',
  'yoya.echart.js',
  'yoya.three.js'
];

// 每个入口包含什么——只看体积数字没人知道 core 里有 i18n。
const CONTENTS = {
  'yoya.core.js':
    '核心节点定义、HTML 原语、SVG 原语、内置 SVG 图标集、Signals 定义与引擎、**i18n 处理器**、权限 access、context、a11y、theme helper、ClientOnly',
  'yoya.api.js': '通讯辅助约束：RequestBase / Result / configureRequest（可选，独立于渲染核心）',
  'yoya.ui.js':
    '全部组件：layout / actions / navigation / feedback / form / data-display / async / effects + 语言切换组件 + theme',
  'yoya.router.js':
    'router（createRouter / vRouter / vLink / vRouterViews）+ SSR 原语（renderToString / renderPage / hydrate / hydrateOrMount / mount / serializeState / parseState）',
  'yoya.devtools.js':
    'enableDevtools / disableDevtools / subscribeDevtools / getDevtoolsSnapshot / getDevtoolsDom / getDevtoolsScope',
  'yoya.echart.js': 'vEchart（ECharts 封装）',
  'yoya.three.js': 'vThree（Three.js 封装）',
  'yoya.router.full.js': 'core + router / SSR（自包含）',
  'yoya.ui.full.js': 'core + 全部组件（自包含）',
  'yoya.ui-router.full.js': 'core + 全部组件 + router / SSR（自包含，全量）'
};

// 入口 + 传递依赖：直接让 bundler 跟着 dist 的 import 图重打一次，得到真实下载量
async function downloadSize(entry) {
  const build = await rolldown({ input: { entry: join(DIST, entry) } });
  const { output } = await build.generate({ format: 'es', minify: true });
  const code = output.map((chunk) => chunk.code).join('\n');

  return { raw: code.length, gzip: gzipSync(code).length };
}

function fileSize(file) {
  const raw = statSync(join(DIST, file)).size;
  const min = existsSync(join(DIST, minName(file)))
    ? statSync(join(DIST, minName(file))).size
    : raw;
  const gzip = gzipSync(
    readFileSync(join(DIST, existsSync(join(DIST, minName(file))) ? minName(file) : file))
  ).length;

  return { raw, min, gzip };
}

export async function collectBundleReport() {
  const incremental = [];
  for (const entry of BUNDLE_ENTRIES) {
    incremental.push({
      entry,
      own: fileSize(entry),
      download: await downloadSize(entry),
      contents: CONTENTS[entry] ?? ''
    });
  }

  const full = readdirSync(DIST)
    .filter((name) => /^yoya\.[\w.-]+\.full\.js$/.test(name))
    .sort()
    .map((file) => ({ file, ...fileSize(file), contents: CONTENTS[file] ?? '' }));

  const chunks = readdirSync(DIST)
    .filter((name) => /^(?!yoya\.)[\w-]+\.js$/.test(name) && !name.endsWith('.min.js'))
    .sort()
    .map((file) => ({ file, ...fileSize(file) }));

  const skin = join(DIST, 'yoya.ui.css');
  const css = existsSync(skin)
    ? { raw: statSync(skin).size, gzip: gzipSync(readFileSync(skin)).length }
    : null;

  return { incremental, full, chunks, css };
}

export function formatBundleReport(report) {
  const lines = [];

  lines.push('### 增量入口（ESM，不含 core）\n');
  lines.push('| 入口 | 入口文件 min+gzip | 实际下载量 min+gzip | 包含内容 |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of report.incremental) {
    lines.push(
      `| \`${row.entry}\` | ${kb(row.own.gzip)} KB | ${kb(row.download.gzip)} KB | ${row.contents} |`
    );
  }

  lines.push('\n### 自包含入口（ESM，core 已内联）\n');
  lines.push('| 产物 | raw | min | min+gzip | 包含内容 |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.full) {
    lines.push(
      `| \`${row.file}\` | ${kb(row.raw)} KB | ${kb(row.min)} KB | ${kb(row.gzip)} KB | ${row.contents} |`
    );
  }

  lines.push('\n### 公共 chunk（内部命名，被增量入口自动引用）\n');
  lines.push('| chunk | raw | min | min+gzip |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of report.chunks) {
    lines.push(`| \`${row.file}\` | ${kb(row.raw)} KB | ${kb(row.min)} KB | ${kb(row.gzip)} KB |`);
  }

  if (report.css) {
    lines.push(
      `\n组件皮肤：\`yoya.ui.css\` ${kb(report.css.raw)} KB raw / ${kb(report.css.gzip)} KB gzip（core 层无皮肤）`
    );
  }

  return lines.join('\n');
}

// ---- README 体积表口径 -------------------------------------------------------
// 表里只替换数字，行文案（加粗、说明列、中文「开发期」等后缀）保持原样。
// 因此这些正则同时充当「README 表长什么样」的契约：行被改名或挪走会直接报错。
const VALUE_INCREMENTAL = /[\d.]+ KB ~ \*{0,2}[\d.]+ KB/;
const VALUE_PAIRED = /[\d.]+ \/ [\d.]+ KB ~ \*{0,2}[\d.]+ \/ [\d.]+ KB/;
const VALUE_FULL = /[\d.]+ KB \| [\d.]+ KB \| [\d.]+ KB/;
const CSS_VALUE = /`yoya\.ui\.css`[^|\n]*[:：]\s*[\d.]+ KB raw \/ \*{0,2}[\d.]+ KB gzip/;

const entryOwn = (report, entry) =>
  kb(report.incremental.find((row) => row.entry === entry).own.gzip);
const entryDownload = (report, entry) =>
  kb(report.incremental.find((row) => row.entry === entry).download.gzip);

function incrementalRow(entry) {
  return {
    name: `${entry} 入口文件 ~ 实际下载量`,
    label: `\`${entry}\``,
    value: VALUE_INCREMENTAL,
    expected: (report) => [entryOwn(report, entry), entryDownload(report, entry)]
  };
}

function selfContainedRow(file) {
  return {
    name: `${file} raw / min / min+gzip`,
    label: `\`${file}\``,
    value: VALUE_FULL,
    expected: (report) => {
      const row = report.full.find((item) => item.file === file);
      return [kb(row.raw), kb(row.min), kb(row.gzip)];
    }
  };
}

// README 把 echart / three 合并成一行显示，序号是「两个入口文件 + 两个下载量」。
const PAIRED_ROW = {
  name: 'yoya.echart.js / yoya.three.js 入口文件 ~ 实际下载量',
  label: '`yoya.echart.js`\\s*/\\s*`yoya.three.js`',
  value: VALUE_PAIRED,
  expected: (report) => [
    entryOwn(report, 'yoya.echart.js'),
    entryOwn(report, 'yoya.three.js'),
    entryDownload(report, 'yoya.echart.js'),
    entryDownload(report, 'yoya.three.js')
  ]
};

const README_ROWS = [
  incrementalRow('yoya.core.js'),
  incrementalRow('yoya.api.js'),
  incrementalRow('yoya.ui.js'),
  incrementalRow('yoya.router.js'),
  incrementalRow('yoya.devtools.js'),
  PAIRED_ROW,
  selfContainedRow('yoya.router.full.js'),
  selfContainedRow('yoya.ui-router.full.js'),
  selfContainedRow('yoya.ui.full.js')
];

// 供门禁与测试核对：README 中英体积表必须覆盖全部行。
export const README_ROW_NAMES = README_ROWS.map((row) => row.name);

// 单元格里的数字顺序固定：KB 值只出现在数值槽里，所以按顺序替换即可保留排版。
function rowCell(text, row) {
  const pattern = new RegExp(`(\\|\\s*${row.label}[^|\\n]*\\|\\s*)(${row.value.source})`);
  const found = pattern.exec(text);
  if (!found) {
    throw new Error(
      `README 体积表缺少「${row.name}」行（或行格式已变，请更新 bundle-metrics.mjs）`
    );
  }
  return { head: found[1], value: found[2], numbers: found[2].match(/\d+\.\d+/g) ?? [] };
}

export function readReadmeSizes(text) {
  const sizes = { rows: {}, css: null };

  for (const row of README_ROWS) {
    const pattern = new RegExp(`\\|\\s*${row.label}[^|\\n]*\\|\\s*(${row.value.source})`);
    const found = pattern.exec(text);
    sizes.rows[row.name] = found ? (found[1].match(/\d+\.\d+/g) ?? []) : null;
  }

  const css = CSS_VALUE.exec(text);
  sizes.css = css ? (css[0].match(/\d+\.\d+/g) ?? []) : null;

  return sizes;
}

// gzip 体积可能因 zlib / 打包器版本差几字节，0.1 KB 以内不算漂移；真实改动远超此值。
const SIZE_TOLERANCE_KB = 0.1;

function sameNumbers(found, expected) {
  if (found.length !== expected.length) return false;
  return found.every(
    (value, index) => Math.abs(Number(value) - Number(expected[index])) <= SIZE_TOLERANCE_KB
  );
}

// 返回不一致项（含缺失行）；空数组表示 README 与当前产物一致。
export function compareReadmeSizes(text, report) {
  const actual = readReadmeSizes(text);
  const mismatches = [];

  for (const row of README_ROWS) {
    const expected = row.expected(report);
    const found = actual.rows[row.name];
    if (!found) {
      mismatches.push({ name: row.name, expected, actual: null });
    } else if (!sameNumbers(found, expected)) {
      mismatches.push({ name: row.name, expected, actual: found });
    }
  }

  if (!actual.css) {
    mismatches.push({ name: 'yoya.ui.css raw / gzip', expected: cssSizes(report), actual: null });
  } else if (!sameNumbers(actual.css, cssSizes(report))) {
    mismatches.push({
      name: 'yoya.ui.css raw / gzip',
      expected: cssSizes(report),
      actual: actual.css
    });
  }

  return mismatches;
}

function cssSizes(report) {
  return report.css ? [kb(report.css.raw), kb(report.css.gzip)] : ['-', '-'];
}

// 按当前产物刷新 README 体积表里的数字；行结构与文案保持不变。
export function patchReadmeSizes(text, report) {
  let next = text;

  for (const row of README_ROWS) {
    const cell = rowCell(next, row);
    const numbers = row.expected(report);
    if (cell.numbers.length !== numbers.length) {
      throw new Error(
        `README 体积表「${row.name}」数字槽位是 ${cell.numbers.length} 个，期望 ${numbers.length} 个`
      );
    }
    let index = 0;
    const value = cell.value.replace(/\d+\.\d+/g, () => numbers[index++]);
    next = next.replace(cell.head + cell.value, cell.head + value);
  }

  const css = CSS_VALUE.exec(next);
  if (!css) {
    throw new Error('README 缺少组件皮肤体积行（yoya.ui.css: X KB raw / Y KB gzip）');
  }
  const numbers = cssSizes(report);
  let index = 0;
  next = next.replace(
    css[0],
    css[0].replace(/\d+\.\d+/g, () => numbers[index++])
  );

  return next;
}
