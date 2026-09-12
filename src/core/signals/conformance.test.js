import { afterEach, describe, expect, it } from 'vitest';
import { computed, div, installSignals, ref } from '../../index.js';
import { describeSignalsAdapter } from './conformance.js';
import { defaultAdapter } from './engine.js';

/**
 * 测试内自带的 store 形态适配器（getState / setState / subscribe）。
 * 它是「用户自己写的插件」的替身：store 通知用 listeners.forEach 遍历，
 * 用来守住 core 的差量重订——整体退订重订会让监听器被反复访问直至自激。
 */
function createStore(initialState = {}) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (patch) => {
      const previous = state;
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state, previous));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

function createStoreAdapter() {
  return {
    name: 'store-shaped (test-only)',
    createSignal: (initial) => createStore({ value: initial }),
    read: (source) => source.getState().value,
    write: (source, value) => source.setState({ value }),
    subscribe: (source, listener) =>
      source.subscribe((state, previous) => {
        if (!Object.is(state.value, previous.value)) {
          listener(state.value);
        }
      })
  };
}

afterEach(() => {
  installSignals(null);
});

describe('signals adapter conformance', () => {
  describeSignalsAdapter('built-in engine', () => defaultAdapter);
  describeSignalsAdapter('store-shaped adapter', () => createStoreAdapter());
});

describe('adapter installation', () => {
  it('reports missing required methods when installing', () => {
    expect(() => installSignals({ createSignal() {} })).toThrow(/read/);
  });
});

describe('store-shaped adapter as the active engine', () => {
  it('drives bindings and regions without re-subscribing into a loop', () => {
    installSignals(createStoreAdapter());

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
});
