import { afterEach, describe, expect, it } from 'vitest';
import * as preactSignals from '@preact/signals-core';
import { createStore } from 'zustand/vanilla';
import { createPreactAdapter } from '../../signals/preact/index.js';
import { createZustandAdapter } from '../../signals/zustand/index.js';
import { computed, div, installSignals, ref } from '../../index.js';
import { describeSignalsAdapter } from './conformance.js';
import { defaultAdapter } from './engine.js';

afterEach(() => {
  installSignals(null);
});

describe('signals adapter conformance', () => {
  describeSignalsAdapter('built-in engine', () => defaultAdapter);
  describeSignalsAdapter('preact plugin', () => createPreactAdapter(preactSignals));
  describeSignalsAdapter('zustand plugin', () => createZustandAdapter({ createStore }));
});

describe('preact plugin as the active engine', () => {
  it('drives the same business code', () => {
    installSignals(createPreactAdapter(preactSignals));

    const count = ref(1);
    const double = computed(() => count.value * 2);
    const box = div((el) => el.attr('data-double', double));
    const element = box.renderDom();

    expect(element.getAttribute('data-double')).toBe('2');

    count.value = 3;

    expect(element.getAttribute('data-double')).toBe('6');
  });

  it('reports missing required methods when installing', () => {
    expect(() => installSignals({ createSignal() {} })).toThrow(/read/);
  });
});

describe('store-shaped plugin as the active engine', () => {
  it('drives bindings and regions from a zustand-backed engine', () => {
    installSignals(createZustandAdapter({ createStore }));

    const count = ref(0);
    const double = computed(() => count.value * 2);
    const list = div((box) => {
      box.rebuildable();
      box.attr({ 'data-count': count, 'data-double': double });
      box.text(`n=${count.value}`); // 区域构建期直读信号：写入会重建这块
      box.on('click', () => {
        count.value += 1;
      });
    });
    const element = list.renderDom();

    expect(element.getAttribute('data-double')).toBe('0');
    expect(element.textContent).toBe('n=0');

    element.click();

    expect(element.getAttribute('data-count')).toBe('1');
    expect(element.getAttribute('data-double')).toBe('2');
    expect(element.textContent).toBe('n=1');
  });

  it('requires the zustand vanilla module', () => {
    expect(() => createZustandAdapter({})).toThrow(/zustand\/vanilla/);
  });
});
