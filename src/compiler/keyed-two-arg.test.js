/**
 * 两参形式 `keyed(source, build)`（仓库里最常见的写法，官方基准也是它）。
 *
 * 键口径**照抄核心**：keySet 源用容器自己的 `keyOf(item.data)`（键是数据自己的键，行拿到的是
 * KeyItem），信号源按**行身份**（对象键 → 不写 `data-row-key`）。编译产物两条通道都要与通用路径
 * 逐帧一致：复用 / 换序 / 换引用重建 / 离场销毁 / 最小搬动。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compileSource } from './compile.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-keyed-two-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

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

/** 编译一份源码并落盘 import（主产物在 element 通道是 `{el}` 行，node 通道是 ViewNode）。 */
const setup = async (label, source, fn, mode) => {
  const file = join(workDir, `${label}.js`);
  writeFileSync(file, source, 'utf8');
  const result = compileSource({
    source,
    file,
    fn,
    mode,
    core,
    runtime: runtimeUrl,
    rowSpecifier: (index) => `\0yoya-row:${label}-row${index}`
  });
  expect(result.bails, `${label}:${mode}`).toEqual([]);

  const replacements = new Map();
  const written = [{ path: join(workDir, `${label}.${mode}.js`), module: result.module }];
  replacements.set(
    JSON.stringify(`\0yoya-row:${label}`),
    JSON.stringify(pathToFileURL(written[0].path).href)
  );
  (result.rows ?? []).forEach((row, index) => {
    const path = join(workDir, `${label}.${mode}.row${index}.js`);
    replacements.set(
      JSON.stringify(`\0yoya-row:${label}-row${index}`),
      JSON.stringify(pathToFileURL(path).href)
    );
    written.push({ path, module: row.module });
  });
  const rewrite = (text) => {
    let out = text;
    replacements.forEach((to, from) => {
      out = out.replaceAll(from, to);
    });
    return out;
  };
  written.forEach((item) => writeFileSync(item.path, rewrite(item.module), 'utf8'));
  return {
    module: await import(pathToFileURL(written[0].path).href),
    generic: await import(pathToFileURL(file).href)
  };
};

describe('keyed(source, build) 两参形式', () => {
  const signalSource = [
    "import { div, li, ref, ul, vText } from '../../src/yoya.core.js';",
    '',
    'export function Rows(props) {',
    '  return div((root) => {',
    "    root.className('rows');",
    '    root.ul((list) => {',
    "      list.className('items');",
    '      list.keyed(props.rows, (row) =>',
    '        li((line) => {',
    "          line.className('row');",
    "          line.attr('data-id', String(row.id));",
    '          line.child(vText(row.label));',
    '        })',
    '      );',
    '    });',
    '  });',
    '}',
    ''
  ].join('\n');

  it('信号源：按行身份对账，两条通道都与通用路径逐帧一致', async () => {
    for (const mode of ['element', 'node']) {
      const { module, generic } = await setup(`rows-${mode}`, signalSource, 'Rows', mode);
      const rows = core.ref([
        { id: 1, label: core.ref('one') },
        { id: 2, label: core.ref('two') }
      ]);
      const props = () => ({ rows });
      const product = module.createRowFactory({})(props());
      const compiledEl = mode === 'element' ? product.el : product.renderDom();
      const genericEl = generic.Rows(props()).renderDom();
      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      // 信号源按行身份键（对象）→ 与通用路径一样**不写** data-row-key
      expect(compiledEl.querySelector('[data-row-key]'), mode).toBeNull();

      // 换序 + 换引用（新对象 → 原位重建）
      const second = rows.value[1];
      rows.value = [{ id: 3, label: core.ref('three') }, second];
      expect(signature(compiledEl), mode).toBe(signature(genericEl));

      // 活文本
      rows.value[1].label.value = 'two!';
      expect(signature(compiledEl), mode).toBe(signature(genericEl));

      // 删除 + 清空
      rows.value = [];
      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      expect(compiledEl.querySelectorAll('.row').length, mode).toBe(0);
    }
  });

  const keySetSource = [
    "import { div, keySet, li, ul, vText } from '../../src/yoya.core.js';",
    '',
    'export function SetRows(props) {',
    '  return div((root) => {',
    '    root.ul((list) => {',
    "      list.className('items');",
    '      list.keyed(props.items, (item) =>',
    '        li((line) => {',
    "          line.className('row');",
    "          line.attr('data-id', String(item.data.id));",
    '          line.child(vText(item.data.label));',
    '        })',
    '      );',
    '    });',
    '  });',
    '}',
    ''
  ].join('\n');

  it('keySet 源：键取数据自己的键、行拿到 KeyItem，两条通道都与通用路径一致', async () => {
    const makeSet = () => core.keySet([], (row) => row.id);
    for (const mode of ['element', 'node']) {
      const { module, generic } = await setup(`set-${mode}`, keySetSource, 'SetRows', mode);
      const items = makeSet();
      const props = () => ({ items });
      const product = module.createRowFactory({})(props());
      const compiledEl = mode === 'element' ? product.el : product.renderDom();

      const genericItems = makeSet();
      const genericEl = generic.SetRows({ items: genericItems }).renderDom();
      const one = { id: 1, label: core.ref('one') };
      const two = { id: 2, label: core.ref('two') };
      items.replaceAll([one, two]);
      genericItems.replaceAll([
        { id: 1, label: core.ref('one') },
        { id: 2, label: core.ref('two') }
      ]);

      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      // keySet 源缺省键 = 数据自己的键（数字）→ 与通用路径一样写 data-row-key
      expect(
        [...compiledEl.querySelectorAll('.row')].map((el) => el.getAttribute('data-row-key')),
        mode
      ).toEqual(['1', '2']);

      // 换序 + 删一行（keySet：同 key 同 KeyItem，元素复用）
      items.replaceAll([two, one]);
      genericItems.replaceAll([
        { id: 2, label: genericItems.item(2).data.label },
        { id: 1, label: genericItems.item(1).data.label }
      ]);
      expect(signature(compiledEl), mode).toBe(signature(genericEl));

      items.remove(1);
      genericItems.remove(1);
      expect(signature(compiledEl), mode).toBe(signature(genericEl));
      expect(compiledEl.querySelectorAll('.row').length, mode).toBe(1);
    }
  });
});
