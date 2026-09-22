import { vNode } from '../core/v-node.js';
import { div, span } from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  setupContentSlot
} from '../components/shared.js';

const VIRTUAL_GAP = 8;
const VIRTUAL_PADDING = 12;
const AUTO_VIRTUAL_THRESHOLD = 100;

/**
 * 滚动容器（形态 B，票 15 §4）：视图根是滚动容器 `div` + 列表 + 加载 / 结束页脚。
 *
 * - 身份写在结构里：根 `vn: 'VScroll'`、列表 `VScrollList`、页脚 `VScrollFooter`
 *   （状态位 `VScrollStatus`）、虚拟行 `VScrollVirtualItem`；
 * - 状态与命令收进 `vNode` 闭包；`renderItem(item, index, scroll)` 的第三参交给使用方的是
 *   **组件句柄**（`self.node()`，与其它组件的回调口径一致）、`loadMore` 上下文里的 `scroll` 同此；
 * - 元素级时机：旧 `renderDom()` / `destroy()` 猴补换 `whenMount` / `whenDestroy`
 *   （首屏按真实尺寸重算窗口 + 订阅尺寸变化 / 解绑观察者）；读元素只读 `_el` 判定"建没建"；
 * - 虚拟窗口不靠临时换视图树：`renderItems()` 每次都把"当前窗口"刷进列表（首屏 = 确定性初始窗口），
 *   `toHTML()` 直接序列化即可（服务端没有 `_el`，窗口与视口无关）；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupScroll` 同口径）。
 */
export function VScroll() {
  return vNode((api, self) => {
    const state = {
      blocked: false,
      checkScheduled: false,
      endContent: '没有更多了',
      itemHeight: 48,
      itemsData: [],
      loadMoreHandler: null,
      loading: false,
      loadingContent: '加载中…',
      loop: false,
      overscan: 5,
      page: 0,
      renderItem: null,
      resizeObserver: null,
      threshold: 80,
      virtual: null
    };

    const list = div({ vn: 'VScrollList' });
    const statusBox = span({ vn: 'VScrollStatus' });
    const footer = div({ vn: 'VScrollFooter' }).child(statusBox);
    const node = div({ vn: 'VScroll' })
      .attr({
        'aria-busy': 'false',
        'aria-live': 'polite',
        'data-item-height': '48',
        'data-overscan': '5',
        'data-page': '0',
        'data-threshold': '80',
        role: 'feed'
      })
      .styles({
        boxSizing: 'border-box',
        minWidth: '0',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        position: 'relative'
      });

    node.child(list, footer);

    const isVirtualEnabled = () =>
      state.virtual === true ||
      (state.virtual === null && state.itemsData.length >= AUTO_VIRTUAL_THRESHOLD);

    const virtualListHeight = (count) => {
      if (count === 0) {
        return 0;
      }

      return VIRTUAL_PADDING * 2 + count * state.itemHeight + (count - 1) * VIRTUAL_GAP;
    };

    const visibleRange = (count) => {
      const pitch = state.itemHeight + VIRTUAL_GAP;
      const scrollTop = node._el ? Number(node._el.scrollTop) || 0 : 0;
      const clientHeight = node._el ? Number(node._el.clientHeight) || 0 : 0;
      const start = Math.max(0, Math.floor((scrollTop - VIRTUAL_PADDING) / pitch) - state.overscan);
      const end = Math.min(
        count,
        Math.max(
          0,
          Math.ceil((scrollTop + clientHeight - VIRTUAL_PADDING) / pitch) + state.overscan
        )
      );

      return { end, start };
    };

    const renderEntry = (item, index) =>
      state.renderItem ? state.renderItem(item, index, self.node()) : item;

    const createVirtualItem = (content, index, count) => {
      const pitch = state.itemHeight + VIRTUAL_GAP;
      const top = VIRTUAL_PADDING + index * pitch;

      return div({ vn: 'VScrollVirtualItem' })
        .attr({
          'aria-posinset': String(index + 1),
          'aria-setsize': String(count),
          'data-index': String(index)
        })
        .styles({
          boxSizing: 'border-box',
          height: `${state.itemHeight}px`,
          left: '0',
          minWidth: '0',
          overflow: 'visible',
          position: 'absolute',
          right: '0',
          top: `${top}px`,
          width: '100%'
        })
        .child(content);
    };

    const disconnectSizeObserver = () => {
      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }
    };

    const observeSize = () => {
      if (!node._el || typeof ResizeObserver !== 'function' || state.resizeObserver) {
        return;
      }

      state.resizeObserver = new ResizeObserver(() => {
        if (node._deleted || !isVirtualEnabled() || state.itemsData.length === 0) {
          return;
        }
        renderItems();
      });
      state.resizeObserver.observe(node._el);
    };

    const syncVirtualState = () => {
      const enabled = isVirtualEnabled() && state.itemsData.length > 0;

      node.attr('data-virtual', enabled ? 'true' : null);

      if (enabled) {
        list.styles({
          display: 'block',
          gap: '0',
          padding: '0',
          position: 'relative'
        });
        observeSize();
      } else {
        list.styles({
          display: null,
          gap: null,
          height: null,
          padding: null,
          position: null
        });
        disconnectSizeObserver();
      }
    };

    const renderItems = () => {
      syncVirtualState();

      const count = state.itemsData.length;

      if (!isVirtualEnabled() || count === 0) {
        replaceChildren(
          list,
          state.itemsData.map((item, index) => renderEntry(item, index))
        );
        return;
      }

      const { end, start } = visibleRange(count);
      const nodes = [];

      for (let index = start; index < end; index += 1) {
        nodes.push(createVirtualItem(renderEntry(state.itemsData[index], index), index, count));
      }

      replaceChildren(list, nodes);
      list.style('height', `${virtualListHeight(count)}px`);
    };

    const syncFooter = () => {
      if (state.loading) {
        replaceChildren(statusBox, normalizeChildren(state.loadingContent));
        footer.style('display', 'flex');
        return;
      }

      if (state.blocked) {
        replaceChildren(statusBox, normalizeChildren(state.endContent));
        footer.style('display', 'flex');
        return;
      }

      replaceChildren(statusBox, []);
      footer.style('display', 'none');
    };

    const checkLoad = () => {
      if (state.loading || state.blocked || !node._el) {
        return api;
      }

      const distance =
        (node._el.scrollHeight || 0) - (node._el.scrollTop || 0) - (node._el.clientHeight || 0);

      if (distance <= state.threshold) {
        api.load();
      }

      return api;
    };

    const scheduleCheck = () => {
      if (state.checkScheduled || node._deleted || typeof queueMicrotask !== 'function') {
        return api;
      }

      state.checkScheduled = true;
      queueMicrotask(() => {
        state.checkScheduled = false;
        checkLoad();
      });
      return api;
    };

    const load = () => {
      if (
        node._deleted ||
        state.loading ||
        state.blocked ||
        typeof state.loadMoreHandler !== 'function'
      ) {
        return Promise.resolve(false);
      }

      api.page(state.page + 1);
      api.loading(true);

      const context = {
        append: (value, render) => api.append(value, render),
        block: (value = true) => api.block(value),
        done: () => api.block(true),
        page: state.page,
        scroll: self.node()
      };

      let result;

      try {
        result = state.loadMoreHandler(context);
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
      if (isVirtualEnabled() && state.itemsData.length > 0) {
        renderItems();
      }
      checkLoad();
    };

    node.on('scroll', () => handleScroll());

    /** 读写列表内容（静态内容口径；`items` 走数据口径）。 */
    api.content = (setup) => {
      if (setup === undefined) {
        return list.children();
      }

      state.itemsData = [];
      state.renderItem = null;
      setupContentSlot(list, setup);
      syncVirtualState();
      scheduleCheck();
      return api;
    };

    api.items = (value, render = null) => {
      if (value === undefined) {
        return state.itemsData.slice();
      }

      if (typeof render === 'function') {
        state.renderItem = render;
      }

      state.itemsData = Array.isArray(value) ? value.slice() : [value];
      renderItems();
      scheduleCheck();
      return api;
    };

    api.append = (value, render = null) => {
      const incoming = Array.isArray(value) ? value : [value];

      if (typeof render === 'function') {
        state.renderItem = render;
      }

      state.itemsData = state.itemsData.concat(incoming);
      renderItems();
      if (incoming.length > 0) {
        scheduleCheck();
      }
      return api;
    };

    api.renderItem = (handler) => {
      if (handler === undefined) {
        return state.renderItem;
      }

      state.renderItem = typeof handler === 'function' ? handler : null;
      if (state.itemsData.length > 0) {
        renderItems();
      }
      return api;
    };

    api.loadMore = (handler) => {
      if (handler === undefined) {
        return state.loadMoreHandler;
      }

      state.loadMoreHandler = typeof handler === 'function' ? handler : null;
      if (state.loadMoreHandler) {
        scheduleCheck();
      }
      return api;
    };

    api.onLoadMore = (handler) => api.loadMore(handler);

    api.loop = (value) => {
      if (value === undefined) {
        return state.loop;
      }

      state.loop = Boolean(value);
      if (state.loop) {
        state.blocked = false;
      }
      node.attr('data-loop', state.loop ? 'true' : null);
      node.attr('data-blocked', state.blocked ? 'true' : null);
      syncFooter();
      return api;
    };

    api.block = (value) => {
      if (value === undefined) {
        return state.blocked;
      }

      state.blocked = Boolean(value);
      if (state.blocked) {
        state.loop = false;
      }
      node.attr('data-blocked', state.blocked ? 'true' : null);
      node.attr('data-loop', state.loop ? 'true' : null);
      syncFooter();
      return api;
    };

    api.blocked = (value) => api.block(value);

    api.loading = (value) => {
      if (value === undefined) {
        return state.loading;
      }

      state.loading = Boolean(value);
      node.attr('data-loading', state.loading ? 'true' : null);
      node.attr('aria-busy', state.loading ? 'true' : 'false');
      syncFooter();
      return api;
    };

    api.threshold = (value) => {
      if (value === undefined) {
        return state.threshold;
      }

      const parsed = Number(value);

      state.threshold = Number.isFinite(parsed) && parsed >= 0 ? parsed : 80;
      node.attr('data-threshold', String(state.threshold));
      return api;
    };

    api.virtual = (value) => {
      if (value === undefined) {
        return isVirtualEnabled();
      }

      state.virtual = Boolean(value);
      syncVirtualState();
      if (state.itemsData.length > 0) {
        renderItems();
      }
      return api;
    };

    api.virtualize = (value) => api.virtual(value);

    api.itemHeight = (value) => {
      if (value === undefined) {
        return state.itemHeight;
      }

      const parsed = Number(value);

      state.itemHeight = Number.isFinite(parsed) && parsed > 0 ? Math.max(1, parsed) : 48;
      node.attr('data-item-height', String(state.itemHeight));
      if (state.itemsData.length > 0) {
        renderItems();
      }
      return api;
    };

    api.overscan = (value) => {
      if (value === undefined) {
        return state.overscan;
      }

      const parsed = Number(value);

      state.overscan = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 5;
      node.attr('data-overscan', String(state.overscan));
      if (state.itemsData.length > 0) {
        renderItems();
      }
      return api;
    };

    api.page = (value) => {
      if (value === undefined) {
        return state.page;
      }

      const parsed = Number(value);

      state.page = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
      node.attr('data-page', String(state.page));
      return api;
    };

    api.loadingText = (content) => {
      if (content === undefined) {
        return state.loadingContent;
      }

      state.loadingContent = content;
      syncFooter();
      return api;
    };

    api.endText = (content) => {
      if (content === undefined) {
        return state.endContent;
      }

      state.endContent = content;
      syncFooter();
      return api;
    };

    api.reset = () => {
      state.itemsData = [];
      state.page = 0;
      state.blocked = false;
      state.loading = false;
      node.attr('data-blocked', null);
      node.attr('data-loading', null);
      node.attr('data-page', '0');
      node.attr('aria-busy', 'false');
      replaceChildren(list, []);
      syncVirtualState();
      syncFooter();
      return api;
    };

    api.clear = () => api.reset();

    api.load = () => load();

    api.check = () => checkLoad();

    /** 字符串 / 节点 / 数组 = 列表内容（旧 `_setupScroll` 的兜底分支）。 */
    api.setupString = (next) => api.content(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupScroll` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const {
        block,
        blocked,
        children,
        content,
        endText,
        itemHeight,
        items,
        loadMore,
        loading,
        loadingText,
        loop,
        onLoadMore,
        overscan,
        page,
        renderItem,
        reset,
        threshold,
        virtual,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (renderItem !== undefined) {
        api.renderItem(renderItem);
      }
      if (virtual !== undefined) {
        api.virtual(virtual);
      }
      if (itemHeight !== undefined) {
        api.itemHeight(itemHeight);
      }
      if (overscan !== undefined) {
        api.overscan(overscan);
      }
      if (content !== undefined) {
        api.content(content);
      } else if (children !== undefined) {
        api.content(children);
      }
      if (items !== undefined) {
        api.items(items);
      }
      if (loadMore !== undefined) {
        api.loadMore(loadMore);
      } else if (onLoadMore !== undefined) {
        api.loadMore(onLoadMore);
      }
      if (loop !== undefined) {
        api.loop(loop);
      }
      if (block !== undefined) {
        api.block(block);
      } else if (blocked !== undefined) {
        api.block(blocked);
      }
      if (loading !== undefined) {
        api.loading(loading);
      }
      if (threshold !== undefined) {
        api.threshold(threshold);
      }
      if (page !== undefined) {
        api.page(page);
      }
      if (loadingText !== undefined) {
        api.loadingText(loadingText);
      }
      if (endText !== undefined) {
        api.endText(endText);
      }
      if (reset !== undefined && reset) {
        api.reset();
      }

      return api;
    };

    // 旧 `renderDom()` 猴补的等价物：落地后按真实尺寸重算窗口、订阅尺寸变化、补一次触底检查
    api.whenMount = () => {
      if (isVirtualEnabled() && state.itemsData.length > 0) {
        renderItems();
        observeSize();
      }
      scheduleCheck();
    };

    // 旧 `destroy()` 猴补的等价物：解绑尺寸观察者
    api.whenDestroy = () => {
      disconnectSizeObserver();
    };

    syncVirtualState();
    syncFooter();
    return node;
  });
}

export const vScroll = createComponentShortcut(VScroll);
