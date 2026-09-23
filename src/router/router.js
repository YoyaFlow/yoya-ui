import {
  applyElementOptions,
  buildInProviderScope,
  ElementNode,
  normalizeSetupArguments,
  registerChildFactories,
  ViewNode,
  vText
} from '../core/index.js';
import { applySetupValue } from '../core/node.js';
import { bindDocumentEvent, bindWindowEvent } from '../core/document-events.js';
import { replaceChildren } from '../components/shared.js';
import { createComponentFactory, createComponentShortcut } from '../components/shared.js';
import { vSlot } from '../layout/v-slot.js';
import { vNode } from '../core/v-node.js';
import { a, button, div, header, span } from '../html/index.js';

const maxVisibleTitles = 8;

// 绝对地址：带协议（http: / https: / mailto: / tel: …）或协议相对（//host）。
const documentUrlPattern = /^[a-z][a-z0-9+.-]*:|\/\//i;

/** 该地址是否应交给浏览器做整页跳转（而不是渲染 SPA 视图）。 */
function isDocumentUrl(value) {
  return typeof value === 'string' && documentUrlPattern.test(value.trim());
}

function createRouterViewsStorageKey(routerInstance) {
  const source = [routerInstance.default() || '/', routerInstance.routePatterns().join('|')].join(
    '::'
  );
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0;
  }

  return `yoya-ui:router-views:${(hash >>> 0).toString(36)}`;
}

function readSavedTabs(storageKey) {
  if (typeof localStorage === 'undefined') return null;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return Array.isArray(saved?.paths) ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Router 是一个很轻的 hash 路由出口。
 * 它负责路径匹配、参数提取、守卫和把路由视图渲染到自身节点内。
 */
export function VRouter() {
  return vNode((api, self) => {
    const state = {
      beforeEach: null,
      currentParams: {},
      currentPath: '/',
      currentQuery: {},
      currentRoute: null,
      currentView: null,
      defaultPath: null,
      destroyed: false,
      errorView: null,
      ignoreNextHashPath: null,
      loadingView: null,
      mode: 'hash',
      navigationGeneration: 0,
      notFoundView: null,
      outlet: null,
      routes: [],
      started: false,
      stopListening: null,
      subscribers: new Set()
    };

    const router = () => self.node();

    const resolve = (path) => {
      const routeMatch = state.routes
        .map((route) => ({ match: matchRoute(route.pattern, path), route }))
        .find(({ match }) => match);

      if (routeMatch) {
        const context = createRouteContext(router(), path, routeMatch.route, routeMatch.match);
        return { context, route: routeMatch.route, view: routeMatch.route.view };
      }

      const parsed = parsePath(path);
      const context = createRouteContext(router(), path, null, {
        params: {},
        pathname: parsed.pathname,
        query: parsed.query
      });

      return { context, route: null, view: state.notFoundView };
    };

    const canEnter = (to) => {
      const from = {
        params: { ...state.currentParams },
        path: state.currentPath,
        query: { ...state.currentQuery },
        route: state.currentRoute
      };

      if (state.beforeEach && state.beforeEach(to, from, router()) === false) {
        return false;
      }

      if (to.route?.beforeEnter && to.route.beforeEnter(to, from, router()) === false) {
        return false;
      }

      return true;
    };

    const buildLoadingView = (route, context) =>
      resolveRouteEntry(route?.loading ?? state.loadingView ?? defaultLoadingView, [context]);

    const buildErrorView = (route, context, error) =>
      resolveRouteEntry(route?.error ?? state.errorView ?? defaultErrorView, [error, context]);

    const destroyCurrentView = () => {
      state.currentView?.destroy?.();
      state.currentView = null;
    };

    /** 提交一次导航结果：出口换成新视图，状态与订阅者一起收口。 */
    const commitView = (resolved, nextView) => {
      const { context, route } = resolved;
      const outlet = state.outlet;

      destroyCurrentView();
      replaceChildren(outlet, [nextView]);
      state.currentPath = context.path;
      state.currentParams = context.params;
      state.currentQuery = context.query;
      state.currentRoute = route;
      state.currentView = nextView;
      state.subscribers.forEach((listener) => listener(context, router()));
    };

    const renderResolved = (resolved) => {
      const { context, route, view } = resolved;

      // 路由视图在挂进 outlet 之前就构建完成（同步与异步两条路径），构建帧因此要由
      // 构建方显式声明：视图里的 inject 才能读到 outlet 祖先的 provide，视图自己声明的
      // provide 也只落在产出的子树上，不外溢给 outlet 的同级。
      const buildInOutletScope = (build) => buildInProviderScope(state.outlet, build);

      // 文档路由：不渲染 SPA 视图，交出一个「正在跳转」的占位（含可点的真实链接）。
      // refresh() / popstate 落到这类路由时只渲染占位、不重复整页跳转，避免回退死循环。
      if (route?.url) {
        state.navigationGeneration += 1;
        commitView(
          resolved,
          buildInOutletScope(() => buildDocumentView(route, context))
        );
        return;
      }

      const result = buildInOutletScope(() => (typeof view === 'function' ? view(context) : view));

      state.navigationGeneration += 1;

      if (!isPromiseLike(result)) {
        commitView(
          resolved,
          buildInOutletScope(() => normalizeRouteView(result, context))
        );
        return;
      }

      const generation = state.navigationGeneration;

      commitView(
        resolved,
        buildInOutletScope(() => buildLoadingView(route, context))
      );

      Promise.resolve(result).then(
        (value) => {
          if (generation !== state.navigationGeneration || state.destroyed) return value;
          let nextView;
          try {
            nextView = buildInOutletScope(() => normalizeRouteView(value, context));
          } catch (error) {
            commitView(
              resolved,
              buildInOutletScope(() => buildErrorView(route, context, error))
            );
            return value;
          }
          commitView(resolved, nextView);
          return value;
        },
        (error) => {
          if (generation !== state.navigationGeneration || state.destroyed) return error;
          commitView(
            resolved,
            buildInOutletScope(() => buildErrorView(route, context, error))
          );
          return error;
        }
      );
    };

    const refresh = () => {
      const nextPath = readPath(state.mode);
      const resolved = resolve(nextPath);

      if (!canEnter(resolved.context)) {
        return api;
      }

      renderResolved(resolved);
      return api;
    };

    api.default = (path) => {
      if (path === undefined) {
        return state.defaultPath;
      }

      state.defaultPath = normalizePath(path);
      return api;
    };

    api.mode = (value) => {
      if (value === undefined) {
        return state.mode;
      }

      const nextMode = value === 'history' ? 'history' : 'hash';

      if (nextMode === state.mode) {
        return api;
      }

      const wasStarted = state.started;
      if (wasStarted) {
        api.stop();
      }

      state.mode = nextMode;

      if (wasStarted) {
        api.start();
      }

      return api;
    };

    /** 添加路由。config 可以是视图函数，也可以是 { view/component, beforeEnter }。 */
    api.route = (pattern, config) => {
      state.routes.push(normalizeRoute(pattern, config));
      return api;
    };

    /** 声明式别名：`router.vRoute(pattern, config)`。 */
    api.vRoute = (pattern, config) => api.route(pattern, config);

    api.notFound = (view) => {
      state.notFoundView = view;
      return api;
    };

    api.loading = (view) => {
      state.loadingView = view;
      return api;
    };

    api.error = (view) => {
      state.errorView = view;
      return api;
    };

    api.beforeEach = (guard) => {
      state.beforeEach = guard;
      return api;
    };

    api.start = () => {
      if (!state.started) {
        state.stopListening =
          state.mode === 'history'
            ? bindWindowEvent('popstate', () => api.refresh())
            : bindWindowEvent('hashchange', () => handleHashChange());
        state.started = true;
      }

      const currentPath = readPath(state.mode);
      const isDefaultLocation =
        state.mode === 'history'
          ? currentPath === '/' || currentPath === '/index.html'
          : typeof window === 'undefined' || !window.location.hash;

      if (isDefaultLocation && state.defaultPath) {
        return api.navigate(state.defaultPath, { replace: true });
      }

      return refresh();
    };

    api.stop = () => {
      if (state.started) {
        state.stopListening?.();
        state.stopListening = null;
        state.started = false;
      }

      return api;
    };

    /** 导航到指定路径。replace 为 true 时不新增浏览器历史记录。 */
    api.navigate = (path, options = {}) => {
      // 外部地址（未注册）直接整页跳转
      if (isDocumentUrl(path)) {
        // 走节点上的同名命令：宿主可以覆盖 `node.navigateDocument` 接入自己的跳转实现
        return self.node().navigateDocument(String(path).trim(), options);
      }

      const nextPath = normalizePath(path);
      const resolved = resolve(nextPath);

      if (!canEnter(resolved.context)) {
        return api;
      }

      // 文档路由：渲染占位视图，然后把地址交给浏览器（整页跳转，不 pushState）
      if (resolved.route?.url) {
        renderResolved(resolved);
        return self.node().navigateDocument(resolved.route.url, {
          replace: Boolean(options.replace || resolved.route.replace)
        });
      }

      const pathChanged = writePath(nextPath, options, state.mode);

      if (pathChanged && !options.replace && state.mode === 'hash') {
        state.ignoreNextHashPath = nextPath;
      }

      renderResolved(resolved);
      return api;
    };

    api.refresh = () => refresh();

    /**
     * 服务端渲染入口：按路径解析并渲染匹配视图到自身节点，不依赖 window。
     * 守卫返回 false 时不提交；异步视图在服务端序列化其 loading 视图。
     */
    api.renderPath = (path) => {
      const resolved = resolve(path);

      if (!canEnter(resolved.context)) {
        return api;
      }

      renderResolved(resolved);
      return api;
    };

    /**
     * 整页跳转出口：文档路由（内部 HTML 地址 / 外部链接）默认走这里。
     * 宿主环境可以覆盖以接入自己的跳转实现；无 window（服务端）时是 no-op。
     */
    api.navigateDocument = (url, options = {}) => {
      if (!url || typeof window === 'undefined') {
        return api;
      }

      if (options.replace) {
        window.location.replace(url);
      } else {
        window.location.assign(url);
      }

      return api;
    };

    api.currentPath = () => state.currentPath;
    api.currentParams = () => ({ ...state.currentParams });
    api.currentQuery = () => ({ ...state.currentQuery });
    api.currentRoute = () => state.currentRoute;
    api.currentView = () => state.currentView;

    api.outlet = (value) => {
      if (value === undefined) return state.outlet;

      // null = 回到默认出口（路由器自己的根元素）；销毁 vRouterView 时用它复位
      if (value === null) {
        state.outlet = state.root;
        return api;
      }

      if (!(value instanceof ElementNode)) {
        throw new TypeError('Router outlet must be an ElementNode');
      }

      state.outlet = value;
      return api;
    };

    /** 只读辅助（同模块的 vRouterViews 用）：路由表形状 / 解析结果 / 取消在途导航。 */
    api.routePatterns = () => state.routes.map((route) => route.pattern);
    api.resolve = (path) => resolve(path);
    /** 当前订阅者数量（诊断用：能看出子组件销毁时有没有把订阅收干净）。 */
    api.subscriberCount = () => state.subscribers.size;
    api.cancelPending = () => {
      state.navigationGeneration += 1;
      state.currentView = null;
      return api;
    };

    /** props：键在路由器上有同名命令就调命令，其余键按元素 options 写（与旧 ElementNode 分派一致）。 */
    api.setupObject = (config) => {
      const elementConfig = {};

      Object.entries(config).forEach(([key, value]) => {
        if (typeof api[key] === 'function') {
          api[key](value);
          return;
        }

        elementConfig[key] = value;
      });

      if (Object.keys(elementConfig).length > 0) {
        // 其余键落**视图根元素**：`self.node()` 是组件节点，它的 `setup()` 会再进一次本方法（自递归）
        view.setup(elementConfig);
      }

      return api;
    };

    api.subscribe = (listener) => {
      if (typeof listener !== 'function') {
        throw new TypeError('Router subscriber must be a function');
      }

      state.subscribers.add(listener);
      return () => state.subscribers.delete(listener);
    };

    api.go = (delta) => {
      if (typeof window !== 'undefined') {
        window.history.go(delta);
      }

      return api;
    };

    api.back = () => api.go(-1);
    api.forward = () => api.go(1);

    const handleHashChange = () => {
      const nextPath = readHashPath();

      if (state.ignoreNextHashPath === nextPath) {
        state.ignoreNextHashPath = null;
        return api;
      }

      state.ignoreNextHashPath = null;

      if (nextPath === state.currentPath) {
        return api;
      }

      return refresh();
    };

    api.whenDestroy = () => {
      api.stop();
      state.navigationGeneration += 1;
      state.destroyed = true;
      destroyCurrentView();
      state.subscribers.clear();
    };

    // 出口默认是路由器自己的根元素（命令跑起来时结构已经建好）
    const view = div({ 'data-yoya-router': '', vn: 'VRouter' }, (element) => {
      state.root = element;
      state.outlet = element;
    });

    return view;
  });
}

export function createRouter(first = null, second = null, third = null) {
  const args = normalizeSetupArguments(first, second, third);
  const node = createComponentFactory(VRouter);

  applySetupValue(node, args.first);
  applyElementOptions(node, args.options);
  if (typeof args.callback === 'function') args.callback(node);
  return node;
}

export const router = createRouter;

export function vRoute(pattern, config) {
  return { config, pattern };
}

/** 旧名保留：Router 现在是 `VRouter` 这个组件定义（身份 `vn="VRouter"`）。 */
export const Router = VRouter;

export function vRouter(first = null, second = null, third = null) {
  const args = normalizeSetupArguments(first, second, third);
  const node = createComponentFactory(VRouter);

  applyDeclarativeRouterSetup(node, args.first);
  applyElementOptions(node, args.options);
  if (typeof args.callback === 'function') args.callback(node);
  return node;
}

/** 链接标签（形态 A）：`vn_slot` 标记 = 它在链接里的位置。 */
export function VLinkLabel() {
  return span({ vn: 'VLinkLabel', vn_slot: 'label' });
}

export const vLinkLabel = createComponentShortcut(VLinkLabel);

/**
 * 链接（形态 B）：`a[VLink] > 标签占位`。
 *
 * - 地址 / 参数 / 查询 / 替换 / 精确匹配是命令，命令只写自己的快照（`href` / `aria-current` /
 *   `is-active` 类）；标签是内容位，内容（`VLinkLabel`）自带 `vn_slot`、投递即落位；
 * - 订阅路由器、退订走 `whenDestroy`；点击委托挂在元素自己身上，外部链接与文档路由交给浏览器。
 *
 * 定义 `VLink(routerInstance)` 收自己的依赖（路由器），调用方参数由 `vLink` 按标准分派。
 */
export function VLink(routerInstance) {
  assertRouter(routerInstance);

  return vNode((api, self) => {
    const state = { exact: true, label: null, params: {}, query: {}, replace: false, to: '/' };

    /** 标签内容：没显式设过标签时跟随 `to`（与旧实现一致）。内容自带 `vn_slot`，投递即落位。 */
    const writeLabel = (node, value) => {
      node.child(vLinkLabel(value));
      return api;
    };

    /**
     * 写这一份快照：href / aria-current / is-active（都是自己的属性和类）。
     * 首屏在视图里直接写元素（构建期还没有组件节点），命令与订阅走组件节点。
     */
    const writeLink = (node) => {
      const target = buildLinkPath(state.to, state.params, state.query);
      const documentTarget = resolveDocumentTarget(routerInstance, target);
      const href = documentTarget
        ? documentTarget.url
        : routerInstance.mode() === 'history'
          ? target
          : `#${target}`;
      const active = isLinkActive(routerInstance.currentPath(), target, state.exact);
      const classes = new Set(
        String(node.attr('class') || '')
          .split(/\s+/)
          .filter(Boolean)
      );

      if (active) {
        classes.add('is-active');
      } else {
        classes.delete('is-active');
      }

      node.attr({
        'aria-current': active ? 'page' : null,
        class: [...classes].join(' '),
        href
      });

      // 路由声明的 target / rel 落到链接上（未声明时不动用户自己设的属性）
      if (documentTarget?.target) node.attr('target', documentTarget.target);
      if (documentTarget?.rel) node.attr('rel', documentTarget.rel);
      return api;
    };

    api.to = (value) => {
      if (value === undefined) return state.to;
      state.to = value;
      if (state.label === null) writeLabel(self.node(), value);
      return writeLink(self.node());
    };

    api.params = (value) => {
      if (value === undefined) return state.params;
      state.params = value || {};
      return writeLink(self.node());
    };

    api.query = (value) => {
      if (value === undefined) return state.query;
      state.query = value || {};
      return writeLink(self.node());
    };

    api.replace = (value) => {
      if (value === undefined) return state.replace;
      state.replace = Boolean(value);
      return api;
    };

    api.exact = (value) => {
      if (value === undefined) return state.exact;
      state.exact = Boolean(value);
      return writeLink(self.node());
    };

    api.label = (value) => {
      if (value === undefined) return state.label;
      state.label = value;
      return writeLabel(self.node(), value);
    };

    /** props：`to / params / query / replace / exact / label` + 其余元素配置。 */
    api.setupObject = (config) => {
      const { exact, label, params, query, replace, to, ...elementConfig } = config;

      if (Object.keys(elementConfig).length > 0) {
        // 其余键落**视图根元素**：`self.node()` 是组件节点，它的 `setup()` 会再进一次本方法（自递归）
        view.setup(elementConfig);
      }

      if (to !== undefined) api.to(to);
      if (params !== undefined) api.params(params);
      if (query !== undefined) api.query(query);
      if (replace !== undefined) api.replace(replace);
      if (exact !== undefined) api.exact(exact);
      if (label !== undefined) api.label(label);
      return api;
    };

    /** 字符串 = 目标 + 标签（与旧实现一致）。 */
    api.setupString = (value) => {
      api.to(value);
      api.label(value);
      return api;
    };

    const unsubscribe = routerInstance.subscribe(() => writeLink(self.node()));

    api.whenDestroy = () => {
      unsubscribe();
    };

    const view = a({ 'data-router-link': 'true', href: '#', vn: 'VLink' }, (element) => {
      element.on('click', (event) => {
        if (!shouldHandleLinkClick(event, element)) return;

        const target = buildLinkPath(state.to, state.params, state.query);
        // 外部链接与文档路由交给浏览器整页跳转（href 已是真实地址）
        if (resolveDocumentTarget(routerInstance, target)) return;

        event.preventDefault();
        routerInstance.navigate(target, { replace: state.replace });
      });
      // 标签是内容位：占位自带一个空标签（与旧实现一致），命令投递时按占位替换
      element.child(vSlot({ children: span({ vn: 'VLinkLabel' }), name: 'label' }));
      writeLink(element);
    });

    return view;
  });
}

export function vLink(routerInstance, setup = null, callback = null) {
  return createComponentFactory(VLink, routerInstance, setup, callback, arguments);
}

/**
 * 路由出口（形态 B）：`div[VRouterView]`。
 * 视图根在**构建期**注册成出口（SSR 也要用到），组件销毁时按需摘掉。
 */
export function VRouterView(routerInstance) {
  assertRouter(routerInstance);

  return vNode((api) => {
    // 出口必须是个节点句柄（路由器要往它里面渲染），所以视图根先落在局部再返回
    const outlet = div({ 'data-router-view': 'true', vn: 'VRouterView' });

    routerInstance.outlet(outlet);
    api.whenDestroy = () => {
      if (routerInstance.outlet() === outlet) routerInstance.outlet(null);
    };
    return outlet;
  });
}

export function vRouterView(routerInstance, setup = null, callback = null) {
  return createComponentFactory(VRouterView, routerInstance, setup, callback, arguments);
}

/**
 * 路由视图：标题条（keep-alive 标签）+ 路由出口 + 溢出弹窗 + 标签上下文菜单。
 *
 * - 结构用元素工厂一次声明（静态样式与属性写在结构里），命令只写自己那一份快照；
 * - 标签是容器自己造的取用器（`{ tab, label, closeButton, text }`，见 16 号清单第 15 条）：
 *   一份标签要同时写文本、属性与落位，内容通道承载不了，位置又归容器管；
 * - 子节点清单按 `clearChildren().child(按序清单).commit()` 对账：留下的复用、落选的销毁，
 *   不碰 `_children` / `_el`；
 * - 溢出按钮常驻标题条，显隐走 `mountable`（不需要时不在 DOM 里）。
 */
export function VRouterViews(routerInstance) {
  assertRouter(routerInstance);

  return vNode((api) => {
    const moreButton = button({
      'aria-expanded': 'false',
      'aria-label': '展开全部标签',
      type: 'button',
      vn: 'VRouterViewsExpand'
    }).child('⋯');
    const titleNode = header({
      'aria-label': '已打开页面',
      role: 'tablist',
      vn: 'VRouterViewsTitlebar'
    });
    const contentNode = div({ vn: 'VRouterViewsContent' });
    const popup = div({
      'aria-label': '已打开页面',
      role: 'menu',
      vn: 'VRouterViewsPopup'
    });
    // 位置 / 锁定 / 溢出 / 弹窗都走属性（`data-title-*`），样式全在 `yoya.ui.css`
    const node = div({ 'data-title-position': 'top', vn: 'VRouterViews' }, (root) =>
      root.child(titleNode, contentNode, popup)
    );

    const state = {
      lockTitle: false,
      overflow: false,
      persist: true,
      popupOpen: false,
      storageKey: createRouterViewsStorageKey(routerInstance),
      suppressPersist: false,
      tabs: new Map(),
      title: '工作区',
      titleResolver: null,
      titlePosition: 'top',
      // 组件落地前 DOM 还没建：那时只维护视图树，顺序由引擎按 _children 挂
      landed: false
    };

    /**
     * 位置只做两件事（`data-title-position` 由 `api.titlePosition` 写）：
     * 子节点顺序（`right` 时内容在前）交给引擎对账，样式归 CSS 的 `[data-title-position=…]` 规则。
     */
    const applyTitlePosition = (position) => {
      const orderedChildren =
        position === 'right' ? [contentNode, titleNode, popup] : [titleNode, contentNode, popup];
      // 落位对账：留下的按新顺序复用（DOM 跟着搬家），清单外的由 commit 销毁
      orderChildren(node, orderedChildren);
    };

    const resolveTitle = (context = {}) => {
      let title = state.title;
      const routeTitle = context.route?.title;
      if (routeTitle !== undefined) {
        title = typeof routeTitle === 'function' ? routeTitle(context) : routeTitle;
      }
      if (state.titleResolver) {
        const resolved = state.titleResolver(context);
        if (resolved !== undefined && resolved !== null) {
          title = typeof resolved === 'function' ? resolved(context) : resolved;
        }
      }
      return title ?? '';
    };

    const styleTitleTab = (entry, active) => {
      entry.label.attr('aria-selected', String(active));
      // 高亮是状态：底色 / 边框朝向 / 负 margin 全归 CSS 的 `[data-active='true']` 规则
      entry.tab.attr('data-active', active ? 'true' : null);
    };

    /** 溢出按钮：常驻标题条，显隐靠条件挂载（不需要时不在 DOM 里）。 */
    const updateOverflow = () => {
      const visible = state.titlePosition === 'top' && state.tabs.size > maxVisibleTitles;

      state.overflow = visible;
      node.attr('data-title-overflow', visible ? 'true' : null);
      moreButton.mountable(visible);
    };

    /**
     * 子节点清单按序落地：清单归引擎（留下的复用、清单外的销毁），顺序搬到 DOM 末尾。
     * 组件还没落地时只维护视图树——那时引擎本来就会按 `_children` 顺序挂。
     */
    const orderChildren = (parent, ordered) => {
      parent.clearChildren().child(ordered);

      if (!state.landed) return;

      // 只有落地之后才动 DOM：清单外的由 commit 销毁，顺序搬到末尾
      parent.commit();

      const element = parent.renderDom();
      if (!element) return;

      ordered.forEach((child) => {
        const childElement = child.isMounted() ? child.renderDom() : null;
        if (childElement) element.appendChild(childElement);
      });
    };

    /**
     * 标题条 = 全部标签（按 state 顺序）+ 溢出按钮。
     * 第 maxVisibleTitles 个之后的标签按需挂载：不在 DOM 里，但留在树里随时回窗口，
     * 也活在溢出弹窗的清单里。
     */
    const writeTitlebar = () => {
      const paths = Array.from(state.tabs.keys());
      const visibleCount = state.titlePosition === 'top' ? maxVisibleTitles : paths.length;

      updateOverflow();
      if (!state.overflow && state.popupOpen) {
        closePopup();
      }
      paths.forEach((path, index) => {
        state.tabs.get(path).tab.mountable(index < visibleCount);
      });
      orderChildren(titleNode, [...paths.map((path) => state.tabs.get(path).tab), moreButton]);
    };

    const persistTabs = () => {
      if (!state.persist || state.suppressPersist || typeof localStorage === 'undefined') return;

      try {
        localStorage.setItem(
          state.storageKey,
          JSON.stringify({
            activePath: routerInstance.currentPath(),
            paths: Array.from(state.tabs.keys())
          })
        );
      } catch {
        // 存储不可用时静默跳过持久化。
      }
    };

    let popupCleanup = null;

    const closePopup = () => {
      state.popupOpen = false;
      node.attr('data-title-popup', null);
      moreButton.attr('aria-expanded', 'false');
      if (popupCleanup) {
        popupCleanup();
        popupCleanup = null;
      }
    };

    const buildPopup = () => {
      const items = Array.from(state.tabs.entries())
        .slice(maxVisibleTitles)
        .map(([path, entry]) => {
          const title = entry.text.textContent();
          const item = div({
            'data-router-view-path': path,
            role: 'menuitem',
            tabIndex: '0',
            vn: 'VRouterViewsPopupItem'
          });
          const titleSpan = span({ vn: 'VRouterViewsPopupTitle' }).child(title);
          const closeButton = button({
            'aria-label': `关闭 ${title}`,
            type: 'button',
            vn: 'VRouterViewsPopupClose'
          }).child('×');
          if (path === routerInstance.currentPath()) {
            // 当前页高亮：状态走属性，颜色归 CSS（`[aria-current='true']` 规则）
            item.attr('aria-current', 'true');
          }
          const activate = () => {
            closePopup();
            routerInstance.navigate(path);
          };
          item.on('click', activate);
          item.on('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          });
          closeButton.on('click', (event) => {
            event.stopPropagation();
            closeTitleTab(path, event);
            if (state.popupOpen) buildPopup();
          });
          item.child(titleSpan, closeButton);
          return item;
        });

      // 弹窗内容整份换：不预建、不找节点（与 VTable / VCard 的部件收口同一口径）
      replaceChildren(popup, items);
    };

    const openPopup = () => {
      if (state.tabs.size === 0) return;

      buildPopup();
      state.popupOpen = true;
      node.attr('data-title-popup', 'true');
      moreButton.attr('aria-expanded', 'true');
      placePopup();

      const handleDocumentClick = (event) => {
        if (
          !popup.renderDom()?.contains(event.target) &&
          !moreButton.renderDom()?.contains(event.target)
        ) {
          closePopup();
        }
      };
      const handleKeydown = (event) => {
        if (event.key === 'Escape') closePopup();
      };
      const handleScroll = () => placePopup();
      const handleResize = () => placePopup();

      const unbindClick = bindDocumentEvent('click', handleDocumentClick);
      const unbindKeydown = bindDocumentEvent('keydown', handleKeydown);
      const unbindScroll = bindWindowEvent('scroll', handleScroll, true);
      const unbindResize = bindWindowEvent('resize', handleResize);
      popupCleanup = () => {
        unbindClick();
        unbindKeydown();
        unbindScroll();
        unbindResize();
      };

      function placePopup() {
        const buttonRect = moreButton.renderDom()?.getBoundingClientRect();
        const popupRect = popup.renderDom()?.getBoundingClientRect();
        if (!buttonRect || !popupRect) {
          return;
        }

        const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
        const edge = 8;
        let left = buttonRect.right - popupRect.width;
        left = Math.max(edge, Math.min(left, viewportWidth - popupRect.width - edge));

        let top = buttonRect.bottom + 4;
        if (top + popupRect.height + edge > viewportHeight) {
          top = Math.max(edge, buttonRect.top - popupRect.height - 4);
        }

        popup.styles({
          left: `${left}px`,
          top: `${top}px`
        });
      }
    };

    moreButton.on('click', () => {
      if (state.popupOpen) {
        closePopup();
      } else {
        openPopup();
      }
    });

    // 落地收口：注入滚动条样式 + 恢复上次打开的标签（props 这时才全部落完）
    api.whenMount = () => {
      state.landed = true;
      restoreTabsOnce();
      writeTitlebar();
    };

    /** 恢复只跑一次：props 里的 storageKey 可能比构造晚到。 */
    const restoreTabsOnce = () => {
      if (state.restored) return;
      state.restored = true;
      restoreTabs();
    };

    /** props：`title / persist / storageKey / titlePosition / titleResolver` + 其余元素配置。 */
    api.setupObject = (config) => {
      Object.entries(config).forEach(([key, value]) => {
        if (key === 'title') {
          state.title = value;
          return;
        }

        if (key === 'persist') {
          state.persist = Boolean(value);
          return;
        }

        if (key === 'storageKey') {
          state.storageKey = value;
          return;
        }

        if (key === 'titleResolver') {
          state.titleResolver = typeof value === 'function' ? value : null;
          return;
        }

        // 其余键：有同名命令就调命令（lockTitle / titlePosition …），否则按元素 options 写
        if (typeof api[key] === 'function') {
          api[key](value);
          return;
        }

        node.setup({ [key]: value });
      });

      restoreTabsOnce();
      return api;
    };
    api.updateOverflow = updateOverflow;

    api.titlePosition = (value) => {
      if (value === undefined) return state.titlePosition;

      const next = normalizeTitlePosition(value);
      state.titlePosition = next;
      if (next !== 'top' && state.popupOpen) closePopup();
      node.attr('data-title-position', state.titlePosition);
      titleNode.attr('aria-orientation', state.titlePosition === 'top' ? 'horizontal' : 'vertical');
      applyTitlePosition(state.titlePosition);
      writeTitlebar();
      state.tabs.forEach((entry, path) => {
        styleTitleTab(entry, path === routerInstance.currentPath());
      });
      return api;
    };

    api.lockTitle = (value = true) => {
      if (value === undefined) return state.lockTitle;
      state.lockTitle = Boolean(value);
      node.attr('data-title-locked', state.lockTitle ? 'true' : null);
      applyTitlePosition(state.titlePosition);
      updateOverflow();
      return api;
    };
    api.titleLocked = api.lockTitle;

    const closeTitleTab = (path, event = null) => {
      if (event) event.stopPropagation();
      const entries = Array.from(state.tabs.entries());
      const closingIndex = entries.findIndex(([tabPath]) => tabPath === path);
      const entry = state.tabs.get(path);
      if (!entry) return;

      const wasActive = entry.label.attr('aria-selected') === 'true';
      state.tabs.delete(path);
      writeTitlebar();
      persistTabs();

      if (!wasActive) return;
      const remainingPaths = Array.from(state.tabs.keys());
      if (remainingPaths.length > 0) {
        const nextPath = remainingPaths[Math.min(closingIndex, remainingPaths.length - 1)];
        routerInstance.navigate(nextPath, { replace: true });
        return;
      }

      replaceChildren(contentNode, []);
      routerInstance.cancelPending();
    };

    let titleContextMenu = null;
    let contextMenuCleanup = null;

    /** 上下文菜单：用到才建、建过复用（挂在 document.body 上，关掉只是摘下来）。 */
    const contextMenuOf = () => {
      if (!titleContextMenu) {
        titleContextMenu = div({
          'aria-label': '标签页操作',
          role: 'menu',
          vn: 'VRouterViewsContext'
        });
      }

      return titleContextMenu;
    };

    const closeTabContextMenu = () => {
      if (!titleContextMenu) return;
      replaceChildren(titleContextMenu, []);
      titleContextMenu.renderDom()?.remove();
      if (contextMenuCleanup) {
        contextMenuCleanup();
        contextMenuCleanup = null;
      }
    };

    /** 销毁收口：菜单挂在 document.body 上，不随组件树走，得自己销毁。 */
    const destroyTabContextMenu = () => {
      closeTabContextMenu();
      titleContextMenu?.destroy();
      titleContextMenu = null;
    };

    const closeTabs = (pathsToClose, activatePath = null) => {
      const closing = new Set(pathsToClose);
      const entries = Array.from(state.tabs.entries());
      const closingIndex = entries.findIndex(([tabPath]) => closing.has(tabPath));

      entries.forEach(([tabPath]) => {
        if (closing.has(tabPath)) {
          state.tabs.delete(tabPath);
        }
      });
      writeTitlebar();
      persistTabs();
      if (state.popupOpen) buildPopup();

      if (!closing.has(routerInstance.currentPath())) return;

      const remaining = Array.from(state.tabs.keys());
      if (remaining.length === 0) {
        replaceChildren(contentNode, []);
        routerInstance.cancelPending();
        return;
      }

      const target =
        activatePath && state.tabs.has(activatePath)
          ? activatePath
          : remaining[Math.min(Math.max(closingIndex, 0), remaining.length - 1)];
      routerInstance.navigate(target, { replace: true });
    };

    const copyTabUrl = (path) => {
      if (typeof navigator === 'undefined' || !navigator.clipboard) return;
      const origin = typeof window === 'undefined' ? '' : window.location.origin;
      const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
      const url =
        routerInstance.mode() === 'history'
          ? `${origin}${pathname}${path}`
          : `${origin}${pathname}#${path}`;
      navigator.clipboard.writeText(url).catch(() => {});
    };

    const openTabContextMenu = (path, event) => {
      if (state.popupOpen) closePopup();
      closeTabContextMenu();

      const entries = Array.from(state.tabs.entries());
      const clickedIndex = entries.findIndex(([tabPath]) => tabPath === path);
      const closeOthers = () =>
        closeTabs(
          entries.filter(([tabPath]) => tabPath !== path).map(([tabPath]) => tabPath),
          path
        );
      const closeLeft = () =>
        closeTabs(
          entries.slice(0, clickedIndex).map(([tabPath]) => tabPath),
          path
        );
      const closeRight = () =>
        closeTabs(
          entries.slice(clickedIndex + 1).map(([tabPath]) => tabPath),
          path
        );
      const closeAll = () => closeTabs(entries.map(([tabPath]) => tabPath));

      const addItem = (label, action, danger = false, disabled = false) => {
        const menu = contextMenuOf();
        const item = div({
          role: 'menuitem',
          tabIndex: '0',
          vn: 'VRouterViewsContextItem'
        }).child(label);
        if (danger) {
          item.attr('data-danger', 'true');
        }
        if (disabled) {
          // 禁用态：属性 + CSS（`aria-disabled='true'` 规则给 cursor / opacity）
          item.attr('aria-disabled', 'true');
        } else {
          item.on('click', () => {
            closeTabContextMenu();
            action();
          });
        }
        menu.child(item);
        return item;
      };
      const addSeparator = () => contextMenuOf().child(div({ vn: 'VRouterViewsContextSeparator' }));

      addItem('刷新', () => routerInstance.navigate(path, { replace: true }));
      addItem('复制链接', () => copyTabUrl(path));
      addSeparator();
      addItem('关闭', () => closeTitleTab(path), true);
      addItem('关闭其他', closeOthers, false, entries.length <= 1);
      addItem('关闭左侧', closeLeft, false, clickedIndex <= 0);
      addItem('关闭右侧', closeRight, false, clickedIndex === entries.length - 1);
      addSeparator();
      addItem('关闭全部', closeAll, true, entries.length === 0);

      const menu = contextMenuOf();
      menu.bindTo(document.body);

      const rect = menu.renderDom().getBoundingClientRect();
      const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth || 0;
      const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight || 0;
      const edge = 8;
      const left = Math.max(edge, Math.min(event.clientX || 0, viewportWidth - rect.width - edge));
      const top = Math.max(edge, Math.min(event.clientY || 0, viewportHeight - rect.height - edge));
      menu.styles({ left: `${left}px`, top: `${top}px` });

      const handlePointerDown = (pointerEvent) => {
        if (!menu.renderDom()?.contains(pointerEvent.target)) {
          closeTabContextMenu();
        }
      };
      const handleKeydown = (keyEvent) => {
        if (keyEvent.key === 'Escape') closeTabContextMenu();
      };
      const handleScroll = () => closeTabContextMenu();

      const unbindPointerDown = bindDocumentEvent('mousedown', handlePointerDown);
      const unbindKeydown = bindDocumentEvent('keydown', handleKeydown);
      const unbindScroll = bindWindowEvent('scroll', handleScroll, true);
      const unbindResize = bindWindowEvent('resize', handleScroll);
      contextMenuCleanup = () => {
        unbindPointerDown();
        unbindKeydown();
        unbindScroll();
        unbindResize();
      };
    };

    const updateTitle = (context = {}) => {
      const path = context.path || routerInstance.currentPath();
      const visiblePaths = new Set(
        state.titlePosition === 'top'
          ? Array.from(state.tabs.keys()).slice(0, maxVisibleTitles)
          : Array.from(state.tabs.keys())
      );
      let entry = state.tabs.get(path);

      if (!entry) {
        const title = resolveTitle(context);
        const text = vText(title);
        const label = button({
          role: 'tab',
          type: 'button',
          vn: 'VRouterViewsLabel'
        });
        const closeButton = button({
          'aria-label': `关闭 ${title}`,
          type: 'button',
          vn: 'VRouterViewsClose'
        });
        const tab = div({
          'data-router-view-path': path,
          vn: 'VRouterViewsTitle'
        });

        label.on('click', () => routerInstance.navigate(path));
        closeButton.child('×');
        closeButton.on('click', (event) => closeTitleTab(path, event));
        tab.on('contextmenu', (event) => {
          event.preventDefault();
          event.stopPropagation();
          openTabContextMenu(path, event);
        });
        tab.child(label.child(text), closeButton);

        entry = { closeButton, label, tab, text };
        state.tabs.set(path, entry);
        styleTitleTab(entry, false);
      } else {
        const title = resolveTitle(context);
        entry.text.textContent(title);
        entry.closeButton.attr('aria-label', `关闭 ${title}`);
      }

      if (!visiblePaths.has(path)) {
        state.tabs.delete(path);
        state.tabs = new Map([[path, entry], ...state.tabs]);
      }
      state.tabs.forEach((entry, tabPath) => styleTitleTab(entry, tabPath === path));
      writeTitlebar();
      if (state.popupOpen) buildPopup();
      persistTabs();
    };

    const restoreTabs = () => {
      if (!state.persist) return;

      const saved = readSavedTabs(state.storageKey);
      if (!saved) return;

      state.suppressPersist = true;
      try {
        saved.paths
          .slice()
          .reverse()
          .forEach((path) => {
            const resolved = routerInstance.resolve(path);
            updateTitle({ ...resolved.context, path });
          });
      } finally {
        state.suppressPersist = false;
        persistTabs();
      }
    };

    routerInstance.outlet(contentNode);
    if (routerInstance.currentRoute() || routerInstance.currentPath() !== '/') {
      updateTitle({
        params: routerInstance.currentParams(),
        path: routerInstance.currentPath(),
        query: routerInstance.currentQuery(),
        route: routerInstance.currentRoute(),
        router: routerInstance
      });
    }
    const unsubscribe = routerInstance.subscribe((context) => updateTitle(context));

    api.whenDestroy = () => {
      if (state.popupOpen) closePopup();
      destroyTabContextMenu();
      unsubscribe();
      if (routerInstance.outlet() === contentNode) routerInstance.outlet(null);
    };

    return node;
  });
}

export function vRouterViews(routerInstance, setup = null, callback = null) {
  return createComponentFactory(VRouterViews, routerInstance, setup, callback, arguments);
}

registerChildFactories(ElementNode, { vLink, vRouter, vRouterView, vRouterViews });

function normalizeRoute(pattern, config) {
  const route = {
    beforeEnter: null,
    error: null,
    loading: null,
    pattern: normalizePattern(pattern),
    rel: null,
    replace: false,
    target: null,
    title: null,
    url: null,
    view: null
  };

  if (typeof config === 'function' || config instanceof ViewNode || isTextLike(config)) {
    route.view = config;
    return route;
  }

  if (config && typeof config === 'object') {
    route.beforeEnter = config.beforeEnter || null;
    route.error = config.error ?? null;
    route.loading = config.loading ?? null;
    route.title = config.title ?? null;
    route.view = config.view || config.component || null;

    // 文档路由：url 指向真实地址（内部 HTML 页面或外部链接），不走 SPA 视图渲染。
    // url: true 表示「注册路径本身就是地址」。
    if (config.url !== undefined && config.url !== null && config.url !== false) {
      route.url = config.url === true ? route.pattern : String(config.url);
      route.target = config.target ?? null;
      route.rel = config.rel ?? (route.target === '_blank' ? 'noopener' : null);
      route.replace = Boolean(config.replace);
    }
  }

  return route;
}

function assertRouter(routerInstance) {
  // 能力约定：路由器要有导航与订阅两件事，不按组件名 / 原型链判定（票 15 §11.4）
  if (
    typeof routerInstance?.navigate !== 'function' ||
    typeof routerInstance?.subscribe !== 'function'
  ) {
    throw new TypeError('vLink and vRouterView require a Router instance');
  }
}

function normalizeTitlePosition(value) {
  return value === 'left' || value === 'right' ? value : 'top';
}

function applyDeclarativeRouterSetup(node, setup) {
  if (typeof setup === 'function') {
    setup(node);
    return node;
  }
  // 只认普通对象（props）：节点 / 句柄 / 数组不是声明式配置
  if (!setup || typeof setup !== 'object' || setup instanceof ViewNode || Array.isArray(setup)) {
    return node;
  }

  const {
    beforeEach,
    default: defaultPath,
    error,
    loading,
    notFound,
    routes = [],
    ...elementConfig
  } = setup;
  if (Object.keys(elementConfig).length) node.setup(elementConfig);
  if (defaultPath !== undefined) node.default(defaultPath);
  if (beforeEach) node.beforeEach(beforeEach);
  if (loading !== undefined) node.loading(loading);
  if (error !== undefined) node.error(error);
  routes.forEach((declaration) => {
    if (declaration?.pattern !== undefined) node.vRoute(declaration.pattern, declaration.config);
  });
  if (notFound !== undefined) node.notFound(notFound);
  return node;
}

/**
 * 链接目标是否应交给浏览器整页跳转：
 * - 外部地址（绝对 URL）→ 直接按原值输出；
 * - 注册成文档路由的站内地址 → 用路由声明的真实地址与 target/rel。
 */
function resolveDocumentTarget(routerInstance, target) {
  if (isDocumentUrl(target)) {
    return { rel: null, target: null, url: String(target).trim() };
  }

  const route = routerInstance.resolve(target).route;
  return route?.url ? route : null;
}

function buildLinkPath(to, params, query) {
  if (isDocumentUrl(to)) {
    return String(to).trim();
  }

  const normalized = normalizePath(to);
  const [pathTemplate, existingQuery = ''] = normalized.split('?');
  const pathname = pathTemplate.replace(/:([A-Za-z0-9_]+)/g, (match, name) =>
    params[name] === undefined ? match : encodeURIComponent(params[name])
  );
  const search = new URLSearchParams(existingQuery);
  Object.entries(query || {}).forEach(([name, value]) => {
    search.delete(name);
    if (Array.isArray(value)) value.forEach((item) => search.append(name, item));
    else if (value !== null && value !== undefined) search.set(name, value);
  });
  const queryString = search.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function isLinkActive(currentPath, targetPath, exact) {
  const current = normalizePath(currentPath);
  const target = normalizePath(targetPath);
  if (exact) return current === target;
  const currentPathname = parsePath(current).pathname;
  const targetPathname = parsePath(target).pathname;
  return currentPathname === targetPathname || currentPathname.startsWith(`${targetPathname}/`);
}

function shouldHandleLinkClick(event, node) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!node.attr('target') || node.attr('target') === '_self')
  );
}

/**
 * 文档路由的占位视图：默认输出一个指向真实地址的链接（无 JS 也能点），
 * 客户端会在渲染后立刻整页跳转；路由自带 view 时以它为准。
 */
function buildDocumentView(route, context) {
  if (typeof route.view === 'function') {
    return normalizeRouteView(route.view(context), context);
  }
  if (route.view instanceof ViewNode) {
    return route.view;
  }

  const url = route.url;
  const label = route.title || url;
  return div({
    'data-router-document': url,
    ...(route.target ? { 'data-router-target': route.target } : {}),
    vn: 'VRouterDocument'
  }).child(
    a({
      href: url,
      rel: route.rel || null,
      target: route.target || null,
      vn: 'VLink'
    }).child(label)
  );
}

function normalizeRouteView(view, context) {
  if (view instanceof ViewNode) {
    return view;
  }

  if (view === null || view === undefined) {
    return vText('');
  }

  if (isTextLike(view)) {
    return vText(view);
  }

  if (
    view !== null &&
    typeof view === 'object' &&
    typeof view.default !== 'undefined' &&
    typeof view.render !== 'function'
  ) {
    return normalizeRouteView(view.default, context);
  }

  if (typeof view === 'function') {
    return normalizeRouteView(view(context), context);
  }

  if (typeof view === 'object' && typeof view.render === 'function') {
    return normalizeRouteView(view.render(), context);
  }

  throw new TypeError(
    'Router route view must be a ViewNode, string, number, null, undefined, a render() component object, a factory returning one, or a module with a default export'
  );
}

const defaultLoadingView = () => '加载中…';

const defaultErrorView = (error) => `加载失败：${error?.message ?? String(error)}`;

function isPromiseLike(value) {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof value.then === 'function'
  );
}

function resolveRouteEntry(entry, args) {
  const value = typeof entry === 'function' ? entry(...args) : entry;
  return normalizeRouteView(value, args[args.length - 1]);
}

function matchRoute(pattern, path) {
  const parsedPattern = parsePath(pattern);
  const parsedPath = parsePath(path);
  const patternParts = splitPath(parsedPattern.pathname);
  const pathParts = splitPath(parsedPath.pathname);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) {
      return null;
    }
  }

  return {
    params,
    pathname: parsedPath.pathname,
    query: parsedPath.query
  };
}

function createRouteContext(routerInstance, path, route, match) {
  return {
    params: { ...match.params },
    path,
    pathname: match.pathname,
    query: { ...match.query },
    route,
    router: routerInstance
  };
}

function readHashPath() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return normalizePath(window.location.hash.replace(/^#/, '') || '/');
}

function readPath(mode = 'hash') {
  if (typeof window === 'undefined') {
    return '/';
  }

  if (mode === 'history') {
    return normalizePath(`${window.location.pathname}${window.location.search}`);
  }

  return readHashPath();
}

function writeHashPath(path, options = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = `#${path}`;

  if (options.replace) {
    window.history.replaceState(null, '', hash);
    return true;
  }

  if (window.location.hash === hash) {
    return false;
  }

  window.location.hash = hash;
  return true;
}

function writePath(path, options = {}, mode = 'hash') {
  if (typeof window === 'undefined') {
    return false;
  }

  if (mode !== 'history') {
    return writeHashPath(path, options);
  }

  const target = normalizePath(path);
  const currentPath = readPath('history');

  if (!options.replace && currentPath === target) {
    return false;
  }

  if (options.replace) {
    window.history.replaceState(null, '', target);
  } else {
    window.history.pushState(null, '', target);
  }

  return true;
}

function normalizePattern(pattern) {
  const normalized = normalizePath(pattern);
  return normalized.split('?')[0] || '/';
}

function normalizePath(path) {
  const value = String(path || '/').replace(/^#/, '');
  const [pathname, query = ''] = value.split('?');
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const cleanPathname = withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;

  return query ? `${cleanPathname}?${query}` : cleanPathname;
}

function parsePath(path) {
  const normalized = normalizePath(path);
  const [pathname, queryString = ''] = normalized.split('?');

  return {
    pathname,
    query: Object.fromEntries(new URLSearchParams(queryString))
  };
}

function splitPath(pathname) {
  return pathname.split('/').filter(Boolean);
}

function isTextLike(value) {
  return typeof value === 'string' || typeof value === 'number';
}
