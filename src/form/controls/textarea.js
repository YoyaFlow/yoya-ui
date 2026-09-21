import { HtmlElementNode } from '../../html/index.js';
import {
  booleanMethod,
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { createClearButton, syncClearButton } from './shared.js';

export class VTextarea extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._value = '';
    this._clearable = true;
    this._clearButton = createClearButton('yoya-vtextarea-clear', {
      right: '6px',
      top: '6px'
    });
    this._input = new HtmlElementNode('textarea')
      .className(componentClass, 'yoya-vtextarea')
      .styles({
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
      });

    this._addRootClass(componentClass, 'yoya-vtextarea-wrap');
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
    this._input.on('input', () => this._syncClear());
    this._input.on('change', () => this._syncClear());
    this.child(this._input, this._clearButton);

    this.required = booleanMethod(this, 'required', false, (enabled) => {
      this._input.attr('required', enabled ? true : null);
    });
    this.disabled = booleanMethod(this, 'disabled', false, (enabled) => {
      this._input.attr('disabled', enabled ? true : null);
      this._input.style('cursor', enabled ? 'not-allowed' : 'text');
      this._input.style('opacity', enabled ? '0.64' : '1');
      this._syncClear();
    });
    this.readonly = booleanMethod(this, 'readonly', false, (enabled) => {
      this._input.attr('readonly', enabled ? true : null);
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

    this._setupTextarea(setup);
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
      return this._input._el?.value ?? this._value ?? this._input.textContent();
    }

    const next = resolveTextValue(value);
    this._value = next;
    replaceChildren(this._input, next ? normalizeChildren(next) : []);

    if (this._input._el) {
      this._input._el.value = next;
    }

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
      return this._input.attr('placeholder');
    }

    const next = resolveTextValue(value);
    this._input.attr('placeholder', next || null);
    return this;
  }

  // 读写分离：跨组件只读判断走这两个方法（票 02 方案 c）
  isDisabled() {
    return this._disabled.value;
  }

  isReadonly() {
    return this._readonly.value;
  }

  isError() {
    return this._error.value;
  }

  rows(value) {
    if (value === undefined) {
      return this._input.attr('rows');
    }

    this._input.attr('rows', value);
    return this;
  }

  clearable(value) {
    if (value === undefined) {
      return this._clearable;
    }

    this._clearable = Boolean(value);
    this._input.attr('data-clearable', this._clearable ? 'true' : null);
    this._syncClearPadding();
    this._syncClear();
    return this;
  }

  clear() {
    this.value('');

    if (this._input._el) {
      this._input._el.dispatchEvent(new Event('input', { bubbles: true }));
      this._input._el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return this;
  }

  _syncClear() {
    syncClearButton(this, this._input, this._clearButton);
    return this;
  }

  _syncClearPadding() {
    this._input.style('paddingRight', this._clearable ? '34px' : '12px');
    return this;
  }

  _setupTextarea(setup) {
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
        placeholder,
        readonly,
        required,
        rows,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (rows !== undefined) {
        this.rows(rows);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
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

      if (readonly !== undefined) {
        this.readonly(readonly);
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

export function vTextarea(first = null, second = null, third = null) {
  return createComponentFactory(VTextarea, first, second, third, arguments);
}
