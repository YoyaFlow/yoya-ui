import { describe, expect, it } from 'vitest';
import {
  RegionFlushExample,
  RegionGateExample,
  RegionRebuildExample,
  RegionScopeExample,
  RegionStateVsSourceExample
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

  it('reads subtree data through a zero-argument closure', () => {
    const demo = RegionScopeExample();
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

  it('contrasts component state, external data and node state', () => {
    const element = RegionStateVsSourceExample().renderDom();
    const statePanel = element.querySelector('[data-region-state]');
    const externalPanel = element.querySelector('[data-region-source]');
    const localPanel = element.querySelector('[data-region-local]');

    expect(statePanel.textContent).toContain('组件状态：0');
    expect(externalPanel.textContent).toContain('外部数据源：0');
    expect(localPanel.textContent).toContain('节点状态：0');

    element.querySelector('[data-region-state-add]').click();
    // 组件状态：setState 自动驱动绑定，另外两块不受影响
    expect(statePanel.textContent).toContain('组件状态：1');
    expect(externalPanel.textContent).toContain('外部数据源：0');

    element.querySelector('[data-region-source-add]').click();
    // 外部数据源：数据在组件外，flush() 拉取一次
    expect(externalPanel.textContent).toContain('外部数据源：1');
    expect(localPanel.textContent).toContain('节点状态：0');

    element.querySelector('[data-region-local-add]').click();
    // 节点状态：只有手写接线的处理器会更新
    expect(localPanel.textContent).toContain('节点状态：1');
    expect(statePanel.textContent).toContain('组件状态：1');
    expect(externalPanel.textContent).toContain('外部数据源：1');
  });
});
