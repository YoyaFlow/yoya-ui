import { afterEach, describe, expect, it } from 'vitest';
import { batch, div, installSignals, ref } from '../index.js';

/**
 * 同步通知的 store 型引擎：batch 是引擎契约的必需方法，这里只需直通执行，
 * 用来验证「批次内的区域合并」由 core 提供，不依赖引擎如何合并通知。
 */
function createSyncAdapter() {
  return {
    createSignal(initial) {
      return { value: initial, listeners: new Set() };
    },
    read(source) {
      return source.value;
    },
    write(source, value) {
      if (Object.is(source.value, value)) {
        return;
      }

      source.value = value;
      Array.from(source.listeners).forEach((listener) => listener(value));
    },
    subscribe(source, listener) {
      source.listeners.add(listener);
      return () => source.listeners.delete(listener);
    },
    batch(run) {
      return run();
    }
  };
}

afterEach(() => {
  installSignals(null);
});

describe('region rebuild scheduling', () => {
  it('rebuilds a multi-signal region once per batch', () => {
    const first = ref('a');
    const second = ref('b');
    let builds = 0;
    const region = div((el) => {
      el.rebuildable();
      builds += 1;
      el.span(`${first.value}-${second.value}`);
    });
    region.renderDom();
    builds = 0;

    batch(() => {
      first.value = 'A';
      second.value = 'B';
    });

    expect(builds).toBe(1);
    expect(region.textContent()).toBe('A-B');
  });

  it('exposes rebuildScheduled while a batched rebuild is waiting', () => {
    const first = ref('a');
    const second = ref('b');
    const region = div((el) => {
      el.rebuildable();
      el.span(`${first.value}-${second.value}`);
    });
    region.renderDom();

    expect(region.rebuildScheduled()).toBe(false);

    batch(() => {
      first.value = 'A';
      expect(region.rebuildScheduled()).toBe(true);
      second.value = 'B';
      expect(region.rebuildScheduled()).toBe(true);
    });

    expect(region.rebuildScheduled()).toBe(false);
    expect(region.textContent()).toBe('A-B');
  });

  it('keeps waiting regions out of the DOM until the outermost batch ends', () => {
    const source = ref('a');
    const region = div((el) => {
      el.rebuildable();
      el.span(source.value);
    });
    region.renderDom();

    batch(() => {
      batch(() => {
        source.value = 'A';
      });
      expect(region.rebuildScheduled()).toBe(true);
      expect(region.textContent()).toBe('a');
    });

    expect(region.rebuildScheduled()).toBe(false);
    expect(region.textContent()).toBe('A');
  });

  it('coalesces rebuilds when the engine batch only forwards', () => {
    installSignals(createSyncAdapter());
    const first = ref('a');
    const second = ref('b');
    let builds = 0;
    const region = div((el) => {
      el.rebuildable();
      builds += 1;
      el.span(`${first.value}-${second.value}`);
    });
    region.renderDom();
    builds = 0;

    batch(() => {
      first.value = 'A';
      second.value = 'B';
    });

    expect(builds).toBe(1);
    expect(region.textContent()).toBe('A-B');
  });

  it('cancels scheduled rebuilds when the region is destroyed in the batch', () => {
    const source = ref('a');
    const region = div((el) => {
      el.rebuildable();
      el.span(source.value);
    });
    region.renderDom();

    batch(() => {
      source.value = 'A';
      region.destroy();
    });

    expect(region.rebuildScheduled()).toBe(false);
    expect(region.children()).toHaveLength(0);
  });

  it('re-runs regions when a dependency changes during a rebuild', () => {
    installSignals(createSyncAdapter());
    const source = ref(0);
    const region = div((el) => {
      el.rebuildable();
      el.span(String(source.value));
      if (source.value === 1) {
        source.value = 2;
        expect(region.rebuildScheduled()).toBe(true);
      }
    });
    region.renderDom();
    expect(region.textContent()).toBe('0');

    source.value = 1;

    expect(region.textContent()).toBe('2');
  });

  it('detects cycles when a region always rewrites its own dependency', () => {
    installSignals(createSyncAdapter());
    const source = ref(0);
    const region = div((el) => {
      el.rebuildable();
      source.value = source.value + 1;
      el.span(String(source.value));
    });
    region.renderDom();

    expect(() => {
      source.value = 100;
    }).toThrow(/cycle/i);
  });
});
