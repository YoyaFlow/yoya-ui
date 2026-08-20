import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VMessageManager, div, toast, vMessageContainer, vMessageManager } from './index.js';

describe('VMessageManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('binds and manages an independent local message container', () => {
    const firstHost = document.createElement('section');
    const secondHost = document.createElement('section');
    document.body.append(firstHost, secondHost);
    const first = vMessageManager({ placement: 'bottom-left' }).bindTo(firstHost);
    const second = vMessageManager().bindTo(secondHost);

    const id = first.show('第一个局部消息', { duration: 0 });
    second.show('第二个局部消息', { duration: 0 });

    expect(first).toBeInstanceOf(VMessageManager);
    expect(firstHost.querySelector('[data-placement="bottom-left"]')).not.toBeNull();
    expect(firstHost.textContent).toContain('第一个局部消息');
    expect(firstHost.textContent).not.toContain('第二个局部消息');
    expect(secondHost.textContent).toContain('第二个局部消息');

    first.close(id);
    expect(firstHost.textContent).not.toContain('第一个局部消息');
    expect(secondHost.textContent).toContain('第二个局部消息');
  });

  it('replaces duplicate ids and delegates every message type shortcut', () => {
    const manager = vMessageManager().bindTo(document.body);

    manager.show('旧消息', { id: 'save', duration: 0 });
    manager.success('新消息', { id: 'save', duration: 0 });
    manager.error('错误消息', { duration: 0 });
    manager.warning('警告消息', { duration: 0 });
    manager.info('提示消息', { duration: 0 });

    expect(document.querySelectorAll('.yoya-vmessage')).toHaveLength(4);
    expect(document.body.textContent).not.toContain('旧消息');
    expect(document.querySelector('[data-type="success"]').textContent).toContain('新消息');
    expect(document.querySelector('[data-type="error"]').textContent).toContain('错误消息');
    expect(document.querySelector('[data-type="warning"]').textContent).toContain('警告消息');
    expect(document.querySelector('[data-type="info"]').textContent).toContain('提示消息');

    expect(manager.clear()).toBe(manager);
    expect(document.querySelectorAll('.yoya-vmessage')).toHaveLength(0);
  });

  it('exposes its container for existing toast compatibility', () => {
    const manager = vMessageManager().bindTo(document.body);
    const previousContainer = toast._container;

    try {
      expect(vMessageManager(manager)).toBe(manager);
      toast.use(manager.container()).info('兼容消息', { duration: 0 });

      expect(document.body.textContent).toContain('兼容消息');
      toast.clear();
      expect(document.body.textContent).not.toContain('兼容消息');
    } finally {
      toast.use(previousContainer);
      manager.destroy();
    }

    expect(toast._container).toBe(previousContainer);
  });

  it('participates in its parent ViewNode lifecycle', () => {
    vi.useFakeTimers();
    const manager = vMessageManager();
    const close = vi.spyOn(manager.container(), 'close');
    const root = div((page) => page.child(manager)).bindTo(document.body);
    manager.show('随页面销毁', { id: 'page-message', duration: 1000 });

    root.destroy();
    vi.advanceTimersByTime(1000);

    expect(close).toHaveBeenCalledTimes(1);
    expect(manager.show('已销毁', { duration: 0 })).toBe(null);
    expect(document.querySelector('.yoya-vmessage-container')).toBeNull();
  });

  it('destroys an injected container with its messages, timer, events, and DOM', () => {
    vi.useFakeTimers();
    const container = vMessageContainer();
    const close = vi.spyOn(container, 'close');
    const manager = new VMessageManager({ container }).bindTo(document.body);
    manager.show('稍后关闭', { id: 'later', duration: 1000 });
    const closeButton = document.querySelector('.yoya-vmessage-close');
    const removeEventListener = vi.spyOn(closeButton, 'removeEventListener');

    expect(manager.container()).toBe(container);
    expect(manager.destroy()).toBe(manager);
    expect(manager.destroy()).toBe(manager);
    vi.advanceTimersByTime(1000);

    expect(close).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledWith('click', expect.any(Function), undefined);
    expect(document.querySelector('.yoya-vmessage-container')).toBeNull();
    expect(manager.show('已销毁', { duration: 0 })).toBe(null);
    expect(manager.success('已销毁', { duration: 0 })).toBe(null);
    expect(manager.error('已销毁', { duration: 0 })).toBe(null);
    expect(manager.warning('已销毁', { duration: 0 })).toBe(null);
    expect(manager.info('已销毁', { duration: 0 })).toBe(null);
    expect(manager.bindTo(document.body)).toBe(manager);
    expect(manager.close('later')).toBe(manager);
    expect(manager.clear()).toBe(manager);
    expect(document.querySelector('.yoya-vmessage-container')).toBeNull();
  });
});
