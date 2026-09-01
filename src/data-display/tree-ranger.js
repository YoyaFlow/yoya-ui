import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  isPlainObject,
  normalizeComponentArguments,
  replaceChildren,
  resolveTextValue,
  themeValue
} from '../components/shared.js';
import { vSplitPanel } from '../layout/split-panel.js';

const VIRTUAL_GAP = 4;
const VIRTUAL_PADDING = 6;
const DEFAULT_VISIBLE_COLUMNS = 3;
const DEFAULT_PAGE_SIZE = 200;
const LOAD_MORE_THRESHOLD = 200;

/**
 * vTreeRanger：ranger 式多列浏览器（固定三个窗口）。
 * 三个窗口与分隔面板只创建一次，导航（点击父级 / 前进后退）只移动各窗口
 * 绑定的层级数据，宽度不会随切换变化；每列独立虚拟滚动。
 */
export function vTreeRanger(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const state = {
    ariaLabel: '多列浏览器',
    columns: [],
    visibleColumns: DEFAULT_VISIBLE_COLUMNS,
    itemHeight: 30,
    overscan: 6,
    minSize: 180,
    levels: [],
    loadingText: '加载中…',
    emptyText: '暂无数据'
  };

  let root = null;
  let crumbs = null;
  const columnViews = [];
  let changeHandler = null;

  const api = {
    ariaLabel(value) {
      if (value === undefined) return state.ariaLabel;
      state.ariaLabel = resolveTextValue(value) || '多列浏览器';
      root?.attr('aria-label', state.ariaLabel);
      return api;
    },
    columns(value) {
      if (value === undefined) return state.columns.slice();
      state.columns = Array.isArray(value) ? value : [value];
      resetLevels();
      syncSlots();
      loadLevel(0);
      return api;
    },
    visibleColumns(value) {
      if (value === undefined) return state.visibleColumns;
      const parsed = Number(value);
      state.visibleColumns = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_VISIBLE_COLUMNS;
      return api;
    },
    itemHeight(value) {
      if (value === undefined) return state.itemHeight;
      const parsed = Number(value);
      state.itemHeight = Number.isFinite(parsed) && parsed > 0 ? Math.max(1, parsed) : 30;
      return api;
    },
    overscan(value) {
      if (value === undefined) return state.overscan;
      const parsed = Number(value);
      state.overscan = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 6;
      return api;
    },
    minSize(value) {
      if (value === undefined) return state.minSize;
      const parsed = Number(value);
      state.minSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 180;
      return api;
    },
    selectedKeys() {
      return state.levels.map((level) => level.selected);
    },
    selectedItems() {
      return state.levels.map((level) => level.selectedItem).filter(Boolean);
    },
    current() {
      return state.levels.length - 1;
    },
    back() {
      if (state.levels.length > 1) {
        state.levels.pop();
        syncSlots();
        emitChange('back');
      }
      return api;
    },
    reload() {
      resetLevels();
      syncSlots();
      loadLevel(0);
      return api;
    },
    refresh() {
      state.levels.forEach((level) => {
        level.error = null;
        level.hasMore = false;
        level.items = [];
        level.loaded = false;
        level.loading = false;
        level.page = 0;
      });
      syncSlots();
      return api;
    },
    render() {
      if (!root) {
        root = new HtmlElementNode('div')
          .className(componentClass, 'yoya-vtreeranger')
          .attr({ role: 'group', 'aria-label': state.ariaLabel })
          .styles({
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minWidth: '0'
          });
        root.on('keydown', (event) => handleKeydown(event));
        root.attr('tabindex', '0');
        buildStructure();
      }
      syncSlots();
      return root;
    },
    change(handler) {
      if (handler === undefined) return changeHandler;
      changeHandler = typeof handler === 'function' ? handler : null;
      return api;
    },
    onChange(handler) {
      return api.change(handler);
    }
  };

  function emitChange(type, detail = null) {
    if (typeof changeHandler === 'function') {
      changeHandler({
        current: api.current(),
        detail,
        selections: api.selectedItems(),
        type
      });
    }
  }

  function resetLevels() {
    state.levels = [];
    state.columns.forEach((column, index) => {
      state.levels.push(createLevel(column, index));
    });
  }

  function createLevel(config, index) {
    return {
      config: config ?? levelConfig(index),
      hasMore: false,
      items: [],
      loaded: false,
      page: 0,
      selected: null,
      selectedItem: null,
      focus: null,
      loading: false,
      error: null
    };
  }

  function levelConfig(levelIndex) {
    return state.columns[levelIndex] ?? state.columns[state.columns.length - 1];
  }

  function slotStart() {
    return Math.max(0, state.levels.length - state.visibleColumns);
  }

  function buildStructure() {
    columnViews.length = 0;
    for (let slot = 0; slot < state.visibleColumns; slot += 1) {
      columnViews.push(createColumnView(slot));
    }
    crumbs = buildCrumbs();
    root.clearChildren();
    root.child(crumbs);
    root.child(buildSplit(0));
  }

  function buildSplit(slot) {
    if (slot + 1 >= columnViews.length) {
      return columnViews[slot].columnRoot;
    }
    const defaultSize = slot === 0 ? '25%' : '33%';
    const panelStyle =
      slot === 0
        ? { flex: '1 1 auto', minHeight: '0', width: '100%' }
        : { height: '100%', minHeight: '0', width: '100%' };
    return vSplitPanel({
      direction: 'horizontal',
      style: panelStyle,
      size: defaultSize,
      minSize: state.minSize,
      first: columnViews[slot].columnRoot,
      second: buildSplit(slot + 1)
    });
  }

  function createColumnView(slot) {
    const status = new HtmlElementNode('div')
      .className('yoya-vtreeranger-column-status')
      .styles({
        boxSizing: 'border-box',
        color: themeValue('color-text-muted', '#8b949e'),
        flex: '0 0 auto',
        fontSize: '12px',
        lineHeight: '1.4',
        padding: '6px 10px'
      });

    const viewport = new HtmlElementNode('div')
      .className('yoya-vtreeranger-viewport')
      .styles({ boxSizing: 'border-box', minHeight: '100%', position: 'relative' });
    const list = new HtmlElementNode('div')
      .className('yoya-vtreeranger-list')
      .styles({
        boxSizing: 'border-box',
        flex: '1 1 auto',
        minHeight: '0',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        position: 'relative',
        scrollbarWidth: 'none'
      });
    list.child(viewport);
    list.on('scroll', () => {
      const view = columnViews[slot];
      renderColumnRows(view);
      maybeLoadMore(view);
    });

    const columnRoot = new HtmlElementNode('div')
      .className('yoya-vtreeranger-column')
      .attr('data-column', String(slot))
      .styles({
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '0',
        minWidth: '0',
        width: '100%'
      });
    columnRoot.child(list, status);
    return { boundLevel: null, columnRoot, list, slot, status, viewport };
  }

  function syncSlots() {
    if (!root) return;
    const start = slotStart();
    columnViews.forEach((view, slot) => {
      const levelIndex = start + slot;
      view.boundLevel = levelIndex < state.levels.length ? levelIndex : null;
      renderColumnStatus(view);
      renderColumnRows(view);
    });
    renderCrumbs();
    for (let index = start; index < state.levels.length; index += 1) {
      const level = state.levels[index];
      if (!level.loaded && !level.loading) {
        loadLevel(index);
      }
    }
  }

  function renderColumnStatus(view) {
    const level = view.boundLevel === null ? null : state.levels[view.boundLevel];
    if (!level) {
      replaceChildren(view.status, [state.emptyText]);
      view.status.style('display', null);
      return;
    }
    if (level.loading) {
      replaceChildren(view.status, [state.loadingText]);
      view.status.style('display', null);
    } else if (level.error) {
      replaceChildren(view.status, [level.error?.message ?? '加载失败']);
      view.status.style('display', null);
    } else if (level.items.length === 0) {
      replaceChildren(view.status, [state.emptyText]);
      view.status.style('display', null);
    } else {
      replaceChildren(view.status, []);
      view.status.style('display', 'none');
    }
  }

  function renderColumnRows(view) {
    const level = view.boundLevel === null ? null : state.levels[view.boundLevel];
    if (!level) {
      replaceChildren(view.viewport, []);
      view.viewport.style('height', '100%');
      return;
    }

    const count = level.items.length;
    if (count === 0) {
      replaceChildren(view.viewport, []);
      view.viewport.style('height', '100%');
      return;
    }

    const pitch = state.itemHeight + VIRTUAL_GAP;
    const scrollTop = view.list._el ? Number(view.list._el.scrollTop) || 0 : 0;
    const clientHeight = view.list._el ? Number(view.list._el.clientHeight) || 0 : 0;
    const start = Math.max(0, Math.floor((scrollTop - VIRTUAL_PADDING) / pitch) - state.overscan);
    const end = Math.min(
      count,
      Math.max(0, Math.ceil((scrollTop + clientHeight - VIRTUAL_PADDING) / pitch) + state.overscan)
    );

    const nodes = [];
    for (let itemIndex = start; itemIndex < end; itemIndex += 1) {
      nodes.push(createRow(view, itemIndex));
    }
    replaceChildren(view.viewport, nodes);
    view.viewport.style('height', `${virtualListHeight(count)}px`);
  }

  function createRow(view, itemIndex) {
    const level = state.levels[view.boundLevel];
    const item = level.items[itemIndex];
    const key = itemKey(view.boundLevel, item);
    const selected = level.selected === key;
    const focused = level.focus === key;

    const row = new HtmlElementNode('div')
      .className('yoya-vtreeranger-row')
      .attr({
        'aria-selected': selected ? 'true' : 'false',
        'data-key': String(key),
        'data-index': String(itemIndex),
        role: 'option',
        tabindex: focused ? '0' : '-1'
      })
      .styles({
        alignItems: 'center',
        background: selected ? themeValue('color-primary-subtle', '#eff6ff') : 'transparent',
        borderLeft: selected
          ? `2px solid ${themeValue('color-primary', '#2563eb')}`
          : '2px solid transparent',
        borderBottom: `1px solid ${themeValue('color-border-faint', '#eef1f4')}`,
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        fontSize: '13px',
        height: `${state.itemHeight}px`,
        lineHeight: '1.2',
        overflow: 'hidden',
        padding: '0 10px',
        position: 'absolute',
        top: `${VIRTUAL_PADDING + itemIndex * (state.itemHeight + VIRTUAL_GAP)}px`,
        whiteSpace: 'nowrap',
        width: '100%'
      });
    row.on('mouseenter', () => {
      if (!selected) row.style('background', themeValue('color-surface-hover', '#f0f2f5'));
    });
    row.on('mouseleave', () => {
      row.style(
        'background',
        selected ? themeValue('color-primary-subtle', '#eff6ff') : 'transparent'
      );
    });
    row.on('click', (event) => {
      event.stopPropagation();
      selectItem(view.boundLevel, item);
    });
    row.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectItem(view.boundLevel, item);
      }
    });

    const config = levelConfig(view.boundLevel);
    const iconContent =
      config && typeof config.icon === 'function' ? config.icon(item, itemIndex) : null;
    if (iconContent !== null && iconContent !== undefined) {
      const iconBox = new HtmlElementNode('span')
        .className('yoya-vtreeranger-icon')
        .styles({
          flex: '0 0 auto',
          fontSize: '12px',
          marginRight: '6px',
          opacity: '0.75'
        });
      iconBox.child(iconContent);
      row.child(iconBox);
    }
    const content =
      config && typeof config.renderItem === 'function'
        ? config.renderItem(item, itemIndex)
        : String(item);
    row.child(content);
    return row;
  }

  function virtualListHeight(count) {
    if (count === 0) return 0;
    return VIRTUAL_PADDING * 2 + count * state.itemHeight + (count - 1) * VIRTUAL_GAP;
  }

  function itemKey(levelIndex, item) {
    const config = levelConfig(levelIndex);
    if (config && typeof config.itemKey === 'function') return config.itemKey(item);
    return item?.id ?? item?.key ?? item;
  }

  function resolveTitle(levelIndex) {
    const config = levelConfig(levelIndex);
    const title = config?.title;
    if (typeof title === 'function') {
      return title(levelIndex, api.selectedItems().slice(0, levelIndex));
    }
    return title ?? `列 ${levelIndex + 1}`;
  }

  function buildCrumbs() {
    return new HtmlElementNode('div')
      .className('yoya-vtreeranger-crumbs')
      .attr({ 'aria-label': '当前路径' })
      .styles({
        alignItems: 'center',
        background: themeValue('color-surface-hover', '#f6f8fa'),
        borderBottom: `1px solid ${themeValue('color-border', '#d0d7de')}`,
        boxSizing: 'border-box',
        display: 'flex',
        flex: '0 0 auto',
        fontSize: '12px',
        gap: '6px',
        lineHeight: '1.4',
        minHeight: '32px',
        overflow: 'hidden',
        padding: '6px 10px',
        whiteSpace: 'nowrap'
      });
  }

  function renderCrumbs() {
    if (!crumbs) return;
    replaceChildren(crumbs, []);

    const segments = [{ levelIndex: 0, text: resolveTitle(0), canJump: state.levels.length > 1 }];
    for (let index = 1; index < state.levels.length; index += 1) {
      const selected = state.levels[index - 1].selectedItem;
      if (selected === null || selected === undefined) continue;
      segments.push({
        canJump: index < state.levels.length - 1,
        levelIndex: index - 1,
        text: itemText(index - 1, selected)
      });
    }

    segments.forEach((segment, index) => {
      if (index > 0) {
        const separator = new HtmlElementNode('span')
          .className('yoya-vtreeranger-crumb-separator')
          .styles({
            color: themeValue('color-text-muted', '#8b949e'),
            flex: '0 0 auto',
            opacity: '0.7'
          });
        separator.text('/');
        crumbs.child(separator);
      }
      crumbs.child(buildCrumb(segment, index === segments.length - 1));
    });
  }

  function buildCrumb(segment, active) {
    const attrs = { role: segment.canJump ? 'button' : 'text' };
    if (segment.canJump) {
      attrs.tabindex = '0';
    }
    const crumb = new HtmlElementNode('span')
      .className('yoya-vtreeranger-crumb')
      .attr(attrs)
      .styles({
        color: active
          ? themeValue('color-text', '#1f2328')
          : themeValue('color-text-secondary', '#57606a'),
        cursor: segment.canJump ? 'pointer' : 'default',
        flex: '0 0 auto',
        fontWeight: active ? '600' : '400',
        maxWidth: '240px',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      });
    crumb.text(segment.text);
    if (segment.canJump) {
      crumb.on('click', () => jumpTo(segment.levelIndex));
      crumb.on('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          jumpTo(segment.levelIndex);
        }
      });
    }
    return crumb;
  }

  function jumpTo(levelIndex) {
    const target = Math.max(0, Math.min(levelIndex, state.levels.length - 1));
    if (target >= state.levels.length - 1) return;
    state.levels = state.levels.slice(0, target + 1);
    syncSlots();
    emitChange('crumb');
  }

  function itemText(levelIndex, item) {
    const config = levelConfig(levelIndex);
    if (config && typeof config.itemText === 'function') return config.itemText(item);
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    return item?.name ?? item?.label ?? item?.id ?? String(item);
  }

  async function loadLevel(levelIndex, mode = 'initial') {
    const level = state.levels[levelIndex];
    const config = levelConfig(levelIndex);
    if (!level || level.loading || typeof config?.load !== 'function') return;
    if (mode === 'more' && !level.hasMore) return;

    level.loading = true;
    syncSlots();

    const page = mode === 'more' ? level.page + 1 : 1;
    const pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;
    const context = {
      column: levelIndex,
      offset: (page - 1) * pageSize,
      page,
      pageSize,
      selection: api.selectedItems().slice(0, levelIndex),
      selections: api.selectedItems().slice(0, levelIndex)
    };

    try {
      const result = await config.load(context);
      const { items, hasMore } = normalizeLoadResult(result, pageSize);
      level.items = mode === 'more' ? mergeItems(levelIndex, level.items, items) : items;
      level.hasMore = hasMore;
      level.page = page;
      level.loaded = true;
    } catch (error) {
      level.error = error;
      level.loaded = true;
    } finally {
      level.loading = false;
      syncSlots();
    }
  }

  function normalizeLoadResult(result, pageSize) {
    if (Array.isArray(result)) {
      return { hasMore: false, items: result };
    }
    const items = Array.isArray(result?.items) ? result.items : [];
    const hasMore =
      typeof result?.hasMore === 'boolean'
        ? result.hasMore
        : items.length >= (result?.pageSize ?? pageSize);
    return { hasMore, items };
  }

  function mergeItems(levelIndex, existing, incoming) {
    const seen = new Set(existing.map((item) => String(itemKey(levelIndex, item))));
    return [...existing, ...incoming.filter((item) => !seen.has(String(itemKey(levelIndex, item))))];
  }

  function maybeLoadMore(view) {
    const levelIndex = view.boundLevel;
    const level = levelIndex === null ? null : state.levels[levelIndex];
    if (!level || level.loading || !level.hasMore || !view.list._el) return;
    const el = view.list._el;
    const distance = el.scrollHeight - el.scrollTop - (el.clientHeight || 0);
    if (distance <= LOAD_MORE_THRESHOLD) {
      loadLevel(levelIndex, 'more');
    }
  }

  function selectItem(levelIndex, item) {
    const level = state.levels[levelIndex];
    if (!level) return;

    level.selected = itemKey(levelIndex, item);
    level.selectedItem = item;
    level.focus = level.selected;
    state.levels = state.levels.slice(0, levelIndex + 1);

    const nextIndex = levelIndex + 1;
    if (nextIndex < state.columns.length || state.columns.length > 0) {
      state.levels.push(createLevel(null, nextIndex));
    }

    syncSlots();
    if (nextIndex < state.levels.length) {
      loadLevel(nextIndex);
    }
    emitChange('select', item);
  }

  function handleKeydown(event) {
    const levelIndex = state.levels.length - 1;
    const level = state.levels[levelIndex];
    if (!level) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (level.selected !== null) {
        const item = level.items.find((entry) => itemKey(levelIndex, entry) === level.selected);
        if (item) selectItem(levelIndex, item);
      }
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      event.preventDefault();
      api.back();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(levelIndex, event.key === 'ArrowUp' ? -1 : 1);
    }
  }

  function moveFocus(levelIndex, delta) {
    const level = state.levels[levelIndex];
    if (!level || level.items.length === 0) return;
    const currentPos = level.items.findIndex(
      (item) => itemKey(levelIndex, item) === (level.focus ?? level.selected)
    );
    const nextPos = Math.min(
      level.items.length - 1,
      Math.max(0, (currentPos < 0 ? -delta : currentPos) + delta)
    );
    level.focus = itemKey(levelIndex, level.items[nextPos]);
    syncSlots();
  }

  applyTreeRangerSetup(args.first);
  if (args.options) {
    Object.assign(state, args.options);
  }
  if (typeof args.callback === 'function') {
    args.callback(api);
  }
  return api;

  function applyTreeRangerSetup(setup) {
    if (setup === null || setup === undefined) return;
    if (typeof setup === 'function') {
      setup(api);
      return;
    }
    if (isPlainObject(setup)) {
      const {
        ariaLabel,
        change,
        columns,
        emptyText,
        itemHeight,
        loadingText,
        minSize,
        onChange,
        overscan,
        visibleColumns
      } = setup;
      if (ariaLabel !== undefined) api.ariaLabel(ariaLabel);
      if (itemHeight !== undefined) api.itemHeight(itemHeight);
      if (overscan !== undefined) api.overscan(overscan);
      if (minSize !== undefined) api.minSize(minSize);
      if (visibleColumns !== undefined) api.visibleColumns(visibleColumns);
      if (loadingText !== undefined) state.loadingText = loadingText;
      if (emptyText !== undefined) state.emptyText = emptyText;
      if (change !== undefined) api.change(change);
      if (onChange !== undefined) api.change(onChange);
      if (columns !== undefined) api.columns(columns);
      return;
    }
    api.columns(setup);
  }
}

export const treeRanger = vTreeRanger;

export function vTreeRangerColumn(setup = null) {
  return setup;
}
