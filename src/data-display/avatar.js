import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

export class VAvatar extends HtmlElementNode {
  constructor(setup = null) {
    super('span', null);
    this._color = null;
    this._status = null;

    this._imageBox = new HtmlElementNode('img').className('yoya-vavatar-image').attr('alt', '');
    this._contentBox = new HtmlElementNode('span').className('yoya-vavatar-content');
    this._statusDot = new HtmlElementNode('span')
      .className('yoya-vavatar-status')
      .attr('aria-hidden', 'true');

    this.className(componentClass, 'yoya-vavatar');
    this.attr({ role: 'img', 'data-shape': 'circle', 'data-size': 'medium' });
    this.child(this._imageBox, this._contentBox, this._statusDot);
    this._setupAvatar(setup);
    this._syncAvatar();
  }

  text(value) {
    replaceChildren(this._contentBox, normalizeChildren(value ?? ''));
    this.attr('data-image', null);
    this.attr('aria-label', resolveAvatarLabel(value, this.attr('aria-label')));
    return this;
  }

  content(value) {
    return this.text(value);
  }

  icon(value) {
    replaceChildren(this._contentBox, normalizeChildren(value ?? ''));
    this.attr('data-image', null);
    this.attr('aria-label', resolveAvatarLabel(value, this.attr('aria-label')));
    return this;
  }

  src(value) {
    if (value === undefined) {
      return this._imageBox.attr('src');
    }

    if (value === null || value === undefined || value === '') {
      this._imageBox.attr('src', null);
      this.attr('data-image', null);
      return this;
    }

    this._imageBox.attr('src', value);
    this.attr('data-image', 'true');
    return this;
  }

  alt(value) {
    if (value === undefined) {
      return this._imageBox.attr('alt');
    }

    const next = value ?? '';
    this._imageBox.attr('alt', next);
    if (next) {
      this.attr('aria-label', next);
    }
    return this;
  }

  size(value) {
    if (value === undefined) {
      return this.attr('data-size');
    }

    const size = ['small', 'medium', 'large', 'xlarge'].includes(value) ? value : 'medium';
    this.attr('data-size', size);
    return this;
  }

  shape(value) {
    if (value === undefined) {
      return this.attr('data-shape');
    }

    this.attr('data-shape', value === 'square' ? 'square' : 'circle');
    return this;
  }

  color(value) {
    if (value === undefined) {
      return this._color;
    }

    this._color = value || null;
    this.attr('data-color', this._color || null);
    this.style('background', this._color || null);
    this.style('color', this._color ? 'var(--yoya-color-text-inverse, #ffffff)' : null);
    return this;
  }

  status(value) {
    if (value === undefined) {
      return this._status;
    }

    this._status = value || null;
    this.attr('data-status', this._status || null);
    return this;
  }

  _syncAvatar() {
    const hasImage = Boolean(this._imageBox.attr('src'));
    this.attr('data-image', hasImage ? 'true' : null);
    if (!this.attr('aria-label')) {
      this.attr('aria-label', this._imageBox.attr('alt') || this._contentBox.textContent() || '');
    }
    return this;
  }

  _setupAvatar(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        alt,
        children,
        color,
        content,
        icon,
        shape,
        size,
        src,
        status,
        text,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (src !== undefined) {
        this.src(src);
      }

      if (alt !== undefined) {
        this.alt(alt);
      }

      if (text !== undefined) {
        this.text(text);
      } else if (content !== undefined) {
        this.content(content);
      } else if (icon !== undefined) {
        this.icon(icon);
      } else if (children !== undefined) {
        this.text(children);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (shape !== undefined) {
        this.shape(shape);
      }

      if (color !== undefined) {
        this.color(color);
      }

      if (status !== undefined) {
        this.status(status);
      }

      return;
    }

    this.text(setup);
  }
}

export function vAvatar(first = null, second = null, third = null) {
  return createComponentFactory(VAvatar, first, second, third);
}

function resolveAvatarLabel(value, currentLabel) {
  if (value === null || value === undefined || value === '') {
    return currentLabel || '';
  }

  if (typeof value.textContent === 'function') {
    return value.textContent();
  }

  return String(value);
}
