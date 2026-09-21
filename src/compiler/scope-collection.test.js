/**
 * 作用域收集（票 12 同族）：`freeIdentifiers` 决定"哪些名字要进产物 scope"。
 *
 * 只认 Identifier / 非计算成员访问 / 简单形参时，下面这些都会被当成**自由标识符**：
 * 属性名（含可选链）、对象键、解构形参、嵌套回调里的局部量、catch 形参、嵌套函数名。
 *
 * 后果不是"多几个名字"，而是产物直接跑不起来：scope 对象在**替换点**求值
 * （`createRowFactory({ closest, x })`），而 `closest` / `x` 在函数体里根本不存在
 * → 组件一调用就 ReferenceError。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { freeIdentifiers } from './analyze.js';
import { compileSource } from './compile.js';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-scope-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

const scopeOf = (expression, bound = []) => [...freeIdentifiers(expression, new Set(bound))].sort();

describe('freeIdentifiers：只有真正的自由标识符进 scope', () => {
  it('属性名不是自由标识符（含可选链）', () => {
    expect(scopeOf('a.b.c')).toEqual(['a']);
    expect(scopeOf('a.b?.c')).toEqual(['a']);
    expect(scopeOf('a?.b?.(1)')).toEqual(['a']);
    expect(scopeOf('a[b]?.[c]')).toEqual(['a', 'b', 'c']);
  });

  it('对象键不是自由标识符（计算键才是）', () => {
    expect(scopeOf('({ x: 1, [y]: 2 })')).toEqual(['y']);
    expect(scopeOf('({ render() { return outer; } })')).toEqual(['outer']);
    expect(scopeOf('({ [key]: value })')).toEqual(['key', 'value']);
  });

  it('嵌套作用域的局部量与形参不是自由标识符', () => {
    expect(
      scopeOf('(items) => { const x = 1; return items.map((item) => item.key + x); }')
    ).toEqual([]);
    expect(scopeOf('({ a, b: c }) => a + c')).toEqual([]);
    expect(scopeOf('([first, ...rest]) => first + rest.length')).toEqual([]);
    expect(scopeOf('(a = fallback) => a')).toEqual(['fallback']);
    expect(scopeOf('() => { function helper() {} return helper(); }')).toEqual([]);
    expect(scopeOf('() => { try { work(); } catch (error) { report(error); } }')).toEqual([
      'report',
      'work'
    ]);
  });

  it('真正的自由标识符照旧收进来（回归）', () => {
    expect(scopeOf('items.map((item) => pick(item, config))')).toEqual(['config', 'items', 'pick']);
    expect(scopeOf('props.label', ['props'])).toEqual([]);
    expect(scopeOf('String(value)', ['value'])).toEqual([]);
  });
});

describe('编译产物：回调里的可选链 / 局部量不再炸', () => {
  const source = [
    "import { div, vText } from '../../src/yoya.core.js';",
    '',
    'export function Row(props) {',
    '  return div((root) => {',
    "    root.className('row');",
    "    root.attr('data-key', props.key);",
    '    root.child(vText(props.label));',
    "    root.on('click', (event) => {",
    "      const target = event.target?.closest?.('.row');",
    '      if (target) {',
    "        props.pick(target.getAttribute('data-key'));",
    '      }',
    '    });',
    '  });',
    '}',
    ''
  ].join('\n');

  const compileWith = (mode) => {
    const file = join(workDir, 'row.js');
    writeFileSync(file, source, 'utf8');
    return compileSource({ source, file, fn: 'Row', mode, core, runtime: runtimeUrl });
  };

  it('scope 里没有属性名 / 回调局部量', () => {
    for (const mode of ['element', 'node']) {
      const result = compileWith(mode);
      expect(result.bails, mode).toEqual([]);
      expect(result.compiled, mode).toBe(true);
      expect(result.scope, mode).toEqual([]);
    }
  });

  it('产物与通用路径点击行为一致（回调真的被执行）', async () => {
    const file = join(workDir, 'row-wired.js');
    writeFileSync(file, source, 'utf8');
    const units = componentUnits(source, { core, file });
    const wired = wireComponentModule({ source, targets: units, core, runtime: runtimeUrl });
    expect(wired, '插件没有编出产物').not.toBeNull();
    // 替换点的 scope 对象字面量必须是空的：回调里的属性名 / 局部量都不该出现在这里
    expect(wired.code).toMatch(/__yoyaCreateRowFactory_0\(\{\s*\}\)/);

    // 产物落盘 → 真实 import
    const replacements = new Map();
    wired.units.forEach((unit, index) => {
      const path = join(workDir, `row.unit${index}.js`);
      replacements.set(JSON.stringify(unit.virtual), JSON.stringify(pathToFileURL(path).href));
    });
    const rewrite = (text) => {
      let out = text;
      replacements.forEach((to, from) => {
        out = out.replaceAll(from, to);
      });
      return out;
    };
    wired.units.forEach((unit, index) => {
      writeFileSync(join(workDir, `row.unit${index}.js`), rewrite(unit.module), 'utf8');
    });
    const wiredPath = join(workDir, 'row.wired.js');
    writeFileSync(wiredPath, rewrite(wired.code), 'utf8');

    const generic = await import(pathToFileURL(file).href);
    const compiled = await import(pathToFileURL(wiredPath).href);

    const clicks = [];
    const props = () => ({ key: 'k1', label: '第一行', pick: (key) => clicks.push(key) });
    const genericNode = generic.Row(props());
    const compiledNode = compiled.Row(props());
    const genericEl = genericNode.renderDom();
    const compiledEl = compiledNode.renderDom();

    [genericEl, compiledEl].forEach((element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(clicks).toEqual(['k1', 'k1']);
  });
});
