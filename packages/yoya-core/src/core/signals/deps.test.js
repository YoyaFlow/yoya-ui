import { describe, expect, it } from 'vitest';
import { beginCollect, endCollect, recordRead, withCollect, withoutCollect } from './deps.js';

describe('dependency collection', () => {
  it('collects reads made inside withCollect and returns the value', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };

    const result = withCollect(() => {
      recordRead(a);
      recordRead(b);
      return 42;
    });

    expect(result.value).toBe(42);
    expect(result.sources).toEqual([a, b]);
  });

  it('deduplicates sources while keeping first-seen order', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };

    const result = withCollect(() => {
      recordRead(a);
      recordRead(b);
      recordRead(a);
    });

    expect(result.sources).toEqual([a, b]);
  });

  it('ignores reads made outside any collector', () => {
    const a = { id: 'a' };

    expect(() => recordRead(a)).not.toThrow();

    const result = withCollect(() => 'value');
    expect(result.sources).toEqual([]);
  });

  it('keeps nested collections separate', () => {
    const outer = { id: 'outer' };
    const inner = { id: 'inner' };

    const result = withCollect(() => {
      recordRead(outer);
      const nested = withCollect(() => recordRead(inner));
      return nested.sources;
    });

    expect(result.value).toEqual([inner]);
    expect(result.sources).toEqual([outer]);
  });

  it('supports push/pop style collection for runs bounded elsewhere', () => {
    const a = { id: 'a' };

    const token = beginCollect();
    recordRead(a);
    const sources = endCollect(token);

    expect(sources).toEqual([a]);
  });

  it('stops recording once the token is closed', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const token = beginCollect();
    recordRead(a);
    endCollect(token);

    recordRead(b);

    const result = withCollect(() => recordRead(b));
    expect(result.sources).toEqual([b]);
  });

  it('ignores reads inside withoutCollect even when a collector is active', () => {
    const tracked = { id: 'tracked' };
    const ignored = { id: 'ignored' };

    const result = withCollect(() => {
      recordRead(tracked);
      const value = withoutCollect(() => {
        recordRead(ignored);
        return 'peeked';
      });
      return value;
    });

    expect(result.value).toBe('peeked');
    expect(result.sources).toEqual([tracked]);
  });

  it('restores the outer collector after a nested run throws', () => {
    const a = { id: 'a' };

    expect(() =>
      withCollect(() => {
        throw new Error('boom');
      })
    ).toThrow('boom');

    const result = withCollect(() => recordRead(a));
    expect(result.sources).toEqual([a]);
  });
});
