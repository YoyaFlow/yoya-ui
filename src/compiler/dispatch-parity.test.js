/**
 * 票 42 尾巴（T6 收口）：编译期与运行期**逐字节等价**的对账。
 *
 * 分派表在物理上是两份（运行期 `applySetupValue` / 编译期 `analyzeElementArguments`），
 * 这条用例是防漂移的双保险：同一份参数写法走编译产物与通用 DSL 两条路径，DOM 必须一致
 * （编译路径按框架的规范序列化口径，与 `toHTML()` 对比）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { div } from '../yoya.core.js';
import * as core from '../yoya.core.js';
import { compileSource } from './index.js';

// 临时产物留在仓库内（vitest 不允许 import 项目根之外的模块），
// 但 `.scratch/` 不进 git —— 干净检出里没有它，所以先建出来。
const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-parity-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

const compileBuilder = async (body, name, mode = 'element') => {
  const source =
    "import { div } from '../../yoya.core.js';\n" +
    `export function Item(item) {\n  return ${body};\n}\n`;
  const compiled = compileSource({
    source,
    file: 'src/compiler/fixtures/parity.js',
    fn: 'Item',
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
    const item = factory({});

    expect(item.el.outerHTML).toBe(dslNode.toHTML());
    expect(item.el.getAttribute('slot')).toBe('t-head');
  });

  it('agrees on a dynamic style value in node mode', async () => {
    const factory = await compileBuilder(
      "div((node) => node.style('color', item.tone))",
      'dynamic-style',
      'node'
    );
    const dslNode = div((node) => node.style('color', 'red'));

    expect(factory({ tone: 'red' }).renderDom().outerHTML).toBe(dslNode.renderDom().outerHTML);
  });

  it('agrees when a static style shares the element with a dynamic style', async () => {
    const factory = await compileBuilder(
      "div({ style: { color: 'red', width: item.w } }, (node) => node.span('s'))",
      'mixed-style',
      'node'
    );
    const dslNode = div({ style: { color: 'red', width: '10px' } }, (node) => node.span('s'));

    expect(factory({ w: '10px' }).renderDom().outerHTML).toBe(dslNode.renderDom().outerHTML);
  });

  // 节点模式会把静态属性当「快照」再写一遍，口径必须与片段一致：null / false 移除、true 写成同名
  it('agrees on static attributes that remove or name themselves', async () => {
    const cases = [
      ['null', 'null', null],
      ['false', 'false', false],
      ['true', 'true', true],
      ['""', 'empty', '']
    ];

    for (const [expression, name, value] of cases) {
      const factory = await compileBuilder(
        `div((node) => node.attr('data-x', ${expression}))`,
        `static-attr-${name}`,
        'node'
      );
      const dslNode = div((node) => node.attr('data-x', value));
      // 只有静态属性的行在节点模式里没有活结点 → 产物直接返回片段元素
      const built = factory({});
      const compiled = typeof built.renderDom === 'function' ? built.renderDom() : built;

      expect(compiled.outerHTML, expression).toBe(dslNode.renderDom().outerHTML);
    }
  });
});
