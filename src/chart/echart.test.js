import { afterEach, describe, expect, it, vi } from 'vitest';
import { div } from '../index.js';
import { vEchart } from '../yoya.echart.js';

describe('VEchart', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('initializes ECharts with the provided library and option', () => {
    const instance = {
      clear: vi.fn(),
      dispose: vi.fn(),
      hideLoading: vi.fn(),
      isDisposed: vi.fn(() => false),
      resize: vi.fn(),
      setOption: vi.fn(),
      showLoading: vi.fn()
    };
    const lib = {
      init: vi.fn(() => instance)
    };
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback();
      return 1;
    });

    const chart = vEchart({
      echartsLib: lib,
      height: '300px',
      option: { series: [{ type: 'bar', data: [1, 2] }] }
    }).bindTo(document.body);

    expect(lib.init).toHaveBeenCalledTimes(1);
    expect(instance.setOption).toHaveBeenCalledWith(
      { series: [{ type: 'bar', data: [1, 2] }] },
      true
    );
    expect(chart.getChartInstance()).toBe(instance);

    chart.option({ series: [{ type: 'bar', data: [3, 4] }] });
    chart.clear();
    chart.dispose();

    expect(instance.setOption).toHaveBeenCalledTimes(2);
    expect(instance.clear).toHaveBeenCalledTimes(1);
    expect(instance.dispose).toHaveBeenCalledTimes(1);
    expect(chart.getChartInstance()).toBeNull();
  });

  it('registers vEchart as a parent shortcut', () => {
    const page = div((root) => {
      root.vEchart({ height: '240px' });
    });
    const chart = page.children()[0];

    expect(chart.className()).toContain('yoya-vechart');
    expect(chart.height()).toBe('240px');
  });

  it('does not initialize a chart after destroy before the animation frame runs', () => {
    let frameCallback = null;
    const lib = { init: vi.fn(() => ({})) };
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });

    const chart = vEchart({ echartsLib: lib }).bindTo(document.body);
    chart.destroy();
    frameCallback();

    expect(lib.init).not.toHaveBeenCalled();
  });

  it('applies loading state after the chart initializes', () => {
    const instance = {
      dispose: vi.fn(),
      isDisposed: vi.fn(() => false),
      resize: vi.fn(),
      setOption: vi.fn(),
      showLoading: vi.fn()
    };
    const lib = { init: vi.fn(() => instance) };
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback();
      return 1;
    });

    vEchart({ echartsLib: lib, loading: true, option: {} }).bindTo(document.body);

    expect(instance.showLoading).toHaveBeenCalledWith(
      expect.objectContaining({ text: '加载中...' })
    );
  });
});
