import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  div,
  inject,
  provide,
  router,
  vLink,
  vRoute,
  vRouter,
  vRouterView,
  vRouterViews,
  vText
} from '../index.js';
import { createI18n } from '@yoyaflow/yoya-core/tools';

const flush = async () => {};
function openTabMenu(path) {
  const tab = document.querySelector(`[data-router-view-path="${path}"]`);
  tab.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 90
    })
  );
  return tab;
}

function clickMenuItem(label) {
  const items = document.querySelectorAll('[vn~="VRouterViewsContextItem"]');
  const item = Array.from(items).find((node) => node.textContent === label);
  item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return item;
}

function createViewsWithRoutes(routes) {
  const appRouter = vRouter({ routes });
  const views = vRouterViews(appRouter);
  const root = div((page) => page.child(views)).bindTo('#app');
  return { appRouter, root, views };
}

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

  it('supports history mode navigation and popstate', () => {
    const appRouter = router((r) => {
      r.default('/home');
      r.route('/home', () => div('首页'));
      r.route('/user/:id', ({ params, query }) => div(`${params.id}:${query.tab}`));
      r.notFound(({ path }) => div(`404 ${path}`));
    });

    appRouter.mode('history');
    appRouter.bindTo('#app').start();

    expect(appRouter.mode()).toBe('history');
    expect(appRouter.currentPath()).toBe('/home');
    expect(window.location.pathname).toBe('/home');

    appRouter.navigate('/user/42?tab=profile');

    expect(appRouter.currentPath()).toBe('/user/42?tab=profile');
    expect(window.location.pathname).toBe('/user/42');
    expect(window.location.search).toBe('?tab=profile');
    expect(document.querySelector('#app').textContent).toBe('42:profile');

    window.history.pushState(null, '', '/user/7?tab=back');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(appRouter.currentPath()).toBe('/user/7?tab=back');
    expect(document.querySelector('#app').textContent).toBe('7:back');
    appRouter.stop();
  });

  it('renders vLink href without hash in history mode', () => {
    const appRouter = router((r) => {
      r.route('/users/:id', () => div('用户'));
    });

    appRouter.mode('history');
    const link = vLink(appRouter, {
      label: '用户资料',
      to: '/users/42'
    });
    const element = link.renderDom();

    expect(element.getAttribute('href')).toBe('/users/42');

    appRouter.navigate('/users/42', { replace: true });
    expect(element.getAttribute('aria-current')).toBe('page');
  });

  it('supports mode through declarative vRouter config', () => {
    const appRouter = vRouter({
      default: '/docs',
      mode: 'history',
      routes: [vRoute('/docs', () => div('文档'))]
    });

    appRouter.bindTo('#app').start();

    expect(appRouter.mode()).toBe('history');
    expect(appRouter.currentPath()).toBe('/docs');
    expect(window.location.pathname).toBe('/docs');
    expect(document.querySelector('#app').textContent).toBe('文档');
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
    const element = document.querySelector('[vn~="VLink"]');

    expect(element.textContent).toBe('用户资料');
    expect(element.getAttribute('href')).toBe('#/users/Ada%20Lovelace?tab=profile');
    expect(outlet.renderDom().getAttribute('vn')).toBe('VRouterView');

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
    const notified = vi.fn();

    appRouter.subscribe(notified);
    const root = div((page) => {
      page.vLink(appRouter, { label: '报表', to: '/reports' });
      page.vRouterView(appRouter);
    }).bindTo('#app');
    const element = document.querySelector('[vn~="VLink"]');
    const click = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      ctrlKey: true
    });

    element.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(appRouter.currentPath()).toBe('/');
    expect(root.children()[1].attr('vn')).toContain('VRouterView');

    notified.mockClear();
    const subscribersBeforeDestroy = appRouter.subscriberCount();
    root.destroy();
    // 销毁树时子组件把自己的订阅收干净（链接退订），剩下的是测试自己加的那一个
    expect(appRouter.subscriberCount()).toBe(subscribersBeforeDestroy - 1);
    expect(notified).not.toHaveBeenCalled();
  });

  it('renders ViewNode labels (e.g. I18n text nodes) instead of stringifying them', () => {
    const locale = createI18n({
      language: 'en',
      messages: { en: { home: 'Home' }, 'zh-CN': { home: '首页' } }
    });
    const appRouter = router((r) => r.route('/home', () => div('home')));
    const link = vLink(appRouter, { label: '首页'.s('home', locale), to: '/home' });

    document.body.innerHTML = '';
    document.body.appendChild(link.renderDom());

    const label = document.querySelector('[vn~="VLink"]');
    expect(label.textContent).toBe('Home');
    expect(label.textContent).not.toContain('[object');
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
    expect(views.renderDom().getAttribute('vn')).toBe('VRouterViews');
    expect(views.renderDom().querySelector('[vn~="VRouterViewsTitlebar"]').tagName).toBe('HEADER');
    expect(
      views.renderDom().querySelector('[vn~="VRouterViewsTitlebar"]').getAttribute('role')
    ).toBe('tablist');
    // 标题条的静态样式（含 overflow 两轴）在 `yoya.ui.css`，这里只认身份与结构
    expect(views.renderDom().querySelector('[vn~="VRouterViewsTitlebar"]')).not.toBeNull();
    expect(views.renderDom().dataset.titlePosition).toBe('top');
    // 滚动条隐藏 / 各部件静态样式都在 `yoya.ui.css`（`css-contract.test.js` 按选择器守着），
    // 运行期不再注入样式表
    expect(document.querySelector('[data-yoya-router-popup-style]')).toBeNull();
    const titleTab = views.renderDom().querySelector('[vn~="VRouterViewsTitle"]');
    const titleLabel = titleTab.querySelector('[vn~="VRouterViewsLabel"]');
    expect(titleLabel.textContent).toBe('项目概览');
    expect(titleLabel.getAttribute('role')).toBe('tab');
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
      '概览内容'
    );

    appRouter.navigate('/editor', { replace: true });
    const titleTabs = views.renderDom().querySelectorAll('[vn~="VRouterViewsTitle"]');
    expect(
      Array.from(titleTabs, (tab) => tab.querySelector('[vn~="VRouterViewsLabel"]').textContent)
    ).toEqual(['代码编辑器', '项目概览']);
    expect(
      titleTabs[0].querySelector('[vn~="VRouterViewsLabel"]').getAttribute('aria-selected')
    ).toBe('true');
    expect(
      titleTabs[1].querySelector('[vn~="VRouterViewsLabel"]').getAttribute('aria-selected')
    ).toBe('false');
    expect(views.renderDom().querySelectorAll('[vn~="VRouterViewsClose"]')).toHaveLength(2);
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
      '编辑内容'
    );

    titleTabs[1].querySelector('[vn~="VRouterViewsClose"]').click();
    expect(appRouter.currentPath()).toBe('/editor');
    expect(views.renderDom().querySelectorAll('[vn~="VRouterViewsTitle"]')).toHaveLength(1);
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
      '编辑内容'
    );

    appRouter.navigate('/overview', { replace: true });
    const reopenedTabs = views.renderDom().querySelectorAll('[vn~="VRouterViewsTitle"]');
    expect(
      Array.from(reopenedTabs, (tab) => tab.querySelector('[vn~="VRouterViewsLabel"]').textContent)
    ).toEqual(['项目概览', '代码编辑器']);
    reopenedTabs[0].querySelector('[vn~="VRouterViewsClose"]').click();
    expect(appRouter.currentPath()).toBe('/editor');
    expect(
      views.renderDom().querySelector('[vn~="VRouterViewsLabel"][aria-selected="true"]').textContent
    ).toBe('代码编辑器');
    expect(views.renderDom().querySelectorAll('[vn~="VRouterViewsTitle"]')).toHaveLength(1);
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
      '编辑内容'
    );

    reopenedTabs[1].querySelector('[vn~="VRouterViewsClose"]').click();
    expect(views.renderDom().querySelectorAll('[vn~="VRouterViewsTitle"]')).toHaveLength(0);
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe('');
    expect(views.renderDom().querySelector('[vn~="VRouterViewsExpand"]')).toBeNull();
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
      .querySelector('[data-router-view-path="/editor"] [vn~="VRouterViewsClose"]')
      .click();

    expect(appRouter.currentPath()).toBe('/overview');
    expect(views.renderDom().querySelectorAll('[vn~="VRouterViewsTitle"]')).toHaveLength(1);
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
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
    const notified = vi.fn();

    appRouter.subscribe(notified);

    appRouter.navigate('/file/main.js', { replace: true });
    expect(views.renderDom().querySelector('[vn~="VRouterViewsLabel"]').textContent).toBe(
      '文件：main.js'
    );
    notified.mockClear();
    const subscribersBeforeDestroy = appRouter.subscriberCount();
    root.destroy();
    // 销毁时 vRouterViews 会退订自己的出口订阅，剩下的是测试自己加的那一个
    expect(appRouter.subscriberCount()).toBe(subscribersBeforeDestroy - 1);
    expect(notified).not.toHaveBeenCalled();
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
    const titlebar = element.querySelector('[vn~="VRouterViewsTitlebar"]');
    views.updateOverflow();

    const button = titlebar.querySelector('[vn~="VRouterViewsExpand"]');
    const popup = element.querySelector('[vn~="VRouterViewsPopup"]');
    const visibleTabs = titlebar.querySelectorAll('[vn~="VRouterViewsTitle"]');
    expect(element.dataset.titleOverflow).toBe('true');
    expect(visibleTabs).toHaveLength(8);
    expect(
      Array.from(visibleTabs, (tab) => tab.querySelector('[vn~="VRouterViewsLabel"]').textContent)
    ).toEqual(['页面 10', '页面 9', '页面 8', '页面 7', '页面 6', '页面 5', '页面 4', '页面 3']);
    expect(button.textContent).toBe('⋯');
    // 溢出按钮的静态样式与打开规则都在 CSS（`[data-title-overflow='true']`），这里看状态属性
    expect(element.dataset.titleOverflow).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(titlebar.lastElementChild).toBe(button);

    button.click();
    const items = popup.querySelectorAll('[vn~="VRouterViewsPopupItem"]');
    expect(element.dataset.titlePopup).toBe('true');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[data-yoya-router-popup-style]')).toBeNull();
    expect(
      Array.from(items, (item) => item.querySelector('[vn~="VRouterViewsPopupTitle"]').textContent)
    ).toEqual(['页面 2', '页面 1']);
    expect(popup.querySelectorAll('[vn~="VRouterViewsPopupClose"]')).toHaveLength(2);

    popup.querySelectorAll('[vn~="VRouterViewsPopupClose"]')[0].click();
    expect(appRouter.currentPath()).toBe('/page-10');
    expect(popup.querySelectorAll('[vn~="VRouterViewsPopupItem"]')).toHaveLength(1);
    const remainingItems = popup.querySelectorAll('[vn~="VRouterViewsPopupItem"]');
    expect(remainingItems[0].querySelector('[vn~="VRouterViewsPopupTitle"]').textContent).toBe(
      '页面 1'
    );

    window.dispatchEvent(new Event('scroll'));
    expect(element.dataset.titlePopup).toBe('true');

    remainingItems[0].click();
    expect(appRouter.currentPath()).toBe('/page-01');
    expect(element.dataset.titlePopup).toBeUndefined();

    button.click();
    const afterItems = popup.querySelectorAll('[vn~="VRouterViewsPopupItem"]');
    expect(afterItems).toHaveLength(1);
    expect(afterItems[0].querySelector('[vn~="VRouterViewsPopupTitle"]').textContent).toBe(
      '页面 3'
    );
    const visibleTabsAfter = titlebar.querySelectorAll('[vn~="VRouterViewsTitle"]');
    expect(visibleTabsAfter).toHaveLength(8);
    expect(visibleTabsAfter[0].querySelector('[vn~="VRouterViewsLabel"]').textContent).toBe(
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

    const button = element.querySelector('[vn~="VRouterViewsExpand"]');
    const popup = element.querySelector('[vn~="VRouterViewsPopup"]');
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
    const restoredTabs = restoredViews.renderDom().querySelectorAll('[vn~="VRouterViewsTitle"]');

    expect(
      Array.from(restoredTabs, (tab) => tab.querySelector('[vn~="VRouterViewsLabel"]').textContent)
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
    const titlebar = element.querySelector('[vn~="VRouterViewsTitlebar"]');
    const overviewTab = titlebar.querySelector('[data-router-view-path="/overview"]');

    expect(element.dataset.titlePosition).toBe('left');
    expect(titlebar.getAttribute('aria-orientation')).toBe('vertical');
    // 竖排的几何 / 边框朝向归 CSS：`[data-title-position='left']` 规则
    expect(element.dataset.titlePosition).toBe('left');
    expect(titlebar.querySelector('[vn~="VRouterViewsExpand"]')).toBeNull();
    expect(element.firstElementChild).toBe(titlebar);
    expect(overviewTab).not.toBeNull();

    views.titlePosition('right');

    expect(element.dataset.titlePosition).toBe('right');
    expect(element.children[1]).toBe(titlebar);
    expect(titlebar.getAttribute('aria-orientation')).toBe('vertical');

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
    const titlebar = element.querySelector('[vn~="VRouterViewsTitlebar"]');
    const content = element.querySelector('[vn~="VRouterViewsContent"]');

    expect(element.dataset.titleLocked).toBe('true');
    // 锁定态的几何（根 flex / 内容区自滚）归 CSS：`[data-title-locked='true']` 规则
    expect(element.dataset.titleLocked).toBe('true');
    expect(titlebar).not.toBeNull();
    expect(content).not.toBeNull();

    views.titlePosition('left');

    expect(element.dataset.titlePosition).toBe('left');
    expect(element.dataset.titleLocked).toBe('true');

    views.lockTitle(false);

    expect(element.dataset.titleLocked).toBeUndefined();
    expect(content).not.toBeNull();

    root.destroy();
  });

  it('renders async route views after the returned promise resolves', async () => {
    let resolveView;
    const appRouter = router((r) => {
      r.route(
        '/async',
        () =>
          new Promise((resolve) => {
            resolveView = resolve;
          })
      );
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/async', { replace: true });

    expect(appRouter.currentPath()).toBe('/async');
    expect(document.querySelector('#app').textContent).toBe('加载中…');

    resolveView(div('异步完成'));
    await flush();

    expect(document.querySelector('#app').textContent).toBe('异步完成');
    expect(appRouter.currentView().renderDom().textContent).toBe('异步完成');
  });

  it('supports route-level and router-level loading views', async () => {
    let resolveOne;
    let resolveTwo;
    const appRouter = router((r) => {
      r.loading(() => div('全局加载中'));
      r.route('/one', {
        loading: () => div('读取模块一'),
        view: () =>
          new Promise((resolve) => {
            resolveOne = resolve;
          })
      });
      r.route(
        '/two',
        () =>
          new Promise((resolve) => {
            resolveTwo = resolve;
          })
      );
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/one', { replace: true });
    expect(document.querySelector('#app').textContent).toBe('读取模块一');

    resolveOne(div('模块一'));
    await flush();
    expect(document.querySelector('#app').textContent).toBe('模块一');

    appRouter.navigate('/two', { replace: true });
    expect(document.querySelector('#app').textContent).toBe('全局加载中');

    resolveTwo(div('模块二'));
    await flush();
    expect(document.querySelector('#app').textContent).toBe('模块二');
  });

  it('renders a default error view when an async route rejects', async () => {
    const appRouter = router((r) => {
      r.route('/boom', () => Promise.reject(new Error('模块加载失败')));
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/boom', { replace: true });

    expect(appRouter.currentPath()).toBe('/boom');
    await flush();

    expect(document.querySelector('#app').textContent).toContain('模块加载失败');
  });

  it('supports custom error views with the error and route context', async () => {
    const appRouter = router((r) => {
      r.error((error, context) => div(`出错：${error.message}（${context.path}）`));
      r.route('/boom', () => Promise.reject(new Error('boom')));
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/boom', { replace: true });
    await flush();

    expect(document.querySelector('#app').textContent).toBe('出错：boom（/boom）');
  });

  it('ignores stale async resolutions after navigating away', async () => {
    let resolveSlow;
    const appRouter = router((r) => {
      r.route(
        '/slow',
        () =>
          new Promise((resolve) => {
            resolveSlow = resolve;
          })
      );
      r.route('/fast', () => div('快速页'));
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/slow', { replace: true });
    expect(document.querySelector('#app').textContent).toBe('加载中…');

    appRouter.navigate('/fast', { replace: true });
    expect(document.querySelector('#app').textContent).toBe('快速页');

    resolveSlow(div('迟到内容'));
    await flush();

    expect(document.querySelector('#app').textContent).toBe('快速页');
    expect(appRouter.currentPath()).toBe('/fast');
  });

  it('keeps the newest async route when multiple loads overlap', async () => {
    let resolveFirst;
    let resolveSecond;
    const appRouter = router((r) => {
      r.route(
        '/first',
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      );
      r.route(
        '/second',
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/first', { replace: true });
    appRouter.navigate('/second', { replace: true });

    resolveSecond(div('第二个'));
    await flush();
    expect(document.querySelector('#app').textContent).toBe('第二个');

    resolveFirst(div('第一个'));
    await flush();
    expect(document.querySelector('#app').textContent).toBe('第二个');
    expect(appRouter.currentPath()).toBe('/second');
  });

  it('renders an error view when an async view resolves to an invalid value', async () => {
    const appRouter = router((r) => {
      r.error((error) => div(`格式错误：${error.message}`));
      r.route('/bad', () => Promise.resolve({ not: 'a view' }));
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/bad', { replace: true });
    await flush();

    expect(document.querySelector('#app').textContent).toContain('格式错误');
  });

  it('supports async notFound views', async () => {
    const appRouter = router((r) => {
      r.notFound(({ path }) => Promise.resolve(div(`异步 404：${path}`)));
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/missing', { replace: true });
    expect(document.querySelector('#app').textContent).toBe('加载中…');
    await flush();
    expect(document.querySelector('#app').textContent).toBe('异步 404：/missing');
  });

  it('cancels pending async views when the router is destroyed', async () => {
    let resolveView;
    const appRouter = router((r) => {
      r.route(
        '/pending',
        () =>
          new Promise((resolve) => {
            resolveView = resolve;
          })
      );
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/pending', { replace: true });
    appRouter.destroy();
    resolveView(div('太迟了'));
    await flush();

    expect(appRouter.currentView()).toBeNull();
  });

  it('updates vRouterViews titles while an async route is loading', async () => {
    let resolveView;
    const appRouter = vRouter({
      routes: [
        vRoute('/async', {
          title: '异步页',
          view: () =>
            new Promise((resolve) => {
              resolveView = resolve;
            })
        })
      ]
    });
    const views = vRouterViews(appRouter);
    div((page) => page.child(views)).bindTo('#app');

    appRouter.navigate('/async', { replace: true });

    expect(views.renderDom().querySelector('[vn~="VRouterViewsLabel"]').textContent).toBe('异步页');
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
      '加载中…'
    );

    resolveView(div('异步内容'));
    await flush();

    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
      '异步内容'
    );
  });

  it('rejects async route views that resolve to a component object (票 07)', async () => {
    const appRouter = router((r) => {
      r.route('/page', () =>
        Promise.resolve({
          render() {
            return div('组件对象内容');
          }
        })
      );
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/page', { replace: true });
    await flush();

    expect(document.querySelector('#app').textContent).toContain('Router route view must be');
  });

  it('calls lazy factories with the route context when a view resolves to a function', async () => {
    function createUserPage({ params }) {
      return div('用户 ' + params.id);
    }
    const appRouter = router((r) => {
      r.route('/user/:id', () => Promise.resolve(createUserPage));
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/user/42', { replace: true });
    await flush();

    expect(document.querySelector('#app').textContent).toBe('用户 42');
  });

  it('rejects component objects as synchronous route views (票 07)', () => {
    const appRouter = router((r) => {
      r.route('/sync', () => ({
        render() {
          return div('同步组件');
        }
      }));
    });
    appRouter.bindTo('#app').start();

    expect(() => appRouter.navigate('/sync', { replace: true })).toThrowError(
      /Router route view must be/
    );
  });

  it('invokes the default-export page function from a module with the route context', async () => {
    window.history.replaceState(null, '', '/');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const appRouter = router((r) => {
      r.route('/fixture/:id', () => import('./page-fixture.js'));
    });
    appRouter.bindTo('#app').start();

    appRouter.navigate('/fixture/7?tab=hot', { replace: true });

    await vi.waitFor(() => {
      expect(document.querySelector('#app').textContent).toBe('fixture:7:hot');
    });
  });

  it('rejects a default-export component object (票 07：对象组件退场)', () => {
    window.history.replaceState(null, '', '/');
    const appRouter = router((r) => {
      r.route('/fixture-object', () => ({ render: () => div('fixture-object') }));
    });
    appRouter.bindTo('#app').start();

    expect(() => appRouter.navigate('/fixture-object', { replace: true })).toThrowError(
      /Router route view must be/
    );
  });
  it('opens a right-click context menu on title tabs with all actions', () => {
    const create = createViewsWithRoutes([
      vRoute('/a', { title: '页面 A', view: () => div('A') }),
      vRoute('/b', { title: '页面 B', view: () => div('B') })
    ]);
    create.appRouter.navigate('/a', { replace: true });
    create.appRouter.navigate('/b', { replace: true });

    openTabMenu('/a');
    const menu = document.querySelector('[vn~="VRouterViewsContext"]');
    expect(menu).not.toBeNull();
    // 菜单只在打开时挂在 body 上（关掉即摘），所以"在文档里"本身就是打开态
    expect(menu.parentElement).toBe(document.body);
    expect(
      Array.from(
        menu.querySelectorAll('[vn~="VRouterViewsContextItem"]'),
        (item) => item.textContent
      )
    ).toEqual(['刷新', '复制链接', '关闭', '关闭其他', '关闭左侧', '关闭右侧', '关闭全部']);
    expect(menu.querySelectorAll('[vn~="VRouterViewsContextSeparator"]')).toHaveLength(2);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    // 关掉即从 body 上摘下来
    expect(document.querySelector('[vn~="VRouterViewsContext"]')).toBeNull();
    create.root.destroy();
  });

  it('opens a menu with a right-click and closes it on outside click', () => {
    const create = createViewsWithRoutes([vRoute('/a', { title: 'A', view: () => div('A') })]);
    create.appRouter.navigate('/a', { replace: true });

    const tab = openTabMenu('/a');
    const menu = document.querySelector('[vn~="VRouterViewsContext"]');
    expect(tab).not.toBeNull();
    expect(menu.parentElement).toBe(document.body);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(document.querySelector('[vn~="VRouterViewsContext"]')).toBeNull();
    create.root.destroy();
  });

  it('closes the clicked tab from its context menu', () => {
    const create = createViewsWithRoutes([
      vRoute('/a', { title: 'A', view: () => div('A') }),
      vRoute('/b', { title: 'B', view: () => div('B') })
    ]);
    create.appRouter.navigate('/a', { replace: true });
    create.appRouter.navigate('/b', { replace: true });

    openTabMenu('/a');
    clickMenuItem('关闭');

    expect(document.querySelectorAll('[vn~="VRouterViewsTitle"]')).toHaveLength(1);
    expect(document.querySelector('[data-router-view-path="/a"]')).toBeNull();
    expect(create.appRouter.currentPath()).toBe('/b');
    create.root.destroy();
  });

  it('closes all other tabs and activates the clicked one', () => {
    const create = createViewsWithRoutes([
      vRoute('/a', { title: 'A', view: () => div('A') }),
      vRoute('/b', { title: 'B', view: () => div('B') }),
      vRoute('/c', { title: 'C', view: () => div('C') })
    ]);
    create.appRouter.navigate('/a', { replace: true });
    create.appRouter.navigate('/b', { replace: true });
    create.appRouter.navigate('/c', { replace: true });

    openTabMenu('/b');
    clickMenuItem('关闭其他');

    expect(document.querySelectorAll('[vn~="VRouterViewsTitle"]')).toHaveLength(1);
    expect(create.appRouter.currentPath()).toBe('/b');
    expect(document.querySelector('[data-router-view-path="/b"]')).not.toBeNull();
    create.root.destroy();
  });

  it('closes tabs to the left of the clicked tab', () => {
    const create = createViewsWithRoutes([
      vRoute('/a', { title: 'A', view: () => div('A') }),
      vRoute('/b', { title: 'B', view: () => div('B') }),
      vRoute('/c', { title: 'C', view: () => div('C') })
    ]);
    create.appRouter.navigate('/a', { replace: true });
    create.appRouter.navigate('/b', { replace: true });
    create.appRouter.navigate('/c', { replace: true });

    openTabMenu('/b');
    clickMenuItem('关闭左侧');

    const labels = Array.from(
      document.querySelectorAll('[vn~="VRouterViewsTitle"] [vn~="VRouterViewsLabel"]'),
      (label) => label.textContent
    );
    expect(labels).toEqual(['B', 'A']);
    expect(create.appRouter.currentPath()).toBe('/b');
    create.root.destroy();
  });

  it('closes tabs to the right of the clicked tab', () => {
    const create = createViewsWithRoutes([
      vRoute('/a', { title: 'A', view: () => div('A') }),
      vRoute('/b', { title: 'B', view: () => div('B') }),
      vRoute('/c', { title: 'C', view: () => div('C') })
    ]);
    create.appRouter.navigate('/a', { replace: true });
    create.appRouter.navigate('/b', { replace: true });
    create.appRouter.navigate('/c', { replace: true });

    openTabMenu('/b');
    clickMenuItem('关闭右侧');

    const labels = Array.from(
      document.querySelectorAll('[vn~="VRouterViewsTitle"] [vn~="VRouterViewsLabel"]'),
      (label) => label.textContent
    );
    expect(labels).toEqual(['C', 'B']);
    expect(create.appRouter.currentPath()).toBe('/c');
    create.root.destroy();
  });

  it('closes all tabs and clears the active view', () => {
    const create = createViewsWithRoutes([
      vRoute('/a', { title: 'A', view: () => div('A') }),
      vRoute('/b', { title: 'B', view: () => div('B') })
    ]);
    create.appRouter.navigate('/a', { replace: true });
    create.appRouter.navigate('/b', { replace: true });

    openTabMenu('/b');
    clickMenuItem('关闭全部');

    expect(document.querySelectorAll('[vn~="VRouterViewsTitle"]')).toHaveLength(0);
    expect(document.querySelector('[vn~="VRouterViewsContent"]').textContent).toBe('');
    expect(create.appRouter.currentView()).toBeNull();
    create.root.destroy();
  });

  it('refreshes the tab view from the context menu', () => {
    const view = vi.fn(() => div('刷新页'));
    const appRouter = router((r) => {
      r.route('/a', view);
    });
    const views = vRouterViews(appRouter);
    const root = div((page) => page.child(views)).bindTo('#app');
    appRouter.navigate('/a', { replace: true });
    expect(view).toHaveBeenCalledTimes(1);

    openTabMenu('/a');
    clickMenuItem('刷新');

    expect(view).toHaveBeenCalledTimes(2);
    root.destroy();
  });

  it('copies the tab URL from the context menu', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    const create = createViewsWithRoutes([vRoute('/a', { title: 'A', view: () => div('A') })]);
    create.appRouter.navigate('/a', { replace: true });

    openTabMenu('/a');
    clickMenuItem('复制链接');

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}#/a`
    );
    create.root.destroy();
  });

  it('keeps the title order when clicking an already visible tab', () => {
    const create = createViewsWithRoutes([
      vRoute('/a', { title: 'A', view: () => div('A') }),
      vRoute('/b', { title: 'B', view: () => div('B') }),
      vRoute('/c', { title: 'C', view: () => div('C') })
    ]);
    create.appRouter.navigate('/a', { replace: true });
    create.appRouter.navigate('/b', { replace: true });
    create.appRouter.navigate('/c', { replace: true });

    const labels = () =>
      Array.from(
        document.querySelectorAll('[vn~="VRouterViewsTitle"] [vn~="VRouterViewsLabel"]'),
        (label) => label.textContent
      );
    expect(labels()).toEqual(['C', 'B', 'A']);

    create.appRouter.navigate('/b', { replace: true });
    expect(create.appRouter.currentPath()).toBe('/b');
    expect(labels()).toEqual(['C', 'B', 'A']);
    create.root.destroy();
  });
});

describe('document routes', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  function stubDocumentNavigation(appRouter) {
    const jumps = [];
    appRouter.navigateDocument = (url, options = {}) => {
      jumps.push([url, options.replace === true]);
      return appRouter;
    };
    return jumps;
  }

  it('navigates an internal HTML address as a real document', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/home', () => div('首页')),
        vRoute('/legacy/report.html', { title: '旧报表', url: true })
      ]
    });
    const jumps = stubDocumentNavigation(appRouter);
    const views = vRouterViews(appRouter);
    const root = div((page) => page.child(views)).bindTo('#app');

    appRouter.navigate('/legacy/report.html', { replace: true });

    expect(jumps).toEqual([['/legacy/report.html', true]]);
    // 不写 SPA 历史：地址栏由浏览器的整页跳转负责
    expect(window.location.pathname).toBe('/');

    const placeholder = document.querySelector('[vn~="VRouterDocument"]');
    expect(placeholder.getAttribute('data-router-document')).toBe('/legacy/report.html');
    expect(placeholder.querySelector('a').getAttribute('href')).toBe('/legacy/report.html');
    expect(views.renderDom().querySelector('[vn~="VRouterViewsContent"]').textContent).toBe(
      '旧报表'
    );
    root.destroy();
  });

  it('renders document routes with the address, target and rel they declare', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/docs', { url: 'https://example.com/docs', target: '_blank' }),
        vRoute('/billing', { rel: 'nofollow', url: '/billing/index.html' })
      ]
    });
    const external = vLink(appRouter, { label: '文档', to: '/docs' }).renderDom();
    const internal = vLink(appRouter, { label: '账单', to: '/billing' }).renderDom();

    expect(external.getAttribute('href')).toBe('https://example.com/docs');
    expect(external.getAttribute('target')).toBe('_blank');
    expect(external.getAttribute('rel')).toBe('noopener');
    expect(internal.getAttribute('href')).toBe('/billing/index.html');
    expect(internal.getAttribute('rel')).toBe('nofollow');
  });

  it('leaves document and raw external links to the browser', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/legacy/report.html', { url: true }),
        vRoute('/docs', { url: 'https://example.com/docs' })
      ]
    });
    const internalDoc = vLink(appRouter, { label: '旧报表', to: '/legacy/report.html' });
    const externalRoute = vLink(appRouter, { label: '文档', to: '/docs' });
    const rawExternal = vLink(appRouter, { label: '外链', to: 'https://example.com/plain' });

    expect(rawExternal.renderDom().getAttribute('href')).toBe('https://example.com/plain');

    const click = (node) => {
      const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });
      node.renderDom().dispatchEvent(event);
      return event;
    };

    // 断言这几种链接都没有被 SPA 拦截；jsdom 会对整页跳转打印
    // "Not implemented: navigation to another Document"，那正是「交给浏览器」的证据。
    expect(click(internalDoc).defaultPrevented).toBe(false);
    expect(click(externalRoute).defaultPrevented).toBe(false);
    expect(click(rawExternal).defaultPrevented).toBe(false);
    expect(appRouter.currentPath()).toBe('/');
  });

  it('navigates absolute addresses passed to navigate() directly', () => {
    const appRouter = vRouter({ routes: [vRoute('/home', () => div('首页'))] });
    const jumps = stubDocumentNavigation(appRouter);

    appRouter.navigate('https://other.example/page');

    expect(jumps).toEqual([['https://other.example/page', false]]);
    expect(appRouter.currentPath()).toBe('/');
  });

  it('honours guards before a document route jumps', () => {
    const guard = vi.fn(() => false);
    const appRouter = vRouter({
      routes: [vRoute('/legacy/report.html', { url: true })]
    }).beforeEach(guard);
    const jumps = stubDocumentNavigation(appRouter);

    appRouter.navigate('/legacy/report.html');

    expect(guard).toHaveBeenCalled();
    expect(jumps).toEqual([]);
  });

  it('renders a linked placeholder for document routes while server rendering', () => {
    const appRouter = vRouter({
      routes: [vRoute('/legacy/report.html', { title: '旧报表', url: true })]
    });
    const navigateDocument = vi.fn(() => appRouter);
    appRouter.navigateDocument = navigateDocument;

    appRouter.renderPath('/legacy/report.html');

    expect(navigateDocument).not.toHaveBeenCalled();
    expect(appRouter.toHTML()).toContain('data-router-document="/legacy/report.html"');
    expect(appRouter.toHTML()).toContain('<a href="/legacy/report.html" vn="VLink">');
  });

  it('accepts a custom placeholder view for a document route', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/docs', {
          url: 'https://example.com/docs',
          view: () => div('正在离开 yoya-ui…')
        })
      ]
    });
    const jumps = stubDocumentNavigation(appRouter);
    const outlet = vRouterView(appRouter);
    div((page) => page.child(outlet)).bindTo('#app');

    appRouter.navigate('/docs');

    expect(jumps).toEqual([['https://example.com/docs', false]]);
    expect(document.querySelector('#app').textContent).toBe('正在离开 yoya-ui…');
  });
});

describe('router provide scope', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('builds a route view inside the outlet provide scope', () => {
    const appRouter = router((r) => {
      r.route('/scope', () => div((page) => page.p(`user:${inject('user', 'none')}`)));
    });
    div((root) => {
      provide('user', 'Ada');
      root.child(appRouter);
    }).bindTo('#app');

    appRouter.navigate('/scope', { replace: true });

    expect(document.querySelector('#app').textContent).toBe('user:Ada');
  });

  it('builds an async route view inside the outlet provide scope', async () => {
    let resolveView;
    const appRouter = router((r) => {
      r.route(
        '/scope-async',
        () =>
          new Promise((resolve) => {
            resolveView = resolve;
          })
      );
    });
    div((root) => {
      provide('user', 'Ada');
      root.child(appRouter);
    }).bindTo('#app');

    appRouter.navigate('/scope-async', { replace: true });
    resolveView(() => div((page) => page.p(`user:${inject('user', 'none')}`)));
    await flush();

    expect(document.querySelector('#app').textContent).toBe('user:Ada');
  });

  it('builds keep-alive tab views inside the outlet provide scope', () => {
    const appRouter = vRouter({
      routes: [
        vRoute('/a', {
          title: 'A',
          view: () => div((page) => page.p(`a:${inject('user', 'none')}`))
        })
      ]
    });
    const views = vRouterViews(appRouter);
    div((root) => {
      provide('user', 'Ada');
      root.child(views);
    }).bindTo('#app');

    appRouter.navigate('/a', { replace: true });

    expect(document.querySelector('[vn~="VRouterViewsContent"]').textContent).toBe('a:Ada');
  });
});
