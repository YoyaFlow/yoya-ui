import { ViewNode } from '../../core/node.js';
import { HtmlElementNode } from '../../html/index.js';
import { VRate } from '../rate.js';
import {
  booleanMethod,
  componentClass,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  themeValue
} from '../../components/shared.js';

function createClearButton(className, position = {}) {
  return new HtmlElementNode('button')
    .className(className, 'yoya-control-clear')
    .attr({ type: 'button', 'aria-label': '清空', title: '清空' })
    .styles({
      alignItems: 'center',
      background: 'transparent',
      border: 'none',
      borderRadius: '4px',
      boxSizing: 'border-box',
      color: themeValue('color-text-muted', '#64748b'),
      cursor: 'pointer',
      display: 'inline-flex',
      flexShrink: '0',
      fontFamily: 'inherit',
      fontSize: '16px',
      fontWeight: '700',
      height: '18px',
      justifyContent: 'center',
      lineHeight: '1',
      margin: '0',
      padding: '0',
      position: 'absolute',
      width: '18px',
      zIndex: '1',
      ...position
    })
    .child('×');
}

function syncClearButton(control, inputNode, clearButton) {
  const value = inputNode._el?.value ?? control.value();
  const hasValue = Array.isArray(value)
    ? value.length > 0
    : value !== '' && value !== null && value !== undefined;
  // 能力判定优先：组件暴露 clearable() 就用它（不再依赖内部字段 `_clearable`）
  const clearable =
    typeof control.clearable === 'function' ? control.clearable() : control._clearable;
  const visible = clearable && hasValue && !control.isDisabled() && !control.isReadonly();

  clearButton.style('display', visible ? null : 'none');
}

class VBooleanControl extends HtmlElementNode {
  constructor(tagName) {
    super('label', null);
    this._kind = tagName;
    this._optionValue = 'on';
    this._input = new HtmlElementNode('input').className(`yoya-v${tagName}-input`);
    this._visualBox = new HtmlElementNode('span').className(`yoya-v${tagName}-visual`);
    this._contentBox = new HtmlElementNode('span').className(`yoya-v${tagName}-content`);
    this._labelBox = new HtmlElementNode('span').className(`yoya-v${tagName}-label`);
    this._descriptionBox = new HtmlElementNode('span')
      .className(`yoya-v${tagName}-description`)
      .style('display', 'none');

    this.className(componentClass, `yoya-v${tagName}`);
    this.styles({
      alignItems: 'center',
      cursor: 'pointer',
      display: 'inline-grid',
      gap: '10px',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      position: 'relative'
    });
    this._input.attr('type', 'checkbox');
    this._input.styles({
      height: '1px',
      margin: '0',
      opacity: '0',
      pointerEvents: 'none',
      position: 'absolute',
      width: '1px'
    });
    this._contentBox.styles({
      display: 'grid',
      gap: '2px',
      minWidth: '0'
    });
    this._labelBox.styles({
      color: themeValue('color-text', '#172033'),
      fontWeight: '600',
      lineHeight: '1.35'
    });
    this._descriptionBox.styles({
      color: themeValue('color-text-muted', '#64748b'),
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._contentBox.child(this._labelBox, this._descriptionBox);
    this.child(this._visualBox, this._input, this._contentBox);

    // 内部状态用 ref 持有、对外只暴露方法（票 01 约定，见 booleanMethod）
    this.checked = booleanMethod(this, 'checked', false, (enabled) => {
      this.attr('data-checked', enabled ? 'true' : null);
      this._input.attr('checked', enabled ? true : null);
      this._syncVisual(enabled);
    });
    this.disabled = booleanMethod(this, 'disabled', false, (enabled) => {
      this._input.attr('disabled', enabled ? true : null);
      this.attr('aria-disabled', enabled ? 'true' : null);
      this.style('opacity', enabled ? '0.64' : '1');
    });
    this.required = booleanMethod(this, 'required', false, (enabled) => {
      this._input.attr('required', enabled ? true : null);
    });
    this.indeterminate = booleanMethod(this, 'indeterminate', false, (enabled) => {
      if (this._input._el) {
        this._input._el.indeterminate = enabled;
      }
    });

    this._input.on('change', (event) => {
      if (this.disabled()) {
        return;
      }

      this.checked(Boolean(event.target?.checked));
    });
  }

  label(value) {
    if (value === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(value));
    return this;
  }

  text(value) {
    return this.label(value);
  }

  content(value) {
    return this.label(value);
  }

  description(value) {
    if (value === undefined) {
      return this._descriptionBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._descriptionBox.style('display', hasContent ? null : 'none');
    replaceChildren(this._descriptionBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
  isDisabled() {
    return this._disabled.value;
  }

  value(value) {
    if (value === undefined) {
      return this.checked();
    }

    return this.checked(value);
  }

  optionValue(value) {
    if (value === undefined) {
      return this._optionValue;
    }

    this._optionValue = resolveTextValue(value) || 'on';
    this._input.attr('value', this._optionValue);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this._input.name();
    }

    this._input.name(value);
    this.attr('data-name', value ?? null);
    return this;
  }

  hydrateSnapshot() {
    if (this._input._el) {
      this.checked(this._input._el.checked);
    }
    return this;
  }

  _setupBoolean(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        checked,
        children,
        content,
        description,
        disabled,
        label,
        name,
        optionValue,
        required,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.text(text);
      } else if (content !== undefined) {
        this.content(content);
      } else if (children !== undefined) {
        this.label(children);
      }

      if (description !== undefined) {
        this.description(description);
      }

      if (name !== undefined) {
        this.name(name);
      }

      if (optionValue !== undefined) {
        this.optionValue(optionValue);
      } else if (value !== undefined && typeof value !== 'boolean') {
        this.optionValue(value);
      }

      if (checked !== undefined) {
        this.checked(checked);
      } else if (value !== undefined && typeof value === 'boolean') {
        this.checked(value);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      return;
    }

    if (
      setup instanceof ViewNode ||
      Array.isArray(setup) ||
      typeof setup === 'string' ||
      typeof setup === 'number'
    ) {
      this.label(setup);
      return;
    }

    this.label(setup);
  }

  _syncVisual() {}
}

function formatDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTextValue(item)).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return resolveTextValue(value);
}

function normalizeValueList(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  return Array.isArray(value)
    ? value.map((item) => resolveTextValue(item))
    : [resolveTextValue(value)];
}

function isEmptyFormValue(value, control = null) {
  if (control instanceof VRate && value === 0) {
    return true;
  }

  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function isControlRequired(control) {
  if (!control) {
    return false;
  }

  if (typeof control.required === 'function') {
    try {
      return Boolean(control.required());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('required'));
}

function isControlDisabled(control) {
  if (!control) {
    return false;
  }

  if (typeof control.disabled === 'function') {
    try {
      return Boolean(control.disabled());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('disabled'));
}

function assignFormValue(result, name, value) {
  if (Object.prototype.hasOwnProperty.call(result, name)) {
    const existing = result[name];

    if (Array.isArray(existing)) {
      if (Array.isArray(value)) {
        result[name] = existing.concat(value);
      } else {
        existing.push(value);
      }
      return;
    }

    result[name] = Array.isArray(value) ? [existing].concat(value) : [existing, value];
    return;
  }

  result[name] = value;
}

export {
  createClearButton,
  syncClearButton,
  VBooleanControl,
  formatDisplayValue,
  normalizeValueList,
  isEmptyFormValue,
  isControlRequired,
  isControlDisabled,
  assignFormValue
};
