/**
 * 打包器入口的兼容契约：
 * - `./rollup`（原生 Rollup / Vite 插件）不依赖 unplugin，且与 unplugin 路产物一致；
 * - 根入口的 `yoyaCompile` 是惰性的——`index.js` / `plugin-core.js` 里不允许再出现静态 `unplugin` import，
 *   否则 CLI 与程序化 API 在 Node 18 / 20.9 上连包都 import 不进来；
 * - peer / engines / exports 维持「unplugin 2 或 3」的兼容面。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { yoyaCompile } from './plugin.js';
import { yoyaCompileRollup, yoyaPluginFactory } from './rollup.js';
import { yoyaCompile as bridgedCompile } from './unplugin-bridge.js';

const compilerDir = join(process.cwd(), 'packages/yoya-compiler');
const read = (relative) => readFileSync(join(compilerDir, relative), 'utf8');

const businessSource = [
  "import { table, tbody, tr, vText } from '@yoyaflow/yoya-core';",
  '',
  'export function BuildRow(item) {',
  '  return tr((line) => {',
  "    line.td((cell) => cell.className('col-md-1').child(String(item.data.id)));",
  "    line.td((cell) => cell.className('col-md-4').a((link) => link.child(vText(item.data.label))));",
  '  });',
  '}',
  '',
  'export function Demo(rows) {',
  '  return table((node) => node.tbody((body) => body.keyed(rows, BuildRow)));',
  '}',
  ''
].join('\n');

const sourceFile = join(compilerDir, 'src', 'fixtures', 'rollup-entry-business.js');

describe('@yoyaflow/yoya-compiler/rollup（原生 Rollup / Vite 入口）', () => {
  it('returns a plain Rollup plugin object without touching unplugin', () => {
    const plugin = yoyaCompileRollup({ core });

    expect(plugin.name).toBe('yoya-ui-compile');
    expect(plugin.enforce).toBe('pre');
    expect(typeof plugin.transform).toBe('function');
    expect(typeof plugin.resolveId).toBe('function');
    expect(typeof plugin.load).toBe('function');
  });

  it('compiles the same business source as the unplugin entry', async () => {
    const native = yoyaCompileRollup({ core, registry: false });
    const viaUnplugin = yoyaCompile.rollup({ core, registry: false });

    const nativeResult = await native.transform(businessSource, sourceFile);
    const unpluginResult = await viaUnplugin.transform(businessSource, sourceFile);

    expect(nativeResult.code).toContain('BuildRowSource');
    expect(unpluginResult.code).toBe(nativeResult.code);
    expect(unpluginResult.map.toString()).toBe(nativeResult.map.toString());
  });

  it('exports the shared factory so bundlers can wrap it themselves', () => {
    expect(typeof yoyaPluginFactory).toBe('function');
    expect(yoyaPluginFactory({ core }).name).toBe('yoya-ui-compile');
  });
});

describe('unplugin 只在需要它的入口出现', () => {
  it('keeps the compiler core, the root entry and the rollup entry free of unplugin imports', () => {
    for (const file of [
      'src/index.js',
      'src/plugin-core.js',
      'src/rollup.js',
      'src/unplugin-bridge.js'
    ]) {
      expect(read(file), `${file} 不应该静态 import unplugin`).not.toContain("from 'unplugin'");
    }
  });

  it('keeps the unplugin wrapper as the only static import (multi-bundler entry)', () => {
    expect(read('src/plugin.js')).toContain("from 'unplugin'");
  });

  it('loads unplugin lazily from the root entry, on first property access', () => {
    // 不访问属性时不加载（Proxy 目标是个空对象）；访问后才拿到 unplugin 的工厂。
    expect(Object.getOwnPropertyNames(bridgedCompile)).toEqual([]);

    const vite = bridgedCompile.vite({ core });
    expect(vite.name).toBe('yoya-ui-compile');
    expect(bridgedCompile.rollup).toBeTypeOf('function');
  });
});

describe('编译器的 Node / unplugin 兼容面', () => {
  const pkg = JSON.parse(read('package.json'));

  it('publishes the rollup entry', () => {
    expect(pkg.exports['./rollup']).toBe('./dist/rollup.js');
    expect(pkg.exports['./plugin']).toBe('./dist/plugin.js');
  });

  it('accepts unplugin 2 and 3, and no longer requires Node 20.19+', () => {
    expect(pkg.peerDependencies.unplugin).toBe('^2.3.11 || ^3.4.0');
    expect(pkg.engines.node).toBe('>=18.12.0');
  });
});
