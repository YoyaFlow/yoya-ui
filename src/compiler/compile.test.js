import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compileSource, elementWhitelistOf } from './index.js';

const fixture = readFileSync(join(import.meta.dirname, 'fixtures/row-fixture.js'), 'utf8');

/** 官方行形态的片段：静态值进片段，动态值留占位（片段只由框架自己的 toHTML() 产出）。 */
const ROW_HTML =
  '<tr data-row-id=""><td class="col-md-1">0</td><td class="col-md-4"><a>0</a></td>' +
  '<td class="col-md-1"><a><span aria-hidden="true" class="glyphicon glyphicon-remove"></span></a></td>' +
  '<td class="col-md-6"></td></tr>';

const compile = (source, options = {}) =>
  compileSource({ source, file: 'row-fixture.js', fn: 'buildRow', core, ...options });

const sourceOf = (body) => `function buildRow(row) {\n${body}\n}\n`;

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
    expect(result.plan.source).toEqual({ file: 'row-fixture.js', fn: 'buildRow' });
    expect(result.plan.html).toBe(ROW_HTML);
    expect(result.fragmentHtml).toBe(ROW_HTML); // 供 --fragments 写模板块（plan 将来可省略 html）
    expect(result.plan.liveNodes).toBe(6);
    expect(result.scope).toEqual(['computed', 'removeRow', 'selectedId']);
    expect(result.module).toContain('export const plan = ');
    expect(result.module).toContain('export function createRowFactory(scope)');
    expect(result.module).toContain('return function buildRow(row) {');
    expect(result.module).toContain('cloneFragment(plan.html, plan.signature)');
  });

  it('produces a node-mode module that adopts the fragment into wrapper nodes', () => {
    const result = compile(fixture, { mode: 'node' });

    expect(result.compiled).toBe(true);
    expect(result.plan.mode).toBe('node');
    expect(result.plan.html).toBe(ROW_HTML);
    expect(result.module).toContain('adopt(');
    expect(result.module).toContain('bindChild(');
  });

  it('derives the scope from free identifiers only', () => {
    const result = compile(fixture);
    expect(result.scope).not.toContain('String');
    expect(result.scope).not.toContain('row');

    const simple = compile(
      sourceOf("  return tr((line) => {\n    line.attr('data-x', String(row.id));\n  });")
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
      ["if (row.id) {\n      line.attr('data-x', '1');\n    }", 'IfStatement'],
      ['for (const item of row.items) {\n      line.child(item);\n    }', 'ForOfStatement'],
      ['line.attr(...row.attrs);', 'spread'],
      ["line.whenFailed('x');", '不是元素工厂'],
      ['line.td((cell) => cell.child(() => row.label));', '组件槽'],
      ["line.attr(row.name, 'x');", '属性名不是字符串字面量'],
      ['line.className(row.cls);', '不是字符串字面量']
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

    const noFunction = compileSource({ source: 'const other = 1;\n', fn: 'buildRow', core });
    expect(noFunction.compiled).toBe(false);
    expect(noFunction.bails).toEqual([{ reason: '找不到目标函数 buildRow', at: null }]);
  });

  it('keeps the bail list empty for a shape with only static and live values', () => {
    const result = compile(
      sourceOf(
        '  return tr((line) => {\n' +
          "    line.attr('data-row-id', String(row.id));\n" +
          '    line.td((cell) => cell.child(vText(row.label)));\n' +
          "    line.toggleClass('danger', computed(() => selectedId.value === row.id));\n" +
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
          '      cell.child(String(row.id));\n' +
          '    });\n' +
          '  });'
      )
    );

    expect(optionsFirst.bails).toEqual([]);
    expect(optionsFirst.compiled).toBe(true);
    expect(optionsFirst.plan.html).toContain('<td id="c1" slot="t-head" style="color:red">0</td>');

    const optionsLast = compile(
      sourceOf(
        '  return tr((line) => {\n' +
          "    line.td((cell) => cell.child(String(row.id)), { attrs: { id: 'c2' } });\n" +
          '  });'
      )
    );

    expect(optionsLast.bails).toEqual([]);
    expect(optionsLast.plan.html).toContain('<td id="c2">0</td>');
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
      sourceOf("  return tr((line) => line.td({ style: { color: row.tone } }, 'x'));"),
      { mode: 'node' }
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.module).toContain('node.style("color", row.tone)');
    // 片段里不写占位：样式值由节点快照 / 运行期绑定写
    expect(result.plan.html).toBe('<tr><td>x</td></tr>');
  });

  it('falls back in element mode, where a dynamic style cannot stay byte-identical', () => {
    const result = compile(
      sourceOf("  return tr((line) => line.td((cell) => cell.style('color', row.tone)));")
    );

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('动态样式');
  });

  it('bails on a computed whole class name with an actionable hint', () => {
    const result = compile(sourceOf("  return tr((line) => line.td({ class: row.tone }, 'x'));"));

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
      sourceOf("  return div({ vn: 'VCard' }, (node) => node.span(String(row.id)));")
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.plan.html).toContain('<div vn="VCard"><span>0</span></div>');

    const nodeMode = compile(
      sourceOf("  return div({ vn: 'VCard' }, (node) => node.on('click', row.onPick));"),
      { mode: 'node' }
    );
    expect(nodeMode.module).toContain('node.attr("vn", "VCard")');
  });

  // 覆盖度缺口 2：数组 / 对象在文本位置上编出来就是静默误编 → 编译期认出就回落
  it('bails on arrays and objects in a text position', () => {
    const array = compile(sourceOf('  return div((node) => node.child([row.a, row.b]));'));
    expect(array.compiled).toBe(false);
    expect(array.bails.map((bail) => bail.reason).join(' | ')).toContain('数组');
    expect(array.bails[0].at).toContain('[');

    const object = compile(sourceOf('  return div((node) => node.child({ text: row.a }));'));
    expect(object.compiled).toBe(false);
    expect(object.bails.map((bail) => bail.reason).join(' | ')).toContain('对象');

    const text = compile(sourceOf('  return div((node) => node.child(vText([row.a])));'));
    expect(text.compiled).toBe(false);
    expect(text.bails.map((bail) => bail.reason).join(' | ')).toContain('vText() 收到数组');
  });

  it('compiles dynamic option values into live attribute writes', () => {
    const result = compile(
      sourceOf(
        "  return tr((line) => line.td({ attrs: { id: row.id }, 'data-tone': row.tone }, 'x'));"
      )
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.plan.html).toBe('<tr><td data-tone="" id="">x</td></tr>');
    expect(result.module).toContain('setAttr(el.childNodes[0], "id", row.id)');
    expect(result.module).toContain('setAttr(el.childNodes[0], "data-tone", row.tone)');
  });

  it('accepts the (options, setup) form on the entry factory too', () => {
    const result = compile(
      "import { div } from '../../yoya.core.js';\n" +
        'export function buildRow(row) {\n' +
        "  return div({ attrs: { id: 'root' } }, (node) => node.span(String(row.id)));\n" +
        '}\n'
    );

    expect(result.bails).toEqual([]);
    expect(result.compiled).toBe(true);
    expect(result.plan.html).toBe('<div id="root"><span>0</span></div>');
    expect(result.scope).toEqual([]);
  });

  it('can emit a templates-only plan without inlining the fragment html', () => {
    const result = compile(fixture, { templatesOnly: true });

    expect(result.compiled).toBe(true);
    expect(result.plan.html).toBeUndefined();
    expect(result.plan.signature).toMatch(/^[0-9a-f]{12}$/);
    expect(result.fragmentHtml).toBe(ROW_HTML);
    expect(result.module).toContain('cloneFragment(plan.html, plan.signature)');
  });
});
