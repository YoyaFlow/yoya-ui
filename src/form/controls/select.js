import { applyPropValue, ViewNode } from '../../core/node.js';
import { optionKindOf } from '../../core/setup-keys.js';
import { vNode } from '../../core/v-node.js';
import {
  div,
  HtmlElementNode,
  option as optionTag,
  select as selectTag
} from '../../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue
} from '../../components/shared.js';
import { createClearButton, syncClearButton } from './shared.js';

/**
 * 下拉选择（形态 B）：视图根是外壳 `div` + 内层 `select` + 清空按钮，选项由数据渲染。
 *
 * - 身份写在结构里：根 `vn: 'VSelect'`、内层 `vn: 'VSelectField'`、选项 `vn: 'VSelectOption'`、
 *   清空按钮 `vn: 'VSelectClear'`（能力类 `yoya-control-clear` 保留）；
 * - 静态样式全在 `yoya.ui.css`（R5）；随状态变的几何 / 配色（清空留白、禁用、报错、选中项）走
 *   元素上的 `data-clearable` / `disabled` / `data-error` / `selected` 属性规则，JS 只写状态；
 * - 元素级方法按控件语义路由到内层 select（`attr` / `className` / `id` / `name` / `value` / `placeholder` …），
 *   命令写在 api 上，调用方拿组件句柄直接调；
 * - SSR 回读 `hydrateSnapshot` 挂内层 select（渲染路径按节点调用）；
 * - props 分派与 `VInput` 同口径：本组件命令优先，元素分派（`class` / `attrs` / `style` / `onXxx` / `vn` /
 *   其它节点方法如 `access`）交回引擎，剩下的按属性写内层 select（见 16 号清单第 29 条）。
 */
export function VSelect() {
  return vNode((api) => {
    const state = {
      clearable: true,
      disabled: false,
      error: false,
      options: [],
      placeholder: '',
      required: false,
      value: ''
    };

    // `data-clearable` 是"要不要给清空按钮留位置"的状态真源（CSS 规则读它，见 yoya.ui.css）
    const field = selectTag({
      'data-clearable': state.clearable ? 'true' : null,
      vn: 'VSelectField'
    });
    const clearButton = createClearButton('VSelectClear', {
      right: '30px',
      top: '50%',
      transform: 'translateY(-50%)'
    });
    const node = div({ vn: 'VSelect' }, (root) => root.child(field, clearButton));

    // 清空按钮的判定读 api：clearable() / isDisabled() / isReadonly() / value()
    const syncClear = () => syncClearButton(api, field, clearButton);

    const renderOptions = () => {
      const nodes = [];
      const selectedValue = resolveTextValue(state.value);

      if (state.placeholder) {
        // 身份之外再给个标记：占位项的置灰色归 CSS（`[data-placeholder]` 规则）
        const placeholderNode = optionTag({
          'data-placeholder': 'true',
          disabled: true,
          value: '',
          vn: 'VSelectOption'
        });

        placeholderNode.attr('selected', selectedValue ? null : true);
        replaceChildren(placeholderNode, normalizeChildren(state.placeholder));
        nodes.push(placeholderNode);
      } else if (state.clearable && !selectedValue) {
        // 空项自己没有文案（`color` 不可观察），只留结构
        nodes.push(optionTag({ selected: true, value: '', vn: 'VSelectOption' }));
      }

      state.options.forEach((option, index) => {
        nodes.push(createSelectOptionNode(option, selectedValue, index));
      });

      replaceChildren(field, nodes);

      if (field._el) {
        field._el.value = selectedValue;
      }
    };

    const applyDisabled = () => {
      field.attr('disabled', state.disabled ? true : null);
      syncClear();
    };
    const applyRequired = () => field.attr('required', state.required ? true : null);
    const applyError = () => field.attr('data-error', state.error ? 'true' : null);
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

    api.value = (value) => {
      if (value === undefined) {
        return field._el?.value ?? state.value ?? '';
      }

      state.value = resolveTextValue(value);
      renderOptions();
      syncClear();
      return api;
    };

    api.text = (value) => api.value(value);
    api.content = (value) => api.value(value);

    api.placeholder = (value) => {
      if (value === undefined) {
        return state.placeholder;
      }

      state.placeholder = resolveTextValue(value);
      renderOptions();
      return api;
    };

    api.options = (value) => {
      if (value === undefined) {
        return state.options.slice();
      }

      state.options = Array.isArray(value) ? value.slice() : [];
      renderOptions();
      return api;
    };

    api.disabled = booleanCommand('disabled', applyDisabled);
    api.required = booleanCommand('required', applyRequired);
    api.error = booleanCommand('error', applyError);

    // 读写分离：跨组件只读判断走这三个方法（票 02 方案 c）
    api.isDisabled = () => state.disabled;
    // 下拉选择没有只读态，恒为 false，供清空按钮判别直接调用
    api.isReadonly = () => false;
    api.isError = () => state.error;

    api.clearable = (value) => {
      if (value === undefined) {
        return state.clearable;
      }

      state.clearable = Boolean(value);
      field.attr('data-clearable', state.clearable ? 'true' : null);
      renderOptions();
      syncClear();
      return api;
    };

    api.clear = () => {
      api.value('');

      if (field._el) {
        field._el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return api;
    };

    /** 字符串 / 数字 = 选中值（旧 `_setupSelect` 的兜底分支）。 */
    api.setupString = (value) => api.value(value);

    /** props：本组件的键走命令，其余按引擎的元素分派落位（与 `VInput` 同口径）。 */
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
        options: optionList,
        placeholder,
        required,
        text,
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
        if (key === 'vn') {
          engineConfig[key] = optionValue;
          return;
        }
        if (typeof api[key] === 'function') {
          applyPropValue(node, optionValue, (next) => api[key](next));
          return;
        }
        if (typeof node[key] === 'function') {
          engineConfig[key] = optionValue;
          return;
        }

        applyPropValue(node, optionValue, (next) => api.attr(key, next));
      });

      if (Object.keys(engineConfig).length > 0) {
        node.setup(engineConfig);
      }

      if (placeholder !== undefined) {
        applyPropValue(node, placeholder, (next) => api.placeholder(next));
      }
      if (optionList !== undefined) {
        applyPropValue(node, optionList, (next) => api.options(next));
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

    // 元素机制挂到内层 select：SSR 回读按节点调用
    field.hydrateSnapshot = () => {
      if (field._el) {
        api.value(field._el.value);
      }
      return field;
    };

    clearButton.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      api.clear();
      field._el?.focus();
    });
    field.on('change', syncClear);

    renderOptions();
    syncClear();
    return node;
  });
}

export const vSelect = createComponentShortcut(VSelect);

function createSelectOptionNode(option, selectedValue, index) {
  if (option instanceof HtmlElementNode && option.tagName?.() === 'option') {
    const node = option;
    node.attr('selected', resolveTextValue(node.attr('value')) === selectedValue ? true : null);
    return node;
  }

  const normalized = normalizeSelectOption(option, index);
  const node = optionTag({ vn: 'VSelectOption' });
  const isSelected = normalized.value === selectedValue;

  node.attr('value', normalized.value);
  node.attr('selected', isSelected ? true : null);

  if (normalized.disabled) {
    node.attr('disabled', true);
  }

  replaceChildren(node, normalizeChildren(normalized.label));
  return node;
}

function normalizeSelectOption(option, index) {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const text = resolveTextValue(option);
    return {
      label: text,
      value: text
    };
  }

  if (Array.isArray(option) && option.length > 0) {
    const [value, label = value] = option;
    return {
      label: label ?? value ?? '',
      value: resolveTextValue(value)
    };
  }

  if (option instanceof ViewNode) {
    const text = option.textContent();
    return {
      label: option,
      value: text
    };
  }

  if (isPlainObject(option)) {
    const value =
      option.value ??
      option.key ??
      option.id ??
      option.label ??
      option.text ??
      option.title ??
      `option-${index}`;
    const label = option.label ?? option.text ?? option.content ?? option.title ?? value;

    return {
      disabled: Boolean(option.disabled),
      label,
      value: resolveTextValue(value)
    };
  }

  const text = resolveTextValue(option);
  return {
    label: text,
    value: text
  };
}

export { createSelectOptionNode, normalizeSelectOption };
