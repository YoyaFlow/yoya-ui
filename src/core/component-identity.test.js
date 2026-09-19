/**
 * 组件身份（`vn`）：三种组件形态共用同一条判定。
 *
 * 形态 A 的成员是元素节点、形态 B / vNode 的成员是 `child()` 包出来的 ComponentNode，
 * 判定统一落到**视图根上的 `vn` 属性**：`x instanceof VCard` 与形态无关。
 */
import { describe, expect, it } from 'vitest';
import { div, span } from '../html/index.js';
import {
  ComponentNode,
  componentNameOf,
  defineComponentIdentity,
  hasComponentIdentity
} from './node.js';
import { vNode } from './v-node.js';

/** 形态 A：薄工厂，直接返回 ViewNode。 */
function ServiceTag() {
  return span({ vn: 'ServiceTag', class: 'yoya-service-tag' }, 'tag');
}

/** 形态 B：组件对象。 */
function RateCard() {
  return {
    render() {
      return div({ vn: 'RateCard' }, 'rate');
    }
  };
}

/** vNode：setup 里给视图根写身份。 */
function Chart() {
  return vNode(() => div({ vn: 'Chart' }, 'chart'));
}

/** 多根组件：任一视图根带身份即算命中。 */
function SplitPanel() {
  return {
    render() {
      return [div('left'), div({ vn: 'SplitPanel' }, 'right')];
    }
  };
}

/** 形态 C（兼容路径）：类节点组件，身份靠原型链兜底。 */
class LegacyBadge extends ComponentNode {
  constructor() {
    super({ render: () => span({ class: 'yoya-legacy-badge' }, 'legacy') });
  }
}

/** 不写身份、render 又会抛的组件：判定应当返回 false，而不是把调用方炸掉。 */
function Broken() {
  return {
    render() {
      throw new Error('boom');
    }
  };
}

defineComponentIdentity(ServiceTag, 'ServiceTag');
defineComponentIdentity(RateCard, 'RateCard');
defineComponentIdentity(Chart, 'Chart');
defineComponentIdentity(SplitPanel, 'SplitPanel');
defineComponentIdentity(LegacyBadge, 'LegacyBadge');

describe('component identity (vn)', () => {
  it('answers the same way for form A, form B and vNode', () => {
    const page = div((root) => {
      root.child(ServiceTag());
      root.child(RateCard());
      root.child(Chart());
      root.child(SplitPanel());
      root.child(div('plain'));
    });

    const children = page.children();
    const pick = (definition) => children.filter((child) => child instanceof definition).length;

    expect(children).toHaveLength(5);
    expect(pick(ServiceTag)).toBe(1); // 形态 A：成员就是元素节点
    expect(pick(RateCard)).toBe(1); // 形态 B：成员是 ComponentNode，展开到视图根
    expect(pick(Chart)).toBe(1); // vNode：同上
    expect(pick(SplitPanel)).toBe(1); // 多根：任一命中
    expect(children[4] instanceof ServiceTag).toBe(false);
    expect(children[1] instanceof Chart).toBe(false);
    expect(children[2] instanceof RateCard).toBe(false);
  });

  it('keeps prototype identity as a fallback for class components', () => {
    const legacy = new LegacyBadge();

    expect(legacy instanceof LegacyBadge).toBe(true);
    // 类组件没写 vn，兜底判定仍然认（迁移期老组件不会静默断）
    expect(componentNameOf(legacy)).toBeNull();
    expect(hasComponentIdentity(legacy, 'LegacyBadge')).toBe(false);
  });

  it('reads identity from the DOM too (cloned / adopted nodes, raw elements)', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div vn="VCard"><span>片段</span></div>';
    const element = host.firstElementChild;

    expect(componentNameOf(element)).toBe('VCard');

    // 节点自己没写过属性、DOM 上有 → 回读命中
    const adopted = div();
    adopted._el = element;
    expect(componentNameOf(adopted)).toBe('VCard');
  });

  it('matches every name listed in a multi-value identity', () => {
    const wrapped = div({ vn: 'VCard UserCard' }, 'x');

    expect(hasComponentIdentity(wrapped, 'VCard')).toBe(true);
    expect(hasComponentIdentity(wrapped, 'UserCard')).toBe(true);
    expect(hasComponentIdentity(wrapped, 'VTable')).toBe(false);
  });

  it('does not mistake class names, bare component objects or broken renders', () => {
    // 类名不参与判定：只有 yoya-* 类名、没有 vn → 不算
    expect(div((node) => node.className('yoya-card')) instanceof ServiceTag).toBe(false);

    // 裸组件对象不是树成员 → 不算（判定针对 children() 里的成员）
    expect(RateCard() instanceof RateCard).toBe(false);

    // render 抛错 → false，不把判定炸掉
    const broken = div((root) => root.child(new ComponentNode(Broken())));
    expect(broken.children()[0] instanceof RateCard).toBe(false);
    expect(componentNameOf(broken.children()[0])).toBeNull();
  });

  it('rejects a missing definition or name', () => {
    expect(() => defineComponentIdentity(null, 'X')).toThrow(/component factory function/);
    expect(() => defineComponentIdentity(() => {}, '')).toThrow(/component factory function/);
  });
});
