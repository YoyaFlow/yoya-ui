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
