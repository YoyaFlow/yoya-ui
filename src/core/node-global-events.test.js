import { describe, expect, it, vi } from 'vitest';
import { bindWindowEvent, div } from '../index.js';

describe('node-owned global event bindings', () => {
  it('binds window events to the node and unbinds on destroy', () => {
    const handler = vi.fn();
    const node = div();

    const returned = node.bindWindowEvent('resize', handler);
    expect(returned).toBe(node);

    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);

    node.destroy();
    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('binds document events to the node and unbinds on destroy', () => {
    const handler = vi.fn();
    const node = div().bindDocumentEvent('click', handler);

    document.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);

    node.destroy();
    document.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('releases stale listeners across region rebuilds', () => {
    const handlers = [];
    const region = div((el) => {
      el.rebuildable();
      const handler = vi.fn();
      handlers.push(handler);
      el.bindWindowEvent('resize', handler);
    });
    region.renderDom();

    region.rebuild();
    region.rebuild();

    window.dispatchEvent(new Event('resize'));
    expect(handlers[0]).not.toHaveBeenCalled();
    expect(handlers[1]).not.toHaveBeenCalled();
    expect(handlers[2]).toHaveBeenCalledTimes(1);

    region.destroy();
    window.dispatchEvent(new Event('resize'));
    expect(handlers[2]).toHaveBeenCalledTimes(1);
  });

  it('keeps the standalone bindWindowEvent usage unchanged', () => {
    const handler = vi.fn();
    const unbind = bindWindowEvent('resize', handler);

    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);

    unbind();
    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('survives repeated destroy calls', () => {
    const node = div().bindWindowEvent('resize', vi.fn());

    node.destroy();

    expect(() => node.destroy()).not.toThrow();
  });
});
