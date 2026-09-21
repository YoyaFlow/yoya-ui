import { createComponentShell } from '../../components/component-shell.js';
import { applyPropValue } from '../../core/node.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  booleanMethod,
  componentClass,
  isPlainObject,
  resolveTextValue,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { createClearButton, syncClearButton } from './shared.js';

export class InputNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    // 身份：对象事实 + 真 DOM 标记（根是外壳 div；attr 被重写到内层 input，所以显式写根）
    this._identity = 'VInput';
    super.attr('vn', 'VInput');
    this._value = '';
    this._clearable = true;
    this._clearButton = createClearButton('yoya-vinput-clear', {
      right: '6px',
      top: '50%',
      transform: 'translateY(-50%)'
    });
    this._input = new HtmlElementNode('input')
      .className(componentClass, 'yoya-vinput')
      .attr('type', 'text')
      .styles({
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
      });

    this._addRootClass(componentClass, 'yoya-vinput-wrap');
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

    // 内部状态用 ref 持有、对外只暴露方法（票 01 约定，见 booleanMethod）
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
    this.required = booleanMethod(this, 'required', false, (enabled) => {
      this._input.attr('required', enabled ? true : null);
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

    this._setupInput(setup);
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

  type(value) {
    if (value === undefined) {
      return this._input.attr('type');
    }

    this._input.attr('type', value || 'text');
    return this;
  }

  value(value) {
    if (value === undefined) {
      return this._input._el?.value ?? this._value ?? this._input.attr('value') ?? '';
    }

    const next = resolveTextValue(value);
    this._value = next;
    this._input.attr('value', next);
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

  /**
   * 权限状态落位：只读时用自身 disabled() 禁用内层输入。
   */
  _applyAccessState(state) {
    if (state === 'readonly') {
      this._accessDisabled = true;
      this.disabled(true);
    } else if (this._accessDisabled) {
      this._accessDisabled = false;
      this.disabled(false);
    }
  }

  _setupInput(setup) {
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
        text,
        type,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (type !== undefined) {
        applyPropValue(this, type, (next) => this.type(next));
      }

      if (placeholder !== undefined) {
        applyPropValue(this, placeholder, (next) => this.placeholder(next));
      }

      if (value !== undefined) {
        applyPropValue(this, value, (next) => this.value(next));
      } else if (text !== undefined) {
        applyPropValue(this, text, (next) => this.value(next));
      } else if (content !== undefined) {
        applyPropValue(this, content, (next) => this.value(next));
      } else if (children !== undefined) {
        applyPropValue(this, children, (next) => this.value(next));
      }

      if (required !== undefined) {
        applyPropValue(this, required, (next) => this.required(next));
      }

      if (readonly !== undefined) {
        applyPropValue(this, readonly, (next) => this.readonly(next));
      }

      if (disabled !== undefined) {
        applyPropValue(this, disabled, (next) => this.disabled(next));
      }

      if (error !== undefined) {
        applyPropValue(this, error, (next) => this.error(next));
      }

      if (clearable !== undefined) {
        applyPropValue(this, clearable, (next) => this.clearable(next));
      }

      return;
    }

    this.placeholder(setup);
  }
}

export function vInput(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VInput',
    createNode: (setup) => new InputNode(setup),
    commands: [
      'type',
      'value',
      'text',
      'content',
      'placeholder',
      'isDisabled',
      'isReadonly',
      'isError',
      'clearable',
      'clear',
      // 构造函数里用 booleanMethod 挂的开关方法
      'disabled',
      'readonly',
      'required',
      'error'
    ],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VInput = vInput;
