/**
 * 票 07（compiler-landing）：组件调用点链接——**同一个模块**里 `child(<组件>(…))` 能编。
 *
 * 插件把发现结果编成内存注册表；同一次构建、同一个模块的引用直接**内联**（片段就地嵌入 + 位置写，
 * 子组件体按形参帧求值），运行期零新增：不落注册表模块、不 import 业务模块、没有模块环。
 * 未命中 / 形状认不出 → 调用点原样保留，整形状回落通用路径。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-link-callsite-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

/** 一份中性业务源码：子组件被父组件引用两次，父组件里还有 keyed 列表 + 行内 mountable。 */
const source = [
  "import { computed, div, li, span, ul, vText } from '../../src/yoya.core.js';",
  '',
  'export function StatChip({ label, tone }) {',
  '  return span((chip) => {',
  "    chip.className('stat-chip');",
  "    chip.attr('data-tone', tone);",
  "    chip.attr('data-length', computed(() => label.value.length));",
  '    chip.child(vText(label));',
  '  });',
  '}',
  '',
  'export function Board(props) {',
  '  return div((root) => {',
  "    root.className('board');",
  '    root.div((head) => {',
  "      head.className('board-head');",
  "      head.child(StatChip({ label: props.title, tone: 'ok' }));",
  "      head.child(StatChip({ label: props.subtitle, tone: 'muted' }));",
  '    });',
  '    root.ul((list) => {',
  "      list.className('board-rows');",
  '      list.keyed(',
  '        props.rows,',
  '        (row) => row.id,',
  '        (row) =>',
  '          li((line) => {',
  "            line.className('board-row');",
  "            line.attr('data-id', String(row.id));",
  '            line.mountable(row.visible);',
  "            line.span((cell) => cell.className('board-label').child(vText(row.label)));",
  '          })',
  '      );',
  '    });',
  '  });',
  '}',
  ''
].join('\n');

const setup = async (label, code = source, options = {}) => {
  const file = join(workDir, `${label}.js`);
  writeFileSync(file, code, 'utf8');
  const targets = componentUnits(code, { core, file });
  const wired = wireComponentModule({ source: code, targets, core, runtime: runtimeUrl });
  if (!wired) {
    return { wired: null, generic: await import(pathToFileURL(file).href) };
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
    ...options
  };
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

const refRows = () => [
  { id: 1, label: core.ref('one'), visible: core.ref(true) },
  { id: 2, label: core.ref('two'), visible: core.ref(true) }
];

const props = (rows) => ({
  title: core.ref('head'),
  subtitle: core.ref('sub'),
  rows
});

describe('同一模块的组件调用点链接（票 07）', () => {
  it('父组件的链接产物内联子组件，DOM 与通用路径逐帧一致', async () => {
    const { wired, compiled, generic } = await setup('same-file');
    expect(wired, '同模块引用应该能编').not.toBeNull();

    // Board 是 node 通道（只被 child 调用），它的产物里子组件已经就地展开：
    // 不再有组件注册表 import，也没有运行期链接调用
    const boardUnit = wired.units.find((unit) => unit.module.includes('function Board'));
    expect(boardUnit).toBeTruthy();
    expect(boardUnit.module).not.toContain('bindComponent');

    const rows = core.ref(refRows());
    const compiledEl = compiled.Board(props(rows)).renderDom();
    const genericEl = generic.Board(props(rows)).renderDom();
    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.stat-chip')].map((el) => el.textContent)).toEqual([
      'head',
      'sub'
    ]);
    expect(compiledEl.querySelector('.stat-chip').getAttribute('data-length')).toBe('4');

    // 子组件的活值 / 活属性跟着走
    rows.value[0].label.value = 'one!';
    compiledEl.querySelectorAll('.board-label')[0].textContent;
    expect(signature(compiledEl)).toBe(signature(genericEl));

    // 行条件挂载 + 换序 + 清空
    rows.value[0].visible.value = false;
    expect(signature(compiledEl)).toBe(signature(genericEl));
    rows.value[0].visible.value = true;
    expect(signature(compiledEl)).toBe(signature(genericEl));
    rows.value = [rows.value[1]];
    expect(signature(compiledEl)).toBe(signature(genericEl));
    rows.value = [];
    expect(signature(compiledEl)).toBe(signature(genericEl));
  });

  it('子组件编不了 → 调用点原样保留（源码不动，走通用路径）', async () => {
    const broken = source.replace(
      "    chip.attr('data-tone', tone);",
      // 动态属性**名**：属性名必须是字符串字面量 → 这个子组件整形状编不出来（父调用点因此回落）
      "    chip.attr('data-tone', tone);\n    chip.attr(tone, 'nope');"
    );
    const { wired } = await setup('broken-child', broken);
    // 子组件形状认不出 → 不进注册表；父组件因此也整形状回落（源码原样）
    expect(wired).toBeNull();
  });

  it('组件内部有 keyed 行子单元时，调用点本轮不内联（回落通用路径）', async () => {
    const nested = [
      "import { div, li, span, vText } from '../../src/yoya.core.js';",
      '',
      'export function Inner(props) {',
      '  return span((root) => {',
      "    root.className('inner');",
      '    root.ul((list) => {',
      '      list.keyed(props.rows, (row) => row.id, (row) => li((line) => line.child(vText(row.label))));',
      '    });',
      '  });',
      '}',
      '',
      'export function Outer(props) {',
      '  return div((root) => {',
      "    root.className('outer');",
      '    root.child(Inner(props));',
      '  });',
      '}',
      ''
    ].join('\n');
    const { wired } = await setup('nested-rows', nested);
    // Inner 自己还能编（组件内 keyed 是票 03 的能力），但它带行子单元 → 不进注册表；
    // 于是 Outer 的调用点原样保留（整形状回落通用路径），不产半成品
    expect(wired).not.toBeNull();
    expect(wired.code).toContain('root.child(Inner(props));');
    expect(wired.units.some((unit) => unit.module.includes('function Inner'))).toBe(true);
  });
});
