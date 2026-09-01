import { describe, expect, it } from 'vitest';
import { Result } from './result.js';

describe('Result', () => {
  it('detects page kind and maps items', () => {
    const result = Result.from(
      { ok: true, code: '0', data: [{ id: 1 }, { id: 2 }], pageNum: 1, pageSize: 5, total: 2 },
      { toItem: (row) => ({ id: row.id }) }
    );

    expect(result.kind).toBe('page');
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.total).toBe(2);
    expect(result.pages).toBe(1);
  });

  it('detects list kind and maps items without paging', () => {
    const result = Result.from(
      { ok: true, code: '0', data: [{ id: 1 }, { id: 2 }] },
      { toItem: (row) => ({ id: row.id }) }
    );

    expect(result.kind).toBe('list');
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('detects detail kind and maps via toDetail', () => {
    const result = Result.from(
      { ok: true, code: '0', data: { id: 1 } },
      { toDetail: (data) => ({ id: data.id }) }
    );

    expect(result.kind).toBe('detail');
    expect(result.data).toEqual({ id: 1 });
  });

  it('throws on failure with message', () => {
    expect(() => Result.from({ ok: false, code: '500', msg: 'boom' })).toThrow('boom');
  });
});
