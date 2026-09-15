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

  it('keeps structure untouched while busy and applies pending rows once when idle', () => {
    const demo = RegionGateExample();
    const element = demo.render().renderDom();
    const status = element.querySelector('[data-region-pending]');
    const gate = element.querySelector('.demo-region-gate');

    expect(element.querySelector('[data-region-list] li')).not.toBeNull();
    expect(element.querySelector('[data-region-count]').textContent).toBe('值绑定行数：1');
    expect(status.textContent).toBe('状态：空闲，结构随信号自动重建');

    demo.addRow();
    expect(element.querySelectorAll('[data-region-list] li')).toHaveLength(2);
    expect(element.querySelector('[data-region-count]').textContent).toBe('值绑定行数：2');

    demo.toggleBusy();
    const busyList = element.querySelector('[data-region-list]');
    expect(gate.getAttribute('data-region-locked')).toBe('true');

    demo.addRow();
    demo.addRow();
    expect(element.querySelector('[data-region-list]')).toBe(busyList);
    expect(busyList.querySelectorAll('li')).toHaveLength(2);
    expect(element.querySelector('[data-region-count]').textContent).toBe('值绑定行数：4');
    expect(status.textContent).toContain('待重建：是');

    demo.toggleBusy();
    const idleList = element.querySelector('[data-region-list]');
    expect(idleList).not.toBe(busyList);
    expect(idleList.querySelectorAll('li')).toHaveLength(4);
    expect(status.textContent).toBe('状态：空闲，结构随信号自动重建');
    expect(gate.getAttribute('data-region-locked')).toBeNull();
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

  it('contrasts component ref, external data and region signals', () => {
    const element = RegionStateVsSourceExample().renderDom();
    const statePanel = element.querySelector('[data-region-state]');
    const externalPanel = element.querySelector('[data-region-source]');
    const localPanel = element.querySelector('[data-region-local]');

    expect(statePanel.textContent).toContain('组件状态：0');
    expect(externalPanel.textContent).toContain('外部数据源：0');
    expect(localPanel.textContent).toContain('区域信号：0');

    element.querySelector('[data-region-state-add]').click();
    // 组件内 ref：写入后值绑定自动写回，另外两块不受影响
    expect(statePanel.textContent).toContain('组件状态：1');
    expect(externalPanel.textContent).toContain('外部数据源：0');

    element.querySelector('[data-region-source-add]').click();
    // 组件外 ref：写入即写回，无需 flush
    expect(externalPanel.textContent).toContain('外部数据源：1');
    expect(localPanel.textContent).toContain('区域信号：0');

    element.querySelector('[data-region-local-add]').click();
    // 区域依赖：构建期直读 ref，写入触发重建
    expect(localPanel.textContent).toContain('区域信号：1');
    expect(statePanel.textContent).toContain('组件状态：1');
    expect(externalPanel.textContent).toContain('外部数据源：1');
  });
});
