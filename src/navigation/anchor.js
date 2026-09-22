import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { a, li, nav, ul } from '../html/index.js';
import { createComponentShortcut, resolveTextValue } from '../components/shared.js';

/**
 * 锚点导航（票 15 §4：**结构 + 身份 + 命令**，组件里没有元素节点类）。
 *
 * - 结构：`nav[VAnchor] > ul[VAnchorList] > li[VAnchorItem] > a[VAnchorLink] + ul[VAnchorChildren]`；
 * - **状态放 `ref`，值位置直接传句柄**：标题 / 地址 / 当前态 / 子列表显隐都是绑定，
 *   命令只改状态，不找节点、不碰 `_el` / `_children`；
 * - **匿名占位**：导航的匿名占位是列表（子项落进 `<ul>`），项的匿名占位是子列表
 *   （`nested` / `item.vAnchorItem` 的子项落进子 `<ul>`）——两处都靠槽位落位，没有按身份查找；
 * - 项由**造它的一方持有**（导航自己建的项自己记账）：子项数 / 当前态从这份账里收口；
 * - 全局滚动在 `whenMount` 里按落地收口绑（`bindWindowEvent` / `bindDocumentEvent`，destroy 自动卸），
 *   点击走元素自己的 `on('click')` 委托。
 */

const SCROLL_OPTIONS = { capture: true, passive: true };
const DEFAULT_LABEL = '页面锚点';
const DEFAULT_OFFSET = 80;

/** 列表（形态 A）：身份 + 匿名占位——匿名内容（子项）落进这张 `<ul>`。 */
function AnchorList() {
  return ul({ vn: 'VAnchorList', vn_slot: '' });
}

/** 链接（形态 A）：地址与文本都是活值，由项的状态直接驱动。 */
function AnchorLink(href, title) {
  return a({ href, vn: 'VAnchorLink' }, (link) => {
    link.child(title);
  });
}

/** 子列表（形态 A）：身份 + 匿名占位（`nested` 的子项落这里），没有子项时隐藏。 */
function AnchorChildren(visible) {
  return ul({
    style: { display: () => (visible() ? null : 'none') },
    vn: 'VAnchorChildren',
    vn_slot: ''
  });
}

/**
 * 锚点项：结构（`li > a + ul`）+ 命令（标题 / 地址 / 子项 / 当前态）。
 * 字符串 = 标题；对象 = props；子项走 `nested` / `vAnchorItem`（落进子列表）。
 */
export function VAnchorItem() {
  return vNode((api, self) => {
    const href = ref(null);
    const title = ref('');
    const active = ref(false);
    const nestedCount = ref(0);

    /** 子项账：只记本项造出来的（含嵌套里的），当前态与显隐都从这里收口。 */
    let nestedNodes = [];

    /**
     * 状态写入收口：**首屏之前**绑定只求值不订阅，这时写状态要把视图快照刷到一起；
     * 渲染之后订阅已接上，写入自己就到 DOM（与 `VTableWrapper.syncView` 同一口径）。
     */
    const sync = () => {
      const node = self.node();

      if (!node._el) {
        node.flush();
      }

      return api;
    };

    const syncNested = () => {
      nestedCount.value = nestedNodes.length;
      return sync();
    };

    api.title = (content) => {
      if (content === undefined) {
        return title.value;
      }

      title.value = content ?? '';
      return sync();
    };

    api.text = (content) => (content === undefined ? title.value : api.title(content));
    api.label = api.text;

    api.href = (value) => {
      if (value === undefined) {
        return href.value;
      }

      href.value = value === null || value === undefined ? null : String(resolveTextValue(value));
      return sync();
    };

    api.nested = (setup) => {
      if (setup === undefined) {
        return nestedNodes.slice();
      }

      return api.nestedItems(setup);
    };

    api.subItems = (setup) => (setup === undefined ? api.nested() : api.nested(setup));

    /** 子项投递：造一份子项并交给匿名占位（子列表），账记在自己身上。 */
    api.vAnchorItem = (setup) => {
      const item = vAnchorItem(setup);
      nestedNodes = [...nestedNodes, item];
      self.node().child(item);
      return syncNested();
    };

    /** 子项列表：数组 / 单值 = 替换；函数 = 构建回调（回调句柄上直接 `vAnchorItem`）。 */
    api.nestedItems = (setup) => {
      nestedNodes.forEach((item) => item.destroy());
      nestedNodes = [];

      if (typeof setup === 'function') {
        setup(api);
      } else {
        (Array.isArray(setup) ? setup : [setup]).forEach((item) => api.vAnchorItem(item));
      }

      return syncNested();
    };

    api.active = (value = true) => {
      active.value = Boolean(value);
      return sync();
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
        self.node().setup(elementConfig);
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

    return li({ vn: 'VAnchorItem' }, (item) => {
      item.attr({
        'aria-current': () => (active.value ? 'true' : null),
        'data-active': () => (active.value ? 'true' : null),
        'data-has-children': () => (nestedCount.value > 0 ? 'true' : null)
      });
      item.child(
        AnchorLink(href, title),
        AnchorChildren(() => nestedCount.value > 0)
      );
    });
  });
}

const anchorItemShortcut = createComponentShortcut(VAnchorItem);

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vAnchorItem(...args) {
  return anchorItemShortcut(...args);
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
    const activeHref = ref(null);
    const offset = ref(DEFAULT_OFFSET);
    const target = ref(null);

    /** 项账：导航自己造的项节点（`items` 替换 / `vAnchorItem` 追加都记在这里）。 */
    let items = [];

    const syncActive = () => {
      const current = activeHref.value;
      items.forEach((item) => item.active(item.href() === current));
      return api;
    };

    const syncItems = () => {
      self.node().attr('data-item-count', String(items.length));
      self.node().attr('data-active-href', activeHref.value || null);
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
      if (!target.value) {
        return typeof window === 'undefined' ? null : window;
      }

      return resolveTargetElement(target.value) || (typeof window === 'undefined' ? null : window);
    };

    const resolveAnchorTarget = (value) => {
      const id = String(value).replace(/^#/, '');

      if (!id || typeof document === 'undefined') {
        return null;
      }

      const scope = target.value ? resolveTargetElement(target.value) : document;

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
      const gap = offset.value || 0;

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
      const threshold = offset.value || 0;
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

      if (found && next !== activeHref.value) {
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
        return offset.value;
      }

      offset.value = Math.max(0, Number(resolveTextValue(value)) || 0);
      self.node().attr('data-offset', String(offset.value));
      return api;
    };

    api.target = (value) => {
      if (value === undefined) {
        return target.value;
      }

      target.value = value || null;
      return api;
    };

    api.active = (value) => {
      if (value === undefined) {
        return activeHref.value;
      }

      activeHref.value = value || null;
      self.node().attr('data-active-href', activeHref.value || null);
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
        self.node().setup(elementConfig);
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

function cssEscape(value) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;
}
