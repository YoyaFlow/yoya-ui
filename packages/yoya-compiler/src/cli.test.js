import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it, vi } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { runCli, runCliIfMain } from './index.js';

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

const fixture = join(import.meta.dirname, 'fixtures/item-fixture.js');

/**
 * 主模块判断（0.7.5 修的那个 bug：以前拿的是 `cli.js` 自己的 URL，永远不成立、CLI 静默不执行）。
 *
 * 这里**故意不 spawn 子进程**：CI 的顺序是 Test → Build，跑测试时 `packages/yoya-core/dist` 还不存在，
 * 普通 node 子进程 import `@yoyaflow/yoya-core` 会直接崩（vitest 里能过是因为它把包别名到了 src）。
 * 真实 CLI 的端到端校验放在 build 之后的 `npm run verify:dist`（见 scripts/verify-dist.mjs §5）。
 */
describe('bin 入口的主模块判断', () => {
  it('runs the CLI when the given module URL matches argv[1], and stays quiet otherwise', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      expect(await runCliIfMain(core, ['--help'], pathToFileURL(process.argv[1]).href)).toBe(0);
      expect(spy, '命中主模块时应当打印用法').toHaveBeenCalled();

      spy.mockClear();
      const cliUrl = pathToFileURL(join(import.meta.dirname, 'cli.js')).href;
      expect(await runCliIfMain(core, ['--help'], cliUrl)).toBeNull();
      expect(spy, 'URL 不是调用方自己时不许执行').not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('passes its own module URL from bin.js', () => {
    const source = readFileSync(join(import.meta.dirname, 'bin.js'), 'utf8');

    expect(source).toMatch(
      /runCliIfMain\(\s*core,\s*process\.argv\.slice\(2\),\s*import\.meta\.url\s*\)/
    );
  });
});

describe('runCli', () => {
  it('compiles a file and prints a summary that carries the bails', async () => {
    const out = join(root, 'generated', 'item.js');
    mkdirSync(join(root, 'generated'), { recursive: true });
    const io = record();

    const code = await runCli(
      ['--file', fixture, '--fn', 'Item', '--mode', 'element', '--out', out, '--json'],
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
      'export function Item(item) { return tr((line) => line.child(vBadge())); }\n'
    );
    const out = join(root, 'fallback.generated.js');
    const io = record();

    const code = await runCli(['--file', source, '--out', out, '--json'], { ...io, core });

    expect(code).toBe(2);
    expect(existsSync(out)).toBe(false);
    expect(JSON.parse(io.lines.join('\n')).bails.length).toBe(1);
  });

  // 文档里的 `--out src/generated/item.js` 在新项目上直接用：目录要自动建出来
  it('creates the output directory when it does not exist yet', async () => {
    const out = join(root, 'fresh', 'deep', 'item.js');
    const fragments = join(root, 'fresh', 'deep', 'fragments.html');
    const io = record();

    const code = await runCli(
      ['--file', fixture, '--fn', 'Item', '--out', out, '--fragments', fragments],
      { ...io, core }
    );

    expect(code).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(fragments, 'utf8')).toContain('<template data-yoya-fragment=');
  });

  it('prints help and rejects unknown flags', async () => {
    const help = record();
    expect(await runCli(['--help'], { ...help, core })).toBe(0);
    expect(help.lines.join('\n')).toContain('--report');

    const unknown = record();
    expect(await runCli(['--nope'], { ...unknown, core })).toBe(1);
  });

  it('builds a component registry from an entries file', async () => {
    const registryDir = join(root, 'registry');
    const entriesFile = join(root, 'entries.json');
    const componentFile = join(import.meta.dirname, 'fixtures/status-dot.js');
    const runtime = pathToFileURL(
      join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
    ).href;
    writeFileSync(
      entriesFile,
      JSON.stringify([
        { file: componentFile, export: 'StatusDot' },
        { file: componentFile, export: 'StatusBox' }
      ])
    );
    const io = record();

    const code = await runCli(
      ['--registry', registryDir, '--entries', entriesFile, '--runtime', runtime, '--json'],
      { ...io, core }
    );

    expect(code).toBe(0);
    const summary = JSON.parse(io.lines.join('\n'));
    expect(summary.keys).toHaveLength(1);
    expect(summary.skipped.map((item) => item.key)).toHaveLength(1);
    expect(existsSync(join(registryDir, 'components.registry.js'))).toBe(true);
    expect(existsSync(join(registryDir, 'components.registry.json'))).toBe(true);
  });

  it('writes the page fragment block alongside the generated module', async () => {
    const out = join(root, 'frag.generated.js');
    const fragments = join(root, 'fragments.html');
    const io = record();

    const code = await runCli(
      [
        '--file',
        fixture,
        '--fn',
        'Item',
        '--mode',
        'element',
        '--out',
        out,
        '--fragments',
        fragments,
        '--json'
      ],
      { ...io, core }
    );

    expect(code).toBe(0);
    const block = readFileSync(fragments, 'utf8');
    expect(block).toMatch(/^<template data-yoya-fragment="[0-9a-f]{12}">/);
    expect(block).toContain('data-item-id');
    expect(JSON.parse(io.lines.join('\n')).compiled).toBe(true);
  });
});
