import { HtmlElementNode } from '../html/index.js';
import { ArrowLeftOutlined, ArrowRightOutlined } from '../svg/icons.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren
} from '../components/shared.js';

export class VCarousel extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._activeIndex = 0;
    this._itemsData = [];
    this._renderItem = null;
    this._autoplay = false;
    this._interval = 3500;
    this._loop = true;
    this._showArrows = true;
    this._showDots = true;
    this._height = null;
    this._timer = null;
    this._paused = false;

    this._viewport = new HtmlElementNode('div').className('yoya-vcarousel-viewport');
    this._track = new HtmlElementNode('div').className('yoya-vcarousel-track');
    this._prevButton = new HtmlElementNode('button')
      .className('yoya-vcarousel-arrow yoya-vcarousel-arrow--prev')
      .attr({ 'aria-label': '上一项', type: 'button' })
      .child(ArrowLeftOutlined())
      .on('click', () => this.prev());
    this._nextButton = new HtmlElementNode('button')
      .className('yoya-vcarousel-arrow yoya-vcarousel-arrow--next')
      .attr({ 'aria-label': '下一项', type: 'button' })
      .child(ArrowRightOutlined())
      .on('click', () => this.next());
    this._dots = new HtmlElementNode('div')
      .className('yoya-vcarousel-dots')
      .attr({ 'aria-label': '轮播指示', role: 'tablist' });

    this._viewport.child(this._track);
    this.className(componentClass, 'yoya-vcarousel');
    this.attr({
      'aria-label': '走马灯，第 1 / 0 项',
      'aria-roledescription': 'carousel',
      'data-active': '0',
      'data-count': '0',
      'data-loop': 'true',
      role: 'region',
      tabindex: '0'
    });
    this.styles({
      boxSizing: 'border-box',
      display: 'grid',
      gridTemplateRows: 'minmax(0, 1fr) auto',
      minWidth: '0',
      position: 'relative'
    });
    this.child(this._viewport, this._prevButton, this._nextButton, this._dots);
    this.on('keydown', (event) => this._handleKeydown(event));
    this.on('mouseenter', () => this._pause());
    this.on('mouseleave', () => this._resume());
    this.on('focusin', () => this._pause());
    this.on('focusout', (event) => {
      if (!event.relatedTarget || !this._el?.contains(event.relatedTarget)) {
        this._resume();
      }
    });
    this._setupCarousel(setup);
    this._syncState();
  }

  slides(value, render = null) {
    if (value === undefined) {
      return this._itemsData.slice();
    }

    if (typeof render === 'function') {
      this._renderItem = render;
    }

    this._itemsData = Array.isArray(value) ? value.slice() : [value];
    this._activeIndex = 0;
    this._renderSlides();
    this._renderDots();
    this._syncState();
    return this;
  }

  items(value, render = null) {
    return this.slides(value, render);
  }

  renderItem(handler) {
    if (handler === undefined) {
      return this._renderItem;
    }

    this._renderItem = typeof handler === 'function' ? handler : null;
    if (this._itemsData.length > 0) {
      this._renderSlides();
    }
    return this;
  }

  active(value) {
    if (value === undefined) {
      return this._activeIndex;
    }

    const count = this._itemsData.length;
    let nextIndex = Math.floor(Number(value));

    if (!Number.isFinite(nextIndex)) {
      nextIndex = 0;
    }

    if (count === 0) {
      this._activeIndex = 0;
      this._syncState();
      return this;
    }

    if (this._loop) {
      this._activeIndex = ((nextIndex % count) + count) % count;
    } else {
      this._activeIndex = Math.max(0, Math.min(count - 1, nextIndex));
    }

    this._syncState();
    return this;
  }

  goTo(value) {
    return this.active(value);
  }

  next() {
    if (this._itemsData.length === 0) {
      return this;
    }

    if (this._loop) {
      return this.active(this._activeIndex + 1);
    }

    return this.active(Math.min(this._activeIndex + 1, this._itemsData.length - 1));
  }

  prev() {
    if (this._itemsData.length === 0) {
      return this;
    }

    if (this._loop) {
      return this.active(this._activeIndex - 1);
    }

    return this.active(Math.max(0, this._activeIndex - 1));
  }

  loop(value) {
    if (value === undefined) {
      return this._loop;
    }

    this._loop = Boolean(value);
    this.attr('data-loop', this._loop ? 'true' : null);
    this._syncState();
    return this;
  }

  autoplay(value) {
    if (value === undefined) {
      return this._autoplay;
    }

    this._autoplay = Boolean(value);
    this.attr('data-autoplay', this._autoplay ? 'true' : null);
    this._syncPlayback();
    return this;
  }

  start() {
    return this.autoplay(true);
  }

  stop() {
    return this.autoplay(false);
  }

  interval(value) {
    if (value === undefined) {
      return this._interval;
    }

    const parsed = Number(value);
    this._interval = Number.isFinite(parsed) && parsed > 0 ? parsed : 3500;
    if (this._autoplay) {
      this._clearTimer();
      this._startTimer();
    }
    return this;
  }

  arrows(value) {
    if (value === undefined) {
      return this._showArrows;
    }

    this._showArrows = Boolean(value);
    this.attr('data-arrows', this._showArrows ? 'true' : null);
    this._prevButton.style('display', this._showArrows ? null : 'none');
    this._nextButton.style('display', this._showArrows ? null : 'none');
    return this;
  }

  dots(value) {
    if (value === undefined) {
      return this._showDots;
    }

    this._showDots = Boolean(value);
    this.attr('data-dots', this._showDots ? 'true' : null);
    this._dots.style('display', this._showDots ? null : 'none');
    return this;
  }

  height(value) {
    if (value === undefined) {
      return this._height;
    }

    this._height = value || null;
    this.style('height', this._height);
    this.style('minHeight', this._height);
    return this;
  }

  destroy() {
    this._clearTimer();
    return super.destroy();
  }

  _handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.active(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.active(this._itemsData.length - 1);
    }
  }

  _renderSlides() {
    const count = this._itemsData.length;

    replaceChildren(
      this._track,
      this._itemsData.map((item, index) => {
        const slide = new HtmlElementNode('div').className('yoya-vcarousel-slide').attr({
          'aria-label': `${index + 1} / ${count}`,
          'aria-roledescription': 'slide',
          role: 'group'
        });
        slide.child(this._renderItem ? this._renderItem(item, index, this) : item);
        return slide;
      })
    );
  }

  _renderDots() {
    replaceChildren(
      this._dots,
      this._itemsData.map((_, index) => {
        const dot = new HtmlElementNode('button')
          .className('yoya-vcarousel-dot')
          .attr({
            'aria-label': `跳转到第 ${index + 1} 项`,
            role: 'tab',
            tabindex: '-1',
            type: 'button'
          })
          .on('click', () => this.active(index));
        return dot;
      })
    );
  }

  _syncState() {
    const count = this._itemsData.length;

    this.attr('data-active', String(this._activeIndex));
    this.attr('data-count', String(count));
    this.attr('aria-label', `走马灯，第 ${this._activeIndex + 1} / ${count} 项`);
    this._track.style(
      'transform',
      count > 0
        ? this._activeIndex === 0
          ? 'translateX(0%)'
          : `translateX(-${this._activeIndex * 100}%)`
        : null
    );

    this._dots.children().forEach((dot, index) => {
      dot.attr('aria-selected', index === this._activeIndex ? 'true' : null);
      dot.attr('tabindex', index === this._activeIndex ? '0' : '-1');
    });

    this._syncArrows();
    this._syncPlayback();
    this._emitChange();
    return this;
  }

  _syncArrows() {
    const count = this._itemsData.length;
    const canPrev = count > 1 && (this._loop || this._activeIndex > 0);
    const canNext = count > 1 && (this._loop || this._activeIndex < count - 1);

    this._prevButton.attr('disabled', canPrev ? null : true);
    this._nextButton.attr('disabled', canNext ? null : true);
    this._prevButton.attr('aria-disabled', canPrev ? null : 'true');
    this._nextButton.attr('aria-disabled', canNext ? null : 'true');
  }

  _syncPlayback() {
    if (this._autoplay && !this._paused && this._itemsData.length > 1) {
      this._startTimer();
    } else {
      this._clearTimer();
    }
  }

  _startTimer() {
    if (this._timer || !this._autoplay || this._paused || this._itemsData.length < 2) {
      return;
    }

    this._timer = setInterval(() => this.next(), this._interval);
  }

  _clearTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _pause() {
    if (!this._autoplay) {
      return;
    }

    this._paused = true;
    this.attr('data-paused', 'true');
    this._clearTimer();
  }

  _emitChange() {
    if (!this._el) {
      return;
    }

    this._el.dispatchEvent(
      new CustomEvent('change', {
        bubbles: false,
        detail: {
          count: this._itemsData.length,
          index: this._activeIndex
        }
      })
    );
  }

  _resume() {
    if (!this._autoplay) {
      return;
    }

    this._paused = false;
    this.attr('data-paused', null);
    this._startTimer();
  }

  _setupCarousel(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        active,
        arrows,
        autoplay,
        children,
        dots,
        height,
        interval,
        items,
        loop,
        renderItem,
        slides,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (renderItem !== undefined) {
        this.renderItem(renderItem);
      }

      const slideSetup = slides ?? items ?? children;
      if (slideSetup !== undefined) {
        this.slides(slideSetup);
      }

      if (active !== undefined) {
        this.active(active);
      }

      if (loop !== undefined) {
        this.loop(loop);
      }

      if (autoplay !== undefined) {
        this.autoplay(autoplay);
      }

      if (interval !== undefined) {
        this.interval(interval);
      }

      if (arrows !== undefined) {
        this.arrows(arrows);
      }

      if (dots !== undefined) {
        this.dots(dots);
      }

      if (height !== undefined) {
        this.height(height);
      }

      return;
    }

    this.slides(setup);
  }
}

export function vCarousel(first = null, second = null, third = null) {
  return createComponentFactory(VCarousel, first, second, third);
}
