import { registerChildFactories, vText } from '@yoyaflow/yoya-core/internal/core/node.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { HtmlElementNode, button as buttonTag, div, span } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';
import { vDialog } from '../feedback/dialog.js';
import * as builtinIcons from '@yoyaflow/yoya-core/internal/svg/icons.js';

const DEFAULT_ICON_SIZE = 22;
const TRIGGER_ICON_SIZE = 16;
const ICON_BATCH_SIZE = 24;
const ICON_LOAD_MORE_THRESHOLD = 120;
const GRID_HEIGHT = '360px';

function collectBuiltinIcons() {
  return Object.keys(builtinIcons)
    .filter((name) => /^[A-Z].*Outlined$/.test(name) && typeof builtinIcons[name] === 'function')
    .sort();
}

/**
 * SVG 图标选择器（形态 B，票 15 §4）：视图根是外壳 `div` + 触发按钮 + 选择弹窗。
 *
 * - 身份写在结构里：根 `vn: 'VSvgIconPicker'`、触发按钮与图标位
 *   （`VSvgIconPickerTrigger` / `VSvgIconPickerTriggerIcon`）、方阵 `VSvgIconPickerGrid`
 *   （每个格子 `VSvgIconPickerCell`）、标题 `VSvgIconPickerDialogTitle`；
 * - 弹窗复用 `vDialog`：身份写**多值**（`vn: 'VSvgIconPickerDialog VDialog'`，与 `VField` 的动作按钮同一口径，
 *   见 `form/controls/field.js`），VDialog 自己的类名随它在波 4 收口；
 * - 方阵按需建：首批 24 个、滚到底分批补，弹窗打开后还补一次"填满视口"；
 * - 状态与命令收进 `vNode` 闭包；`change` 回调第二参交给使用方的是**组件句柄**（`self.node()`）；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupSvgIconPicker` 同口径）。
 */
export function VSvgIconPicker() {
  return vNode((api, self) => {
    const state = {
      changeHandlers: [],
      disabled: false,
      fillPending: false,
      iconEntries: collectBuiltinIcons().map((name) => ({
        factory: builtinIcons[name],
        name
      })),
      renderedCount: 0,
      required: false,
      value: null
    };
    let grid = null;

    const triggerIcon = span({ vn: 'VSvgIconPickerTriggerIcon' }).styles({
      alignItems: 'center',
      display: 'inline-flex',
      height: `${TRIGGER_ICON_SIZE}px`,
      justifyContent: 'center',
      width: `${TRIGGER_ICON_SIZE}px`
    });
    const triggerText = vText('选择图标');
    const trigger = buttonTag({ vn: 'VSvgIconPickerTrigger' })
      .attr({
        'aria-expanded': 'false',
        'aria-haspopup': 'dialog',
        'data-vsvg-icon-trigger': 'true',
        title: '选择图标',
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        gap: '8px',
        minHeight: '34px',
        padding: '5px 10px'
      })
      .child(triggerIcon, triggerText);
    const node = div({ vn: 'VSvgIconPicker' }).styles({ position: 'relative' });

    const dialog = vDialog({
      open: false,
      onClose: () => trigger.attr('aria-expanded', 'false')
    });

    // 弹窗复用 vDialog：身份写多值（部件 + 组件），样式仍归自己
    dialog.setup({ vn: 'VSvgIconPickerDialog VDialog' });
    dialog.styles({ maxWidth: 'min(92vw, 760px)' });
    dialog.content((body) => {
      body.div(
        {
          style: {
            color: themeValue('color-text', '#172033'),
            fontSize: '15px',
            fontWeight: '600',
            marginBottom: '12px'
          },
          vn: 'VSvgIconPickerDialogTitle'
        },
        (title) => title.child('选择图标')
      );
      grid = div({ vn: 'VSvgIconPickerGrid' })
        .styles({
          boxSizing: 'border-box',
          display: 'grid',
          gap: '8px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
          height: GRID_HEIGHT,
          overflowY: 'auto',
          padding: '2px'
        })
        .on('scroll', () => maybeLoadMoreIcons());
      body.child(grid);
    });

    node.child(trigger, dialog);

    const createCell = (entry) => {
      const { factory, name } = entry;
      const selected = state.value === name;
      const cell = buttonTag({ vn: 'VSvgIconPickerCell' })
        .attr({
          'aria-label': name,
          'aria-pressed': selected ? 'true' : 'false',
          'data-icon-name': name,
          title: name,
          type: 'button'
        })
        .styles({
          alignItems: 'center',
          background: selected ? themeValue('color-primary-subtle', '#eff6ff') : 'transparent',
          border: selected
            ? `1px solid ${themeValue('color-primary', '#2563eb')}`
            : `1px solid ${themeValue('color-border-faint', '#eef1f4')}`,
          borderRadius: '8px',
          boxSizing: 'border-box',
          color: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          height: '56px',
          justifyContent: 'center',
          padding: '0',
          width: '100%'
        });

      cell.on('mouseenter', () => {
        if (!selected) {
          cell.style('background', themeValue('color-surface-hover', '#f0f2f5'));
        }
      });
      cell.on('mouseleave', () => {
        cell.style(
          'background',
          selected ? themeValue('color-primary-subtle', '#eff6ff') : 'transparent'
        );
      });
      cell.on('click', () => {
        api.value(name);
        api.close();
      });
      cell.child(
        factory().styles({
          height: `${DEFAULT_ICON_SIZE}px`,
          width: `${DEFAULT_ICON_SIZE}px`
        })
      );
      return cell;
    };

    const renderGrid = () => {
      if (!grid) {
        return;
      }

      if (state.renderedCount === 0) {
        state.renderedCount = Math.min(ICON_BATCH_SIZE, state.iconEntries.length);
      }
      replaceChildren(grid, []);
      state.iconEntries.slice(0, state.renderedCount).forEach((entry) => {
        grid.child(createCell(entry));
      });
    };

    const renderMoreIcons = () => {
      if (!grid) {
        return;
      }

      const next = Math.min(state.iconEntries.length, state.renderedCount + ICON_BATCH_SIZE);

      while (state.renderedCount < next) {
        grid.child(createCell(state.iconEntries[state.renderedCount]));
        state.renderedCount += 1;
      }
    };

    const maybeLoadMoreIcons = () => {
      if (!grid || state.renderedCount >= state.iconEntries.length) {
        return;
      }

      if (!grid.isLanded()) {
        return;
      }

      const distance =
        grid.prop('scrollHeight') - grid.prop('scrollTop') - (grid.prop('clientHeight') || 0);

      if (distance <= ICON_LOAD_MORE_THRESHOLD) {
        renderMoreIcons();
      }
    };

    const fillViewport = () => {
      if (!grid) {
        return;
      }

      if (!grid.isLanded()) {
        return;
      }

      let guard = 0;

      while (state.renderedCount < state.iconEntries.length && guard < 200) {
        if (grid.prop('scrollHeight') > (grid.prop('clientHeight') || 0)) {
          break;
        }

        renderMoreIcons();
        guard += 1;
      }
    };

    const scheduleFill = () => {
      if (state.fillPending) {
        return;
      }

      state.fillPending = true;
      setTimeout(() => {
        state.fillPending = false;
        if (dialog.isOpen()) {
          fillViewport();
        }
      }, 0);
    };

    const sync = () => {
      replaceChildren(triggerIcon, []);

      const entry = state.iconEntries.find((item) => item.name === state.value);

      if (entry) {
        triggerIcon.child(
          entry.factory().styles({
            height: `${TRIGGER_ICON_SIZE}px`,
            width: `${TRIGGER_ICON_SIZE}px`
          })
        );
        triggerText.textContent(entry.name);
      } else {
        triggerText.textContent('选择图标');
      }

      const valueIndex = state.iconEntries.findIndex((item) => item.name === state.value);

      if (valueIndex >= state.renderedCount) {
        state.renderedCount = valueIndex + 1;
      }
      renderGrid();
    };

    /** 句柄交给使用方的是组件节点（与旧外壳的 `_componentHandle` 同一口径） */
    const notifyChange = () => {
      state.changeHandlers.forEach((handler) => handler(state.value, self.node()));
    };

    trigger.on('click', () => api.toggle());

    /** 读写当前选中图标名；null 表示未选择。 */
    api.value = (next) => {
      if (next === undefined) {
        return state.value;
      }

      if (next === null) {
        return api.clearValue();
      }

      if (!state.iconEntries.some((entry) => entry.name === next)) {
        return api;
      }

      state.value = next;
      sync();
      notifyChange();
      return api;
    };

    /** 清除已选图标。 */
    api.clearValue = () => {
      state.value = null;
      sync();
      notifyChange();
      return api;
    };

    // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
    api.isDisabled = () => state.disabled;

    /** 读写字段名（vFormItem 之外的标识）。 */
    api.name = (value) => {
      if (value === undefined) {
        return node.attr('data-name') || '';
      }

      node.attr('data-name', value ? String(value) : null);
      return api;
    };

    /** 读写图标集合：字符串名（内置图标）或 { name, icon } 自定义条目。 */
    api.icons = (list) => {
      if (list === undefined) {
        return state.iconEntries.map((entry) => entry.name);
      }

      const next = [];

      (Array.isArray(list) ? list : [list]).forEach((entry) => {
        if (typeof entry === 'string') {
          if (typeof builtinIcons[entry] === 'function') {
            next.push({ factory: builtinIcons[entry], name: entry });
          }
        } else if (entry && typeof entry.name === 'string' && typeof entry.icon === 'function') {
          next.push({ factory: entry.icon, name: entry.name });
        }
      });
      state.iconEntries = next;

      if (state.value !== null && !next.some((entry) => entry.name === state.value)) {
        state.value = null;
      }
      state.renderedCount = 0;
      sync();
      return api;
    };

    /** 打开/关闭选择弹窗。 */
    api.open = (value = true) => {
      trigger.attr('aria-expanded', value ? 'true' : 'false');
      dialog.open(value);

      if (value) {
        scheduleFill();
      }
      return api;
    };

    api.close = () => api.open(false);

    api.toggle = () => (dialog.isOpen() ? api.close() : api.open());

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

    /** 注册图标变化回调（name, picker）；后一次注册替换前一次。 */
    api.change = (handler) => {
      if (handler === undefined) {
        return state.changeHandlers.slice();
      }

      state.changeHandlers = [handler];
      return api;
    };

    /** change 的别名。 */
    api.onChange = (handler) => api.change(handler);

    /** 字符串 = 初始图标名（旧 `_setupSvgIconPicker` 的兜底分支）。 */
    api.setupString = (next) => api.value(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupSvgIconPicker` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { change, disabled, icons, name, onChange, open, required, value, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (icons !== undefined) {
        api.icons(icons);
      }
      if (value !== undefined) {
        api.value(value);
      }
      if (change !== undefined) {
        api.change(change);
      } else if (onChange !== undefined) {
        api.onChange(onChange);
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
      if (open !== undefined) {
        api.open(open);
      }

      return api;
    };

    renderGrid();
    return node;
  });
}

export const vSvgIconPicker = createComponentShortcut(VSvgIconPicker);

registerChildFactories(HtmlElementNode, { vSvgIconPicker });
