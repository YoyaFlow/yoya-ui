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

    const message = document.querySelector('.yoya-vmessage');
    const countdown = message.querySelector('.yoya-vmessage-countdown');
    const bar = message.querySelector('.yoya-vmessage-countdown-bar');

    expect(countdown.textContent).toBe('3s');
    expect(bar.style.width).toBe('100%');

    vi.advanceTimersByTime(1000);
    expect(countdown.textContent).toBe('2s');

    vi.advanceTimersByTime(2000);
    expect(document.querySelector('.yoya-vmessage')).toBeNull();
  });

  it('hides the countdown with countdown false but still auto-closes', () => {
    const host = vMessageContainer().bindTo(document.body);

    host.show('稍后关闭', { countdown: false, duration: 1000 });

    expect(document.querySelector('.yoya-vmessage-countdown').style.display).toBe('none');

    vi.advanceTimersByTime(1000);
    expect(document.querySelector('.yoya-vmessage')).toBeNull();
  });

  it('renders countdown text on a standalone message', () => {
    const message = vMessage({ content: '保存成功', duration: 2000 }).bindTo(document.body);

    expect(message.renderDom().querySelector('.yoya-vmessage-countdown').textContent).toBe('2s');
    expect(message._countdownTimer).not.toBeNull();
    message.destroy();
    expect(message._countdownTimer).toBeNull();
  });
});
