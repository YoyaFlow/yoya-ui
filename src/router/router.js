import {
  applyElementOptions,
  ElementNode,
  normalizeSetupArguments,
  registerChildFactories,
  ViewNode,
  vText
} from '../core/index.js';

const maxVisibleTitles = 8;
let scrollbarStyle = null;

function ensureScrollbarStyle() {
  if (typeof document === 'undefined' || scrollbarStyle) return;

  scrollbarStyle = document.createElement('style');
  scrollbarStyle.setAttribute('data-yoya-vrouter-views-popup-style', '');
  scrollbarStyle.textContent = `.yoya-vrouter-views-titlebar,
.yoya-vrouter-views-popup {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.yoya-vrouter-views-titlebar::-webkit-scrollbar,
.yoya-vrouter-views-popup::-webkit-scrollbar {
  display: none;
  height: 0;
  width: 0;
}
.yoya-vrouter-views-popup-item:hover {
  background: #eef3f9;
}
.yoya-vrouter-views-popup-item[aria-current='true'] {
  background: #e8f0fe;
  color: #1f6feb;
}
.yoya-vrouter-views-popup-close {
  color: #57606a;
  opacity: 0.65;
}
.yoya-vrouter-views-popup-item:hover .yoya-vrouter-views-popup-close,
.yoya-vrouter-views-popup-close:hover {
  color: #b91c1c;
  opacity: 1;
}`;
  document.head?.appendChild(scrollbarStyle);
}

function createRouterViewsStorageKey(routerInstance) {
  const source = [
    routerInstance._defaultPath || '/',
    routerInstance._routes.map((route) => route.pattern).join('|')
  ].join('::');
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
    this._outlet = this;
    this._subscribers = new Set();
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

  outlet(value) {
    if (value === undefined) return this._outlet;
    if (!(value instanceof ElementNode)) {
      throw new TypeError('Router outlet must be an ElementNode');
    }
    this._outlet = value;
    return this;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Router subscriber must be a function');
    }
    this._subscribers.add(listener);
    return () => this._subscribers.delete(listener);
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
    this._subscribers.clear();
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
    const outlet = this._outlet;

    this._destroyCurrentView();
    outlet._children = [];

    if (outlet._el) {
      outlet._el.replaceChildren();
    }

    outlet.child(nextView);
    this._currentPath = context.path;
    this._currentParams = context.params;
    this._currentQuery = context.query;
    this._currentRoute = route;
    this._currentView = nextView;
    this._subscribers.forEach((listener) => listener(context, this));
  }

  _destroyCurrentView() {
    if (this._currentView?.destroy) {
      this._currentView.destroy();
    }

    this._currentView = null;
  }
}

export function createRouter(first = null, second = null, third = null) {
  const args = normalizeSetupArguments(first, second, third);
  const node = new Router(args.first);
  applyElementOptions(node, args.options);
  if (typeof args.callback === 'function') args.callback(node);
  return node;
}

export const router = createRouter;

export function vRoute(pattern, config) {
  return { config, pattern };
}

export function vRouter(first = null, second = null, third = null) {
  const args = normalizeSetupArguments(first, second, third);
  const node = new Router();
  node.vRoute = (pattern, config) => {
    node.route(pattern, config);
    return node;
  };
  applyDeclarativeRouterSetup(node, args.first);
  applyElementOptions(node, args.options);
  if (typeof args.callback === 'function') args.callback(node);
  return node;
}

export function vLink(routerInstance, setup = null, callback = null) {
  assertRouter(routerInstance);
  const node = new ElementNode('a');
  const state = {
    exact: true,
    label: null,
    params: {},
    query: {},
    replace: false,
    to: '/'
  };
  const labelNode = vText('');

  node.className('yoya-vlink');
  node.attr('data-router-link', 'true');
  node.child(labelNode);
  node.to = (value) => updateLinkValue(node, state, 'to', value);
  node.params = (value) => updateLinkValue(node, state, 'params', value || {});
  node.query = (value) => updateLinkValue(node, state, 'query', value || {});
  node.replace = (value) => updateLinkValue(node, state, 'replace', Boolean(value));
  node.exact = (value) => updateLinkValue(node, state, 'exact', Boolean(value));
  node.label = (value) => {
    if (value === undefined) return state.label;
    state.label = value;
    labelNode.textContent(value);
    return node;
  };

  applyLinkSetup(node, state, setup);
  updateLink(node, state, routerInstance);
  node.on('click', (event) => {
    if (!shouldHandleLinkClick(event, node)) return;
    event.preventDefault();
    routerInstance.navigate(buildLinkPath(state.to, state.params, state.query), {
      replace: state.replace
    });
  });

  const unsubscribe = routerInstance.subscribe(() => updateLink(node, state, routerInstance));
  const destroy = node.destroy.bind(node);
  node.destroy = () => {
    unsubscribe();
    return destroy();
  };
  if (typeof callback === 'function') callback(node);
  return node;
}

export function vRouterView(routerInstance, setup = null, callback = null) {
  assertRouter(routerInstance);
  const node = new ElementNode('div');
  node.className('yoya-vrouter-view');
  node.attr('data-router-view', 'true');
  if (typeof setup === 'function') setup(node);
  else if (setup) node.setup(setup);
  routerInstance.outlet(node);

  const destroy = node.destroy.bind(node);
  node.destroy = () => {
    if (routerInstance.outlet() === node) routerInstance.outlet(routerInstance);
    return destroy();
  };
  if (typeof callback === 'function') callback(node);
  return node;
}

export function vRouterViews(routerInstance, setup = null, callback = null) {
  assertRouter(routerInstance);
  const node = new ElementNode('div');
  const titleNode = new ElementNode('header')
    .className('yoya-vrouter-views-titlebar')
    .attr({ role: 'tablist', 'aria-label': '已打开页面' });
  const contentNode = new ElementNode('div').className('yoya-vrouter-views-content');
  const moreButtonText = vText('⋯');
  const moreButton = new ElementNode('button')
    .className('yoya-vrouter-views-expand')
    .attr({ type: 'button', 'aria-expanded': 'false', 'aria-label': '展开全部标签' })
    .styles({
      alignItems: 'center',
      background: 'transparent',
      border: '0',
      color: '#57606a',
      cursor: 'pointer',
      display: 'none',
      flexShrink: '0',
      font: 'inherit',
      gap: '6px',
      height: '24px',
      justifyContent: 'center',
      lineHeight: '1',
      marginBottom: '0',
      marginLeft: 'auto',
      minWidth: '24px',
      padding: '0',
      position: 'static'
    })
    .child(moreButtonText);
  const popup = new ElementNode('div')
    .className('yoya-vrouter-views-popup')
    .attr({ role: 'menu', 'aria-label': '已打开页面' })
    .styles({
      background: '#ffffff',
      border: '1px solid #d0d7de',
      borderRadius: '8px',
      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
      display: 'none',
      maxHeight: '280px',
      maxWidth: '260px',
      minWidth: '180px',
      msOverflowStyle: 'none',
      overflowY: 'auto',
      padding: '6px',
      position: 'fixed',
      scrollbarWidth: 'none',
      zIndex: '100'
    });
  const state = {
    overflow: false,
    persist: true,
    popupOpen: false,
    storageKey: createRouterViewsStorageKey(routerInstance),
    suppressPersist: false,
    tabs: new Map(),
    title: '工作区',
    titleResolver: null,
    titlePosition: 'top'
  };

  node.className('yoya-vrouter-views');
  node.styles({
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    overflow: 'hidden'
  });
  titleNode.styles({
    background: '#f6f8fa',
    borderBottom: '1px solid #d0d7de',
    boxSizing: 'border-box',
    color: '#57606a',
    display: 'flex',
    flexWrap: 'nowrap',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '13px',
    gap: '4px',
    msOverflowStyle: 'none',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '0px 0px',
    scrollbarWidth: 'none',
    width: '100%'
  });
  contentNode.className('yoya-vrouter-views-content');
  contentNode.styles({ minHeight: '120px', padding: '16px' });
  node.child(titleNode, contentNode, popup);

  const applyTitlePosition = (position) => {
    const vertical = position !== 'top';

    node.styles({
      alignItems: vertical ? 'stretch' : null,
      display: vertical ? 'flex' : null
    });
    titleNode.styles({
      background: '#f6f8fa',
      borderBottom: vertical ? null : '1px solid #d0d7de',
      borderLeft: position === 'right' ? '1px solid #d0d7de' : null,
      borderRight: position === 'left' ? '1px solid #d0d7de' : null,
      boxSizing: 'border-box',
      color: '#57606a',
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      flexShrink: vertical ? '0' : null,
      flexWrap: 'nowrap',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      gap: '4px',
      msOverflowStyle: 'none',
      overflowX: vertical ? 'hidden' : 'auto',
      overflowY: vertical ? 'auto' : 'hidden',
      padding: vertical ? '10px 8px' : '0px 0px',
      scrollbarWidth: 'none',
      width: vertical ? null : '100%'
    });
    contentNode.styles({
      flex: vertical ? '1 1 auto' : null,
      minWidth: vertical ? '0' : null
    });
    const orderedChildren =
      position === 'right' ? [contentNode, titleNode, popup] : [titleNode, contentNode, popup];
    node.clearChildren().child(orderedChildren);
    if (node._el) {
      orderedChildren.forEach((child) => {
        const childElement = child.renderDom();
        if (childElement) node._el.appendChild(childElement);
      });
    }
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

  const styleTitleTab = (tab, active) => {
    const position = state.titlePosition;
    const vertical = position !== 'top';

    tab
      .renderDom()
      .querySelector('.yoya-vrouter-views-label')
      ?.setAttribute('aria-selected', String(active));
    tab.styles({
      background: active ? '#ffffff' : '#eaeef2',
      border: '1px solid #d0d7de',
      borderBottomColor: position === 'top' ? (active ? '#ffffff' : '#d0d7de') : '#d0d7de',
      borderLeftColor: position === 'right' ? (active ? '#ffffff' : '#d0d7de') : '#d0d7de',
      borderRadius:
        position === 'left' ? '6px 0 0 6px' : position === 'right' ? '0 6px 6px 0' : '6px 6px 0 0',
      borderRightColor: position === 'left' ? (active ? '#ffffff' : '#d0d7de') : '#d0d7de',
      color: active ? '#24292f' : '#57606a',
      fontWeight: active ? '600' : '400',
      marginBottom: position === 'top' ? '-9px' : '0',
      marginLeft: position === 'right' ? '-9px' : '0',
      marginRight: position === 'left' ? '-9px' : '0',
      padding: vertical ? '8px 10px' : '7px 14px 8px'
    });
  };

  const setOverflowButtonVisible = (visible) => {
    state.overflow = Boolean(visible);
    node.attr('data-title-overflow', state.overflow ? 'true' : null);
    moreButton.style('display', state.overflow ? 'inline-flex' : 'none');
  };

  const updateOverflow = () => {
    if (state.titlePosition !== 'top' || state.tabs.size <= maxVisibleTitles) {
      setOverflowButtonVisible(false);
      return;
    }

    setOverflowButtonVisible(true);
  };

  const syncMoreButton = () => {
    const tabEntries = Array.from(state.tabs.entries());
    const children = tabEntries
      .slice(0, maxVisibleTitles)
      .map(([, entry]) => entry.tab)
      .filter((child) => child !== moreButton);
    const shouldShowButton = tabEntries.length > maxVisibleTitles && state.titlePosition === 'top';

    if (!shouldShowButton) {
      if (state.popupOpen) closePopup();
      titleNode._children = children;
      titleNode._childrenDirty = true;
      if (titleNode._el) {
        titleNode._el.replaceChildren(
          ...children.map((child) => child.renderDom()).filter(Boolean)
        );
      } else {
        moreButton._el?.remove();
      }
      setOverflowButtonVisible(false);
      return;
    }

    titleNode._children = [...children, moreButton];
    titleNode._childrenDirty = true;
    if (titleNode._el) {
      const childElements = children.map((child) => child.renderDom()).filter(Boolean);
      titleNode._el.replaceChildren(...childElements, moreButton.renderDom());
    }
    updateOverflow();
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
    popup.style('display', 'none');
    if (popupCleanup) {
      popupCleanup();
      popupCleanup = null;
    }
  };

  const buildPopup = () => {
    popup.clearChildren();
    if (popup._el) popup._el.replaceChildren();

    Array.from(state.tabs.entries())
      .slice(maxVisibleTitles)
      .forEach(([path, entry]) => {
        const title = entry.text.textContent();
        const item = new ElementNode('div')
          .className('yoya-vrouter-views-popup-item')
          .attr({ role: 'menuitem', tabIndex: '0', 'data-router-view-path': path })
          .styles({
            alignItems: 'center',
            borderRadius: '6px',
            color: '#24292f',
            cursor: 'pointer',
            display: 'flex',
            fontSize: '13px',
            gap: '8px',
            padding: '7px 8px',
            width: '100%'
          });
        const titleSpan = new ElementNode('span')
          .className('yoya-vrouter-views-popup-title')
          .styles({
            flex: '1',
            minWidth: '0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          })
          .text(title);
        const closeButton = new ElementNode('button')
          .className('yoya-vrouter-views-popup-close')
          .attr({ type: 'button', 'aria-label': `关闭 ${title}` })
          .styles({
            background: 'transparent',
            border: '0',
            color: 'inherit',
            cursor: 'pointer',
            flexShrink: '0',
            font: 'inherit',
            lineHeight: '1',
            padding: '2px 4px'
          })
          .text('×');
        if (path === routerInstance.currentPath()) {
          item.attr('aria-current', 'true');
          item.styles({ background: '#e8f0fe', color: '#1f6feb' });
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
        popup.child(item);
      });
  };

  const openPopup = () => {
    if (state.tabs.size === 0) return;

    ensureScrollbarStyle();
    buildPopup();
    state.popupOpen = true;
    node.attr('data-title-popup', 'true');
    moreButton.attr('aria-expanded', 'true');
    const buttonRect = moreButton._el?.getBoundingClientRect();
    popup.styles({
      display: 'block',
      left: `${buttonRect?.left ?? 0}px`,
      top: `${(buttonRect?.bottom ?? 0) + 4}px`
    });

    const handleDocumentClick = (event) => {
      if (!popup._el?.contains(event.target) && !moreButton._el?.contains(event.target)) {
        closePopup();
      }
    };
    const handleKeydown = (event) => {
      if (event.key === 'Escape') closePopup();
    };
    const handleScroll = () => {
      const buttonRect = moreButton._el?.getBoundingClientRect();
      if (buttonRect) {
        popup.styles({
          left: `${buttonRect.left}px`,
          top: `${buttonRect.bottom + 4}px`
        });
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('scroll', handleScroll, true);
    popupCleanup = () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  };

  moreButton.on('click', () => {
    if (state.popupOpen) {
      closePopup();
    } else {
      openPopup();
    }
  });

  const renderDom = node.renderDom.bind(node);
  node.renderDom = () => {
    ensureScrollbarStyle();
    const element = renderDom();
    updateOverflow();
    return element;
  };
  node.updateOverflow = updateOverflow;

  node.titlePosition = (value) => {
    if (value === undefined) return state.titlePosition;

    const next = normalizeTitlePosition(value);
    state.titlePosition = next;
    if (next !== 'top' && state.popupOpen) closePopup();
    node.attr('data-title-position', state.titlePosition);
    titleNode.attr('aria-orientation', state.titlePosition === 'top' ? 'horizontal' : 'vertical');
    applyTitlePosition(state.titlePosition);
    syncMoreButton();
    state.tabs.forEach(({ tab }, path) => {
      styleTitleTab(tab, path === routerInstance.currentPath());
    });
    updateOverflow();
    return node;
  };
  node.titlePosition(state.titlePosition);

  const closeTitleTab = (path, event) => {
    event.stopPropagation();
    const entries = Array.from(state.tabs.entries());
    const closingIndex = entries.findIndex(([tabPath]) => tabPath === path);
    const entry = state.tabs.get(path);
    if (!entry) return;

    const wasActive =
      entry.tab
        .renderDom()
        .querySelector('.yoya-vrouter-views-label')
        .getAttribute('aria-selected') === 'true';
    state.tabs.delete(path);
    titleNode._children = titleNode.children().filter((child) => child !== entry.tab);
    titleNode._childrenDirty = true;
    entry.tab.destroy();
    syncMoreButton();
    persistTabs();

    if (!wasActive) return;
    const remainingPaths = Array.from(state.tabs.keys());
    if (remainingPaths.length > 0) {
      const nextPath = remainingPaths[Math.min(closingIndex, remainingPaths.length - 1)];
      routerInstance.navigate(nextPath, { replace: true });
      return;
    }

    contentNode.clearChildren().commit();
    routerInstance._currentView = null;
  };

  const updateTitle = (context = {}) => {
    const path = context.path || routerInstance.currentPath();
    let entry = state.tabs.get(path);

    if (!entry) {
      const tab = new ElementNode('div').className('yoya-vrouter-views-title');
      const text = vText(resolveTitle(context));
      const label = new ElementNode('button').className('yoya-vrouter-views-label').child(text);
      const closeButton = new ElementNode('button').className('yoya-vrouter-views-close');
      tab.attr({ 'data-router-view-path': path });
      tab.styles({
        alignItems: 'center',
        cursor: 'pointer',
        display: 'inline-flex',
        font: 'inherit',
        gap: '8px',
        whiteSpace: 'nowrap'
      });
      label.attr({ role: 'tab', type: 'button' });
      label.styles({
        background: 'transparent',
        border: '0',
        color: 'inherit',
        cursor: 'pointer',
        font: 'inherit',
        padding: '0'
      });
      label.on('click', () => routerInstance.navigate(path));
      closeButton.attr({ type: 'button', 'aria-label': `关闭 ${resolveTitle(context)}` });
      closeButton.styles({
        background: 'transparent',
        border: '0',
        color: 'inherit',
        cursor: 'pointer',
        font: 'inherit',
        lineHeight: '1',
        padding: '0'
      });
      closeButton.text('×');
      closeButton.on('click', (event) => closeTitleTab(path, event));
      tab.child(label, closeButton);
      titleNode.child(tab);
      styleTitleTab(tab, false);
      entry = { closeButton, tab, text };
      state.tabs.set(path, entry);
    } else {
      const title = resolveTitle(context);
      entry.text.textContent(title);
      entry.closeButton.attr('aria-label', `关闭 ${title}`);
    }

    state.tabs.delete(path);
    state.tabs = new Map([[path, entry], ...state.tabs]);
    state.tabs.forEach(({ tab }, tabPath) => styleTitleTab(tab, tabPath === path));
    syncMoreButton();
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
          const resolved = routerInstance._resolve(path);
          updateTitle({ ...resolved.context, path });
        });
    } finally {
      state.suppressPersist = false;
      persistTabs();
    }
  };

  if (typeof setup === 'function') {
    setup(node);
  } else if (setup && typeof setup === 'object') {
    const { persist, storageKey, title, titlePosition, titleResolver, ...elementConfig } = setup;
    if (title !== undefined) state.title = title;
    if (persist !== undefined) state.persist = Boolean(persist);
    if (storageKey !== undefined) state.storageKey = storageKey;
    if (titlePosition !== undefined) node.titlePosition(titlePosition);
    if (typeof titleResolver === 'function') state.titleResolver = titleResolver;
    if (Object.keys(elementConfig).length > 0) node.setup(elementConfig);
  }

  routerInstance.outlet(contentNode);
  restoreTabs();
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

  const handleResize = () => updateOverflow();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }

  const destroy = node.destroy.bind(node);
  node.destroy = () => {
    if (state.popupOpen) closePopup();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
    unsubscribe();
    if (routerInstance.outlet() === contentNode) routerInstance.outlet(routerInstance);
    return destroy();
  };
  if (typeof callback === 'function') callback(node);
  return node;
}

registerChildFactories(ElementNode, { vLink, vRouter, vRouterView, vRouterViews });

function normalizeRoute(pattern, config) {
  const route = {
    beforeEnter: null,
    pattern: normalizePattern(pattern),
    title: null,
    view: null
  };

  if (typeof config === 'function' || config instanceof ViewNode || isTextLike(config)) {
    route.view = config;
    return route;
  }

  if (config && typeof config === 'object') {
    route.beforeEnter = config.beforeEnter || null;
    route.title = config.title ?? null;
    route.view = config.view || config.component || null;
  }

  return route;
}

function assertRouter(routerInstance) {
  if (!(routerInstance instanceof Router)) {
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
  if (!setup || typeof setup !== 'object') return node;

  const { beforeEach, default: defaultPath, notFound, routes = [], ...elementConfig } = setup;
  if (Object.keys(elementConfig).length) node.setup(elementConfig);
  if (defaultPath !== undefined) node.default(defaultPath);
  if (beforeEach) node.beforeEach(beforeEach);
  routes.forEach((declaration) => {
    if (declaration?.pattern !== undefined) node.vRoute(declaration.pattern, declaration.config);
  });
  if (notFound !== undefined) node.notFound(notFound);
  return node;
}

function applyLinkSetup(node, state, setup) {
  if (typeof setup === 'function') {
    setup(node);
    return;
  }
  if (typeof setup === 'string') {
    node.to(setup);
    node.label(setup);
    return;
  }
  if (!setup) return;

  const { exact, label, params, query, replace, to, ...elementConfig } = setup;
  if (Object.keys(elementConfig).length) node.setup(elementConfig);
  if (to !== undefined) state.to = to;
  if (params !== undefined) state.params = params || {};
  if (query !== undefined) state.query = query || {};
  if (replace !== undefined) state.replace = Boolean(replace);
  if (exact !== undefined) state.exact = Boolean(exact);
  state.label = label ?? state.to;
  node.children()[0].textContent(state.label);
}

function updateLinkValue(node, state, key, value) {
  if (value === undefined) return state[key];
  state[key] = value;
  if (key === 'to' && state.label === null) node.children()[0].textContent(value);
  const routerInstance = node._routerInstance;
  if (routerInstance) updateLink(node, state, routerInstance);
  return node;
}

function updateLink(node, state, routerInstance) {
  node._routerInstance = routerInstance;
  const target = buildLinkPath(state.to, state.params, state.query);
  const active = isLinkActive(routerInstance.currentPath(), target, state.exact);
  const classes = new Set(
    String(node.attr('class') || '')
      .split(/\s+/)
      .filter(Boolean)
  );
  classes.add('yoya-vlink');
  if (active) classes.add('is-active');
  else classes.delete('is-active');
  node.attr({
    'aria-current': active ? 'page' : null,
    class: [...classes].join(' '),
    href: `#${target}`
  });
  return node;
}

function buildLinkPath(to, params, query) {
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
