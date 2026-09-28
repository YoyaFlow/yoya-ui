import { describe, expect, it, vi } from 'vitest';
import { div } from '@yoyaflow/yoya-core';

describe('ViewNode event registry', () => {
  it('keeps every handler registered for the same event, in registration order', () => {
    const node = div();
    const first = vi.fn();
    const second = vi.fn();
    const order = [];
    first.mockImplementation(() => order.push('first'));
    second.mockImplementation(() => order.push('second'));

    node.on('click', first);
    node.on('click', second);

    const element = node.renderDom();
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['first', 'second']);
  });

  it('registers the same handler only once per event name', () => {
    const node = div();
    const handler = vi.fn();

    node.on('click', handler);
    node.on('click', handler);

    const element = node.renderDom();
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes one handler at a time and all handlers for an event name', () => {
    const node = div();
    const first = vi.fn();
    const second = vi.fn();
    node.on('click', first);
    node.on('click', second);

    node.off('click', first);
    const element = node.renderDom();
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    node.off('click');
    element.dispatchEvent(new Event('click', { bubbles: true }));
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps handlers for different events independent', () => {
    const node = div();
    const click = vi.fn();
    const input = vi.fn();
    node.on('click', click);
    node.on('input', input);

    const element = node.renderDom();
    element.dispatchEvent(new Event('click', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(input).toHaveBeenCalledTimes(1);
  });

  it('binds events registered after the node is mounted without duplicates', () => {
    const node = div();
    const element = node.renderDom();
    const first = vi.fn();
    const second = vi.fn();

    node.on('click', first);
    node.on('click', second);
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('rebinds the adapter when listener options change', () => {
    const node = div();
    const element = node.renderDom();
    const handler = vi.fn();

    node.on('click', handler, { once: true });
    element.dispatchEvent(new Event('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    node.on('click', handler, undefined);
    element.dispatchEvent(new Event('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('supports once semantics and removes the adapter after firing', () => {
    const node = div();
    const element = node.renderDom();
    const handler = vi.fn();

    node.on('click', handler, { once: true });
    element.dispatchEvent(new Event('click', { bubbles: true }));
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes the DOM adapter on destroy', () => {
    const node = div();
    const element = node.renderDom();
    const handler = vi.fn();
    node.on('click', handler);

    node.destroy();
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not double-bind when a setup-style callback re-registers handlers', () => {
    const node = div();
    const element = node.renderDom();
    const first = vi.fn();
    const second = vi.fn();

    node.on('click', first);
    node.on('click', second);

    element.dispatchEvent(new Event('click', { bubbles: true }));
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('binds one DOM listener per event type and drops it when the last handler goes', () => {
    const node = div();
    const element = node.renderDom();
    const click = vi.fn();
    const input = vi.fn();

    node.on('click', click);
    node.on('input', input);

    // 两个类型 = 两个监听器（DOM 只按类型挂），但共用一个派发函数
    expect(node._domAdapters.size).toBe(2);
    expect(node._domAdapters.get('click').element).toBe(element);

    node.off('click');
    expect(node._domAdapters.has('click')).toBe(false);
    expect(node._domAdapters.has('input')).toBe(true);

    node.off('input');
    expect(node._domAdapters.size).toBe(0);
    expect(node._events).toBeUndefined();
  });

  it('does not allocate an event container before the first on() call', () => {
    const node = div();
    node.renderDom();

    expect('_events' in node).toBe(false);
    expect('_domAdapters' in node).toBe(false);
    expect('_dispatch' in node).toBe(false);

    node.on('click', () => {});

    expect(node._events).toBeInstanceOf(Map);
    expect(typeof node._dispatch).toBe('function');
  });
});
