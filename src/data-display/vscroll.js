import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { vText } from '../core/index.js';
import { div, span } from '../html/index.js';
import {
  createComponentShortcut,
  setupContentSlot,
  resolveTextValue
} from '../components/shared.js';

const VIRTUAL_GAP = 8;
const VIRTUAL_PADDING = 12;
const AUTO_VIRTUAL_THRESHOLD = 100;

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

/** 列表归一：数组原样、空值成空表、其余单值成一项。 */
const asList = (value) =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value.slice() : [value];

/**
 * 滚动容器（形态 B，票 15 §4；2026-09-23 按「组件写法」口径重写 + R5）。
 *
 * - 结构一次写清：`div[VScroll] > div[VScrollList] + div[VScrollFooter](> span[VScrollStatus])`；
 * - **项走一份 `ref([])` + `keyed` 对账**：非虚拟模式渲染全部项、虚拟模式渲染当前窗口，
 *   两种情况都只把"这一轮该有的行"写成数据——滚动 / 追加时引擎按行键（`模式:下标`）复用、
 *   增删、搬动，不再 `replaceChildren` 整段重建（旧 `renderItems()` 的整段重建退场）；
 *   静态内容通道（`content(setup)`）仍是内容通道，两条通道互斥（切回行数据时清一次列表）；
 * - **状态 → 视图全是读值绑定**：根上的 `data-*` / `aria-busy`、列表的虚拟高度、页脚状态文本
 *   都从状态派生——`syncFooter()` 集中快照退场；`syncVirtualState()` 只剩"订阅 / 解绑尺寸观察者"
 *   这件副作用（改名 `applySizeObserver`）；
 * - **静态样式全在 `yoya.ui.css`**（R5）：根 / 列表 / 虚拟行 / 页脚本来就有规则，这刀把 JS 里
 *   重复的行内样式删掉；虚拟行的几何（高度 / 位置）走 `--yoya-scroll-item-height` +
 *   每行的 `--yoya-scroll-index`（CSS 用 `calc()` 算，JS 只写变量）；
 * - 元素级时机：`whenMount` 按落地收口（按真实尺寸重算窗口 + 订阅尺寸变化 + 补一次触底检查）、
 *   `whenDestroy` 解绑观察者；读元素只读 `_el` 判定"建没建"；props 进参数表（`api.setupObject` 退场）。
 */
export function VScroll({
  block,
  blocked,
  children,
  content,
  endText = '没有更多了',
  itemHeight = 48,
  items,
  loadMore,
  onLoadMore,
  loading = false,
  loadingText = '加载中…',
  loop = false,
  overscan = 5,
  page = 0,
  renderItem,
  reset = false,
  threshold = 80,
  virtual = null,
  ...rest
} = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;

  // 状态：句柄原样收下（props 给句柄就是活值），归一全部放在读时的派生上
  const itemsState = ref(asList(items));
  const itemHeightState = asSignal(itemHeight);
  const overscanState = asSignal(overscan);
  const thresholdState = asSignal(threshold);
  const pageState = asSignal(page);
  const virtualState = asSignal(virtual ?? null);
  const loadingState = asSignal(loading);
  const blockedState = asSignal(blocked ?? block ?? false);
  const loopState = asSignal(loop);
  const loadingTextState = asSignal(loadingText);
  const endTextState = asSignal(endText);

  /** 使用方回调与"静态内容"标记：都是命令的落点，不进视图绑定。 */
  let renderHandler = typeof renderItem === 'function' ? renderItem : null;
  let loadMoreHandler =
    typeof loadMore === 'function'
      ? loadMore
      : typeof onLoadMore === 'function'
        ? onLoadMore
        : null;
  let staticContent = false;
  let sizeObserver = null;

  const itemHeightValue = computed(() => {
    const parsed = Number(itemHeightState.value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, parsed) : 48;
  });
  const itemHeightText = computed(() => `${itemHeightValue.value}px`);
  const overscanValue = computed(() => {
    const parsed = Number(overscanState.value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 5;
  });
  const thresholdValue = computed(() => {
    const parsed = Number(thresholdState.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 80;
  });
  const pageValue = computed(() => {
    const parsed = Number(pageState.value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  });
  const countValue = computed(() => itemsState.value.length);
  const countText = computed(() => String(countValue.value));

  const virtualMode = computed(
    () =>
      virtualState.value === true ||
      (virtualState.value === null && countValue.value >= AUTO_VIRTUAL_THRESHOLD)
  );
  const virtualActive = computed(() => virtualMode.value && countValue.value > 0);
  /** 虚拟模式下列表要撑起真实滚动高度（非虚拟交给内容撑）。 */
  const listHeightText = computed(() => {
    if (!virtualActive.value) {
      return null;
    }

    const count = countValue.value;
    const virtualHeight =
      count === 0
        ? 0
        : VIRTUAL_PADDING * 2 + count * itemHeightValue.value + (count - 1) * VIRTUAL_GAP;
    return `${virtualHeight}px`;
  });

  /** 页脚状态文本：加载中优先，其次"没有更多了"。 */
  const statusText = computed(() => {
    if (loadingState.value) {
      return textOf(loadingTextState.value);
    }

    return blockedState.value ? textOf(endTextState.value) : '';
  });
  const hasStatus = computed(() => statusText.value !== '');

  /** 行数据：非虚拟 = 全部项，虚拟 = 当前窗口（滚动时重算，只写这一份数据）。 */
  const rows = ref([]);

  const node = vNode((api, self) => {
    const renderEntry = (item, index) =>
      renderHandler ? renderHandler(item, index, self.node()) : item;

    const visibleRange = (count) => {
      const pitch = itemHeightValue.value + VIRTUAL_GAP;
      const scrollTop = view._el ? Number(view._el.scrollTop) || 0 : 0;
      const clientHeight = view._el ? Number(view._el.clientHeight) || 0 : 0;
      const start = Math.max(
        0,
        Math.floor((scrollTop - VIRTUAL_PADDING) / pitch) - overscanValue.value
      );
      const end = Math.min(
        count,
        Math.max(
          0,
          Math.ceil((scrollTop + clientHeight - VIRTUAL_PADDING) / pitch) + overscanValue.value
        )
      );

      return { end, start };
    };

    /** 行键：`模式:下标`——模式切换（虚拟 ↔ 非虚拟）与项增删都会走各自的对账。 */
    const keyOfRow = (row) => `${row.mode}:${row.index}`;

    /** 行产物：虚拟行多一层 `VScrollVirtualItem`（位置 / 尺寸归 CSS 变量）。 */
    const buildRow = (row) => {
      const entry = renderEntry(row.item, row.index);

      if (row.mode !== 'window') {
        return entry;
      }

      return div(
        {
          attrs: {
            'aria-posinset': String(row.index + 1),
            'aria-setsize': countText,
            'data-index': String(row.index)
          },
          style: { '--yoya-scroll-index': String(row.index) },
          vn: 'VScrollVirtualItem'
        },
        (box) => box.child(entry)
      );
    };

    /** 尺寸观察者：只在"虚拟且已落地"时订阅（副作用，不是快照）。 */
    const applySizeObserver = () => {
      const wanted = virtualActive.value && typeof ResizeObserver === 'function';

      if (!wanted) {
        if (sizeObserver) {
          sizeObserver.disconnect();
          sizeObserver = null;
        }
        return;
      }

      if (!sizeObserver && view._el) {
        sizeObserver = new ResizeObserver(() => {
          if (view._deleted || !virtualActive.value) {
            return;
          }
          renderItems();
        });
        sizeObserver.observe(view._el);
      }
    };

    /** 把"这一轮该有的行"写成数据（结构交给 `keyed`，这里不碰 DOM）。 */
    const renderItems = () => {
      applySizeObserver();

      // 从静态内容切回行数据：清一次列表（静态子节点与行是两条互斥通道）
      if (staticContent) {
        list.clearChildren();
        staticContent = false;
      }

      const count = itemsState.value.length;

      if (!virtualActive.value) {
        rows.value = itemsState.value.map((item, index) => ({
          index,
          item,
          mode: 'row',
          render: renderHandler
        }));
        return;
      }

      const { end, start } = visibleRange(count);
      const next = [];

      for (let index = start; index < end; index += 1) {
        next.push({ index, item: itemsState.value[index], mode: 'window', render: renderHandler });
      }

      rows.value = next;

      // 命令自收口（「构建 → 落地」窗口里写进来的数据要手动刷一次）：行的对账登记在列表上、
      // 首评发生在构建期，落地前写完必须求值一次——SSR（没有落地）才拿得到确定性的初始窗口。
      if (!view._el) {
        list.flush();
      }
    };

    const checkLoad = () => {
      if (loadingState.value || blockedState.value || !view._el) {
        return api;
      }

      const distance =
        (view._el.scrollHeight || 0) - (view._el.scrollTop || 0) - (view._el.clientHeight || 0);

      if (distance <= thresholdValue.value) {
        api.load();
      }

      return api;
    };

    let checkScheduled = false;

    const scheduleCheck = () => {
      if (checkScheduled || view._deleted || typeof queueMicrotask !== 'function') {
        return api;
      }

      checkScheduled = true;
      queueMicrotask(() => {
        checkScheduled = false;
        checkLoad();
      });
      return api;
    };

    const load = () => {
      if (
        view._deleted ||
        loadingState.value ||
        blockedState.value ||
        typeof loadMoreHandler !== 'function'
      ) {
        return Promise.resolve(false);
      }

      api.page(pageValue.value + 1);
      api.loading(true);

      const context = {
        append: (value, render) => api.append(value, render),
        block: (value = true) => api.block(value),
        done: () => api.block(true),
        page: pageValue.value,
        scroll: self.node()
      };

      let result;

      try {
        result = loadMoreHandler(context);
      } catch (error) {
        api.loading(false);
        return Promise.reject(error);
      }

      if (result && typeof result.then === 'function') {
        return Promise.resolve(result).then(
          (value) => {
            if (value !== undefined && value !== null) {
              api.append(value);
            }
            api.loading(false);
            return true;
          },
          (error) => {
            api.loading(false);
            throw error;
          }
        );
      }

      if (result !== undefined && result !== null) {
        api.append(result);
      }
      api.loading(false);
      return Promise.resolve(true);
    };

    const handleScroll = () => {
      if (virtualActive.value) {
        renderItems();
      }

      checkLoad();
    };

    /** 读写列表内容（静态内容口径；`items` 走数据口径）。 */
    api.content = (setup) => {
      if (setup === undefined) {
        return list.children();
      }

      itemsState.value = [];
      renderHandler = null;
      rows.value = [];
      setupContentSlot(list, setup);
      staticContent = true;
      applySizeObserver();
      scheduleCheck();
      return api;
    };

    api.items = (value, render = null) => {
      if (value === undefined) {
        return itemsState.value.slice();
      }

      if (typeof render === 'function') {
        renderHandler = render;
      }

      itemsState.value = asList(value);
      renderItems();
      scheduleCheck();
      return api;
    };

    api.append = (value, render = null) => {
      const incoming = asList(value);

      if (typeof render === 'function') {
        renderHandler = render;
      }

      itemsState.value = [...itemsState.value, ...incoming];
      renderItems();

      if (incoming.length > 0) {
        scheduleCheck();
      }

      return api;
    };

    api.renderItem = (handler) => {
      if (handler === undefined) {
        return renderHandler;
      }

      renderHandler = typeof handler === 'function' ? handler : null;

      if (itemsState.value.length > 0) {
        renderItems();
      }

      return api;
    };

    api.loadMore = (handler) => {
      if (handler === undefined) {
        return loadMoreHandler;
      }

      loadMoreHandler = typeof handler === 'function' ? handler : null;

      if (loadMoreHandler) {
        scheduleCheck();
      }

      return api;
    };

    api.onLoadMore = (handler) => api.loadMore(handler);

    api.loop = (value) => {
      if (value === undefined) {
        return Boolean(loopState.value);
      }

      loopState.value = Boolean(value);

      if (loopState.value) {
        blockedState.value = false;
      }

      return api;
    };

    api.block = (value) => {
      if (value === undefined) {
        return Boolean(blockedState.value);
      }

      blockedState.value = Boolean(value);

      if (blockedState.value) {
        loopState.value = false;
      }

      return api;
    };

    api.blocked = (value) => api.block(value);

    api.loading = (value) => {
      if (value === undefined) {
        return Boolean(loadingState.value);
      }

      loadingState.value = Boolean(value);
      return api;
    };

    api.threshold = (value) => {
      if (value === undefined) {
        return thresholdValue.value;
      }

      thresholdState.value = value;
      return api;
    };

    api.virtual = (value) => {
      if (value === undefined) {
        return virtualMode.value;
      }

      virtualState.value = Boolean(value);
      renderItems();
      return api;
    };

    api.virtualize = (value) => api.virtual(value);

    api.itemHeight = (value) => {
      if (value === undefined) {
        return itemHeightValue.value;
      }

      itemHeightState.value = value;
      // 虚拟行的几何走 CSS 变量：改高度只要让窗口重算一次（行本身不重建）
      renderItems();
      return api;
    };

    api.overscan = (value) => {
      if (value === undefined) {
        return overscanValue.value;
      }

      overscanState.value = value;
      renderItems();
      return api;
    };

    api.page = (value) => {
      if (value === undefined) {
        return pageValue.value;
      }

      pageState.value = value;
      return api;
    };

    api.loadingText = (content) => {
      if (content === undefined) {
        return loadingTextState.value;
      }

      loadingTextState.value = content;
      return api;
    };

    api.endText = (content) => {
      if (content === undefined) {
        return endTextState.value;
      }

      endTextState.value = content;
      return api;
    };

    api.reset = () => {
      itemsState.value = [];
      pageState.value = 0;
      blockedState.value = false;
      loadingState.value = false;
      rows.value = [];

      if (staticContent) {
        list.clearChildren();
        staticContent = false;
      }

      applySizeObserver();
      return api;
    };

    api.clear = () => api.reset();
    api.load = () => load();
    api.check = () => checkLoad();

    /** 字符串 / 节点 / 数组 = 列表内容（旧 `_setupScroll` 的兜底分支）。 */
    api.setupString = (next) => api.content(next);

    const list = div(
      {
        style: { height: listHeightText },
        vn: 'VScrollList'
      },
      (box) =>
        box.keyed(rows, keyOfRow, buildRow, {
          equals: (prev, next) => prev.item === next.item && prev.render === next.render
        })
    );
    const statusBox = span({ vn: 'VScrollStatus' }, (box) =>
      box.child(vText(statusText).mountable(hasStatus))
    );
    const footer = div({ vn: 'VScrollFooter' }, (box) => box.child(statusBox));

    const view = div(
      {
        ...elementConfig,
        attrs: {
          ...restAttrs,
          'aria-busy': computed(() => (loadingState.value ? 'true' : 'false')),
          'aria-live': 'polite',
          role: 'feed'
        },
        'data-blocked': computed(() => (blockedState.value ? 'true' : null)),
        'data-item-height': computed(() => String(itemHeightValue.value)),
        'data-loading': computed(() => (loadingState.value ? 'true' : null)),
        'data-loop': computed(() => (loopState.value ? 'true' : null)),
        'data-overscan': computed(() => String(overscanValue.value)),
        'data-page': computed(() => String(pageValue.value)),
        'data-threshold': computed(() => String(thresholdValue.value)),
        'data-virtual': computed(() => (virtualActive.value ? 'true' : null)),
        style: { ...restStyle, '--yoya-scroll-item-height': itemHeightText },
        vn: 'VScroll'
      },
      (root) => {
        root.on('scroll', handleScroll);
        root.child(list, footer);
      }
    );

    /** 落地后按真实尺寸重算窗口、订阅尺寸变化、补一次触底检查。 */
    api.whenMount = () => {
      if (virtualActive.value) {
        renderItems();
      }

      applySizeObserver();
      scheduleCheck();
    };

    /** 解绑尺寸观察者。 */
    api.whenDestroy = () => {
      applySizeObserver();

      if (!virtualActive.value && sizeObserver) {
        sizeObserver.disconnect();
        sizeObserver = null;
      }
    };

    return view;
  });

  /**
   * 数据 props 在**节点建好之后**才落位：`renderItem(item, index, scroll)` 的第三参是组件句柄，
   * 而 `self.node()` 在 setup 期间直接报错（引擎口径：节点要等 setup 返回后才建）——于是
   * `items` / `content` / `children` / `reset` 走「建好还没落地就用命令配置」这条窗口
   * （AGENTS「构建 → 落地」）。配置类 props（`itemHeight` / `virtual` / `threshold` …）仍按参数表
   * 在构建期一次到位。顺序与旧 `_setupScroll` 同：内容通道优先、`items` 覆盖它、`reset` 最后。
   */
  const initialContent = content ?? children;

  if (initialContent !== undefined) {
    node.content(initialContent);
  }

  if (items !== undefined) {
    node.items(items);
  }

  if (reset) {
    node.reset();
  }

  return node;
}

export const vScroll = createComponentShortcut(VScroll, { props: true });
