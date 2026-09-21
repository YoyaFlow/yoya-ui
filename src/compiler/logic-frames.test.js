/**
 * 票 04 的第一刀：**局部声明提升（逻辑帧）**。
 *
 * 根 setup 里的 `const` / `let` 声明原样搬进产物、按源码顺序执行；值位置引用它们不再当作
 * 「局部变量」整形状回落，它们也**不进 scope**（产物自己声明）。认不准（`var` / 重赋值 / 解构默认值 /
 * 初始化里出现节点对象或元素工厂 / 同名声明多处 / 嵌套 setup）一律回落，绝不半编。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compileSource } from './compile.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-logic-frames-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(join(process.cwd(), 'src/compiler/runtime.js')).href;

const source = [
  "import { div, span, vText } from '../../src/yoya.core.js';",
  '',
  'export function Badge(props) {',
  '  return div((root) => {',
  '    const label = String(props.label.value);',
  '    const tone = props.tone;',
  '    const text = `${label} / ${tone}`;',
  "    root.className('badge');",
  "    root.attr('data-label', label);",
  "    root.attr('data-tone', tone);",
  "    root.span((cell) => cell.className('badge-text').child(vText(text)));",
  "    root.on('click', () => props.onPick(label));",
  '  });',
  '}',
  ''
].join('\n');

const compileAndLoad = async (code, label, mode, fn = 'Badge') => {
  const file = join(workDir, `${label}.js`);
  writeFileSync(file, code, 'utf8');
  const result = compileSource({
    source: code,
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

describe('局部声明提升（票 04 第一刀）', () => {
  it('声明搬进产物；值位置引用不再回落，产物里也照源码顺序执行', async () => {
    const props = () => ({ label: core.ref('v1'), tone: 'ok', onPick: () => {} });
    const genericFile = join(workDir, 'badge-generic.js');
    writeFileSync(genericFile, source, 'utf8');
    const generic = await import(pathToFileURL(genericFile).href);
    const genericEl = generic.Badge(props()).renderDom();
    expect(genericEl.className).toBe('badge');
    expect(genericEl.getAttribute('data-label')).toBe('v1');
    expect(genericEl.getAttribute('data-tone')).toBe('ok');
    expect(genericEl.textContent).toBe('v1 / ok');

    // 元素通道：声明就地展开，嵌套元素也看得见 → 逐帧一致
    const { result, module } = await compileAndLoad(source, 'badge-element', 'element');
    expect(result.bails).toEqual([]);
    expect(result.scope).toEqual([]); // 提升的名字不是作用域依赖
    expect(result.module).toContain('const label = String(props.label.value);');
    const compiledEl = module.createRowFactory({})(props()).el;
    expect(signature(compiledEl)).toBe(signature(genericEl));

    // 节点通道：下层节点的构建会被搬进"有逻辑帧的那个闭包"里 → 同样能编、逐帧一致
    const node = await compileAndLoad(source, 'badge-node', 'node');
    expect(node.result.bails).toEqual([]);
    const nodeEl = node.module.createRowFactory({})(props()).renderDom();
    expect(signature(nodeEl)).toBe(signature(genericEl));
  });

  it('声明只在根节点的值位置被引用时，节点通道同样能编', async () => {
    const flat = [
      "import { div, vText } from '../../src/yoya.core.js';",
      '',
      'export function Badge(props) {',
      '  return div((root) => {',
      '    const label = String(props.label.value);',
      '    const text = `${label} / ${props.tone}`;',
      "    root.className('badge');",
      "    root.attr('data-label', label);",
      '    root.child(vText(text));',
      '  });',
      '}',
      ''
    ].join('\n');
    const props = () => ({ label: core.ref('v1'), tone: 'ok' });
    const genericFile = join(workDir, 'flat-generic.js');
    writeFileSync(genericFile, flat, 'utf8');
    const generic = await import(pathToFileURL(genericFile).href);
    const genericEl = generic.Badge(props()).renderDom();

    for (const mode of ['element', 'node']) {
      const { result, module } = await compileAndLoad(flat, `flat-${mode}`, mode);
      expect(result.bails, mode).toEqual([]);
      const product =
        mode === 'element'
          ? module.createRowFactory({})(props())
          : module.createRowFactory({})(props()).renderDom();
      expect(signature(mode === 'element' ? product.el : product), mode).toBe(signature(genericEl));
    }
  });

  it('认不准的声明一律回落（不产半成品）', async () => {
    const cases = {
      'var 声明': '    var label = String(props.label.value);\n',
      解构默认值: '    const { label = "fallback" } = props;\n',
      初始化里出现节点对象: '    const label = root.attr("data-x", 1);\n',
      值位置引用嵌套节点参数: null
    };

    Object.entries(cases).forEach(([name, line]) => {
      const code =
        line === null
          ? source.replace(
              "    root.span((cell) => cell.className('badge-text').child(vText(text)));",
              "    root.span((cell) => cell.className('badge-text').child(String(cell.id)));"
            )
          : source.replace('    const label = String(props.label.value);\n', line);
      const file = join(workDir, 'badge-bail.js');
      writeFileSync(file, code, 'utf8');
      const result = compileSource({
        source: code,
        file,
        fn: 'Badge',
        mode: 'node',
        core,
        runtime: runtimeUrl
      });
      expect(result.compiled, name).toBe(false);
      expect(result.module, name).toBeNull();
    });
  });
});
