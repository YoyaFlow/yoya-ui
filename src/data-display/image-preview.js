import { HtmlElementNode } from '../html/index.js';
import { componentClass, createComponentFactory, isPlainObject } from '../components/shared.js';
import { VLazyImage } from '../async/lazy-image.js';

const MAX_ZOOM = 5;

export class VImagePreview extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._src = null;
    this._thumb = null;
    this._alt = '';
    this._zoom = 1;
    this._panX = 0;
    this._panY = 0;
    this._open = false;
    this._overlay = null;
    this._stage = null;
    this._escHandler = null;
    this._drag = null;
    this._onPanMove = null;
    this._onPanEnd = null;

    this._thumbImg = new HtmlElementNode('img').attr({ loading: 'lazy' });
    this.className(componentClass, 'yoya-vimagepreview');
    this.attr({ 'data-open': null });
    this.styles({
      boxSizing: 'border-box',
      cursor: 'zoom-in',
      display: 'inline-block',
      lineHeight: '0'
    });
    this.child(this._thumbImg);
    this.on('click', () => this.open());

    this._setupImagePreview(setup);
    this._syncThumb();
  }

  src(value) {
    if (value === undefined) {
      return this._src;
    }

    this._src = value === null || value === undefined ? null : String(value);
    this._syncThumb();
    if (this._open && this._lazy) {
      this._lazy.src(this._src);
    }
    return this;
  }

  thumb(value) {
    if (value === undefined) {
      return this._thumb;
    }

    this._thumb = value === null || value === undefined ? null : String(value);
    this._syncThumb();
    return this;
  }

  alt(value) {
    if (value === undefined) {
      return this._alt;
    }

    this._alt = String(value ?? '');
    this._syncThumb();
    if (this._open && this._lazy) {
      this._lazy.alt(this._alt);
    }
    return this;
  }

  zoom(value) {
    if (value === undefined) {
      return this._zoom;
    }

    const parsed = Number(value);
    this._zoom = Number.isFinite(parsed) ? Math.min(MAX_ZOOM, Math.max(1, parsed)) : 1;
    if (this._zoom === 1) {
      this._panX = 0;
      this._panY = 0;
    }
    this._syncStage();
    return this;
  }

  resetZoom() {
    this._zoom = 1;
    this._panX = 0;
    this._panY = 0;
    this._syncStage();
    return this;
  }

  state() {
    return this._open ? 'open' : 'closed';
  }

  open() {
    if (this._open || !this._src || !this._el) {
      return this;
    }

    this._open = true;
    this.attr('data-open', 'true');
    this._buildOverlay();
    this._escHandler = (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
    return this;
  }

  close() {
    if (!this._open) {
      return this;
    }

    this._open = false;
    this.attr('data-open', null);
    this._endPan();

    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
    if (this._overlay) {
      this._overlay.destroy();
      this._overlay = null;
    }
    this._stage = null;
    this._lazy = null;
    return this;
  }

  toggle() {
    return this._open ? this.close() : this.open();
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  _syncThumb() {
    this._thumbImg.attr('src', this._thumb || this._src);
    this._thumbImg.attr('alt', this._alt || null);
  }

  _buildOverlay() {
    const lazy = new VLazyImage().src(this._src).alt(this._alt);
    this._lazy = lazy;

    const stage = new HtmlElementNode('div')
      .className('yoya-vimagepreview-stage')
      .styles({
        display: 'flex',
        maxHeight: '86vh',
        maxWidth: '90vw',
        position: 'relative'
      })
      .on('mousedown', (event) => this._startPan(event));
    stage.child(lazy);
    this._stage = stage;

    const closeButton = new HtmlElementNode('button')
      .className('yoya-vimagepreview-close')
      .attr({ 'aria-label': '关闭预览', type: 'button' })
      .text('×')
      .on('click', () => this.close());

    const zoomOut = new HtmlElementNode('button')
      .className('yoya-vimagepreview-tool')
      .attr({ 'aria-label': '缩小', type: 'button' })
      .text('−')
      .on('click', () => this.zoom(this._zoom - 0.5));
    const zoomReset = new HtmlElementNode('button')
      .className('yoya-vimagepreview-tool')
      .attr({ 'aria-label': '重置缩放', type: 'button' })
      .text('1:1')
      .on('click', () => this.resetZoom());
    const zoomIn = new HtmlElementNode('button')
      .className('yoya-vimagepreview-tool')
      .attr({ 'aria-label': '放大', type: 'button' })
      .text('＋')
      .on('click', () => this.zoom(this._zoom + 0.5));

    const toolbar = new HtmlElementNode('div')
      .className('yoya-vimagepreview-toolbar')
      .child(zoomOut, zoomReset, zoomIn);

    const backdrop = new HtmlElementNode('div')
      .className('yoya-vimagepreview-backdrop')
      .on('click', () => this.close());

    const overlay = new HtmlElementNode('div')
      .className(componentClass, 'yoya-vimagepreview-overlay')
      .styles({
        alignItems: 'center',
        display: 'flex',
        inset: '0',
        justifyContent: 'center',
        position: 'fixed',
        zIndex: '1000'
      })
      .child(backdrop, stage, closeButton, toolbar);

    this._overlay = overlay;
    overlay.bindTo(document.body);
    this._syncStage();
  }

  _syncStage() {
    if (!this._stage) {
      return;
    }

    this._stage.style(
      'transform',
      `scale(${this._zoom}) translate(${this._panX}px, ${this._panY}px)`
    );
  }

  _startPan(event) {
    if (this._zoom <= 1) {
      return;
    }

    this._drag = {
      panX: this._panX,
      panY: this._panY,
      startX: event.clientX,
      startY: event.clientY
    };
    this._onPanMove = (moveEvent) => this._panMove(moveEvent);
    this._onPanEnd = () => this._endPan();
    document.addEventListener('mousemove', this._onPanMove);
    document.addEventListener('mouseup', this._onPanEnd);
  }

  _panMove(event) {
    if (!this._drag) {
      return;
    }

    this._panX = this._drag.panX + (event.clientX - this._drag.startX);
    this._panY = this._drag.panY + (event.clientY - this._drag.startY);
    this._syncStage();
  }

  _endPan() {
    this._drag = null;
    if (this._onPanMove) {
      document.removeEventListener('mousemove', this._onPanMove);
      this._onPanMove = null;
    }
    if (this._onPanEnd) {
      document.removeEventListener('mouseup', this._onPanEnd);
      this._onPanEnd = null;
    }
  }

  _setupImagePreview(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { alt, src, thumb, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (alt !== undefined) {
        this.alt(alt);
      }
      if (thumb !== undefined) {
        this.thumb(thumb);
      }
      if (src !== undefined) {
        this.src(src);
      }
    }
  }
}

export function vImagePreview(first = null, second = null, third = null) {
  return createComponentFactory(VImagePreview, first, second, third);
}
