/**
 * 组件身份（`vn`）契约：**对象事实 + 真 DOM 属性**两处都有，判定走 `componentNameOf` /
 * `hasComponentIdentity`——`defineComponentIdentity` 与 `instanceof VXxx` 都已在票 15 波 6 退场。
 */
import { describe, expect, it } from 'vitest';
import { div, span, HtmlElementNode } from '../html/index.js';
import { ComponentNode, componentNameOf, hasComponentIdentity, viewRootOf } from './node.js';
import { vNode } from './v-node.js';

/** 形态 A：薄工厂，直接返回 ViewNode。 */
function ServiceTag() {
  return span({ class: 'yoya-service-tag', vn: 'ServiceTag' }, 'tag');
}

/** vNode：setup 里给视图根写身份。 */
function Chart() {
  return vNode(() => div({ vn: 'Chart' }, 'chart'));
}

/** 包装型 / 多值身份：同时是 `VDropdownMenu`。 */
function LanguageSwitch() {
  return vNode(() => div({ vn: 'LanguageSwitch VDropdownMenu' }, 'switch'));
}

/** 视图根是**节点类型扩展**（类节点自己写 `vn`）：判定要展开到视图根。 */
class PanelNode extends HtmlElementNode {
  constructor() {
    super('div', { vn: 'Panel' });
  }
}

function Panel() {
  return vNode(() => new PanelNode());
}

/** 多根组件：任一视图根带身份即算命中。 */
function SplitPanel() {
  return vNode(() => [div('left'), div({ vn: 'SplitPanel' }, 'right')]);
}

/** render 又会抛的对象组件（票 03 的兼容路径）：判定应当返回 false，而不是把调用方炸掉。 */
function Broken() {
  return {
    render() {
      throw new Error('boom');
    }
  };
}

describe('component identity (vn)', () => {
  it('身份是对象事实，同时落到真 DOM', () => {
    const marked = div({ class: 'VCard', vn: 'VCard' }, 'x');

    expect(componentNameOf(marked)).toBe('VCard');
    expect(hasComponentIdentity(marked, 'VCard')).toBe(true);

    // 身份同时落到真 DOM：元素属性与 SSR 输出都带 `vn`（GenUI 可扫）
    const element = marked.renderDom();

    expect(element.getAttribute('vn')).toBe('VCard');
    expect(marked.toHTML()).toContain('vn="VCard"');

    // 反过来：只手写 DOM 属性不再是身份
    const raw = document.createElement('div');

    raw.setAttribute('vn', 'VCard');
    expect(componentNameOf(raw)).toBeNull();
    expect(hasComponentIdentity(raw, 'VCard')).toBe(false);
  });

  it('形态 A / vNode / 多根 / 节点类型扩展视图根都认', () => {
    const page = div((root) => {
      root.child(ServiceTag());
      root.child(Chart());
      root.child(Panel());
      root.child(SplitPanel());
      root.child(div('plain'));
    });
    const children = page.children();
    const count = (name) => children.filter((child) => hasComponentIdentity(child, name)).length;

    expect(children).toHaveLength(5);
    expect(count('ServiceTag')).toBe(1); // 形态 A：成员就是元素节点
    expect(count('Chart')).toBe(1); // vNode：成员是 ComponentNode，展开到视图根
    expect(count('Panel')).toBe(1); // 视图根是节点类型扩展（类节点自己写 vn）
    expect(count('SplitPanel')).toBe(1); // 多根：任一命中
    expect(count('VCard')).toBe(0);
    expect(componentNameOf(children[4])).toBeNull();
  });

  it('多值身份每个名字都命中（包装型组件）', () => {
    const wrapped = LanguageSwitch();

    expect(hasComponentIdentity(wrapped, 'LanguageSwitch')).toBe(true);
    expect(hasComponentIdentity(wrapped, 'VDropdownMenu')).toBe(true);
    expect(hasComponentIdentity(wrapped, 'VTable')).toBe(false);

    const root = div({ vn: 'VCard UserCard' }, 'x');

    expect(hasComponentIdentity(root, 'VCard')).toBe(true);
    expect(hasComponentIdentity(root, 'UserCard')).toBe(true);
  });

  it('类名与裸组件对象都不参与判定', () => {
    // 只有 yoya-* 类名、没有 vn → 不算
    expect(componentNameOf(div((node) => node.className('yoya-card')))).toBeNull();

    // 裸对象不是节点 → 不算
    expect(componentNameOf({ render: () => div('x') })).toBeNull();
    expect(componentNameOf(null)).toBeNull();
    expect(componentNameOf(undefined)).toBeNull();
  });

  it('render 抛错时不炸判定，也不误报身份', () => {
    const broken = div((root) => root.child(new ComponentNode(Broken())));
    const member = broken.children()[0];

    expect(componentNameOf(member)).toBeNull();
    expect(hasComponentIdentity(member, 'Chart')).toBe(false);
    expect(viewRootOf(member)).toBeNull();
  });

  it('adopt / hydrate 之后仍然认（身份跟着客户端那棵树的节点走）', async () => {
    const { hydrate, renderToString } = await import('./ssr.js');
    const page = () => div((root) => root.child(Chart()));

    const { html } = renderToString(page);

    expect(html).toContain('vn="Chart"');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const tree = hydrate(page, '#app');

    expect(hasComponentIdentity(tree.children()[0], 'Chart')).toBe(true);

    tree.destroy();
    document.body.innerHTML = '';
  });
});
