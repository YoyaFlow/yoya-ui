import { afterEach, describe, expect, it } from 'vitest';
import * as preactSignals from '@preact/signals-core';
import { createPreactAdapter } from '../../signals/preact/index.js';
import { computed, div, installSignals, ref } from '../../index.js';
import { describeSignalsAdapter } from './conformance.js';
import { defaultAdapter } from './engine.js';

afterEach(() => {
  installSignals(null);
});

describe('signals adapter conformance', () => {
  describeSignalsAdapter('built-in engine', () => defaultAdapter);
  describeSignalsAdapter('preact plugin', () => createPreactAdapter(preactSignals));
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
