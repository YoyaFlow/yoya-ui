/**
 * 真实库文件的缺口：**SVG 子标签工厂不在 core 顶层导出**（只有 `<svg>` 是 HTML DSL 入口，
 * `path` / `circle` / `rect` 这些注册在 `svgs` 表里），而它们在元素白名单里是合法工厂。
 * 片段构建与节点物化都要能从 `htmls` / `svgs` 表里找到它们（节点通道产物 import `svgs` 命名空间）。
 *
 * 顺带覆盖 `attr({ … })` 对象形式——与核心同一口径（逐项走 `attr(名字, 值)`）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import * as svg from '@yoyaflow/yoya-core/svg';
import { compileSource } from './compile.js';

// 元素白名单 = core 主入口 + svg 子入口（0.8 起 svg 不再挂主入口）
const coreNamespace = { ...core, ...svg };

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-svg-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;

const source = [
  "import { svg } from '@yoyaflow/yoya-core/svg';",
  "import { vText } from '@yoyaflow/yoya-core';",
  '',
  'export function Icon(props) {',
  '  return svg((root) => {',
  '    root',
  "      .className('yoya-icon')",
  "      .attr({ 'aria-hidden': 'true', fill: 'none', viewBox: '0 0 24 24' })",
  "      .styles({ height: '24px', width: '24px' });",
  "    root.path((paint) => paint.attr('d', props.d));",
  "    root.circle((dot) => dot.attr('r', '9').child(vText(props.label)));",
  '  });',
  '}',
  ''
].join('\n');

const props = () => ({ d: core.ref('M12 5v14'), label: core.ref('dot') });

/**
 * DOM 签名：`style` 文本按**声明语义**归一（`height:24px` ≡ `height: 24px`）。
 *
 * 这是一条预存的序列化差异（与票 08 的属性顺序同族）：通用路径的样式经 CSSOM 序列化
 * （`height: 24px;`，冒号后有空格），而编译产物的片段走 `toHTML()` 的紧凑格式（`height:24px`）。
 * 两者语义相同、CSSOM 读出来的值也相同，但 `outerHTML` 的字节不同。
 */
const normalizeStyle = (text) =>
  text
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\s*:\s*/, ':'))
    .sort()
    .join(';');

const signature = (node) => {
  if (node.nodeType === 3) {
    return `#text:${node.textContent}`;
  }
  const attrs = [...node.attributes]
    .map((item) =>
      item.name === 'style' ? `style=${normalizeStyle(item.value)}` : `${item.name}=${item.value}`
    )
    .sort()
    .join(' ');
  return `<${node.tagName.toLowerCase()} ${attrs}>${[...node.childNodes].map(signature).join('')}`;
};

const load = async (mode) => {
  const file = join(workDir, `arrow-${mode}.js`);
  writeFileSync(file, source, 'utf8');
  const result = compileSource({
    source,
    file,
    fn: 'Icon',
    mode,
    core: coreNamespace,
    runtime: runtimeUrl
  });
  expect(result.bails, mode).toEqual([]);
  const path = join(workDir, `arrow-${mode}.generated.js`);
  writeFileSync(path, result.module, 'utf8');
  return { result, module: await import(pathToFileURL(path).href) };
};

describe('SVG 工厂与 attr 对象形式', () => {
  it('两条通道都能编，DOM 与通用路径一致', async () => {
    const genericFile = join(workDir, 'arrow-generic.js');
    writeFileSync(genericFile, source, 'utf8');
    const generic = await import(pathToFileURL(genericFile).href);
    const genericEl = generic.Icon(props()).renderDom();

    expect(genericEl.getAttribute('fill')).toBe('none');
    expect(genericEl.querySelector('path').getAttribute('d')).toBe('M12 5v14');
    expect(genericEl.querySelector('circle').getAttribute('r')).toBe('9');
    expect(genericEl.querySelector('circle').textContent).toBe('dot');

    for (const mode of ['element', 'node']) {
      const { result, module } = await load(mode);
      // SVG 子标签工厂：节点通道产物 import `svgs` 命名空间，写成 `svgs.path(...)`
      if (mode === 'node') {
        expect(result.module).toContain('svgs.path');
        // 0.8 起 svg 工厂表与 svg 工厂都来自 `/svg` 子入口
        expect(result.module).toMatch(
          /import \{[^}]*\bsvgs\b[^}]*\} from "@yoyaflow\/yoya-core\/svg"/
        );
      }
      const product =
        mode === 'element'
          ? module.createRowFactory({})(props())
          : module.createRowFactory({})(props()).renderDom();
      expect(signature(mode === 'element' ? product.el : product), mode).toBe(signature(genericEl));
    }
  });

  it('`attr({ … })` 与逐条 `attr(名字, 值)` 等价（静态与动态值都算）', async () => {
    const objectForm = [
      "import { div } from '@yoyaflow/yoya-core';",
      'export function Box(props) {',
      '  return div((root) => {',
      "    root.attr({ id: 'box', 'data-tone': props.tone });",
      '  });',
      '}',
      ''
    ].join('\n');
    const pairForm = objectForm.replace(
      "    root.attr({ id: 'box', 'data-tone': props.tone });",
      "    root.attr('id', 'box');\n    root.attr('data-tone', props.tone);"
    );

    const files = [
      ['object', objectForm],
      ['pairs', pairForm]
    ];
    const rendered = [];
    for (const [label, code] of files) {
      const file = join(workDir, `attr-${label}.js`);
      writeFileSync(file, code, 'utf8');
      const result = compileSource({
        source: code,
        file,
        fn: 'Box',
        mode: 'element',
        core: coreNamespace,
        runtime: runtimeUrl
      });
      expect(result.bails, label).toEqual([]);
      const path = join(workDir, `attr-${label}.generated.js`);
      writeFileSync(path, result.module, 'utf8');
      const module = await import(pathToFileURL(path).href);
      rendered.push(module.createRowFactory({})({ tone: 'ok' }).el);
    }
    expect(signature(rendered[0])).toBe(signature(rendered[1]));
    expect(rendered[0].getAttribute('data-tone')).toBe('ok');
  });
});
