/**
 * 票 15：同模块内联的两条安全线。
 *
 * ① 形参帧撞名：`Card(props)` 里内联 `Badge(props)` 时，产物把子组件形参绑成
 *    `const [props] = [props];`——遮蔽了自己的初始化器 → 运行期 `ReferenceError`。
 * ② 组件包装：子组件是 vNode / 形态 B（产物带 ComponentNode 包装）时，摊平成裸元素会丢
 *    命令面与 `whenMount`（DOM 却逐字节一致，属于静默半成品）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-inline-safety-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;

const setup = async (label, code) => {
  const file = join(workDir, `${label}.js`);
  writeFileSync(file, code, 'utf8');
  const targets = componentUnits(code, { core, file });
  const wired = wireComponentModule({ source: code, targets, core, runtime: runtimeUrl });
  const generic = await import(pathToFileURL(file).href);
  if (!wired) {
    return { wired: null, generic, compiled: generic };
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
  return { wired, generic, compiled: await import(pathToFileURL(wiredPath).href) };
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

/** 薄工厂（形态 A）子组件，形参名与调用方撞车。 */
const thinSource = [
  "import { div, span, vText } from '@yoyaflow/yoya-core';",
  '',
  'export function Badge(props) {',
  "  return span((tag) => tag.className('badge').child(vText(props.label)));",
  '}',
  '',
  'export function Card(props) {',
  '  return div((root) => {',
  "    root.className('card');",
  '    root.child(Badge(props));',
  '  });',
  '}',
  ''
].join('\n');

/** vNode 子组件：带命令 + 挂载钩子（产物是 ComponentNode，不是裸元素）。 */
const wrapperSource = [
  "import { div, span, vNode, vText } from '@yoyaflow/yoya-core';",
  '',
  'export function Badge(item) {',
  '  return vNode((api) => {',
  '    api.text = () => item.label;',
  '    api.whenMount = (host) => host.element().setAttribute("data-mounted", "yes");',
  "    return span((tag) => tag.className('badge').child(vText(item.label)));",
  '  });',
  '}',
  '',
  'export function Card(props) {',
  '  return div((root) => {',
  "    root.className('card');",
  '    root.child(Badge(props));',
  '  });',
  '}',
  ''
].join('\n');

/** vNode 子组件当 keyed 行：行工厂是组件调用，不能摊平（命令要跟着行走）。 */
const keyedSource = [
  "import { li, ul, vNode, vText } from '@yoyaflow/yoya-core';",
  '',
  'export function Row(item) {',
  '  return vNode((api) => {',
  '    api.label = () => item.label;',
  '    return li((line) => {',
  "      line.className('row');",
  '      line.child(vText(item.label));',
  '    });',
  '  });',
  '}',
  '',
  'export function List(props) {',
  '  return ul((list) => {',
  "    list.className('list');",
  '    list.keyed(',
  '      props.rows,',
  '      (row) => row.id,',
  '      (row) => Row(row)',
  '    );',
  '  });',
  '}',
  ''
].join('\n');

describe('同模块内联的安全线（票 15）', () => {
  it('形参帧与调用方同名时不炸，DOM 与通用路径一致', async () => {
    const { wired, generic, compiled } = await setup('thin-collide', thinSource);
    expect(wired, '薄工厂仍然要能编').not.toBeNull();

    const genericEl = generic.Card({ label: core.ref('标签') }).renderDom();
    let compiledEl = null;
    expect(() => {
      compiledEl = compiled.Card({ label: core.ref('标签') }).renderDom();
    }).not.toThrow();
    expect(signature(compiledEl)).toBe(signature(genericEl));
  });

  it('子组件是组件节点时不被摊平：命令与 whenMount 都还在', async () => {
    const { wired, generic, compiled } = await setup('wrapper', wrapperSource);
    expect(wired, '父组件仍然要能编（子组件走运行期调用，不是摊平）').not.toBeNull();

    const app = document.createElement('div');
    document.body.appendChild(app);
    const label = core.ref('标签');
    const genericCard = generic.Card({ label });
    genericCard.bindTo(app);
    const genericEl = app.firstElementChild;
    const genericChild = genericCard.children()[0];

    app.replaceChildren();
    const compiledCard = compiled.Card({ label });
    compiledCard.bindTo(app);
    const compiledEl = app.firstElementChild;
    const compiledChild = compiledCard.children()[0];

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect(compiledChild?.constructor?.name).toBe(genericChild?.constructor?.name);
    expect(typeof compiledChild.text).toBe('function');
    expect(compiledChild.text()).toBe(genericChild.text());
    expect(app.querySelector('.badge').getAttribute('data-mounted')).toBe('yes');
    compiledCard.destroy();
    genericCard.destroy();
    app.remove();
  });

  it('keyed 行里是组件节点时同样不摊平（命令跟着行走）', async () => {
    const { wired, generic, compiled } = await setup('keyed-wrapper', keyedSource);
    const data = () => [
      { id: 1, label: '一' },
      { id: 2, label: '二' }
    ];
    const genericRows = core.ref(data());
    const compiledRows = core.ref(data());

    const genericEl = generic.List({ rows: genericRows }).renderDom();
    const compiledEl = compiled.List({ rows: compiledRows }).renderDom();
    expect(signature(compiledEl)).toBe(signature(genericEl));

    // 行节点必须还是组件节点：命令跟着行走（摊平的话这里就没有 label()）
    if (wired) {
      const app = document.createElement('div');
      document.body.appendChild(app);
      const list = compiled.List({ rows: compiledRows });
      list.bindTo(app);
      const row = list.children()[0];
      expect(typeof row?.label).toBe('function');
      expect(row.label()).toBe('一');
      list.destroy();
      app.remove();
    }
  });
});
