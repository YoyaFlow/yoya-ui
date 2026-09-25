import { describe, expect, it } from 'vitest';
import { defaultAdapter } from './engine.js';

const adapter = defaultAdapter;

describe('default signals adapter', () => {
  it('creates writable sources and reads them back', () => {
    const count = adapter.createSignal(0);

    expect(adapter.read(count)).toBe(0);
    expect(adapter.isSource(count)).toBe(true);

    adapter.write(count, 2);

    expect(adapter.read(count)).toBe(2);
  });

  it('does not treat plain objects as sources', () => {
    expect(adapter.isSource({ value: 1 })).toBe(false);
    expect(adapter.isSource(null)).toBe(false);
    expect(adapter.isSource(1)).toBe(false);
  });

  it('does not notify when writing an equal value', () => {
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

  it('stops notifying after unsubscribe', () => {
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

  it('reads values back for several sources', () => {
    const a = adapter.createSignal(1);
    const unread = adapter.createSignal(2);

    expect(adapter.read(a)).toBe(1);
    expect(adapter.read(unread)).toBe(2);
  });

  it('does not register dependencies for reads outside collect', () => {
    const count = adapter.createSignal(0);
    let calls = 0;
    adapter.subscribe(count, () => {
      calls += 1;
    });

    expect(adapter.read(count)).toBe(0);
    adapter.write(count, 1);

    expect(calls).toBe(1);
  });

  it('keeps shallow semantics for object values', () => {
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

  it('batches several writes into one notification', () => {
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
