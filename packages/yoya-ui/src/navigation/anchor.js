import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { ViewNode, vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { a, li, nav, ul } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  createListItemKey,
  resolveTextValue
} from '../components/shared.js';

/**
 * 锚点导航（票 15 §4；2026-09-23 按「容器组件」口径重写，参考实现 `VTable`）。
 *
 * - **结构一次写清、部件常驻**：
 *   `nav[VAnchor] > ul[VAnchorList] > li[VAnchorItem] > a[VAnchorLink] + ul[VAnchorChildren]`；
 *   列表是导航的**匿名占位**（`vn_slot: ''`）——`anchor.child(item)` 落进这张 `<ul>`；
 * - **列表 = 一份 `ref([])` + `keyed` 对账**：项从 `items` / `vAnchorItem` 来，增删改排序由引擎按身份键
 *   复用 / 搬动 / 销毁——**不 rebuild、也不 `replaceChildren` 全量重建**；`data-item-count`、子列表显隐、
 *   滚动扫描都读这一份数据，没有第二本账；
 * - **容器态就是一个句柄**：`activeHref`（props / 命令 / 外部句柄）通过 `track` 交给每一项，项自己比对自己的
 *   `href`；嵌套项由项把**同一个句柄**再往下传（与 JSX 的 `current={current}` 同形）——没有"遍历推当前态"，
 *   也没有订阅；
 * - **命令只写状态 / 数据**，DOM 全走读值绑定（链接文本 / `href` / `data-active` / `aria-current` /
 *   `data-has-children` / `data-offset` / `data-item-count` / `data-active-href` / `vText` + `mountable`）；
 * - 文本是数据（节点标题在构建期走 props，`title()` 只收文本）；静态样式在 `yoya.ui.css`（R5），
 *   空子列表由 `[vn~='VAnchorChildren']:empty` 隐藏；
 * - 全局滚动在 `whenMount` 里按落地收口绑（destroy 自动卸），点击走元素自己的 `on('click')` 委托。
 */

const SCROLL_OPTIONS = { capture: true, passive: true };
const DEFAULT_LABEL = '页面锚点';
const DEFAULT_OFFSET = 80;

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const ANCHOR_ITEM = Symbol('yoya.anchorItem');

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

/** 列表归一：数组原样、空值成空表、其余单值成一项。 */
const asList = (value) =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * 锚点项（形态 B）：结构 = `li > a[VAnchorLink] + ul[VAnchorChildren]`，两块部件**常驻**。
 * 字符串 = 标题；props 见 `AnchorItemOptions`（`children` 是子项列表的兼容别名）；
 * 子项走 `nested` / `items` / `vAnchorItem`（落进子列表，结构由 `keyed` 对账）。
 */
export function VAnchorItem({
  active = false,
  children: nestedOptions,
  content,
  href = null,
  items: itemOptions,
  label,
  nested,
  text,
  title,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // 标题：节点在构建期落位；文本 / 句柄是活值（`title` / `label` / `text` / `content` 四键同义）
  const initialTitle = title ?? label ?? text ?? content ?? null;
  const titleNode = initialTitle instanceof ViewNode ? initialTitle : null;
  const titleState = asSignal(titleNode === null ? initialTitle : null);
  const titleText = computed(() => textOf(titleState.value));
  const hasTitle = computed(() => titleText.value !== '');

  // 地址：句柄原样存、`String(…)` 放读时；`null` / 空串 = 没有地址（写绑定就此摘掉属性）
  const hrefState = asSignal(href);
  const hrefAttr = computed(() => {
    const value = hrefState.value;
    return value === null || value === undefined || value === '' ? null : textOf(value);
  });

  // 当前态 = 自己的显式位 + 容器交给的「当前项句柄」（脱离容器时只有显式位）
  const activeState = asSignal(active);
  const located = ref(null);
  const ownActive = computed(() => {
    const locator = located.value;
    return Boolean(activeState.value) || (locator !== null && hrefAttr.value === locator.value);
  });
  const activeAttr = computed(() => (ownActive.value ? 'true' : null));

  // 子项：一份数据源（结构由 keyed 对账；`items()` 与子列表显隐都读它）
  const itemNodes = ref([]);
  const childrenAttr = computed(() => (itemNodes.value.length > 0 ? 'true' : null));
  const keyOfItem = createListItemKey('anchor-item');

  /** 建 / 复用一份子项，并把当前项句柄交给它（嵌套项再往下传，与 JSX 的 `current` 同形）。 */
  const wireItem = (setup) => {
    const node = normalizeAnchorItem(setup);
    node.track(located.value);
    return node;
  };

  return vNode((api) => {
    api.title = (next) => {
      if (next === undefined) {
        return titleState.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vAnchorItem.title(node)：标题命令只收文本，节点标题请在构建期用 props.title 给。'
        );
      }

      titleState.value = next ?? null;
      return api;
    };

    api.text = (next) => (next === undefined ? titleText.value : api.title(next));
    api.label = (next) => api.text(next);

    api.href = (next) => {
      if (next === undefined) {
        return hrefAttr.value;
      }

      hrefState.value = next ?? null;
      return api;
    };

    /** 当前态：`true` 写入（与迁移前同口径：无参 = 激活，不返回状态）。 */
    api.active = (next = true) => {
      activeState.value = Boolean(next);
      return api;
    };

    /**
     * 容器把「当前项句柄」交给项（16 号清单第 8 条：容器态走子项命令）——已经造好的子项跟着换源，
     * 之后新投递的子项在 `wireItem` 里拿到同一个句柄。
     */
    api.track = (source) => {
      located.value = source ?? null;
      itemNodes.value.forEach((node) => node.track?.(located.value));
      return api;
    };

    /** 追加一份子项：只写数据，结构交给 `keyed` 对账。 */
    api.vAnchorItem = (setup) => {
      itemNodes.value = [...itemNodes.value, wireItem(setup)];
      return api;
    };

    /** 子项整批替换：写一份新数组（留下来的项按身份键复用，离场的销毁）。 */
    api.items = (value) => {
      if (value === undefined) {
        return itemNodes.value.slice();
      }

      itemNodes.value = asList(value).map(wireItem);
      return api;
    };

    api.nestedItems = (value) => api.items(value);

    /**
     * 子列表：无参 = 读子项；函数 = 整批替换后声明（**回调句柄 = 项句柄**，`sub.vAnchorItem(…)` 照旧；
     * 元素级方法没有了——见 16 号清单第 5 条）；数组 / 单值 = 整批替换。
     */
    api.nested = (setup) => {
      if (setup === undefined) {
        return itemNodes.value.slice();
      }

      if (typeof setup === 'function') {
        itemNodes.value = [];
        setup(api);
        return api;
      }

      return api.items(setup);
    };

    api.subItems = (setup) => (setup === undefined ? api.nested() : api.nested(setup));

    /** 字符串 / 数字 = 标题（与迁移前 `_setupAnchorItem` 的兜底分支同口径）。 */
    api.setupString = (value) => api.title(value);

    // props 里的子项与命令共用同一条通道（函数 = 子列表构建回调）
    const initialNested = nested ?? itemOptions ?? nestedOptions;

    if (initialNested !== undefined) {
      api.nested(initialNested);
    }

    // 结构（R2）：一棵树写在 return 里；状态走读值绑定（R6），列表由 keyed 从数据对账
    return li(
      {
        ...elementConfig,
        attrs: { ...restAttrs, 'aria-current': activeAttr },
        'data-active': activeAttr,
        'data-has-children': childrenAttr,
        vn: 'VAnchorItem'
      },
      (item) =>
        item.child(
          // 链接位：文本与地址都是读值绑定，命令只写这两份数据
          a({ vn: 'VAnchorLink' }, (link) => {
            link.attr('href', hrefAttr);

            if (titleNode !== null) {
              link.child(titleNode);
            }

            link.child(vText(titleText).mountable(hasTitle));
          }),

          // 子列表位：空列表由自己的 `:empty` 规则隐藏，内容从 itemNodes 对账
          ul({ vn: 'VAnchorChildren' }, (children) =>
            children.keyed(itemNodes, keyOfItem, (node) => node)
          )
        )
    );
  });
}

const anchorItemShortcut = createComponentShortcut(VAnchorItem, { props: true });

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vAnchorItem(...args) {
  const node = anchorItemShortcut(...args);
  // 标在节点上而不是查组件名：本模块自己认自己的子项（含嵌套层）
  node[ANCHOR_ITEM] = true;
  return node;
}

/**
 * 锚点导航：`nav > ul[VAnchorList]`；滚动跟当前项、点击滚动到目标并高亮。
 * props 见 `AnchorOptions`（`children` 是锚点项列表的兼容别名），项只从 `items` / `vAnchorItem` 来——
 * 匿名 `child()` 的内容照旧渲染，但不计入项数与当前态（见 16 号清单第 7 条）。
 */
export function VAnchor({
  active,
  activeHref,
  ariaLabel,
  children: itemOptions,
  items,
  offset = DEFAULT_OFFSET,
  target: targetOption,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // props 全是**数据**：句柄原样收下，归一（数字 / 默认值 / 空）放在读时的派生上
  const ariaLabelState = asSignal(ariaLabel ?? DEFAULT_LABEL);
  const ariaLabelText = computed(() => textOf(ariaLabelState.value) || DEFAULT_LABEL);

  const offsetState = asSignal(offset);
  const offsetValue = computed(() => {
    const numeric = Number(offsetState.value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  });
  const offsetText = computed(() => String(offsetValue.value));

  const targetState = ref(targetOption ?? null);

  /** 容器态：当前项句柄（props / 命令 / 外部句柄都写它，项通过 `track` 拿到的是同一个句柄）。 */
  const current = asSignal(activeHref ?? active ?? null);
  const currentValue = computed(() => current.value || null);

  /** 项：一份数据源（结构由 keyed 对账；计数与滚动扫描都读它）。 */
  const itemNodes = ref([]);
  const itemCount = computed(() => String(itemNodes.value.length));
  const keyOfItem = createListItemKey('anchor-item');

  return vNode((api, self) => {
    /** 建 / 复用一份项，并把当前项句柄交给它（外部造好的项也走这条）。 */
    const wireItem = (setup) => {
      const node = normalizeAnchorItem(setup);
      node.track(current);
      return node;
    };

    api.ariaLabel = (content) => {
      if (content === undefined) {
        return ariaLabelText.value;
      }

      ariaLabelState.value = content ?? null;
      return api;
    };

    api.offset = (value) => {
      if (value === undefined) {
        return offsetValue.value;
      }

      offsetState.value = value;
      return api;
    };

    api.target = (value) => {
      if (value === undefined) {
        return targetState.value;
      }

      targetState.value = value || null;
      return api;
    };

    api.active = (value) => {
      if (value === undefined) {
        return currentValue.value;
      }

      current.value = value || null;
      return api;
    };

    api.activeHref = (value) => api.active(value);

    /** 追加一份项：只写数据，结构交给 `keyed` 对账。 */
    api.vAnchorItem = (setup) => {
      itemNodes.value = [...itemNodes.value, wireItem(setup)];
      return api;
    };

    /** 项整批替换：写一份新数组（留下来的项按身份键复用，离场的销毁）。 */
    api.items = (value) => {
      if (value === undefined) {
        return itemNodes.value.slice();
      }

      itemNodes.value = asList(value).map(wireItem);
      return api;
    };

    /** 字符串 / 数字 = 一条锚点项（只有标题，没有地址）。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
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
      if (!targetState.value) {
        return typeof window === 'undefined' ? null : window;
      }

      return (
        resolveTargetElement(targetState.value) || (typeof window === 'undefined' ? null : window)
      );
    };

    const resolveAnchorTarget = (value) => {
      const id = String(value).replace(/^#/, '');

      if (!id || typeof document === 'undefined') {
        return null;
      }

      const scope = targetState.value ? resolveTargetElement(targetState.value) : document;

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
      const gap = offsetValue.value;

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

    /** 滚动位置 → 当前项：目标过了阈值（偏移量）就算到它（只推状态，DOM 由绑定跟上）。 */
    const activeFromScroll = () => {
      const container = resolveScrollContainer();
      const containerRect =
        container && container !== window && typeof container.getBoundingClientRect === 'function'
          ? container.getBoundingClientRect()
          : null;
      const threshold = offsetValue.value;
      let next = null;
      let found = false;

      // 扫描自己的项（含嵌套层：项自己把句柄传下去，所以整棵树都按同一个当前值比对）
      const scan = (nodes) => {
        nodes.forEach((item) => {
          const href = item.href();
          const targetElement = href ? resolveAnchorTarget(href) : null;

          if (targetElement) {
            found = true;
            const rect = targetElement.getBoundingClientRect();
            const top = containerRect ? rect.top - containerRect.top : rect.top;

            if (top - threshold <= 0) {
              next = href;
            }
          }

          scan(item.items());
        });
      };

      scan(itemNodes.value);

      if (found && next !== currentValue.value) {
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

    /** 落地才绑全局滚动（`whenMount` 按落地收口触发，绑定后先跟一次当前位置）；destroy 自动卸。 */
    api.whenMount = () => {
      self.node().bindWindowEvent('scroll', activeFromScroll, SCROLL_OPTIONS);
      self.node().bindDocumentEvent('scroll', activeFromScroll, SCROLL_OPTIONS);
      activeFromScroll();
    };

    const initialItems = items ?? itemOptions;

    if (initialItems !== undefined) {
      api.items(initialItems);
    }

    return nav(
      {
        ...elementConfig,
        attrs: { ...restAttrs, 'aria-label': ariaLabelText },
        'data-active-href': currentValue,
        'data-item-count': itemCount,
        'data-offset': offsetText,
        vn: 'VAnchor'
      },
      (root) => {
        root.on('click', handleClick);
        root.child(
          // 列表位（常驻）：项从 itemNodes 对账（增删改排序不重建、不搬结构）
          ul({ vn: 'VAnchorList', vn_slot: '' }, (list) =>
            list.keyed(itemNodes, keyOfItem, (node) => node)
          )
        );
      }
    );
  });
}

export const vAnchor = createComponentShortcut(VAnchor, { props: true });

/** 子项归一：已经是本模块造的项就原样用，其余按项的标准分派建一份。 */
function normalizeAnchorItem(item) {
  return item?.[ANCHOR_ITEM] ? item : vAnchorItem(item);
}

function cssEscape(value) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;
}
