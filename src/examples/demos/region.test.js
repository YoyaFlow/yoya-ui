import { describe, expect, it } from 'vitest';
import {
  RegionDataSourceExample,
  RegionFlushExample,
  RegionGateExample,
  RegionRebuildExample
} from './region.js';

describe('region demos', () => {
  it('rebuilds the list region while the outside input stays put', () => {
    const demo = RegionRebuildExample();
    const element = demo.render().renderDom();
    const list = element.querySelector('[data-region-list]');
    const outside = element.querySelector('[data-region-outside]');

    expect(list.children).toHaveLength(1);

    element.querySelector('[data-region-add]').click();
    expect(list.children).toHaveLength(2);
    expect(element.querySelector('[data-region-list]')).toBe(list);
    expect(element.querySelector('[data-region-outside]')).toBe(outside);

    element.querySelector('[data-region-clear]').click();
    expect(list.children).toHaveLength(0);
  });

  it('keeps one status text node and flushes in place while the gate is locked', () => {
    const demo = RegionGateExample();
    const element = demo.render().renderDom();
    const status = element.querySelector('[data-region-pending]');
    const label = element.querySelector('[data-region-label]');

    expect(status.textContent).toBe('状态：已同步');
    expect(status.childNodes).toHaveLength(1);
    expect(label.textContent).toBe('A');

    demo.toggleLock();
    expect(status.textContent).toBe('状态：已同步');

    demo.toggleLabel();
    expect(label.textContent).toBe('B');
    expect(element.querySelector('[data-region-label]')).toBe(label);
    expect(status.textContent).toBe('状态：已跳过（待重建）');

    demo.toggleLabel();
    expect(label.textContent).toBe('A');
    expect(status.childNodes).toHaveLength(1);

    demo.toggleLock();
    expect(status.textContent).toBe('状态：已同步');
    expect(element.querySelector('[data-region-label]')).not.toBe(label);
    expect(element.querySelector('[data-region-locked]')).toBeNull();
  });

  it('reads region data through dataSource', () => {
    const demo = RegionDataSourceExample();
    const element = demo.render().renderDom();
    const box = element.querySelector('[data-region-source]');

    expect(box.dataset.count).toBe('0');

    element.querySelector('[data-region-source-add]').click();
    expect(box.dataset.count).toBe('1');
    expect(box.textContent).toContain('共 1 条');
    expect(element.querySelector('[data-region-source]')).toBe(box);
  });

  it('flushes values in place and rebuilds structure on demand', () => {
    const demo = RegionFlushExample();
    const element = demo.render().renderDom();
    const label = element.querySelector('[data-region-flush-label]');

    element.querySelector('[data-region-flush-next]').click();
    expect(label.textContent).toBe('B');
    expect(element.querySelector('[data-region-flush-label]')).toBe(label);

    element.querySelector('[data-region-flush-rebuild]').click();
    expect(element.querySelector('[data-region-flush-label]')).not.toBe(label);
    expect(element.querySelector('[data-region-flush-label]').textContent).toBe('B');
  });
});
