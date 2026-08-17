import { describe, expect, it } from 'vitest';
import { renderLayoutExample } from './layout-demo.js';

describe('examples/layout layout demo', () => {
  it('renders common layout components in a practical dashboard shape', () => {
    document.body.innerHTML = '<main id="layout-root"></main>';

    const root = renderLayoutExample('#layout-root');

    expect(root.tagName()).toBe('section');
    expect(document.querySelector('#layout-demo h1').textContent).toBe('Layout 布局组件');
    expect(document.querySelector('#layout-demo .yoya-container')).not.toBeNull();
    expect(document.querySelector('#layout-demo .yoya-vstack')).not.toBeNull();
    expect(document.querySelector('#layout-demo .yoya-hstack')).not.toBeNull();
    expect(document.querySelector('#layout-demo .yoya-grid')).not.toBeNull();
    expect(document.querySelector('#layout-demo .yoya-spacer')).not.toBeNull();
    expect(document.querySelector('#layout-demo .yoya-divider')).not.toBeNull();
    expect(document.querySelectorAll('[data-layout-card]')).toHaveLength(4);
    expect(document.querySelector('[data-layout-panel="center"]').textContent).toContain('center');
  });

  it('switches the metric grid between relaxed and compact columns', () => {
    document.body.innerHTML = '<main id="layout-root"></main>';

    renderLayoutExample('#layout-root');

    const toggle = document.querySelector('#toggle-grid-density');
    const metricsGrid = document.querySelector('#metric-grid');
    const status = document.querySelector('#grid-density-status');

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(metricsGrid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(status.textContent).toBe('当前：四列指标');

    toggle.click();

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(metricsGrid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(status.textContent).toBe('当前：两列指标');

    toggle.click();

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(metricsGrid.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(status.textContent).toBe('当前：四列指标');
  });
});
