import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { compileSource, elementWhitelistOf } from './index.js';

const fixture = readFileSync(join(import.meta.dirname, 'fixtures/item-fixture.js'), 'utf8');

/**
 * 中性夹具的片段：静态值进片段，动态值留**注释锚点**（`<!---->`，片段只由框架自己的 toHTML() 产出）。
 * 文本位置用注释而不是文本占位：HTML 解析器会把相邻的两段文本并成一个文本节点，位置表会整体前移。
 */
const ITEM_HTML =
  '<li data-item-id=""><span class="item-id"><!----></span>' +
  '<span class="item-label"><a><!----></a></span>' +
  '<span class="item-action"><a><i aria-hidden="true" class="icon icon-remove"></i></a></span>' +
  '<span class="item-note"></span></li>';

const compile = (source, options = {}) =>
  compileSource({ source, file: 'item-fixture.js', fn: 'Item', core, ...options });

const sourceOf = (body) => `function Item(item) {\n${body}\n}\n`;

describe('element registry', () => {
  it('derives the element whitelist from the core factories', () => {
    const whitelist = elementWhitelistOf(core);

    for (const name of ['div', 'span', 'tr', 'td', 'table', 'svg', 'path']) {
      expect(whitelist.has(name), name).toBe(true);
    }
    for (const name of ['vCard', 'vNode', 'vText', 'vButton', 'compare', 'constructor']) {
      expect(whitelist.has(name), name).toBe(false);
    }
  });
});

describe('compileSource', () => {
  it('compiles the canonical row into a plan and an element-mode module', () => {
    const result = compile(fixture);

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.plan.mode).toBe('element');
    expect(result.plan.source).toEqual({ file: 'item-fixture.js', fn: 'Item' });
    expect(result.plan.html).toBe(ITEM_HTML);
    expect(result.fragmentHtml).toBe(ITEM_HTML); // 供 --fragments 写模板块（plan 将来可省略 html）
    expect(result.plan.liveNodes).toBe(6);
    expect(result.scope).toEqual(['computed', 'removeItem', 'selectedId']);
    expect(result.module).toContain('export const plan = ');
    expect(result.module).toContain('export function createRowFactory(scope)');
    expect(result.module).toContain('return function Item(item) {');
    expect(result.module).toContain('cloneFragment(plan.html, plan.signature)');
  });

  it('produces a node-mode module that adopts the fragment into wrapper nodes', () => {
    const result = compile(fixture, { mode: 'node' });

    expect(result.compiled).toBe(true);
    expect(result.plan.mode).toBe('node');
    expect(result.plan.html).toBe(ITEM_HTML);
    expect(result.module).toContain('adopt(');
    expect(result.module).toContain('bindChild(');
  });

  it('derives the scope from free identifiers only', () => {
    const result = compile(fixture);
    expect(result.scope).not.toContain('String');
    expect(result.scope).not.toContain('row');

    const simple = compile(
      sourceOf("  return tr((line) => {\n    line.attr('data-x', String(item.id));\n  });")
    );
    expect(simple.compiled).toBe(true);
    expect(simple.scope).toEqual([]);
  });

  it('rejects a shape when a component call lands in a child position', () => {
    const result = compile(
      sourceOf("  return tr((line) => line.td((cell) => cell.child(vCard('x'))));")
    );

    expect(result.compiled).toBe(false);
    expect(result.module).toBeNull();
    expect(result.plan).toBeNull();
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('组件调用');
  });

  it('falls back for every unsupported construct', () => {
    const cases = [
      // 控制流本身现在能编（票 04 的结构锚点），但这两段里的"结构"不是"加一个子结构 / 运行期子节点"
      // → 仍整形状回落
      ["if (item.id) {\n      line.attr('data-x', '1');\n    }", '只支持加结构'],
      [
        'for (const dataItem of item.items) {\n      line.className("x").child(item);\n    }',
        '不止一步'
      ],
      ['line.attr(...item.attrs);', 'spread'],
      ["line.whenFailed('x');", '不是元素工厂'],
      ['line.td((cell) => cell.child(() => item.label));', '组件槽'],
      ["line.attr(item.name, 'x');", '属性名不是字符串字面量'],
      // 动态类名现在能编（`className(非字面量)` → 保序去重的运行期写）；字面量不是字符串才回落
      ['line.className(1);', '字面量参数不是字符串']
    ];

    for (const [body, reason] of cases) {
      const result = compile(sourceOf(`  return tr((line) => {\n    ${body}\n  });`));
      expect(result.compiled, body).toBe(false);
      expect(result.bails.map((bail) => bail.reason).join(' | '), body).toContain(reason);
    }
  });

  it('reports a bail when the builder function is missing or has no setup callback', () => {
    const missing = compile(sourceOf('  return tr;'));
    expect(missing.compiled).toBe(false);
    expect(missing.bails[0].reason).toContain('不是单个 return 工厂调用');

    const noFunction = compileSource({ source: 'const other = 1;\n', fn: 'Item', core });
    expect(noFunction.compiled).toBe(false);
    expect(noFunction.bails).toEqual([{ reason: '找不到目标函数 Item', at: null }]);
  });

  // 票 21：形参里的名字是**已绑定名**（不是自由标识符），产物逐字复刻源码的参数表。
  // 票 12 的静默编错（把 data / api 收进 scope）靠绑定名集合根治，不再靠 bail。
  it('compiles a destructured builder parameter without leaking its names into scope', () => {
    const result = compileSource({
      source:
        'export function Item({ data, api }) {\n' +
        '  return tr((line) => line.td((cell) => cell.child(String(data.id))));\n' +
        '}\n',
      file: 'probe.js',
      fn: 'Item',
      core
    });

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.scope).toEqual([]);
    expect(result.module).toContain('return function Item({ data, api }) {');
    expect(result.module).not.toContain('const { api, data } = scope;');
  });

  it('reproduces every parameter shape the source declares', () => {
    const shapes = ['item = null', '...items', 'item, extra', '{ data }', '[first]', ''];

    for (const param of shapes) {
      const result = compileSource({
        source: `export function Item(${param}) {\n  return tr((line) => line.td('x'));\n}\n`,
        file: 'probe.js',
        fn: 'Item',
        core
      });
      const label = param || '(无参)';
      expect(result.bails, label).toEqual([]);
      expect(result.compiled, label).toBe(true);
      expect(result.module, label).toContain(`return function Item(${param}) {`);
    }
  });

  it('keeps compiling the single-identifier parameter shape', () => {
    const result = compileSource({
      source:
        'export function Item(item) {\n' +
        '  return tr((line) => line.td((cell) => cell.child(String(item.data.id))));\n' +
        '}\n',
      file: 'probe.js',
      fn: 'Item',
      core
    });

    expect(result.compiled).toBe(true);
    expect(result.scope).toEqual([]);
  });

  // 值位置引用**局部声明**：产物里不执行组件函数体，读到它会变成 undefined（曾经是静默错）
  it('bails when a value position references a local declaration', () => {
    const result = compileSource({
      source:
        'export function Item(item) {\n' +
        '  const label = item.label;\n' +
        '  return tr((line) => line.td((cell) => cell.child(vText(label))));\n' +
        '}\n',
      file: 'probe.js',
      fn: 'Item',
      core
    });

    expect(result.compiled).toBe(false);
    expect(result.module).toBeNull();
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('局部变量');
  });

  // 本地同名函数不是核心元素工厂：以前会被编成 `<span>`（通用路径会抛错）→ 静默误编
  it('does not treat a locally bound name as a core element factory', () => {
    const result = compileSource({
      source:
        'function span(setup) {\n  return { custom: setup };\n}\n' +
        'export function Item(item) {\n' +
        '  return tr((line) => line.td((cell) => cell.child(span((n) => n.className("x")))));\n' +
        '}\n',
      file: 'probe.js',
      fn: 'Item',
      core
    });

    expect(result.compiled).toBe(false);
    expect(result.module).toBeNull();
  });

  // 票 07：对象组件（`{ render() }`）已退场 → 形状认不出，整体回落通用路径（产物为空）
  it('does not compile a render() component object (shape retired)', () => {
    const result = compileSource({
      source:
        'export function Pill(props) {\n' +
        '  return {\n' +
        '    render() {\n' +
        '      return span((node) => node.className("pill").child(vText(props.label)));\n' +
        '    }\n' +
        '  };\n' +
        '}\n',
      file: 'probe.js',
      fn: 'Pill',
      core
    });

    expect(result.compiled).toBe(false);
    expect(result.module).toBeNull();
    expect(result.bails.length).toBeGreaterThan(0);
  });

  // C6：产物不嵌机器绝对路径——同一份源码换个目录/换台机器编出来必须逐字节相同。
  it('keeps machine-specific absolute paths out of the artifact', () => {
    const source =
      'export function Item(item) {\n' +
      '  return tr((line) => line.td((cell) => cell.child(String(item.data.id))));\n' +
      '}\n';
    const inside = compileSource({
      source,
      file: join(process.cwd(), 'src', 'rows', 'item.js'),
      fn: 'Item',
      core,
      runtime: './compiler-runtime.js'
    });
    const outside = compileSource({
      source,
      file: join(process.cwd(), '..', 'elsewhere', 'item.js'),
      fn: 'Item',
      core,
      runtime: './compiler-runtime.js'
    });

    expect(inside.plan.source.file).toBe('src/rows/item.js');
    expect(outside.plan.source.file).toBe('item.js');
    for (const result of [inside, outside]) {
      expect(result.module).not.toMatch(/[A-Za-z]:[\\/]/);
      expect(result.module).not.toContain(process.cwd());
    }
    // 相对标签相同 → 产物逐字节相同
    const again = compileSource({
      source,
      file: 'src/rows/item.js',
      fn: 'Item',
      core,
      runtime: './compiler-runtime.js'
    });
    expect(again.module).toBe(inside.module);
  });

  it('keeps the bail list empty for a shape with only static and live values', () => {
    const result = compile(
      sourceOf(
        '  return tr((line) => {\n' +
          "    line.attr('data-item-id', String(item.id));\n" +
          '    line.td((cell) => cell.child(vText(item.label)));\n' +
          "    line.toggleClass('active', computed(() => selectedId.value === item.id));\n" +
          '  });'
      )
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.scope).toEqual(['computed', 'selectedId']);
  });

  it('accepts the (options, setup) form and variadic tails', () => {
    const optionsFirst = compile(
      sourceOf(
        '  return tr((line) => {\n' +
          "    line.td({ slot: 't-head', attrs: { id: 'c1' }, style: { color: 'red' } }, (cell) => {\n" +
          '      cell.child(String(item.id));\n' +
          '    });\n' +
          '  });'
      )
    );

    expect(optionsFirst.bails).toEqual([]);
    expect(optionsFirst.compiled).toBe(true);
    expect(optionsFirst.plan.html).toContain(
      '<td id="c1" slot="t-head" style="color:red"><!----></td>'
    );

    const optionsLast = compile(
      sourceOf(
        '  return tr((line) => {\n' +
          "    line.td((cell) => cell.child(String(item.id)), { attrs: { id: 'c2' } });\n" +
          '  });'
      )
    );

    expect(optionsLast.bails).toEqual([]);
    expect(optionsLast.plan.html).toContain('<td id="c2"><!----></td>');
  });

  it('accepts more than three factory arguments', () => {
    const result = compile(
      sourceOf(
        '  return tr((line) => {\n' +
          "    line.td('a', { attrs: { id: 'c3' } }, (cell) => cell.span('s'), 'b');\n" +
          '  });'
      )
    );

    expect(result.bails).toEqual([]);
    expect(result.plan.html).toBe('<tr><td id="c3">a<span>s</span>b</td></tr>');
  });

  it('compiles dynamic style values in node mode into node.style writes', () => {
    const result = compile(
      sourceOf("  return tr((line) => line.td({ style: { color: item.tone } }, 'x'));"),
      { mode: 'node' }
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.module).toContain('node.style("color", item.tone)');
    // 片段里不写占位：样式值由节点快照 / 运行期绑定写
    expect(result.plan.html).toBe('<tr><td>x</td></tr>');
  });

  it('falls back in element mode, where a dynamic style cannot stay byte-identical', () => {
    const result = compile(
      sourceOf("  return tr((line) => line.td((cell) => cell.style('color', item.tone)));")
    );

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('动态样式');
  });

  it('bails on a computed whole class name with an actionable hint', () => {
    const result = compile(sourceOf("  return tr((line) => line.td({ class: item.tone }, 'x'));"));

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('toggleClass');
  });

  // 静态属性值走框架自己的 attr 口径：null / false 移除、true 写成同名（不能自己 String()）
  it('keeps static attribute values on the framework path', () => {
    const cases = [
      ['null', null],
      ['false', false],
      ['true', true],
      ['""', ''],
      ['"x"', 'x'],
      ['7', 7]
    ];

    for (const [expression, value] of cases) {
      const result = compile(
        sourceOf(`  return div((node) => node.attr('data-x', ${expression}));`)
      );
      const generic = core.div((node) => node.attr('data-x', value));

      expect(result.compiled, expression).toBe(true);
      expect(result.plan.html, expression).toBe(generic.toHTML());
    }
  });

  it('bails on a boolean literal in a text position (the generic path throws there)', () => {
    const result = compile(sourceOf('  return div((node) => node.child(false));'));

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('布尔值');
  });

  // 组件身份（vn）就是普通静态属性：进片段、进节点快照，adopt / hydrate 后判定照样成立
  it('bakes the component identity attribute into the fragment', () => {
    const result = compile(
      sourceOf("  return div({ vn: 'VCard' }, (node) => node.span(String(item.id)));")
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.plan.html).toContain('<div vn="VCard"><span><!----></span></div>');

    const nodeMode = compile(
      sourceOf("  return div({ vn: 'VCard' }, (node) => node.on('click', item.onPick));"),
      { mode: 'node' }
    );
    expect(nodeMode.module).toContain('node.attr("vn", "VCard")');
  });

  // 覆盖度缺口 2：对象在文本位置上编出来就是静默误编 → 编译期认出就回落
  // （数组不再是缺口：票 09 的运行期子节点按通用路径的口径摊平，见 runtime-children.test.js）
  it('bails on objects in a text position', () => {
    const object = compile(sourceOf('  return div((node) => node.child({ text: item.a }));'));
    expect(object.compiled).toBe(false);
    expect(object.bails.map((bail) => bail.reason).join(' | ')).toContain('对象');

    const text = compile(sourceOf('  return div((node) => node.child(vText([item.a])));'));
    expect(text.compiled).toBe(false);
    expect(text.bails.map((bail) => bail.reason).join(' | ')).toContain('vText() 收到数组');
  });

  it('compiles an array in a child position into the runtime child dispatch', () => {
    const result = compile(sourceOf('  return div((node) => node.child([item.a, item.b]));'));

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    // 元素通道：占位 + 运行期摊平（数组里的节点值会在运行期响亮报错，见 runtime-children.test.js）
    expect(result.module).toContain('bindChildText(');
  });

  it('compiles dynamic option values into live attribute writes', () => {
    const result = compile(
      sourceOf(
        "  return tr((line) => line.td({ attrs: { id: item.id }, 'data-tone': item.tone }, 'x'));"
      )
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.plan.html).toBe('<tr><td data-tone="" id="">x</td></tr>');
    // 位置在跑任何 op 之前一次性解析成变量（`mountable` 这类会摘节点的 op 靠它才对得上）
    expect(result.module).toContain('const n0 = el.childNodes[0];');
    expect(result.module.indexOf('const n0 =')).toBeLessThan(
      result.module.indexOf('setAttr(n0, "id", item.id)')
    );
    expect(result.module).toContain('setAttr(n0, "id", item.id)');
    expect(result.module).toContain('setAttr(n0, "data-tone", item.tone)');
  });

  // 票 01（compiler-landing）：运行期钩子按需 import，不是整张名单
  it('imports only the runtime hooks the artifact actually uses', () => {
    const runtimeImportsOf = (result) =>
      result.module.split('\n').find((line) => line.startsWith('import {')) ?? '';

    const staticRow = compile(sourceOf("  return tr((line) => line.td('x'));"));
    expect(runtimeImportsOf(staticRow)).toContain('cloneFragment');
    expect(runtimeImportsOf(staticRow)).not.toContain('bindText');
    expect(runtimeImportsOf(staticRow)).not.toContain('setAttr');
    expect(runtimeImportsOf(staticRow)).not.toContain('mountableAt');

    const liveRow = compile(
      sourceOf('  return tr((line) => line.td((cell) => cell.child(vText(item.label))));')
    );
    expect(runtimeImportsOf(liveRow)).toContain('bindText');
    expect(runtimeImportsOf(liveRow)).toContain('pushOff');
    expect(runtimeImportsOf(liveRow)).not.toContain('mountableAt');

    const mountable = compile(
      sourceOf('  return tr((line) => line.td((cell) => cell.mountable(item.visible)));')
    );
    expect(runtimeImportsOf(mountable)).toContain('mountableAt');
    expect(runtimeImportsOf(mountable)).not.toContain('bindText');
  });

  it('accepts the (options, setup) form on the entry factory too', () => {
    const result = compile(
      "import { div } from '../../../../yoya.core.js';\n" +
        'export function Item(item) {\n' +
        "  return div({ attrs: { id: 'root' } }, (node) => node.span(String(item.id)));\n" +
        '}\n'
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.plan.html).toBe('<div id="root"><span><!----></span></div>');
    expect(result.scope).toEqual([]);
  });

  it('can emit a templates-only plan without inlining the fragment html', () => {
    const result = compile(fixture, { templatesOnly: true });

    expect(result.compiled).toBe(true);
    expect(result.plan.html).toBeUndefined();
    expect(result.plan.signature).toMatch(/^[0-9a-f]{12}$/);
    expect(result.fragmentHtml).toBe(ITEM_HTML);
    expect(result.module).toContain('cloneFragment(plan.html, plan.signature)');
  });
});
