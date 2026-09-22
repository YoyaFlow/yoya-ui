import { createComponentShell } from '../../components/component-shell.js';
import { defineComponentIdentity } from '../../core/node.js';
import { ViewNode } from '../../core/node.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  booleanMethod,
  componentClass,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { createClearButton, syncClearButton } from './shared.js';

class SelectNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._identity = 'VSelect';
    this._options = [];
    this._placeholder = '';
    this._value = '';
    this._clearable = true;
    this._clearButton = createClearButton('VSelectClear', {
      right: '30px',
      top: '50%',
      transform: 'translateY(-50%)'
    });
    this._input = new HtmlElementNode('select').className(componentClass, 'yoya-vselect').styles({
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border-strong', '#cbd5e1'),
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: themeValue('color-text', '#172033'),
      cursor: 'pointer',
      font: 'inherit',
      minHeight: 'var(--yoya-control-height-md, 34px)',
      outline: 'none',
      padding: '0 32px 0 12px',
      width: '100%'
    });

    this._addRootClass(componentClass, 'yoya-vselect-wrap');
    this.styles({
      minWidth: '0',
      position: 'relative',
      width: '100%'
    });
    this._clearButton.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.clear();
      this._input._el?.focus();
    });
    this._input.on('change', () => this._syncClear());
    this.child(this._input, this._clearButton);

    this.required = booleanMethod(this, 'required', false, (enabled) => {
      this._input.attr('required', enabled ? true : null);
    });
    this.disabled = booleanMethod(this, 'disabled', false, (enabled) => {
      this._input.attr('disabled', enabled ? true : null);
      this._input.style('cursor', enabled ? 'not-allowed' : 'pointer');
      this._input.style('opacity', enabled ? '0.64' : '1');
      this._syncClear();
    });
    this.error = booleanMethod(this, 'error', false, (enabled) => {
      this._input.attr('data-error', enabled ? 'true' : null);
      this._input.style(
        'borderColor',
        enabled
          ? themeValue('color-danger', '#dc2626')
          : themeValue('color-border-strong', '#cbd5e1')
      );
      this._input.style(
        'boxShadow',
        enabled ? `0 0 0 1px ${themeValue('color-danger-ring', 'rgba(220, 38, 38, 0.2)')}` : null
      );
    });

    this._setupSelect(setup);
    this._syncClearPadding();
    this._syncClear();
  }

  _addRootClass(...classes) {
    super.className(...classes);
    return this;
  }

  className(...classes) {
    if (classes.length === 0) {
      return this._input.className();
    }

    this._input.className(...classes);
    return this;
  }

  attr(name, value) {
    if (name && typeof name === 'object') {
      Object.entries(name).forEach(([key, nextValue]) => this.attr(key, nextValue));
      return this;
    }

    if (name === 'value') {
      return value === undefined ? this.value() : this.value(value);
    }

    if (value === undefined) {
      return this._input.attr(name);
    }

    this._input.attr(name, value);
    return this;
  }

  on(eventName, handler, options) {
    if (this._input && (eventName === 'focus' || eventName === 'blur')) {
      this._input.on(eventName, handler, options);
      return this;
    }

    return super.on(eventName, handler, options);
  }

  id(value) {
    if (value === undefined) {
      return this._input.id();
    }

    this._input.id(value);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this._input.name();
    }

    this._input.name(value);
    return this;
  }

  textContent() {
    return this._input.textContent();
  }

  value(value) {
    if (value === undefined) {
      return this._input._el?.value ?? this._value ?? '';
    }

    this._value = resolveTextValue(value);
    this._renderOptions();
    this._syncClear();
    return this;
  }

  hydrateSnapshot() {
    if (this._input._el) {
      this.value(this._input._el.value);
    }
    return this;
  }

  text(value) {
    return this.value(value);
  }

  content(value) {
    return this.value(value);
  }

  placeholder(value) {
    if (value === undefined) {
      return this._placeholder;
    }

    this._placeholder = resolveTextValue(value);
    this._renderOptions();
    return this;
  }

  options(value) {
    if (value === undefined) {
      return this._options.slice();
    }

    this._options = Array.isArray(value) ? value.slice() : [];
    this._renderOptions();
    return this;
  }

  // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
  isDisabled() {
    return this._disabled.value;
  }

  // 下拉选择没有只读态，恒为 false，供清空按钮判别直接调用
  isReadonly() {
    return false;
  }

  isError() {
    return this._error.value;
  }

  clearable(value) {
    if (value === undefined) {
      return this._clearable;
    }

    this._clearable = Boolean(value);
    this._input.attr('data-clearable', this._clearable ? 'true' : null);
    this._renderOptions();
    this._syncClearPadding();
    this._syncClear();
    return this;
  }

  clear() {
    this.value('');

    if (this._input._el) {
      this._input._el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return this;
  }

  _syncClear() {
    syncClearButton(this, this._input, this._clearButton);
    return this;
  }

  _syncClearPadding() {
    this._input.style('paddingRight', this._clearable ? '52px' : '32px');
    return this;
  }

  _renderOptions() {
    const nodes = [];
    const selectedValue = resolveTextValue(this._value);

    if (this._placeholder) {
      const placeholderNode = new HtmlElementNode('option').className('yoya-vselect-option');
      placeholderNode.attr({ disabled: true, value: '' });
      placeholderNode.attr('selected', selectedValue ? null : true);
      placeholderNode.styles({
        color: themeValue('color-border-muted', '#94a3b8')
      });
      replaceChildren(placeholderNode, normalizeChildren(this._placeholder));
      nodes.push(placeholderNode);
    } else if (this._clearable && !selectedValue) {
      const clearPlaceholderNode = new HtmlElementNode('option')
        .className('yoya-vselect-option')
        .attr({ selected: true, value: '' })
        .styles({
          color: themeValue('color-border-muted', '#94a3b8')
        });
      nodes.push(clearPlaceholderNode);
    }

    this._options.forEach((option, index) => {
      nodes.push(createSelectOptionNode(option, selectedValue, index));
    });

    replaceChildren(this._input, nodes);

    if (this._input._el) {
      this._input._el.value = selectedValue;
    }
  }

  _setupSelect(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        clearable,
        children,
        content,
        disabled,
        error,
        options,
        placeholder,
        required,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }

      if (options !== undefined) {
        this.options(options);
      }

      if (value !== undefined) {
        this.value(value);
      } else if (text !== undefined) {
        this.value(text);
      } else if (content !== undefined) {
        this.value(content);
      } else if (children !== undefined) {
        this.value(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (error !== undefined) {
        this.error(error);
      }

      if (clearable !== undefined) {
        this.clearable(clearable);
      }

      return;
    }

    this.value(setup);
  }
}

export function vSelect(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VSelect',
    createNode: (setup) => new SelectNode(setup),
    commands: [
      'value',
      'text',
      'content',
      'placeholder',
      'options',
      'isDisabled',
      'isReadonly',
      'isError',
      'clearable',
      'clear',
      // 构造函数里用 booleanMethod 挂的开关方法
      'required',
      'disabled',
      'error'
    ],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VSelect = vSelect;
defineComponentIdentity(VSelect, 'VSelect');

function createSelectOptionNode(option, selectedValue, index) {
  if (option instanceof HtmlElementNode && option.tagName?.() === 'option') {
    const node = option;
    node.attr('selected', resolveTextValue(node.attr('value')) === selectedValue ? true : null);
    return node;
  }

  const normalized = normalizeSelectOption(option, index);
  const node = new HtmlElementNode('option').className('yoya-vselect-option');
  const isSelected = normalized.value === selectedValue;

  node.attr('value', normalized.value);
  node.attr('selected', isSelected ? true : null);

  if (normalized.disabled) {
    node.attr('disabled', true);
  }

  if (isSelected) {
    node.styles({
      color: themeValue('color-text', '#172033')
    });
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
