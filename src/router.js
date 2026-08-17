import { ElementNode, ViewNode, vText } from './core/index.js';

/**
 * Router 是一个很轻的 hash 路由出口。
 * 它负责路径匹配、参数提取、守卫和把路由视图渲染到自身节点内。
 */
export class Router extends ElementNode {
  constructor(setup = null) {
    super('div');
    this._routes = [];
    this._defaultPath = null;
    this._notFoundView = null;
    this._beforeEach = null;
    this._currentPath = '/';
    this._currentParams = {};
    this._currentQuery = {};
    this._currentRoute = null;
    this._currentView = null;
    this._ignoreNextHashPath = null;
    this._started = false;
    this._onHashChange = () => this._handleHashChange();
    this.attr('data-yoya-router', '');

    if (setup !== null) {
      this.setup(setup);
    }
  }

  setup(setup) {
    if (typeof setup === 'function') {
      setup(this);
      return this;
    }

    return super.setup(setup);
  }

  /**
   * 设置无 hash 时进入的默认路径。
   */
  default(path) {
    this._defaultPath = normalizePath(path);
    return this;
  }

  /**
   * 添加路由。config 可以是视图函数，也可以是 { view/component, beforeEnter }。
   */
  route(pattern, config) {
    const route = normalizeRoute(pattern, config);
    this._routes.push(route);
    return this;
  }

  /**
   * 设置未匹配路由的视图函数。
   */
  notFound(view) {
    this._notFoundView = view;
    return this;
  }

  /**
   * 设置全局前置守卫，返回 false 时阻止导航。
   */
  beforeEach(guard) {
    this._beforeEach = guard;
    return this;
  }

  start() {
    if (!this._started && typeof window !== 'undefined') {
      window.addEventListener('hashchange', this._onHashChange);
      this._started = true;
    }

    if (!window.location.hash && this._defaultPath) {
      return this.navigate(this._defaultPath, { replace: true });
    }

    return this.refresh();
  }

  stop() {
    if (this._started && typeof window !== 'undefined') {
      window.removeEventListener('hashchange', this._onHashChange);
      this._started = false;
    }

    return this;
  }

  /**
   * 导航到指定路径。replace 为 true 时不新增浏览器历史记录。
   */
  navigate(path, options = {}) {
    const nextPath = normalizePath(path);
    const resolved = this._resolve(nextPath);

    if (!this._canEnter(resolved.context)) {
      return this;
    }

    const hashChanged = writeHashPath(nextPath, options);
    if (hashChanged && !options.replace) {
      this._ignoreNextHashPath = nextPath;
    }
    this._renderResolved(resolved);
    return this;
  }

  refresh() {
    const nextPath = readHashPath();
    const resolved = this._resolve(nextPath);

    if (!this._canEnter(resolved.context)) {
      return this;
    }

    this._renderResolved(resolved);
    return this;
  }

  currentPath() {
    return this._currentPath;
  }

  currentParams() {
    return { ...this._currentParams };
  }

  currentQuery() {
    return { ...this._currentQuery };
  }

  currentRoute() {
    return this._currentRoute;
  }

  go(delta) {
    window.history.go(delta);
    return this;
  }

  back() {
    return this.go(-1);
  }

  forward() {
    return this.go(1);
  }

  destroy() {
    this.stop();
    this._destroyCurrentView();
    return super.destroy();
  }

  _resolve(path) {
    const routeMatch = this._routes
      .map((route) => ({ route, match: matchRoute(route.pattern, path) }))
      .find(({ match }) => match);

    if (routeMatch) {
      const context = createRouteContext(this, path, routeMatch.route, routeMatch.match);
      return { context, route: routeMatch.route, view: routeMatch.route.view };
    }

    const parsed = parsePath(path);
    const context = createRouteContext(this, path, null, {
      params: {},
      pathname: parsed.pathname,
      query: parsed.query
    });

    return { context, route: null, view: this._notFoundView };
  }

  _handleHashChange() {
    const nextPath = readHashPath();

    if (this._ignoreNextHashPath === nextPath) {
      this._ignoreNextHashPath = null;
      return this;
    }

    this._ignoreNextHashPath = null;
    return this.refresh();
  }

  _canEnter(to) {
    const from = {
      params: this.currentParams(),
      path: this._currentPath,
      query: this.currentQuery(),
      route: this._currentRoute
    };

    if (this._beforeEach && this._beforeEach(to, from, this) === false) {
      return false;
    }

    if (to.route?.beforeEnter && to.route.beforeEnter(to, from, this) === false) {
      return false;
    }

    return true;
  }

  _renderResolved(resolved) {
    const { context, route, view } = resolved;
    const result = typeof view === 'function' ? view(context) : view;
    const nextView = normalizeRouteView(result);

    this._destroyCurrentView();
    this._children = [];

    if (this._el) {
      this._el.replaceChildren();
    }

    this.child(nextView);
    this._currentPath = context.path;
    this._currentParams = context.params;
    this._currentQuery = context.query;
    this._currentRoute = route;
    this._currentView = nextView;
  }

  _destroyCurrentView() {
    if (this._currentView?.destroy) {
      this._currentView.destroy();
    }

    this._currentView = null;
  }
}

export function createRouter(setup = null) {
  return new Router(setup);
}

export const router = createRouter;

function normalizeRoute(pattern, config) {
  const route = {
    beforeEnter: null,
    pattern: normalizePattern(pattern),
    view: null
  };

  if (typeof config === 'function' || config instanceof ViewNode || isTextLike(config)) {
    route.view = config;
    return route;
  }

  if (config && typeof config === 'object') {
    route.beforeEnter = config.beforeEnter || null;
    route.view = config.view || config.component || null;
  }

  return route;
}

function normalizeRouteView(view) {
  if (view instanceof ViewNode) {
    return view;
  }

  if (view === null || view === undefined) {
    return vText('');
  }

  if (isTextLike(view)) {
    return vText(view);
  }

  throw new TypeError('Router route view must be a ViewNode, string, number, null, or undefined');
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
