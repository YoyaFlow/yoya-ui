import { afterEach, describe, expect, it } from 'vitest';
import { computed, isSignal, ref } from './handle.js';
import { installSignals } from './contract.js';
import { asSignalJson } from './json.js';

afterEach(() => {
  installSignals(null);
});

describe('asSignalJson', () => {
  it('reads the value at a relative path', () => {
    const json = asSignalJson({ rows: [{ value: 12 }] });

    expect(json.at('rows/0/value').value).toBe(12);
  });

  it('is a signal handle for the whole value', () => {
    const json = asSignalJson({ a: 1 });

    expect(isSignal(json)).toBe(true);
    expect(json.value).toEqual({ a: 1 });
  });

  it('writes back through the root without mutating the previous value', () => {
    const json = asSignalJson({ a: { b: 1 }, keep: true });
    const before = json.value;

    json.at('a/b').value = 5;

    expect(json.value).toEqual({ a: { b: 5 }, keep: true });
    expect(before).toEqual({ a: { b: 1 }, keep: true });
  });

  it('keeps one source per path: a write through one handle notifies the other', () => {
    const json = asSignalJson({ a: 1 });
    const first = json.at('a');
    const second = json.at('a');
    const seen = [];
    const stop = first.subscribe(() => seen.push(second.value));

    second.value = 2;

    expect(seen).toEqual([2]);
    stop();
  });

  it('recomputes a derivation when a leaf is written', () => {
    const json = asSignalJson({ a: 1 });
    const doubled = computed(() => json.at('a').value * 2);
    const stop = doubled.subscribe(() => {});

    json.at('a').value = 3;

    expect(doubled.peek()).toBe(6);
    stop();
  });

  it('recomputes a derivation when the whole value is replaced', () => {
    const json = asSignalJson({ a: 1 });
    const doubled = computed(() => json.at('a').value * 2);
    const stop = doubled.subscribe(() => {});

    json.value = { a: 9 };

    expect(doubled.peek()).toBe(18);
    stop();
  });

  it('shares the source of a handle it is given', () => {
    const root = ref({ a: 1 });
    const json = asSignalJson(root);
    const seen = [];
    const stop = root.subscribe(() => seen.push(json.at('a').value));

    json.at('a').value = 5;

    expect(seen).toEqual([5]);
    stop();
  });

  it('returns the same handle for an already piped signal', () => {
    const json = asSignalJson({ a: 1 });

    expect(asSignalJson(json)).toBe(json);
  });

  it('creates missing segments on write', () => {
    const json = asSignalJson({ keep: true });

    json.at('a/b').value = 1;

    expect(json.value).toEqual({ a: { b: 1 }, keep: true });
  });

  it('refuses to drill when the value is a scalar', () => {
    expect(() => asSignalJson(5).at('a')).toThrow(/JSON/);
    expect(() => asSignalJson('rows').at('a')).toThrow(/JSON/);
  });

  it('allows drilling when the value is not loaded yet', () => {
    expect(asSignalJson(null).at('a').value).toBeUndefined();
    expect(asSignalJson(undefined).at('a/b').value).toBeUndefined();
  });

  it('refuses to drill through a scalar segment', () => {
    const json = asSignalJson({ a: 1 });

    expect(() => json.at('a/b')).toThrow(/JSON/);
  });

  it('drills through missing segments', () => {
    const json = asSignalJson({});

    expect(json.at('a/b').value).toBeUndefined();
  });

  it('chains at() from a leaf', () => {
    const json = asSignalJson({ rows: [{ value: 1 }] });

    json.at('rows/0').at('value').value = 7;

    expect(json.value).toEqual({ rows: [{ value: 7 }] });
  });
});
