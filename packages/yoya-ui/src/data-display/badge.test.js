import { describe, expect, it } from 'vitest';
import { VBadge, div, ref, vBadge } from '../index.js';

describe('vBadge', () => {
  it('defines the component as a named function and keeps nesting via .setup()', () => {
    const node = VBadge({ count: 9 }).setup((badge) => {
      // 单内容位：内容走 props / `content()` 命令（没有 `vn_slot` 占位，不认组件外 `.child()` 投递）
      badge.content('订单');
      badge.text('待处理');
      badge.count(10);
    });
    const element = node.renderDom();

    expect(element.querySelector('[vn~="VBadgeContent"]').textContent).toBe('订单');
    expect(element.querySelector('[vn~="VBadgeText"]').textContent).toBe('待处理');
    expect(element.querySelector('[vn~="VBadgeCount"]').textContent).toBe('10');
    expect(element.dataset.standalone).toBeUndefined();

    node.count(11);

    expect(element.querySelector('[vn~="VBadgeCount"]').textContent).toBe('11');
  });

  it('renders standalone count badges and hides zero by default', () => {
    const badge = vBadge(5);
    const element = badge.renderDom();
    const box = element.querySelector('[vn~="VBadgeCount"]');

    expect(box.textContent).toBe('5');
    expect(box.style.display).not.toBe('none');
    // 没有内容：内容框空、按独立徽标渲染（定位 / 位移由 CSS 按 data-standalone 开关）
    expect(element.querySelector('[vn~="VBadgeContent"]').children).toHaveLength(0);
    expect(element.dataset.standalone).toBe('true');

    badge.count(0);

    expect(box.style.display).toBe('none');

    badge.showZero(true);

    expect(box.style.display).not.toBe('none');
    expect(box.textContent).toBe('0');
  });

  it('applies overflowCount to numeric counts', () => {
    const badge = vBadge({ count: 120 });
    const element = badge.renderDom();
    const box = element.querySelector('[vn~="VBadgeCount"]');

    expect(box.textContent).toBe('99+');

    badge.overflowCount(500);

    expect(box.textContent).toBe('120');
  });

  it('wraps child content and positions the badge at the top right', () => {
    const badge = vBadge({ count: 8, children: '消息' });
    const element = badge.renderDom();
    const box = element.querySelector('[vn~="VBadgeCount"]');

    expect(element.querySelector('[vn~="VBadgeContent"]').textContent).toBe('消息');
    expect(element.dataset.standalone).toBeUndefined();
    // 定位 / 位移归 CSS（`[data-standalone]` 那条规则 + 变量），JS 只把偏移注进去
    expect(box.style.getPropertyValue('--yoya-badge-offset-x')).toBe('0px');

    badge.offset({ x: 4, y: -2 });

    expect(badge.offset()).toEqual({ x: 4, y: -2 });
    expect(box.style.getPropertyValue('--yoya-badge-offset-x')).toBe('4px');
    expect(box.style.getPropertyValue('--yoya-badge-offset-y')).toBe('-2px');
  });

  it('supports dot and status modes with custom colors and text', () => {
    const dotBadge = vBadge({ dot: true, children: '通知' });
    const dotElement = dotBadge.renderDom();
    const dotBox = dotElement.querySelector('[vn~="VBadgeCount"]');

    expect(dotBox.style.display).not.toBe('none');
    expect(dotBox.textContent).toBe('');
    // 点模式的几何（8px / 999px / padding 0）在 CSS 里，按根上的 data-dot 命中
    expect(dotElement.dataset.dot).toBe('true');

    const statusBadge = vBadge({ status: 'success', text: '运行中' });
    const statusElement = statusBadge.renderDom();
    const statusBox = statusElement.querySelector('[vn~="VBadgeCount"]');

    expect(statusElement.dataset.status).toBe('success');
    expect(statusBox.style.background).toContain('var(--yoya-color-success');
    expect(statusElement.querySelector('[vn~="VBadgeText"]').textContent).toBe('运行中');

    statusBadge.color('#0f766e');

    expect(statusBox.style.background).toBe('rgb(15, 118, 110)');
  });

  it('supports object setup, shared element options, and final callbacks', () => {
    let callbackNode = null;
    const badge = vBadge(
      { count: 2, children: '构建' },
      { attrs: { id: 'build-badge' }, style: { maxWidth: '80px' } },
      (node) => {
        callbackNode = node;
        node.count(3);
      }
    );
    const element = badge.renderDom();
    const box = element.querySelector('[vn~="VBadgeCount"]');

    expect(callbackNode).toBe(badge);
    expect(element.id).toBe('build-badge');
    expect(element.style.maxWidth).toBe('80px');
    expect(box.textContent).toBe('3');
  });

  it('registers vBadge as a parent shortcut and supports live updates', () => {
    const root = div();
    root.vBadge({ count: 4, children: '告警' });

    const badge = root.children()[0];
    const element = root.renderDom();
    const box = element.querySelector('[vn~="VBadgeCount"]');

    expect(element.textContent).toContain('告警');
    expect(box.textContent).toBe('4');

    badge.count(12);
    badge.text('待处理');

    expect(box.textContent).toBe('12');
    expect(element.querySelector('[vn~="VBadgeText"]').textContent).toBe('待处理');
  });

  it('takes handles as props：给句柄就是活值，不用命令', () => {
    const count = ref(3);
    const dot = ref(false);
    const showZero = ref(false);
    const badge = vBadge({ children: '消息', count, dot, showZero });
    const element = badge.renderDom();
    const box = element.querySelector('[vn~="VBadgeCount"]');

    expect(box.textContent).toBe('3');

    count.value = 9;

    expect(box.textContent).toBe('9');
    expect(element.dataset.count).toBe('9');

    // 归一化的 props（布尔）也要保活：句柄不能被构建期的 Boolean() 吃掉
    count.value = 0;

    expect(box.style.display).toBe('none');

    showZero.value = true;

    expect(box.style.display).not.toBe('none');

    dot.value = true;

    expect(element.dataset.dot).toBe('true');
  });
});
