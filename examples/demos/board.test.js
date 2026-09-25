import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DigitalBoardDemo,
  GaugeDemo,
  RingStatDemo,
  SparklineDemo,
  TrendCardDemo
} from './board.js';

/** 指标值盒子按渲染顺序取出（首屏 = 4 个指标）。 */
const itemValues = () =>
  [...document.querySelectorAll('[vn~="VDigitalBoardItemValueBox"]')].map((node) =>
    node.textContent.trim()
  );

/** 数值盒里可能带上单位，取其中的数字用于比较。 */
const numericValues = () => itemValues().map((text) => Number(text.replace(/[^\d.-]/g, '')));

const trendTexts = () =>
  [...document.querySelectorAll('[vn~="VDigitalBoardItemTrend"]')].map((node) =>
    node.textContent.trim()
  );

const buttonByLabel = (label) =>
  [...document.querySelectorAll('[vn~="VButton"]')].find((button) =>
    button.textContent.includes(label)
  );

const click = (element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('digital board demo', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('binds metric values to handles and moves them on one simulated round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // 每轮都往上走，保证可断言
    const demo = DigitalBoardDemo();
    demo.bindTo('#app');

    const before = itemValues();
    expect(before).toHaveLength(4);
    expect(before[0]).toContain('128');
    expect(trendTexts().every((text) => text.includes('较上次'))).toBe(true);

    click(buttonByLabel('模拟一轮'));

    numericValues().forEach((value, index) => {
      expect(value).toBeGreaterThan(Number(before[index].replace(/[^\d.-]/g, '')));
    });
    expect(trendTexts().every((text) => text.startsWith('+'))).toBe(true);
  });

  it('resets metrics back to their initial values', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const demo = DigitalBoardDemo();
    demo.bindTo('#app');

    click(buttonByLabel('模拟一轮'));
    click(buttonByLabel('重置'));

    expect(numericValues()).toEqual([128, 96, 5, 243]);
    expect(trendTexts().every((text) => text.startsWith('+0'))).toBe(true);
  });

  it('adds and drops metrics through the keySet (keyed rows reconcile)', () => {
    const demo = DigitalBoardDemo();
    demo.bindTo('#app');

    click(buttonByLabel('新增指标'));
    expect(itemValues()).toHaveLength(5);
    expect(document.body.textContent).toContain('指标 5');

    click(buttonByLabel('移除末尾'));
    expect(itemValues()).toHaveLength(4);
    expect(document.body.textContent).not.toContain('指标 5');
  });

  it('drives every board demo from live data (数值 / 走势 / 表盘都会动)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const read = (selector) => document.querySelector(selector)?.textContent.trim();

    const cases = [
      {
        Demo: TrendCardDemo,
        read: () => read('[vn~="VTrendCardValue"]'),
        selector: '[vn~="VTrendCard"]'
      },
      {
        Demo: SparklineDemo,
        read: () => document.querySelector('[vn~="VSparklineLine"]')?.getAttribute('points'),
        selector: '[vn~="VSparkline"]'
      },
      {
        Demo: RingStatDemo,
        read: () => read('[vn~="VRingStatValue"]'),
        selector: '[vn~="VRingStat"]'
      },
      {
        Demo: GaugeDemo,
        read: () => document.querySelector('[vn~="VGaugeNeedle"]')?.getAttribute('transform'),
        selector: '[vn~="VGauge"]'
      }
    ];

    cases.forEach(({ Demo, read: readValue, selector }) => {
      document.body.innerHTML = '<main id="app"></main>';
      const demo = Demo();
      demo.bindTo('#app');

      expect(document.querySelector(selector)).not.toBeNull();
      const before = readValue();
      click(buttonByLabel('模拟一轮'));
      expect(readValue()).not.toBe(before);

      demo.destroy();
    });
  });
});
