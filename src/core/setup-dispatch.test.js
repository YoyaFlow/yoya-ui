/**
 * 票 42 / T1：setup 参数的数量、顺序与类型分派。
 *
 * 口径（讨论定稿）：
 * - 数量不定、严格按出现顺序应用；
 * - 每个参数按类型分派：函数＝构建回调、字符串/数字＝文本、节点/句柄＝子节点、数组＝子节点列表、
 *   对象＝options 分派、同类实例＝复用；
 * - options 分派里**子工厂不参与**：同名键按属性写（`div({ slot })` 是属性，不是子元素），
 *   组件自有方法仍照旧（`vDialog({ title })` 是 props）。
 */
import { describe, expect, it } from 'vitest';
import { div, ref, span, vButton, vCard, vDialog, vText } from '../index.js';

describe('setup dispatch: options keys', () => {
  it('writes attributes for keys that collide with child factories', () => {
    expect(div({ slot: 't-head' }).toHTML()).toBe('<div slot="t-head"></div>');
    expect(div({ title: 't' }).toHTML()).toBe('<div title="t"></div>');
    expect(div({ label: 'l' }).toHTML()).toBe('<div label="l"></div>');
    expect(div({ span: 'x' }).toHTML()).toBe('<div span="x"></div>');
  });

  it('keeps component-owned methods working as props', () => {
    expect(vButton({ label: '重置' }).toHTML()).toContain('重置');
    expect(vDialog({ title: '对话框' }).toHTML()).toContain('对话框');
  });

  it('keeps the explicit attrs / style channels', () => {
    expect(div({ attrs: { 'data-x': '1' }, style: { color: 'red' } }).toHTML()).toBe(
      '<div data-x="1" style="color:red"></div>'
    );
  });
});

describe('setup dispatch: order and count', () => {
  it('applies every argument in order, whatever the count', () => {
    expect(div('a').toHTML()).toBe('<div>a</div>');
    expect(div('a', (node) => node.span('s')).toHTML()).toBe('<div>a<span>s</span></div>');
    expect(div('a', (node) => node.span('s'), 'b').toHTML()).toBe('<div>a<span>s</span>b</div>');
    expect(div((node) => node.span('s'), 't').toHTML()).toBe('<div><span>s</span>t</div>');
    expect(
      div(
        (node) => node.span('1'),
        (node) => node.span('2'),
        (node) => node.span('3')
      ).toHTML()
    ).toBe('<div><span>1</span><span>2</span><span>3</span></div>');
  });

  it('is position independent for the same value', () => {
    expect(div({ children: 'x' }).toHTML()).toBe('<div>x</div>');
    expect(div(null, { children: 'x' }).toHTML()).toBe('<div>x</div>');
    expect(div(['a', 'b']).toHTML()).toBe('<div>ab</div>');
    expect(div(null, ['a', 'b']).toHTML()).toBe('<div>ab</div>');
    expect(div(span('s')).toHTML()).toBe('<div><span>s</span></div>');
    expect(div(null, vText('t')).toHTML()).toBe('<div>t</div>');
  });

  it('ignores null / undefined arguments anywhere', () => {
    expect(div(null, 'a', undefined, null).toHTML()).toBe('<div>a</div>');
  });

  it('merges repeated objects with later keys winning', () => {
    expect(div({ attrs: { a: '1' } }, { attrs: { b: '2' } }).toHTML()).toBe(
      '<div a="1" b="2"></div>'
    );
    expect(div({ attrs: { a: '1' } }, { attrs: { a: '2' } }).toHTML()).toBe('<div a="2"></div>');
  });

  it('keeps live values in setup arguments', () => {
    const visible = ref(true);
    const node = div({ mountable: visible }, 'content');
    expect(node.toHTML()).toBe('<div>content</div>');
  });
});

describe('setup dispatch: component factories', () => {
  it('reuses a passed instance instead of building a new one', () => {
    const card = vCard('x');
    expect(vCard(card)).toBe(card);
  });

  it('accepts the same value in any position', () => {
    const optionsFirst = vCard({ attrs: { 'data-card': '1' } }, 'body');
    const optionsLast = vCard('body', { attrs: { 'data-card': '1' } });

    expect(optionsFirst.toHTML()).toContain('data-card="1"');
    expect(optionsFirst.toHTML()).toContain('body');
    expect(optionsLast.toHTML()).toContain('data-card="1"');
    expect(optionsLast.toHTML()).toContain('body');
  });

  it('applies more than three arguments in order', () => {
    const card = vCard({ attrs: { 'data-card': '1' } }, 'a', (node) => node.span('s'), 'b');

    expect(card.toHTML()).toContain('data-card="1"');
    expect(card.toHTML()).toContain('a<span>s</span>b');
  });
});
