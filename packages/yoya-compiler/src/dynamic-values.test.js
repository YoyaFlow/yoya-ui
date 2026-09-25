/**
 * 动态类名 / 动态实参。
 *
 * - **动态类名** `className(<非字面量>)`：与核心同一条口径——`String(值)` 按空白切分、与已有类名
 *   **保序去重**。节点通道直接复用 `node.className(expr)`；元素通道落到 `classList`
 *   （已存在的类名保持原位、新类名按顺序追加）。
 * - **动态实参** `h1(config.heading)`：运行期类型分派复用核心的 `applySetupValue`
 *   （字符串 / 句柄 / 数组 / options / 回调都在内）。只有**节点通道**能承载（元素通道没有节点对象、
 *   认不出运行期类型 → 明确回落）；而且只收**最后一个实参**（后面还有参数时运行期追加会插错位）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { compileSource } from './compile.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-dynamic-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;

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

const classesOf = (element) => [...element.classList].sort();

const load = async (source, fn, label, mode) => {
  const file = join(workDir, `${label}.js`);
  writeFileSync(file, source, 'utf8');
  const result = compileSource({
    source,
    file,
    fn,
    mode,
    core,
    runtime: runtimeUrl
  });
  if (!result.compiled) {
    return { result };
  }
  const path = join(workDir, `${label}.generated.js`);
  writeFileSync(path, result.module, 'utf8');
  return { result, module: await import(pathToFileURL(path).href) };
};

const genericOf = async (source, label) => {
  const file = join(workDir, `${label}.generic.js`);
  writeFileSync(file, source, 'utf8');
  return import(pathToFileURL(file).href);
};

describe('动态类名', () => {
  const source = [
    "import { div } from '@yoyaflow/yoya-core';",
    '',
    'export function Tag(props) {',
    '  return div((root) => {',
    "    root.className('tag');",
    '    root.className(props.tone);',
    "    root.className('wide', props.extra);",
    '  });',
    '}',
    ''
  ].join('\n');

  it('两条通道都与通用路径一致（保序去重）', async () => {
    const props = () => ({ tone: 'tag ok', extra: 'padded' });
    const generic = await genericOf(source, 'tag');
    const genericEl = generic.Tag(props()).renderDom();
    // 通用路径：'tag' → 'tag ok' → 'tag ok wide padded'（保序、去重）
    expect(genericEl.getAttribute('class')).toBe('tag ok wide padded');

    for (const mode of ['element', 'node']) {
      const { result, module } = await load(source, 'Tag', `tag-${mode}`, mode);
      expect(result.bails, mode).toEqual([]);
      const product =
        mode === 'element'
          ? module.createRowFactory({})(props())
          : module.createRowFactory({})(props()).renderDom();
      const element = mode === 'element' ? product.el : product;
      expect(classesOf(element), mode).toEqual(classesOf(genericEl));
      expect(signature(element), mode).toBe(signature(genericEl));
    }
  });

  it('空值 / 空格串按核心口径忽略，重复类名去重', async () => {
    const props = () => ({ tone: null, extra: '  tag   wide  ' });
    const generic = await genericOf(source, 'tag2');
    const genericEl = generic.Tag(props()).renderDom();
    expect(genericEl.getAttribute('class')).toBe('tag wide');

    const { result, module } = await load(source, 'Tag', 'tag-element2', 'element');
    expect(result.bails).toEqual([]);
    const element = module.createRowFactory({})(props()).el;
    expect(element.getAttribute('class')).toBe(genericEl.getAttribute('class'));
  });
});

describe('动态实参', () => {
  const source = [
    "import { div, h1, vText } from '@yoyaflow/yoya-core';",
    '',
    'export function Page(props) {',
    '  return div((root) => {',
    "    root.className('page');",
    "    root.h1('prefix', props.heading);",
    '  });',
    '}',
    ''
  ].join('\n');

  it('节点通道复用核心的参数分派，DOM 与通用路径一致', async () => {
    const props = () => ({ heading: core.ref('标题') });
    const generic = await genericOf(source, 'page');
    const genericEl = generic.Page(props()).renderDom();
    expect(genericEl.querySelector('h1').textContent).toBe('prefix标题');

    const { result, module } = await load(source, 'Page', 'page-node', 'node');
    expect(result.bails).toEqual([]);
    const element = module.createRowFactory({})(props()).renderDom();
    expect(signature(element)).toBe(signature(genericEl));

    // 句柄实参跟着变（核心分派把句柄当文本绑定）
    const liveProps = { heading: core.ref('一') };
    const live = module.createRowFactory({})(liveProps).renderDom();
    liveProps.heading.value = '二';
    expect(live.querySelector('h1').textContent).toBe('prefix二');
  });

  it('元素通道同样支持文本类动态实参；动态实参后面还有参数时回落', async () => {
    const elementMode = await load(source, 'Page', 'page-element', 'element');
    // 元素通道也支持文本类动态实参（位置 = 一段文本），与通用路径一致
    expect(elementMode.result.bails).toEqual([]);
    const element = elementMode.module.createRowFactory({})({ heading: core.ref('标题') }).el;
    expect(element.querySelector('h1').textContent).toBe('prefix标题');

    const liveProps = { heading: core.ref('一') };
    const live = elementMode.module.createRowFactory({})(liveProps).el;
    liveProps.heading.value = '二';
    expect(live.querySelector('h1').textContent).toBe('prefix二');

    const trailing = source.replace(
      "    root.h1('prefix', props.heading);",
      "    root.h1(props.heading, 'suffix');"
    );
    const trailingResult = await load(trailing, 'Page', 'page-trailing', 'node');
    expect(trailingResult.result.compiled).toBe(false);
    expect(trailingResult.result.bails.map((bail) => bail.reason).join(' | ')).toContain(
      '动态实参后面还有参数'
    );
  });
});
