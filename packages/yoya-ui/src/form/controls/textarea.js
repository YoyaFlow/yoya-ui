import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { applyPropValue } from '@yoyaflow/yoya-core/internal/core/node.js';
import { optionKindOf } from '@yoyaflow/yoya-core/internal/core/setup-keys.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { div, textarea as textareaTag } from '@yoyaflow/yoya-core/html';
import { createClearButton, syncClearButton } from './shared.js';

/**
 * VTextarea —— 有行为（值 / 行数 / 开关 / 清空）→ **形态 B**：定义函数只描述组件
 * （结构 + 命令 + 身份），位置参数分派交给快捷方法 `vTextarea`。
 *
 * 元素机制（内层 textarea 的属性 / 样式 / 事件、SSR 回读、权限落位）住在闭包的局部节点上；
 * 参数分派按 `setupFunction / setupString / setupObject`（api 覆盖优先、否则回落视图根）。
 */
export function VTextarea() {
  return vNode((api) => {
    const state = {
      clearable: true,
      disabled: false,
      error: false,
      readonly: false,
      required: false,
      value: ''
    };

    const field = textareaTag({
      style: {
        background: themeValue('color-surface', '#ffffff'),
        border: themeBorder('color-border-strong', '#cbd5e1'),
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: themeValue('color-text', '#172033'),
        font: 'inherit',
        minHeight: '88px',
        outline: 'none',
        padding: '10px 12px',
        resize: 'vertical',
        width: '100%'
      },
      vn: 'VTextareaField'
    });
    const clearButton = createClearButton('VTextareaClear', { right: '6px', top: '6px' });
    const root = div({
      style: { minWidth: '0', position: 'relative', width: '100%' },
      vn: 'VTextarea'
    });

    // 清空按钮的判定读 api：_clearable / isDisabled() / isReadonly() / value()
    const syncClear = () => syncClearButton(api, field, clearButton);
    const syncClearPadding = () => {
      field.style('paddingRight', state.clearable ? '34px' : '12px');
    };

    api.value = (value) => {
      if (value === undefined) {
        return field.prop('value') ?? state.value ?? field.textContent();
      }

      const next = resolveTextValue(value);
      state.value = next;
      replaceChildren(field, next ? normalizeChildren(next) : []);
      field.prop('value', next);

      syncClear();
      return api;
    };
    api.text = (value) => api.value(value);
    api.content = (value) => api.value(value);

    api.placeholder = (value) => {
      if (value === undefined) {
        return field.attr('placeholder');
      }

      field.attr('placeholder', resolveTextValue(value) || null);
      return api;
    };

    api.rows = (value) => {
      if (value === undefined) {
        return field.attr('rows');
      }

      field.attr('rows', value);
      return api;
    };

    api.attr = (name, value) => {
      if (name && typeof name === 'object') {
        Object.entries(name).forEach(([key, nextValue]) => api.attr(key, nextValue));
        return api;
      }

      if (name === 'value') {
        return value === undefined ? api.value() : api.value(value);
      }

      if (value === undefined) {
        return field.attr(name);
      }

      field.attr(name, value);
      return api;
    };

    api.className = (...classes) => {
      if (classes.length === 0) {
        return field.className();
      }

      field.className(...classes);
      return api;
    };

    api.id = (value) => {
      if (value === undefined) {
        return field.id();
      }

      field.id(value);
      return api;
    };

    api.name = (value) => {
      if (value === undefined) {
        return field.name();
      }

      field.name(value);
      return api;
    };

    api.textContent = () => field.textContent();

    // 读写分离：跨组件只读判断走这三个（票 02 方案 c）
    api.isDisabled = () => state.disabled;
    api.isReadonly = () => state.readonly;
    api.isError = () => state.error;

    api.disabled = (value) => {
      if (value === undefined) {
        return state.disabled;
      }

      state.disabled = Boolean(value);
      field.attr('disabled', state.disabled ? true : null);
      field.style('cursor', state.disabled ? 'not-allowed' : 'text');
      field.style('opacity', state.disabled ? '0.64' : '1');
      syncClear();
      return api;
    };

    api.readonly = (value) => {
      if (value === undefined) {
        return state.readonly;
      }

      state.readonly = Boolean(value);
      field.attr('readonly', state.readonly ? true : null);
      syncClear();
      return api;
    };

    api.required = (value) => {
      if (value === undefined) {
        return state.required;
      }

      state.required = Boolean(value);
      field.attr('required', state.required ? true : null);
      return api;
    };

    api.error = (value) => {
      if (value === undefined) {
        return state.error;
      }

      state.error = Boolean(value);
      field.attr('data-error', state.error ? 'true' : null);
      field.style(
        'borderColor',
        state.error
          ? themeValue('color-danger', '#dc2626')
          : themeValue('color-border-strong', '#cbd5e1')
      );
      field.style(
        'boxShadow',
        state.error
          ? `0 0 0 1px ${themeValue('color-danger-ring', 'rgba(220, 38, 38, 0.2)')}`
          : null
      );
      return api;
    };

    api.clearable = (value) => {
      if (value === undefined) {
        return state.clearable;
      }

      state.clearable = Boolean(value);
      field.attr('data-clearable', state.clearable ? 'true' : null);
      syncClearPadding();
      syncClear();
      return api;
    };

    api.clear = () => {
      api.value('');

      field.emit('input');
      field.emit('change');

      return api;
    };

    // 参数分派：字符串 = 值；对象 = 逐键（class / attrs 落内层，style 落外壳，其余走同名命令）
    api.setupString = (value) => api.value(value);
    api.setupObject = (options) => {
      if (!isPlainObject(options)) {
        return api;
      }

      const {
        children,
        clearable,
        content,
        disabled,
        error,
        placeholder,
        readonly,
        required,
        rows,
        text,
        value,
        ...elementConfig
      } = options;

      Object.entries(elementConfig).forEach(([key, optionValue]) => {
        const kind = optionKindOf(key);
        if (kind === 'class') {
          applyPropValue(root, optionValue, (next) => api.className(next));
          return;
        }
        if (kind === 'attrs') {
          api.attr(optionValue);
          return;
        }
        if (kind === 'style') {
          root.styles(optionValue);
          return;
        }
        if (key.startsWith('on') && typeof optionValue === 'function') {
          root.on(key.slice(2).toLowerCase(), optionValue);
          return;
        }
        if (typeof api[key] === 'function') {
          applyPropValue(root, optionValue, (next) => api[key](next));
          return;
        }
        api.attr(key, optionValue);
      });

      if (rows !== undefined) {
        applyPropValue(root, rows, (next) => api.rows(next));
      }
      if (placeholder !== undefined) {
        applyPropValue(root, placeholder, (next) => api.placeholder(next));
      }
      if (value !== undefined) {
        applyPropValue(root, value, (next) => api.value(next));
      } else if (text !== undefined) {
        applyPropValue(root, text, (next) => api.value(next));
      } else if (content !== undefined) {
        applyPropValue(root, content, (next) => api.value(next));
      } else if (children !== undefined) {
        applyPropValue(root, children, (next) => api.value(next));
      }
      if (required !== undefined) {
        applyPropValue(root, required, (next) => api.required(next));
      }
      if (readonly !== undefined) {
        applyPropValue(root, readonly, (next) => api.readonly(next));
      }
      if (disabled !== undefined) {
        applyPropValue(root, disabled, (next) => api.disabled(next));
      }
      if (error !== undefined) {
        applyPropValue(root, error, (next) => api.error(next));
      }
      if (clearable !== undefined) {
        applyPropValue(root, clearable, (next) => api.clearable(next));
      }

      return api;
    };

    // 元素机制挂到局部节点：SSR 回读走内层节点，权限落位走视图根（渲染路径按节点调用）
    field.hydrateSnapshot = () => {
      if (field.isLanded()) {
        api.value(field.prop('value'));
      }
      return field;
    };
    let accessDisabled = false;
    root._applyAccessState = (accessState) => {
      if (accessState === 'readonly') {
        accessDisabled = true;
        api.disabled(true);
      } else if (accessDisabled) {
        accessDisabled = false;
        api.disabled(false);
      }
    };

    field.on('input', syncClear);
    field.on('change', syncClear);
    clearButton.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      api.clear();
      field.focus();
    });

    root.child(field, clearButton);
    // 取用方法：包在里面的原生输入元素（vField 的浮动编辑面要写它的样式，见 16 号清单第 23 条）
    api.inputUnit = () => field;
    syncClearPadding();
    syncClear();
    return root;
  });
}

export const vTextarea = createComponentShortcut(VTextarea);
