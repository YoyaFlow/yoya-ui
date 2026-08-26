import { afterEach, describe, expect, it } from 'vitest';
import { VTooltip, div, vButton, vTooltip } from '../index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vTooltip', () => {
  it('renders target content and a hidden tooltip panel', () => {
    const tooltip = vTooltip({
      content: '保存后立即发布',
      placement: 'top',
      target: vButton('保存')
    });
    const element = tooltip.renderDom();
    const target = element.querySelector('.yoya-vtooltip-target');
    const panel = element.querySelector('.yoya-vtooltip-panel');

    expect(tooltip).toBeInstanceOf(VTooltip);
    expect(element.classList.contains('yoya-vtooltip')).toBe(true);
    expect(element.dataset.placement).toBe('top');
    expect(element.dataset.open).toBeUndefined();
    expect(target.textContent).toBe('保存');
    expect(panel.textContent).toBe('保存后立即发布');
    expect(panel.getAttribute('role')).toBe('tooltip');
    expect(panel.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens on hover and closes when the pointer leaves', () => {
    const tooltip = vTooltip({
      content: '悬停说明',
      target: '悬停区域'
    });
    const element = tooltip.renderDom();
    const target = element.querySelector('.yoya-vtooltip-target');

    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    expect(element.dataset.open).toBe('true');
    expect(element.querySelector('.yoya-vtooltip-panel').getAttribute('aria-hidden')).toBe('false');

    target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

    expect(element.dataset.open).toBeUndefined();
    expect(element.querySelector('.yoya-vtooltip-panel').getAttribute('aria-hidden')).toBe('true');
  });

  it('accepts top-left, bottom-left and other corner placement aliases', () => {
    const tooltip = vTooltip({
      content: '说明',
      placement: 'top-left',
      target: '目标'
    });
    const element = tooltip.renderDom();

    expect(element.dataset.placement).toBe('top-start');

    tooltip.placement('bottomLeft');
    expect(element.dataset.placement).toBe('bottom-start');

    tooltip.placement('right-top');
    expect(element.dataset.placement).toBe('right-start');

    tooltip.placement('left-bottom');
    expect(element.dataset.placement).toBe('left-end');
  });

  it('opens on focus and closes when focus moves away', () => {
    const tooltip = vTooltip({
      content: '查看配置说明',
      target: (target) => {
        target.vButton('查看');
      },
      trigger: 'focus'
    });
    const element = tooltip.renderDom();
    const button = element.querySelector('.yoya-vtooltip-target .yoya-vbutton');

    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(element.dataset.open).toBe('true');

    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(element.dataset.open).toBeUndefined();
  });

  it('toggles on click and closes from outside clicks', () => {
    document.body.innerHTML = '<button id="outside">外部</button>';
    const tooltip = vTooltip({
      content: '点击说明',
      target: '点击区域',
      trigger: 'click'
    }).bindTo(document.body);
    const element = tooltip.renderDom();
    const target = element.querySelector('.yoya-vtooltip-target');

    target.click();
    expect(element.dataset.open).toBe('true');

    document.querySelector('#outside').click();
    expect(element.dataset.open).toBeUndefined();
  });

  it('supports manual open and parent vTooltip shortcuts', () => {
    const tooltip = vTooltip({
      content: '初始提示',
      target: '状态',
      trigger: 'manual'
    });
    const page = div((root) => {
      root.vTooltip(tooltip);
    });
    const element = page.renderDom();
    const wrapper = element.querySelector('.yoya-vtooltip');

    expect(wrapper).not.toBeNull();

    tooltip.open(true);
    expect(wrapper.dataset.open).toBe('true');

    tooltip.content('更新提示');
    expect(wrapper.querySelector('.yoya-vtooltip-panel').textContent).toBe('更新提示');
  });
});
