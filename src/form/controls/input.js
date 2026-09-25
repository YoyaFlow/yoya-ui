import { applyPropValue } from '../../core/node.js';
import { optionKindOf } from '../../core/setup-keys.js';
import { vNode } from '../../core/v-node.js';
import { div, input as inputTag } from '../../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  resolveTextValue,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { createClearButton, syncClearButton } from './shared.js';

/**
 * 文本输入（形态 B）：视图根是外壳 `div` + 内层 `input` + 清空按钮。
 *
 * - 身份写在结构里：根 `vn: 'VInput'`、内层 `vn: 'VInputField'`、清空按钮 `vn: 'VInputClear'`
 *   （能力类 `yoya-control-clear` 保留——跨组件能力类不退场）；
 * - 元素级方法按控件语义**路由到内层 input**（`attr` / `className` / `id` / `name` / `type` /
 *   `value` / `placeholder` / `textContent`）：命令写在 api 上，调用方拿组件句柄直接调；
 * - 两个元素机制挂在局部节点上（渲染路径按节点调用）：SSR 回读 `hydrateSnapshot` 走内层 input，
 *   权限落位 `_applyAccessState` 走视图根（与 `VTextarea` 同一写法，见 16 号清单第 27 条）；
 * - 内层输入元素的取用方法 `inputUnit()`：族内（vField 浮动编辑面等）需要它时不用解包视图根。
 */
export function VInput() {
  return vNode((api) => {
    const state = {
      clearable: true,
      disabled: false,
      error: false,
      readonly: false,
      required: false,
      value: ''
    };

    const field = inputTag({
      style: {
        background: themeValue('color-surface', '#ffffff'),
        border: themeBorder('color-border-strong', '#cbd5e1'),
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: themeValue('color-text', '#172033'),
        font: 'inherit',
        minHeight: 'var(--yoya-control-height-md, 34px)',
        outline: 'none',
        padding: '0 12px',
        width: '100%'
      },
      type: 'text',
      vn: 'VInputField'
    });
    const clearButton = createClearButton('VInputClear', {
      right: '6px',
      top: '50%',
      transform: 'translateY(-50%)'
    });
    const node = div(
      {
        style: { minWidth: '0', position: 'relative', width: '100%' },
        vn: 'VInput'
      },
      (root) => root.child(field, clearButton)
    );

    // 清空按钮的判定读 api：clearable() / isDisabled() / isReadonly() / value()
    const syncClear = () => syncClearButton(api, field, clearButton);
    const syncClearPadding = () => field.style('paddingRight', state.clearable ? '34px' : '12px');

    const applyDisabled = () => {
      field.attr('disabled', state.disabled ? true : null);
      field.style('cursor', state.disabled ? 'not-allowed' : 'text');
      field.style('opacity', state.disabled ? '0.64' : '1');
      syncClear();
    };
    const applyReadonly = () => {
      field.attr('readonly', state.readonly ? true : null);
      syncClear();
    };
    const applyRequired = () => field.attr('required', state.required ? true : null);
    const applyError = () => {
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
    };
    const booleanCommand = (key, apply) => (value) => {
      if (value === undefined) {
        return state[key];
      }

      state[key] = Boolean(value);
      apply();
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

    /** 取用方法：包在里面的原生输入元素（族内用法，见 16 号清单第 23 条）。 */
    api.inputUnit = () => field;

    api.type = (value) => {
      if (value === undefined) {
        return field.attr('type');
      }

      field.attr('type', value || 'text');
      return api;
    };

    api.value = (value) => {
      if (value === undefined) {
        return field.prop('value') ?? state.value ?? field.attr('value') ?? '';
      }

      const next = resolveTextValue(value);

      if (next === '' && state.value !== '') {
        console.log('[eng-value] 清空', JSON.stringify(state.value), 'landed=', field.isLanded());
      }
      state.value = next;
      field.attr('value', next);
      syncClear();
      return api;
    };

    api.text = (value) => api.value(value);
    api.content = (value) => api.value(value);

    api.placeholder = (value) => {
      if (value === undefined) {
        return field.attr('placeholder');
      }

      const next = resolveTextValue(value);

      field.attr('placeholder', next || null);
      return api;
    };

    api.disabled = booleanCommand('disabled', applyDisabled);
    api.readonly = booleanCommand('readonly', applyReadonly);
    api.required = booleanCommand('required', applyRequired);
    api.error = booleanCommand('error', applyError);

    // 读写分离：跨组件只读判断走这三个方法（票 02 方案 c）
    api.isDisabled = () => state.disabled;
    api.isReadonly = () => state.readonly;
    api.isError = () => state.error;

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

    /** 字符串 / 数字 = 占位符（旧 `_setupInput` 的兜底分支）。 */
    api.setupString = (value) => api.placeholder(value);

    /**
     * props 分派：本组件的键走命令；**元素分派（`class` / `attrs` / `style` / `onXxx` / `vn` /
     * 其它节点方法如 `access`）交回引擎**，只有「普通属性」按控件语义写到内层 input
     * （旧 `InputNode.attr` 的口径）。判定顺序与 `ElementNode._setupObject` 一致，只把属性这一支改道。
     */
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
        text,
        type,
        value,
        ...elementConfig
      } = options;

      const engineConfig = {};

      Object.entries(elementConfig).forEach(([key, optionValue]) => {
        const kind = optionKindOf(key);

        if (kind === 'class') {
          applyPropValue(node, optionValue, (next) => api.className(next));
          return;
        }
        if (kind === 'attrs') {
          api.attr(optionValue);
          return;
        }
        if (kind === 'style') {
          node.styles(optionValue);
          return;
        }
        if (key.startsWith('on') && typeof optionValue === 'function') {
          node.on(key.slice(2).toLowerCase(), optionValue);
          return;
        }
        // 身份交回引擎的元素分派（写根元素）
        if (key === 'vn') {
          engineConfig[key] = optionValue;
          return;
        }
        // 本组件的命令优先（name / id / textContent … 这些节点上也有同名方法，按控件语义走内层 input）
        if (typeof api[key] === 'function') {
          applyPropValue(node, optionValue, (next) => api[key](next));
          return;
        }
        // 其余节点方法（access / mountable / whenFailed …）交回引擎的元素分派
        if (typeof node[key] === 'function') {
          engineConfig[key] = optionValue;
          return;
        }

        applyPropValue(node, optionValue, (next) => api.attr(key, next));
      });

      if (Object.keys(engineConfig).length > 0) {
        node.setup(engineConfig);
      }

      if (type !== undefined) {
        applyPropValue(node, type, (next) => api.type(next));
      }
      if (placeholder !== undefined) {
        applyPropValue(node, placeholder, (next) => api.placeholder(next));
      }
      if (value !== undefined) {
        applyPropValue(node, value, (next) => api.value(next));
      } else if (text !== undefined) {
        applyPropValue(node, text, (next) => api.value(next));
      } else if (content !== undefined) {
        applyPropValue(node, content, (next) => api.value(next));
      } else if (children !== undefined) {
        applyPropValue(node, children, (next) => api.value(next));
      }
      if (required !== undefined) {
        applyPropValue(node, required, (next) => api.required(next));
      }
      if (readonly !== undefined) {
        applyPropValue(node, readonly, (next) => api.readonly(next));
      }
      if (disabled !== undefined) {
        applyPropValue(node, disabled, (next) => api.disabled(next));
      }
      if (error !== undefined) {
        applyPropValue(node, error, (next) => api.error(next));
      }
      if (clearable !== undefined) {
        applyPropValue(node, clearable, (next) => api.clearable(next));
      }

      return api;
    };

    // 元素机制挂到局部节点：SSR 回读走内层 input，权限落位走视图根（渲染路径按节点调用）
    field.hydrateSnapshot = () => {
      if (field.isLanded()) {
        console.log('[eng-hydrate] 回读', JSON.stringify(field.prop('value')));
        api.value(field.prop('value'));
      }
      return field;
    };
    let accessDisabled = false;
    node._applyAccessState = (accessState) => {
      if (accessState === 'readonly') {
        accessDisabled = true;
        api.disabled(true);
      } else if (accessDisabled) {
        accessDisabled = false;
        api.disabled(false);
      }
    };

    clearButton.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      api.clear();
      field.focus();
    });
    field.on('input', syncClear);
    field.on('change', syncClear);

    syncClearPadding();
    syncClear();
    return node;
  });
}

export const vInput = createComponentShortcut(VInput);
