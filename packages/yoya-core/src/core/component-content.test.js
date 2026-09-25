/**
 * 票 42 / T2：组件的内容侧 = 普通元素语义。
 *
 * 未标记的 `child(...)` 落进组件**根元素内部**（追加在结构之后）；`children()` 读得到；
 * SSR / 客户端一致；销毁干净；多根组件没有单一容器 → 明确报错。
 */
import { describe, expect, it } from 'vitest';
import { div, p, ref, vNode } from '@yoyaflow/yoya-core';
import { renderToString } from './ssr.js';

const mountToHost = (node) => {
  document.body.innerHTML = '';
  const host = document.createElement('div');
  document.body.appendChild(host);
  node.bindTo(host);
  return host;
};

describe('component content side', () => {
  it('renders unmarked children inside the component root', () => {
    const card = vNode(() => div((root) => root.span('body')));
    card.child(p('extra'));

    const host = mountToHost(card);

    expect(host.innerHTML).toBe('<div><span>body</span><p>extra</p></div>');
    expect(card.children().length).toBe(2);
  });

  it('accepts children after the component is resolved', () => {
    const card = vNode(() => div((root) => root.span('body')));
    const host = mountToHost(card);

    card.child(p('late'));

    expect(host.innerHTML).toBe('<div><span>body</span><p>late</p></div>');
    expect(card.children().map((child) => child.tagName?.() ?? null)).toContain('p');
  });

  it('reports content dropped in before the view resolved, without adopting it into the root', () => {
    const card = vNode(() => div((root) => root.span('body')));

    card.child(p('early'));

    // 未解析：内容先排在组件节点上，children() 如实读出（容器要遍历自己的内容时不必先解包视图根）
    expect(card.children()).toHaveLength(1);
    expect(card.children()[0].tagName()).toBe('p');

    // 解析之后内容住进根元素：仍然只报一次
    const host = mountToHost(card);
    expect(host.innerHTML).toBe('<div><span>body</span><p>early</p></div>');
    expect(card.children()).toHaveLength(2);
  });

  it('keeps server and client output identical', () => {
    const build = () => {
      const card = vNode(() => div((root) => root.span('body')));
      card.child(p('extra'));
      return card;
    };

    const { html } = renderToString(build());
    expect(html).toBe('<div><span>body</span><p>extra</p></div>');
    expect(mountToHost(build()).innerHTML).toBe(html);
  });

  it('destroys content together with the component', () => {
    const card = vNode(() => div('body'));
    const extra = p('extra');
    card.child(extra);
    mountToHost(card);

    card.destroy();

    expect(extra._deleted).toBe(true);
  });

  it('rejects children on a multi-root component', () => {
    const multi = vNode(() => [p('a'), p('b')]);
    multi.child(p('extra'));

    expect(() => mountToHost(multi)).toThrow(/multiple roots/);
  });

  it('keeps live values working for content', () => {
    const label = ref('x');
    const card = vNode(() => div((root) => root.span('body')));
    card.child(div((node) => node.child(label)));

    const host = mountToHost(card);
    expect(host.textContent).toBe('bodyx');

    label.value = 'y';
    expect(host.textContent).toBe('bodyy');
  });
});
