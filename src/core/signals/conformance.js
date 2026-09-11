import { expect, it } from 'vitest';

/**
 * 引擎适配器一致性用例：任何适配器都必须通过同一份断言。
 * 契约见 design.md §5——引擎只提供「值单元 + 通知」四个方法。
 */
export function describeSignalsAdapter(label, createAdapter) {
  const withAdapter = (run) => run(createAdapter());

  it(`${label}: creates writable sources and reads them back`, () => {
    withAdapter((adapter) => {
      const count = adapter.createSignal(0);

      expect(adapter.read(count)).toBe(0);

      adapter.write(count, 2);

      expect(adapter.read(count)).toBe(2);
    });
  });

  it(`${label}: does not notify when writing an equal value`, () => {
    withAdapter((adapter) => {
      const count = adapter.createSignal(0);
      let calls = 0;
      const dispose = adapter.subscribe(count, () => {
        calls += 1;
      });

      adapter.write(count, 0);
      expect(calls).toBe(0);

      adapter.write(count, 1);
      expect(calls).toBe(1);

      dispose();
    });
  });

  it(`${label}: subscribe does not run the listener immediately`, () => {
    withAdapter((adapter) => {
      const count = adapter.createSignal(7);
      let calls = 0;
      const dispose = adapter.subscribe(count, () => {
        calls += 1;
      });

      expect(calls).toBe(0);

      dispose();
    });
  });

  it(`${label}: stops notifying after unsubscribe`, () => {
    withAdapter((adapter) => {
      const count = adapter.createSignal(0);
      let calls = 0;
      const dispose = adapter.subscribe(count, () => {
        calls += 1;
      });

      adapter.write(count, 1);
      dispose();
      adapter.write(count, 2);

      expect(calls).toBe(1);
    });
  });

  it(`${label}: keeps shallow semantics for object values`, () => {
    withAdapter((adapter) => {
      const rows = adapter.createSignal([]);
      let calls = 0;
      const dispose = adapter.subscribe(rows, () => {
        calls += 1;
      });

      adapter.read(rows).push('a');
      expect(calls).toBe(0);

      adapter.write(rows, [...adapter.read(rows)]);
      expect(calls).toBe(1);

      dispose();
    });
  });

  it(`${label}: notifies once per source when batching`, () => {
    withAdapter((adapter) => {
      if (typeof adapter.batch !== 'function') {
        return;
      }

      const count = adapter.createSignal(0);
      let calls = 0;
      const dispose = adapter.subscribe(count, () => {
        calls += 1;
      });

      adapter.batch(() => {
        adapter.write(count, 1);
        adapter.write(count, 2);
      });

      expect(calls).toBe(1);

      dispose();
    });
  });
}
