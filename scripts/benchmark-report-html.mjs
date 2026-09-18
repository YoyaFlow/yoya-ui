// 生成 benchmark/report.html：给人看的基准报告页。
// 唯一数据源是 benchmark/results.json（与 docs/performance{,.zh-CN}.md 同源），页面里的数字全部由它渲染，
// 不允许手抄；`--check` 由 `npm run verify:dist` 调用，手改数字会被拦下。
//
//   node scripts/benchmark-report-html.mjs                     打印摘要
//   node scripts/benchmark-report-html.mjs --write             生成 benchmark/report.html
//   node scripts/benchmark-report-html.mjs --check             校验文件与数据源一致（CI）
//   node scripts/benchmark-report-html.mjs --write \
//        --results-dir <官方 runner 结果目录> --include <标签>  追加对照列（本地用，跨轮不可比）
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CPU_ROWS, MEMORY_ROWS, SIZE_ROWS, readBenchmarkResults } from './benchmark-report.mjs';

const root = resolve(import.meta.dirname, '..');
const OUT_FILE = join(root, 'benchmark', 'report.html');
const BANNER =
  '<!-- 由 scripts/benchmark-report-html.mjs 从 benchmark/results.json 生成，请勿手改 -->';

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ms = (value) => `${Number(value).toFixed(1)}`;
const kb = (value) => `${Number(value).toFixed(1)}`;
const mb = (value) => `${Number(value).toFixed(2)}`;
const ratio = (value, base) => (base > 0 ? `${(value / base).toFixed(2)}×` : '—');

/** 行标题与单位：与文档表格同一份定义，避免两处各写一套。 */
const ROW_META = new Map([
  ...CPU_ROWS.map((row) => [row.id, { title: row.zh, unit: 'ms' }]),
  ...MEMORY_ROWS.map((row) => [row.id, { title: row.zh, unit: 'MB' }]),
  ...SIZE_ROWS.map((row) => [
    row.id,
    { title: row.zh, unit: row.id === '43_first-paint' ? 'ms' : 'KB' }
  ])
]);
const titleOf = (id) => ROW_META.get(id)?.title ?? id;
const unitOf = (id) => ROW_META.get(id)?.unit ?? 'ms';
const formatValue = (id, value) => {
  if (typeof value !== 'number') {
    return '—';
  }
  const unit = unitOf(id);
  return unit === 'MB' ? `${mb(value)} MB` : unit === 'KB' ? `${kb(value)} KB` : ms(value);
};

/** 九项时长的几何平均倍率：与其他地方的口径一致（只看倍率，不看单次小数）。 */
function geometricMean(rows) {
  const ratios = rows
    .map((row) => row.yoya.total / row.baseline.total)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (ratios.length === 0) {
    return null;
  }
  return Math.exp(ratios.reduce((total, value) => total + Math.log(value), 0) / ratios.length);
}

/** 可选对照列：从官方 runner 结果目录读别的条目（各自那一轮，跨轮只能参考）。 */
function readComparisonColumns(resultsDir, labels) {
  if (!resultsDir || labels.length === 0 || !existsSync(resultsDir)) {
    return [];
  }

  return labels
    .map((label) => {
      const read = (id) => {
        const file = join(resultsDir, `${label}_${id}.json`);
        if (!existsSync(file)) {
          return null;
        }
        return JSON.parse(readFileSync(file, 'utf8'));
      };

      const source = readBenchmarkResults();
      const cpu = new Map();
      const other = new Map();
      for (const row of [...source.cpu, ...source.memory, ...source.size]) {
        const payload = read(row.id);
        if (!payload) {
          continue;
        }
        const bucket = payload.values.DEFAULT ?? payload.values.total;
        const value = bucket?.median;
        if (typeof value === 'number') {
          (payload.type === 'cpu' ? cpu : other).set(row.id, value);
        }
      }

      return { label, cpu, other };
    })
    .filter((column) => column.cpu.size > 0 || column.other.size > 0);
}

const styles = `
    :root { --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --bg:#f9fafb; --accent:#1d4ed8; }
    * { box-sizing:border-box; }
    body { margin:0; padding:32px 20px 64px; background:var(--bg); color:var(--ink);
      font:14px/1.65 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif; }
    main { max-width:1080px; margin:0 auto; }
    h1 { font-size:24px; margin:0 0 6px; }
    h2 { font-size:17px; margin:32px 0 10px; padding-bottom:6px; border-bottom:1px solid var(--line); }
    .meta { color:var(--muted); font-size:13px; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin:20px 0 8px; }
    .card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
    .card b { display:block; font-size:22px; margin-top:2px; }
    .card span { color:var(--muted); font-size:12px; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line);
      border-radius:10px; overflow:hidden; }
    caption { text-align:left; color:var(--muted); padding:0 0 8px; font-size:13px; }
    th, td { padding:8px 10px; border-bottom:1px solid var(--line); text-align:right; }
    th:first-child, td:first-child { text-align:left; }
    thead th { background:#f3f4f6; font-weight:600; }
    tbody tr:last-child td { border-bottom:0; }
    tbody tr.best td { background:#eff6ff; }
    ul { padding-left:20px; }
    footer { margin-top:36px; color:var(--muted); font-size:12px; }
    code { background:#f3f4f6; padding:1px 5px; border-radius:4px; }
`;

function renderTable(headers, rows) {
  const head = headers.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr${row.highlight ? ' class="best"' : ''}>${row.cells
          .map((cell) => `<td>${cell}</td>`)
          .join('')}</tr>`
    )
    .join('\n');
  return `<table>\n  <thead><tr>${head}</tr></thead>\n  <tbody>\n${body}\n  </tbody>\n</table>`;
}

/**
 * 渲染报告页。`comparisons` 是可选对照列（本地 `--include` 产生；跨轮不可比，页面上会标注）。
 */
export function renderHtmlReport(results, comparisons = []) {
  const { meta, cpu, memory, size } = results;
  const average = geometricMean(cpu);
  const extraHead = comparisons.map((column) => column.label);
  const extraCell = (column, id) => formatValue(id, column.cpu.get(id) ?? column.other.get(id));

  const cpuRows = cpu.map((row) => ({
    cells: [
      escapeHtml(row.title ?? row.id),
      ms(row.anchor.total),
      `<b>${ms(row.yoya.total)}</b>`,
      ms(row.baseline.total),
      ratio(row.yoya.total, row.baseline.total),
      ...comparisons.map((column) => extraCell(column, row.id))
    ]
  }));

  const splitRows = cpu.map((row) => ({
    cells: [
      escapeHtml(titleOf(row.id)),
      ms(row.yoya.script),
      ms(row.yoya.paint),
      ms(row.baseline.script),
      ms(row.baseline.paint)
    ]
  }));

  const otherRows = [...memory, ...size].map((row) => ({
    cells: [
      escapeHtml(titleOf(row.id)),
      formatValue(row.id, row.anchor),
      `<b>${formatValue(row.id, row.yoya)}</b>`,
      formatValue(row.id, row.baseline),
      ratio(row.yoya, row.baseline),
      ...comparisons.map((column) => formatValue(row.id, column.other.get(row.id)))
    ]
  }));

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>js-framework-benchmark：yoya-ui vs 原生</title>
<style>${styles}</style>
</head>
<body>
${BANNER}
<main>
<h1>js-framework-benchmark：yoya-ui vs 原生</h1>
<p class="meta">
  官方 runner <code>${escapeHtml(meta.runner)}</code>（${escapeHtml(meta.mode)}）+ ${escapeHtml(meta.browser)}；
  CPU 项取 ${meta.cpuIterations} 个样本的中位数（单轮 15 次迭代；多轮合并后取中位）；
  内存 / 体积 / 首屏各 1 次采样；测量日期 ${escapeHtml(meta.generatedAt)}，
  yoya 版本 <code>${escapeHtml(meta.packageVersion)}</code>（<code>${escapeHtml(meta.commit)}</code>），
  对照版本 <code>${escapeHtml(meta.anchorVersion)}</code>。
</p>
<section class="cards">
  <div class="card"><span>九项几何平均 ÷ 原生</span><b>${average === null ? '—' : `${average.toFixed(2)}×`}</b></div>
  <div class="card"><span>22 建 1000 行后内存</span><b>${mb(memory.find((row) => row.id === '22_run-memory')?.yoya ?? 0)} MB</b></div>
  <div class="card"><span>42 体积（brotli）</span><b>${kb(size.find((row) => row.id === '42_size-compressed')?.yoya ?? 0)} KB</b></div>
  <div class="card"><span>09 清空 ×8</span><b>${ms(cpu.find((row) => row.id === '09_clear1k_x8')?.yoya.total ?? 0)} ms</b></div>
</section>

<h2>九项标准操作（ms，中位数）</h2>
${renderTable(
  [`操作`, `yoya ${meta.anchorVersion}`, 'yoya 本次', '原生', '本次 ÷ 原生', ...extraHead],
  cpuRows
)}

<h2>script / paint 分解（ms，中位数）</h2>
${renderTable(['操作', 'yoya script', 'yoya paint', '原生 script', '原生 paint'], splitRows)}

<h2>内存 / 体积 / 首屏</h2>
${renderTable(
  ['指标', `yoya ${meta.anchorVersion}`, 'yoya 本次', '原生', '本次 ÷ 原生', ...extraHead],
  otherRows
)}

<h2>怎么读</h2>
<ul>
  <li><b>script / paint 分开看</b>：yoya 的绘制桶已与原生同档；剩余差距在 JS（节点构造、登记、首次写 DOM）。</li>
  <li><b>倍率只能同轮比</b>：本页所有倍率都取自同一轮的原生读数；跨轮的原生基线会漂移（实测单轮
    几何平均可差 0.06），所以不要拿本页数字与另一轮的绝对值直接相减。</li>
  <li><b>内存是最大量级差</b>：建 1000 行后仍是原生的两倍多；剩余部分主要是 DOM 对象与 V8 节点对象头。</li>
  <li><b>体积 / 首屏是本机静态 vendor 形态</b>（页面直接加载 6 个 min chunk + 未打包的应用代码），
    与打包口径不可比；时长与内存可比。</li>
  <li><b>内存 / 体积 / 首屏是单次采样</b>，不要当精确值；首屏尤其如此。</li>
  ${
    comparisons.length > 0
      ? '<li><b>附加对照列来自各自的测量轮次</b>（不是本轮），只作参考。</li>'
      : ''
  }
</ul>

<footer>
  数据源 <code>benchmark/results.json</code>；本页由
  <code>npm run report:bench:html:write</code> 生成，<code>verify:dist</code> 会校验它与数据源一致。
</footer>
</main>
</body>
</html>
`;
}

/** 与磁盘上的文件逐字节比对，返回不一致的说明（空数组 = 一致）。 */
export function compareHtmlReport(html) {
  if (!existsSync(OUT_FILE)) {
    return ['benchmark/report.html 不存在'];
  }
  const current = readFileSync(OUT_FILE, 'utf8');
  if (current === html) {
    return [];
  }
  return ['benchmark/report.html 与 benchmark/results.json 不一致'];
}

const args = process.argv.slice(2);
const option = (name, fallback = null) =>
  args.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const options = (name) =>
  args.filter((item) => item.startsWith(`--${name}=`)).map((item) => item.slice(name.length + 3));

const results = readBenchmarkResults();
const comparisons = readComparisonColumns(
  option('results-dir', 'D:\\code\\yoyaflow\\js-framework-benchmark\\webdriver-ts\\results'),
  options('include')
);
const html = renderHtmlReport(results, comparisons);

if (args.includes('--write')) {
  writeFileSync(OUT_FILE, html, 'utf8');
  console.log(`benchmark/report.html 已按 benchmark/results.json 生成（${html.length} 字节）`);
} else if (args.includes('--check')) {
  const mismatches = compareHtmlReport(html);
  if (mismatches.length > 0) {
    console.error(
      `✗ ${mismatches.join('、')}\n  修复：npm run report:bench:html:write（数字来自 benchmark/results.json）`
    );
    process.exit(1);
  }
  console.log('基准报告页与 benchmark/results.json 一致');
} else {
  const average = geometricMean(results.cpu);
  console.log(
    `benchmark/results.json：${results.cpu.length} 项时长 / ${results.memory.length} 项内存 / ` +
      `${results.size.length} 项体积；九项几何平均 ${average === null ? '—' : average.toFixed(2)}×；` +
      `提交 ${results.meta.commit}`
  );
  console.log('生成页面：npm run report:bench:html:write');
}
