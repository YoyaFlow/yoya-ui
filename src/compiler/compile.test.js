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
    expect(result.plan.liveNodes).toBe(6);
    expect(result.scope).toEqual(['computed', 'removeRow', 'selectedId']);
    expect(result.module).toContain('export const plan = ');
    expect(result.module).toContain('export function createRowFactory(scope)');
    expect(result.module).toContain('return function buildRow(row) {');
    expect(result.module).toContain('cloneFragment(plan.html)');
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

  it('bails when an option value cannot be read statically', () => {
    const result = compile(
      sourceOf("  return tr((line) => line.td({ attrs: { id: row.id } }, 'x'));")
    );

    expect(result.compiled).toBe(false);
    expect(result.bails.map((bail) => bail.reason).join(' | ')).toContain('字面量');
  });
});
