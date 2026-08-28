import { beforeEach, describe, expect, it } from 'vitest';
import { vDigitalBoard, vDigitalBoardItem, vstack } from '../index.js';

describe('digital board', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it('renders a responsive board with metric items', () => {
    const board = vDigitalBoard((view) => {
      view.vDigitalBoardItem((item) => {
        item.label('服务总数');
        item.value('128');
        item.unit('个');
        item.trend('+12 本月');
        item.trendUp(true);
      });
      view.vDigitalBoardItem((item) => {
        item.label('异常告警');
        item.value('5');
        item.trend('-2 今日');
        item.trendUp(false);
        item.tone('danger');
      });
    });
    board.bindTo('#app');

    const element = document.querySelector('.yoya-vdigital-board');
    expect(element).not.toBeNull();
    expect(element.style.gridTemplateColumns).toContain('auto-fit');

    const items = element.querySelectorAll('.yoya-vdigital-board-item');
    expect(items).toHaveLength(2);
    const first = items[0];
    expect(first.querySelector('.yoya-vdigital-board-item-label').textContent).toBe('服务总数');
    expect(first.querySelector('.yoya-vdigital-board-item-value-box').textContent).toContain('128');
    expect(first.querySelector('.yoya-vdigital-board-item-unit').textContent).toBe('个');
    expect(first.querySelector('.yoya-vdigital-board-item-trend').textContent).toBe('+12 本月');
  });

  it('supports explicit columns, tone colors and trend direction', () => {
    const board = vDigitalBoard((view) => {
      view.columns(4);
      view.vDigitalBoardItem((item) => {
        item.label('成功率');
        item.value('99.9');
        item.unit('%');
        item.tone('success');
        item.trendUp(true);
      });
      view.vDigitalBoardItem((item) => {
        item.label('失败数');
        item.value('3');
        item.tone('danger');
        item.trend('-5% 较昨日');
        item.trendUp(false);
        item.icon('!');
      });
    });
    board.bindTo('#app');

    expect(board.renderDom().style.gridTemplateColumns).toContain('repeat(4');

    const items = document.querySelectorAll('.yoya-vdigital-board-item');
    const success = items[0];
    const danger = items[1];
    const successAccent = success.querySelector('.yoya-vdigital-board-item-accent');
    const dangerAccent = danger.querySelector('.yoya-vdigital-board-item-accent');

    expect(successAccent.getAttribute('style')).toContain('color-success');
    expect(dangerAccent.getAttribute('style')).toContain('color-danger');

    expect(
      success.querySelector('.yoya-vdigital-board-item-trend').getAttribute('style')
    ).toContain('color-success');
    expect(danger.querySelector('.yoya-vdigital-board-item-trend').getAttribute('style')).toContain(
      'color-danger'
    );
    expect(danger.querySelector('.yoya-vdigital-board-item-icon').style.display).toBe('flex');
  });

  it('updates label, value and unit through setters', () => {
    const item = vDigitalBoardItem();
    item.label('请求量').value('84.2').unit('k').trend('+6.4% 较昨日');
    item.bindTo('#app');

    const element = document.querySelector('.yoya-vdigital-board-item');
    expect(element.querySelector('.yoya-vdigital-board-item-label').textContent).toBe('请求量');
    expect(element.querySelector('.yoya-vdigital-board-item-value-box').textContent).toContain(
      '84.2'
    );

    item.value('120');
    expect(element.querySelector('.yoya-vdigital-board-item-value-box').textContent).toContain(
      '120'
    );
    expect(item.value()).toBe('120');
    expect(item.unit()).toBe('k');
    expect(item.trend()).toBe('+6.4% 较昨日');
    expect(item.tone()).toBe('primary');
  });

  it('accepts view content and object configs through child factories', () => {
    const root = vstack((stack) => {
      stack.vDigitalBoard({ columns: 2, attrs: { 'data-board': 'main' } });
      stack.child(
        vDigitalBoardItem({
          label: '排队任务',
          value: '12',
          trendUp: false,
          attrs: { 'data-item': 'queued' }
        })
      );
    });
    root.bindTo('#app');

    expect(document.querySelector('[data-board="main"]')).not.toBeNull();
    const item = document.querySelector('[data-item="queued"]');
    expect(item).not.toBeNull();
    expect(item.querySelector('.yoya-vdigital-board-item-label').textContent).toBe('排队任务');
  });
});
