import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VChart, div, vChart } from '../index.js';

describe('VChart', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('initializes an adapter once and exposes a stable host', () => {
    const adapter = {
      init: vi.fn(() => ({ id: 'chart-instance' }))
    };
    const chart = vChart({ adapter, data: [1, 2], options: { color: 'blue' } });

    expect(chart).toBeInstanceOf(VChart);
    chart.bindTo(document.body);
    chart.renderDom();

    expect(document.querySelector('.yoya-vchart')).not.toBeNull();
    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(adapter.init).toHaveBeenCalledWith(
      document.querySelector('.yoya-vchart'),
      expect.objectContaining({ data: [1, 2], options: { color: 'blue' }, chart })
    );
  });

  it('updates adapter data and options after initialization', () => {
    const instance = { id: 'chart-instance' };
    const adapter = { init: vi.fn(() => instance), update: vi.fn() };
    const chart = vChart({ adapter, data: [1], options: { color: 'blue' } }).bindTo(document.body);

    chart.data([2, 3]);
    chart.options({ color: 'green' });

    expect(adapter.update).toHaveBeenCalledTimes(2);
    expect(adapter.update).toHaveBeenLastCalledWith(
      instance,
      expect.objectContaining({ data: [2, 3], options: { color: 'green' }, chart })
    );
  });

  it('supports adapters whose init does not return an instance', () => {
    const adapter = { init: vi.fn(), update: vi.fn(), destroy: vi.fn() };
    const chart = vChart({ adapter }).bindTo(document.body);

    chart.renderDom();
    chart.data([3]);
    chart.destroy();

    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(adapter.update).toHaveBeenCalledTimes(1);
    expect(adapter.destroy).toHaveBeenCalledTimes(1);
  });

  it('treats a null instance as initialized and never reinitializes it', () => {
    const adapter = { init: vi.fn(() => null), destroy: vi.fn() };
    const chart = vChart({ adapter }).bindTo(document.body);

    chart.renderDom();
    chart.destroy();

    expect(adapter.init).toHaveBeenCalledTimes(1);
    expect(adapter.destroy).toHaveBeenCalledTimes(1);
  });

  it('delegates resize with explicit dimensions and supports no adapter hosts', () => {
    const instance = {};
    const adapter = { init: vi.fn(() => instance), resize: vi.fn() };
    const chart = vChart({ adapter, width: 320, height: 180 }).bindTo(document.body);

    chart.resize(640, 360);

    expect(adapter.resize).toHaveBeenCalledWith(
      instance,
      expect.objectContaining({ width: 640, height: 360, chart })
    );
    expect(chart.width()).toBe(640);
    expect(chart.height()).toBe(360);

    const placeholder = vChart().bindTo(document.body);
    expect(placeholder.renderDom().classList.contains('yoya-vchart')).toBe(true);
  });

  it('destroys a replaced adapter before initializing the next one', () => {
    const firstInstance = {};
    const first = { init: vi.fn(() => firstInstance), destroy: vi.fn() };
    const second = { init: vi.fn(() => ({})), destroy: vi.fn() };
    const chart = vChart({ adapter: first }).bindTo(document.body);

    chart.adapter(second);

    expect(first.destroy).toHaveBeenCalledWith(firstInstance, expect.objectContaining({ chart }));
    expect(second.init).toHaveBeenCalledTimes(1);
  });

  it('destroys the adapter and host with its parent view tree', () => {
    const instance = {};
    const adapter = { init: vi.fn(() => instance), destroy: vi.fn() };
    const chart = vChart({ adapter });
    const root = div((page) => page.child(chart)).bindTo(document.body);

    root.destroy();

    expect(adapter.destroy).toHaveBeenCalledWith(instance, expect.objectContaining({ chart }));
    expect(document.querySelector('.yoya-vchart')).toBeNull();
  });

  it('does not initialize a replacement adapter after destruction', () => {
    const first = { init: vi.fn(() => ({})), destroy: vi.fn() };
    const second = { init: vi.fn(() => ({})) };
    const chart = vChart({ adapter: first }).bindTo(document.body);

    chart.destroy();
    chart.adapter(second);

    expect(second.init).not.toHaveBeenCalled();
  });
});
