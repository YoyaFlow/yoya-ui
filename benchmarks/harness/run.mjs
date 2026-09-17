// 核心基准 harness：Chrome/Edge headless 驱动基准页，按 benchmarks/PLAN.md 的口径测量。
//
// 用法：
//   npm run bench:jfb                       # 全部操作，预热 3 + 测量 15 轮
//   npm run bench:jfb -- --op run --runs 25
//   npm run bench:jfb -- --variant component
//   npm run bench:jfb -- --write-baseline
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { startStaticServer } from './server.mjs';

const REPO = resolve(import.meta.dirname, '../..');
const PAGE = 'benchmarks/js-framework-benchmark/keyed/yoya-ui-core/index.html';
const VSCROLL_PAGE = 'benchmarks/js-framework-benchmark/keyed/yoya-ui-core/vscroll.html';
const RESULTS_DIR = resolve(REPO, 'benchmarks/results');

const OPERATIONS = [
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

// 每个操作结束后应有的行数，以及该操作允许的行构建次数（快路径必须是 0）。
const EXPECTED_ROWS = {
  add: 2000,
  clear: 0,
  remove: 999,
  replace: 1000,
  run: 1000,
  runlots: 10000,
  select: 1000,
  swaprows: 1000,
  update: 1000
};
const EXPECTED_BUILDS = {
  add: 1000,
  clear: 0,
  remove: 0,
  replace: 1000,
  run: 1000,
  runlots: 10000,
  select: 0,
  swaprows: 0,
  update: 0
};

function parseArgs(argv) {
  const flags = {
    allowNoisy: false,
    ops: null,
    out: null,
    runs: 15,
    skipResources: false,
    ui: false,
    variant: 'native',
    warmup: 3,
    writeBaseline: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const [rawFlag, inlineValue] = argv[index].split('=');
    const flag = rawFlag;
    const takeValue = () => (inlineValue !== undefined ? inlineValue : argv[++index]);

    if (flag === '--op') {
      flags.ops = String(takeValue() ?? '')
        .split(',')
        .filter(Boolean);
    } else if (flag === '--runs') {
      flags.runs = Number(takeValue());
    } else if (flag === '--warmup') {
      flags.warmup = Number(takeValue());
    } else if (flag === '--variant') {
      flags.variant = takeValue() === 'component' ? 'component' : 'native';
    } else if (flag === '--write-baseline') {
      flags.writeBaseline = true;
    } else if (flag === '--allow-noisy') {
      flags.allowNoisy = true;
    } else if (flag === '--skip-resources') {
      flags.skipResources = true;
    } else if (flag === '--ui') {
      // UI 报告模式：同一会话内跑「核心库基础元素」与「UI 库组件元素」两组，并测虚拟滚动
      flags.ui = true;
      flags.skipResources = true;
    } else if (flag === '--out') {
      flags.out = String(takeValue() ?? '').replace(/[^\w.-]/g, '');
    } else if (OPERATIONS.includes(argv[index])) {
      flags.ops = [...(flags.ops ?? []), argv[index]];
    }
  }

  flags.ops = flags.ops ?? OPERATIONS;
  for (const op of flags.ops) {
    if (!OPERATIONS.includes(op)) {
      throw new Error(`未知操作 ${op}；可用：${OPERATIONS.join(' / ')}`);
    }
  }

  return flags;
}

function quantile(sorted, ratio) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return sorted[index];
}

function summarize(durations) {
  const sorted = [...durations].sort((left, right) => left - right);
  const median = quantile(sorted, 0.5);

  return {
    durations: durations.map((value) => Number(value.toFixed(2))),
    iqr: Number((quantile(sorted, 0.75) - quantile(sorted, 0.25)).toFixed(2)),
    max: Number(sorted.at(-1).toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(sorted[0].toFixed(2)),
    p95: Number(quantile(sorted, 0.95).toFixed(2))
  };
}

/** 非时间类采样（启动、内存）只取中位数与极值。 */
function summarizeValues(values) {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value));

  if (numbers.length === 0) {
    return null;
  }

  const sorted = [...numbers].sort((left, right) => left - right);

  return {
    max: Number(sorted.at(-1).toFixed(3)),
    median: Number(quantile(sorted, 0.5).toFixed(3)),
    min: Number(sorted[0].toFixed(3)),
    samples: numbers.map((value) => Number(value.toFixed(3)))
  };
}

/** 启动：fresh page 每轮，记录渲染 / 接管 / ready 与首次绘制。 */
async function measureStartup(browser, url, runs) {
  const samples = [];

  for (let round = 0; round < runs; round += 1) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__yoyaBench?.startup?.readyAt != null);
    samples.push(
      await page.evaluate(() => {
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find((entry) => entry.name === 'first-contentful-paint');
        return {
          ...window.__yoyaBench.startup,
          firstPaint: fcp ? fcp.startTime : null
        };
      })
    );
    await page.close();
  }

  return {
    firstPaint: summarizeValues(samples.map((sample) => sample.firstPaint)),
    hydrate: summarizeValues(samples.map((sample) => sample.hydrateMs)),
    mode: samples[0]?.mode ?? 'client',
    ready: summarizeValues(samples.map((sample) => sample.readyAt)),
    serverRender: summarizeValues(samples.map((sample) => sample.renderMs))
  };
}

/** 内存：GC 后采样堆大小，覆盖初始 / 1k / 10k / clear / 10 轮 replace。 */
async function measureMemory(browser, url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__yoyaBench !== undefined);

  const cdp = await page.context().newCDPSession(page);
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
  };
  const toMb = (bytes) =>
    typeof bytes === 'number' ? Number((bytes / 1024 / 1024).toFixed(2)) : null;

  const initial = await heap();
  await page.evaluate(() => window.__yoyaBench.ops.run());
  const afterCreate1k = await heap();
  await page.evaluate(() => window.__yoyaBench.ops.runlots());
  const afterCreate10k = await heap();
  await page.evaluate(() => window.__yoyaBench.ops.clear());
  const afterClear = await heap();
  for (let round = 0; round < 10; round += 1) {
    await page.evaluate(() => window.__yoyaBench.ops.run());
    await page.evaluate(() => window.__yoyaBench.ops.clear());
  }
  const afterTenRounds = await heap();
  await page.close();

  const mb = (value) => toMb(value);

  return {
    afterClear: mb(afterClear),
    afterCreate10k: mb(afterCreate10k),
    afterCreate1k: mb(afterCreate1k),
    afterTenReplaceRounds: mb(afterTenRounds),
    clearResidue: mb(afterClear - initial),
    initial: mb(initial),
    tenRoundGrowth: mb(afterTenRounds - initial),
    unit: 'MB'
  };
}

/** 页内：虚拟滚动档的动作测量（跳转 / 追加）。 */
async function measureVScrollAction({ argument, kind }) {
  const bench = window.__yoyaBench;
  const host = document.getElementById('vscroll-host');
  let mutated = false;
  let lastMutation;

  const observer = new MutationObserver(() => {
    mutated = true;
    lastMutation = performance.now();
  });
  observer.observe(host, { attributes: true, characterData: true, childList: true, subtree: true });

  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  mutated = false;

  const started = performance.now();
  if (kind === 'jump') {
    bench.ops.jumpEnd();
  } else {
    bench.ops.append(argument ?? 1000);
  }

  const settledAt = await new Promise((done) => {
    const deadline = performance.now() + 30000;
    const tick = () => {
      const now = performance.now();
      if (now > deadline || !mutated) {
        done(now);
        return;
      }
      mutated = false;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const duration = settledAt - started;
  const work = Math.max(0, (lastMutation ?? started) - started);
  observer.disconnect();

  return { duration, stats: bench.stats(), work };
}

/** 虚拟滚动档：逻辑行 1k / 10k / 100k 的挂载、跳转、追加与堆占用。 */
async function measureVScroll(browser, origin, sizes, runs) {
  const results = [];

  for (const size of sizes) {
    const page = await browser.newPage();
    await page.goto(`${origin}/${VSCROLL_PAGE}?rows=${size}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__yoyaBench !== undefined);

    const mounted = await page.evaluate(() => ({
      ready: performance.now(),
      stats: window.__yoyaBench.stats()
    }));
    const jumpDurations = [];
    const appendDurations = [];

    for (let round = 0; round < runs; round += 1) {
      jumpDurations.push(
        (await page.evaluate(measureVScrollAction, { argument: 0, kind: 'jump' })).duration
      );
      appendDurations.push(
        (await page.evaluate(measureVScrollAction, { argument: 1000, kind: 'append' })).duration
      );
    }

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');
    const heapBytes = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
    const stats = await page.evaluate(() => window.__yoyaBench.stats());
    await page.close();

    results.push({
      append: summarize(appendDurations),
      heapMb: typeof heapBytes === 'number' ? Number((heapBytes / 1024 / 1024).toFixed(2)) : null,
      jump: summarize(jumpDurations),
      logicalRows: mounted.stats.logicalRows,
      mountReady: Number(mounted.ready.toFixed(2)),
      realNodes: stats.realNodes,
      renderedRows: stats.renderedRows,
      size
    });
  }

  return results;
}

async function launchChromium() {
  const failures = [];

  for (const channel of ['chrome', 'msedge']) {
    try {
      const browser = await chromium.launch({
        args: ['--enable-precise-memory-info'],
        channel,
        headless: true
      });
      return { browser, channel };
    } catch (error) {
      failures.push(`${channel}: ${String(error.message).split('\n')[0]}`);
    }
  }

  throw new Error(`无法启动 Chromium 系浏览器：\n${failures.join('\n')}`);
}

function fingerprint(browser, channel) {
  let commit;
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).toString().trim();
  } catch {
    commit = 'unknown';
  }

  return {
    browser: { channel, name: browser.browserType().name(), version: browser.version() },
    cpuCount: cpus().length,
    date: new Date().toISOString(),
    machine: `${platform()} ${release()} ${process.arch}`,
    node: process.version,
    packageVersion: JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')).version,
    repoCommit: commit
  };
}

/** 页内：把状态恢复到该操作的测量前置条件（不计入测量）。 */
function prepareInPage(op) {
  const bench = window.__yoyaBench;
  bench.ops.clear();
  if (op !== 'run' && op !== 'runlots') {
    bench.ops.run();
  }
  return bench.stats();
}

/** 页内：点击标准按钮并测量到 DOM 稳定为止，同时记录 mutation 与节点身份。 */
async function measureInPage(op) {
  const bench = window.__yoyaBench;
  const body = document.getElementById('tbody');
  const mutations = { attributes: 0, characterData: 0, childList: 0 };
  let mutatedThisFrame = false;
  let lastMutation;

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      mutations[record.type] += 1;
    });
    mutatedThisFrame = true;
    lastMutation = performance.now();
  });
  observer.observe(body, { attributes: true, characterData: true, childList: true, subtree: true });

  const beforeRows = bench.rowElements();
  const beforeStats = bench.stats();
  const beforeIds = bench.ids();
  const target =
    op === 'select' || op === 'remove'
      ? body.querySelector('tr:nth-child(5)')
      : document.getElementById(op);
  const clickTarget = op === 'remove' ? target.querySelector('.remove') : target;

  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

  const started = performance.now();
  clickTarget.click();
  const settled = await new Promise((done) => {
    const deadline = performance.now() + 30000;
    const tick = () => {
      const now = performance.now();
      if (now > deadline) {
        done({ outcome: 'timeout', settledAt: now });
        return;
      }

      // 一帧内没有任何变动即视为稳定：稳定点取该帧结束时刻（含绘制）
      if (!mutatedThisFrame) {
        done({ outcome: 'settled', settledAt: now });
        return;
      }

      mutatedThisFrame = false;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const duration = settled.settledAt - started;
  const work = Math.max(0, (lastMutation ?? started) - started);
  observer.disconnect();

  const afterRows = bench.rowElements();

  return {
    afterIds: bench.ids(),
    afterRowCount: afterRows.length,
    afterStats: bench.stats(),
    beforeIds,
    beforeRowCount: beforeRows.length,
    beforeStats,
    duration,
    settled,
    work,
    keptRows: beforeRows.filter((element) => afterRows.includes(element)).length,
    labels: bench.labels(),
    mutations,
    nodeCount: document.querySelectorAll('#table-host *').length,
    selected: bench.selected()
  };
}

function guardFailures(op, result) {
  const failures = [];
  const buildDelta = result.afterStats.builds - result.beforeStats.builds;

  if (buildDelta !== EXPECTED_BUILDS[op]) {
    failures.push(`行构建次数 ${buildDelta} ≠ 期望 ${EXPECTED_BUILDS[op]}`);
  }
  if (result.afterRowCount !== EXPECTED_ROWS[op]) {
    failures.push(`行数 ${result.afterRowCount} ≠ 期望 ${EXPECTED_ROWS[op]}`);
  }

  if (op === 'update') {
    if (result.mutations.childList !== 0) {
      failures.push(`字段更新出现了 ${result.mutations.childList} 次子节点变动（应原地改文本）`);
    }
    const wrong = result.labels.filter((label, index) => {
      const id = result.afterIds[index];
      return label !== (index % 10 === 0 ? `label ${id} !!!` : `label ${id}`);
    });
    if (wrong.length > 0) {
      failures.push(`有 ${wrong.length} 行标签不符合预期（例如 ${wrong[0]}）`);
    }
  }

  if (op === 'select') {
    if (result.mutations.childList !== 0) {
      failures.push(`选中行出现了 ${result.mutations.childList} 次子节点变动`);
    }
    if (result.selected.length !== 1 || result.selected[0] !== 5) {
      failures.push(`选中态异常：${JSON.stringify(result.selected)}`);
    }
  }

  if (op === 'swaprows') {
    if (result.keptRows !== result.beforeRowCount) {
      failures.push(
        `重排后只保留了 ${result.keptRows}/${result.beforeRowCount} 个行节点（应全部保留）`
      );
    }
    if (result.afterIds[1] !== 999 || result.afterIds[998] !== 2) {
      failures.push(
        `交换结果异常：第 2 行 ${result.afterIds[1]}、第 999 行 ${result.afterIds[998]}`
      );
    }
  }

  if (op === 'add') {
    if (result.keptRows !== result.beforeRowCount) {
      failures.push(`追加后只保留了 ${result.keptRows}/${result.beforeRowCount} 个既有行节点`);
    }
    if (result.afterIds[0] !== 1 || result.afterIds.at(-1) !== 2000) {
      failures.push(`追加后的 id 范围异常：${result.afterIds[0]} … ${result.afterIds.at(-1)}`);
    }
  }

  if (op === 'remove') {
    if (result.keptRows !== result.beforeRowCount - 1) {
      failures.push(`删除后保留了 ${result.keptRows} 行（应为 ${result.beforeRowCount - 1}）`);
    }
    if (result.afterIds.includes(5)) {
      failures.push('被删除的行（id 5）仍在 DOM 中');
    }
  }

  if (op === 'run' || op === 'runlots' || op === 'clear') {
    const wrong = result.labels.filter(
      (label, index) => label !== `label ${result.afterIds[index]}`
    );
    if (wrong.length > 0) {
      failures.push(`有 ${wrong.length} 行标签不符合预期（例如 ${wrong[0]}）`);
    }
  }

  if (op === 'replace') {
    // 整批换引用：行节点应全部重建，且 id / 标签回到初始状态
    if (result.keptRows !== 0) {
      failures.push(`整批替换后仍复用了 ${result.keptRows} 个旧行节点（应全部重建）`);
    }
    const wrong = result.labels.filter(
      (label, index) => label !== `label ${result.afterIds[index]}`
    );
    if (wrong.length > 0) {
      failures.push(`有 ${wrong.length} 行标签不符合预期（例如 ${wrong[0]}）`);
    }
  }

  if (result.settled?.outcome !== 'settled') {
    failures.push(`测量期间 DOM 未稳定（${result.settled?.outcome}）`);
  }

  return failures;
}

function printTable(operations, variant) {
  const header = `${'操作'.padEnd(12)}${'中位数'.padStart(10)}${'p95'.padStart(10)}${'IQR'.padStart(10)}${'工作量'.padStart(10)}${'行数'.padStart(10)}${'DOM 节点'.padStart(12)}  护栏`;
  console.log(`\nyoya-ui 核心基准（${variant}）`);
  console.log(header);
  console.log('-'.repeat(header.length + 6));

  operations.forEach(({ guards, op, rows, stats, nodes, work }) => {
    console.log(
      `${op.padEnd(12)}${`${stats.median} ms`.padStart(10)}${`${stats.p95} ms`.padStart(10)}${`${stats.iqr} ms`.padStart(10)}${`${work.median} ms`.padStart(10)}${String(rows).padStart(10)}${String(nodes).padStart(12)}  ${
        guards.length === 0 ? '通过' : `失败 ×${guards.length}`
      }`
    );
  });
}

function printResources(resources) {
  if (!resources) return;

  const { memory, startup } = resources;
  const ms = (value) => (value === null || value === undefined ? 'n/a' : `${value} ms`);

  console.log('\n启动（中位数，fresh page）');
  console.log(
    `客户端 bindTo：ready ${ms(startup.client.ready?.median)} · 首次绘制 ${ms(startup.client.firstPaint?.median)}`
  );
  console.log(
    `SSR + hydrate：服务端渲染 ${ms(startup.ssr.serverRender?.median)} · 客户端接管 ${ms(
      startup.ssr.hydrate?.median
    )} · ready ${ms(startup.ssr.ready?.median)}`
  );
  console.log('\n内存（GC 后采样，MB）');
  console.log(
    `初始 ${memory.initial} · 1k ${memory.afterCreate1k} · 10k ${memory.afterCreate10k} · clear 后 ${memory.afterClear}`
  );
  console.log(
    `clear 后未回落 ${memory.clearResidue} · 10 轮建/清后相对初始 ${memory.tenRoundGrowth}`
  );
}

/** 虚拟滚动档（UI 报告）：逻辑行 vs 真实 DOM。 */
function printVScroll(vscroll) {
  console.log('\n虚拟滚动档（仅内部可比）');
  console.log(
    `${'逻辑行'.padEnd(10)}${'真实节点'.padStart(10)}${'渲染行'.padStart(10)}${'跳转'.padStart(12)}${'追加 1k'.padStart(12)}${'堆 MB'.padStart(10)}`
  );
  vscroll.forEach((entry) => {
    console.log(
      `${String(entry.logicalRows).padEnd(10)}${String(entry.realNodes).padStart(10)}${String(
        entry.renderedRows
      ).padStart(
        10
      )}${`${entry.jump.median} ms`.padStart(12)}${`${entry.append.median} ms`.padStart(
        12
      )}${String(entry.heapMb).padStart(10)}`
    );
  });
}

/** 跑一组操作（一个渲染单元），返回操作结果与护栏失败。 */
async function runOperations(browser, origin, { ops, runs, variant, warmup }) {
  const page = await browser.newPage();
  const operations = [];
  const allGuards = [];

  try {
    for (const op of ops) {
      await page.goto(`${origin}/${PAGE}?variant=${variant}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__yoyaBench !== undefined);
      const cdp = await page.context().newCDPSession(page);
      const collectGarbage = () => cdp.send('HeapProfiler.collectGarbage');

      // 每个操作开始前 GC 一次；后续轮次共享热堆（每轮强制 GC 会让冷堆重新增长，
      // 反而在 replace / create 10,000 期间触发主 GC 停顿，实测方差更大）
      await collectGarbage();

      for (let round = 0; round < warmup; round += 1) {
        await page.evaluate(prepareInPage, op);
        await page.evaluate(measureInPage, op);
      }

      const durations = [];
      const works = [];
      let last = null;

      for (let round = 0; round < runs; round += 1) {
        await page.evaluate(prepareInPage, op);
        last = await page.evaluate(measureInPage, op);
        durations.push(last.duration);
        works.push(last.work);
      }

      const guards = guardFailures(op, last);
      allGuards.push({ guards, op });
      const stats = summarize(durations);
      const workStats = summarize(works);
      // 噪声判据：IQR 超过中位数的一半，说明这轮受其他进程干扰，数字不可用作基线
      const noisy = stats.median > 0 && stats.iqr / stats.median > 0.5;
      operations.push({
        guards,
        nodes: last.nodeCount,
        noisy,
        op,
        rows: last.afterRowCount,
        stats,
        work: workStats
      });
      console.log(
        `${variant} · ${op} 完成：中位数 ${stats.median} ms（工作量 ${workStats.median} ms），护栏 ${
          guards.length === 0 ? '通过' : '失败'
        }${noisy ? ' · 噪声偏高' : ''}`
      );
    }
  } finally {
    await page.close();
  }

  const failures = allGuards.flatMap(({ guards, op }) =>
    guards.map((message) => `${op}: ${message}`)
  );

  return { failures, operations };
}

/** 与已提交基线对比：时间类指标只做软告警（同机同版本才有意义）。 */
function printBaselineComparison(operations) {
  const baselineFile = resolve(RESULTS_DIR, 'baseline.json');
  if (!existsSync(baselineFile)) return;

  const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
  const regressionWarnings = [];

  console.log(
    `\n与基线对比（基线提交 ${baseline.fingerprint.repoCommit}，${baseline.fingerprint.date}）`
  );
  operations.forEach((entry) => {
    const base = baseline.operations.find((item) => item.op === entry.op);
    if (!base || !base.stats.median) return;
    const ratio = entry.stats.median / base.stats.median;
    if (ratio > 1.2) {
      regressionWarnings.push(
        `${entry.op}: ${entry.stats.median} ms vs 基线 ${base.stats.median} ms（×${ratio.toFixed(2)}）`
      );
    }
    console.log(
      `  ${entry.op.padEnd(10)}${`${entry.stats.median} ms`.padStart(12)}  基线 ${String(base.stats.median).padStart(8)} ms  ×${ratio.toFixed(2)}`
    );
  });

  if (regressionWarnings.length > 0) {
    console.error('\n软告警（超过基线 20%，需人工确认是否受机器负载影响）：');
    regressionWarnings.forEach((message) => console.error(`  ${message}`));
  }
}

const flags = parseArgs(process.argv.slice(2));
const server = await startStaticServer();
const { browser, channel } = await launchChromium();
const env = fingerprint(browser, channel);
let report;

try {
  if (flags.ui) {
    // UI 报告：两组渲染单元各自独占一个浏览器实例（避免组间 JIT / 堆状态耦合），再加虚拟滚动
    const nativeBrowser = await launchChromium();
    const coreRun = await runOperations(nativeBrowser.browser, server.origin, {
      ops: flags.ops,
      runs: flags.runs,
      variant: 'native',
      warmup: flags.warmup
    });
    await nativeBrowser.browser.close();

    const componentBrowser = await launchChromium();
    const componentRun = await runOperations(componentBrowser.browser, server.origin, {
      ops: flags.ops,
      runs: flags.runs,
      variant: 'component',
      warmup: flags.warmup
    });
    await componentBrowser.browser.close();
    const vscroll = await measureVScroll(browser, server.origin, [1000, 10000, 100000], 5);

    printTable(coreRun.operations, 'native');
    printTable(componentRun.operations, 'component');
    printVScroll(vscroll);

    report = {
      componentRun: { failures: componentRun.failures, operations: componentRun.operations },
      coreRun: { failures: coreRun.failures, operations: coreRun.operations },
      fingerprint: env,
      layer: 'ui',
      noisy: [...coreRun.operations, ...componentRun.operations].some((entry) => entry.noisy),
      resources: { vscroll },
      schema: 1
    };

    if (report.noisy) {
      console.error(
        '\n噪声偏高：本轮有操作 IQR 超过中位数一半，两组数字不能直接对照，建议机器空闲时重跑（需要 --allow-noisy 才能写入 ui.json）。'
      );
    }
  } else {
    const core = await runOperations(browser, server.origin, {
      ops: flags.ops,
      runs: flags.runs,
      variant: flags.variant,
      warmup: flags.warmup
    });
    let resources = null;

    if (!flags.skipResources) {
      const clientUrl = `${server.origin}/${PAGE}?variant=${flags.variant}`;
      const startup = {
        client: await measureStartup(browser, clientUrl, 5),
        ssr: await measureStartup(browser, `${clientUrl}&mode=ssr`, 5)
      };
      resources = { memory: await measureMemory(browser, clientUrl), startup };
    }

    printTable(core.operations, flags.variant);
    printResources(resources);
    if (!flags.writeBaseline) {
      printBaselineComparison(core.operations);
    }

    const noisyOperations = core.operations.filter((entry) => entry.noisy).map((entry) => entry.op);
    if (noisyOperations.length > 0) {
      console.error(
        `\n噪声偏高（IQR > 中位数一半）：${noisyOperations.join(' / ')} —— 这轮数字不适合作为基线，建议机器空闲时重跑。`
      );
    }

    report = {
      fingerprint: env,
      guards: { failures: core.failures, passed: core.failures.length === 0 },
      noisy: noisyOperations.length > 0,
      operations: core.operations,
      resources,
      schema: 1,
      variant: flags.variant
    };
  }
} finally {
  await browser.close();
  await server.close();
}

const failures = flags.ui
  ? [...report.coreRun.failures, ...report.componentRun.failures]
  : (report.guards?.failures ?? []);

if (failures.length > 0) {
  console.error('\n护栏失败：');
  failures.forEach((message) => console.error(`  ${message}`));
}

mkdirSync(RESULTS_DIR, { recursive: true });
writeFileSync(resolve(RESULTS_DIR, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (flags.ui) {
  if (report.noisy && !flags.allowNoisy) {
    console.error('\nui.json 未更新：本轮噪声偏高（需要 --allow-noisy 才能覆盖）');
    process.exitCode = 1;
  } else {
    writeFileSync(resolve(RESULTS_DIR, 'ui.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n已写入：benchmarks/results/ui.json');
  }
}
// --out=baseline 交给下面的噪声守卫处理，避免绕过基线保护
if (flags.out && flags.out !== 'baseline') {
  writeFileSync(
    resolve(RESULTS_DIR, `${flags.out}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
  console.log(`\n已写入：benchmarks/results/${flags.out}.json`);
}
if (flags.writeBaseline && !flags.ui) {
  if (report.noisy && !flags.allowNoisy) {
    console.error('\n基线未更新：本轮噪声偏高（需要 --allow-noisy 才能覆盖基线）');
    process.exitCode = 1;
  } else {
    writeFileSync(
      resolve(RESULTS_DIR, 'baseline.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8'
    );
    console.log('\n已更新基线：benchmarks/results/baseline.json');
  }
}

if (failures.length > 0) {
  process.exitCode = 1;
}
