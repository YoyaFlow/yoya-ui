import { afterEach, describe, expect, it } from 'vitest';
import { computed, div, installSignals, ref } from '../index.js';
import { describeSignalsAdapter } from '../core/signals/conformance.js';
import { createSignalsAdapter } from './adapter-signals-example.js';
import { createZustandAdapter } from './adapter-zustand-example.js';
import { SignalsCounter, installSignalsEngine } from './adapter-signals-usage.js';
import { ZustandCounter, installZustandEngine } from './adapter-zustand-usage.js';

afterEach(() => {
  installSignals(null);
});

describe('documentation example adapters', () => {
  // 文档里的两份示例必须能通过同一份一致性用例，否则等于在教错的写法
  describeSignalsAdapter('signals example (preact)', () => createSignalsAdapter());
  describeSignalsAdapter('store example (zustand)', () => createZustandAdapter());

  [
    ['signals example (preact)', createSignalsAdapter],
    ['store example (zustand)', createZustandAdapter]
  ].forEach(([label, createAdapter]) => {
    it(`${label} drives ref / computed / bindings / regions`, () => {
      installSignals(createAdapter());

      const count = ref(0);
      const double = computed(() => count.value * 2);
      const box = div((ele) => {
        ele.rebuildable();
        ele.attr({ 'data-count': count, 'data-double': double });
        ele.text(`n=${count.value}`); // 区域构建期直读信号：写入会重建这块
        ele.on('click', () => {
          count.value += 1;
        });
      });
      const element = box.renderDom();

      expect(element.getAttribute('data-double')).toBe('0');
      expect(element.textContent).toBe('n=0');

      element.click();

      expect(element.getAttribute('data-count')).toBe('1');
      expect(element.getAttribute('data-double')).toBe('2');
      expect(element.textContent).toBe('n=1');
    });
  });

  // 用法示例也要能跑：装一次引擎，之后业务代码与内置引擎完全一样
  [
    ['signals usage (preact)', installSignalsEngine, SignalsCounter],
    ['store usage (zustand)', installZustandEngine, ZustandCounter]
  ].forEach(([label, installEngine, Counter]) => {
    it(`${label} installs the engine and drives business code`, () => {
      installEngine();

      const counter = Counter();
      const element = counter.render().renderDom();

      expect(element.textContent).toBe('0 × 2 = 0');

      counter.increment();
      counter.increment();

      expect(element.getAttribute('data-count')).toBe('2');
      expect(element.textContent).toBe('2 × 2 = 4');
    });
  });
});
