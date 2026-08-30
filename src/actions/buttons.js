import { normalizeChild } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VButton } from './button.js';
import {
  applyComponentArguments,
  applyElementOptions,
  componentClass,
  isPlainObject,
  normalizeComponentArguments,
  replaceChildren,
  resolveTextValue
} from '../components/shared.js';

const baseVariants = new WeakMap();

/**
 * vButtons 按钮组：把多个按钮收敛到同一容器，支持配置式创建和单选联动。
 */
export class VButtons extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', null);
    this._variant = 'secondary';
    this._size = 'medium';
    this._selectable = false;
    this._value = null;
    this._buttons = [];
    this._changeHandler = null;

    this.className(componentClass, 'yoya-vbuttons');
    this.attr('role', 'group');
    this.styles({
      display: 'inline-flex',
      flexWrap: 'wrap',
      gap: '8px',
      minWidth: '0',
      verticalAlign: 'middle'
    });

    const args = normalizeComponentArguments(setup, options, callback);
    this._setupButtons(args.first);
    applyComponentArguments(this, args.options, args.callback);
  }

  child(...children) {
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }

      const node = normalizeChild(child);
      if (node instanceof VButton) {
        this._registerButton(node);
      }

      super.child(node);
    });

    return this;
  }

  variant(value) {
    if (value === undefined) {
      return this._variant;
    }

    const previous = this._variant;
    this._variant = value || 'secondary';

    this._buttons.forEach((button) => {
      if (baseVariants.get(button) === previous) {
        baseVariants.set(button, this._variant);
      }
    });

    this._syncSelection();
    return this;
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = value || 'medium';
    this._buttons.forEach((button) => button.size(this._size));
    return this;
  }

  selectable(value = true) {
    this._selectable = Boolean(value);
    this._syncSelection();
    return this;
  }

  value(next) {
    if (next === undefined) {
      return this._value;
    }

    this._value = next;
    this._syncSelection();
    return this;
  }

  change(handler) {
    if (handler === undefined) {
      return this._changeHandler;
    }

    this._changeHandler = typeof handler === 'function' ? handler : null;
    return this;
  }

  joined(value = true) {
    this._joined = Boolean(value);
    this._applyJoinedLayout();
    return this;
  }

  disabled(value) {
    this._buttons.forEach((button) => button.disabled(Boolean(value)));
    return this;
  }

  options(items) {
    if (items === undefined) {
      return this._buttons.slice();
    }

    this._buttons = [];
    replaceChildren(
      this,
      (Array.isArray(items) ? items : [items]).map((entry) => this._createButton(entry))
    );
    this._applyJoinedLayout();
    return this;
  }

  _createButton(entry) {
    if (entry instanceof VButton) {
      return entry;
    }

    const button = new VButton();
    button.variant(this._variant);
    button.size(this._size);

    if (typeof entry === 'string' || typeof entry === 'number') {
      button.label(entry);
      baseVariants.set(button, this._variant);
      return button;
    }

    if (isPlainObject(entry)) {
      const { children, disabled, label, size, text, value, variant, ...elementConfig } = entry;

      if (Object.keys(elementConfig).length > 0) {
        button.setup(elementConfig);
      }

      if (label !== undefined) {
        button.label(label);
      } else if (text !== undefined) {
        button.label(text);
      } else if (children !== undefined) {
        button.label(children);
      }

      if (variant !== undefined) {
        button.variant(variant);
      }

      if (size !== undefined) {
        button.size(size);
      }

      if (value !== undefined) {
        button.attr('data-value', resolveTextValue(value));
      }

      if (disabled !== undefined) {
        button.disabled(disabled);
      }

      baseVariants.set(button, variant || this._variant);
      return button;
    }

    baseVariants.set(button, this._variant);
    return button;
  }

  _registerButton(button) {
    if (this._buttons.includes(button)) {
      return;
    }

    if (!baseVariants.has(button)) {
      baseVariants.set(button, button.type() || this._variant);
    }

    button.size(this._size);
    button.on('click', () => {
      if (!this._selectable) {
        return;
      }

      const next = this._buttonValue(button);
      if (next === this._value) {
        return;
      }

      this.value(next);
      if (typeof this._changeHandler === 'function') {
        this._changeHandler(next, this);
      }
    });

    this._buttons.push(button);
    this._applyJoinedLayout();
  }

  _buttonValue(button) {
    const raw = button.attr('data-value');
    if (raw !== null && raw !== undefined) {
      return String(raw);
    }

    return String(button._labelBox?.textContent() ?? '');
  }

  _syncSelection() {
    this._buttons.forEach((button) => {
      const selected = this._selectable && this._buttonValue(button) === this._value;
      button.variant(selected ? 'primary' : baseVariants.get(button) || this._variant);
      button.attr('aria-pressed', selected ? 'true' : null);
      button.attr('data-selected', selected ? 'true' : null);
      button.style('zIndex', this._joined && selected ? '1' : null);
    });

    return this;
  }

  _applyJoinedLayout() {
    this.style('gap', this._joined ? '0' : '8px');
    this.style('flexWrap', this._joined ? 'nowrap' : 'wrap');

    this._buttons.forEach((button, index) => {
      if (!this._joined) {
        button.style('borderRadius', null);
        button.style('marginLeft', null);
        return;
      }

      const radius = this._joinedRadius(index);
      button.style('borderRadius', radius);
      button.style('marginLeft', index === 0 ? null : '-1px');
    });

    this._syncSelection();
    return this;
  }

  _joinedRadius(index) {
    const count = this._buttons.length;

    if (count <= 1) {
      return null;
    }

    if (index === 0) {
      return 'var(--yoya-radius-md, 6px) 0 0 var(--yoya-radius-md, 6px)';
    }

    if (index === count - 1) {
      return '0 var(--yoya-radius-md, 6px) var(--yoya-radius-md, 6px) 0';
    }

    return '0';
  }

  _setupButtons(setup) {
    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        attrs,
        change,
        children,
        disabled,
        joined,
        options: items,
        selectable,
        size,
        style,
        value,
        variant,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      applyElementOptions(this, { attrs, style });

      if (variant !== undefined) {
        this.variant(variant);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (selectable !== undefined) {
        this.selectable(selectable);
      }

      if (value !== undefined) {
        this.value(value);
      }

      if (change !== undefined) {
        this.change(change);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (joined !== undefined) {
        this.joined(joined);
      }

      if (items !== undefined) {
        this.options(items);
      }

      if (children !== undefined) {
        this.child(children);
      }

      return;
    }

    if (Array.isArray(setup)) {
      this.options(setup);
      return;
    }

    if (setup !== null && setup !== undefined) {
      this.options([setup]);
    }
  }
}

export function vButtons(first = null, second = null, third = null) {
  return new VButtons(first, second, third);
}
