import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { runCli } from './index.js';

const root = mkdtempSync(join(tmpdir(), 'yoya-cli-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const record = () => {
  const lines = [];
  return {
    lines,
    log: (line) => lines.push(String(line)),
    error: (line) => lines.push(String(line))
  };
};

const fixture = join(import.meta.dirname, 'fixtures/row-fixture.js');

describe('runCli', () => {
  it('compiles a file and prints a summary that carries the bails', async () => {
    const out = join(root, 'generated', 'row.js');
    mkdirSync(join(root, 'generated'), { recursive: true });
    const io = record();

    const code = await runCli(
      ['--file', fixture, '--fn', 'buildRow', '--mode', 'element', '--out', out, '--json'],
      { ...io, core }
    );

    expect(code).toBe(0);
    expect(existsSync(out)).toBe(true);
    const summary = JSON.parse(io.lines.join('\n'));
    expect(summary.compiled).toBe(true);
    expect(summary.liveNodes).toBe(6);
    expect(readFileSync(out, 'utf8')).toContain('export function createRowFactory(scope)');
  });

  it('reports a fallback shape without writing an artifact', async () => {
    const source = join(root, 'fallback.js');
    writeFileSync(
      source,
      'export function buildRow(row) { return tr((line) => line.child(vBadge())); }\n'
    );
    const out = join(root, 'fallback.generated.js');
    const io = record();

    const code = await runCli(['--file', source, '--out', out, '--json'], { ...io, core });

    expect(code).toBe(2);
    expect(existsSync(out)).toBe(false);
    expect(JSON.parse(io.lines.join('\n')).bails.length).toBe(1);
  });

  it('prints help and rejects unknown flags', async () => {
    const help = record();
    expect(await runCli(['--help'], { ...help, core })).toBe(0);
    expect(help.lines.join('\n')).toContain('--report');

    const unknown = record();
    expect(await runCli(['--nope'], { ...unknown, core })).toBe(1);
  });
});
