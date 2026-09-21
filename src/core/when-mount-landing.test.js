/**
 * 票 02（vnode-convergence）方案 A：`whenMount` 在**整趟落地收口**时触发。
 *
 * 改前：钩子在"元素接进父元素"的瞬间触发，嵌套组件拿到的元素还没进文档
 * （`isConnected === false`）——第三方集成要测量就得自己补 rAF。
 * 改后：一趟落地（`bindTo` / `mount` / `hydrate`）里的钩子统一登记，收口时按落地顺序触发，
 * 那时元素已经挂在文档里。
 */
import { describe, expect, it } from 'vitest';
import { div, ref, vNode } from '../yoya.core.js';
import { mount } from './ssr.js';

describe('whenMount 落地收口（票 02 / 方案 A）', () => {
  it('嵌套组件：bindTo 之后触发时元素已连通', () => {
    const seen = [];
    const widget = () =>
      vNode((api) => {
        api.whenMount = (host) => seen.push(Boolean(host.element()?.isConnected));
        return div({ class: 'widget' });
      });
    const page = () => div((root) => root.child(widget()));
    const target = document.createElement('div');
    document.body.appendChild(target);

    page().bindTo(target);
    expect(seen).toEqual([true]);
    target.remove();
  });

  it('mount() 之后同样已连通，且根组件自己的钩子也触发', () => {
    const events = [];
    const component = vNode((api) => {
      api.whenMount = (host) => events.push(['root', Boolean(host.element()?.isConnected)]);
      return div({ class: 'root' }, '内容');
    });
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(component, target);
    expect(events).toEqual([['root', true]]);
    target.remove();
  });

  it('后插的组件仍然在元素落地后立刻触发', () => {
    const seen = [];
    const target = document.createElement('div');
    document.body.appendChild(target);
    const page = div((root) => root.className('page'));
    page.bindTo(target);

    page.child(
      vNode((api) => {
        api.whenMount = (host) => seen.push(Boolean(host.element()?.isConnected));
        return div({ class: 'late' });
      })
    );
    page.renderDom();
    expect(seen).toEqual([true]);
    target.remove();
  });

  it('落地期间转假的条件组件不触发，条件转真时才触发', () => {
    const visible = ref(false);
    const seen = [];
    const target = document.createElement('div');
    document.body.appendChild(target);

    const page = div((root) =>
      root.child(
        vNode((api) => {
          api.whenMount = (host) => seen.push(Boolean(host.element()?.isConnected));
          return div({ class: 'conditional' });
        }).mountable(visible)
      )
    );
    page.bindTo(target);
    expect(seen).toEqual([]);

    visible.value = true;
    expect(seen).toEqual([true]);
    target.remove();
  });
});
