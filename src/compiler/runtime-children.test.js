/**
 * 票 09：**运行期子节点**——`child(<表达式>)` 的值到运行期才知道是什么
 * （字符串 / 数字 / 句柄 / 零参 reader / ViewNode / 组件对象 / 数组）。
 *
 * 通用路径把这些值都交给核心 `child()` 自己分派：字符串与句柄建文本节点、节点与组件进视图树、
 * 数组摊平、其它值响亮报错。编译产物必须**同一份语义**：
 *
 * - **节点通道**：值交给核心 `child()`（不复制第二套分派），位置在接管之后按"片段里它后面的那个
 *   兄弟"摆回来——静态兄弟只存在于片段里，核心自己的插入锚点看不到它们；
 * - **元素通道**：没有节点对象，只有"位置 = 一段文本"这一种落地（数组摊平成多段文本）；
 *   收到节点 / 组件这类要进视图树的值时**响亮报错**（要节点语义就编节点通道）。
 *
 * 反面用例（本票的 RED）：产物**不得**把自己那份片段元素当成子节点（DOM 出现嵌套 / 重复片段）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-child-value-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

/** 与 anchors.test.js 同一套装配：插件改写 + 产物落成真模块，测的是业务真正走的那条路。 */
const setup = async (label, code, mode, component = 'Panel') => {
  const file = join(workDir, `${label}.js`);
  writeFileSync(file, code, 'utf8');
  const units = componentUnits(code, { core, file });
  const targets = mode ? [{ component, file, mode }] : units;
  const wired = wireComponentModule({ source: code, targets, core, runtime: runtimeUrl });
  if (!wired) {
    return { wired: null, file };
  }
  const replacements = new Map();
  const modules = [];
  wired.units.forEach((unit, index) => {
    const path = join(workDir, `${label}.unit${index}.js`);
    replacements.set(JSON.stringify(unit.virtual), JSON.stringify(pathToFileURL(path).href));
    modules.push({ path, module: unit.module });
  });
  const rewrite = (text) => {
    let out = text;
    replacements.forEach((to, from) => {
      out = out.replaceAll(from, to);
    });
    return out;
  };
  modules.forEach(({ path, module }) => writeFileSync(path, rewrite(module), 'utf8'));
  const wiredPath = join(workDir, `${label}.wired.js`);
  writeFileSync(wiredPath, rewrite(wired.code), 'utf8');
  return {
    wired,
    compiled: await import(pathToFileURL(wiredPath).href),
    generic: await import(pathToFileURL(file).href),
    file
  };
};

/** 逐节点签名：文本按内容、元素按标签 + 属性（顺序无关）+ 子节点。 */
const signature = (node) => {
  if (node.nodeType === 3) {
    return `#text:${node.textContent}`;
  }
  const attrs = [...node.attributes]
    .map((item) => `${item.name}=${item.value}`)
    .sort()
    .join(' ');
  return `<${node.tagName.toLowerCase()} ${attrs}>${[...node.childNodes].map(signature).join('')}`;
};

/** 编译产物的一行（元素通道是 `{ el }`，节点通道是 ViewNode）。 */
const elementOf = (product, mode) => (mode === 'element' ? product.el : product.renderDom());

const panel = [
  "import { div, vText } from '../../src/yoya.core.js';",
  '',
  'export function Panel(props) {',
  '  return div((root) => {',
  "    root.className('panel');",
  "    root.span((head) => head.className('head').child(vText(props.title)));",
  '    root.child(props.slot);',
  "    root.span((tail) => tail.className('tail').child('tail'));",
  '  });',
  '}',
  ''
].join('\n');

describe('child(<表达式>)：运行期子节点（票 09）', () => {
  it('节点通道：节点值落在片段里的正确位置，不嵌套、不重复片段', async () => {
    const propsOf = () => ({
      title: core.ref('head'),
      slot: core.span((box) => box.className('slot').child('slot'))
    });
    const { wired, compiled, generic } = await setup('panel-node', panel, 'node');
    expect(wired, '插件没有编出产物').not.toBeNull();

    const compiledEl = elementOf(compiled.Panel(propsOf()), 'node');
    const genericEl = generic.Panel(propsOf()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.children].map((el) => el.className)).toEqual(['head', 'slot', 'tail']);
    // 反面用例：产物不得把自己那份片段元素当子节点（曾经的嵌套 / 重复片段）
    expect(compiledEl.matches('.panel')).toBe(true);
    expect(compiledEl.querySelectorAll('.panel').length).toBe(0);
    expect(compiledEl.querySelectorAll('.slot').length).toBe(1);
  });

  it('节点通道：字符串 / 句柄 / 数组（含嵌套与节点）与通用路径一致', async () => {
    const source = [
      "import { div } from '../../src/yoya.core.js';",
      '',
      'export function Slots(props) {',
      '  return div((root) => {',
      "    root.className('slots');",
      '    root.child(props.first);',
      "    root.child('sep');",
      '    root.child(props.middle);',
      '    root.child(props.tail);',
      '  });',
      '}',
      ''
    ].join('\n');
    const propsOf = () => ({
      first: 'text',
      middle: core.ref('live'),
      tail: [
        core.span((box) => box.className('a').child('a')),
        ['nested'],
        null,
        core.span((box) => box.className('b').child('b'))
      ]
    });
    const { wired, compiled, generic } = await setup('slots-node', source, 'node', 'Slots');
    expect(wired, '插件没有编出产物').not.toBeNull();

    const compiledEl = elementOf(compiled.Slots(propsOf()), 'node');
    const genericEl = generic.Slots(propsOf()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.children].map((el) => el.className)).toEqual(['a', 'b']);
    expect(compiledEl.textContent).toBe(genericEl.textContent);
  });

  it('节点通道：通用路径会拒绝的值沿用核心自己的报错', async () => {
    const source = [
      "import { div } from '../../src/yoya.core.js';",
      '',
      'export function One(props) {',
      '  return div((root) => root.child(props.slot));',
      '}',
      ''
    ].join('\n');
    const { wired, compiled, generic } = await setup('one-bad', source, 'node', 'One');
    expect(wired, '插件没有编出产物').not.toBeNull();

    // `child(true)` 在通用路径里就是 TypeError（只接受节点 / 组件 / 字符串 / 数字 / 句柄）
    expect(() => generic.One({ slot: true }).renderDom()).toThrow(TypeError);
    expect(() => compiled.One({ slot: true }).renderDom()).toThrow(TypeError);
  });

  it('节点通道：组件定义函数与 ViewNode 同一条分派', async () => {
    const source = [
      "import { div } from '../../src/yoya.core.js';",
      '',
      'export function One(props) {',
      '  return div((root) => {',
      "    root.className('one');",
      '    root.child(props.slot);',
      '  });',
      '}',
      ''
    ].join('\n');
    const propsOf = () => ({
      slot: () => core.span((box) => box.className('comp').child('comp'))
    });
    const { wired, compiled, generic } = await setup('one-node', source, 'node', 'One');
    expect(wired, '插件没有编出产物').not.toBeNull();

    const compiledEl = elementOf(compiled.One(propsOf()), 'node');
    const genericEl = generic.One(propsOf()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect(compiledEl.querySelectorAll('.comp').length).toBe(1);
  });

  it('元素通道：文本语义（字符串 / 句柄 / 数组摊平）与通用路径一致', async () => {
    const source = [
      "import { div, span } from '../../src/yoya.core.js';",
      '',
      'export function Text(props) {',
      '  return div((root) => {',
      "    root.className('text');",
      "    root.span((cell) => cell.className('label').child(props.label));",
      "    root.span((cell) => cell.className('parts').child(props.parts));",
      "    root.span((cell) => cell.className('end').child('end'));",
      '  });',
      '}',
      ''
    ].join('\n');
    const propsOf = () => ({ label: core.ref('live'), parts: ['a', ['b'], 3] });
    const { wired, compiled, generic } = await setup('text-element', source, 'element', 'Text');
    expect(wired, '插件没有编出产物').not.toBeNull();

    const compiledEl = elementOf(compiled.Text(propsOf()), 'element');
    const genericEl = generic.Text(propsOf()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.children].map((el) => el.textContent)).toEqual(['live', 'ab3', 'end']);
  });

  it('元素通道：节点值响亮报错（没有节点对象，要节点语义就编节点通道）', async () => {
    const { wired, compiled } = await setup('node-value-element', panel, 'element');
    expect(wired, '插件没有编出产物').not.toBeNull();

    expect(() => compiled.Panel({ title: core.ref('head'), slot: core.span('slot') })).toThrow(
      /element channel/
    );
  });

  it('相邻文本位置能编：锚点不参与文本合并，位置表照旧对齐（票 13）', async () => {
    const source = [
      "import { div, vText } from '../../src/yoya.core.js';",
      '',
      'export function Adjacent(props) {',
      '  return div((root) => {',
      "    root.child('a');",
      '    root.child(props.middle);',
      '    root.child(String(props.tail));',
      '    root.child(vText(props.last));',
      '  });',
      '}',
      ''
    ].join('\n');
    const propsOf = () => ({
      middle: core.ref('mid'),
      tail: 'tail',
      last: core.ref('last')
    });

    for (const mode of ['element', 'node']) {
      const { wired, compiled, generic } = await setup(
        `adjacent-${mode}`,
        source,
        mode,
        'Adjacent'
      );
      expect(wired, mode).not.toBeNull();
      // 真的走了产物（不是两条通用路径在比）
      const unit = wired.units.find((entry) => entry.virtual.includes(':Adjacent-'));
      expect(unit?.module, mode).toContain('export const plan =');

      const compiledEl = elementOf(compiled.Adjacent(propsOf()), mode);
      const genericEl = generic.Adjacent(propsOf()).renderDom();
      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      expect(compiledEl.textContent, mode).toBe('amidtaillast');

      // 活值照旧生效（三处相邻文本位置各自独立）
      const props = propsOf();
      const liveEl = elementOf(compiled.Adjacent(props), mode);
      props.middle.value = 'M';
      props.last.value = 'L';
      expect(liveEl.textContent).toBe('aMtailL');
    }
  });
});
