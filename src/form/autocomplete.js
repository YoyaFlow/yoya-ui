import { registerChildFactories } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import { bindDocumentEvent, bindWindowEvent } from '../core/document-events.js';
import { HtmlElementNode, div, input as inputTag } from '../html/index.js';
import { createComponentShortcut, isPlainObject, themeValue } from '../components/shared.js';

/**
 * 自动完成输入（形态 B，票 15 §4）：视图根是外壳 `div` + 内层输入 + 建议列表。
 *
 * - 身份写在结构里：根 `vn: 'VAutocomplete'`、输入 `vn: 'VAutocompleteInput'`、
 *   建议列表 `vn: 'VAutocompleteList'`、每条建议 `vn: 'VAutocompleteOption'`
 *   （`data-vautocomplete-*` 这些既有角色标记一并保留：角色标记不是身份）；
 * - 建议列表是**区域**（`rebuildable`）：内容由它自己的 setup 产出，指针悬停时推迟重建；
 * - 元素级时机：列表定位在 `whenMount`（旧 `renderDom()` 猴补的等价物），文档 / 窗口监听与
 *   关闭动作在 `whenDestroy`（旧 `destroy()` 猴补的等价物）；读元素只读 `_el` 判定"建没建"。
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupAutocomplete` 同口径）。
 */
export function VAutocomplete() {
  return vNode((api, self) => {
    const state = {
      changeHandlers: [],
      disabled: false,
      highlight: -1,
      limit: 8,
      open: false,
      optionNodes: [],
      placeholder: '输入以搜索',
      pointerOverList: false,
      required: false,
      source: [],
      suggestions: [],
      value: ''
    };
    let outsideUnbind = null;
    let repositionUnbind = null;

    const input = inputTag({ vn: 'VAutocompleteInput' })
      .attr({
        autocomplete: 'off',
        'data-vautocomplete-input': 'true',
        placeholder: state.placeholder,
        type: 'text'
      })
      .styles({
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: 'inherit',
        font: 'inherit',
        minHeight: 'var(--yoya-control-height-md, 34px)',
        outline: 'none',
        padding: '0 10px',
        width: '100%'
      });
    const suggestionList = div({ vn: 'VAutocompleteList' })
      .attr('data-vautocomplete-list', 'true')
      .styles({
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '8px',
        boxShadow: 'var(--yoya-shadow-md, 0 8px 18px rgba(15, 23, 42, 0.1))',
        boxSizing: 'border-box',
        display: 'none',
        maxHeight: '240px',
        overflow: 'auto',
        padding: '4px',
        position: 'fixed',
        zIndex: '110'
      });
    const node = div({ vn: 'VAutocomplete' }).styles({ position: 'relative', width: '100%' });

    node.child(input, suggestionList);

    const resolveSuggestions = (query) => {
      const source = state.source;

      if (typeof source === 'function') {
        return Promise.resolve(source(query)).then((items) => normalizeSuggestions(items));
      }

      return Promise.resolve(normalizeSuggestions(source)).then((items) =>
        query
          ? items.filter((item) => item.label.toLowerCase().includes(String(query).toLowerCase()))
          : items
      );
    };

    /** 只更新高亮样式，不重建下拉列表（避免悬停时销毁正在点击的节点）。 */
    const setHighlight = (index) => {
      state.highlight = index;
      (state.optionNodes || []).forEach((option, optionIndex) => {
        option.styles(
          optionIndex === index
            ? { background: themeValue('color-primary-subtle', '#eff6ff') }
            : { background: null }
        );
      });
    };

    /** 区域 builder：按当前建议产出选项节点。 */
    const buildOptions = (list) => {
      state.optionNodes = [];
      state.suggestions.forEach((item, index) => {
        const option = div({ vn: 'VAutocompleteOption' })
          .attr({ 'data-vautocomplete-option': item.value, role: 'option' })
          .styles({
            borderRadius: '4px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            overflow: 'hidden',
            padding: '5px 8px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          })
          .child(item.label);

        option.on('mousedown', (event) => {
          event.preventDefault();
          select(item);
        });
        option.on('mouseenter', () => setHighlight(index));
        state.optionNodes.push(option);
        list.child(option);
      });
    };

    const renderList = () => {
      suggestionList.rebuild();
      setHighlight(state.highlight);
    };

    const bindOutsideClose = (enabled) => {
      if (enabled && !outsideUnbind) {
        outsideUnbind = bindDocumentEvent('mousedown', (event) => {
          if (!node._el || !node._el.contains(event.target)) {
            api.close();
          }
        });
        return;
      }

      if (!enabled && outsideUnbind) {
        outsideUnbind();
        outsideUnbind = null;
      }
    };

    const bindReposition = (enabled) => {
      if (enabled && !repositionUnbind) {
        const reposition = () => positionList();
        const unbindScroll = bindWindowEvent('scroll', reposition, true);
        const unbindResize = bindWindowEvent('resize', reposition);

        repositionUnbind = () => {
          unbindScroll();
          unbindResize();
        };
        return;
      }

      if (!enabled && repositionUnbind) {
        repositionUnbind();
        repositionUnbind = null;
      }
    };

    /** 根据输入框坐标定位下拉列表（fixed 定位，脱离容器裁剪）。 */
    const positionList = () => {
      if (typeof window === 'undefined' || !input._el || !suggestionList._el) {
        return;
      }

      const rect = input._el.getBoundingClientRect();
      const listElement = suggestionList._el;
      const listHeight = listElement.offsetHeight || 240;
      const margin = 8;
      let top = rect.bottom + 6;

      if (top + listHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - listHeight - 6);
      }

      suggestionList.styles({
        left: `${rect.left}px`,
        top: `${top}px`,
        width: `${Math.max(rect.width, 180)}px`
      });
    };

    const select = (item) => {
      api.value(item.value);
      api.close();
    };

    const openSuggestions = () => {
      if (state.disabled) {
        return;
      }

      void resolveSuggestions(state.value).then((items) => {
        state.suggestions = items.slice(0, state.limit);
        state.highlight = state.suggestions.length > 0 ? 0 : -1;
        renderList();
        state.open = state.suggestions.length > 0;
        suggestionList.style('display', state.open ? null : 'none');

        if (state.open) {
          bindOutsideClose(true);
          bindReposition(true);
          positionList();
        }
      });
    };

    const handleInput = (query) => {
      api.value(query);
      openSuggestions();
    };

    const handleKeydown = (event) => {
      if (!state.open || state.suggestions.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.highlight = (state.highlight + 1) % state.suggestions.length;
        setHighlight(state.highlight);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.highlight =
          (state.highlight - 1 + state.suggestions.length) % state.suggestions.length;
        setHighlight(state.highlight);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = state.suggestions[state.highlight];

        if (item) {
          select(item);
        }
      } else if (event.key === 'Escape') {
        api.close();
      }
    };

    input.on('input', (event) => handleInput(event.target.value));
    input.on('keydown', (event) => handleKeydown(event));
    input.on('focus', () => openSuggestions());
    input.on('click', () => openSuggestions());

    suggestionList.on('mouseenter', () => {
      state.pointerOverList = true;
    });
    suggestionList.on('mouseleave', () => {
      state.pointerOverList = false;
      if (suggestionList.rebuildPending()) {
        // 悬停期间被推迟的重建，在指针离开后补上。
        renderList();
      }
    });
    suggestionList.setup((list) => {
      // 列表是区域：内容由这次 setup 产出；指针悬停时只刷值、不重建节点。
      list.rebuildable(() => !state.pointerOverList);
      buildOptions(list);
    });

    /** 读写当前输入值。 */
    api.value = (next) => {
      if (next === undefined) {
        return state.value;
      }

      state.value = String(next ?? '');
      input.attr('value', state.value);
      // 句柄交给使用方的是组件节点（与旧外壳的 `_componentHandle` 同一口径）
      state.changeHandlers.forEach((handler) => handler(state.value, self.node()));
      return api;
    };

    /** 设置建议来源：选项数组或返回建议的同步函数。 */
    api.source = (next) => {
      if (next === undefined) {
        return state.source;
      }

      state.source = next;
      return api;
    };

    api.options = (next) => api.source(next);

    /** 建议列表最多显示的条数。 */
    api.limit = (next) => {
      if (next === undefined) {
        return state.limit;
      }

      state.limit = Math.max(1, Number(next) || 8);
      return api;
    };

    // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
    api.isDisabled = () => state.disabled;

    api.name = (value) => {
      if (value === undefined) {
        return node.attr('data-name') || '';
      }

      node.attr('data-name', value ? String(value) : null);
      input.attr('name', value ? String(value) : null);
      return api;
    };

    api.placeholder = (value) => {
      if (value === undefined) {
        return state.placeholder;
      }

      state.placeholder = String(value);
      input.attr('placeholder', state.placeholder);
      return api;
    };

    api.disabled = (next) => {
      if (next === undefined) {
        return state.disabled;
      }

      state.disabled = Boolean(next);
      node.attr('data-disabled', state.disabled ? 'true' : null);
      input.attr('disabled', state.disabled ? true : null);
      return api;
    };

    api.required = (next) => {
      if (next === undefined) {
        return state.required;
      }

      state.required = Boolean(next);
      node.attr('data-required', state.required ? 'true' : null);
      input.attr('required', state.required ? true : null);
      return api;
    };

    /** 注册取值变化回调（后一次注册替换前一次，与旧方法面一致）。 */
    api.change = (handler) => {
      if (handler === undefined) {
        return state.changeHandlers.slice();
      }

      state.changeHandlers = [handler];
      return api;
    };

    api.onChange = (handler) => api.change(handler);

    api.close = () => {
      state.open = false;
      state.pointerOverList = false;
      suggestionList.style('display', 'none');
      bindOutsideClose(false);
      bindReposition(false);
      return api;
    };

    /** 数组 / 函数 = 建议来源（旧 `_setupAutocomplete` 的兜底分支）。 */
    api.setupString = (next) => api.options(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupAutocomplete` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const {
        change,
        disabled,
        limit,
        name,
        onChange,
        options,
        placeholder,
        required,
        source,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (source !== undefined) {
        api.source(source);
      } else if (options !== undefined) {
        api.options(options);
      }
      if (limit !== undefined) {
        api.limit(limit);
      }
      if (value !== undefined) {
        api.value(value);
      }
      if (placeholder !== undefined) {
        api.placeholder(placeholder);
      }
      if (disabled !== undefined) {
        api.disabled(disabled);
      }
      if (name !== undefined) {
        api.name(name);
      }
      if (required !== undefined) {
        api.required(required);
      }
      if (change !== undefined) {
        api.change(change);
      } else if (onChange !== undefined) {
        api.onChange(onChange);
      }

      return api;
    };

    // 旧 `renderDom()` 猴补的等价物：落地时若已展开，补一次列表定位
    api.whenMount = () => {
      if (state.open) {
        positionList();
      }
    };

    // 旧 `destroy()` 猴补的等价物：关闭列表并解绑文档 / 窗口监听
    api.whenDestroy = () => {
      api.close();
    };

    return node;
  });
}

export const vAutocomplete = createComponentShortcut(VAutocomplete);

registerChildFactories(HtmlElementNode, { vAutocomplete });

function normalizeSuggestions(source) {
  return (Array.isArray(source) ? source : []).map((entry) => {
    if (typeof entry === 'string' || typeof entry === 'number') {
      return { label: String(entry), value: String(entry) };
    }
    return {
      label: String(entry.label ?? entry.value ?? ''),
      value: entry.value ?? entry.label ?? ''
    };
  });
}
