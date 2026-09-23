/**
 * 节点变量（别名）：`const body = root.div(…)` 之后 `body.attr(…)`。
 *
 * **关键口径**（`registerChildFactories`）：链式子工厂返回的是**父节点**（`this.child(factory(…))`），
 * 节点自身的写也返回 `this`——所以 `body` 等于"当前节点"（`root`），不是新建出来的那个子元素。
 * 于是别名声明按普通链式语句处理（结构 / 写都留在原位），别名链照常分析，宿主就是当前节点；
 * 逻辑帧与别名写按源码顺序**天然交织**（都在同一份 ops 列表里按位置发射）。
 *
 * 边界（认不准就回落）：只认"最后一跳返回节点"的声明（`className()` / `style('x')` / `attr('x')`
 * 这类取值调用不是别名）；别名出现在**值位置**（`foo(body)`）同样回落——节点对象不是一段值。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '../yoya.core.js';
import { compileSource } from './compile.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-alias-'));
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

const source = [
  "import { div, span, vText } from '../../src/yoya.core.js';",
  '',
  'export function Card(props) {',
  '  return div((root) => {',
  "    root.className('card');",
  '    const body = root.div((pane) => {',
  "      pane.className('card-body');",
  '      pane.child(vText(props.title));',
  '    });',
  '    let n = props.start;',
  "    body.attr('data-n', String(n));",
  '    n = n + 1;',
  "    body.attr('data-m', String(n));",
  "    body.className('wide');",
  "    body.on('click', () => props.onPick(n));",
  "    const same = root.attr('data-same', 'yes');",
  "    same.toggleClass('flag', props.flag);",
  "    root.span((tail) => tail.className('tail').child('tail'));",
  '  });',
  '}',
  ''
].join('\n');

describe('节点变量（别名）', () => {
  it('两条通道都与通用路径逐帧一致（别名 = 当前节点，写按源码顺序交织）', async () => {
    const props = () => ({ title: core.ref('标题'), start: 4, flag: false, onPick: () => {} });
    const genericFile = join(workDir, 'card.generic.js');
    writeFileSync(genericFile, source, 'utf8');
    const generic = await import(pathToFileURL(genericFile).href);
    const genericEl = generic.Card(props()).renderDom();

    // 别名指向 root（链式工厂返回父节点）：写落在根上；顺序敏感——`data-n` 读 4、`data-m` 读 5
    expect(genericEl.getAttribute('data-n')).toBe('4');
    expect(genericEl.getAttribute('data-m')).toBe('5');
    expect(genericEl.getAttribute('data-same')).toBe('yes');
    expect(genericEl.querySelector('.card-body').getAttribute('data-n')).toBeNull();

    for (const mode of ['element', 'node']) {
      const { result, module } = await load(source, 'Card', `card-${mode}`, mode);
      expect(result.bails, mode).toEqual([]);
      const product = module.createRowFactory({})(props());
      const el = mode === 'element' ? product.el : product.renderDom();

      expect(signature(el), mode).toBe(signature(genericEl));
      expect(el.getAttribute('data-n'), mode).toBe('4');
      expect(el.getAttribute('data-m'), mode).toBe('5');
      expect(el.classList.contains('wide'), mode).toBe(true);
    }
  });

  it('别名上加子元素也照编（链式语义 = 加在当前节点下）', async () => {
    const extended = source.replace(
      "    body.attr('data-n', String(n));",
      "    body.attr('data-n', String(n));\n    body.span((extra) => extra.className('extra').child('e'));"
    );
    const props = () => ({ title: core.ref('标题'), start: 1, flag: true, onPick: () => {} });
    const genericFile = join(workDir, 'card-extra.generic.js');
    writeFileSync(genericFile, extended, 'utf8');
    const generic = await import(pathToFileURL(genericFile).href);
    const genericEl = generic.Card(props()).renderDom();
    expect(genericEl.querySelector('.extra')).not.toBeNull();

    for (const mode of ['element', 'node']) {
      const { result, module } = await load(extended, 'Card', `card-extra-${mode}`, mode);
      expect(result.bails, mode).toEqual([]);
      const product = module.createRowFactory({})(props());
      const el = mode === 'element' ? product.el : product.renderDom();
      expect(signature(el), mode).toBe(signature(genericEl));
      expect(el.querySelector('.extra'), mode).not.toBeNull();
    }
  });

  it('别名当"值"交给助手（`props.onPick(body)`）→ 当洞：换节点产物，不再整块回落', () => {
    // 口径更新（票 21 §2.1.8）：这句话不改变当前树的结构（只是把句柄交出去），所以当洞原样执行，
    // 只把节点参数名换成产物里的句柄；产物必须是节点 ⇒ 自动切节点通道。
    const code = source.replace("    body.attr('data-n', String(n));", '    props.onPick(body);');
    const file = join(workDir, 'card-hole.js');
    writeFileSync(file, code, 'utf8');
    const result = compileSource({
      source: code,
      file,
      fn: 'Card',
      mode: 'element',
      core,
      runtime: runtimeUrl
    });
    expect(result.compiled, JSON.stringify(result.bails)).toBe(true);
    expect(result.plan.mode).toBe('node');
    // 洞里那句用的还是同一个节点句柄（产物里的 `node`）
    expect(result.module).toContain('props.onPick(node)');
  });
});
