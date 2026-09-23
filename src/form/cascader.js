import { registerChildFactories, vText } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import { bindDocumentEvent, bindWindowEvent } from '../core/document-events.js';
import { HtmlElementNode, button as buttonTag, div, span } from '../html/index.js';
import { createComponentShortcut, isPlainObject, replaceChildren } from '../components/shared.js';

/**
 * 级联选择（形态 B，票 15 §4）：视图根是外壳 `div` + 触发按钮 + 弹出面板。
 *
 * - 身份写在结构里：根 `vn: 'VCascader'`、触发按钮 `vn: 'VCascaderTrigger'`、
 *   面板 `vn: 'VCascaderPanel'`（内含 `vn: 'VCascaderColumns'`）；列与选项在每次渲染面板时现建
 *   （`vn: 'VCascaderColumn'` / `vn: 'VCascaderOption'`，用到才建、建过即换）；
 * - 状态与命令收进 `vNode` 闭包；`change` 回调第二参交给使用方的是**组件句柄**（`self.node()`）；
 * - 元素级时机：面板定位在 `whenMount`（旧 `renderDom()` 猴补的等价物），文档 / 窗口监听在
 *   `whenDestroy` 上解绑；读元素只读 `_el` 判定"建没建"，不为了判定提前建 DOM（SSR 会碰 document）。
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupCascader` 同口径）。
 */
export function VCascader() {
  return vNode((api, self) => {
    const state = {
      activePath: [],
      changeHandlers: [],
      disabled: false,
      open: false,
      options: [],
      placeholder: '请选择',
      required: false,
      value: []
    };
    let outsideUnbind = null;
    let repositionUnbind = null;

    const triggerText = vText(state.placeholder);
    const trigger = buttonTag({ vn: 'VCascaderTrigger' })
      .attr({
        'aria-expanded': 'false',
        'aria-haspopup': 'listbox',
        'data-vcascader-trigger': 'true',
        title: '选择',
        type: 'button'
      })
      .child(triggerText, span({ vn: 'VCascaderArrow' }).child('▾'));
    const columns = div({ vn: 'VCascaderColumns' }).attr('data-vcascader-columns', 'true');
    const panel = div({ vn: 'VCascaderPanel' }).attr('data-vcascader-panel', 'true').child(columns);
    const node = div({ vn: 'VCascader' });

    node.child(trigger, panel);

    const syncTrigger = () => {
      if (state.value.length === 0) {
        triggerText.textContent(state.placeholder);
        return;
      }

      const labels = findPathByValues(state.options, state.value).map((option) => option.label);

      triggerText.textContent(labels.length > 0 ? labels.join(' / ') : state.value.join(' / '));
    };

    const renderColumns = () => {
      replaceChildren(columns, []);

      const levels = [];
      let levelOptions = state.options;

      state.activePath.forEach((active) => {
        levels.push(levelOptions);
        const next = levelOptions.find((option) => option.value === active.value);
        levelOptions = next ? next.children : [];
      });

      if (state.activePath.length === 0 || levelOptions.length > 0) {
        levels.push(levelOptions);
      }

      levels.forEach((options, level) => {
        columns.child(createColumn(options, level));
      });
    };

    const createColumn = (options, level) => {
      const active = state.activePath[level] || null;
      const column = div({ vn: 'VCascaderColumn' });

      options.forEach((option) => {
        const row = div({ vn: 'VCascaderOption' }).attr({
          'data-vcascader-option': option.value,
          role: 'option'
        });

        row.on('click', () => selectOption(level, option));

        const isActive = active !== null && active.value === option.value;
        if (isActive) {
          // 高亮是状态：颜色归 CSS 的 `[data-active='true']` 规则
          row.attr('data-active', 'true');
        }

        row.child(
          span({ vn: 'VCascaderOptionLabel' }).child(option.label),
          option.children.length > 0 ? span({ vn: 'VCascaderOptionArrow' }).child('›') : null
        );
        column.child(row);
      });

      return column;
    };

    const selectOption = (level, option) => {
      const path = state.activePath.slice(0, level);

      path.push(option);
      state.activePath = path;

      if (option.children.length > 0) {
        state.value = path.map((entry) => entry.value);
        syncTrigger();
        notifyChange();
        renderColumns();
        return;
      }

      state.value = path.map((entry) => entry.value);
      syncTrigger();
      notifyChange();
      api.close();
    };

    /** 句柄交给使用方的是组件节点（与旧外壳的 `_componentHandle` 同一口径） */
    const notifyChange = () => {
      state.changeHandlers.forEach((handler) => handler([...state.value], self.node()));
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
        const reposition = () => positionPanel();
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

    const positionPanel = () => {
      if (typeof window === 'undefined' || !node._el || !trigger._el) {
        return;
      }

      const rect = trigger._el.getBoundingClientRect();
      const panelElement = panel._el;

      if (!panelElement) {
        return;
      }

      const panelHeight = panelElement.offsetHeight || 240;
      const margin = 8;
      let top = rect.bottom + 6;

      if (top + panelHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - panelHeight - 6);
      }
      panel.styles({ left: `${rect.left}px`, position: 'fixed', top: `${top}px` });
    };

    trigger.on('click', () => api.toggle());

    /** 读写级联选项树（{ label, value, children }[]）。 */
    api.options = (next) => {
      if (next === undefined) {
        return cloneOptions(state.options);
      }

      state.options = normalizeOptions(next);
      syncTrigger();
      if (state.open) {
        renderColumns();
      }
      return api;
    };

    /** 读写选中路径（各级 value 组成的数组）。 */
    api.value = (next) => {
      if (next === undefined) {
        return [...state.value];
      }

      const values = Array.isArray(next) ? next : next === null ? [] : [next];
      const path = findPathByValues(state.options, values);

      state.value = path.map((option) => option.value);
      state.activePath = path;
      syncTrigger();
      return api;
    };

    // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
    api.isDisabled = () => state.disabled;

    api.open = (value = true) => {
      state.open = Boolean(value);
      trigger.attr('aria-expanded', state.open ? 'true' : 'false');
      // 面板显隐归 CSS（`[data-open='true']` 规则）：JS 只写状态
      node.attr('data-open', state.open ? 'true' : null);

      if (state.open) {
        renderColumns();
        positionPanel();
      }

      bindOutsideClose(state.open);
      bindReposition(state.open);
      return api;
    };

    api.close = () => api.open(false);

    api.toggle = () => api.open(!state.open);

    api.disabled = (next) => {
      if (next === undefined) {
        return state.disabled;
      }

      state.disabled = Boolean(next);
      node.attr('data-disabled', state.disabled ? 'true' : null);
      trigger.attr('disabled', state.disabled ? true : null);
      return api;
    };

    api.required = (next) => {
      if (next === undefined) {
        return state.required;
      }

      state.required = Boolean(next);
      node.attr('data-required', state.required ? 'true' : null);
      return api;
    };

    api.name = (value) => {
      if (value === undefined) {
        return node.attr('data-name') || '';
      }

      node.attr('data-name', value ? String(value) : null);
      return api;
    };

    api.placeholder = (value) => {
      if (value === undefined) {
        return state.placeholder;
      }

      state.placeholder = String(value);
      syncTrigger();
      return api;
    };

    /** 注册选中路径变化回调（后一次注册替换前一次，与旧方法面一致）。 */
    api.change = (handler) => {
      if (handler === undefined) {
        return state.changeHandlers.slice();
      }

      state.changeHandlers = [handler];
      return api;
    };

    api.onChange = (handler) => api.change(handler);

    /** 数组 = 初始选项树（旧 `_setupCascader` 的兜底分支）。 */
    api.setupString = (next) => api.options(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupCascader` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { change, disabled, name, onChange, options, placeholder, required, value, ...rest } =
        setup;

      if (Object.keys(rest).length > 0) {
        node.setup(rest);
      }

      if (options !== undefined) {
        api.options(options);
      }
      if (placeholder !== undefined) {
        api.placeholder(placeholder);
      }
      if (value !== undefined) {
        api.value(value);
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

    // 旧 `renderDom()` 猴补的等价物：落地时若已展开，补一次面板定位
    api.whenMount = () => {
      if (state.open) {
        positionPanel();
      }
    };

    // 旧 `destroy()` 猴补的等价物：文档 / 窗口监听随组件销毁解绑
    api.whenDestroy = () => {
      bindOutsideClose(false);
      bindReposition(false);
    };

    return node;
  });
}

export const vCascader = createComponentShortcut(VCascader);

registerChildFactories(HtmlElementNode, { vCascader });

function normalizeOptions(options) {
  return (Array.isArray(options) ? options : []).map((entry) => ({
    children: normalizeOptions(entry.children),
    label: String(entry.label ?? entry.value ?? ''),
    value: entry.value ?? entry.label ?? ''
  }));
}

function cloneOptions(options) {
  return options.map((option) => ({
    children: cloneOptions(option.children),
    label: option.label,
    value: option.value
  }));
}

function findPathByValues(options, values) {
  const path = [];
  let level = options;

  for (const value of values) {
    const option = level.find((entry) => entry.value === value);

    if (!option) {
      break;
    }

    path.push(option);
    level = option.children;
  }

  return path;
}
