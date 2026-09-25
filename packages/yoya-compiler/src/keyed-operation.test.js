/**
 * 票 03（compiler-landing）：`keyed` 作为操作——组件**内部**的列表也能编。
 *
 * 行工厂作为子单元编译（产物形态与普通行单元一致）；元素通道走「列表对账 + 订阅 + 统一摆放」
 * （`keyedRows` / `mountableAt`），节点通道复用节点自己的 `keyed` / `mountable`。
 * 两条通道的 DOM 都必须与通用路径逐帧一致，行工厂认不出形状时整形状回落。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { compileSource } from './compile.js';
import { componentUnits, wireComponentModule } from './plugin.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-keyed-op-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;

const source = [
  "import { div, li, ul, vText } from '@yoyaflow/yoya-core';",
  '',
  'export function Rows(props) {',
  '  return div((root) => {',
  "    root.className('rows');",
  '    root.ul((list) => {',
  "      list.className('rows-list');",
  '      list.keyed(',
  '        props.rows,',
  '        (row) => row.id,',
  '        (row) =>',
  '          li((line) => {',
  "            line.className('rows-item');",
  "            line.attr('data-id', String(row.id));",
  '            line.mountable(row.visible);',
  '            line.child(vText(row.label));',
  '          })',
  '      );',
  '    });',
  '  });',
  '}',
  ''
].join('\n');

const fileOf = (name) => join(workDir, name);

/** 虚拟模块路径 → 落盘路径：改写所有产物（模块之间也会互相 import 虚拟路径）。 */
const writeModules = (entries) => {
  const replacements = new Map();
  entries.forEach((entry, index) => {
    const path = fileOf(`${entry.name}.generated-${index}.js`);
    replacements.set(JSON.stringify(entry.virtual), JSON.stringify(pathToFileURL(path).href));
  });
  const rewrite = (text) => {
    let out = text;
    replacements.forEach((to, from) => {
      out = out.replaceAll(from, to);
    });
    return out;
  };
  return entries.map((entry, index) => {
    const path = fileOf(`${entry.name}.generated-${index}.js`);
    writeFileSync(path, rewrite(entry.module), 'utf8');
    return path;
  });
};

/** 插件路径：自动发现单元（`mode` 是库内逃生口，默认按用法推断节点 / 元素通道）。 */
const setupPlugin = async (name, mode = null) => {
  const file = fileOf(`${name}.js`);
  writeFileSync(file, source, 'utf8');
  const targets = mode
    ? [{ component: 'Rows', file, mode, thin: false, templatesOnly: false }]
    : componentUnits(source, { core, file });
  const wired = wireComponentModule({ source, targets, core, runtime: runtimeUrl });
  expect(wired, 'keyed 形状应该能编').not.toBeNull();

  const paths = writeModules(
    wired.units.map((unit, index) => ({
      name: `${name}.unit${index}`,
      virtual: unit.virtual,
      module: unit.module
    }))
  );
  const wiredPath = fileOf(`${name}.wired.js`);
  const rewrite = (text) =>
    paths.reduce((out, path, index) => {
      const from = JSON.stringify(wired.units[index].virtual);
      return out.replaceAll(from, JSON.stringify(pathToFileURL(path).href));
    }, text);
  writeFileSync(wiredPath, rewrite(wired.code), 'utf8');
  return {
    compiled: await import(pathToFileURL(wiredPath).href),
    generic: await import(pathToFileURL(file).href),
    units: wired.units.length
  };
};

/** CLI 路径：直接编一份源码（行子单元自己落盘）。 */
const setupCompiled = async (name, mode) => {
  const file = fileOf(`${name}.js`);
  writeFileSync(file, source, 'utf8');
  const result = compileSource({
    source,
    file,
    fn: 'Rows',
    mode,
    core,
    runtime: runtimeUrl,
    rowSpecifier: (index) => `\0yoya-row:${name}-row${index}`
  });
  expect(result.bails).toEqual([]);
  expect(result.compiled).toBe(true);

  const paths = writeModules([
    { name, virtual: `\0yoya-row:${name}`, module: result.module },
    ...(result.rows ?? []).map((row, index) => ({
      name: `${name}-row${index}`,
      virtual: `\0yoya-row:${name}-row${index}`,
      module: row.module
    }))
  ]);
  return {
    compiled: await import(pathToFileURL(paths[0]).href),
    generic: await import(pathToFileURL(file).href),
    result
  };
};

/**
 * DOM 签名：属性按名排序后比较。
 *
 * 现有的**预存差异**：片段的属性顺序来自 `toHTML()`（类名按名排序落在中间），而通用路径的
 * `renderDom()` 先按名写属性快照、最后写类名——同一个元素同时有静态类名与属性时，属性**顺序**
 * 不同（属性集合与取值一致）。属性顺序不影响 DOM 语义（选择器 / CSS / 取值都一样），但会让
 * `outerHTML` 的字节不同；这条差异在两条通道上都早已存在，不属于票 03（见票 08）。
 */
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

describe('组件内部的 keyed 列表（票 03）', () => {
  it('节点通道：换序 / 增删 / 清空 / 行条件挂载，DOM 与通用路径逐帧一致', async () => {
    const { compiled, generic, units } = await setupPlugin('rows-node');
    expect(units).toBeGreaterThanOrEqual(2); // 主模块 + 行子单元

    const rows = core.ref(refRows());
    const props = () => ({ rows });
    const compiledEl = compiled.Rows(props()).renderDom();
    const genericEl = generic.Rows(props()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.rows-item')].map((el) => el.textContent)).toEqual([
      'one',
      'two'
    ]);

    // 换序 + 新增
    rows.value = [
      { id: 2, label: core.ref('two'), visible: core.ref(true) },
      { id: 3, label: core.ref('three'), visible: core.ref(true) }
    ];
    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.rows-item')].map((el) => el.textContent)).toEqual([
      'two',
      'three'
    ]);

    // 行条件挂载：行离场，再回场（位置必须回到原位）
    rows.value[0].visible.value = false;
    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.rows-item')].map((el) => el.textContent)).toEqual([
      'three'
    ]);

    rows.value[0].visible.value = true;
    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.rows-item')].map((el) => el.textContent)).toEqual([
      'two',
      'three'
    ]);

    // 活文本 + 删除 + 清空
    rows.value[1].label.value = 'three!';
    expect(signature(compiledEl)).toBe(signature(genericEl));

    rows.value = [rows.value[0]];
    expect(signature(compiledEl)).toBe(signature(genericEl));

    rows.value = [];
    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect(compiledEl.querySelectorAll('.rows-item').length).toBe(0);
  });

  it('元素通道：对账 + 订阅 + 行条件挂载位置与通用路径逐帧一致', async () => {
    const { compiled, generic, result } = await setupCompiled('rows-element', 'element');
    expect(result.module).toContain('keyedRows(');
    expect(result.rows[0].module).toContain('mountableAt(');

    const rows = core.ref(refRows());
    const props = () => ({ rows });
    const compiledEl = compiled.createRowFactory({})(props()).el;
    const genericEl = generic.Rows(props()).renderDom();

    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.rows-item')].map((el) => el.textContent)).toEqual([
      'one',
      'two'
    ]);
    // 键镜像与通用路径（节点行）同一条规则：字符串 / 数字键写 `data-row-key`
    expect(compiledEl.querySelector('.rows-item').getAttribute('data-row-key')).toBe('1');
    expect(genericEl.querySelector('.rows-item').getAttribute('data-row-key')).toBe('1');

    rows.value = [
      { id: 2, label: core.ref('two'), visible: core.ref(true) },
      { id: 3, label: core.ref('three'), visible: core.ref(true) }
    ];
    expect(signature(compiledEl)).toBe(signature(genericEl));

    rows.value[0].visible.value = false;
    expect(signature(compiledEl)).toBe(signature(genericEl));
    rows.value[0].visible.value = true;
    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect([...compiledEl.querySelectorAll('.rows-item')].map((el) => el.textContent)).toEqual([
      'two',
      'three'
    ]);

    rows.value[1].label.value = 'three!';
    expect(signature(compiledEl)).toBe(signature(genericEl));

    rows.value = [];
    expect(signature(compiledEl)).toBe(signature(genericEl));
    expect(compiledEl.querySelectorAll('.rows-item').length).toBe(0);
  });

  it('行工厂认不出形状 → 整形状回落，绝不半编', () => {
    const cases = [
      {
        name: '行工厂体里还有别的语句',
        row: [
          '        (row) => {',
          '          const label = String(row.label);',
          '          return li((line) => line.child(vText(label)));',
          '        }'
        ]
      },
      {
        name: '行工厂有第二个形参（index）',
        row: [
          '        (row, index) =>',
          "          li((line) => line.attr('data-index', String(index)))"
        ]
      }
    ];
    cases.forEach(({ name, row }) => {
      const list = [
        "import { div, li, vText } from '@yoyaflow/yoya-core';",
        'export function Rows(props) {',
        '  return div((root) => {',
        '    root.ul((list) => {',
        '      list.keyed(',
        '        props.rows,',
        '        (row) => row.id,',
        ...row,
        '      );',
        '    });',
        '  });',
        '}',
        ''
      ].join('\n');
      const result = compileSource({
        source: list,
        file: fileOf('rows-bail.js'),
        fn: 'Rows',
        mode: 'node',
        core,
        runtime: runtimeUrl,
        rowSpecifier: (index) => `\0yoya-row:bail-row${index}`
      });
      expect(result.compiled, name).toBe(false);
      expect(result.module, name).toBeNull();
      expect(result.bails.map((bail) => bail.reason).join(' | '), name).toContain('keyed()');
    });
  });
});
