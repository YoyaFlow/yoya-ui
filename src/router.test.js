import { beforeEach, describe, expect, it, vi } from 'vitest';
import { div, router, vText } from './index.js';

describe('router', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, '', '/');
  });

  it('renders the matched route and exposes params and query', () => {
    const appRouter = router((r) => {
      r.route('/', () => div('首页'));
      r.route('/user/:id', ({ params, query }) =>
        div((page) => {
          page.h1(`用户 ${params.id}`);
          page.p(`标签 ${query.tab}`);
        })
      );
    });

    appRouter.bindTo('#app').start();
    appRouter.navigate('/user/42?tab=profile', { replace: true });

    expect(appRouter.currentPath()).toBe('/user/42?tab=profile');
    expect(appRouter.currentParams()).toEqual({ id: '42' });
    expect(appRouter.currentQuery()).toEqual({ tab: 'profile' });
    expect(document.querySelector('#app').textContent).toContain('用户 42');
    expect(document.querySelector('#app').textContent).toContain('标签 profile');
  });

  it('uses default and notFound views for missing routes', () => {
    const appRouter = router((r) => {
      r.default('/home');
      r.route('/home', () => div('首页'));
      r.notFound(({ path }) => div(`未找到 ${path}`));
    });

    appRouter.bindTo('#app').start();
    expect(appRouter.currentPath()).toBe('/home');
    expect(document.querySelector('#app').textContent).toBe('首页');

    appRouter.navigate('/missing', { replace: true });
    expect(document.querySelector('#app').textContent).toBe('未找到 /missing');
  });

  it('supports route guards and text node route results', () => {
    const beforeEachGuard = vi.fn(() => true);
    const blockedGuard = vi.fn(() => false);
    const appRouter = router((r) => {
      r.beforeEach(beforeEachGuard);
      r.route('/ok', () => vText('可以访问'));
      r.route('/blocked', {
        beforeEnter: blockedGuard,
        view: () => div('不应渲染')
      });
    });

    appRouter.bindTo('#app').start();
    appRouter.navigate('/ok', { replace: true });
    appRouter.navigate('/blocked', { replace: true });

    expect(beforeEachGuard).toHaveBeenCalled();
    expect(blockedGuard).toHaveBeenCalled();
    expect(document.querySelector('#app').textContent).toBe('可以访问');
    expect(appRouter.currentPath()).toBe('/ok');
  });

  it('does not render twice when hashchange follows navigate', () => {
    const renderView = vi.fn(() => div('一次渲染'));
    const appRouter = router((r) => {
      r.route('/count', renderView);
    });

    appRouter.bindTo('#app').start();
    appRouter.navigate('/count');
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(renderView).toHaveBeenCalledTimes(1);
  });
});
