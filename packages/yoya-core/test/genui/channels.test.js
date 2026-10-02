import { describe, expect, it, vi } from 'vitest';
import { createGenUI } from '../../src/genui/index.js';

const actions = {
  actions: {
    users: { check: { type: 'http', url: 'https://api.test/users/check', method: 'GET' } },
    orders: { submit: { type: 'http', url: 'https://api.test/orders', method: 'POST' } }
  }
};

function clickButton(surface) {
  const target = document.createElement('div');
  surface.bindTo(target);
  target.querySelector('button').click();
}

describe('send + @actions + /ui/pending', () => {
  it('send 只能调用注册表动作，带 collect 请求体并回流响应 ops', async () => {
    const fetch = vi.fn(async () => ({
      json: async () => ({
        data: { ops: [{ op: 'data', path: '/order/qty', value: 5 }] }
      })
    }));
    const genui = createGenUI({
      custodians: actions,
      fetch,
      functions: { unwrap: (value) => value.ops }
    });
    const surface = genui.fromJson({
      data: { order: { sku: '500ml', qty: 2 } },
      root: {
        type: 'button',
        on: {
          click: {
            $action: 'send',
            params: {
              action: '@actions:/orders/submit',
              data: { collect: '@:/order' },
              pick: 'data',
              transform: 'unwrap'
            }
          }
        }
      }
    });

    clickButton(surface);
    await vi.waitFor(() => expect(surface.data.read('/order/qty')).toBe(5));

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test/orders',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sku: '500ml', qty: 2 })
      })
    );
    expect(surface.data.read('/ui/pending/orders/submit')).toBe(false);
  });

  it('send 在途时写 /ui/pending/<名>，重复触发不会重复请求', async () => {
    let resolveFetch;
    const fetch = vi.fn(() => new Promise((resolve) => (resolveFetch = resolve)));
    const genui = createGenUI({ custodians: actions, fetch });
    const surface = genui.fromJson({
      root: {
        type: 'button',
        on: {
          click: {
            $action: 'send',
            params: { action: '@actions:/orders/submit', data: { fields: {} } }
          }
        }
      }
    });

    clickButton(surface);
    clickButton(surface);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(surface.data.read('/ui/pending/orders/submit')).toBe(true);

    resolveFetch({ json: async () => ({}) });
    await vi.waitFor(() => expect(surface.data.read('/ui/pending/orders/submit')).toBe(false));
  });

  it('未注册 action 在 schema 校验阶段失败', () => {
    const genui = createGenUI({ custodians: actions });

    expect(() =>
      genui.fromJson({
        root: {
          type: 'button',
          on: {
            click: {
              $action: 'send',
              params: { action: '@actions:/orders/nope', data: { fields: {} } }
            }
          }
        }
      })
    ).toThrow(/未注册的 @actions/);
  });
});

describe('sources 依赖驱动', () => {
  it('params 变化防抖重取，响应经 pick/transform 物化到目标路径', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => ({ json: async () => ({ data: { taken: true } }) }));
    const genui = createGenUI({
      custodians: actions,
      fetch,
      functions: {
        normalize: (value) => ({ ...value, checkedAt: 'now' })
      }
    });
    const surface = genui.fromJson({
      data: { form: { username: '' } },
      sources: {
        '@:/ui/check': {
          action: '@actions:/users/check',
          params: { username: '@:/form/username' },
          when: '@:/form/username',
          debounce: 20,
          pick: 'data',
          transform: 'normalize'
        }
      },
      root: { type: 'p', text: '@:/ui/check/taken' }
    });

    await vi.advanceTimersByTimeAsync(30);
    expect(fetch).not.toHaveBeenCalled();

    surface.data.write('/form/username', 'abc');
    surface.data.write('/form/username', 'abcd');
    await vi.advanceTimersByTimeAsync(30);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/users/check?username=abcd');
    expect(surface.data.read('/ui/check')).toEqual({ taken: true, checkedAt: 'now' });
    expect(surface.data.read('/ui/pending/check')).toBe(false);

    vi.useRealTimers();
  });

  it('依赖再变时中止在途请求，旧响应不覆盖新响应', async () => {
    const deferred = [];
    const fetch = vi.fn(() => new Promise((resolve) => deferred.push(resolve)));
    const genui = createGenUI({ custodians: actions, fetch });
    const surface = genui.fromJson({
      data: { form: { username: 'a' } },
      sources: {
        '@:/ui/check': {
          action: '@actions:/users/check',
          params: { username: '@:/form/username' },
          pick: 'data'
        }
      },
      root: { type: 'p' }
    });

    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);
    surface.data.write('/form/username', 'b');
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(2);

    deferred[0]({ json: async () => ({ data: { value: 'old' } }) });
    await Promise.resolve();
    expect(surface.data.read('/ui/check')).toBeUndefined();

    deferred[1]({ json: async () => ({ data: { value: 'new' } }) });
    await vi.waitFor(() => expect(surface.data.read('/ui/check/value')).toBe('new'));
  });

  it('source 目标不能依赖自身，避免反馈环', () => {
    const genui = createGenUI({ custodians: actions });

    expect(() =>
      genui.fromJson({
        sources: {
          '@:/ui/check': {
            action: '@actions:/users/check',
            params: { value: '@:/ui/check/value' }
          }
        },
        root: { type: 'p' }
      })
    ).toThrow(/source 目标不能依赖自身/);
  });
});

describe('send/source 的能力与生命周期边界', () => {
  /** 无 fetch 环境（老 node / SSR）：只在真的发请求时暴露缺失，不拖垮整页构建。 */
  function withoutGlobalFetch(run) {
    const original = globalThis.fetch;
    delete globalThis.fetch;

    try {
      return run();
    } finally {
      if (original === undefined) {
        delete globalThis.fetch;
      } else {
        globalThis.fetch = original;
      }
    }
  }

  it('没有全局 fetch 时照常构建，缺失能力落到 /ui/errors', async () => {
    await withoutGlobalFetch(async () => {
      const genui = createGenUI({ custodians: actions });
      const surface = genui.fromJson({
        data: { form: { username: 'abc' } },
        sources: {
          '@:/ui/check': {
            action: '@actions:/users/check',
            params: { username: '@:/form/username' }
          }
        },
        root: {
          type: 'button',
          on: {
            click: {
              $action: 'send',
              params: { action: '@actions:/orders/submit', data: { fields: {} } }
            }
          }
        }
      });

      await vi.waitFor(() => expect(surface.data.read('/ui/errors/check')).toMatch(/fetch/));
      expect(surface.data.read('/ui/pending/check')).toBe(false);
    });
  });

  it('destroy 中止在途 send，迟到回调不再写 /ui 状态', async () => {
    const signals = [];
    const fetch = vi.fn((_url, options) => {
      signals.push(options.signal);
      return new Promise(() => {});
    });
    const genui = createGenUI({ custodians: actions, fetch });
    const surface = genui.fromJson({
      root: {
        type: 'button',
        on: {
          click: {
            $action: 'send',
            params: { action: '@actions:/orders/submit', data: { fields: {} } }
          }
        }
      }
    });

    clickButton(surface);
    expect(surface.data.read('/ui/pending/orders/submit')).toBe(true);
    expect(signals[0].aborted).toBe(false);

    surface.destroy();
    expect(signals[0].aborted).toBe(true);
    // 迟到回调（abort → reject → finally）不再回写：pending 保持中止那一刻的值
    await Promise.resolve();
    expect(surface.data.read('/ui/pending/orders/submit')).toBe(true);
  });

  it('HTTP 4xx/5xx 不当成数据写入：落到 /ui/errors 并带上响应里的原因', async () => {
    const fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ ok: false, code: 'param_invalid', error: '参数 "pageSize" 不能小于 5' })
    }));
    const genui = createGenUI({ custodians: actions, fetch });
    const surface = genui.fromJson({
      data: { query: { pageSize: 1 } },
      sources: {
        '@:/data/rows': {
          action: '@actions:/users/check',
          params: { pageSize: '@:/query/pageSize' }
        }
      },
      root: { type: 'p', text: '@:/data/rows' }
    });
    const target = document.createElement('div');

    surface.bindTo(target);

    await vi.waitFor(() =>
      expect(surface.data.read('/ui/errors/data/rows')).toMatch(/不能小于 5/)
    );
    // 目标路径没被错误体污染
    expect(surface.data.read('/data/rows')).toBeUndefined();
    expect(surface.data.read('/ui/pending/data/rows')).toBe(false);
  });

  it('HTTP 失败响应不是 JSON 时也能给出可读原因', async () => {
    const fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => '数据面子进程已退出'
    }));
    const genui = createGenUI({ custodians: actions, fetch });
    const surface = genui.fromJson({
      sources: { '@:/data/rows': { action: '@actions:/users/check' } },
      root: { type: 'p', text: '@:/data/rows' }
    });

    surface.bindTo(document.createElement('div'));

    await vi.waitFor(() =>
      expect(surface.data.read('/ui/errors/data/rows')).toMatch(/数据面子进程已退出（HTTP 503）/)
    );
  });
});
