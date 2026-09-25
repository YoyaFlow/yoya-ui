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
import * as core from '@yoyaflow/yoya-core';
import { compileSource } from './compile.js';
import { componentUnits, wireComponentModule } from './plugin.js';
import { buildComponentRegistry } from './registry.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-anchors-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;

const source = [
  "import { div, li, span, ul, vText } from '@yoyaflow/yoya-core';",
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

  it('条件 / 循环里的 child(…) 当洞：语句原样在产物节点上跑，新加的子节点按边界摆回', async () => {
    const code = [
      "import { div, span, vText } from '@yoyaflow/yoya-core';",
      '',
      'export function Cascade(props) {',
      '  return div((root) => {',
      "    root.className('cascade');",
      "    root.span((head) => head.className('head').child('head'));",
      '    if (props.extra) {',
      '      root.child(props.extra);',
      '    }',
      '    for (const item of props.items) {',
      '      root.child(item);',
      '    }',
      "    root.span((tail) => tail.className('tail').child(vText(props.tail)));",
      '  });',
      '}',
      ''
    ].join('\n');
    const { wired, compiled, generic } = await setup('cascade', code);
    expect(wired, '条件里的 child(…) 应该能编').not.toBeNull();
    // 产物里是"原样跑这条调用 + 按边界摆位"，不是静默丢
    expect(wired.units[0].module).toContain('mountRuntimeChildrenFrom');
    expect(wired.units[0].module).toContain('node.child(props.extra)');

    const propsWithExtra = () => ({
      extra: core.strong('加'),
      items: ['一', '二'],
      tail: core.ref('尾')
    });
    const compiledEl = compiled.Cascade(propsWithExtra()).renderDom();
    const genericEl = generic.Cascade(propsWithExtra()).renderDom();
    expect(signature(compiledEl)).toBe(signature(genericEl));
    // 位置：head → extra（节点）→ 循环里的两段文本 → tail（静态兄弟在后面，边界要对）
    expect([...compiledEl.children].map((el) => el.tagName)).toEqual(['SPAN', 'STRONG', 'SPAN']);
    expect(compiledEl.textContent).toBe('head加一二尾');

    // 条件为假 + 空列表：只剩两个静态兄弟
    const propsBare = () => ({ extra: null, items: [], tail: core.ref('尾') });
    expect(signature(compiled.Cascade(propsBare()).renderDom())).toBe(
      signature(generic.Cascade(propsBare()).renderDom())
    );
    expect(compiled.Cascade(propsBare()).renderDom().textContent).toBe('head尾');
  });

  it('控制流里的节点句柄名换成产物句柄（`if (body.attr(…))` 这类头部读）', async () => {
    const code = [
      "import { div, section, vText } from '@yoyaflow/yoya-core';",
      '',
      'export function Panel(props) {',
      '  return div((root) => {',
      "    root.className('nested-handle');",
      '    root.section((body) => {',
      "      body.attr('data-mode', props.mode);",
      "      if (body.attr('data-mode') !== undefined) {",
      '        body.child(vText(props.label));',
      '      }',
      '    });',
      '  });',
      '}',
      ''
    ].join('\n');
    const { wired, compiled, generic } = await setup('nested-handle', code);
    expect(wired, '嵌套结构里读句柄的控制流应该能编').not.toBeNull();
    // 语句是原样搬的，但里面的句柄名已经换成产物句柄 `node`
    const module = wired.units[0].module;
    // 头部那句（原样搬）里的句柄名换成了 `node`；写属性那句走 op，本来就是 `node.attr(…)`
    expect(module).toContain("if (node.attr('data-mode') !== undefined)");
    expect(module).not.toContain('body.attr(');
    expect(module).not.toContain('body.');
    expect(module).toContain('data-mode');

    const props = () => ({ mode: 'clip', label: core.ref('标签') });
    expect(signature(compiled.Panel(props()).renderDom())).toBe(
      signature(generic.Panel(props()).renderDom())
    );
  });

  it('发现为 element 的行工厂要求节点产物 → 不接线（回落通用路径）', async () => {
    const code = [
      "import { ref, tbody, tr, vText } from '@yoyaflow/yoya-core';",
      '',
      'const rows = ref([]);',
      '',
      'export function Table() {',
      '  return tbody((body) => body.keyed(rows, Row));',
      '}',
      '',
      'export function Row(data) {',
      '  return tr((line) => {',
      '    if (data.extra) {',
      '      line.child(data.extra);',
      '    }',
      '    line.td((cell) => cell.child(vText(data.label)));',
      '  });',
      '}',
      ''
    ].join('\n');
    const file = join(workDir, 'keyed-child.js');
    writeFileSync(file, code, 'utf8');
    const units = componentUnits(code, { core, file });
    const row = units.find((unit) => unit.component === 'Row');
    expect(row.mode).toBe('element');

    // element 行交回给 `keyedRows` 的必须是 `{ el, … }`；要求节点产物的形状 → 整形状回落
    const wiredRow = wireComponentModule({
      source: code,
      targets: [row],
      core,
      runtime: runtimeUrl
    });
    expect(wiredRow, '行工厂不该被接成节点产物').toBeNull();

    // 反向对照：同样声明成 element 的行工厂，只要不要求节点产物就照旧接线
    const plain = code.replace('    if (data.extra) {\n      line.child(data.extra);\n    }\n', '');
    const plainFile = join(workDir, 'keyed-plain.js');
    writeFileSync(plainFile, plain, 'utf8');
    const plainRow = componentUnits(plain, { core, file: plainFile }).find(
      (unit) => unit.component === 'Row'
    );
    expect(plainRow.mode).toBe('element');
    const wiredPlain = wireComponentModule({
      source: plain,
      targets: [plainRow],
      core,
      runtime: runtimeUrl
    });
    expect(wiredPlain, '普通 element 行仍然要接线').not.toBeNull();
  });

  it('逻辑帧与位置写按源码顺序交织（改局部量 → 后续写读到新值）', async () => {
    const code = [
      "import { div } from '@yoyaflow/yoya-core';",
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
      "import { div, li, ul, vText } from '@yoyaflow/yoya-core';",
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
      "import { div, li, span, vText } from '@yoyaflow/yoya-core';",
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
      "import { div, span, vText } from '@yoyaflow/yoya-core';",
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
        "import { span, vText } from '@yoyaflow/yoya-core';",
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
      "import { div } from '@yoyaflow/yoya-core';",
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
