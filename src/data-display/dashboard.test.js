import { beforeEach, describe, expect, it } from 'vitest';
import { vGauge, vRingStat, vSparkline, vTimeline, vTrendCard } from '../index.js';

describe('dashboard family', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it('renders a sparkline with data points and tone colors', () => {
    const spark = vSparkline({ data: [1, 4, 2, 8, 5], tone: 'success', fill: true });
    spark.bindTo('#app');

    const element = document.querySelector('svg.yoya-vsparkline');
    expect(element).not.toBeNull();
    const line = element.querySelector('polyline');
    expect(line).not.toBeNull();
    expect(line.getAttribute('points')).toMatch(/^\d+\.\d+,\d+\.\d+( \d+\.\d+,\d+\.\d+)+/);
    const area = element.querySelector('path');
    expect(area.getAttribute('d')).toMatch(/^M /);

    const success = vSparkline();
    success.tone('success');
    expect(success.renderDom().querySelector('polyline').getAttribute('style')).toContain(
      'color-success'
    );
  });

  it('renders a trend card with title, value, delta and sparkline', () => {
    const card = vTrendCard((view) => {
      view.title('今日请求');
      view.value('84.2');
      view.unit('k');
      view.delta('+6.4%');
      view.up(true);
      view.data([3, 5, 4, 8, 7, 9]);
      view.tone('primary');
    });
    card.bindTo('#app');

    const element = document.querySelector('.yoya-vtrend-card');
    expect(element.querySelector('.yoya-vtrend-card-title').textContent).toBe('今日请求');
    expect(element.querySelector('.yoya-vtrend-card-value').textContent).toContain('84.2');
    expect(element.querySelector('.yoya-vtrend-card-value').textContent).toContain('k');
    expect(element.querySelector('.yoya-vtrend-card-delta').textContent).toBe('+6.4%');
    expect(element.querySelector('.yoya-vsparkline')).not.toBeNull();
    expect(element.querySelector('.yoya-vtrend-card-delta').getAttribute('style')).toContain(
      'color-success'
    );

    card.up(false);
    expect(element.querySelector('.yoya-vtrend-card-delta').getAttribute('style')).toContain(
      'color-danger'
    );
  });

  it('renders a ring stat with percent driving the arc offset', () => {
    const ring = vRingStat({ percent: 68, label: '成功率', tone: 'success' });
    ring.bindTo('#app');

    const element = document.querySelector('.yoya-vring-stat');
    const circle = element.querySelector('circle + circle');
    expect(circle).not.toBeNull();
    expect(Number(circle.getAttribute('stroke-dasharray'))).toBeGreaterThan(0);
    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeGreaterThan(0);
    expect(element.querySelector('.yoya-vring-stat-label').textContent).toBe('成功率');
    expect(circle.getAttribute('style')).toContain('color-success');

    ring.percent(100);
    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1);
  });

  it('renders a gauge with a needle rotation and value text', () => {
    const gauge = vGauge({ value: 40, max: 100, unit: '%', tone: 'warning' });
    gauge.bindTo('#app');

    const element = document.querySelector('.yoya-vgauge');
    expect(element).not.toBeNull();
    const svg = element.querySelector('svg');
    const needle = svg.querySelector('polygon');
    const hub = svg.querySelectorAll('circle');
    expect(hub).toHaveLength(2);
    const transform = needle.getAttribute('transform');
    expect(transform).toMatch(/^rotate\(-18\.00 100 100\)$/);
    const text = [...svg.querySelectorAll('text')].find((node) => node.textContent.includes('40%'));
    expect(text).toBeTruthy();
    const maxLabel = [...svg.querySelectorAll('text')].find((node) => node.textContent === '100');
    expect(maxLabel).toBeTruthy();
  });

  it('renders a timeline with status dots and item content', () => {
    const timeline = vTimeline((view) => {
      view.vTimelineItem((item) => {
        item.status('success');
        item.title('服务发布成功');
        item.time('09:32');
        item.content((body) => body.p('api-gateway v2.4.1 已上线。'));
      });
      view.vTimelineItem((item) => {
        item.status('danger');
        item.title('告警触发');
        item.time('09:10');
        item.content('内存使用率超过 85%。');
      });
    });
    timeline.bindTo('#app');

    const element = document.querySelector('.yoya-vtimeline');
    const items = element.querySelectorAll('.yoya-vtimeline-item');
    expect(items).toHaveLength(2);
    const first = items[0];
    expect(first.querySelector('.yoya-vtimeline-item-title').textContent).toBe('服务发布成功');
    expect(first.querySelector('.yoya-vtimeline-item-time').textContent).toBe('09:32');
    expect(first.querySelector('.yoya-vtimeline-item-content').textContent).toContain('v2.4.1');
    expect(first.querySelector('.yoya-vtimeline-item-dot').getAttribute('style')).toContain(
      'color-success'
    );
    expect(items[1].querySelector('.yoya-vtimeline-item-dot').getAttribute('style')).toContain(
      'color-danger'
    );
    expect(element.querySelector('.yoya-vtimeline-line')).not.toBeNull();
  });
});
