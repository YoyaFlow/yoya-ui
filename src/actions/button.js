import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  applyComponentArguments,
  applyElementOptions,
  isPlainObject,
  normalizeComponentArguments,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

/**
 * vButton 是复合按钮组件；button() 仍然保留为原生 HTML button 工厂。
 */
export class VButton extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('button', null);
    this._variant = 'secondary';
    this._size = 'medium';
    this._focused = false;
    this._hovered = false;
    this._pressed = false;
    this._labelBox = new HtmlElementNode('span').className('yoya-vbutton-label');
    this._loadingBox = new HtmlElementNode('span')
      .className('yoya-vbutton-spinner')
      .attr('aria-hidden', 'true');

    this.className(componentClass, 'yoya-vbutton');
    this.attr('type', 'button');
    this.child(this._loadingBox, this._labelBox);
    this._bindInteractionEffects();
    this.type(this._variant);
    this.size(this._size);

    const args = normalizeComponentArguments(setup, options, callback);
    this._setupButton(args.first);
    applyComponentArguments(this, args.options, args.callback);
  }

  label(content) {
    replaceChildren(this._labelBox, normalizeChildren(content));
    return this;
  }

  content(content) {
    return this.label(content);
  }

  type(value) {
    if (value === undefined) {
      return this._variant;
    }

    this._variant = value || 'secondary';
    this.attr('data-variant', this._variant);
    this._syncInteractionStyles();
    return this;
  }

  variant(value) {
    return this.type(value);
  }

  formType(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    const allowedTypes = new Set(['button', 'submit', 'reset']);
    return this.attr('type', allowedTypes.has(value) ? value : 'button');
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = value || 'medium';
    this.attr('data-size', this._size);
    return this;
  }

  disabled(value) {
    this.setState('disabled', Boolean(value));
    this.attr('disabled', value ? true : null);
    if (value) {
      this._hovered = false;
      this._pressed = false;
    }
    this._syncInteractionStyles();
    return this;
  }

  loading(value) {
    const enabled = Boolean(value);
    this.setState('loading', enabled);
    this.attr('aria-busy', enabled ? 'true' : null);
    this.attr('data-loading', enabled ? 'true' : null);
    this._loadingBox.textContent(enabled ? '...' : '');
    this._syncInteractionStyles();
    return this;
  }

  _bindInteractionEffects() {
    this.on('mouseenter', () => {
      if (!this.getBooleanState('disabled')) {
        this._hovered = true;
        this._syncInteractionStyles();
      }
    });
    this.on('mouseleave', () => {
      this._hovered = false;
      this._pressed = false;
      this._syncInteractionStyles();
    });
    this.on('mousedown', (event) => {
      if (!this.getBooleanState('disabled') && event.button === 0) {
        this._pressed = true;
        this._syncInteractionStyles();
      }
    });
    this.on('mouseup', () => {
      this._pressed = false;
      this._syncInteractionStyles();
    });
    this.on('focus', () => {
      if (!this.getBooleanState('disabled')) {
        this._focused = true;
        this._syncInteractionStyles();
      }
    });
    this.on('blur', () => {
      this._focused = false;
      this._pressed = false;
      this._syncInteractionStyles();
    });
    this.on('keydown', (event) => {
      if (!this.getBooleanState('disabled') && ['Enter', ' ', 'Spacebar'].includes(event.key)) {
        this._pressed = true;
        this._syncInteractionStyles();
      }
    });
    this.on('keyup', (event) => {
      if (['Enter', ' ', 'Spacebar'].includes(event.key)) {
        this._pressed = false;
        this._syncInteractionStyles();
      }
    });
  }

  _interactionState() {
    if (this.getBooleanState('disabled')) {
      return 'disabled';
    }

    if (this._pressed) {
      return 'active';
    }

    if (this._focused) {
      return 'focus';
    }

    if (this._hovered) {
      return 'hover';
    }

    return 'rest';
  }

  _syncInteractionStyles() {
    const interaction = this._interactionState();

    this.attr('data-interaction', interaction === 'rest' ? null : interaction);
    return this;
  }

  _setupButton(setup) {
    if (typeof setup === 'function') {
      setup(this);
    } else if (isPlainObject(setup)) {
      const {
        children,
        label,
        text,
        variant,
        type,
        formType,
        size,
        disabled,
        loading,
        attrs,
        style,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      applyElementOptions(this, { attrs, style });

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.label(text);
      } else if (children !== undefined) {
        this.label(children);
      }

      if (variant !== undefined) {
        this.variant(variant);
      } else if (type !== undefined) {
        this.type(type);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (formType !== undefined) {
        this.formType(formType);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (loading !== undefined) {
        this.loading(loading);
      }
    } else if (setup !== null && setup !== undefined) {
      this.label(setup);
    }
  }
}

export function vButton(setup = null, options = null, callback = null) {
  return new VButton(setup, options, callback);
}
