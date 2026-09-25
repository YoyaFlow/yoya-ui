/**
 * 钩子归属链（`viewRoots()`）：元素属于**视图根**而不是定义它的那个节点时，`whenMount` /
 * `whenDestroy` / `rearmWhenMount` 都要沿链落到内层节点。两种形状：
 *
 * 1. 透明包装 `vClientOnly`（自己没有元素，元素就是内层组件的）；
 * 2. 组件嵌组件（一个组件的视图根本身是另一个组件）。
 *
 * 改前两者都**一次都不触发**（第三方集成的 `whenMount` 初始化被静默吞掉）；
 * 口径与票 01（hydrate）/ 票 02（落地收口）一致：一趟落地内幂等、后序触发（内层先）。
 */
import { describe, expect, it } from 'vitest';
import { div, ref, vClientOnly, vNode } from '../yoya.core.js';
import { hydrate, mount, renderToString } from './ssr.js';

/** 带钩子的假集成：记录触发次序与拿到的元素。 */
function makeWidget(name, log) {
  return () =>
    vNode((api) => {
      api.whenMount = (host) => log.push(['mount', name, host.element()?.className ?? '']);
      api.whenDestroy = () => log.push(['destroy', name]);
      return div({ class: `widget-${name}` });
    });
}

describe('钩子归属链（viewRoots）', () => {
  it('透明包装 vClientOnly：钩子落到内层组件，元素已连通', () => {
    const log = [];
    const widget = makeWidget('hook', log);
    const page = () => div((root) => root.child(vClientOnly(() => widget())));
    const target = document.createElement('div');
    document.body.appendChild(target);

    page().bindTo(target);

    expect(log).toEqual([['mount', 'hook', 'widget-hook']]);
    expect(target.querySelector('.widget-hook')).not.toBeNull();
    target.remove();
  });

  it('组件嵌组件：内层视图根先、外层组件后，各触发一次', () => {
    const log = [];
    const inner = makeWidget('inner', log);
    const outer = () =>
      vNode((api) => {
        api.whenMount = () => log.push(['mount', 'outer', '']);
        return inner();
      });
    const hook = vNode((api) => {
      api.whenMount = () => log.push(['mount', 'child', '']);
      return div({ class: 'child' });
    });
    const page = () => div((root) => root.child(outer()));

    page().bindTo(document.body);

    expect(log).toEqual([
      ['mount', 'inner', 'widget-inner'],
      ['mount', 'outer', '']
    ]);

    // 组件的直接子节点（普通元素路径）不受影响
    log.length = 0;
    const page2 = () => div((root) => root.child(hook));
    page2().bindTo(document.body);
    expect(log).toEqual([['mount', 'child', '']]);
  });

  it('mount() 与 hydrate() 两条落地路径都转发', () => {
    const mounted = [];
    const widget = makeWidget('island', mounted);
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(
      div((root) => root.child(vClientOnly(() => widget()))),
      target
    );
    expect(mounted).toEqual([['mount', 'island', 'widget-island']]);
    target.remove();

    // hydrate：服务端只出占位，客户端把占位换成真组件，钩子同样要触发
    const hydrated = [];
    const page = () =>
      div((root) => root.child(vClientOnly(() => makeWidget('island', hydrated)())));
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    hydrate(page, '#app');

    expect(hydrated).toEqual([['mount', 'island', 'widget-island']]);
    expect(document.querySelector('#app [data-client-only]')).toBeNull();
  });

  it('挂载条件转假再转真：内层组件重新触发一次', () => {
    const log = [];
    const widget = makeWidget('toggle', log);
    const visible = ref(true);
    const island = vClientOnly(() => widget()).mountable(visible);
    const target = document.createElement('div');
    document.body.appendChild(target);

    div((root) => root.child(island)).bindTo(target);
    expect(log.filter((entry) => entry[0] === 'mount')).toHaveLength(1);

    visible.value = false;
    visible.value = true;

    expect(log.filter((entry) => entry[0] === 'mount')).toHaveLength(2);
    target.remove();
  });

  it('销毁时内层组件的 whenDestroy 只触发一次', () => {
    const log = [];
    const widget = makeWidget('gone', log);
    const page = () => div((root) => root.child(vClientOnly(() => widget())));
    const node = page();
    node.bindTo(document.body);

    node.destroy();

    expect(log.filter((entry) => entry[0] === 'destroy')).toEqual([['destroy', 'gone']]);
  });
});
