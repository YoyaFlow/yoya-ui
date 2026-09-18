// 生成 benchmark/report.html：给人看的四条目并列报告页（原生 / yoya-ui / Vue / React）。
//
// 唯一数据源是 benchmark/results.json（与 docs/performance{,.zh-CN}.md 同源）：yoya、原生、上一发布版本
// 与对照条目（compare 段）都从它渲染，页面里不许手抄数字。每个非原生条目的单元格分两层：
// 上方是实测值，下方是「÷ 原生」的归一系数（系数按档位着色，未达 1.0× 为绿）。
// `--check` 由 `npm run verify:dist` 调用，手改数字会被拦下。
//
//   node scripts/benchmark-report-html.mjs         打印摘要
//   node scripts/benchmark-report-html.mjs --write 生成 benchmark/report.html
//   node scripts/benchmark-report-html.mjs --check 校验文件与数据源一致（CI）
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CPU_ROWS, MEMORY_ROWS, SIZE_ROWS, readBenchmarkResults } from './benchmark-report.mjs';

const root = resolve(import.meta.dirname, '..');
const OUT_FILE = join(root, 'benchmark', 'report.html');
const PROJECTION_FILE = join(root, 'benchmark', 'ast-precompile-projection.json');
const BANNER =
  '<!-- 由 scripts/benchmark-report-html.mjs 从 benchmark/results.json 生成，请勿手改 -->';

/**
 * 可选投影列：`benchmark/ast-precompile-projection.json` 给出「实测倍率 + 作用范围」，
 * 由本页折算成一条**标注为投影**的列（官方数字仍来自 results.json，不被改写）。
 * 文件不存在时页面与只有实测列时完全一致。
 */
export function readProjection(file = PROJECTION_FILE) {
  if (!existsSync(file)) {
    return null;
  }
  const projection = JSON.parse(readFileSync(file, 'utf8'));
  if (projection?.meta?.kind !== 'projection') {
    throw new Error(`${file}: meta.kind 必须是 "projection"（投影列不许伪装成实测值）`);
  }
  return projection;
}

/** 投影值：cpu 只折算 script 桶（total 同步平移），内存按实测增量平移；未覆盖 → null。 */
function projectedValue(projection, kind, row) {
  if (!projection) {
    return null;
  }
  const key = projection.applies?.[kind]?.[row.id];
  const delta = key ? projection.deltas?.[key] : undefined;
  if (typeof delta !== 'number') {
    return null;
  }
  if (kind === 'cpu') {
    return {
      total: Number((row.yoya.total + row.yoya.script * delta).toFixed(1)),
      script: Number((row.yoya.script * (1 + delta)).toFixed(1))
    };
  }
  return row.yoya + delta;
}

const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 行标题与单位：与文档表格共用一份定义。 */
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

const formatValue = (unit, value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  if (unit === 'MB') {
    return `${value.toFixed(2)} MB`;
  }
  if (unit === 'KB') {
    return `${value.toFixed(1)} KB`;
  }
  return `${value.toFixed(1)} ms`;
};

/** 归一系数分档：≤1.0 绿、≤1.25 中性、≤1.5 琥珀、>1.5 红。 */
function coefficientClass(value, base) {
  const ratio = value / base;
  if (!Number.isFinite(ratio)) {
    return 'coef-coef';
  }
  if (ratio <= 1.0) {
    return 'coef-good';
  }
  if (ratio <= 1.25) {
    return 'coef-ok';
  }
  if (ratio <= 1.5) {
    return 'coef-warn';
  }
  return 'coef-bad';
}

/** 双层单元格：上值下系数。native 列只有值（它的系数恒为 1.00×）。 */
function valueCell(unit, value, base, { layered = true } = {}) {
  const text = formatValue(unit, value);
  if (!layered || typeof base !== 'number' || base <= 0) {
    return `<td>${escapeHtml(text)}</td>`;
  }
  const ratio = value / base;
  const display = Number.isFinite(ratio) ? `${ratio.toFixed(2)}×` : '—';
  return `<td class="stack"><b>${escapeHtml(text)}</b><span class="${coefficientClass(
    value,
    base
  )}">${display}</span></td>`;
}

/** 九项时长的几何平均倍率（口径与别处一致：只看倍率）。 */
function geometricMean(rows) {
  const ratios = rows
    .map((row) => row.yoya.total / row.baseline.total)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (ratios.length === 0) {
    return null;
  }
  return Math.exp(ratios.reduce((total, value) => total + Math.log(value), 0) / ratios.length);
}

const styles = `
    :root { --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --bg:#f9fafb;
      --good:#047857; --ok:#4b5563; --warn:#b45309; --bad:#b91c1c; }
    * { box-sizing:border-box; }
    body { margin:0; padding:32px 20px 64px; background:var(--bg); color:var(--ink);
      font:14px/1.65 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif; }
    main { max-width:1120px; margin:0 auto; }
    h1 { font-size:24px; margin:0 0 6px; }
    h2 { font-size:17px; margin:32px 0 10px; padding-bottom:6px; border-bottom:1px solid var(--line); }
    .meta { color:var(--muted); font-size:13px; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin:20px 0 8px; }
    .card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
    .card b { display:block; font-size:22px; margin-top:2px; }
    .card span { color:var(--muted); font-size:12px; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line);
      border-radius:10px; overflow:hidden; }
    th, td { padding:7px 10px; border-bottom:1px solid var(--line); text-align:right; vertical-align:middle; }
    th:first-child, td:first-child { text-align:left; }
    thead th { background:#f3f4f6; font-weight:600; }
    tbody tr:last-child td { border-bottom:0; }
    td.stack { line-height:1.35; }
    td.stack b { display:block; font-weight:600; }
    td.stack span { display:block; font-size:12px; }
    .coef-good { color:var(--good); }
    .coef-ok { color:var(--ok); }
    .coef-warn { color:var(--warn); }
    .coef-bad { color:var(--bad); }
    .coef-coef { color:var(--muted); }
    td.projected, th.projected { background:#fffbeb; }
    td.projected-none { background:#fffbeb; color:var(--muted); }
    ul { padding-left:20px; }
    footer { margin-top:36px; color:var(--muted); font-size:12px; }
    code { background:#f3f4f6; padding:1px 5px; border-radius:4px; }
`;

function renderTable(headers, rows) {
  const head = headers.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.cells.join('')}</tr>`).join('\n');
  return `<table>\n  <thead><tr>${head}</tr></thead>\n  <tbody>\n${body}\n  </tbody>\n</table>`;
}

export function renderHtmlReport(results, projection = readProjection()) {
  const { meta, cpu, memory, size } = results;
  const compares = results.compare ?? [];
  const average = geometricMean(cpu);
  const projectedAverage = projection
    ? geometricMean(
        cpu.map((row) => {
          const projected = projectedValue(projection, 'cpu', row);
          return { ...row, yoya: { ...row.yoya, total: projected?.total ?? row.yoya.total } };
        })
      )
    : null;
  const versions = [
    meta.anchorVersion,
    meta.packageVersion,
    ...compares.map((column) => column.version)
  ];
  const headers = [
    '操作',
    `yoya ${meta.anchorVersion}`,
    `yoya ${meta.packageVersion}`,
    ...(projection ? [`yoya ${meta.packageVersion} + AST 预生成（投影）`] : []),
    '原生',
    ...versions.slice(2)
  ];
  const projectedCell = (unit, value, base) =>
    value === null || value === undefined || !Number.isFinite(value)
      ? '<td class="projected-none">—</td>'
      : valueCell(unit, value, base).replace('<td class="stack"', '<td class="stack projected"');

  const cpuById = new Map(cpu.map((row) => [row.id, row]));
  const compareLookup = (column, id, kind) => {
    const list = kind === 'cpu' ? column.cpu : kind === 'memory' ? column.memory : column.size;
    const entry = list.find((item) => item.id === id);
    return kind === 'cpu' ? entry?.total : entry?.value;
  };

  const cpuRows = cpu.map((row) => {
    const unit = 'ms';
    const base = row.baseline.total;
    const projected = projectedValue(projection, 'cpu', row);
    return {
      cells: [
        `<td>${escapeHtml(titleOf(row.id))}</td>`,
        valueCell(unit, row.anchor.total, base, { layered: false }),
        valueCell(unit, row.yoya.total, base),
        ...(projection ? [projectedCell(unit, projected?.total, base)] : []),
        valueCell(unit, base, base, { layered: false }),
        ...compares.map((column) => valueCell(unit, compareLookup(column, row.id, 'cpu'), base))
      ]
    };
  });

  const splitHeaders = [
    '操作',
    'yoya script',
    ...(projection ? ['yoya script（投影）'] : []),
    'yoya paint',
    '原生 script',
    '原生 paint'
  ];
  const splitRows = cpu.map((row) => {
    const projected = projectedValue(projection, 'cpu', row);
    return {
      cells: [
        `<td>${escapeHtml(titleOf(row.id))}</td>`,
        `<td>${formatValue('ms', row.yoya.script)}</td>`,
        ...(projection
          ? [
              `<td class="${projected ? 'projected' : 'projected-none'}">${formatValue(
                'ms',
                projected?.script
              )}</td>`
            ]
          : []),
        `<td>${formatValue('ms', row.yoya.paint)}</td>`,
        `<td>${formatValue('ms', row.baseline.script)}</td>`,
        `<td>${formatValue('ms', row.baseline.paint)}</td>`
      ]
    };
  });

  const otherRows = [...memory, ...size].map((row) => {
    const unit = unitOf(row.id);
    const base = row.baseline;
    const projected = projectedValue(projection, unit === 'MB' ? 'memory' : 'size', row);
    return {
      cells: [
        `<td>${escapeHtml(titleOf(row.id))}</td>`,
        valueCell(unit, row.anchor, base, { layered: false }),
        valueCell(unit, row.yoya, base),
        ...(projection ? [projectedCell(unit, projected, base)] : []),
        valueCell(unit, base, base, { layered: false }),
        ...compares.map((column) =>
          valueCell(unit, compareLookup(column, row.id, unit === 'MB' ? 'memory' : 'size'), base)
        )
      ]
    };
  });

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>js-framework-benchmark：原生 / yoya-ui / Vue / React</title>
<style>${styles}</style>
</head>
<body>
${BANNER}
<main>
<h1>js-framework-benchmark：原生 / yoya-ui / Vue / React</h1>
<p class="meta">
  官方 runner <code>${escapeHtml(meta.runner)}</code>（${escapeHtml(meta.mode)}）+ ${escapeHtml(meta.browser)}；
  CPU 项取 ${meta.cpuIterations} 个样本的中位数（单轮 15 次迭代；多轮合并后取中位）；
  内存 / 体积 / 首屏各 1 次采样；测量日期 ${escapeHtml(meta.generatedAt)}，
  yoya 版本 <code>${escapeHtml(meta.packageVersion)}</code>（<code>${escapeHtml(meta.commit)}</code>）。
  <br />非原生条目的单元格分两层：<b>上方是实测值，下方是「÷ 原生」的归一系数</b>
  （绿 ≤1.00×、灰 ≤1.25×、琥珀 ≤1.50×、红 &gt;1.50×）。
  ${
    compares.length > 0
      ? `对照条目 ${escapeHtml(compares.map((column) => column.version).join(' / '))} 与 yoya / 原生取自**同一轮**测量。`
      : ''
  }
</p>
<section class="cards">
  <div class="card"><span>九项几何平均 ÷ 原生</span><b>${average === null ? '—' : `${average.toFixed(2)}×`}</b></div>
  ${
    projection
      ? `<div class="card"><span>九项几何平均 ÷ 原生（含 AST 预生成，投影）</span><b>${
          projectedAverage === null ? '—' : `${projectedAverage.toFixed(2)}×`
        }</b></div>`
      : ''
  }
  <div class="card"><span>22 建 1000 行后内存</span><b>${formatValue(
    'MB',
    memory.find((row) => row.id === '22_run-memory')?.yoya
  )}${
    projection
      ? ` → ${formatValue(
          'MB',
          projectedValue(
            projection,
            'memory',
            memory.find((row) => row.id === '22_run-memory')
          )
        )}（投影）`
      : ''
  }</b></div>
  <div class="card"><span>42 体积（brotli）</span><b>${formatValue(
    'KB',
    size.find((row) => row.id === '42_size-compressed')?.yoya
  )}</b></div>
  <div class="card"><span>09 清空 ×8</span><b>${formatValue(
    'ms',
    cpuById.get('09_clear1k_x8')?.yoya.total
  )}</b></div>
</section>

<h2>九项标准操作（ms，中位数；下行 = 归一系数）</h2>
${renderTable(headers, cpuRows)}

<h2>script / paint 分解（ms，中位数）</h2>
${renderTable(splitHeaders, splitRows)}

<h2>内存 / 体积 / 首屏</h2>
${renderTable(headers, otherRows)}

<h2>怎么读</h2>
<ul>
  <li><b>归一系数只在同一轮内有效</b>：本页所有系数都除以本轮的原生读数。跨轮的原生基线会漂移
    （同一份代码的单轮几何平均可差 0.06），不要拿本页系数与另一轮的数字相减。</li>
  <li><b>script / paint 分开看</b>：yoya 的绘制桶已与原生同档，剩余差距在 JS（节点构造、登记、首次写 DOM）。</li>
  <li><b>04 选中 / 03 改文案还反映条目的状态模型</b>：yoya 与 Vue 用「共享句柄 + 每行派生」，
    React 用逐行 prop + <code>memo</code>，手写的原生基线只碰受影响的两行——同一格里的系数含义因此不同，
    详见 <code>docs/performance{,.zh-CN}.md</code> 的「怎么读」与 <code>docs/component-authoring</code> §6.2/§6.3。</li>
  <li><b>内存是最大量级差</b>：建 1000 行后仍是原生的两倍多；剩余部分主要是 DOM 对象与 V8 节点对象头。</li>
  <li><b>体积 / 首屏是本机静态 vendor 形态</b>（页面直接加载 min chunk + 未打包的应用代码），
    与打包口径不可比；时长与内存可比，且体积列在不同条目间也不完全同口径（各自的打包方式不同）。</li>
  <li><b>内存 / 体积 / 首屏是单次采样</b>，不要当精确值；首屏尤其如此。</li>
  ${
    projection
      ? `<li><b>琥珀色那列是「投影」，不是实测</b>：数据来自
    <code>benchmark/ast-precompile-projection.json</code>（原型 ${escapeHtml(
      projection.meta.prototype
    )}），按 ${escapeHtml(projection.meta.method)}。
    只覆盖建行路径（01 / 02 / 07 / 08）与 1k 行内存，<b>03 / 04 / 05 / 06 / 09 显示 — 表示不受影响</b>；
    未计入运行期钩子体积（约 +0.4~0.8 KB gzip，独立入口，主条目不引）。
    ${escapeHtml(projection.meta.disclaimer)}</li>`
      : ''
  }
</ul>

<footer>
  数据源 <code>benchmark/results.json</code>${
    projection ? ' + <code>benchmark/ast-precompile-projection.json</code>（投影列）' : ''
  }；本页由 <code>npm run report:bench:html:write</code> 生成，
  <code>verify:dist</code> 会校验它与数据源一致。
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
  if (readFileSync(OUT_FILE, 'utf8') === html) {
    return [];
  }
  return ['benchmark/report.html 与 benchmark/results.json 不一致'];
}

const args = process.argv.slice(2);
const results = readBenchmarkResults();
const html = renderHtmlReport(results);

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
  const columns = [
    '原生',
    `yoya ${results.meta.packageVersion}`,
    ...(results.compare ?? []).map((column) => column.version)
  ];
  console.log(
    `benchmark/results.json：${columns.join(' / ')}；九项 ${results.cpu.length} 项、内存 ` +
      `${results.memory.length} 项、体积 ${results.size.length} 项；九项几何平均 ` +
      `${average === null ? '—' : average.toFixed(2)}×；提交 ${results.meta.commit}`
  );
  console.log('生成页面：npm run report:bench:html:write');
}
