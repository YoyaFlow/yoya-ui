/**
 * 缓存守卫用例（票 20 §6 第 4 条 / §5 L6）：**缓存键只按内容寻址**。
 *
 * - 两个模块各自编译出**同一形状** → 运行期只解析一份 `<template>`（`templates` 命中）；
 * - 形状不同（片段 HTML 不同）→ 各自一份，谁也污染不了谁；
 * - 通道不同（element / node）但片段相同 → 仍然共用一份。
 *
 * 只用黑盒观察：数 `document.createElement('template')` 的次数——命中缓存的那一路不会再建模板。
 * 不给运行期加任何探针字段（AGENTS 第 2 条：新增字段要回答"不跑编译器的人为什么需要它"）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it, vi } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { compileSource, elementWhitelistOf } from './index.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-fragment-cache-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;
const coreUrl = pathToFileURL(join(process.cwd(), 'packages/yoya-ui/src/index.js')).href;

/** 中性夹具：同一个形状、不同函数名 / 不同文件 —— 片段 HTML 必须逐字节相同。 */
const sourceOf = (fn, className = 'row') =>
  [
    `import { div, vText } from ${JSON.stringify(coreUrl)};`,
    '',
    `export function ${fn}(data) {`,
    `  return div({ class: ${JSON.stringify(className)}, 'data-id': String(data.id) }, (node) => {`,
    "    node.span({ class: 'col' }, (cell) => cell.child(vText(data.label)));",
    '  });',
    '}',
    ''
  ].join('\n');

const compile = async (fn, file, mode, className) => {
  const source = sourceOf(fn, className);
  const result = compileSource({
    source,
    file,
    fn,
    mode,
    core,
    whitelist: elementWhitelistOf(core),
    runtime: runtimeUrl,
    coreSpecifier: coreUrl
  });
  expect(result.compiled, `${fn}@${mode}: ${JSON.stringify(result.bails)}`).toBe(true);
  const path = join(workDir, `${fn}.${mode}.js`);
  writeFileSync(path, result.module, 'utf8');
  return { module: await import(pathToFileURL(path).href), html: result.plan.html };
};

/** 数模板创建次数：命中缓存的那条路不会再 `createElement('template')`。 */
const templateCalls = async (run) => {
  const spy = vi.spyOn(document, 'createElement');
  try {
    await run();
    return spy.mock.calls.filter(([tag]) => tag === 'template').length;
  } finally {
    spy.mockRestore();
  }
};

const row = (id) => ({ id, label: core.ref(`row-${id}`) });

describe('片段缓存按内容寻址（票 20 / L6）', () => {
  it('同形状跨两个模块 → 只解析一份 <template>；形状不同各自一份', async () => {
    const first = await compile('RowA', 'a.generated.js', 'element');
    const second = await compile('RowB', 'b.generated.js', 'element');
    expect(second.html).toBe(first.html); // 同一形状：片段逐字节相同

    const shared = await templateCalls(() => {
      first.module.createRowFactory({})(row(1));
      second.module.createRowFactory({})(row(2));
    });
    expect(shared).toBe(1);

    // 形状不同（类名不同 → 片段不同）→ 各自一份，且不会污染上面那份
    const other = await compile('RowC', 'c.generated.js', 'element', 'row-wide');
    const separate = await templateCalls(() => other.module.createRowFactory({})(row(3)));
    expect(separate).toBe(1);
  });

  it('两条通道片段相同 → 共用同一份缓存', async () => {
    const element = await compile('RowElement', 'element.generated.js', 'element', 'row-shared');
    const node = await compile('RowNode', 'node.generated.js', 'node', 'row-shared');
    expect(node.html).toBe(element.html);

    const calls = await templateCalls(() => {
      element.module.createRowFactory({})(row(4));
      node.module.createRowFactory({})(row(5));
    });
    // element 那一路建一份、node 那一路命中同一份（两条通道共用内容寻址的缓存）
    expect(calls).toBe(1);
  });
});
