import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  resolveTextValue,
  themeValue
} from '../components/shared.js';

export class VRate extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._allowClear = true;
    this._allowHalf = false;
    this._character = '★';
    this._count = 5;
    this._disabled = false;
    this._error = false;
    this._focused = false;
    this._hoverValue = 0;
    this._name = '';
    this._readonly = false;
    this._required = false;
    this._size = 22;
    this._stars = null;
    this._value = 0;
    this._input = new HtmlElementNode('input')
      .className('yoya-vrate-input')
      .attr({
        'aria-hidden': 'true',
        max: '5',
        min: '0',
        step: '1',
        tabindex: '-1',
        type: 'range'
      })
      .style('display', 'none');
    this._starsBox = new HtmlElementNode('div')
      .className('yoya-vrate-stars')
      .attr({ 'aria-label': '评分', role: 'radiogroup', tabindex: '0' })
      .styles({
        alignItems: 'center',
        borderRadius: '8px',
        display: 'inline-flex',
        gap: '2px',
        minWidth: '0',
        outline: 'none',
        padding: '4px',
        transition: 'box-shadow 120ms ease'
      });

    this.className(componentClass, 'yoya-vrate');
    this.styles({
      display: 'inline-grid',
      gap: '6px',
      minWidth: '0'
    });
    this.child(this._input, this._starsBox);

    this._starsBox.on('keydown', (event) => this._handleKeydown(event));
    this._starsBox.on('focusin', () => this._setFocused(true));
    this._starsBox.on('focusout', () => this._setFocused(false));

    this._setupRate(setup);
    this._sync();
  }

  value(value) {
    if (value === undefined) {
      return this._value;
    }

    const next = this._normalizeValue(value);
    if (next !== this._value) {
      this._value = next;
      this._sync();
    }
    return this;
  }

  count(value) {
    if (value === undefined) {
      return this._count;
    }

    const next = Math.max(1, Math.trunc(Number(value)) || 1);
    if (next !== this._count) {
      this._count = next;
      this._value = this._normalizeValue(this._value);
      this._sync();
    }
    return this;
  }

  max(value) {
    return this.count(value);
  }

  allowHalf(value) {
    if (value === undefined) {
      return this._allowHalf;
    }

    const enabled = Boolean(value);
    if (enabled !== this._allowHalf) {
      this._allowHalf = enabled;
      this._value = this._normalizeValue(this._value);
      this._sync();
    }
    return this;
  }

  allowClear(value) {
    if (value === undefined) {
      return this._allowClear;
    }

    this._allowClear = Boolean(value);
    this.attr('data-allow-clear', this._allowClear ? 'true' : null);
    return this;
  }

  clearable(value) {
    return this.allowClear(value);
  }

  character(value) {
    if (value === undefined) {
      return this._character;
    }

    this._character = resolveTextValue(value) || '★';
    this._renderStars();
    return this;
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = Math.max(12, Number(value) || 22);
    this._renderStars();
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    this._input.attr('name', this._name || null);
    this.attr('data-name', this._name || null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this._disabled;
    }

    this._disabled = Boolean(value);
    this._syncState();
    return this;
  }

  readonly(value) {
    if (value === undefined) {
      return this._readonly;
    }

    this._readonly = Boolean(value);
    this._syncState();
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this._required;
    }

    this._required = Boolean(value);
    this._input.attr('required', this._required ? true : null);
    this.attr('data-required', this._required ? 'true' : null);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this._error;
    }

    this._error = Boolean(value);
    this._syncState();
    return this;
  }

  clear() {
    if (this._value !== 0 && !this._disabled && !this._readonly) {
      this._setValue(0, true);
    }
    return this;
  }

  _sync() {
    this._syncInput();
    this._syncState();

    if (!this._stars || this._stars.length !== this._count) {
      this._renderStars();
    } else {
      this._syncStars();
    }
    return this;
  }

  _syncInput() {
    this._input.attr({
      max: String(this._count),
      min: '0',
      step: this._allowHalf ? '0.5' : '1',
      value: String(this._value)
    });
    return this;
  }

  _syncState() {
    this.attr('data-value', String(this._value));
    this.attr('data-count', String(this._count));
    this.attr('data-allow-half', this._allowHalf ? 'true' : null);
    this.attr('data-allow-clear', this._allowClear ? 'true' : null);
    this.attr('data-disabled', this._disabled ? 'true' : null);
    this.attr('data-readonly', this._readonly ? 'true' : null);
    this.attr('data-error', this._error ? 'true' : null);
    this.attr('data-hover-value', this._hoverValue > 0 ? String(this._hoverValue) : null);
    this._input.attr('disabled', this._disabled ? true : null);
    this._starsBox.attr('aria-disabled', this._disabled ? 'true' : null);
    this._starsBox.attr('aria-invalid', this._error ? 'true' : null);
    this._starsBox.attr('aria-readonly', this._readonly ? 'true' : null);
    this._starsBox.attr('tabindex', this._disabled ? '-1' : '0');
    this.style('opacity', this._disabled ? '0.64' : '1');
    this._starsBox.style(
      'boxShadow',
      this._error
        ? `0 0 0 1px ${themeValue('color-danger-ring', 'rgba(220, 38, 38, 0.2)')}`
        : this._focused
          ? `0 0 0 3px ${themeValue('color-primary-ring', 'rgba(37, 99, 235, 0.22)')}`
          : null
    );
    return this;
  }

  _renderStars() {
    replaceChildren(this._starsBox, []);
    this._stars = [];

    for (let index = 1; index <= this._count; index += 1) {
      const button = this._createStar(index);
      this._stars.push(button);
      this._starsBox.child(button);
    }

    this._syncStars();
    return this;
  }

  _createStar(starIndex) {
    const button = new HtmlElementNode('button')
      .className('yoya-vrate-star')
      .attr({
        'aria-checked': 'false',
        'aria-label': `${starIndex} 分`,
        'data-value': String(starIndex),
        role: 'radio',
        tabindex: '-1',
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: '4px',
        boxSizing: 'border-box',
        display: 'inline-flex',
        flex: '0 0 auto',
        fontSize: `${this._size}px`,
        height: `${this._size + 8}px`,
        justifyContent: 'center',
        lineHeight: '1',
        margin: '0',
        padding: '0',
        position: 'relative',
        width: `${this._size + 8}px`
      });
    const base = new HtmlElementNode('span')
      .className('yoya-vrate-star-base')
      .styles({
        alignItems: 'center',
        color: themeValue('color-border-muted', '#94a3b8'),
        display: 'flex',
        inset: '0',
        justifyContent: 'center',
        lineHeight: '1',
        position: 'absolute'
      })
      .text(this._character);
    const fill = new HtmlElementNode('span')
      .className('yoya-vrate-star-fill')
      .styles({
        alignItems: 'center',
        clipPath: 'inset(0 100% 0 0)',
        color: themeValue('color-warning', '#f59e0b'),
        display: 'flex',
        inset: '0',
        justifyContent: 'center',
        lineHeight: '1',
        overflow: 'hidden',
        position: 'absolute',
        WebkitClipPath: 'inset(0 100% 0 0)'
      })
      .text(this._character);

    button.child(base, fill);
    button.on('click', (event) => {
      event.preventDefault();
      this._selectStar(starIndex, event);
    });
    button.on('mouseenter', (event) => this._setHover(starIndex, event));
    button.on('mouseleave', () => this._setHover(0));
    return button;
  }

  _syncStars() {
    const displayValue = this._hoverValue > 0 ? this._hoverValue : this._value;
    const activeStar =
      this._allowHalf && this._value % 1 !== 0 ? Math.ceil(this._value) : Math.round(this._value);

    this._stars.forEach((button, index) => {
      const starIndex = index + 1;
      const ratio = this._starFillRatio(starIndex, displayValue);
      const isChecked =
        this._value === starIndex || (this._allowHalf && this._value === starIndex - 0.5);
      const fill = button.children()[1];

      button.attr('aria-checked', isChecked ? 'true' : 'false');
      button.attr('data-filled', ratio > 0 ? 'true' : null);
      button.attr('data-half', ratio > 0 && ratio < 1 ? 'true' : null);
      button.attr('tabindex', starIndex === activeStar ? '0' : '-1');
      button.style(
        'cursor',
        this._disabled ? 'not-allowed' : this._readonly ? 'default' : 'pointer'
      );
      const clipRight = `${Math.round((1 - ratio) * 100)}%`;
      fill.style('clipPath', `inset(0 ${clipRight} 0 0)`);
      fill.style('WebkitClipPath', `inset(0 ${clipRight} 0 0)`);
      fill.style('color', ratio > 0 ? themeValue('color-warning', '#f59e0b') : 'transparent');
    });
    return this;
  }

  _starFillRatio(starIndex, displayValue) {
    if (displayValue >= starIndex) {
      return 1;
    }

    if (this._allowHalf && displayValue === starIndex - 0.5) {
      return 0.5;
    }

    return 0;
  }

  _normalizeValue(value) {
    let next = Number(value);
    if (!Number.isFinite(next)) {
      next = 0;
    }

    next = this._allowHalf ? Math.round(next * 2) / 2 : Math.round(next);
    return Math.max(0, Math.min(this._count, next));
  }

  _selectStar(starIndex, event) {
    if (this._disabled || this._readonly) {
      return;
    }

    let next = this._pointerValue(starIndex, event);
    if (this._allowClear && next === this._value) {
      next = 0;
    }
    this._setValue(next, true);
  }

  _setHover(starIndex, event) {
    if (this._disabled || this._readonly) {
      return;
    }

    this._hoverValue = starIndex > 0 ? this._pointerValue(starIndex, event) : 0;
    this._syncStars();
    this.attr('data-hover-value', this._hoverValue > 0 ? String(this._hoverValue) : null);
  }

  _pointerValue(starIndex, event) {
    if (!this._allowHalf || !event) {
      return starIndex;
    }

    const rect = event.currentTarget?.getBoundingClientRect?.();
    if (rect?.width && event.offsetX < rect.width / 2) {
      return starIndex - 0.5;
    }

    return starIndex;
  }

  _setValue(next, emit) {
    const normalized = this._normalizeValue(next);
    this._hoverValue = 0;

    if (normalized !== this._value) {
      this._value = normalized;
      this._sync();
      if (emit) {
        this._emitChange();
      }
    }
    return this;
  }

  _handleKeydown(event) {
    if (this._disabled || this._readonly) {
      return;
    }

    const step = this._allowHalf ? 0.5 : 1;
    let next = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      next = this._value + step;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      next = this._value - step;
    } else if (event.key === 'Home') {
      next = this._allowHalf ? 0.5 : 1;
    } else if (event.key === 'End') {
      next = this._count;
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (this._hoverValue > 0) {
        this._selectStar(this._hoverValue);
      } else if (this._allowClear && this._value > 0) {
        this._setValue(0, true);
      }
      event.preventDefault();
      return;
    }

    if (next === null) {
      return;
    }

    event.preventDefault();
    this._setValue(next, true);
  }

  _setFocused(focused) {
    this._focused = focused;
    this.attr('data-focused', focused ? 'true' : null);
    this._syncState();
  }

  _emitChange() {
    if (!this._el) {
      return;
    }

    const EventClass = this._el.ownerDocument?.defaultView?.CustomEvent || CustomEvent;
    this._el.dispatchEvent(
      new EventClass('change', {
        bubbles: true,
        detail: this._value
      })
    );
  }

  _setupRate(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        allowClear,
        allowHalf,
        character,
        clearable,
        count,
        disabled,
        error,
        max,
        name,
        readonly,
        required,
        size,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (count !== undefined || max !== undefined) {
        this.count(count ?? max);
      }
      if (allowHalf !== undefined) {
        this.allowHalf(allowHalf);
      }
      if (character !== undefined) {
        this.character(character);
      }
      if (size !== undefined) {
        this.size(size);
      }
      if (value !== undefined) {
        this.value(value);
      }
      if (name !== undefined) {
        this.name(name);
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
        this.allowClear(clearable);
      } else if (allowClear !== undefined) {
        this.allowClear(allowClear);
      }
      return;
    }

    this.value(setup);
  }
}

export function vRate(first = null, second = null, third = null) {
  return createComponentFactory(VRate, first, second, third);
}

registerChildFactories(HtmlElementNode, { vRate });
