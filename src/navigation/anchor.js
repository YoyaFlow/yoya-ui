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
 * - **部件用到才建、建过复用**（与 `VTable` 的段命令同一口径）：项的链接 / 子列表由项自己的命令造，
 *   导航的列表声明成匿名占位（`vn_slot: ''`）接 `anchor.child(item)`，其余内容仍进组件根；
 * - 命令只写**快照**（`attr` / `replaceChildren`）和自己的账：不找节点、不碰 `_el` / `_children`，
 *   也不依赖"写完再刷"——首屏就是构建期快照；
 * - 项由**造它的一方持有**（导航自己建的项自己记账，项自己建的子项自己记账）：子项数 / 当前态从这里收口；
 * - 全局滚动在 `whenMount` 里按落地收口绑（`bindWindowEvent` / `bindDocumentEvent`，destroy 自动卸），
 *   点击走元素自己的 `on('click')` 委托。
 */

const SCROLL_OPTIONS = { capture: true, passive: true };
const DEFAULT_LABEL = '页面锚点';
const DEFAULT_OFFSET = 80;

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const ANCHOR_ITEM = Symbol('yoya.anchorItem');

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
 * 锚点项：结构（`li > a + ul`）+ 命令（标题 / 地址 / 子项 / 当前态）。
 * 字符串 = 标题；对象 = props；子项走 `nested` / `vAnchorItem`（落进子列表）。
 */
export function VAnchorItem() {
  return vNode((api, self) => {
    const state = { active: false, href: null, title: '' };
    let linkPart = null;
    let childrenPart = null;

    /**
     * 两块部件：**用到才建、建过复用**（与 `VTable` 的段命令同一口径），落进 `<li>` 的顺序固定为
     * 链接在前、子列表在后——与调用顺序无关，也不靠身份在结构里找。
     */
    const partsOf = () => {
      if (!linkPart) {
        linkPart = AnchorLink();
        self.node().child(linkPart);
      }

      if (!childrenPart) {
        childrenPart = AnchorChildren();
        self.node().child(childrenPart);
      }

      return { children: childrenPart, link: linkPart };
    };

    /** 地址 / 子列表显隐 / 有子项标记：改一处收口一次（写的都是快照，首屏直接读得到）。 */
    const syncItem = () => {
      const { children, link } = partsOf();
      const hasChildren = children.children().length > 0;

      link.attr('href', state.href || null);
      children.style('display', hasChildren ? null : 'none');
      self.node().attr('data-has-children', hasChildren ? 'true' : null);
      return api;
    };

    api.title = (content) => {
      if (content === undefined) {
        return state.title;
      }

      state.title = content;
      replaceChildren(partsOf().link, normalizeChildren(content ?? ''));
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
      if (setup === undefined) {
        return partsOf().children.children();
      }

      const children = partsOf().children;
      replaceChildren(children, []);

      if (typeof setup === 'function') {
        setupContentSlot(children, setup);
      } else {
        (Array.isArray(setup) ? setup : [setup]).forEach((item) =>
          children.child(normalizeAnchorItem(item))
        );
      }

      return syncItem();
    };

    api.subItems = (setup) => (setup === undefined ? api.nested() : api.nested(setup));

    /** 子项投递：造一份子项、落进子列表；子项数与显隐从子列表自己收口。 */
    api.vAnchorItem = (setup) => {
      partsOf().children.child(normalizeAnchorItem(setup));
      return syncItem();
    };

    /** 子项列表：数组 / 单值 = 替换。 */
    api.nestedItems = (setup) => {
      replaceChildren(partsOf().children, []);
      (Array.isArray(setup) ? setup : [setup]).forEach((item) =>
        partsOf().children.child(normalizeAnchorItem(item))
      );
      return syncItem();
    };

    api.active = (value = true) => {
      state.active = Boolean(value);
      partsOf();
      self.node().attr('data-active', state.active ? 'true' : null);
      self.node().attr('aria-current', state.active ? 'true' : null);
      return api;
    };

    /** props：`title / text / label / content / href / nested / items / children / active` + 其余元素配置。 */
    api.setupObject = (config) => {
      const {
        active: isActive,
        children,
        content,
        href: linkHref,
        items,
        label,
        nested,
        text,
        title: label2,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        // 其余键落**视图根元素**：`self.node()` 是组件节点，它的 `setup()` 会再进一次本方法（自递归）
        view.setup(elementConfig);
      }

      if (label2 !== undefined) {
        api.title(label2);
      } else if (label !== undefined) {
        api.label(label);
      } else if (text !== undefined) {
        api.text(text);
      } else if (content !== undefined) {
        api.text(content);
      }

      if (linkHref !== undefined) {
        api.href(linkHref);
      }

      const nestedSetup = nested ?? items ?? children;

      if (nestedSetup !== undefined) {
        api.nestedItems(nestedSetup);
      }

      if (isActive !== undefined) {
        api.active(isActive);
      }

      return api;
    };

    /** 字符串 / 数字 = 标题。 */
    api.setupString = (value) => api.title(value);

    const view = li({ vn: 'VAnchorItem' });

    return view;
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
 * 锚点导航：`nav > ul[VAnchorList]`；滚动跟当前项、点击滚动到目标并高亮。
 * 对象 = props，字符串 / 数字 = 一条锚点项，函数 = 构建回调（默认落组件节点构建帧）。
 *
 * 项只认自己造的（`items` / `vAnchorItem` / `child` 里进来的项节点）；匿名塞进列表的其它内容
 * 照旧渲染，但不参与子项数与当前态对账——一张导航里只走一条投递通道。
 */
export function VAnchor() {
  return vNode((api, self) => {
    const state = { activeHref: null, offset: DEFAULT_OFFSET, target: null };

    /** 项账：导航自己造的项节点（`items` 替换 / `vAnchorItem` 追加都记在这里）。 */
    let items = [];

    const syncActive = () => {
      const current = state.activeHref;
      items.forEach((item) => item.active(item.href() === current));
      return api;
    };

    const syncItems = () => {
      self.node().attr('data-item-count', String(items.length));
      self.node().attr('data-active-href', state.activeHref || null);
      return syncActive();
    };

    const resolveTargetElement = (value) => {
      if (typeof Element !== 'undefined' && value instanceof Element) {
        return value;
      }

      if (typeof value === 'string' && typeof document !== 'undefined') {
        return document.querySelector(value);
      }

      return value || null;
    };

    const resolveScrollContainer = () => {
      if (!state.target) {
        return typeof window === 'undefined' ? null : window;
      }

      return resolveTargetElement(state.target) || (typeof window === 'undefined' ? null : window);
    };

    const resolveAnchorTarget = (value) => {
      const id = String(value).replace(/^#/, '');

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
      const gap = state.offset || 0;

      if (!container || container === window) {
        const scrollTop =
          typeof window !== 'undefined'
            ? window.scrollY || document.documentElement?.scrollTop || 0
            : 0;
        return scrollTop + targetElement.getBoundingClientRect().top - gap;
      }

      const containerRect = container.getBoundingClientRect();
      return (
        container.scrollTop + targetElement.getBoundingClientRect().top - containerRect.top - gap
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

    const scrollToTarget = (value) => {
      const targetElement = resolveAnchorTarget(value);

      if (targetElement) {
        scrollElementIntoView(targetElement);
      }

      if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
        history.replaceState(null, '', value);
      }

      api.active(value);
    };

    /** 滚动位置 → 当前项：目标过了阈值（偏移量）就算到它。 */
    const syncActiveFromScroll = () => {
      const container = resolveScrollContainer();
      const containerRect =
        container && container !== window && typeof container.getBoundingClientRect === 'function'
          ? container.getBoundingClientRect()
          : null;
      const threshold = state.offset || 0;
      let next = null;
      let found = false;

      items.forEach((item) => {
        const href = item.href();

        if (!href) {
          return;
        }

        const targetElement = resolveAnchorTarget(href);

        if (!targetElement) {
          return;
        }

        found = true;
        const rect = targetElement.getBoundingClientRect();
        const top = containerRect ? rect.top - containerRect.top : rect.top;

        if (top - threshold <= 0) {
          next = href;
        }
      });

      if (found && next !== state.activeHref) {
        api.active(next);
      }
    };

    const handleClick = (event) => {
      const link = event.target.closest?.('[vn~="VAnchorLink"]');

      if (!link || !event.currentTarget?.contains(link)) {
        return;
      }

      const value = link.getAttribute('href');

      if (!value || !value.startsWith('#')) {
        return;
      }

      event.preventDefault();
      scrollToTarget(value);
    };

    api.ariaLabel = (content) => {
      self.node().attr('aria-label', resolveTextValue(content) || DEFAULT_LABEL);
      return api;
    };

    api.offset = (value) => {
      if (value === undefined) {
        return state.offset;
      }

      state.offset = Math.max(0, Number(resolveTextValue(value)) || 0);
      self.node().attr('data-offset', String(state.offset));
      return api;
    };

    api.target = (value) => {
      if (value === undefined) {
        return state.target;
      }

      state.target = value || null;
      return api;
    };

    api.active = (value) => {
      if (value === undefined) {
        return state.activeHref;
      }

      state.activeHref = value || null;
      self.node().attr('data-active-href', state.activeHref || null);
      return syncActive();
    };

    api.activeHref = (value) => api.active(value);

    /** 项投递：造一份项并交给匿名占位（列表）；账记在自己身上，替换时先收掉旧账。 */
    api.vAnchorItem = (setup) => {
      const item = vAnchorItem(setup);
      items = [...items, item];
      self.node().child(item);
      return syncItems();
    };

    api.items = (value) => {
      if (value === undefined) {
        return items.slice();
      }

      items.forEach((item) => item.destroy());
      items = [];
      (Array.isArray(value) ? value : [value]).forEach((item) => api.vAnchorItem(item));
      return syncItems();
    };

    /** props：`ariaLabel / offset / target / items / children / activeHref / active` + 其余元素配置。 */
    api.setupObject = (config) => {
      const {
        active,
        activeHref: initialActive,
        ariaLabel,
        children,
        items: itemSetup,
        offset: initialOffset,
        target: initialTarget,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        // 其余键落**视图根元素**：`self.node()` 是组件节点，它的 `setup()` 会再进一次本方法（自递归）
        view.setup(elementConfig);
      }

      if (ariaLabel !== undefined) {
        api.ariaLabel(ariaLabel);
      }

      if (initialOffset !== undefined) {
        api.offset(initialOffset);
      }

      if (initialTarget !== undefined) {
        api.target(initialTarget);
      }

      const itemsSetup = itemSetup ?? children;

      if (itemsSetup !== undefined) {
        api.items(itemsSetup);
      }

      const initial = initialActive ?? active;

      if (initial !== undefined) {
        api.active(initial);
      }

      return api;
    };

    /** 字符串 / 数字 = 一条锚点项（只有标题，没有地址）。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
    };

    /** 落地才绑全局滚动（`whenMount` 按落地收口触发，绑定后先跟一次当前位置）；destroy 自动卸。 */
    api.whenMount = () => {
      self.node().bindWindowEvent('scroll', syncActiveFromScroll, SCROLL_OPTIONS);
      self.node().bindDocumentEvent('scroll', syncActiveFromScroll, SCROLL_OPTIONS);
      syncActiveFromScroll();
    };

    const view = nav(
      { 'aria-label': DEFAULT_LABEL, 'data-offset': String(DEFAULT_OFFSET), vn: 'VAnchor' },
      (element) => {
        element.on('click', handleClick);
        element.child(AnchorList());
      }
    );

    return view;
  });
}

export const vAnchor = createComponentShortcut(VAnchor);

/** 子项归一：已经是本模块造的项就原样用，其余按项的标准分派建一份。 */
function normalizeAnchorItem(item) {
  return item?.[ANCHOR_ITEM] ? item : vAnchorItem(item);
}

function cssEscape(value) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;
}
