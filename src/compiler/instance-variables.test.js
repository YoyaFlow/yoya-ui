/**
 * 票 10：**组件实例变量** + 编译单元发现的放宽（两件事必须一起做）。
 *
 * 文档页那批（32 个文件）真正卡住的是这个形状：组件体里先把实例存进变量，视图里再当子节点用——
 *
 * ```js
 * export function Section(demo) {
 *   const liveDemo = demo.component();     // 组件实例（导入 / 同模块组件）
 *   return vNode(() => section((box) => box.child(liveDemo)));
 * }
 * ```
 *
 * 它要同时靠两块地基：票 09 的**运行期子节点**（`child(<表达式>)` 按核心 `child()` 同一份分派落地）
 * 与**发现放宽**（函数体允许 return 之前有声明 / 表达式语句）。本文件的用例都必须先证明
 * "确实走了编译产物"（看产物模块 / 片段），再比 DOM / 活值 / 顺序——上一轮就是"只比 DOM"把假绿放过了。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { componentUnits, wireComponentModule } from './plugin.js';
import { compileSource } from './compile.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-instances-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

/** 与 anchors.test.js 同一套装配：发现 → 插件改写 → 产物落成真模块。 */
const setup = async (label, code) => {
  const file = join(workDir, `${label}.js`);
  writeFileSync(file, code, 'utf8');
  const units = componentUnits(code, { core, file });
  const wired = wireComponentModule({ source: code, targets: units, core, runtime: runtimeUrl });
  if (!wired) {
    return { units, wired: null, file };
  }
  const replacements = new Map();
  const modules = [];
  wired.units.forEach((unit, index) => {
    const path = join(workDir, `${label}.unit${index}.js`);
    replacements.set(JSON.stringify(unit.virtual), JSON.stringify(pathToFileURL(path).href));
    modules.push({ path, module: unit.module, virtual: unit.virtual });
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
    units,
    wired,
    modules,
    compiled: await import(pathToFileURL(wiredPath).href),
    generic: await import(pathToFileURL(file).href),
    file
  };
};

/** 产物里某个组件的模块源码（用来证明"确实走了产物"，不是两条通用路径在比）。 */
const moduleOf = (result, component) => {
  const unit = result.modules.find((entry) => entry.virtual.includes(`:${component}-`));
  return unit?.module ?? null;
};

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

const panelSource = [
  "import { div, span, vNode, vText } from '../../src/yoya.core.js';",
  '',
  'export function Chip(label) {',
  "  return span((box) => box.className('chip').child(vText(label)));",
  '}',
  '',
  'export function Section(props) {',
  '  const liveDemo = Chip(props.label);',
  '  return vNode(() =>',
  '    div((root) => {',
  "        root.className('section');",
  "        root.span((head) => head.className('head').child(vText(props.title)));",
  '        root.child(liveDemo);',
  "        root.span((tail) => tail.className('tail').child('tail'));",
  '    })',
  '  );',
  '}',
  ''
].join('\n');

describe('组件实例变量（票 10）', () => {
  it('组件体里的实例变量能编：先证明走了产物，再比 DOM / 活值 / 顺序', async () => {
    const propsOf = () => ({ title: core.ref('head'), label: core.ref('chip') });
    const result = await setup('section', panelSource);
    expect(result.wired, '插件没有编出产物').not.toBeNull();

    // 发现放宽：Section 这种"先声明实例、再 return 组件对象"的函数也是一个编译单元
    expect(result.units.map((unit) => unit.component).sort()).toEqual(['Chip', 'Section']);

    // 走的是产物：Section 的产物里有片段、有运行期子节点接线
    const sectionModule = moduleOf(result, 'Section');
    expect(sectionModule, 'Section 没有产物模块').not.toBeNull();
    expect(sectionModule).toContain('export const plan =');
    expect(sectionModule).toContain('mountRuntimeChildren(');
    expect(sectionModule).toContain('liveDemo');

    // 组件定义函数直接返回视图（vNode 组件）
    const compiledEl = result.compiled.Section(propsOf()).renderDom();
    const genericEl = result.generic.Section(propsOf()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.children].map((el) => el.className)).toEqual(['head', 'chip', 'tail']);
    expect(compiledEl.querySelectorAll('.section').length).toBe(0);
    expect(compiledEl.querySelectorAll('.chip').length).toBe(1);
  });

  it('每个实例都是新的（产物不能把第一次的实例缓存下来）', async () => {
    const result = await setup('twice', panelSource);
    expect(result.wired, '插件没有编出产物').not.toBeNull();

    const first = result.compiled.Section({ title: core.ref('a'), label: core.ref('one') });
    const second = result.compiled.Section({ title: core.ref('b'), label: core.ref('two') });

    expect(first.renderDom().querySelector('.chip').textContent).toBe('one');
    expect(second.renderDom().querySelector('.chip').textContent).toBe('two');
  });

  it('多实例 / 同一实例用两次 / 实例与普通局部量混用', async () => {
    const source = [
      "import { div, span, vNode } from '../../src/yoya.core.js';",
      '',
      'export function Chip(label) {',
      "  return span((box) => box.className('chip').child(label));",
      '}',
      '',
      'export function Stack(props) {',
      "  const first = Chip('first');",
      "  const second = Chip('second');",
      "  const label = 'label';",
      '  return vNode(() =>',
      '    div((root) => {',
      "        root.className('stack');",
      '        root.child(first);',
      '        root.child(label);',
      '        root.child(second);',
      '        root.child(first);',
      '    })',
      '  );',
      '}',
      ''
    ].join('\n');
    const result = await setup('stack', source);
    expect(result.wired, '插件没有编出产物').not.toBeNull();
    expect(moduleOf(result, 'Stack')).toContain('mountRuntimeChildren(');

    const compiledEl = result.compiled.Stack({}).renderDom();
    const genericEl = result.generic.Stack({}).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.children].map((el) => el.className)).toEqual(['chip', 'chip']);
  });

  it('实例的销毁跟着父节点走（与通用路径同一条时序）', async () => {
    const source = [
      "import { div, span, vNode } from '../../src/yoya.core.js';",
      '',
      'export function Tracked(props) {',
      '  return vNode((api) => {',
      '    api.whenDestroy = () => {',
      '      props.onDestroy();',
      '    };',
      "    return span((box) => box.className('tracked').child('tracked'));",
      '  });',
      '}',
      '',
      'export function Holder(props) {',
      '  const tracked = Tracked({ onDestroy: props.onDestroy });',
      "  return vNode(() => div((root) => root.className('holder').child(tracked)));",
      '}',
      ''
    ].join('\n');
    const result = await setup('destroy', source);
    expect(result.wired, '插件没有编出产物').not.toBeNull();
    expect(moduleOf(result, 'Holder')).toContain('mountRuntimeChildren(');

    const genericCalls = [];
    const genericView = result.generic.Holder({ onDestroy: () => genericCalls.push('generic') });
    genericView.renderDom();
    genericView.destroy();
    const compiledProduct = result.compiled.Holder({
      onDestroy: () => genericCalls.push('compiled')
    });
    compiledProduct.renderDom();
    compiledProduct.destroy();

    expect(genericCalls).toEqual(['generic', 'compiled']);
  });

  it('行工厂（row 形状）里的局部量按 R6 整体回落，绝不半编', async () => {
    const source = [
      "import { span, td, tr } from '../../src/yoya.core.js';",
      '',
      'export function Chip(label) {',
      "  return span((box) => box.className('chip').child(label));",
      '}',
      '',
      'export function Row(item) {',
      "  const chip = Chip('x');",
      '  return tr((line) => line.td((cell) => cell.child(chip)));',
      '}',
      ''
    ].join('\n');
    const file = join(workDir, 'row-local.js');
    writeFileSync(file, source, 'utf8');

    // Row 仍是候选（前置声明 + 末尾 return），但行工厂的产物不执行组件函数体 →
    // 值位置引用局部量必须整形状回落（`replacedInPlace` 只对形态 B / vNode 成立）
    expect(componentUnits(source, { core, file }).map((unit) => unit.component)).toContain('Row');
    expect(
      wireComponentModule({
        source,
        targets: [{ component: 'Row', file, mode: 'element' }],
        core,
        runtime: runtimeUrl
      })
    ).toBeNull();

    const result = compileSource({
      source,
      file,
      fn: 'Row',
      mode: 'element',
      core,
      runtime: runtimeUrl
    });
    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('局部变量');
  });

  it('return 之前是控制流时不认（早退会让视图变成运行期才知道的事）', () => {
    const source = [
      "import { div } from '../../src/yoya.core.js';",
      '',
      'export function Maybe(props) {',
      '  if (props.hidden) {',
      '    return null;',
      '  }',
      "  return div((box) => box.child('x'));",
      '}',
      ''
    ].join('\n');

    expect(componentUnits(source, { core, file: join(workDir, 'maybe.js') })).toEqual([]);
  });
});
