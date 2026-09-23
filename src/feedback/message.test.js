import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vMessage, vMessageContainer } from '../index.js';

describe('VMessage countdown', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a default countdown and auto-closes when it ends', () => {
    const host = vMessageContainer().bindTo(document.body);

    host.info('保存成功', { duration: 3000 });

    const message = document.querySelector('[vn~="VMessage"]');
    const countdown = message.querySelector('[vn~="VMessageCountdown"]');
    const bar = message.querySelector('[vn~="VMessageCountdownBar"]');

    expect(countdown.textContent).toBe('3s');
    // 进度条宽度是量测出的动态值：走 CSS 变量（映射在样式表里）
    expect(bar.style.getPropertyValue('--yoya-message-countdown-progress')).toBe('100%');

    vi.advanceTimersByTime(1000);
    expect(countdown.textContent).toBe('2s');

    vi.advanceTimersByTime(2000);
    expect(document.querySelector('[vn~="VMessage"]')).toBeNull();
  });

  it('hides the countdown with countdown false but still auto-closes', () => {
    const host = vMessageContainer().bindTo(document.body);

    host.show('稍后关闭', { countdown: false, duration: 1000 });

    // 倒计时关掉 = 根上不写 `data-countdown`（CSS 默认隐藏这两块）
    expect(document.querySelector('[vn~="VMessage"]').hasAttribute('data-countdown')).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(document.querySelector('[vn~="VMessage"]')).toBeNull();
  });

  it('renders countdown text on a standalone message', () => {
    const message = vMessage({ content: '保存成功', duration: 2000 }).bindTo(document.body);

    expect(message.renderDom().querySelector('[vn~="VMessageCountdown"]').textContent).toBe('2s');
    message.destroy();
    // 计时器字段在视图根（节点类型）上；这里验行为：销毁后倒计时不再推进，消息也已摘除
    vi.advanceTimersByTime(2000);
    expect(document.querySelector('[vn~="VMessage"]')).toBeNull();
  });

  it('supports inline mode for local embedding and restores the floating layout', () => {
    const host = vMessageContainer({ inline: true, placement: 'top-right' });
    const element = host.renderDom();

    expect(element.dataset.inline).toBe('true');
    expect(element.dataset.placement).toBe('top-right');

    host.inline(false);
    expect(element.hasAttribute('data-inline')).toBe(false);
  });
});
