import { afterEach, describe, expect, it } from 'vitest';
import { defaultAdapter } from './engine.js';
import { currentSignals, installSignals } from './contract.js';
import { batch, computed, isSignal, ref } from './handle.js';

afterEach(() => {
  installSignals(null);
});

/**
 * 订阅计数适配器：统计当前活跃订阅数，用来验证观察者清零后依赖被退订。
 * 故意不带 createComputed——这条用例守的是「引擎没有原生派生」时 core 自实现的那条路径。
 */
function installSubscriptionSpy() {
  const spy = { active: 0 };

  installSignals({
    ...defaultAdapter,
    createComputed: undefined,
    subscribe(source, listener) {
      spy.active += 1;
      const dispose = defaultAdapter.subscribe(source, listener);

      return () => {
        spy.active -= 1;
        dispose();
      };
    }
  });

  return spy;
}

describe('ref', () => {
  it('reads and writes through the handle', () => {
    const count = ref(0);

    expect(count.value).toBe(0);
    count.value = 2;
    expect(count.value).toBe(2);
    expect(isSignal(count)).toBe(true);
  });

  it('does not mistake plain objects for signals', () => {
    expect(isSignal({ value: 1 })).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal(() => 1)).toBe(false);
  });

  it('updates through a function', () => {
    const count = ref(1);

    count.update((value) => value + 2);

    expect(count.value).toBe(3);
  });

  it('notifies subscribers after a write and stops after unsubscribe', () => {
    const count = ref(0);
    const seen = [];
    const unsubscribe = count.subscribe((value) => seen.push(value));

    count.value = 1;
    expect(seen).toEqual([1]);

    unsubscribe();
    count.value = 2;
    expect(seen).toEqual([1]);
  });

  it('does not notify subscribers when the value is unchanged', () => {
    const count = ref(0);
    const seen = [];
    count.subscribe((value) => seen.push(value));

    count.value = 0;

    expect(seen).toEqual([]);
  });
});

describe('computed', () => {
  it('evaluates lazily and caches the result', () => {
    const count = ref(2);
    let runs = 0;
    const double = computed(() => {
      runs += 1;
      return count.value * 2;
    });

    expect(runs).toBe(0);
    expect(double.value).toBe(4);
    expect(double.value).toBe(4);
    expect(runs).toBe(1);
  });

  it('recomputes when a dependency changes', () => {
    const count = ref(2);
    const double = computed(() => count.value * 2);

    expect(double.value).toBe(4);

    count.value = 3;

    expect(double.value).toBe(6);
  });

  it('notifies its own subscribers and calls them once per change', () => {
    const count = ref(1);
    const double = computed(() => count.value * 2);
    const seen = [];
    const unsubscribe = double.subscribe((value) => seen.push(value));

    count.value = 2;
    count.value = 3;

    expect(seen).toEqual([4, 6]);

    unsubscribe();
    count.value = 4;
    expect(seen).toEqual([4, 6]);
  });

  it('is read-only', () => {
    const double = computed(() => 2);

    expect(() => {
      double.value = 5;
    }).toThrow(/read-only/);
  });

  it('does not track the computed itself away from its dependencies', () => {
    const count = ref(2);
    const double = computed(() => count.value * 2);

    expect(double.peek()).toBe(4);
  });

  it('releases its dependencies when the last observer unsubscribes', () => {
    const spy = installSubscriptionSpy();
    const count = ref(1);
    const double = computed(() => count.value * 2);
    const seen = [];
    const unsubscribe = double.subscribe((value) => seen.push(value));

    // 承载信号 + 依赖各一条订阅
    expect(spy.active).toBe(2);

    unsubscribe();

    // 观察者清零：依赖订阅一并退掉，长命依赖不会再持有派生闭包
    expect(spy.active).toBe(0);

    count.value = 5;
    expect(seen).toEqual([]);

    // 再被读取时重新求值并重建依赖订阅
    expect(double.value).toBe(10);
    expect(spy.active).toBe(1);
  });

  it('does not recompute an unobserved derived value on dependency writes', () => {
    const count = ref(1);
    let runs = 0;
    const double = computed(() => {
      runs += 1;
      return count.value * 2;
    });

    expect(double.value).toBe(2);

    count.value = 5;

    // 没人观察：不订阅依赖、不重算，长命信号拿不到自己的闭包
    expect(runs).toBe(1);
    expect(double.value).toBe(10);
    expect(runs).toBe(2);
  });

  it('keeps equality gating for observed derived values', () => {
    const count = ref(1);
    const isBig = computed(() => count.value > 3);
    const seen = [];
    const unsubscribe = isBig.subscribe((value) => seen.push(value));

    count.value = 2;
    expect(seen).toEqual([]);

    count.value = 9;
    expect(seen).toEqual([true]);

    unsubscribe();
  });
});

describe('installSignals', () => {
  it('falls back to the built-in engine by default', () => {
    expect(currentSignals()).toBe(defaultAdapter);
  });

  it('rejects an adapter that is missing required methods', () => {
    expect(() => installSignals({ createSignal() {} })).toThrow(/read/);
  });

  it('replaces the engine used by newly created signals', () => {
    const calls = [];
    const spyAdapter = {
      ...defaultAdapter,
      createSignal(initial) {
        calls.push('createSignal');
        return defaultAdapter.createSignal(initial);
      }
    };

    installSignals(spyAdapter);
    const count = ref(1);

    expect(currentSignals()).toBe(spyAdapter);
    expect(calls).toContain('createSignal');
    expect(count.value).toBe(1);
  });

  it('restores the default engine when cleared', () => {
    installSignals({ ...defaultAdapter });

    installSignals(null);

    expect(currentSignals()).toBe(defaultAdapter);
  });
});

describe('batch', () => {
  it('runs the callback and returns its value', () => {
    const result = batch(() => 'done');

    expect(result).toBe('done');
  });

  it('rejects engines that do not implement batch', () => {
    expect(() =>
      installSignals({
        createSignal: (initial) => ({ value: initial }),
        read: (source) => source.value,
        write: (source, value) => {
          source.value = value;
        },
        subscribe: () => () => {}
      })
    ).toThrow(/batch/);
  });

  it('delegates to the installed engine batch', () => {
    const calls = [];
    installSignals({
      createSignal: (initial) => ({ value: initial }),
      read: (source) => source.value,
      write: (source, value) => {
        source.value = value;
      },
      subscribe: () => () => {},
      batch: (run) => {
        calls.push('enter');
        const result = run();
        calls.push('exit');
        return result;
      }
    });

    batch(() => calls.push('run'));

    expect(calls).toEqual(['enter', 'run', 'exit']);
  });
});
