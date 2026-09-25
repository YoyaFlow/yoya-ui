/**
 * 票 01（vnode-convergence）：hydrate 路径也要触发组件钩子。
 *
 * 现状：`hydrate()` 先 `adoptElement()` 把既存 DOM 认领给节点，元素本来就在父元素里 →
 * 子节点循环里的 `placedInElement` 为真，跳过 `fireWhenMount`，于是一次都不触发；
 * SSR 页面上的第三方集成（初始化写在 `whenMount` 里）因此完全不工作。
 */
import { describe, expect, it } from 'vitest';
import { div, vNode } from '@yoyaflow/yoya-ui/ssr';
import { hydrate, renderToString } from '@yoyaflow/yoya-ui/ssr';

const makeWidget = (events) =>
  vNode((api) => {
    api.whenMount = (host) => events.push(['mount', Boolean(host.element()?.isConnected)]);
    api.whenDestroy = (host) => events.push(['destroy', host.element()?.className ?? null]);
    return div({ class: 'widget' }, '内容');
  });

describe('hydrate 触发组件钩子（票 01）', () => {
  it('嵌套组件：hydrate 后 whenMount 触发一次，元素已连通；destroy 触发 whenDestroy', () => {
    const events = [];
    const page = () => div((root) => root.child(makeWidget(events)));

    const { html } = renderToString(page);
    // 服务端那棵树渲染完就销毁（`renderToString` 拥有它），会触发一次 whenDestroy——那是服务端行为
    events.length = 0;
    document.body.innerHTML = `<div id="app">${html}</div>`;
    expect(events).toEqual([]);

    const node = hydrate(page, '#app');
    expect(events).toEqual([['mount', true]]);

    node.destroy();
    expect(events).toEqual([
      ['mount', true],
      ['destroy', 'widget']
    ]);
    document.body.innerHTML = '';
  });

  it('组件自己作根：hydrate 后同样触发一次', () => {
    const events = [];
    const { html } = renderToString(() => makeWidget(events));
    events.length = 0;
    document.body.innerHTML = `<div id="app">${html}</div>`;

    const node = hydrate(() => makeWidget(events), '#app');
    expect(events).toEqual([['mount', true]]);

    node.destroy();
    document.body.innerHTML = '';
  });

  it('幂等：hydrate 之后 flush / 再次 renderDom 都不重复触发', () => {
    const events = [];
    const page = () => div((root) => root.child(makeWidget(events)));
    const { html } = renderToString(page);
    events.length = 0;
    document.body.innerHTML = `<div id="app">${html}</div>`;

    const node = hydrate(page, '#app');
    expect(events).toHaveLength(1);

    node.flush();
    node.renderDom();
    expect(events).toEqual([['mount', true]]);

    node.destroy();
    document.body.innerHTML = '';
  });
});
