import { describe, expect, it } from 'vitest';
import { configureRequest, RequestBase } from './request.js';

class MemberQuery extends RequestBase {
  constructor({ page = 1 } = {}) {
    super();
    this.page = page;
  }

  address() {
    return '/members';
  }

  params() {
    return { page: this.page };
  }
}

describe('RequestBase', () => {
  it('submits through the registered transport with overridden methods', async () => {
    const submitted = [];
    configureRequest({
      submit(request) {
        submitted.push(request);
        return { ok: true, data: request.params() };
      }
    });

    const query = new MemberQuery({ page: 2 });
    expect(query.method()).toBe('GET');
    expect(query.address()).toBe('/members');
    expect(await query.submit()).toEqual({ ok: true, data: { page: 2 } });
    expect(submitted).toHaveLength(1);
  });

  it('throws when no transport is registered', () => {
    configureRequest({ submit: null });
    expect(() => new RequestBase().submit()).toThrow(/configureRequest/);
  });
});
