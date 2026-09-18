// 官方基准（js-framework-benchmark）报表口径的唯一来源。
//
//   node scripts/benchmark-report.mjs --import <runner results 目录> \
//        --yoya <标签> --anchor <标签> --baseline <标签> [--runner playwright]
//        从官方 runner 的结果 JSON 导入 benchmark/results.json（唯一数据源）；
//   node scripts/benchmark-report.mjs            打印表格（npm run report:bench）；
//   node scripts/benchmark-report.mjs --write    按 benchmarks/results.json 刷新中英文档表格块；
//   node scripts/benchmark-report.mjs --check    校验文档表格块与数据源一致（verify:dist 调用）。
//
// 文档里的表格块由标记包起来，块内文字全部由这里生成：手工改数字会被 --check 拦下。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const DATA_FILE = join(root, 'benchmark', 'results.json');

export const BLOCK_START = '<!-- benchmark:tables:start 由 scripts/benchmark-report.mjs 生成 -->';
export const BLOCK_END = '<!-- benchmark:tables:end -->';

export const DOC_FILES = [
  { file: 'docs/performance.md', lang: 'en' },
  { file: 'docs/performance.zh-CN.md', lang: 'zh' }
];

// 报表行清单：id 就是官方 runner 的 benchmark id，标题只用于文档展示。
export const CPU_ROWS = [
  { id: '01_run1k', en: '01 create 1k rows', zh: '01 创建 1000 行' },
  { id: '02_replace1k', en: '02 replace 1k rows', zh: '02 替换 1000 行' },
  { id: '03_update10th1k_x16', en: '03 update every 10th row', zh: '03 每 10 行改文案' },
  { id: '04_select1k', en: '04 select row', zh: '04 选中一行' },
  { id: '05_swap1k', en: '05 swap rows', zh: '05 交换两行' },
  { id: '06_remove-one-1k', en: '06 remove one row', zh: '06 删除一行' },
  { id: '07_create10k', en: '07 create 10k rows', zh: '07 创建 10000 行' },
  { id: '08_create1k-after1k_x2', en: '08 append 1k rows', zh: '08 追加 1000 行' },
  { id: '09_clear1k_x8', en: '09 clear x8', zh: '09 清空 ×8' }
];

export const MEMORY_ROWS = [
  { id: '21_ready-memory', en: '21 ready memory (MB)', zh: '21 就绪内存（MB）' },
  { id: '22_run-memory', en: '22 run memory (MB)', zh: '22 建 1000 行后内存（MB）' },
  { id: '25_run-clear-memory', en: '25 run+clear memory (MB)', zh: '25 建+清空后内存（MB）' }
];

export const SIZE_ROWS = [
  { id: '41_size-uncompressed', en: '41 size, uncompressed (KB)', zh: '41 体积未压缩（KB）' },
  { id: '42_size-compressed', en: '42 size, brotli (KB)', zh: '42 体积 brotli（KB）' },
  { id: '43_first-paint', en: '43 first paint (ms)', zh: '43 首屏绘制（ms）' }
];

const TEXT = {
  zh: {
    meta: (meta) =>
      `**运行口径**：官方 runner \`${meta.runner}\`（${meta.mode}）+ ${meta.browser}；` +
      `CPU 项取 ${meta.cpuIterations} 个样本的中位数（单轮 15 次迭代；多轮合并后取中位），` +
      '内存 / 体积 / 首屏各 1 次采样；' +
      `测量日期 ${meta.generatedAt}，yoya 版本 \`${meta.packageVersion}\`（\`${meta.commit}\`）。`,
    cpuTitle: '九项标准操作（ms，中位数）',
    cpuHead: ['操作', `yoya ${'{version}'}`, 'yoya 本次', '原生 vanillajs', '本次 ÷ 原生'],
    splitTitle: 'script / paint 分解（ms，中位数）',
    splitHead: ['操作', 'yoya script', 'yoya paint', '原生 script', '原生 paint'],
    otherTitle: '内存 / 体积 / 首屏',
    otherHead: ['指标', `yoya ${'{version}'}`, 'yoya 本次', '原生 vanillajs', '本次 ÷ 原生']
  },
  en: {
    meta: (meta) =>
      `**Run setup**: official runner \`${meta.runner}\` (${meta.mode}) + ${meta.browser}; ` +
      `CPU rows are medians of ${meta.cpuIterations} samples (15 iterations per round; multiple rounds merged), ` +
      'memory / size / first paint are single samples; ' +
      `measured ${meta.generatedAt}, yoya version \`${meta.packageVersion}\` (\`${meta.commit}\`).`,
    cpuTitle: 'Nine standard operations (ms, median)',
    cpuHead: ['Operation', `yoya ${'{version}'}`, 'yoya now', 'vanillajs', 'now ÷ vanilla'],
    splitTitle: 'script / paint split (ms, median)',
    splitHead: ['Operation', 'yoya script', 'yoya paint', 'vanilla script', 'vanilla paint'],
    otherTitle: 'Memory / size / first paint',
    otherHead: ['Metric', `yoya ${'{version}'}`, 'yoya now', 'vanillajs', 'now ÷ vanilla']
  }
};

export function readBenchmarkResults(file = DATA_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

const num = (value, digits) =>
  value === null || value === undefined ? '—' : Number(value).toFixed(digits);
const ratio = (value, base) =>
  value === null || value === undefined || !base ? '—' : `${(value / base).toFixed(2)}×`;

function table(head, rows) {
  const lines = [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`];
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }
  return lines.join('\n');
}

/** 生成文档里的表格块（块内所有数字都来自 benchmark/results.json）。 */
export function renderBenchmarkTables(results, lang = 'zh') {
  const text = TEXT[lang];
  // 锚点（上一个发布版本）是可选列：没有 `anchor` 段时表格只呈现「本次 / 原生」
  const anchorVersion = results.anchor?.version ?? null;
  const head = (key) =>
    text[key]
      .filter((cell) => anchorVersion !== null || !cell.includes('{version}'))
      .map((cell) => cell.replace('{version}', anchorVersion ?? ''));
  const cpuById = new Map(results.cpu.map((row) => [row.id, row]));
  const memoryById = new Map(results.memory.map((row) => [row.id, row]));
  const sizeById = new Map(results.size.map((row) => [row.id, row]));
  const pick = (map, row, key) => map.get(row.id)?.[key] ?? null;

  const cpuRows = CPU_ROWS.map((row) => {
    const yoya = pick(cpuById, row, 'yoya');
    const baseline = pick(cpuById, row, 'baseline');
    return [
      row[lang],
      ...(anchorVersion ? [num(pick(cpuById, row, 'anchor')?.total, 1)] : []),
      num(yoya?.total, 1),
      num(baseline?.total, 1),
      ratio(yoya?.total, baseline?.total)
    ];
  });

  const splitRows = CPU_ROWS.map((row) => {
    const yoya = pick(cpuById, row, 'yoya');
    const baseline = pick(cpuById, row, 'baseline');
    return [
      row[lang],
      num(yoya?.script, 1),
      num(yoya?.paint, 1),
      num(baseline?.script, 1),
      num(baseline?.paint, 1)
    ];
  });

  const otherRows = [
    ...MEMORY_ROWS.map((row) => ({ row, map: memoryById, digits: 2 })),
    ...SIZE_ROWS.map((row) => ({ row, map: sizeById, digits: 1 }))
  ].map(({ row, map, digits }) => {
    const yoya = pick(map, row, 'yoya');
    const baseline = pick(map, row, 'baseline');
    return [
      row[lang],
      ...(anchorVersion ? [num(pick(map, row, 'anchor'), digits)] : []),
      num(yoya, digits),
      num(baseline, digits),
      ratio(yoya, baseline)
    ];
  });

  return [
    text.meta(results.meta),
    '',
    `**${text.cpuTitle}**`,
    '',
    table(head('cpuHead'), cpuRows),
    '',
    `**${text.splitTitle}**`,
    '',
    table(head('splitHead'), splitRows),
    '',
    `**${text.otherTitle}**`,
    '',
    table(head('otherHead'), otherRows)
  ].join('\n');
}

/** 取出文档里由标记包起来的表格块；缺标记直接报错（说明文档结构被改坏了）。 */
export function extractBenchmarkBlock(text, file = '文档') {
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`${file} 缺少基准表格块标记（--write 会用脚本重新生成）`);
  }
  return text.slice(start + BLOCK_START.length, end).trim();
}

/** 用数据源重写表格块，标记之外的内容原样保留。 */
export function patchBenchmarkBlock(text, block) {
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('目标文档缺少基准表格块标记');
  }
  return `${text.slice(0, start + BLOCK_START.length)}\n${block}\n${text.slice(end)}`;
}

// 生成的表格同样是 markdown 代码：列宽对齐交给项目 prettier 配置，否则 format:check 会失败。
async function formatDocument(text, file) {
  const prettier = await import('prettier');
  const options = await prettier.resolveConfig(file);
  return prettier.format(text, { ...options, filepath: file });
}

/** 返回不一致的文档与内容；空数组表示中英文档都与数据源一致。 */
export async function compareBenchmarkTables(
  results,
  readFile = (file) => readFileSync(file, 'utf8')
) {
  const mismatches = [];
  for (const { file, lang } of DOC_FILES) {
    let text;
    try {
      text = readFile(join(root, file));
    } catch {
      mismatches.push({ file, expected: '存在', actual: '缺失' });
      continue;
    }
    // 以「用数据源重新生成整篇」为准：标记之外的排版也由 prettier 归一，任何手改都会显现。
    const expected = await formatDocument(
      patchBenchmarkBlock(text, renderBenchmarkTables(results, lang)),
      join(root, file)
    );
    if (expected !== text) {
      mismatches.push({ file, expected, actual: text });
    }
  }
  return mismatches;
}

// ---- 导入：把官方 runner 的结果 JSON 归一化成单一数据源 ----------------------
function readRunnerResults(dir, label, id) {
  const file = join(dir, `${label}_${id}.json`);
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return parsed.values;
}

const stat = (values) => values?.DEFAULT ?? values?.total ?? null;

export function importBenchmarkResults({ dir, yoya, anchor, baseline, compares = [], meta }) {
  /** 锚点（上一个发布版本）可选：不传就不产出 anchor 列，报告只呈现本次与对照。 */
  const hasAnchor = typeof anchor === 'string' && anchor.length > 0;
  const median = (label, id) => {
    const values = readRunnerResults(dir, label, id);
    return stat(values)?.median ?? null;
  };
  const split = (label, id) => {
    const values = readRunnerResults(dir, label, id);
    return {
      total: values.total?.median ?? null,
      script: values.script?.median ?? null,
      paint: values.paint?.median ?? null
    };
  };

  return {
    meta,
    ...(hasAnchor ? { anchor: { label: anchor, version: meta.anchorVersion } } : {}),
    cpu: CPU_ROWS.map((row) => ({
      id: row.id,
      yoya: split(yoya, row.id),
      ...(hasAnchor ? { anchor: split(anchor, row.id) } : {}),
      baseline: split(baseline, row.id)
    })),
    memory: MEMORY_ROWS.map((row) => ({
      id: row.id,
      yoya: median(yoya, row.id),
      ...(hasAnchor ? { anchor: median(anchor, row.id) } : {}),
      baseline: median(baseline, row.id)
    })),
    size: SIZE_ROWS.map((row) => ({
      id: row.id,
      yoya: median(yoya, row.id),
      ...(hasAnchor ? { anchor: median(anchor, row.id) } : {}),
      baseline: median(baseline, row.id)
    })),
    // 对照条目（Vue / React 等）：必须与 yoya / baseline 同一轮，否则归一系数没有意义
    compare: compares.map((entry) => ({
      label: entry.label,
      version: entry.name,
      cpu: CPU_ROWS.map((row) => ({ id: row.id, ...split(entry.label, row.id) })),
      memory: MEMORY_ROWS.map((row) => ({ id: row.id, value: median(entry.label, row.id) })),
      size: SIZE_ROWS.map((row) => ({ id: row.id, value: median(entry.label, row.id) }))
    }))
  };
}

function option(name, fallback = null) {
  const found = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (found) {
    return found.slice(name.length + 3);
  }

  const index = process.argv.indexOf(`--${name}`);
  const next = index === -1 ? undefined : process.argv[index + 1];
  return next === undefined || next.startsWith('--') ? fallback : next;
}

/** 可重复参数：`--compare <runner 标签>:<显示名>` 出现多次时全部收集。 */
function options(name) {
  const collected = [];
  process.argv.forEach((item, index) => {
    if (item === `--${name}`) {
      const next = process.argv[index + 1];
      if (next !== undefined && !next.startsWith('--')) {
        collected.push(next);
      }
    } else if (item.startsWith(`--${name}=`)) {
      collected.push(item.slice(name.length + 3));
    }
  });
  return collected;
}

async function main() {
  const mode = process.argv[2];

  if (mode === '--import') {
    const results = importBenchmarkResults({
      dir: process.argv[3],
      yoya: option('yoya'),
      anchor: option('anchor'),
      baseline: option('baseline'),
      compares: options('compare').map((value) => {
        const separator = value.indexOf(':');
        return separator === -1
          ? { label: value, name: value }
          : { label: value.slice(0, separator), name: value.slice(separator + 1) };
      }),
      meta: {
        generatedAt: option('date', new Date().toISOString().slice(0, 10)),
        commit: option('commit'),
        packageVersion: option('version'),
        // 锚点版本只在并列上一个发布版本时才有值
        ...(option('anchor-version') ? { anchorVersion: option('anchor-version') } : {}),
        runner: option('runner', 'playwright'),
        mode: option('mode', 'headless'),
        browser: option('browser'),
        cpuIterations: Number(option('cpu-iterations', '15'))
      }
    });
    writeFileSync(DATA_FILE, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
    console.log(`benchmark/results.json 已按官方 runner 结果刷新`);
    return;
  }

  const results = readBenchmarkResults();
  if (mode === '--write') {
    for (const { file, lang } of DOC_FILES) {
      const path = join(root, file);
      const text = readFileSync(path, 'utf8');
      writeFileSync(
        path,
        await formatDocument(patchBenchmarkBlock(text, renderBenchmarkTables(results, lang)), path),
        'utf8'
      );
      console.log(`${file}: 基准表格块已按 benchmark/results.json 刷新`);
    }
    return;
  }

  if (mode === '--check') {
    const mismatches = await compareBenchmarkTables(results);
    if (mismatches.length > 0) {
      throw new Error(
        `基准表格与 benchmark/results.json 不一致：${mismatches
          .map((item) => item.file)
          .join('、')}\n  提示：npm run report:bench:write 可重新生成`
      );
    }
    console.log('基准表格与 benchmark/results.json 一致');
    return;
  }

  if (mode) {
    throw new Error(`未知参数 ${mode}；可用：--import <dir> / --write / --check`);
  }

  for (const { lang } of DOC_FILES) {
    console.log(renderBenchmarkTables(results, lang));
    console.log('');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
