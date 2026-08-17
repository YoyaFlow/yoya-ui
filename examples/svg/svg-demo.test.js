import { describe, expect, it } from 'vitest';
import { renderSvgExample } from './svg-demo.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('examples/svg SVG demo', () => {
  it('renders SVG examples through the svg tag entry and scoped child methods', () => {
    document.body.innerHTML = '<main id="svg-root"></main>';

    const root = renderSvgExample('#svg-root');

    expect(root.tagName()).toBe('section');
    expect(document.querySelector('#svg-demo h1').textContent).toBe('SVG 元素演示');
    expect(document.querySelectorAll('#svg-demo svg')).toHaveLength(3);

    const statusIcon = document.querySelector('#service-status-icon');
    const chart = document.querySelector('#svg-metric-chart');
    const topology = document.querySelector('#svg-topology-map');

    expect(statusIcon.namespaceURI).toBe(SVG_NS);
    expect(statusIcon.querySelector('title').namespaceURI).toBe(SVG_NS);
    expect(statusIcon.querySelector('circle').namespaceURI).toBe(SVG_NS);
    expect(statusIcon.querySelector('path').getAttribute('stroke-width')).toBe('2');
    expect(chart.querySelector('linearGradient')).not.toBeNull();
    expect(chart.querySelectorAll('[data-chart-bar]')).toHaveLength(5);
    expect(topology.querySelector('marker')).not.toBeNull();
    expect(topology.querySelector('text').textContent).toBe('API');
  });

  it('switches chart data by updating existing SVG child elements', () => {
    document.body.innerHTML = '<main id="svg-root"></main>';

    renderSvgExample('#svg-root');

    const toggle = document.querySelector('#toggle-chart-mode');
    const status = document.querySelector('#chart-mode-status');
    const firstBar = document.querySelector('[data-chart-bar="0"]');
    const firstLabel = document.querySelector('[data-chart-label="0"]');

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(status.textContent).toBe('当前：实时请求');
    expect(firstBar.getAttribute('height')).toBe('68');
    expect(firstLabel.textContent).toBe('42');

    toggle.click();

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(status.textContent).toBe('当前：历史峰值');
    expect(firstBar.getAttribute('height')).toBe('112');
    expect(firstLabel.textContent).toBe('71');

    toggle.click();

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(status.textContent).toBe('当前：实时请求');
    expect(firstBar.getAttribute('height')).toBe('68');
    expect(firstLabel.textContent).toBe('42');
  });
});
