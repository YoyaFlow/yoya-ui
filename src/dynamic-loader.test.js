import { describe, expect, it, vi } from 'vitest';
import { clearDynamicModuleCache, div, preloadDynamicModule, vDynamicLoader } from './index.js';

function deferred() {
  let reject;
  let resolve;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

describe('vDynamicLoader', () => {
  it('renders pending, loading, and loaded views with state notifications', async () => {
    const request = deferred();
    const onStateChange = vi.fn();
    const loader = vDynamicLoader({
      auto: false,
      loader: () => request.promise,
      onStateChange,
      views: {
        loaded: (module) => div(`已加载 ${module.name}`),
        loading: () => div('加载中'),
        pending: () => div('等待加载')
      }
    });
    loader.bindTo(document.body);

    expect(loader.status()).toBe('pending');
    expect(loader.renderDom().textContent).toBe('等待加载');
    const loading = loader.load();
    expect(loader.status()).toBe('loading');
    expect(loader.renderDom().textContent).toBe('加载中');

    request.resolve({ name: '报表模块' });
    await loading;
    expect(loader.status()).toBe('loaded');
    expect(loader.state()).toBe('loaded');
    expect(loader.module()).toEqual({ name: '报表模块' });
    expect(loader.value()).toEqual({ name: '报表模块' });
    expect(loader.error()).toBe(null);
    expect(loader.renderDom().textContent).toBe('已加载 报表模块');
    expect(onStateChange.mock.calls.map(([status]) => status)).toEqual(['loading', 'loaded']);
  });

  it('renders an error view and retries with a fresh load', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('网络失败'))
      .mockResolvedValueOnce({ name: '恢复模块' });
    const loader = vDynamicLoader({
      auto: false,
      loader: load,
      views: {
        error: (error) => div(`失败：${error.message}`),
        loaded: (module) => div(`成功：${module.name}`)
      }
    });

    await expect(loader.load()).rejects.toThrow('网络失败');
    expect(loader.status()).toBe('error');
    expect(loader.loadError().message).toBe('网络失败');
    expect(loader.renderDom().textContent).toBe('失败：网络失败');

    await loader.retry();
    expect(load).toHaveBeenCalledTimes(2);
    expect(loader.status()).toBe('loaded');
    expect(loader.renderDom().textContent).toBe('成功：恢复模块');
  });

  it('keeps loaded state when a loaded notification callback throws', async () => {
    const callbackError = new Error('通知失败');
    const loader = vDynamicLoader({
      auto: false,
      loader: () => Promise.resolve({ name: '稳定模块' }),
      onStateChange: (status) => {
        if (status === 'loaded') throw callbackError;
      },
      views: {
        error: (error) => div(`错误：${error.message}`),
        loaded: (module) => div(`完成：${module.name}`)
      }
    });

    await expect(loader.load()).rejects.toThrow('通知失败');
    expect(loader.state()).toBe('loaded');
    expect(loader.value()).toEqual({ name: '稳定模块' });
    expect(loader.error()).toBe(null);
    expect(loader.renderDom().textContent).toBe('完成：稳定模块');
  });

  it('ignores late async completion after destroy', async () => {
    const request = deferred();
    const onStateChange = vi.fn();
    const load = vi.fn(() => request.promise);
    const loader = vDynamicLoader({
      auto: false,
      loader: load,
      onStateChange
    });
    const loading = loader.load();

    loader.destroy();
    request.resolve({ name: '迟到模块' });
    await loading;

    expect(onStateChange.mock.calls.map(([status]) => status)).toEqual(['loading']);
    expect(loader.status()).toBe('loading');

    await loader.load();
    expect(load).toHaveBeenCalledTimes(1);
    expect(onStateChange.mock.calls.map(([status]) => status)).toEqual(['loading']);
  });

  it('shares cached modules and reloads after per-key cache clearing', async () => {
    clearDynamicModuleCache();
    const load = vi.fn().mockResolvedValue({ name: '共享模块' });
    const first = vDynamicLoader({ auto: false, cacheKey: 'reports', loader: load });
    const second = vDynamicLoader({ auto: false, cacheKey: 'reports', loader: load });

    await Promise.all([first.load(), second.load()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(first.module()).toBe(second.module());

    first.clearCache();
    await second.retry();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('preloads modules, clears the full cache, and supports the parent shortcut', async () => {
    clearDynamicModuleCache();
    const load = vi.fn().mockResolvedValue({ name: '图表模块' });
    await preloadDynamicModule('charts', load);
    const root = div((page) => {
      page.vDynamicLoader({ auto: false, cacheKey: 'charts', loader: load });
    });
    const loader = root.children()[0];

    await loader.load();
    expect(load).toHaveBeenCalledTimes(1);
    clearDynamicModuleCache();
    await loader.preload();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
