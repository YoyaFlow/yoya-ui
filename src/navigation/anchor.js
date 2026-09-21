import { componentNameOf, viewRootOf } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import { a, li, nav, ul } from '../html/index.js';
import {
  createComponentShortcut,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot
} from '../components/shared.js';

/**
 * 锚点导航（票 15 §4：**结构 + 身份 + 命令**，组件里没有元素节点类）。
 *
 * - 结构：`nav[VAnchor] > ul[VAnchorList] > li[VAnchorItem] > a[VAnchorLink] + ul[VAnchorChildren]`；
 * - **匿名占位就是列表**（`vn_slot: ''`）：`anchor.child(item)` 与命令投递的内容都落进那张 `<ul>`，
 *   子项进列表的语义与旧节点类型的 `child()` 分流一致（§11.17：分流改成槽位，语义不变）；
 * - 全局只绑 `window` / `document` 的滚动（`whenMount` 里按落地收口绑，`destroy()` 自动卸），
 *   点击走元素自己的 `on('click')` 委托；
 * - 结构里的块（列表 / 链接 / 子列表）**按身份现取**（`findInView`），命令不存节点句柄。
 */

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const ANCHOR_ITEM = Symbol('yoya.anchorItem');

const SCROLL_OPTIONS = { capture: true, passive: true };
const DEFAULT_LABEL = '页面锚点';
const DEFAULT_OFFSET = 80;

/** 列表（形态 A）：身份 + 匿名占位——匿名内容（子项）落进这张 `<ul>`。 */
function AnchorList() {
  return ul({ vn: 'VAnchorList', vn_slot: '' });
}

/** 链接（形态 A）。 */
function AnchorLink() {
  return a({ vn: 'VAnchorLink' });
}

/** 子列表（形态 A）：没有子项时隐藏，显隐由项自己的命令收口。 */
function AnchorChildren() {
  return ul({ vn: 'VAnchorChildren' }).style('display', 'none');
}

/**
 * 结构里按身份现取：组件的命令在 setup 之后才跑，那时视图已经建好（起手节点是视图根）。
 * 组件节点展开到视图根再往下走；找不到返回 null。
 */
function findInView(node, name) {
  const root = viewRootOf(node) ?? node;
  const children = typeof root?.children === 'function' ? root.children() : [];

  for (const child of children) {
    const unit = viewRootOf(child) ?? child;

    if (componentNameOf(unit) === name) {
      return unit;
    }

    const nested = findInView(unit, name);

    if (nested) {
      return nested;
    }
  }

  return null;
}

/**
 * 锚点项：结构（`li > a + ul`）+ 命令（标题 / 地址 / 子项 / 当前态）。
 * 字符串 = 标题；对象 = props；子项数组走 `nested`。
 */
export function VAnchorItem() {
  return vNode((api, self) => {
    const state = { active: false, href: null, title: '' };

    const itemOf = () => viewRootOf(self.node());
    const linkOf = () => findInView(itemOf(), 'VAnchorLink');
    const childrenOf = () => findInView(itemOf(), 'VAnchorChildren');

    /** 地址 / 子列表显隐 / 有子项标记：改一处收口一次。 */
    const syncItem = () => {
      const children = childrenOf();
      const hasChildren = Boolean(children) && children.children().length > 0;

      linkOf()?.attr('href', state.href || null);
      children?.style('display', hasChildren ? null : 'none');
      itemOf().attr('data-has-children', hasChildren ? 'true' : null);
      return api;
    };

    api.title = (content) => {
      if (content === undefined) {
        return state.title;
      }

      state.title = content;
      const link = linkOf();

      if (link) {
        replaceChildren(link, normalizeChildren(content ?? ''));
      }

      return api;
    };

    api.text = (content) => (content === undefined ? state.title : api.title(content));
    api.label = api.text;

    api.href = (value) => {
      if (value === undefined) {
        return state.href;
      }

      state.href = value === null || value === undefined ? null : String(resolveTextValue(value));
      return syncItem();
    };

    api.nested = (setup) => {
      const children = childrenOf();

      if (setup === undefined) {
        return children ? children.children() : [];
      }

      if (Array.isArray(setup)) {
        replaceChildren(children, []);
        setup.forEach((item) => children.child(normalizeAnchorItem(item)));
      } else {
        setupContentSlot(children, setup);
      }

      return syncItem();
    };

    api.subItems = (setup) => (setup === undefined ? api.nested() : api.nested(setup));

    api.active = (value = true) => {
      state.active = Boolean(value);
      itemOf().attr('data-active', state.active ? 'true' : null);
      itemOf().attr('aria-current', state.active ? 'true' : null);
      return syncItem();
    };

    /** props：`title / text / label / content / href / nested / items / children / active` + 其余元素配置。 */
    api.setupObject = (config) => {
      const {
        active,
        children,
        content,
        href,
        items,
        label,
        nested,
        text,
        title,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        itemOf().setup(elementConfig);
      }

      if (title !== undefined) {
        api.title(title);
      } else if (label !== undefined) {
        api.label(label);
      } else if (text !== undefined) {
        api.text(text);
      } else if (content !== undefined) {
        api.text(content);
      }

      if (href !== undefined) {
        api.href(href);
      }

      const nestedSetup = nested ?? items ?? children;

      if (nestedSetup !== undefined) {
        api.nested(nestedSetup);
      }

      if (active !== undefined) {
        api.active(active);
      }

      return api;
    };

    /** 字符串 / 数字 = 标题。 */
    api.setupString = (value) => api.title(value);

    return li({ vn: 'VAnchorItem' }, (element) => {
      element.child(AnchorLink(), AnchorChildren());
    });
  });
}

const anchorItemShortcut = createComponentShortcut(VAnchorItem);

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vAnchorItem(...args) {
  const node = anchorItemShortcut(...args);
  // 标在节点上而不是查组件名：本模块自己认自己的子项（含嵌套层）
  node[ANCHOR_ITEM] = true;
  return node;
}

/**
 * 锚点导航：`nav > ul[VAnchorList]`；全局滚动跟当前项、点击滚动到目标并高亮。
 * 对象 = props，字符串 / 数字 = 一条锚点项，函数 = 构建回调（默认落组件节点构建帧）。
 */
export function VAnchor() {
  return vNode((api, self) => {
    const state = { activeHref: null, offset: DEFAULT_OFFSET, target: null };

    const rootOf = () => viewRootOf(self.node());
    const listOf = () => findInView(self.node(), 'VAnchorList');

    /** 本模块的项按列表顺序摊平（含嵌套层）；其它内容（用户自造节点）不参与对账。 */
    const collectItems = (nodes, out = []) => {
      nodes.forEach((node) => {
        const item = node?.[ANCHOR_ITEM] ? node : null;

        if (!item) {
          return;
        }

        out.push(item);
        collectItems(item.nested(), out);
      });

      return out;
    };

    const itemsOf = () => {
      const list = listOf();
      return list ? collectItems(list.children()) : [];
    };

    /** 当前项标记：`data-active-href` 落在导航上，项自己的激活态由项收口。 */
    const syncActive = () => {
      const activeHref = state.activeHref;

      rootOf().attr('data-active-href', activeHref || null);
      itemsOf().forEach((item) => item.active(item.href() === activeHref));
      return api;
    };

    /** 子项数 + 当前项标记：内容一变就收口一次。 */
    const syncItems = () => {
      rootOf().attr('data-item-count', String(itemsOf().length));
      return syncActive();
    };

    const resolveTargetElement = (target) => {
      if (typeof Element !== 'undefined' && target instanceof Element) {
        return target;
      }

      if (typeof target === 'string' && typeof document !== 'undefined') {
        return document.querySelector(target);
      }

      return target || null;
    };

    const resolveScrollContainer = () => {
      if (!state.target) {
        return typeof window === 'undefined' ? null : window;
      }

      return resolveTargetElement(state.target) || (typeof window === 'undefined' ? null : window);
    };

    const resolveAnchorTarget = (href) => {
      const id = String(href).replace(/^#/, '');

      if (!id || typeof document === 'undefined') {
        return null;
      }

      const scope = state.target ? resolveTargetElement(state.target) : document;

      if (!scope) {
        return null;
      }

      if (typeof scope.getElementById === 'function') {
        return scope.getElementById(id);
      }

      return scope.querySelector(`#${cssEscape(id)}`);
    };

    const targetTop = (targetElement) => {
      const container = resolveScrollContainer();
      const offset = state.offset || 0;

      if (!container || container === window) {
        const scrollTop =
          typeof window !== 'undefined'
            ? window.scrollY || document.documentElement?.scrollTop || 0
            : 0;
        return scrollTop + targetElement.getBoundingClientRect().top - offset;
      }

      const containerRect = container.getBoundingClientRect();
      return (
        container.scrollTop + targetElement.getBoundingClientRect().top - containerRect.top - offset
      );
    };

    const scrollElementIntoView = (targetElement) => {
      const container = resolveScrollContainer();
      const top = targetTop(targetElement);

      if (container === window || container === null) {
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo({ behavior: 'smooth', top });
        }
        return;
      }

      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ behavior: 'smooth', top });
      } else {
        container.scrollTop = top;
      }
    };

    const scrollToTarget = (href) => {
      const targetElement = resolveAnchorTarget(href);

      if (targetElement) {
        scrollElementIntoView(targetElement);
      }

      if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
        history.replaceState(null, '', href);
      }

      api.active(href);
    };

    /** 滚动位置 → 当前项：目标过了阈值（偏移量）就算到它。 */
    const syncActiveFromScroll = () => {
      const container = resolveScrollContainer();
      const containerRect =
        container && container !== window && typeof container.getBoundingClientRect === 'function'
          ? container.getBoundingClientRect()
          : null;
      const threshold = state.offset || 0;
      let activeHref = null;
      let foundTarget = false;

      itemsOf().forEach((item) => {
        const href = item.href();

        if (!href) {
          return;
        }

        const targetElement = resolveAnchorTarget(href);

        if (!targetElement) {
          return;
        }

        foundTarget = true;
        const rect = targetElement.getBoundingClientRect();
        const top = containerRect ? rect.top - containerRect.top : rect.top;

        if (top - threshold <= 0) {
          activeHref = href;
        }
      });

      if (foundTarget && activeHref !== state.activeHref) {
        api.active(activeHref);
      }
    };

    const handleClick = (event) => {
      const link = event.target.closest?.('[vn~="VAnchorLink"]');
      const list = listOf()?.renderDom();

      if (!link || !list?.contains(link)) {
        return;
      }

      const href = link.getAttribute('href');

      if (!href || !href.startsWith('#')) {
        return;
      }

      event.preventDefault();
      scrollToTarget(href);
    };

    api.ariaLabel = (content) => {
      rootOf().attr('aria-label', resolveTextValue(content) || DEFAULT_LABEL);
      return api;
    };

    api.offset = (value) => {
      if (value === undefined) {
        return state.offset;
      }

      state.offset = Math.max(0, Number(resolveTextValue(value)) || 0);
      rootOf().attr('data-offset', String(state.offset));
      return api;
    };

    api.target = (value) => {
      if (value === undefined) {
        return state.target;
      }

      state.target = value || null;
      return api;
    };

    api.items = (value) => {
      const list = listOf();

      if (!list) {
        return value === undefined ? [] : api;
      }

      if (value === undefined) {
        return list.children();
      }

      replaceChildren(list, []);
      value.forEach((item) => list.child(normalizeAnchorItem(item)));
      return syncItems();
    };

    /** 段命令：项进列表（与 `table.vTr(…)` 同一口径——自己的结构自己收）。 */
    api.vAnchorItem = (setup) => {
      listOf()?.child(normalizeAnchorItem(setup));
      return syncItems();
    };

    api.active = (value) => {
      if (value === undefined) {
        return state.activeHref;
      }

      state.activeHref = value || null;
      return syncActive();
    };

    api.activeHref = (value) => api.active(value);

    /** props：`ariaLabel / offset / target / items / children / activeHref / active` + 其余元素配置。 */
    api.setupObject = (config) => {
      const { activeHref, ariaLabel, children, items, offset, target, ...elementConfig } = config;

      if (Object.keys(elementConfig).length > 0) {
        rootOf().setup(elementConfig);
      }

      if (ariaLabel !== undefined) {
        api.ariaLabel(ariaLabel);
      }

      if (offset !== undefined) {
        api.offset(offset);
      }

      if (target !== undefined) {
        api.target(target);
      }

      const itemSetup = items ?? children;

      if (itemSetup !== undefined) {
        api.items(Array.isArray(itemSetup) ? itemSetup : [itemSetup]);
      }

      if (activeHref !== undefined) {
        api.active(activeHref);
      }

      return api;
    };

    /** 字符串 / 数字 = 一条锚点项（标题作项名，没有地址）。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
    };

    /** 落地才绑全局滚动（`whenMount` 按落地收口触发，绑定后再跟一次当前位置）；destroy 自动卸。 */
    api.whenMount = () => {
      const root = rootOf();

      if (!root) {
        return;
      }

      root.bindWindowEvent('scroll', syncActiveFromScroll, SCROLL_OPTIONS);
      root.bindDocumentEvent('scroll', syncActiveFromScroll, SCROLL_OPTIONS);
      syncActiveFromScroll();
    };

    return nav(
      { 'aria-label': DEFAULT_LABEL, 'data-offset': String(DEFAULT_OFFSET), vn: 'VAnchor' },
      (element) => {
        element.on('click', handleClick);
        element.child(AnchorList());
      }
    );
  });
}

export const vAnchor = createComponentShortcut(VAnchor);

function normalizeAnchorItem(item) {
  if (item?.[ANCHOR_ITEM]) {
    return item;
  }

  return vAnchorItem(item);
}

function cssEscape(value) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;
}
