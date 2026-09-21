/**
 * 票 04 的第二刀：**结构锚点**——`if` / `for…of` 里的结构能编。
 *
 * 机制：那段结构提升成**子单元**（独立产物模块），父片段里什么都不留；语句本身原样搬进产物，
 * 结构语句的位置换成「实例化子单元 + 插到边界之前」——边界是片段里它后面的那个兄弟，
 * 所以 DOM 一个字节都不多。语句原样执行 ⇒ 逻辑帧与位置写按源码顺序**天然交织**。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compileSource } from './compile.js';
import { componentUnits, wireComponentModule } from './plugin.js';
import { buildComponentRegistry } from './registry.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-anchors-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

const source = [
  "import { div, li, span, ul, vText } from '../../src/yoya.core.js';",
  '',
  'export function Panel(props) {',
  '  return div((root) => {',
  "    root.className('panel');",
  "    root.span((head) => head.className('head').child(vText(props.title)));",
  '    if (props.dense) {',
  "      root.div((dense) => dense.className('dense').child('dense'));",
  '    } else {',
  "      root.div((loose) => loose.className('loose').child('loose'));",
  '    }',
  '    for (const item of props.items) {',
  '      root.div((line) => {',
  "        line.className('item');",
  "        line.attr('data-id', String(item.id));",
  '        line.child(vText(item.label));',
  '      });',
  '    }',
  "    root.span((tail) => tail.className('tail').child('tail'));",
  '  });',
  '}',
  ''
].join('\n');

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

const propsOf = (dense) => ({
  title: core.ref('head'),
  dense,
  items: [
    { id: 1, label: core.ref('one') },
    { id: 2, label: core.ref('two') }
  ]
});

describe('if / for…of 里的结构锚点（票 04）', () => {
  it('两条通道都与通用路径逐帧一致，结构落在片段里的正确位置', async () => {
    for (const mode of ['element', 'node']) {
      const { wired, compiled, generic } = await setup(`panel-${mode}`, source, mode);
      expect(wired, mode).not.toBeNull();
      // 父产物里没有那两段结构（它们进了子单元），有实例化与插回
      expect(wired.units.length, mode).toBeGreaterThanOrEqual(3); // 父 + 两个锚点子单元

      const denseProps = propsOf(true);
      const denseProduct = compiled.Panel(denseProps);
      const compiledEl = mode === 'element' ? denseProduct.el : denseProduct.renderDom();
      const genericEl = generic.Panel(propsOf(true)).renderDom();

      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      // 顺序：head → dense → item ×2 → tail（锚点边界正确）
      expect(
        [...compiledEl.children].map((el) => el.className),
        mode
      ).toEqual(['head', 'dense', 'item', 'item', 'tail']);

      // 另一条分支
      const looseProps = propsOf(false);
      const looseProduct = compiled.Panel(looseProps);
      const looseEl = mode === 'element' ? looseProduct.el : looseProduct.renderDom();
      const genericLoose = generic.Panel(propsOf(false)).renderDom();
      expect(signature(looseEl), mode).toBe(signature(genericLoose));
      expect(signature(looseEl), mode).toContain('loose');

      // 空列表：循环体一次都不执行
      const emptyProps = { ...propsOf(true), items: [] };
      const emptyProduct = compiled.Panel(emptyProps);
      const emptyEl = mode === 'element' ? emptyProduct.el : emptyProduct.renderDom();
      const genericEmpty = generic.Panel({ ...propsOf(true), items: [] }).renderDom();
      expect(signature(emptyEl), mode).toBe(signature(genericEmpty));
      expect(
        [...emptyEl.children].map((el) => el.className),
        mode
      ).toEqual(['head', 'dense', 'tail']);
    }
  });

  it('逻辑帧与位置写按源码顺序交织（改局部量 → 后续写读到新值）', async () => {
    const code = [
      "import { div } from '../../src/yoya.core.js';",
      '',
      'export function Counter(props) {',
      '  return div((root) => {',
      '    let count = props.start;',
      '    root.attr("data-before", String(count));',
      '    count = count + 1;',
      '    root.attr("data-after", String(count));',
      '  });',
      '}',
      ''
    ].join('\n');
    const file = join(workDir, 'counter.js');
    writeFileSync(file, code, 'utf8');
    const generic = await import(pathToFileURL(file).href);
    const genericEl = generic.Counter({ start: 4 }).renderDom();
    expect(genericEl.getAttribute('data-before')).toBe('4');
    expect(genericEl.getAttribute('data-after')).toBe('5');

    const compiled = compileSource({
      source: code,
      file,
      fn: 'Counter',
      mode: 'element',
      core,
      runtime: runtimeUrl
    });
    expect(compiled.bails).toEqual([]);
    const path = join(workDir, 'counter.generated.js');
    writeFileSync(path, compiled.module, 'utf8');
    const generated = await import(pathToFileURL(path).href);
    const el = generated.createRowFactory({})({ start: 4 }).el;
    expect(el.getAttribute('data-before')).toBe('4');
    expect(el.getAttribute('data-after')).toBe('5');
  });

  it('嵌套 setup 里的循环同样能编（结构出现在任意一层）', async () => {
    const code = [
      "import { div, li, ul, vText } from '../../src/yoya.core.js';",
      '',
      'export function ItemList(props) {',
      '  return div((root) => {',
      "    root.className('list');",
      '    root.ul((list) => {',
      "      list.className('items');",
      '      for (const item of props.items) {',
      '        list.li((line) => {',
      "          line.className('item');",
      "          line.attr('data-id', String(item.id));",
      '          line.child(vText(item.label));',
      '        });',
      '      }',
      '    });',
      '  });',
      '}',
      ''
    ].join('\n');

    for (const mode of ['element', 'node']) {
      const { wired, compiled, generic } = await setup(`nested-${mode}`, code, mode, 'ItemList');
      expect(wired, mode).not.toBeNull();
      const props = () => ({
        items: [
          { id: 1, label: core.ref('one') },
          { id: 2, label: core.ref('two') }
        ]
      });
      const product = compiled.ItemList(props());
      const compiledEl = mode === 'element' ? product.el : product.renderDom();
      const genericEl = generic.ItemList(props()).renderDom();

      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      expect(
        [...compiledEl.querySelectorAll('.item')].map((el) => el.textContent),
        mode
      ).toEqual(['one', 'two']);
    }
  });

  it('`array.forEach((item) => { <结构> })` 与控制流同一套机制', async () => {
    const code = [
      "import { div, li, span, vText } from '../../src/yoya.core.js';",
      '',
      'export function Rows(props) {',
      '  return div((root) => {',
      "    root.className('rows');",
      "    root.span((head) => head.className('head').child(props.title));",
      '    props.items.forEach((item, index) => {',
      '      root.li((line) => {',
      "        line.className('row');",
      "        line.attr('data-index', String(index));",
      '        line.child(vText(item.label));',
      '      });',
      '    });',
      "    root.span((tail) => tail.className('tail').child('tail'));",
      '  });',
      '}',
      ''
    ].join('\n');

    for (const mode of ['element', 'node']) {
      const { wired, compiled, generic } = await setup(`foreach-${mode}`, code, mode, 'Rows');
      expect(wired, mode).not.toBeNull();
      const props = () => ({
        title: 'head',
        items: [
          { label: core.ref('one') },
          { label: core.ref('two') },
          { label: core.ref('three') }
        ]
      });
      const product = compiled.Rows(props());
      const compiledEl = mode === 'element' ? product.el : product.renderDom();
      const genericEl = generic.Rows(props()).renderDom();

      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      expect(
        [...compiledEl.querySelectorAll('.row')].map((el) => el.getAttribute('data-index')),
        mode
      ).toEqual(['0', '1', '2']);
      expect(
        [...compiledEl.children].map((el) => el.className),
        mode
      ).toEqual(['head', 'row', 'row', 'row', 'tail']);
    }
  });

  it('表达式体回调与数组字面量接收者：`[ … ].forEach(([a, b]) => <结构>)`', async () => {
    const code = [
      "import { div, span, vText } from '../../src/yoya.core.js';",
      '',
      'export function Grouped(props) {',
      '  return div((root) => {',
      "    root.className('grouped');",
      '    props.groups.forEach((group) =>',
      '      root.section((part) => {',
      "        part.className('group');",
      '        part.child(vText(group.label));',
      '      })',
      '    );',
      '    [',
      "      ['a', 'A'],",
      "      ['b', 'B']",
      '    ].forEach(([name, purpose]) => {',
      "      root.span((cell) => cell.className('api').attr('data-name', name).child(purpose));",
      '    });',
      "    root.span((tail) => tail.className('tail').child('tail'));",
      '  });',
      '}',
      ''
    ].join('\n');

    for (const mode of ['element', 'node']) {
      const { wired, compiled, generic } = await setup(`grouped-${mode}`, code, mode, 'Grouped');
      expect(wired, mode).not.toBeNull();
      const props = () => ({ groups: [{ label: core.ref('g1') }, { label: core.ref('g2') }] });
      const product = compiled.Grouped(props());
      const compiledEl = mode === 'element' ? product.el : product.renderDom();
      const genericEl = generic.Grouped(props()).renderDom();

      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      expect(
        [...compiledEl.children].map((el) => el.className),
        mode
      ).toEqual(['group', 'group', 'api', 'api', 'tail']);
      expect(
        [...compiledEl.querySelectorAll('.api')].map((el) => el.getAttribute('data-name')),
        mode
      ).toEqual(['a', 'b']);
    }
  });

  it('锚点里的组件调用：注册表条目带 bind/plan 时才编（按注册表实例化）', async () => {
    // 被引用的叶子组件走**文件注册表**（票 41 那条路：条目带 bind + plan）
    const leafFile = join(workDir, 'chip-leaf.js');
    writeFileSync(
      leafFile,
      [
        "import { span, vText } from '../../src/yoya.core.js';",
        '',
        'export function Chip(props) {',
        '  return span((chip) => {',
        "    chip.className('chip');",
        '    chip.child(vText(props.label));',
        '  });',
        '}',
        ''
      ].join('\n'),
      'utf8'
    );
    const registryDir = join(workDir, 'chips');
    const built = buildComponentRegistry({
      // 注册表键按**项目相对路径**算：这里与调用方的标签（同样是 cwd 相对）对齐
      entries: [{ file: relative(process.cwd(), leafFile).replaceAll('\\', '/'), export: 'Chip' }],
      dir: registryDir,
      core,
      runtime: runtimeUrl
    });
    expect(built.skipped).toEqual([]);

    const code = [
      "import { div } from '../../src/yoya.core.js';",
      "import { Chip } from './chip-leaf.js';",
      '',
      'export function ChipList(props) {',
      '  return div((root) => {',
      "    root.className('chips');",
      '    props.items.forEach((item) => {',
      '      root.child(Chip({ label: item.label }));',
      '    });',
      '  });',
      '}',
      ''
    ].join('\n');

    for (const mode of ['element', 'node']) {
      const file = join(workDir, `chip-list-${mode}.js`);
      writeFileSync(file, code, 'utf8');
      const result = compileSource({
        source: code,
        file,
        fn: 'ChipList',
        mode,
        core,
        runtime: runtimeUrl,
        components: built.registry,
        componentsSpecifier: pathToFileURL(join(registryDir, 'components.registry.js')).href,
        controlSpecifier: (index) => `\0yoya-scan:ctl${index}`
      });
      expect(result.bails, mode).toEqual([]);

      const path = join(workDir, `chip-list-${mode}.generated.js`);
      writeFileSync(path, result.module, 'utf8');
      const module = await import(pathToFileURL(path).href);
      const props = () => ({ items: [{ label: core.ref('一') }, { label: core.ref('二') }] });
      const product = module.createRowFactory({})(props());
      const el = mode === 'element' ? product.el : product.renderDom();
      expect(
        [...el.querySelectorAll('.chip')].map((node) => node.textContent),
        mode
      ).toEqual(['一', '二']);
    }
  });

  it('认不准的条件写 / 块里嵌控制流回落（不产半成品）', () => {
    const cases = {
      条件里的非结构写: source.replace(
        "      root.div((dense) => dense.className('dense').child('dense'));",
        "      root.className('dense');"
      ),
      块里嵌控制流: source.replace(
        "      root.div((loose) => loose.className('loose').child('loose'));",
        '      if (props.other) {\n        root.div((extra) => extra.className("extra"));\n      }'
      )
    };
    Object.entries(cases).forEach(([name, code]) => {
      const file = join(workDir, 'panel-bail.js');
      writeFileSync(file, code, 'utf8');
      const result = compileSource({
        source: code,
        file,
        fn: 'Panel',
        mode: 'element',
        core,
        runtime: runtimeUrl,
        controlSpecifier: (index) => `\0yoya-row:ctl${index}`
      });
      expect(result.compiled, name).toBe(false);
      expect(result.module, name).toBeNull();
    });
  });
});
