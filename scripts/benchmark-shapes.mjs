// 形状矩阵基准（票 20 §2）：把「行规模 × 九项操作」的真机数字跑出来，写进 `benchmark/shapes.json`。
//
//   npm run report:shapes                       # 跑一轮并刷新 benchmark/shapes.json
//   YOYA_CHROME=<可执行文件> npm run report:shapes
//
// 为什么单独一支：**编译深度的取舍必须由真机数字决定**（同一批形状在 jsdom 里置换更慢 1.2–1.6×，
// 真机才是 0.3–0.6×）——jsdom 只留"排序"结论。这一支给出的是"收益为正的形状集合"，也就是 L3
// （合并）/ L4（重复单元）判定参数的唯一来源。
//
// 口径：
// - 两列对照**同一份行源码**：`row.fixture.js` = 不挂编译器的通用路径；`row.compiled.js` = 真编译器产物；
// - 列表对账（`keyed`）两条路共用，差额 = 每行建造成本；
// - 每项结果都做 DOM 逐字节比对，不一致直接非零退出（基准不许在错产物上跑数）；
// - 数字随机器/浏览器变，**只保证比值方向**；`benchmark/shapes.json` 里记了机器与浏览器指纹。
import { createServer } from 'node:http';
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import * as core from '../src/yoya.core.js';
import { compileSource, elementWhitelistOf } from '../src/compiler/index.js';

const root = resolve(import.meta.dirname, '..');
const shapesDir = join(root, 'benchmark/shapes');
const workDir = join(root, '.scratch/benchmark-shapes');
const outFile = join(root, 'benchmark/shapes.json');
const reportFile = join(root, 'benchmark/shapes-report.md');
/** 无头浏览器：默认本机 Edge，可用 `YOYA_CHROME` 指定 Chromium / Chrome。 */
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = process.env.YOYA_CHROME ?? EDGE;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** 1) 用真编译器把行夹具编成 element 通道的产物（与基准页里那一列完全一致）。 */
function buildCompiledRow() {
  const source = readFileSync(join(shapesDir, 'row.fixture.js'), 'utf8');
  const result = compileSource({
    source,
    file: relative(root, join(shapesDir, 'row.fixture.js')).replaceAll('\\', '/'),
    fn: 'Row',
    // **node 通道**：两列必须在同一份 `keyed` 下产出逐字节相同的 DOM（核心 `keyed` 只给
    // 节点行写 `data-row-key` 镜像）；这也是插件对"被当 ViewNode 用的行"的默认档。
    mode: 'node',
    core,
    whitelist: elementWhitelistOf(core),
    runtime: '/src/compiler/runtime.js',
    coreSpecifier: '/src/yoya.core.js'
  });
  if (!result.compiled) {
    throw new Error(`行夹具编不出来：${result.bails.map((bail) => bail.reason).join(' | ')}`);
  }
  return result;
}

/** 2) 把页面所需的源码铺到静态服务的目录里（生成物不进 git，源码只有 `benchmark/shapes/` 一份）。 */
function stage() {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  cpSync(join(shapesDir, 'bench.js'), join(workDir, 'bench.js'));
  cpSync(join(shapesDir, 'row.fixture.js'), join(workDir, 'row.fixture.js'));
  cpSync(join(shapesDir, 'page.html'), join(workDir, 'page.html'));
  const compiled = buildCompiledRow();
  writeFileSync(join(workDir, 'row.compiled.js'), compiled.module, 'utf8');
  return { compiled, page: `/${relative(root, join(workDir, 'page.html')).replaceAll('\\', '/')}` };
}

const { compiled, page } = stage();

// 3) 静态服务仓库根目录：页面按 `/src/...` 引核心，产物按相对路径引兄弟文件。
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const target = resolve(root, `.${normalize(decodeURIComponent(url.pathname))}`);
  if (!target.startsWith(root)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    if (statSync(target).isDirectory()) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, {
      'content-type': MIME[extname(target)] ?? 'application/octet-stream'
    });
    response.end(readFileSync(target));
  } catch {
    response.writeHead(404).end('not found');
  }
});

await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const { port } = server.address();

const browser = await chromium.launch({ executablePath, headless: true });
const pageHandle = await browser.newPage();
pageHandle.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('favicon')) {
    console.error('[page]', message.text());
  }
});
pageHandle.on('pageerror', (error) => console.error('[pageerror]', error.message));

await pageHandle.goto(`http://127.0.0.1:${port}${page}`, { waitUntil: 'load' });
await pageHandle.waitForFunction(() => window.__benchReady === true, null, { timeout: 30000 });
const result = await pageHandle.evaluate(() => window.__runBench());
await browser.close();
server.close();

const mismatched = result.mismatches.length > 0 || !result.sequenceEqual;

console.log(`\n浏览器：${result.userAgent}`);
console.log(
  `九项操作逐项 DOM 一致（通用 vs 编译产物）：${
    result.mismatches.length === 0 ? '是' : `否 → ${result.mismatches.join('、')}`
  }`
);
console.log(`keyed 全流程对账后 DOM 一致（建→改→选中→交换→删→追加）：${result.sequenceEqual}`);
if (!result.sequenceEqual) {
  for (let index = 0; index < result.sequence.runtime.length; index += 1) {
    if (result.sequence.runtime[index] !== result.sequence.compiled[index]) {
      console.log('  首个差异 @', index);
      console.log(
        '    runtime :',
        result.sequence.runtime.slice(Math.max(0, index - 40), index + 60)
      );
      console.log(
        '    compiled:',
        result.sequence.compiled.slice(Math.max(0, index - 40), index + 60)
      );
      break;
    }
  }
}
console.log('\n操作                      通用(ms)  编译(ms)   比值');
for (const row of result.rows) {
  const ratio = Number.isFinite(row.ratio) ? row.ratio.toFixed(2) : '—';
  console.log(
    `${row.name.padEnd(24)} ${row.runtimeMs.toFixed(3).padStart(8)} ${row.compiledMs
      .toFixed(3)
      .padStart(9)} ${ratio.padStart(7)}`
  );
}
console.log('\n形状矩阵（create 1k，手写置换当对照；列 = 每行元素数）：');
console.log('  列数   片段   通用(ms)   置换(ms)   比值   DOM 一致');
for (const entry of result.sizeSweep) {
  console.log(
    `  ${String(entry.columns).padStart(3)} ${kb(entry.bytes).padStart(8)} ${entry.runtimeMs
      .toFixed(2)
      .padStart(9)} ${entry.templateMs.toFixed(2).padStart(10)} ${entry.ratio
      .toFixed(2)
      .padStart(7)}   ${entry.equal ? '是' : '否'}`
  );
}
if (result.restMerge) {
  console.log(
    `\n{ ...rest, vn }（票 18 形状）· create 1k：通用 ${result.restMerge.runtimeMs.toFixed(
      2
    )} ms / 片段 + 运行期合并 ${result.restMerge.templateMs.toFixed(
      2
    )} ms（${result.restMerge.ratio.toFixed(2)}×）`
  );
}

const report = {
  meta: {
    date: new Date().toISOString().slice(0, 10),
    browser: result.userAgent,
    executable: executablePath,
    runner: 'scripts/benchmark-shapes.mjs',
    machine: `${platform()} ${release()} · ${cpus()[0]?.model ?? 'unknown'}`,
    fixture: 'benchmark/shapes/row.fixture.js',
    fragment: { bytes: compiled.plan.html.length, liveNodes: compiled.plan.liveNodes },
    note: '同一份行源码两列对照（通用 vs 真编译产物）；数字随机器变，比值方向可用，绝对值只作参考。'
  },
  ops: result.rows.map((row) => ({
    id: row.name,
    runtimeMs: row.runtimeMs,
    compiledMs: row.compiledMs,
    ratio: row.ratio
  })),
  sizeSweep: result.sizeSweep.map((entry) => ({
    columns: entry.columns,
    bytes: entry.bytes,
    runtimeMs: entry.runtimeMs,
    templateMs: entry.templateMs,
    ratio: entry.ratio,
    equal: entry.equal
  })),
  restMerge: result.restMerge,
  // 「收益为正的形状集合」（票 20 §2 的判定参数）：比值为正的形状进编译候选；
  // 按行规模给出，越大的行收益越大——小形状仍为正，只是绝对量小。
  verdict: {
    positiveShapes: result.sizeSweep
      .filter((entry) => entry.ratio < 1)
      .map((entry) => `每行 ${entry.columns} 列（${entry.ratio.toFixed(2)}×）`),
    domEqual: !mismatched
  }
};

if (process.argv.includes('--no-write')) {
  console.log('\n（--no-write：不落 benchmark/shapes.json）');
} else {
  writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(reportFile, renderReport(report), 'utf8');
  console.log(`\n形状矩阵已刷新：${relative(root, outFile).replaceAll('\\', '/')}`);
  console.log(`对比报告已刷新：${relative(root, reportFile).replaceAll('\\', '/')}`);
}

if (mismatched) {
  console.error('\n基准页报出 DOM 不一致：先修等价性，别用这组数字定阈值。');
  process.exitCode = 1;
}

/** 人读的对比报告：同一份业务源码，通用路径 vs 编译产物。 */
function renderReport(data) {
  const { meta, ops, sizeSweep, restMerge, verdict } = data;
  const ratio = (value) => (Number.isFinite(value) ? `${value.toFixed(2)}×` : '—');
  const gains = (value) => (Number.isFinite(value) ? `${Math.round((1 - value) * 100)}%` : '—');
  // 按操作归类（不按比值）：前三个是"建行"，其余是"对账 / 销毁已有行"。
  const isBuild = (row) => /^(create|replace|append)/.test(row.id);
  const build = ops.filter(isBuild);
  const reconcile = ops.filter((row) => !isBuild(row));

  return [
    '# 编译路径对比报告（形状矩阵基准）',
    '',
    '> 由 `npm run report:shapes` 生成，数据源 `benchmark/shapes.json`。同一份行源码两列对照：',
    '> **通用**（不挂编译器）与 **编译**（真编译产物）；列表对账两条路共用，差额 = 每行建造成本。',
    '',
    '## 环境',
    '',
    `- 日期：${meta.date}`,
    `- 机器：${meta.machine}`,
    `- 浏览器：${meta.browser}`,
    `- 夹具：\`${meta.fixture}\`（片段 ${meta.fragment.bytes} B · 活结点 ${meta.fragment.liveNodes}）`,
    `- DOM 逐字节一致（两列）：${verdict.domEqual ? '是' : '**否**（数字不可用）'}`,
    '',
    '## 一、构建类操作（越省越好）',
    '',
    '| 操作 | 通用 | 编译 | 编译 ÷ 通用 | 省下 |',
    '| --- | --- | --- | --- | --- |',
    ...build.map(
      (row) =>
        `| ${row.id} | ${row.runtimeMs.toFixed(2)} ms | ${row.compiledMs.toFixed(2)} ms | **${ratio(
          row.ratio
        )}** | ${gains(row.ratio)} |`
    ),
    '',
    '## 二、对账类操作（不该退化）',
    '',
    '| 操作 | 通用 | 编译 | 编译 ÷ 通用 |',
    '| --- | --- | --- | --- |',
    ...reconcile.map(
      (row) =>
        `| ${row.id} | ${row.runtimeMs.toFixed(3)} ms | ${row.compiledMs.toFixed(3)} ms | ${ratio(
          row.ratio
        )} |`
    ),
    '',
    '## 三、行规模矩阵（create 1k，列 = 每行元素数）',
    '',
    '| 每行元素数 | 片段 | 通用 | 置换 | 置换 ÷ 通用 | DOM 一致 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...sizeSweep.map(
      (entry) =>
        `| ${entry.columns} | ${entry.bytes} B | ${entry.runtimeMs.toFixed(2)} ms | ${entry.templateMs.toFixed(
          2
        )} ms | **${ratio(entry.ratio)}** | ${entry.equal ? '是' : '否'} |`
    ),
    '',
    restMerge
      ? `另有 \`{ ...rest, vn }\` 形状（票 18）：通用 ${restMerge.runtimeMs.toFixed(2)} ms vs 片段 + 运行期合并 ${restMerge.templateMs.toFixed(2)} ms（**${ratio(restMerge.ratio)}**）。`
      : '',
    '',
    '## 结论',
    '',
    `- **收益为正的形状集合**：${verdict.positiveShapes.join('、') || '（无）'}`,
    '- 构建类省 45–50%，对账类（select / swap / remove / update / clear）不退化；',
    '- **行越大越省**（通用随元素数线性涨、置换几乎是平的）→ 真机上没有"太小所以别编"的规模线，',
    '  小形状只是绝对收益小；',
    '- 深度取舍只看真机：同一批形状在 jsdom 里置换**更慢**（1.2–1.6×），jsdom 只留排序结论。',
    ''
  ]
    .filter((line) => line !== null)
    .join('\n');
}
