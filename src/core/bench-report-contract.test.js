import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BENCH_DOCS, formatBenchReport, readBenchResults } from '../../scripts/bench-metrics.mjs';
import { readReadmeSizes } from '../../scripts/bundle-metrics.mjs';

const root = resolve(import.meta.dirname, '../..');

function currentSizes() {
  const sizes = readReadmeSizes(readFileSync(resolve(root, 'README.md'), 'utf8'));

  return {
    core: sizes.rows['yoya.core.js 入口文件 ~ 实际下载量']?.[1],
    full: sizes.rows['yoya.ui-router.full.js raw / min / min+gzip']?.[2],
    ui: sizes.rows['yoya.ui.js 入口文件 ~ 实际下载量']?.[1]
  };
}

describe('benchmark report contract', () => {
  it('keeps both report documents in sync with the benchmark result JSON', async () => {
    const results = readBenchResults();
    expect(results.baseline, '缺少 benchmarks/results/baseline.json').not.toBeNull();

    const generated = await formatBenchReport({ ...results, sizes: currentSizes() });

    generated.forEach(({ content, file }) => {
      const current = readFileSync(file, 'utf8');
      expect(current, `${file} 与结果 JSON 不一致，运行 npm run bench:jfb:report 重新生成`).toBe(
        content
      );
    });
  });

  it('reports a guard pass without failures in the baseline run', () => {
    const { baseline } = readBenchResults();

    expect(baseline.guards.failures).toEqual([]);
    baseline.operations.forEach((entry) => {
      expect(entry.guards, `${entry.op} 的护栏失败`).toEqual([]);
    });
  });

  it('documents the virtualized list as logical rows plus real DOM nodes', () => {
    const { baseline } = readBenchResults();
    const [zhDoc] = BENCH_DOCS.filter((entry) => entry.lang === 'zh');
    const content = readFileSync(zhDoc.file, 'utf8');

    baseline.resources.vscroll.forEach((entry) => {
      expect(content).toContain(String(entry.logicalRows));
      expect(content).toContain(String(entry.realNodes));
    });
  });
});
