import { beforeEach, describe, expect, it, vi } from 'vitest';
import { div, router, vLink, vRoute, vRouter, vRouterView, vRouterViews, vText } from '../index.js';

describe('router', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    window.localStorage.clear();
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

  it('supports element options and a final callback on vRouter', () => {
    let callbackRouter = null;
    const appRouter = vRouter(
      {
        default: '/',
        routes: [{ pattern: '/', config: () => div('首页') }]
      },
      { attrs: { 'data-router-demo': 'true' }, style: { minHeight: '80px' } },
      (node) => {
        callbackRouter = node;
        node.attr('data-callback', 'true');
      }
    );

    const element = appRouter.renderDom();

    expect(callbackRouter).toBe(appRouter);
    expect(element.dataset.routerDemo).toBe('true');
    expect(element.dataset.callback).toBe('true');
    expect(element.style.minHeight).toBe('80px');
  });

  it('renders route titles above matched content in vRouterViews', () => {
    const appRouter = vRouter({
      default: '/overview',
      routes: [
        vRoute('/overview', { title: '项目概览', view: () => div('概览内容') }),
        vRoute('/editor', { title: '代码编辑器', view: () => div('编辑内容') })
      ]
    });
    const views = vRouterViews(appRouter, { title: '工作区' });
    div((page) => page.child(views)).bindTo('#app');

    appRouter.start();
    expect(views.renderDom().classList.contains('yoya-vrouter-views')).toBe(true);
    expect(views.renderDom().querySelector('.yoya-vrouter-views-titlebar').tagName).toBe('HEADER');
    expect(
      views.renderDom().querySelector('.yoya-vrouter-views-titlebar').getAttribute('role')
    ).toBe('tablist');
    expect(views.renderDom().querySelector('.yoya-vrouter-views-titlebar').style.overflowX).toBe(
      'auto'
    );
    expect(views.renderDom().querySelector('.yoya-vrouter-views-titlebar').style.overflowY).toBe(
      'hidden'
    );
    expect(views.renderDom().querySelector('.yoya-vrouter-views-titlebar').style.width).toBe(
      '100%'
    );
    expect(
      views
        .renderDom()
        .querySelector('.yoya-vrouter-views-titlebar')
        .style.getPropertyValue('scrollbar-width')
    ).toBe('none');
    expect(
      document
        .querySelector('[data-yoya-vrouter-views-popup-style]')
        .textContent.includes('.yoya-vrouter-views-titlebar::-webkit-scrollbar')
    ).toBe(true);
    const titleTab = views.renderDom().querySelector('.yoya-vrouter-views-title');
    const titleLabel = titleTab.querySelector('.yoya-vrouter-views-label');
    expect(titleLabel.textContent).toBe('项目概览');
    expect(titleLabel.getAttribute('role')).toBe('tab');
    expect(titleTab.style.display).toBe('inline-flex');
    expect(titleTab.style.borderRadius).toBe('6px 6px 0 0');
    expect(views.renderDom().querySelector('.yoya-vrouter-views-content').textContent).toBe(
      '概览内容'
    );

    appRouter.navigate('/editor', { replace: true });
    const titleTabs = views.renderDom().querySelectorAll('.yoya-vrouter-views-title');
    expect(
      Array.from(titleTabs, (tab) => tab.querySelector('.yoya-vrouter-views-label').textContent)
    ).toEqual(['代码编辑器', '项目概览']);
    expect(
      titleTabs[0].querySelector('.yoya-vrouter-views-label').getAttribute('aria-selected')
    ).toBe('true');
    expect(
      titleTabs[1].querySelector('.yoya-vrouter-views-label').getAttribute('aria-selected')
    ).toBe('false');
    expect(views.renderDom().querySelectorAll('.yoya-vrouter-views-close')).toHaveLength(2);
    expect(views.renderDom().querySelector('.yoya-vrouter-views-content').textContent).toBe(
      '编辑内容'
    );

    titleTabs[1].querySelector('.yoya-vrouter-views-close').click();
    expect(appRouter.currentPath()).toBe('/editor');
    expect(views.renderDom().querySelectorAll('.yoya-vrouter-views-title')).toHaveLength(1);
    expect(views.renderDom().querySelector('.yoya-vrouter-views-content').textContent).toBe(
      '编辑内容'
    );

    appRouter.navigate('/overview', { replace: true });
    const reopenedTabs = views.renderDom().querySelectorAll('.yoya-vrouter-views-title');
    expect(
      Array.from(reopenedTabs, (tab) => tab.querySelector('.yoya-vrouter-views-label').textContent)
    ).toEqual(['项目概览', '代码编辑器']);
    reopenedTabs[0].querySelector('.yoya-vrouter-views-close').click();
    expect(appRouter.currentPath()).toBe('/editor');
    expect(
      views.renderDom().querySelector('.yoya-vrouter-views-label[aria-selected="true"]').textContent
    ).toBe('代码编辑器');
    expect(views.renderDom().querySelectorAll('.yoya-vrouter-views-title')).toHaveLength(1);
    expect(views.renderDom().querySelector('.yoya-vrouter-views-content').textContent).toBe(
      '编辑内容'
    );

    reopenedTabs[1].querySelector('.yoya-vrouter-views-close').click();
    expect(views.renderDom().querySelectorAll('.yoya-vrouter-views-title')).toHaveLength(0);
    expect(views.renderDom().querySelector('.yoya-vrouter-views-content').textContent).toBe('');
    expect(views.renderDom().querySelector('.yoya-vrouter-views-expand')).toBeNull();
  });

  it('switches to the previous tab when the active last tab closes', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/overview', { title: '项目概览', view: () => div('概览内容') }),
        vRoute('/editor', { title: '代码编辑器', view: () => div('编辑内容') })
      ]
    });
    const views = vRouterViews(appRouter);
    div((page) => page.child(views)).bindTo('#app');

    appRouter.navigate('/overview', { replace: true });
    appRouter.navigate('/editor', { replace: true });
    views
      .renderDom()
      .querySelector('[data-router-view-path="/editor"] .yoya-vrouter-views-close')
      .click();

    expect(appRouter.currentPath()).toBe('/overview');
    expect(views.renderDom().querySelectorAll('.yoya-vrouter-views-title')).toHaveLength(1);
    expect(views.renderDom().querySelector('.yoya-vrouter-views-content').textContent).toBe(
      '概览内容'
    );
  });

  it('supports a title resolver and cleans up its outlet subscription', () => {
    const appRouter = router((r) => {
      r.route('/file/:name', {
        title: ({ params }) => `文件：${params.name}`,
        view: ({ params }) => div(params.name)
      });
    });
    const views = vRouterViews(appRouter, {
      title: '未选择文件',
      titleResolver: ({ route }) => (typeof route?.title === 'function' ? route.title : null)
    });
    const root = div((page) => page.child(views)).bindTo('#app');

    appRouter.navigate('/file/main.js', { replace: true });
    expect(views.renderDom().querySelector('.yoya-vrouter-views-label').textContent).toBe(
      '文件：main.js'
    );
    root.destroy();
    expect(appRouter._subscribers.size).toBe(0);
  });

  it('shows an expand button when titles overflow and opens a title list popup', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/page-01', { title: '页面 1', view: () => div('一') }),
        vRoute('/page-02', { title: '页面 2', view: () => div('二') }),
        vRoute('/page-03', { title: '页面 3', view: () => div('三') }),
        vRoute('/page-04', { title: '页面 4', view: () => div('四') }),
        vRoute('/page-05', { title: '页面 5', view: () => div('五') }),
        vRoute('/page-06', { title: '页面 6', view: () => div('六') }),
        vRoute('/page-07', { title: '页面 7', view: () => div('七') }),
        vRoute('/page-08', { title: '页面 8', view: () => div('八') }),
        vRoute('/page-09', { title: '页面 9', view: () => div('九') }),
        vRoute('/page-10', { title: '页面 10', view: () => div('十') })
      ]
    });
    const views = vRouterViews(appRouter, { title: '工作区' });
    const root = div((page) => page.child(views)).bindTo('#app');

    [
      '/page-01',
      '/page-02',
      '/page-03',
      '/page-04',
      '/page-05',
      '/page-06',
      '/page-07',
      '/page-08',
      '/page-09',
      '/page-10'
    ].forEach((path) => appRouter.navigate(path, { replace: true }));

    const element = views.renderDom();
    const titlebar = element.querySelector('.yoya-vrouter-views-titlebar');
    views.updateOverflow();

    const button = titlebar.querySelector('.yoya-vrouter-views-expand');
    const popup = element.querySelector('.yoya-vrouter-views-popup');
    const visibleTabs = titlebar.querySelectorAll('.yoya-vrouter-views-title');
    expect(element.dataset.titleOverflow).toBe('true');
    expect(visibleTabs).toHaveLength(8);
    expect(
      Array.from(visibleTabs, (tab) => tab.querySelector('.yoya-vrouter-views-label').textContent)
    ).toEqual(['页面 10', '页面 9', '页面 8', '页面 7', '页面 6', '页面 5', '页面 4', '页面 3']);
    expect(button.style.display).toBe('inline-flex');
    expect(button.textContent).toBe('⋯');
    expect(button.style.borderWidth).toBe('0px');
    expect(button.style.justifyContent).toBe('center');
    expect(button.style.alignItems).toBe('center');
    expect(button.style.position).toBe('sticky');
    expect(button.style.right).toBe('8px');
    expect(button.style.zIndex).toBe('2');
    expect(button.style.marginLeft).toBe('auto');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(titlebar.lastElementChild).toBe(button);

    button.click();
    const items = popup.querySelectorAll('.yoya-vrouter-views-popup-item');
    expect(element.dataset.titlePopup).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(popup.style.display).toBe('block');
    expect(popup.style.getPropertyValue('scrollbar-width')).toBe('none');
    expect(document.querySelector('[data-yoya-vrouter-views-popup-style]')).not.toBeNull();
    expect(
      Array.from(items, (item) => item.querySelector('.yoya-vrouter-views-popup-title').textContent)
    ).toEqual(['页面 2', '页面 1']);
    expect(items[0].style.fontSize).toBe('13px');
    expect(popup.querySelectorAll('.yoya-vrouter-views-popup-close')).toHaveLength(2);
    expect(
      document
        .querySelector('[data-yoya-vrouter-views-popup-style]')
        .textContent.includes('.yoya-vrouter-views-popup-item:hover')
    ).toBe(true);

    popup.querySelectorAll('.yoya-vrouter-views-popup-close')[0].click();
    expect(appRouter.currentPath()).toBe('/page-10');
    expect(popup.querySelectorAll('.yoya-vrouter-views-popup-item')).toHaveLength(1);
    const remainingItems = popup.querySelectorAll('.yoya-vrouter-views-popup-item');
    expect(remainingItems[0].querySelector('.yoya-vrouter-views-popup-title').textContent).toBe(
      '页面 1'
    );

    window.dispatchEvent(new Event('scroll'));
    expect(element.dataset.titlePopup).toBe('true');

    remainingItems[0].click();
    expect(appRouter.currentPath()).toBe('/page-01');
    expect(element.dataset.titlePopup).toBeUndefined();
    expect(popup.style.display).toBe('none');

    button.click();
    const afterItems = popup.querySelectorAll('.yoya-vrouter-views-popup-item');
    expect(afterItems).toHaveLength(1);
    expect(afterItems[0].querySelector('.yoya-vrouter-views-popup-title').textContent).toBe(
      '页面 3'
    );
    const visibleTabsAfter = titlebar.querySelectorAll('.yoya-vrouter-views-title');
    expect(visibleTabsAfter).toHaveLength(8);
    expect(visibleTabsAfter[0].querySelector('.yoya-vrouter-views-label').textContent).toBe(
      '页面 1'
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(element.dataset.titlePopup).toBeUndefined();

    button.click();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(element.dataset.titlePopup).toBeUndefined();

    root.destroy();
  });

  it('keeps the overflow popup within the viewport near the expand button', () => {
    const paths = Array.from({ length: 10 }, (_, index) => `/viewport-${index + 1}`);
    const appRouter = vRouter({
      routes: paths.map((path, index) =>
        vRoute(path, { title: `页面 ${index + 1}`, view: () => div(String(index + 1)) })
      )
    });
    const views = vRouterViews(appRouter, { title: '工作区' });
    const root = div((page) => page.child(views)).bindTo('#app');

    paths.forEach((path) => appRouter.navigate(path, { replace: true }));
    const element = views.renderDom();
    views.updateOverflow();

    const button = element.querySelector('.yoya-vrouter-views-expand');
    const popup = element.querySelector('.yoya-vrouter-views-popup');
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 44,
      height: 24,
      left: 460,
      right: 484,
      top: 20,
      width: 24
    });
    vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue({
      bottom: 260,
      height: 260,
      left: 0,
      right: 180,
      top: 0,
      width: 180
    });

    button.click();

    expect(popup.style.left).toBe('304px');
    expect(popup.style.top).toBe('48px');

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 });
    window.dispatchEvent(new Event('resize'));

    expect(popup.style.top).toBe('8px');

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    vi.restoreAllMocks();
    root.destroy();
  });

  it('restores opened titles from storage after a page refresh', () => {
    const createRouter = () =>
      vRouter({
        routes: [
          vRoute('/persist-a', { title: '持久化 A', view: () => div('A') }),
          vRoute('/persist-b', { title: '持久化 B', view: () => div('B') }),
          vRoute('/persist-c', { title: '持久化 C', view: () => div('C') })
        ]
      });
    const firstRouter = createRouter();
    const firstViews = vRouterViews(firstRouter, { storageKey: 'test-router-views' });
    const firstRoot = div((page) => page.child(firstViews)).bindTo('#app');

    firstRouter.navigate('/persist-a', { replace: true });
    firstRouter.navigate('/persist-b', { replace: true });
    firstRouter.navigate('/persist-c', { replace: true });

    expect(JSON.parse(window.localStorage.getItem('test-router-views')).paths).toEqual([
      '/persist-c',
      '/persist-b',
      '/persist-a'
    ]);

    firstRoot.destroy();
    document.body.innerHTML = '<main id="app"></main>';

    const restoredRouter = createRouter();
    const restoredViews = vRouterViews(restoredRouter, { storageKey: 'test-router-views' });
    const restoredRoot = div((page) => page.child(restoredViews)).bindTo('#app');
    const restoredTabs = restoredViews.renderDom().querySelectorAll('.yoya-vrouter-views-title');

    expect(
      Array.from(restoredTabs, (tab) => tab.querySelector('.yoya-vrouter-views-label').textContent)
    ).toEqual(['持久化 C', '持久化 B', '持久化 A']);

    restoredRoot.destroy();
  });

  it('supports vertical title positions on the left and right', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/overview', { title: '概览', view: () => div('概览内容') }),
        vRoute('/settings', { title: '设置', view: () => div('设置内容') })
      ]
    });
    const views = vRouterViews(appRouter, { titlePosition: 'left' });
    const root = div((page) => page.child(views)).bindTo('#app');

    appRouter.navigate('/overview', { replace: true });
    appRouter.navigate('/settings', { replace: true });

    const element = views.renderDom();
    const titlebar = element.querySelector('.yoya-vrouter-views-titlebar');
    const overviewTab = titlebar.querySelector('[data-router-view-path="/overview"]');

    expect(element.dataset.titlePosition).toBe('left');
    expect(titlebar.getAttribute('aria-orientation')).toBe('vertical');
    expect(titlebar.style.flexDirection).toBe('column');
    expect(titlebar.style.borderRightWidth).toBe('1px');
    expect(titlebar.style.overflowY).toBe('auto');
    expect(titlebar.querySelector('.yoya-vrouter-views-expand')).toBeNull();
    expect(element.firstElementChild).toBe(titlebar);
    expect(overviewTab.style.borderRadius).toBe('6px 0 0 6px');
    expect(overviewTab.style.marginRight).toBe('-9px');

    views.titlePosition('right');

    expect(element.dataset.titlePosition).toBe('right');
    expect(titlebar.style.borderLeftWidth).toBe('1px');
    expect(titlebar.style.borderRightWidth).toBe('');
    expect(element.children[1]).toBe(titlebar);
    expect(overviewTab.style.borderRadius).toBe('0 6px 6px 0');
    expect(overviewTab.style.marginLeft).toBe('-9px');

    root.destroy();
  });

  it('locks the title area and scrolls only the content when configured', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/overview', { title: '概览', view: () => div('概览内容') }),
        vRoute('/settings', { title: '设置', view: () => div('设置内容') })
      ]
    });
    const views = vRouterViews(appRouter, { lockTitle: true, title: '工作区' });
    const root = div((page) => page.child(views)).bindTo('#app');

    appRouter.navigate('/overview', { replace: true });
    appRouter.navigate('/settings', { replace: true });

    const element = views.renderDom();
    const titlebar = element.querySelector('.yoya-vrouter-views-titlebar');
    const content = element.querySelector('.yoya-vrouter-views-content');

    expect(element.dataset.titleLocked).toBe('true');
    expect(element.style.display).toBe('flex');
    expect(element.style.flexDirection).toBe('column');
    expect(element.style.height).toContain('100');
    expect(titlebar.style.flex).toBe('0 0 auto');
    expect(content.style.flex).toBe('1 1 auto');
    expect(content.style.overflow).toBe('auto');
    expect(content.style.minHeight).toContain('0');

    views.titlePosition('left');

    expect(element.style.flexDirection).toBe('row');
    expect(titlebar.style.overflowY).toBe('auto');
    expect(content.style.overflow).toBe('auto');

    views.lockTitle(false);

    expect(element.dataset.titleLocked).toBeUndefined();
    expect(content.style.overflow).toBe('');
    expect(content.style.minHeight).toBe('120px');

    root.destroy();
  });
});
