// 基准报告口径：把 benchmarks/results 下的结果 JSON 渲染成中英两份报告文档。
// 文档完全由 JSON 生成，门禁做全文比对——手工改数字会被拦下。
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import prettier from 'prettier';

const RESULTS_DIR = resolve(import.meta.dirname, '../benchmarks/results');

// 两份报告：核心库报告（基准操作 / 启动 / 内存）与 UI 库报告（组件元素对照 / 虚拟滚动）
export const CORE_DOCS = [
  { file: resolve(import.meta.dirname, '../docs/benchmarks.md'), lang: 'en' },
  { file: resolve(import.meta.dirname, '../docs/benchmarks.zh-CN.md'), lang: 'zh' }
];

export const UI_DOCS = [
  { file: resolve(import.meta.dirname, '../docs/benchmarks-ui.md'), lang: 'en' },
  { file: resolve(import.meta.dirname, '../docs/benchmarks-ui.zh-CN.md'), lang: 'zh' }
];

export const BENCH_DOCS = [...CORE_DOCS, ...UI_DOCS];

export function readBenchResults() {
  const read = (name) => {
    const file = resolve(RESULTS_DIR, `${name}.json`);
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  };

  return { core: read('baseline'), ui: read('ui') };
}

const number = (value, unit = 'ms') =>
  value === null || value === undefined ? 'n/a' : `${value} ${unit}`;

const OP_LABELS = {
  add: 'append 1,000',
  clear: 'clear',
  remove: 'remove row',
  replace: 'replace all',
  run: 'create 1,000',
  runlots: 'create 10,000',
  select: 'select row',
  swaprows: 'swap rows',
  update: 'update every 10th'
};

const OPERATION_ORDER = [
  'run',
  'replace',
  'runlots',
  'add',
  'update',
  'select',
  'remove',
  'swaprows',
  'clear'
];

function operationTable(report) {
  const rows = OPERATION_ORDER.filter((op) =>
    report.operations.some((entry) => entry.op === op)
  ).map((op) => {
    const entry = report.operations.find((item) => item.op === op);
    return {
      guard: entry.guards.length,
      noisy: Boolean(entry.noisy),
      nodes: entry.nodes,
      op,
      p95: entry.stats.p95,
      rows: entry.rows,
      settle: entry.stats.median,
      work: entry.work?.median ?? null
    };
  });

  return { op: rows };
}

function comparisonRows({ baseline, component }) {
  if (!component) return [];

  return OPERATION_ORDER.filter((op) => component.operations.some((entry) => entry.op === op)).map(
    (op) => {
      const native = baseline.operations.find((entry) => entry.op === op);
      const componentEntry = component.operations.find((entry) => entry.op === op);
      return {
        native: native?.work?.median ?? null,
        nativeNodes: native?.nodes ?? null,
        component: componentEntry?.work?.median ?? null,
        componentNodes: componentEntry?.nodes ?? null,
        op
      };
    }
  );
}

function sizeLines(sizes) {
  if (!sizes) return [];

  return [
    ['yoya.core.js', sizes.core],
    ['yoya.ui.js', sizes.ui],
    ['yoya.ui-router.full.js', sizes.full]
  ].filter(([, value]) => value);
}

const TEXT_BY_LANG = {
  en: {
    comparabilityCore: [
      'Numbers are comparable across versions on the same machine and browser only; the fingerprint above is part of the result.',
      'Medians include about one frame of paint latency in headless Chromium; the work column removes it.',
      'Bundle sizes come from the artifact report gated by the README size tables; the benchmark does not measure them again.'
    ],
    comparabilityUi: [
      'Numbers are comparable across versions on the same machine and browser only; the fingerprint above is part of the result.',
      'Both sections here are **internal only**: they answer "what does this cost / what does it save", not "who is faster".',
      'Virtualized rows are reported as `N logical rows (M real DOM nodes)` — logical row count is not DOM node count.',
      'Both columns are yoya-ui code: the core layer (element factories) and the UI layer (official components).'
    ],
    comparability: [],
    componentIntro:
      'Both columns are yoya-ui code — **this is not "the library versus plain HTML"**. The left column builds rows from the **core layer** (element factories: `tr/td`), the right column uses the **UI layer** (official components: `vTable/vTr/vTd`). The left column is the **control baseline**, so the difference is what the UI component layer costs. Values are the work time (click → last DOM change, median), which is insensitive to frame latency.',
    fingerprint: 'Environment',
    memoryIntro: 'Heap sampled after a forced GC (MB).',
    metrics: [
      '**median / p95 / IQR**: click → DOM settled (the user-visible cost; in headless Chromium the floor is about one frame).',
      '**work**: click → last DOM change (engine work, insensitive to frame cadence).',
      '**rows / DOM nodes**: the row count the operation must leave behind, and the real element count.',
      '**guards**: deterministic regression checks (see below); a guard failure fails the run.'
    ],
    guards:
      'Guards are hard failures: field updates must not rebuild rows (0 row builds, 0 childList changes), swaps and appends must preserve existing row nodes, and every operation is checked against the expected rows, ids and labels.',
    memory: 'Memory',
    operations: 'Standard operations (keyed, core base elements)',
    plan: 'Definitions, comparability rules and the exact measurement recipe live in `benchmarks/PLAN.md`.',
    startup: 'Startup (median of fresh pages)',
    tableHead: {
      component: 'Component overhead: core base elements vs UI components',
      componentNodes: 'UI component nodes',
      componentWork: 'UI components (work)',
      nativeNodes: 'Core base element nodes',
      nativeWork: 'Core base elements (work)',
      nodes: 'DOM nodes',
      op: 'Operation',
      p95: 'p95',
      guard: 'Guards',
      rows: 'Rows',
      settle: 'Median',
      work: 'Work'
    },
    titleCore: 'Core benchmark report',
    titleUi: 'UI library component-element report',
    virtual: 'Virtualized list (logical rows vs real DOM)',
    virtualHead: {
      append: 'Append 1k',
      heap: 'Heap MB',
      jump: 'Jump to end',
      logical: 'Logical rows',
      nodes: 'Real nodes',
      rendered: 'Rendered rows'
    }
  },
  zh: {
    comparabilityCore: [
      '同一台机器、同一浏览器版本内的版本间比较才有意义；上方的环境指纹是结果的一部分。',
      '中位数含约一帧的绘制延迟（headless Chromium），「工作量」一列已把它排除。',
      '体积数字取自产物报表（已由 README 体积表门禁校验），基准不重复测量。'
    ],
    comparabilityUi: [
      '同一台机器、同一浏览器版本内的版本间比较才有意义；上方的环境指纹是结果的一部分。',
      '本节两组数字**仅内部可比**：它们回答"代价多少 / 省了什么"，不回答"谁更快"。',
      '虚拟滚动按「N 逻辑行（真实 DOM M 节点）」记录——逻辑行数不等于 DOM 节点数。',
      '两列都是本库代码：核心库（元素工厂）与 UI 库（官方组件）。'
    ],
    comparability: [],
    componentIntro:
      '两列都是本库写法——**不是"本库 vs 手写 HTML"**。左列用**核心库**的基础元素构建行（元素工厂 `tr/td`），右列用 **UI 库**的组件元素（官方组件 `vTable/vTr/vTd`）；左列是**对照基线**，两者之差就是 UI 组件层多付的成本。数值为「工作量」（点击 → 最后一次 DOM 变动，中位数），不受帧率影响。',
    fingerprint: '环境',
    memoryIntro: '强制 GC 后采样堆占用（MB）。',
    metrics: [
      '**中位数 / p95 / IQR**：点击 → DOM 稳定（用户可感知成本；headless Chromium 下下限约一帧）。',
      '**工作量**：点击 → 最后一次 DOM 变动（引擎实际工作量，不受帧率影响）。',
      '**行数 / DOM 节点**：操作结束后应有的行数与真实元素数。',
      '**护栏**：确定性回归校验（见下），护栏失败即整个运行失败。'
    ],
    guards:
      '护栏是硬失败：字段更新不得发生整行重建（行构建 0 次、子节点变动 0 次）、重排与追加后既有行节点必须保留、每个操作的行数 / id / 标签都要与期望一致。',
    memory: '内存',
    operations: '标准操作（keyed，核心库基础元素）',
    plan: '口径、可比性规则与完整测量方法见 `benchmarks/PLAN.md`。',
    startup: '启动（多张新页面取中位数）',
    tableHead: {
      component: '组件层开销：核心库基础元素 vs UI 库组件元素',
      componentNodes: 'UI 库组件元素节点',
      componentWork: 'UI 库组件元素（工作量）',
      nativeNodes: '核心库基础元素节点',
      nativeWork: '核心库基础元素（工作量）',
      nodes: 'DOM 节点',
      op: '操作',
      p95: 'p95',
      guard: '护栏',
      rows: '行数',
      settle: '中位数',
      work: '工作量'
    },
    titleCore: '核心库基准报告',
    titleUi: 'UI 库组件元素基准报告',
    virtual: '虚拟滚动（逻辑行 vs 真实 DOM）',
    virtualHead: {
      append: '追加 1k',
      heap: '堆 MB',
      jump: '跳到最后',
      logical: '逻辑行',
      nodes: '真实节点',
      rendered: '渲染行'
    }
  }
};

async function renderDocs(docs, build) {
  return Promise.all(
    docs.map(async ({ file, lang }) => {
      const content = build({ lang, text: TEXT_BY_LANG[lang] });
      const options = await prettier.resolveConfig(file);

      return { content: await prettier.format(content, { ...options, filepath: file }), file };
    })
  );
}

function documentHeader({ lang, text, fingerprint, noisy, runs }) {
  const lines = [];

  lines.push(`## ${text.fingerprint}`);
  lines.push('');
  lines.push(`- browser: ${fingerprint.browser.channel} / ${fingerprint.browser.version}`);
  lines.push(`- machine: ${fingerprint.machine} · CPU × ${fingerprint.cpuCount}`);
  lines.push(
    `- node: ${fingerprint.node} · package: ${fingerprint.packageVersion} · commit: ${fingerprint.repoCommit}`
  );
  lines.push(
    lang === 'zh' ? `- 每操作测量轮数：${runs}` : `- runs: ${runs} measured per operation`
  );
  lines.push(`- date: ${fingerprint.date}`);
  if (noisy) {
    lines.push(
      lang === 'zh'
        ? '- **本轮噪声偏高**（IQR 超过中位数一半）：中位数仍可读，但 p95 与方差受机器负载影响，建议空闲时重测。'
        : '- **This run is noisy** (IQR above half the median): medians are still readable, but p95 and variance were affected by machine load — re-measure on an idle machine.'
    );
  }
  lines.push('');

  return lines;
}

function operationTableLines({ lang, lines, operand, text }) {
  lines.push(`## ${text.operations}`);
  lines.push('');
  lines.push(
    `| ${text.tableHead.op} | ${text.tableHead.settle} | ${text.tableHead.p95} | ${text.tableHead.work} | ${text.tableHead.rows} | ${text.tableHead.nodes} | ${text.tableHead.guard} |`
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  operand.op.forEach((row) => {
    lines.push(
      `| \`${row.op}\` | ${row.noisy ? '† ' : ''}${number(row.settle)} | ${number(row.p95)} | ${number(
        row.work
      )} | ${row.rows} | ${row.nodes} | ${
        row.guard === 0 ? (lang === 'zh' ? '通过' : 'pass') : `×${row.guard}`
      } |`
    );
  });
  if (operand.op.some((row) => row.noisy)) {
    lines.push('');
    lines.push(
      lang === 'zh'
        ? '† 本轮该操作方差偏大（大量分配触发主 GC 的停顿），中位数可读、p95 仅作参考；空闲机器上重测可收敛。'
        : '† This operation had high variance in this run (major GC pauses from bulk allocation). The median is readable; treat p95 as indicative and re-measure on an idle machine to tighten it.'
    );
  }
  lines.push('');
  lines.push(`### ${lang === 'zh' ? '指标说明' : 'Metrics'}`);
  lines.push('');
  text.metrics.forEach((line) => lines.push(`- ${line}`));
  lines.push('');
}

/** 核心库报告：标准操作 + 启动 + 内存 + 护栏 + 体积。 */
export async function formatCoreReport({ core, sizes }) {
  return renderDocs(CORE_DOCS, ({ lang, text }) => {
    const operand = operationTable(core);
    const { fingerprint, resources } = core;
    const lines = [];

    lines.push(`# ${text.titleCore}`);
    lines.push('');
    lines.push(text.plan);
    lines.push('');
    lines.push(
      ...documentHeader({
        fingerprint,
        lang,
        noisy: Boolean(core.noisy),
        runs: core.operations[0]?.stats.durations.length ?? 0,
        text
      })
    );
    operationTableLines({ lang, lines, operand, text });

    lines.push(`## ${text.startup}`);
    lines.push('');
    lines.push(
      lang === 'zh'
        ? `- 客户端 \`bindTo()\`：ready ${number(resources.startup.client.ready?.median)} · 首次绘制 ${number(resources.startup.client.firstPaint?.median)}`
        : `- client \`bindTo()\`: ready ${number(resources.startup.client.ready?.median)} · first paint ${number(resources.startup.client.firstPaint?.median)}`
    );
    lines.push(
      lang === 'zh'
        ? `- SSR + hydrate：服务端渲染 ${number(resources.startup.ssr.serverRender?.median)} · 客户端接管 ${number(resources.startup.ssr.hydrate?.median)} · ready ${number(resources.startup.ssr.ready?.median)}`
        : `- SSR + hydrate: server render ${number(resources.startup.ssr.serverRender?.median)} · client hydrate ${number(resources.startup.ssr.hydrate?.median)} · ready ${number(resources.startup.ssr.ready?.median)}`
    );
    lines.push('');
    lines.push(`## ${text.memory}`);
    lines.push('');
    lines.push(`- ${text.memoryIntro}`);
    lines.push(
      lang === 'zh'
        ? `- 初始 ${resources.memory.initial} · 1k 行 ${resources.memory.afterCreate1k} · 10k 行 ${resources.memory.afterCreate10k} · clear 后 ${resources.memory.afterClear}`
        : `- initial ${resources.memory.initial} · 1k rows ${resources.memory.afterCreate1k} · 10k rows ${resources.memory.afterCreate10k} · after clear ${resources.memory.afterClear}`
    );
    lines.push(
      lang === 'zh'
        ? `- clear 后未回落 ${resources.memory.clearResidue} · 10 轮建/清后相对初始 ${resources.memory.tenRoundGrowth}`
        : `- residue after clear ${resources.memory.clearResidue} · after 10 create/clear rounds ${resources.memory.tenRoundGrowth}`
    );
    lines.push('');
    pushComparability({ items: text.comparabilityCore, lang, lines });
    pushGuards({ lang, lines, text });
    pushSizes({ lang, lines, sizes });

    return lines.join('\n');
  });
}

/** UI 库报告：核心库基础元素 vs UI 库组件元素 + 虚拟滚动。 */
export async function formatUiReport({ ui, sizes }) {
  return renderDocs(UI_DOCS, ({ lang, text }) => {
    const { componentRun, coreRun, fingerprint, resources } = ui;
    const comparison = comparisonRows({
      baseline: { operations: coreRun.operations },
      component: { operations: componentRun.operations }
    });
    const lines = [];

    lines.push(`# ${text.titleUi}`);
    lines.push('');
    lines.push(text.plan);
    lines.push('');
    lines.push(
      ...documentHeader({
        fingerprint,
        lang,
        noisy: false,
        runs: coreRun.operations[0]?.stats.durations.length ?? 0,
        text
      })
    );
    lines.push(`## ${text.tableHead.component}`);
    lines.push('');
    lines.push(text.componentIntro);
    lines.push('');
    lines.push(
      `| ${text.tableHead.op} | ${text.tableHead.nativeWork} | ${text.tableHead.componentWork} | ${text.tableHead.nativeNodes} | ${text.tableHead.componentNodes} |`
    );
    lines.push('| --- | --- | --- | --- | --- |');
    comparison.forEach((row) => {
      lines.push(
        `| \`${row.op}\` (${OP_LABELS[row.op] ?? row.op}) | ${number(row.native)} | ${number(
          row.component
        )} | ${row.nativeNodes} | ${row.componentNodes} |`
      );
    });
    lines.push('');
    lines.push(`### ${lang === 'zh' ? '指标说明' : 'Metrics'}`);
    lines.push('');
    text.metrics.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push(`## ${text.virtual}`);
    lines.push('');
    lines.push(
      `| ${text.virtualHead.logical} | ${text.virtualHead.nodes} | ${text.virtualHead.rendered} | ${text.virtualHead.jump} | ${text.virtualHead.append} | ${text.virtualHead.heap} |`
    );
    lines.push('| --- | --- | --- | --- | --- | --- |');
    resources.vscroll.forEach((entry) => {
      lines.push(
        `| ${entry.logicalRows} | ${entry.realNodes} | ${entry.renderedRows} | ${number(
          entry.jump.median
        )} | ${number(entry.append.median)} | ${entry.heapMb} |`
      );
    });
    lines.push('');
    pushComparability({ items: text.comparabilityUi, lang, lines });
    pushGuards({ lang, lines, text });
    pushSizes({ lang, lines, sizes });

    return lines.join('\n');
  });
}

function pushComparability({ items, lang, lines }) {
  lines.push(`## ${lang === 'zh' ? '可比性与口径' : 'Comparability and definitions'}`);
  lines.push('');
  items.forEach((line) => lines.push(`- ${line}`));
  lines.push('');
}

function pushGuards({ lang, lines, text }) {
  lines.push(`## ${lang === 'zh' ? '确定性护栏' : 'Deterministic guards'}`);
  lines.push('');
  lines.push(text.guards);
  lines.push('');
}

function pushSizes({ lang, lines, sizes }) {
  lines.push(
    `## ${lang === 'zh' ? '体积（引自产物报表）' : 'Bundle size (from the artifact report)'}`
  );
  lines.push('');
  sizeLines(sizes).forEach(([name, value]) => {
    lines.push(`- \`${name}\`: ${value} KB min+gzip`);
  });
  lines.push('');
}

export async function compareBenchDocs({ core, sizes, ui }) {
  const mismatches = [];
  const generated = [...(await formatCoreReport({ core, sizes }))];
  // UI 报告可以尚未产出（结果 JSON 不存在时一并跳过，避免用旧文档误导）
  if (ui) {
    generated.push(...(await formatUiReport({ sizes, ui })));
  }

  generated.forEach(({ content, file }) => {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (current === null) {
      mismatches.push(`${file}: 报告文件缺失`);
      return;
    }
    if (current !== content) {
      mismatches.push(`${file}: 与 benchmarks/results 的结果 JSON 不一致`);
    }
  });

  return mismatches;
}
