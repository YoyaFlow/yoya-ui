import { describe, expect, it, vi } from 'vitest';
import { div } from '../index.js';

describe('ViewNode event registry', () => {
  it('lets the latest on() call win for the same event', () => {
    const node = div();
    const first = vi.fn();
    const second = vi.fn();

    node.on('click', first);
    node.on('click', second);

    const element = node.renderDom();
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(first).not.toHaveBeenCalled();
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

    expect(first).not.toHaveBeenCalled();
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

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(2);
  });
});
