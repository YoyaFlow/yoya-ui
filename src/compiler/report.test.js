import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compareCoverageBaseline, coverageBaselineOf, reportCoverage } from './index.js';

const root = mkdtempSync(join(tmpdir(), 'yoya-report-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const write = (name, text) => {
  const file = join(root, name);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, text, 'utf8');
  return file;
};

/** 可编：纯元素工厂 + 字面量。 */
const compilable =
  'export function Card(row) {\n' +
  "  return tr((line) => {\n    line.td((cell) => cell.className('col').child(String(row.id)));\n  });\n}\n";

/** 不可编：child() 里是组件调用。 */
const componentCall =
  'export function Card(row) {\n' +
  '  return tr((line) => line.td((cell) => cell.child(vCard(row.label))));\n}\n';

write('a/item.js', compilable);
write('b/item.js', componentCall);
write('b/deep/item.js', componentCall);
write('c/other.js', 'export const unrelated = 1;\n');
write('c/mentions.js', '// Card is documented elsewhere\nexport const note = "Card";\n');

describe('reportCoverage', () => {
  it('counts compilable, bailed and skipped files with a stable bail histogram', () => {
    const report = reportCoverage({ root, core });

    expect(report.files).toBe(5);
    expect(report.candidates).toBe(3);
    expect(report.compiled).toBe(1);
    expect(report.bailed).toBe(2);
    expect(report.skipped).toBe(2);
    expect(report.bails).toEqual([{ reason: 'child() 里是组件调用（未编译）：vCard', count: 2 }]);
    expect(report.entries.map((entry) => entry.file).sort()).toEqual([
      'a/item.js',
      'b/deep/item.js',
      'b/item.js',
      'c/mentions.js',
      'c/other.js'
    ]);
    expect(report.entries.find((entry) => entry.file === 'a/item.js').compiled).toBe(true);
    expect(report.entries.find((entry) => entry.file === 'c/other.js').skipped).toBe(true);
    expect(report.entries.find((entry) => entry.file === 'c/mentions.js').skipped).toBe(true);
  });

  it('honours the component filter (library-internal escape hatch)', () => {
    const report = reportCoverage({ root, core, component: 'buildTable' });
    expect(report.candidates).toBe(0);
    expect(report.skipped).toBe(5);
  });
});

describe('coverage baseline', () => {
  // 单独一棵树：基线用例会改写文件，别污染上面算好的计数
  const baseRoot = mkdtempSync(join(tmpdir(), 'yoya-baseline-'));
  afterAll(() => rmSync(baseRoot, { recursive: true, force: true }));

  const write = (name, text) => {
    const file = join(baseRoot, name);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, text, 'utf8');
  };

  const compilable =
    'export function Card(row) {\n' +
    '  return tr((line) => line.td((cell) => cell.child(String(row.id))));\n}\n';

  it('only fails when a file that used to compile falls back', () => {
    write('a/item.js', compilable);
    const baseline = coverageBaselineOf([reportCoverage({ root: baseRoot, core })]);

    expect(baseline.targets[0].compiledFiles).toEqual(['a/item.js']);
    expect(baseline.targets[0].compiled).toBe(1);
    expect(compareCoverageBaseline(baseline, [reportCoverage({ root: baseRoot, core })])).toEqual({
      ok: true,
      regressions: [],
      added: []
    });

    // 新增可编形状不拦：覆盖率只许涨
    write('b/item.js', compilable);
    const grown = compareCoverageBaseline(baseline, [reportCoverage({ root: baseRoot, core })]);
    expect(grown.ok).toBe(true);
    expect(grown.added).toEqual([{ root: baseRoot, file: 'b/item.js' }]);

    // 基线里可编的文件回落 → 失败，并带上回落原因
    write('a/item.js', 'export function Card(row) {\n  return tr((line) => line.td(row));\n}\n');
    const regressed = compareCoverageBaseline(baseline, [reportCoverage({ root: baseRoot, core })]);
    expect(regressed.ok).toBe(false);
    expect(regressed.regressions).toHaveLength(1);
    expect(regressed.regressions[0].file).toBe('a/item.js');
    expect(regressed.regressions[0].reason).not.toBe('');

    // 文件被删掉也算回退（"文件已不在扫描范围"），不会静默消失
    rmSync(join(baseRoot, 'a/item.js'));
    const removed = compareCoverageBaseline(baseline, [reportCoverage({ root: baseRoot, core })]);
    expect(removed.regressions).toEqual([
      { root: baseRoot, file: 'a/item.js', reason: '文件已不在扫描范围' }
    ]);
  });

  it('leaves an unknown target ungated', () => {
    const report = reportCoverage({ root: baseRoot, core, fn: 'buildTable' });
    const comparison = compareCoverageBaseline({ version: 1, targets: [] }, [report]);

    expect(comparison).toEqual({ ok: true, regressions: [], added: [] });
  });
});
