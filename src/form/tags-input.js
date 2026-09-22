import { registerChildFactories } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import {
  HtmlElementNode,
  button as buttonTag,
  div,
  input as inputTag,
  span
} from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';

/**
 * 标签输入（形态 B，票 15 §4）：视图根是外壳 `div` + 标签容器 + 文本输入。
 *
 * - 身份写在结构里：根 `vn: 'VTagsInput'`、标签容器 `vn: 'VTagsInputChips'`、
 *   输入 `vn: 'VTagsInputField'`、单个标签 `vn: 'VTagsInputTag'`
 *   （`data-vtags-*` 这些既有角色标记一并保留：角色标记不是身份）；
 * - 状态与命令收进 `vNode` 闭包；`change` 回调第二参交给使用方的是**组件句柄**（`self.node()`）；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupTagsInput` 同口径）。
 */
export function VTagsInput() {
  return vNode((api, self) => {
    const state = {
      changeHandlers: [],
      disabled: false,
      placeholder: '输入后回车添加',
      required: false,
      value: []
    };

    const chips = div({ vn: 'VTagsInputChips' })
      .attr('data-vtags-chips', 'true')
      .styles({ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '6px' });
    const input = inputTag({ vn: 'VTagsInputField' })
      .attr({
        'data-vtags-input': 'true',
        placeholder: state.placeholder,
        type: 'text'
      })
      .styles({
        background: 'transparent',
        border: '0',
        boxSizing: 'border-box',
        flex: '1 1 120px',
        font: 'inherit',
        minWidth: '80px',
        outline: 'none',
        padding: '2px 0'
      });
    const node = div({ vn: 'VTagsInput' }).styles({
      alignItems: 'center',
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid var(--yoya-color-border, #d8dee8)',
      borderRadius: '6px',
      boxSizing: 'border-box',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      minHeight: 'var(--yoya-control-height-md, 34px)',
      padding: '4px 8px',
      width: '100%'
    });

    node.child(chips, input);

    const currentInputValue = () => input._el?.value ?? input.attr('value') ?? '';

    const renderChips = () => {
      replaceChildren(
        chips,
        state.value.map((tag, index) => createChip(tag, index))
      );
    };

    const createChip = (tag, index) => {
      const removeButton = buttonTag({
        'aria-label': `移除 ${tag}`,
        'data-vtags-remove': 'true',
        title: '移除',
        type: 'button'
      })
        .styles({
          background: 'transparent',
          border: '0',
          color: themeValue('color-text-muted', '#64748b'),
          cursor: 'pointer',
          fontSize: '12px',
          lineHeight: '1',
          padding: '0'
        })
        .child('×');

      removeButton.on('click', () => removeTag(index));

      return span({ vn: 'VTagsInputTag' })
        .attr('data-vtags-tag', tag)
        .styles({
          alignItems: 'center',
          background: themeValue('color-surface-muted', '#f1f5f9'),
          border: '1px solid var(--yoya-color-border-faint, #efefef)',
          borderRadius: '4px',
          boxSizing: 'border-box',
          display: 'inline-flex',
          fontSize: '13px',
          gap: '4px',
          padding: '1px 6px'
        })
        .child(span().child(tag), removeButton);
    };

    const notifyChange = () => {
      // 句柄交给使用方的是组件节点（与旧外壳的 `_componentHandle` 同一口径）
      state.changeHandlers.forEach((handler) => handler([...state.value], self.node()));
    };

    const addTag = (raw) => {
      const tag = String(raw).trim();

      if (!tag || state.value.includes(tag)) {
        return;
      }

      state.value.push(tag);
      renderChips();
      notifyChange();
    };

    const removeTag = (index) => {
      if (index < 0 || index >= state.value.length) {
        return;
      }

      state.value.splice(index, 1);
      renderChips();
      notifyChange();
    };

    const handleKeydown = (event) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        addTag(currentInputValue());
        input.attr('value', '');
        return;
      }

      if (event.key === 'Backspace' && !currentInputValue() && state.value.length > 0) {
        removeTag(state.value.length - 1);
      }
    };

    input.on('keydown', (event) => handleKeydown(event));

    /** 读写标签数组。 */
    api.value = (next) => {
      if (next === undefined) {
        return [...state.value];
      }

      state.value = (Array.isArray(next) ? next : []).map((item) => String(item)).filter(Boolean);
      renderChips();
      notifyChange();
      return api;
    };

    // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
    api.isDisabled = () => state.disabled;

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
      return api;
    };

    /** 注册标签变化回调（后一次注册替换前一次，与旧方法面一致）。 */
    api.change = (handler) => {
      if (handler === undefined) {
        return state.changeHandlers.slice();
      }

      state.changeHandlers = [handler];
      return api;
    };

    api.onChange = (handler) => api.change(handler);

    /** 字符串 / 数组 = 初始标签（旧 `_setupTagsInput` 的兜底分支）。 */
    api.setupString = (next) => api.value(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupTagsInput` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { change, disabled, name, onChange, placeholder, required, value, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
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

    renderChips();
    return node;
  });
}

export const vTagsInput = createComponentShortcut(VTagsInput);

registerChildFactories(HtmlElementNode, { vTagsInput });
