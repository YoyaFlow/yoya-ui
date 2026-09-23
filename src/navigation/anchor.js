import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { ViewNode, vText } from '../core/index.js';
import { a, li, nav, ul } from '../html/index.js';
import {
  createComponentShortcut,
  normalizeChildren,
  replaceChildren,
  resolveTextValue
} from '../components/shared.js';

/**
 * 锚点导航（票 15 §4；2026-09-23 按「容器组件」口径重写，参考实现 `VTable`）。
 *
 * - **结构一次写清、部件常驻**（不再"用到才建"）：
 *   `nav[VAnchor] > ul[VAnchorList] > li[VAnchorItem] > a[VAnchorLink] + ul[VAnchorChildren]`；
 *   列表是导航的**匿名占位**（`vn_slot: ''`）——`anchor.child(item)` 落进这张 `<ul>`；
 * - **命令只写状态 / 内容**：链接文本、`href`、`data-active`、`data-has-children`、`data-offset`、
 *   `data-item-count`、`data-active-href` 都是**读值绑定**（`ref` + 派生），命令改状态、DOM 自己跟上——
 *   没有 `syncXxx()` 集中快照，也不在命令里现建部件；
 * - **项由造它的一方持有**：导航记自己的项账、项记自己的子项账；容器态（当前项）沿账往下推
 *   （`VAnchor.active(…)` → `item.active(…)`），不遍历结构找节点；
 * - **文本是数据**：字符串 / 数字 / 句柄放值位置就是活文本，节点内容在构建期走 props
 *   （`title()` / `text()` 只收文本，与 `VCode` / `VBadge` 同口径）；
 * - **静态样式在 `yoya.ui.css`**（R5）；空子列表由 `[vn~='VAnchorChildren']:empty` 规则隐藏；
 * - 全局滚动在 `whenMount` 里按落地收口绑（`bindWindowEvent` / `bindDocumentEvent`，destroy 自动卸），
 *   点击走元素自己的 `on('click')` 委托。
 */

const SCROLL_OPTIONS = { capture: true, passive: true };
const DEFAULT_LABEL = '页面锚点';
const DEFAULT_OFFSET = 80;

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const ANCHOR_ITEM = Symbol('yoya.anchorItem');

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

/**
 * 锚点项（形态 B）：结构 = `li > a[VAnchorLink] + ul[VAnchorChildren]`，两块部件**常驻**。
 * 字符串 = 标题；props 见 `AnchorItemOptions`（`children` 是子项列表的兼容别名）；
 * 子项走 `nested` / `items` / `vAnchorItem`（落进子列表）。
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

  // 状态：激活位 + 子项账（**项自己造的项**——容器态沿这本账往下推）
  const activeState = asSignal(active);
  const ownActive = computed(() => Boolean(activeState.value));
  const activeAttr = computed(() => (ownActive.value ? 'true' : null));
  const childState = ref([]);
  const childrenAttr = computed(() => (childState.value.length > 0 ? 'true' : null));

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

    /** 字符串 / 数字 = 标题（与迁移前 `_setupAnchorItem` 的兜底分支同口径）。 */
    api.setupString = (value) => api.title(value);

    // 结构（R2）：一棵树写在 return 里；状态走读值绑定（R6），部件在回调里往下嵌
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
          // 链接位（常驻）：文本与地址都是读值绑定，命令只写这两份数据
          a({ vn: 'VAnchorLink' }, (link) => {
            link.attr('href', hrefAttr);

            if (titleNode !== null) {
              link.child(titleNode);
            }

            link.child(vText(titleText).mountable(hasTitle));
          }),

          // 子列表位（常驻）：项命令就地定义在**它自己的构建回调**里（回调参数就是这块部件）
          ul({ vn: 'VAnchorChildren' }, (childrenList) => {
            /** 追加一份子项：先落结构、再记进项账（当前态由容器沿账往下推）。 */
            const appendItem = (setup) => {
              const child = normalizeAnchorItem(setup);
              childrenList.child(child);
              childState.value = [...childState.value, child];
              return api;
            };

            const appendEach = (value) => {
              normalizeChildren(value).forEach((entry) => appendItem(entry));
              return api;
            };

            /** 整批替换：先收掉旧项的结构，再清空项账。 */
            const clearItems = () => {
              replaceChildren(childrenList, []);
              childState.value = [];
              return api;
            };

            // 命令就是那个助手本身：外面再包一层 `(setup) => appendItem(setup)` 只是纯转发
            api.vAnchorItem = appendItem;

            api.items = (value) => {
              if (value === undefined) {
                return childState.value.slice();
              }

              clearItems();
              return appendEach(value);
            };

            api.nestedItems = (value) => api.items(value);

            /**
             * 子列表：函数 = 整批替换后声明（**回调句柄 = 项句柄**，`sub.vAnchorItem(…)` 照旧；
             * 元素级方法没有了——见 16 号清单第 5 条），数组 / 单值 = 整批替换，
             * 无参 = 读子列表内容。
             */
            api.nested = (setup) => {
              if (setup === undefined) {
                return childrenList.children();
              }

              clearItems();

              if (typeof setup === 'function') {
                setup(api);
                return api;
              }

              return appendEach(setup);
            };

            api.subItems = (setup) => (setup === undefined ? api.nested() : api.nested(setup));

            // props 里的子项与命令共用同一条通道（函数 = 子列表构建回调）
            const initialNested = nested ?? itemOptions ?? nestedOptions;

            if (initialNested !== undefined) {
              api.nested(initialNested);
            }
          })
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
  const activeState = asSignal(activeHref ?? active ?? null);
  const activeValue = computed(() => activeState.value || null);

  /** 项账：导航自己造的项（`items` 替换 / `vAnchorItem` 追加都记在这里）。 */
  const itemState = ref([]);
  const itemCount = computed(() => String(itemState.value.length));

  return vNode((api, self) => {
    /**
     * 容器态往下推（16 号清单第 8 条）：容器把自己的当前项通过**子项命令**推给子项，
     * 走的是各层自己的项账（导航的项账 + 项的子项账）——不遍历结构找节点，也不是"写完再刷"。
     */
    const pushActive = (list, current) => {
      list.forEach((item) => {
        item.active(item.href() === current);
        pushActive(typeof item.items === 'function' ? item.items() : [], current);
      });
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
        return activeValue.value;
      }

      activeState.value = value || null;
      pushActive(itemState.value, activeValue.value);
      return api;
    };

    api.activeHref = (value) => api.active(value);

    /**
     * 容器态是**句柄** props 时（`vAnchor({ activeHref: 句柄 })`），写入不经过命令——
     * 订阅一次，让"当前项"照样推给各项（命令路径已经推过一次，重复推是幂等的）。
     * 退订走 `whenDestroy`，与 `VLink` 的订阅同一口径。
     */
    const stopTrackingActive = activeState.subscribe(() => {
      pushActive(itemState.value, activeValue.value);
    });

    api.whenDestroy = () => {
      stopTrackingActive();
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

      itemState.value.forEach((item) => {
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

      if (found && next !== activeValue.value) {
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

    return nav(
      {
        ...elementConfig,
        attrs: { ...restAttrs, 'aria-label': ariaLabelText },
        'data-active-href': activeValue,
        'data-item-count': itemCount,
        'data-offset': offsetText,
        vn: 'VAnchor'
      },
      (root) => {
        root.on('click', handleClick);
        root.child(
          // 列表位（常驻）：导航的项命令就地定义在它自己的构建回调里
          ul({ vn: 'VAnchorList', vn_slot: '' }, (list) => {
            api.vAnchorItem = (setup) => {
              const item = normalizeAnchorItem(setup);
              list.child(item);
              itemState.value = [...itemState.value, item];
              pushActive([item], activeValue.value);
              return api;
            };

            api.items = (value) => {
              if (value === undefined) {
                return itemState.value.slice();
              }

              itemState.value.forEach((item) => item.destroy());
              itemState.value = [];
              normalizeChildren(value).forEach((entry) => api.vAnchorItem(entry));
              return api;
            };

            const initialItems = items ?? itemOptions;

            if (initialItems !== undefined) {
              api.items(initialItems);
            }
          })
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
