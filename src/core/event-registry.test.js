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
});
