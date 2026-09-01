import { HtmlElementNode } from '../html/index.js';
import { componentClass, createComponentFactory, isPlainObject } from '../components/shared.js';

export class VLazyImage extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._src = null;
    this._alt = '';
    this._defer = false;
    this._state = 'loading';
    this._observer = null;

    this._img = new HtmlElementNode('img').attr({ loading: 'lazy' });
    this._placeholder = new HtmlElementNode('span').className('yoya-vlazyimage-placeholder');
    this._retryButton = new HtmlElementNode('button')
      .className('yoya-vlazyimage-retry')
      .attr({ type: 'button' })
      .text('加载失败，点击重试')
      .on('click', () => this.retry());

    this.className(componentClass, 'yoya-vlazyimage');
    this.attr({ 'data-state': 'loading', role: 'img' });
    this.styles({
      boxSizing: 'border-box',
      display: 'inline-block',
      maxWidth: '100%',
      minWidth: '48px',
      minHeight: '48px',
      overflow: 'hidden',
      position: 'relative'
    });
    this.child(this._placeholder, this._img, this._retryButton);

    this._setupLazyImage(setup);
    this._syncState();
  }

  src(value) {
    if (value === undefined) {
      return this._src;
    }

    this._src = value === null || value === undefined ? null : String(value);
    if (this._src && !this._defer) {
      this._img.attr('src', this._src);
    } else {
      this._img.attr('src', null);
    }
    return this;
  }

  alt(value) {
    if (value === undefined) {
      return this._alt;
    }

    this._alt = String(value ?? '');
    this._img.attr('alt', this._alt || null);
    this.attr('aria-label', this._alt || null);
    return this;
  }

  defer(value) {
    if (value === undefined) {
      return this._defer;
    }

    this._defer = Boolean(value);
    if (this._defer) {
      this._img.attr('src', null);
    } else if (this._src) {
      this._img.attr('src', this._src);
    }
    return this;
  }

  state() {
    return this._state;
  }

  retry() {
    if (!this._src) {
      return this;
    }

    this._setState('loading');
    this._img.attr('src', this._src);
    return this;
  }

  renderDom() {
    const element = super.renderDom();

    this._img.on('load', () => this._setState('loaded'));
    this._img.on('error', () => this._setState('error'));
    this._observe();
    return element;
  }

  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    return super.destroy();
  }

  _observe() {
    if (!this._defer || !this._src) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this._img.attr('src', this._src);
      return;
    }

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        this._img.attr('src', this._src);
        if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
        }
      });
    });

    if (this._el) {
      this._observer.observe(this._el);
    }
  }

  _setState(state) {
    this._state = state;
    this._syncState();
  }

  _syncState() {
    const loaded = this._state === 'loaded';

    this.attr('data-state', this._state);
    this._img.style('opacity', loaded ? '1' : '0');
    this._placeholder.style('display', this._state === 'loading' ? null : 'none');
    this._retryButton.style('display', this._state === 'error' ? 'inline-flex' : 'none');
  }

  _setupLazyImage(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { alt, defer, src, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (alt !== undefined) {
        this.alt(alt);
      }
      if (defer !== undefined) {
        this.defer(defer);
      }
      if (src !== undefined) {
        this.src(src);
      }
    }
  }
}

export function vLazyImage(first = null, second = null, third = null) {
  return createComponentFactory(VLazyImage, first, second, third);
}
