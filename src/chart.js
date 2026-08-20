import { HtmlElementNode } from './html/index.js';

/**
 * Library-agnostic chart host. Adapters own the actual chart implementation.
 */
export class VChart extends HtmlElementNode {
  constructor(setup = null) {
    super('div');
    this._adapter = null;
    this._instance = null;
    this._initialized = false;
    this._data = undefined;
    this._options = {};
    this._width = undefined;
    this._height = undefined;
    this._destroyed = false;

    this.className('yoya-vchart');
    this.styles({ display: 'block', width: '100%' });
    this._setupChart(setup);
  }

  adapter(value) {
    if (value === undefined) {
      return this._adapter;
    }

    if (this._destroyed) {
      return this;
    }

    if (this._initialized) {
      this._destroyAdapter();
    }

    this._adapter = value || null;
    if (this._el && this._adapter) {
      this._initializeAdapter();
    }

    return this;
  }

  data(value) {
    if (value === undefined) {
      return this._data;
    }

    this._data = value;
    this._updateAdapter();
    return this;
  }

  options(value) {
    if (value === undefined) {
      return this._options;
    }

    this._options = value || {};
    this._updateAdapter();
    return this;
  }

  width(value) {
    if (value === undefined) {
      return this._width;
    }

    this._width = value;
    this.style('width', value === null ? '100%' : toCssSize(value));
    this._resizeAdapter();
    return this;
  }

  height(value) {
    if (value === undefined) {
      return this._height;
    }

    this._height = value;
    this.style('height', value === null ? null : toCssSize(value));
    this._resizeAdapter();
    return this;
  }

  resize(width = this._width, height = this._height) {
    this._width = width;
    this._height = height;
    if (width !== undefined) {
      this.style('width', toCssSize(width));
    }
    if (height !== undefined) {
      this.style('height', toCssSize(height));
    }
    this._resizeAdapter();
    return this;
  }

  renderDom() {
    const element = super.renderDom();
    if (element && !this._destroyed) {
      this._initializeAdapter();
    }
    return element;
  }

  destroy() {
    if (this._destroyed) {
      return this;
    }

    this._destroyed = true;
    this._destroyAdapter();
    return super.destroy();
  }

  _setupChart(setup) {
    if (!setup || typeof setup !== 'object') {
      return;
    }

    const { adapter, data, height, options, width } = setup;
    this._data = data;
    this._options = options || {};
    this._width = width;
    this._height = height;

    if (width !== undefined) {
      this.width(width);
    }
    if (height !== undefined) {
      this.height(height);
    }
    if (adapter) {
      this._adapter = adapter;
    }
  }

  _context() {
    return {
      chart: this,
      data: this._data,
      height: this._height,
      host: this._el,
      options: this._options,
      width: this._width
    };
  }

  _initializeAdapter() {
    if (!this._adapter || this._initialized || !this._el || this._destroyed) {
      return;
    }

    if (typeof this._adapter.init === 'function') {
      this._instance = this._adapter.init(this._el, this._context());
    } else if (typeof this._adapter === 'function') {
      this._instance = this._adapter(this._el, this._context());
    } else {
      throw new TypeError('Chart adapter must provide an init(host, context) function');
    }

    this._initialized = true;
  }

  _updateAdapter() {
    if (this._instance === null || !this._adapter || typeof this._adapter.update !== 'function') {
      return;
    }

    this._adapter.update(this._instance, this._context());
  }

  _resizeAdapter() {
    if (this._instance === null || !this._adapter || typeof this._adapter.resize !== 'function') {
      return;
    }

    this._adapter.resize(this._instance, this._context());
  }

  _destroyAdapter() {
    if (!this._initialized) {
      return;
    }

    if (this._adapter && typeof this._adapter.destroy === 'function') {
      this._adapter.destroy(this._instance, this._context());
    }
    this._instance = null;
    this._initialized = false;
  }
}

export function vChart(setup = null) {
  return setup instanceof VChart ? setup : new VChart(setup);
}

function toCssSize(value) {
  return typeof value === 'number' ? `${value}px` : value;
}
