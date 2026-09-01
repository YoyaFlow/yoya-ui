import { HtmlElementNode } from '../html/index.js';
import { componentClass, createComponentFactory, isPlainObject } from '../components/shared.js';

export class VMasonry extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._columns = 3;
    this._gap = 16;
    this._minColumnWidth = null;

    this.className(componentClass, 'yoya-vmasonry');
    this.attr({ 'data-columns': '3' });
    this.styles({
      boxSizing: 'border-box',
      columnCount: '3',
      columnGap: '16px',
      width: '100%'
    });

    this._setupMasonry(setup);
    this._syncLayout();
  }

  columns(value) {
    if (value === undefined) {
      return this._columns;
    }

    const parsed = Math.floor(Number(value));
    this._columns = Number.isFinite(parsed) && parsed >= 1 ? parsed : 3;
    this.attr('data-columns', String(this._columns));
    this._syncLayout();
    return this;
  }

  gap(value) {
    if (value === undefined) {
      return this._gap;
    }

    const parsed = Number(value);
    this._gap = Number.isFinite(parsed) && parsed >= 0 ? parsed : 16;
    this._syncLayout();
    return this;
  }

  minColumnWidth(value) {
    if (value === undefined) {
      return this._minColumnWidth;
    }

    const parsed = Number(value);
    this._minColumnWidth = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    this._syncLayout();
    return this;
  }

  _syncLayout() {
    if (this._minColumnWidth) {
      this.style('columnCount', 'auto');
      this.style('columnWidth', `${this._minColumnWidth}px`);
      this.attr('data-column-mode', 'responsive');
    } else {
      this.style('columnCount', String(this._columns));
      this.style('columnWidth', 'auto');
      this.attr('data-column-mode', null);
    }
    this.style('columnGap', `${this._gap}px`);
    this.style('--yoya-masonry-gap', `${this._gap}px`);
  }

  _setupMasonry(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { columns, gap, minColumnWidth, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (columns !== undefined) {
        this.columns(columns);
      }
      if (gap !== undefined) {
        this.gap(gap);
      }
      if (minColumnWidth !== undefined) {
        this.minColumnWidth(minColumnWidth);
      }
    }
  }
}

export function vMasonry(first = null, second = null, third = null) {
  return createComponentFactory(VMasonry, first, second, third);
}
