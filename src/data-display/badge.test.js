import { describe, expect, it } from 'vitest';
import { div, vBadge } from '../index.js';

describe('vBadge', () => {
  it('renders standalone count badges and hides zero by default', () => {
    const badge = vBadge(5);
    const element = badge.renderDom();
    const box = element.querySelector('.yoya-vbadge-count');

    expect(box.textContent).toBe('5');
    expect(box.style.display).not.toBe('none');
    expect(box.style.position).toBe('static');
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
    const box = element.querySelector('.yoya-vbadge-count');

    expect(box.textContent).toBe('99+');

    badge.overflowCount(500);

    expect(box.textContent).toBe('120');
  });

  it('wraps child content and positions the badge at the top right', () => {
    const badge = vBadge({ count: 8, children: '消息' });
    const element = badge.renderDom();
    const box = element.querySelector('.yoya-vbadge-count');

    expect(element.querySelector('.yoya-vbadge-content').textContent).toBe('消息');
    expect(box.style.position).toBe('absolute');
    expect(box.style.transform).toContain('translate(calc(50% + 0px)');
    expect(element.dataset.standalone).toBeUndefined();

    badge.offset({ x: 4, y: -2 });

    expect(badge.offset()).toEqual({ x: 4, y: -2 });
    expect(box.style.transform).toContain('calc(50% + 4px)');
    expect(box.style.transform).toContain('calc(-50% + -2px)');
  });

  it('supports dot and status modes with custom colors and text', () => {
    const dotBadge = vBadge({ dot: true, children: '通知' });
    const dotElement = dotBadge.renderDom();
    const dotBox = dotElement.querySelector('.yoya-vbadge-count');

    expect(dotBox.style.display).not.toBe('none');
    expect(dotBox.textContent).toBe('');
    expect(dotBox.style.width).toBe('8px');
    expect(dotBox.style.borderRadius).toBe('999px');

    const statusBadge = vBadge({ status: 'success', text: '运行中' });
    const statusElement = statusBadge.renderDom();
    const statusBox = statusElement.querySelector('.yoya-vbadge-count');

    expect(statusElement.dataset.status).toBe('success');
    expect(statusBox.style.background).toBe('rgb(82, 196, 26)');
    expect(statusElement.querySelector('.yoya-vbadge-text').textContent).toBe('运行中');

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
    const box = element.querySelector('.yoya-vbadge-count');

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
    const box = element.querySelector('.yoya-vbadge-count');

    expect(element.textContent).toContain('告警');
    expect(box.textContent).toBe('4');

    badge.count(12);
    badge.text('待处理');

    expect(box.textContent).toBe('12');
    expect(element.querySelector('.yoya-vbadge-text').textContent).toBe('待处理');
  });
});
