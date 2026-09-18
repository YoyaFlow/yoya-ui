import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BLOCK_START,
  CPU_ROWS,
  DOC_FILES,
  MEMORY_ROWS,
  SIZE_ROWS,
  compareBenchmarkTables,
  extractBenchmarkBlock,
  readBenchmarkResults
} from '../../scripts/benchmark-report.mjs';
import { readProjection, renderHtmlReport } from '../../scripts/benchmark-report-html.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const results = readBenchmarkResults();
const verifyScript = read('../../scripts/verify-dist.mjs');
const reportScript = read('../../scripts/benchmark-report.mjs');
const pkg = JSON.parse(read('../../package.json'));

// 数据行的第一格是行标题（中英文不同），其余格子是数字：按行取数字格做中英对照。
const dataCells = (text) =>
  text
    .split('\n')
    .filter((line) => /^\|\s*\d\d\s/.test(line))
    .map((line) =>
      line
        .split('|')
        .slice(2)
        .map((cell) => cell.trim())
        .join(' | ')
    );

describe('benchmark report wiring', () => {
  it('exposes print / write commands for the official benchmark report', () => {
    expect(pkg.scripts['report:bench']).toContain('scripts/benchmark-report.mjs');
    expect(pkg.scripts['report:bench:write']).toContain('--write');
  });

  it('gates the generated tables against the imported runner results', () => {
    expect(pkg.scripts['verify:dist']).toContain('scripts/verify-dist.mjs');
    expect(verifyScript).toContain('compareBenchmarkTables');
    expect(verifyScript).toContain('readBenchmarkResults');
    expect(reportScript).toContain('--import');
  });

  it('keeps the data file covering every reported row and column', () => {
    for (const row of [...CPU_ROWS, ...MEMORY_ROWS, ...SIZE_ROWS]) {
      const bucket = CPU_ROWS.includes(row)
        ? results.cpu
        : MEMORY_ROWS.includes(row)
          ? results.memory
          : results.size;
      const found = bucket.find((item) => item.id === row.id);
      expect(found, `benchmark/results.json 缺少 ${row.id}`).toBeTruthy();
      for (const key of ['yoya', 'anchor', 'baseline']) {
        expect(found[key], `${row.id} 缺少 ${key} 列`).toBeTruthy();
      }
    }
  });
});

describe('benchmark tables in docs', () => {
  it('matches the data source in both languages', async () => {
    expect(await compareBenchmarkTables(results)).toEqual([]);
  });

  it('keeps the Chinese and English tables on the same numbers', () => {
    const blocks = DOC_FILES.map(({ file }) =>
      dataCells(extractBenchmarkBlock(read(`../../${file}`), file))
    );
    expect(blocks[0].length).toBe(CPU_ROWS.length * 2 + MEMORY_ROWS.length + SIZE_ROWS.length);
    expect(blocks[0]).toEqual(blocks[1]);
  });

  it('documents the run setup so the numbers cannot be read without their setup', () => {
    for (const { file } of DOC_FILES) {
      const block = extractBenchmarkBlock(read(`../../${file}`), file);
      expect(block).toContain(results.meta.runner);
      expect(block).toContain(results.meta.browser);
      expect(block).toContain(results.meta.packageVersion);
      expect(block).toContain(String(results.meta.cpuIterations));
      expect(block.startsWith(BLOCK_START)).toBe(false);
    }
  });
});

/**
 * 投影列（AST 预生成）：它必须**明确标注为派生数据**，官方实测列不许被改写。
 * 数据来源 `benchmark/ast-precompile-projection.json`，换算规则写在 meta.method 里。
 */
describe('AST pre-compile projection column', () => {
  const projection = readProjection();
  const html = renderHtmlReport(results);

  it('labels the projection as derived data with its provenance', () => {
    expect(projection.meta.kind).toBe('projection');
    expect(projection.meta.variant).toContain('thin');
    expect(projection.meta.prototype).toContain('.scratch/compile-ast/');
    expect(projection.meta.source).toContain('results-both-rounds7.json');
    expect(html).toContain('AST 预生成（投影）');
    expect(html).toContain(projection.meta.disclaimer.slice(0, 20));
    expect(html).toContain('benchmark/ast-precompile-projection.json');
  });

  it('only extrapolates covered rows and leaves the measured column intact', () => {
    for (const [id, key] of Object.entries(projection.applies.cpu)) {
      expect(
        results.cpu.find((row) => row.id === id),
        id
      ).toBeTruthy();
      expect(typeof projection.deltas[key], key).toBe('number');
    }

    const row = results.cpu.find((item) => item.id === '01_run1k');
    const projected = (row.yoya.total + row.yoya.script * projection.deltas.create1kScript).toFixed(
      1
    );
    // 实测格仍是 results.json 的原值，投影值出现在它自己的格里
    expect(html).toContain(`<b>${row.yoya.total.toFixed(1)} ms</b>`);
    expect(html).toContain(`<b>${projected} ms</b>`);
    expect(projected).not.toBe(row.yoya.total.toFixed(1));

    // 未覆盖的项在投影列里是「—」，不是复制的实测值
    const uncovered = results.cpu.filter((item) => !projection.applies.cpu[item.id]);
    expect(uncovered.length).toBe(5);
    expect(html.match(/projected-none">—/g).length).toBeGreaterThanOrEqual(uncovered.length);
  });

  it('refuses a projection file that is not marked as derived', async () => {
    const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'yoya-projection-'));

    try {
      const file = join(dir, 'not-a-projection.json');
      writeFileSync(file, JSON.stringify({ meta: { kind: 'measured' }, deltas: {} }), 'utf8');
      expect(() => readProjection(file)).toThrow(/projection/);

      // 没有投影文件时页面退回纯实测视图
      expect(readProjection(join(dir, 'missing.json'))).toBeNull();
      expect(renderHtmlReport(results, null)).not.toContain('AST 预生成（投影）');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
