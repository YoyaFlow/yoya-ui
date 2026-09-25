/**
 * 票 07：形态 B（对象组件 `{ render(), … }`）**不再是支持的写法**。
 *
 * 阶段 1 的弃用提示已随分支一起退场；现在所有入口都是硬错误（说清替代写法），
 * 组件只有 A 薄工厂 / B `vNode` 两种形态。
 */
import { afterEach, describe, expect, it } from 'vitest';
import { ComponentNode } from './node.js';
import { div, vNode } from '../yoya.core.js';
import { hydrate, renderToString } from './ssr.js';
import { vClientOnly } from './client-only.js';

const shapeB = () => ({
  render: () => div({ class: 'shape-b' }, 'x'),
  label: () => 'shape-b'
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('形态 B 已退场（对象组件）', () => {
  it('child(对象) 直接报错，并指出替代写法', () => {
    expect(() => div((root) => root.child(shapeB()))).toThrowError(/ViewNode child must/);
  });

  it('ComponentNode 只收组件定义函数', () => {
    expect(() => new ComponentNode(shapeB())).toThrowError(
      /requires a component definition function/
    );
    expect(() => new ComponentNode(() => div('ok'))).not.toThrow();
  });

  it('renderToString / hydrate 收到页面对象时报错', () => {
    expect(() => renderToString({ render: () => div('page') })).toThrowError(/requires a ViewNode/);
    expect(() => hydrate({ render: () => div('page') }, document.body)).toThrowError(
      /requires a ViewNode/
    );
  });

  it('vClientOnly 的 loader 返回对象时报错', () => {
    const placeholder = vClientOnly(() => shapeB());

    expect(() => placeholder.renderDom()).toThrowError(/must return a ViewNode/);
  });

  it('vNode 组件与页面工厂照旧可用', () => {
    const card = vNode((api) => {
      api.label = () => 'vNode';
      return div({ class: 'card' });
    });
    const page = div((root) => root.child(card));

    expect(page.toHTML()).toContain('class="card"');
    expect(renderToString(() => page).html).toContain('class="card"');
  });
});
