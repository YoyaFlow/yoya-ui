import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { reportCoverage } from './index.js';

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
  'export function buildRow(row) {\n' +
  "  return tr((line) => {\n    line.td((cell) => cell.className('col').child(String(row.id)));\n  });\n}\n";

/** 不可编：child() 里是组件调用。 */
const componentCall =
  'export function buildRow(row) {\n' +
  '  return tr((line) => line.td((cell) => cell.child(vCard(row.label))));\n}\n';

write('a/row.js', compilable);
write('b/row.js', componentCall);
write('b/deep/row.js', componentCall);
write('c/other.js', 'export const unrelated = 1;\n');
write('c/mentions.js', '// buildRow is documented elsewhere\nexport const note = "buildRow";\n');

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
      'a/row.js',
      'b/deep/row.js',
      'b/row.js',
      'c/mentions.js',
      'c/other.js'
    ]);
    expect(report.entries.find((entry) => entry.file === 'a/row.js').compiled).toBe(true);
    expect(report.entries.find((entry) => entry.file === 'c/other.js').skipped).toBe(true);
    expect(report.entries.find((entry) => entry.file === 'c/mentions.js').skipped).toBe(true);
  });

  it('honours the function name filter', () => {
    const report = reportCoverage({ root, core, fn: 'buildTable' });
    expect(report.candidates).toBe(0);
    expect(report.skipped).toBe(5);
  });
});
