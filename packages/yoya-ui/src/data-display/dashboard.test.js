import { beforeEach, describe, expect, it } from 'vitest';
import { ref, vGauge, vRingStat, vSparkline, vTimeline, vTrendCard } from '../index.js';

describe('dashboard family', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it('renders a sparkline with data points and tone colors', () => {
    const spark = vSparkline({ data: [1, 4, 2, 8, 5], tone: 'success', fill: true });
    spark.bindTo('#app');

    const element = document.querySelector('svg[vn~="VSparkline"]');
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

    const element = document.querySelector('[vn~="VTrendCard"]');
    expect(element.querySelector('[vn~="VTrendCardTitle"]').textContent).toBe('今日请求');
    expect(element.querySelector('[vn~="VTrendCardValue"]').textContent).toContain('84.2');
    expect(element.querySelector('[vn~="VTrendCardValue"]').textContent).toContain('k');
    expect(element.querySelector('[vn~="VTrendCardDelta"]').textContent).toBe('+6.4%');
    expect(element.querySelector('[vn~="VSparkline"]')).not.toBeNull();
    expect(element.querySelector('[vn~="VTrendCardDelta"]').getAttribute('style')).toContain(
      'color-success'
    );

    card.up(false);
    expect(element.querySelector('[vn~="VTrendCardDelta"]').getAttribute('style')).toContain(
      'color-danger'
    );
  });

  it('keeps handle props live on the dashboard family（归一化不吞句柄）', () => {
    const up = ref(true);
    const card = vTrendCard({ data: [1, 2, 3], delta: '+1%', title: '请求', up, value: '10' });
    const cardElement = card.renderDom();
    const delta = cardElement.querySelector('[vn~="VTrendCardDelta"]');

    up.value = false;

    expect(delta.getAttribute('style')).toContain('color-danger');

    const percent = ref(10);
    const ring = vRingStat({ label: '成功率', percent });
    const ringElement = ring.renderDom();
    const circle = ringElement.querySelector('circle + circle');
    const before = Number(circle.getAttribute('stroke-dashoffset'));

    percent.value = 60;

    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeLessThan(before);
  });

  it('renders a ring stat with percent driving the arc offset', () => {
    const ring = vRingStat({ percent: 68, label: '成功率', tone: 'success' });
    ring.bindTo('#app');

    const element = document.querySelector('[vn~="VRingStat"]');
    const circle = element.querySelector('circle + circle');
    expect(circle).not.toBeNull();
    expect(Number(circle.getAttribute('stroke-dasharray'))).toBeGreaterThan(0);
    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeGreaterThan(0);
    expect(element.querySelector('[vn~="VRingStatLabel"]').textContent).toBe('成功率');
    expect(circle.getAttribute('style')).toContain('color-success');

    ring.percent(100);
    expect(Number(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1);
  });

  it('renders a gauge with a needle rotation and value text', () => {
    const gauge = vGauge({ value: 40, max: 100, unit: '%', tone: 'warning' });
    gauge.bindTo('#app');

    const element = document.querySelector('[vn~="VGauge"]');
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

    const element = document.querySelector('[vn~="VTimeline"]');
    const items = element.querySelectorAll('[vn~="VTimelineItem"]');
    expect(items).toHaveLength(2);
    const first = items[0];
    expect(first.querySelector('[vn~="VTimelineItemTitle"]').textContent).toBe('服务发布成功');
    expect(first.querySelector('[vn~="VTimelineItemTime"]').textContent).toBe('09:32');
    expect(first.querySelector('[vn~="VTimelineItemContent"]').textContent).toContain('v2.4.1');
    expect(first.querySelector('[vn~="VTimelineItemDot"]').getAttribute('style')).toContain(
      'color-success'
    );
    expect(items[1].querySelector('[vn~="VTimelineItemDot"]').getAttribute('style')).toContain(
      'color-danger'
    );
    expect(element.querySelector('[vn~="VTimelineLine"]')).not.toBeNull();
  });
});
