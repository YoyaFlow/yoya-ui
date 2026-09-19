/**
 * 票 42 尾巴（T6 收口）：编译期与运行期**逐字节等价**的对账。
 *
 * 分派表在物理上是两份（运行期 `applySetupValue` / 编译期 `analyzeElementArguments`），
 * 这条用例是防漂移的双保险：同一份参数写法走编译产物与通用 DSL 两条路径，DOM 必须一致
 * （编译路径按框架的规范序列化口径，与 `toHTML()` 对比）。
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { div } from '../yoya.core.js';
import * as core from '../yoya.core.js';
import { compileSource } from './index.js';

const workDir = mkdtempSync(join(process.cwd(), '.scratch', 'tmp-parity-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

const compileBuilder = async (body, name, mode = 'element') => {
  const source =
    "import { div } from '../../yoya.core.js';\n" +
    `export function buildRow(row) {\n  return ${body};\n}\n`;
  const compiled = compileSource({
    source,
    file: 'src/compiler/fixtures/parity.js',
    fn: 'buildRow',
    mode,
    core,
    runtime: runtimeUrl
  });

  expect(compiled.bails).toEqual([]);
  expect(compiled.compiled).toBe(true);

  const file = join(workDir, `${name}.js`);
  writeFileSync(file, compiled.module, 'utf8');
  const module = await import(pathToFileURL(file).href);
  // 节点模式的产物要用元素工厂建包装对象 → 工厂名进 scope（元素模式不需要，传了也无害）
  return module.createRowFactory({ div });
};

describe('compile / runtime dispatch parity', () => {
  it('agrees on (options, setup) with explicit attrs and style', async () => {
    const factory = await compileBuilder(
      "div({ attrs: { id: 'c1' }, style: { color: 'red' } }, (node) => node.span('s'))",
      'options-first'
    );
    const dslNode = div({ attrs: { id: 'c1' }, style: { color: 'red' } }, (node) => node.span('s'));

    expect(factory({}).el.outerHTML).toBe(dslNode.toHTML());
  });

  it('agrees on variadic arguments and the slot marker', async () => {
    const factory = await compileBuilder(
      "div('a', { slot: 't-head' }, (node) => node.span('s'), 'b')",
      'variadic'
    );
    const dslNode = div('a', { slot: 't-head' }, (node) => node.span('s'), 'b');
    const row = factory({});

    expect(row.el.outerHTML).toBe(dslNode.toHTML());
    expect(row.el.getAttribute('slot')).toBe('t-head');
  });

  it('agrees on a dynamic style value in node mode', async () => {
    const factory = await compileBuilder(
      "div((node) => node.style('color', row.tone))",
      'dynamic-style',
      'node'
    );
    const dslNode = div((node) => node.style('color', 'red'));

    expect(factory({ tone: 'red' }).renderDom().outerHTML).toBe(dslNode.renderDom().outerHTML);
  });

  it('agrees when a static style shares the element with a dynamic style', async () => {
    const factory = await compileBuilder(
      "div({ style: { color: 'red', width: row.w } }, (node) => node.span('s'))",
      'mixed-style',
      'node'
    );
    const dslNode = div({ style: { color: 'red', width: '10px' } }, (node) => node.span('s'));

    expect(factory({ w: '10px' }).renderDom().outerHTML).toBe(dslNode.renderDom().outerHTML);
  });
});
