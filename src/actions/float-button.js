import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentArguments,
  applyElementOptions,
  componentClass,
  isPlainObject,
  normalizeComponentArguments,
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../components/shared.js';

const positionPresets = {
  'bottom-left': { bottom: '24px', left: '24px' },
  'bottom-right': { bottom: '24px', right: '24px' },
  'top-left': { left: '24px', top: '24px' },
  'top-right': { right: '24px', top: '24px' }
};

const sizePresets = {
  large: { height: '56px', minWidth: '56px' },
  medium: { height: '48px', minWidth: '48px' },
  small: { height: '36px', minWidth: '36px' }
};

/**
 * vFloatButton 悬浮按钮：圆形操作入口，支持图标、扩展标签和固定定位。
 */
export class VFloatButton extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('button', null);
    this._variant = 'primary';
    this._size = 'medium';
    this._fixed = false;
    this._position = null;
    this._iconBox = new HtmlElementNode('span').className('yoya-vfloat-button-icon');
    this._labelBox = new HtmlElementNode('span').className('yoya-vfloat-button-label');

    this.className(componentClass, 'yoya-vfloat-button');
    this.attr('type', 'button');
    this.styles({
      alignItems: 'center',
      borderRadius: '9999px',
      boxSizing: 'border-box',
      cursor: 'pointer',
      display: 'inline-flex',
      font: 'inherit',
      gap: '6px',
      justifyContent: 'center',
      lineHeight: '1',
      padding: '0',
      userSelect: 'none'
    });
    this.child(this._iconBox, this._labelBox);
    this._syncIconVisibility();
    this._syncLabelVisibility();
    this.variant(this._variant);
    this.size(this._size);

    const args = normalizeComponentArguments(setup, options, callback);
    this._setupFloatButton(args.first);
    applyComponentArguments(this, args.options, args.callback);
  }

  icon(content) {
    replaceChildren(this._iconBox, normalizeChildren(content));
    this._syncIconVisibility();
    return this;
  }

  label(content) {
    replaceChildren(this._labelBox, normalizeChildren(content));
    this._syncLabelVisibility();
    return this;
  }

  content(content) {
    return this.label(content);
  }

  text(content) {
    return this.label(content);
  }

  variant(value) {
    if (value === undefined) {
      return this._variant;
    }

    this._variant = value || 'primary';
    this.attr('data-variant', this._variant);

    const primary = this._variant === 'primary';
    this.styles({
      background: themeValue(
        primary ? 'color-primary' : 'color-surface',
        primary ? '#2563eb' : '#ffffff'
      ),
      border: primary ? 'none' : themeBorder('color-border-strong', '#cbd5e1'),
      boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
      color: themeValue(
        primary ? 'color-text-inverse' : 'color-text',
        primary ? '#ffffff' : '#172033'
      )
    });
    return this;
  }

  type(value) {
    return this.variant(value);
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = value || 'medium';
    this.attr('data-size', this._size);

    const preset = sizePresets[this._size] || sizePresets.medium;
    this.style('height', preset.height);
    this.style('minWidth', preset.minWidth);
    return this;
  }

  disabled(value) {
    this.attr('disabled', value ? true : null);
    this.attr('aria-disabled', value ? 'true' : null);
    this.style('cursor', value ? 'not-allowed' : 'pointer');
    this.style('opacity', value ? '0.56' : null);
    return this;
  }

  fixed(value = true) {
    this._fixed = Boolean(value);
    this._syncPosition();
    return this;
  }

  position(value) {
    if (value === undefined) {
      return this._position;
    }

    this._position = positionPresets[value] ? value : null;
    this._syncPosition();
    return this;
  }

  _syncPosition() {
    const preset = this._fixed && this._position ? positionPresets[this._position] : null;

    this.style('position', this._fixed ? 'fixed' : null);
    this.style('zIndex', this._fixed ? '100' : null);
    this.style('bottom', preset?.bottom ?? null);
    this.style('left', preset?.left ?? null);
    this.style('right', preset?.right ?? null);
    this.style('top', preset?.top ?? null);
    return this;
  }

  _syncIconVisibility() {
    const hasIcon = this._iconBox.children().length > 0 || this._iconBox.textContent() !== '';
    this.attr('data-icon', hasIcon ? 'true' : null);
    this._iconBox.style('display', hasIcon ? null : 'none');
    return this;
  }

  _syncLabelVisibility() {
    const hasLabel = this._labelBox.children().length > 0 || this._labelBox.textContent() !== '';
    this.attr('data-label', hasLabel ? 'true' : null);
    this.style('paddingLeft', hasLabel ? '18px' : null);
    this.style('paddingRight', hasLabel ? '18px' : null);
    this._labelBox.style('display', hasLabel ? null : 'none');
    return this;
  }

  _setupFloatButton(setup) {
    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        attrs,
        children,
        disabled,
        fixed,
        icon,
        label,
        position,
        size,
        style,
        text,
        variant,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      applyElementOptions(this, { attrs, style });

      if (icon !== undefined) {
        this.icon(icon);
      }

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.label(text);
      } else if (children !== undefined) {
        this.label(children);
      }

      if (variant !== undefined) {
        this.variant(variant);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (fixed !== undefined) {
        this.fixed(fixed);
      }

      if (position !== undefined) {
        this.position(position);
      }

      return;
    }

    if (setup !== null && setup !== undefined) {
      this.label(setup);
    }
  }
}

export function vFloatButton(first = null, second = null, third = null) {
  return new VFloatButton(first, second, third);
}
