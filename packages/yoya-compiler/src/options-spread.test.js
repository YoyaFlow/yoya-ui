// 票 18 的门禁：options 里带 `...rest` 时，编译产物（一条运行期合并 op）必须与通用路径
// 逐字节一致——包括覆盖次序（后缀赢）、通道键整包覆盖（attrs / style）、事件，
// 以及 `children` 落在 rest 里时的位置（内容在结构之前）。
//
// 与 equivalence.test.js 同一套路：生成模块 → 落盘 → 真实 import（跑消费者路径）。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import { compileSource } from './index.js';
import * as dsl from './fixtures/options-spread.js';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-options-spread-'));
const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;
const coreUrl = pathToFileURL(join(process.cwd(), 'packages/yoya-ui/src/index.js')).href;
const source = readFileSync(join(import.meta.dirname, 'fixtures/options-spread.js'), 'utf8');

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

/** 编译一个单元并真实 import 产物；编不出来就返回 bails 供断言。 */
const compile = async (fn, mode) => {
  const result = compileSource({
    source,
    file: 'options-spread.js',
    fn,
    mode,
    core,
    runtime: runtimeUrl,
    coreSpecifier: coreUrl
  });
  if (!result.compiled) {
    return { compiled: false, bails: result.bails };
  }

  const file = join(workDir, `${fn}.${mode}.js`);
  writeFileSync(file, result.module, 'utf8');
  const generated = await import(pathToFileURL(file).href);
  return { compiled: true, generated, plan: result.plan };
};

/** 通用路径：夹具函数本身就是 DSL 实现，直接渲染成 DOM。 */
const dslElement = (name, props) => dsl[name](props).renderDom();

/** 编译路径：元素通道直接给元素，节点通道给节点对象（renderDom 落地）。 */
const compiledElement = (generated, props, mode) => {
  const built = generated.createRowFactory({})(props);
  return mode === 'element' ? built.el : built.renderDom();
};

/**
 * 属性顺序无关的 DOM 签名：元素通道按**对象键序**写（与既有 `dynamicAttr` 的口径一致），
 * 通用路径按引擎的落盘顺序写——两者内容相同、字节可能不同（属票 41 的未决口径）。
 * 节点通道复用核心自己的对象分派，所以那边仍然逐字节比。
 */
const signature = (element) => {
  const attrs = [...element.attributes]
    .map((item) => `${item.name}=${item.value}`)
    .sort()
    .join(' ');
  const children = [...element.childNodes].map((child) =>
    child.nodeType === 3 ? `#text:${child.textContent}` : signature(child)
  );
  return `<${element.tagName.toLowerCase()} ${attrs}>${children.join('')}`;
};

const expectSame = (pair, mode) => {
  if (mode === 'node') {
    expect(pair.compiled.outerHTML, mode).toBe(pair.dsl.outerHTML);
    return;
  }
  expect(signature(pair.compiled), mode).toBe(signature(pair.dsl));
};

const both = async (fn, props, mode = 'element') => {
  const built = await compile(fn, mode);
  expect(built.compiled, `${fn}@${mode} 应该能编：${JSON.stringify(built.bails)}`).toBe(true);
  return {
    dsl: dslElement(fn, props()),
    compiled: compiledElement(built.generated, props(), mode)
  };
};

describe('options spread（票 18）', () => {
  it('后缀身份赢过 rest.vn，前缀键被 rest 覆盖', async () => {
    for (const mode of ['element', 'node']) {
      const pair = await both(
        'SpreadCard',
        () => ({ label: 'pen', tone: 'warn', vn: 'FromRest', 'data-id': 'r1' }),
        mode
      );
      expectSame(pair, mode);
      expect(pair.compiled.getAttribute('vn')).toBe('SpreadCard');
      expect(pair.compiled.getAttribute('data-tone')).toBe('warn');
      expect(pair.compiled.getAttribute('data-id')).toBe('r1');
    }

    const overridden = await both('SpreadCard', () => ({
      label: 'pen',
      tone: 'warn',
      'data-tone': 'hot'
    }));
    expectSame(overridden, 'element');
    expect(overridden.compiled.getAttribute('data-tone')).toBe('hot');
  });

  it('通道键（attrs / style / class）整包覆盖：rest 里那份说了算', async () => {
    const attrs = await both('ChannelCard', () => ({ label: 'x', attrs: { 'data-b': '2' } }));
    console.log('[attrs] 通用:', attrs.dsl.outerHTML, '| 编译:', attrs.compiled.outerHTML);
    expectSame(attrs, 'element');
    expect(attrs.compiled.hasAttribute('data-a')).toBe(false);
    expect(attrs.compiled.getAttribute('data-b')).toBe('2');

    const style = await both('ChannelCard', () => ({ label: 'x', style: { fontSize: '20px' } }));
    expectSame(style, 'element');
    expect(style.compiled.style.color).toBe('');
    expect(style.compiled.style.fontSize).toBe('20px');

    const klass = await both('ChannelCard', () => ({ label: 'x', class: 'extra' }));
    expect(klass.compiled.className).toBe(klass.dsl.className);

    const suffix = await both('SuffixClassCard', () => ({ label: 'x', class: 'extra' }));
    expectSame(suffix, 'element');
    expect(suffix.compiled.className).toBe('base');
  });

  it('事件简写照常生效', async () => {
    for (const mode of ['element', 'node']) {
      const built = await compile('SpreadCard', mode);
      expect(built.compiled).toBe(true);

      const compiledHits = [];
      const dslHits = [];
      const compiledOptionsHits = [];
      const dslOptionsHits = [];

      const compiledEl = compiledElement(
        built.generated,
        {
          label: 'x',
          tone: 'warn',
          onPick: () => compiledHits.push(1),
          onClick: () => compiledOptionsHits.push(1)
        },
        mode
      );
      const dslEl = dslElement('SpreadCard', {
        label: 'x',
        tone: 'warn',
        onPick: () => dslHits.push(1),
        onClick: () => dslOptionsHits.push(1)
      });

      const fire = (name) => new MouseEvent(name, { bubbles: true });
      compiledEl.dispatchEvent(fire('pointerdown'));
      dslEl.dispatchEvent(fire('pointerdown'));
      compiledEl.dispatchEvent(fire('click'));
      dslEl.dispatchEvent(fire('click'));

      // 结构里的 `on('pointerdown', …)` 与 options 里的 `onClick` 各命中一次
      expect(compiledHits.length, `${mode} 结构 on`).toBe(1);
      expect(dslHits.length, `${mode} 结构 on（通用）`).toBe(1);
      expect(compiledOptionsHits.length, `${mode} options onXxx`).toBe(1);
      expect(dslOptionsHits.length, `${mode} options onXxx（通用）`).toBe(1);
    }
  });

  it('children 从 props 解构（写结构里）：位置与通用路径一致', async () => {
    // 元素通道的 `child(<表达式>)` 位置只承载文本（节点值会响亮报错，是既有口径）→ 只测节点通道
    for (const mode of ['node']) {
      const pair = await both(
        'ChildrenCard',
        () => ({ children: [core.span('head'), core.span('body')] }),
        mode
      );
      expectSame(pair, mode);
      expect([...pair.compiled.childNodes].map((child) => child.textContent)).toEqual([
        'head',
        'body',
        'tail'
      ]);
    }
  });

  it('children 留在 rest 里：也按"内容在结构之前"落位', async () => {
    for (const mode of ['element', 'node']) {
      const pair = await both(
        'RestChildrenCard',
        () => ({ label: 'L', children: core.span('rest') }),
        mode
      );
      console.log(`[rest.children · ${mode}] 通用:`, pair.dsl.outerHTML);
      console.log(`[rest.children · ${mode}] 编译:`, pair.compiled.outerHTML);
      expectSame(pair, mode);
      expect([...pair.compiled.childNodes].map((child) => child.textContent)).toEqual([
        'rest',
        'head',
        'L'
      ]);
    }
  });

  it('守卫：计算键 / 非绑定名的 spread 仍然整体回落', async () => {
    const computed = await compile('ComputedKeyCard', 'element');
    expect(computed.compiled).toBe(false);
    expect(computed.bails.map((bail) => bail.reason)).toContain('options 里有非静态键');

    const member = await compile('MemberSpreadCard', 'element');
    expect(member.compiled).toBe(false);
    expect(member.bails.some((bail) => bail.reason.includes('spread 只认绑定名'))).toBe(true);
  });
});
