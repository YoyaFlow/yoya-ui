import { beforeEach, describe, expect, it, vi } from 'vitest';
import { div, router, vLink, vRoute, vRouter, vRouterView, vText } from './index.js';

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

  it('renders resolved routes into an attached outlet and notifies subscribers', () => {
    const outlet = div().className('test-router-outlet');
    const changes = [];
    const appRouter = router((r) => {
      r.route('/users/:id', ({ params, query }) => div(`用户 ${params.id} / ${query.tab}`));
      r.notFound(({ path }) => div(`未找到 ${path}`));
    });
    const unsubscribe = appRouter.subscribe(({ params, path, query }) => {
      changes.push({ params, path, query });
    });

    appRouter.outlet(outlet);
    outlet.bindTo('#app');
    appRouter.navigate('/users/42?tab=profile', { replace: true });

    expect(document.querySelector('.test-router-outlet').textContent).toBe('用户 42 / profile');
    expect(changes).toEqual([
      {
        params: { id: '42' },
        path: '/users/42?tab=profile',
        query: { tab: 'profile' }
      }
    ]);

    unsubscribe();
    appRouter.navigate('/missing', { replace: true });
    expect(document.querySelector('.test-router-outlet').textContent).toBe('未找到 /missing');
    expect(changes).toHaveLength(1);
  });

  it('refreshes an attached outlet when browser history changes the hash', () => {
    const outlet = div();
    const appRouter = router((r) => {
      r.route('/history/:id', ({ params, query }) => div(`${params.id}:${query.mode}`));
      r.notFound(() => div('404'));
    });

    appRouter.outlet(outlet);
    outlet.bindTo('#app');
    appRouter.start();
    window.history.replaceState(null, '', '#/history/7?mode=back');
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(appRouter.currentPath()).toBe('/history/7?mode=back');
    expect(document.querySelector('#app').textContent).toBe('7:back');
    appRouter.stop();
  });

  it('creates router links with params, query, delegated navigation, and active state', () => {
    const appRouter = router((r) => {
      r.route('/users/:id', ({ params, query }) => div(`${params.id}:${query.tab}`));
      r.route('/settings', () => div('设置'));
    });
    const link = vLink(appRouter, {
      label: '用户资料',
      params: { id: 'Ada Lovelace' },
      query: { tab: 'profile' },
      to: '/users/:id'
    });
    const outlet = vRouterView(appRouter);
    const root = div((page) => page.child(link, outlet)).bindTo('#app');
    const element = document.querySelector('.yoya-vlink');

    expect(element.textContent).toBe('用户资料');
    expect(element.getAttribute('href')).toBe('#/users/Ada%20Lovelace?tab=profile');
    expect(outlet.renderDom().classList.contains('yoya-vrouter-view')).toBe(true);

    const click = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });
    element.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(appRouter.currentPath()).toBe('/users/Ada%20Lovelace?tab=profile');
    expect(element.getAttribute('aria-current')).toBe('page');
    expect(element.classList.contains('is-active')).toBe(true);
    expect(outlet.renderDom().textContent).toBe('Ada Lovelace:profile');

    appRouter.navigate('/settings', { replace: true });
    expect(element.hasAttribute('aria-current')).toBe(false);
    expect(element.classList.contains('is-active')).toBe(false);
    root.destroy();
  });

  it('preserves modified link clicks and registers parent shortcuts', () => {
    const appRouter = router((r) => r.route('/reports', () => div('报表')));
    const root = div((page) => {
      page.vLink(appRouter, { label: '报表', to: '/reports' });
      page.vRouterView(appRouter);
    }).bindTo('#app');
    const element = document.querySelector('.yoya-vlink');
    const click = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      ctrlKey: true
    });

    element.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(appRouter.currentPath()).toBe('/');
    expect(root.children()[1].className()).toContain('yoya-vrouter-view');

    root.destroy();
    expect(appRouter._subscribers.size).toBe(0);
  });

  it('declares routes through vRoute descriptors and renders with vRouter', () => {
    const appRouter = vRouter({
      default: '/home',
      notFound: ({ path }) => div(`404 ${path}`),
      routes: [
        vRoute('/home', () => div('首页')),
        vRoute('/users/:id', ({ params, query }) => div(`${params.id}:${query.tab}`))
      ]
    });
    const outlet = vRouterView(appRouter);
    div((page) => page.child(outlet)).bindTo('#app');

    appRouter.start();
    expect(appRouter.currentPath()).toBe('/home');
    expect(outlet.renderDom().textContent).toBe('首页');
    appRouter.navigate('/users/7?tab=activity', { replace: true });
    expect(outlet.renderDom().textContent).toBe('7:activity');
    appRouter.navigate('/missing', { replace: true });
    expect(outlet.renderDom().textContent).toBe('404 /missing');
  });

  it('supports vRouter setup callbacks and route guards without duplicating Router behavior', () => {
    const guard = vi.fn(() => true);
    const appRouter = vRouter((routes) => {
      routes.default('/guarded');
      routes.beforeEach(guard);
      routes.vRoute('/guarded', {
        beforeEnter: () => true,
        view: () => div('通过')
      });
      routes.vRoute('/blocked', {
        beforeEnter: () => false,
        view: () => div('不应显示')
      });
      routes.notFound(() => div('404'));
    });
    const outlet = vRouterView(appRouter);
    div((page) => page.child(outlet)).bindTo('#app');

    appRouter.start();
    appRouter.navigate('/blocked', { replace: true });
    expect(guard).toHaveBeenCalled();
    expect(appRouter.currentPath()).toBe('/guarded');
    expect(outlet.renderDom().textContent).toBe('通过');
  });
});
