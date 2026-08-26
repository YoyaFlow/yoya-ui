import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  setupContentSlot
} from '../components/shared.js';

export class VScroll extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._blocked = false;
    this._loading = false;
    this._loop = false;
    this._page = 0;
    this._threshold = 80;
    this._checkScheduled = false;
    this._loadMoreHandler = null;
    this._renderItem = null;
    this._itemsData = [];
    this._loadingContent = '加载中…';
    this._endContent = '没有更多了';

    this._list = new HtmlElementNode('div').className('yoya-vscroll-list');
    this._statusBox = new HtmlElementNode('span').className('yoya-vscroll-status');
    this._footer = new HtmlElementNode('div')
      .className('yoya-vscroll-footer')
      .child(this._statusBox);

    this.className(componentClass, 'yoya-vscroll');
    this.attr({
      'aria-busy': 'false',
      'aria-live': 'polite',
      'data-page': '0',
      'data-threshold': '80',
      role: 'feed'
    });
    this.styles({
      boxSizing: 'border-box',
      minWidth: '0',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      position: 'relative'
    });
    this.child(this._list, this._footer);
    this.on('scroll', () => this._handleScroll());
    this._setupScroll(setup);
    this._syncFooter();
  }

  content(setup) {
    if (setup === undefined) {
      return this._list.children();
    }

    this._itemsData = [];
    this._renderItem = null;
    setupContentSlot(this._list, setup);
    this._scheduleCheck();
    return this;
  }

  items(value, render = null) {
    if (value === undefined) {
      return this._itemsData.slice();
    }

    if (typeof render === 'function') {
      this._renderItem = render;
    }

    this._itemsData = Array.isArray(value) ? value.slice() : [value];
    this._renderItems();
    this._scheduleCheck();
    return this;
  }

  append(value, render = null) {
    const incoming = Array.isArray(value) ? value : [value];

    if (typeof render === 'function') {
      this._renderItem = render;
    }

    this._itemsData = this._itemsData.concat(incoming);
    this._renderItems();
    if (incoming.length > 0) {
      this._scheduleCheck();
    }
    return this;
  }

  renderItem(handler) {
    if (handler === undefined) {
      return this._renderItem;
    }

    this._renderItem = typeof handler === 'function' ? handler : null;
    if (this._itemsData.length > 0) {
      this._renderItems();
    }
    return this;
  }

  loadMore(handler) {
    if (handler === undefined) {
      return this._loadMoreHandler;
    }

    this._loadMoreHandler = typeof handler === 'function' ? handler : null;
    if (this._loadMoreHandler) {
      this._scheduleCheck();
    }
    return this;
  }

  onLoadMore(handler) {
    return this.loadMore(handler);
  }

  loop(value) {
    if (value === undefined) {
      return this._loop;
    }

    this._loop = Boolean(value);
    if (this._loop) {
      this._blocked = false;
    }
    this.attr('data-loop', this._loop ? 'true' : null);
    this.attr('data-blocked', this._blocked ? 'true' : null);
    this._syncFooter();
    return this;
  }

  block(value) {
    if (value === undefined) {
      return this._blocked;
    }

    this._blocked = Boolean(value);
    if (this._blocked) {
      this._loop = false;
    }
    this.attr('data-blocked', this._blocked ? 'true' : null);
    this.attr('data-loop', this._loop ? 'true' : null);
    this._syncFooter();
    return this;
  }

  blocked(value) {
    return this.block(value);
  }

  loading(value) {
    if (value === undefined) {
      return this._loading;
    }

    this._loading = Boolean(value);
    this.attr('data-loading', this._loading ? 'true' : null);
    this.attr('aria-busy', this._loading ? 'true' : 'false');
    this._syncFooter();
    return this;
  }

  threshold(value) {
    if (value === undefined) {
      return this._threshold;
    }

    const parsed = Number(value);
    this._threshold = Number.isFinite(parsed) && parsed >= 0 ? parsed : 80;
    this.attr('data-threshold', String(this._threshold));
    return this;
  }

  page(value) {
    if (value === undefined) {
      return this._page;
    }

    const parsed = Number(value);
    this._page = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    this.attr('data-page', String(this._page));
    return this;
  }

  loadingText(content) {
    if (content === undefined) {
      return this._loadingContent;
    }

    this._loadingContent = content;
    this._syncFooter();
    return this;
  }

  endText(content) {
    if (content === undefined) {
      return this._endContent;
    }

    this._endContent = content;
    this._syncFooter();
    return this;
  }

  reset() {
    this._itemsData = [];
    this._renderItem = null;
    this._page = 0;
    this._blocked = false;
    this._loading = false;
    this.attr('data-blocked', null);
    this.attr('data-loading', null);
    this.attr('data-page', '0');
    this.attr('aria-busy', 'false');
    replaceChildren(this._list, []);
    this._syncFooter();
    return this;
  }

  clear() {
    return this.reset();
  }

  load() {
    if (
      this._deleted ||
      this._loading ||
      this._blocked ||
      typeof this._loadMoreHandler !== 'function'
    ) {
      return Promise.resolve(false);
    }

    this.page(this._page + 1);
    this.loading(true);

    const context = {
      append: (value, render) => this.append(value, render),
      block: (value = true) => this.block(value),
      done: () => this.block(true),
      page: this._page,
      scroll: this
    };

    let result;
    try {
      result = this._loadMoreHandler(context);
    } catch (error) {
      this.loading(false);
      return Promise.reject(error);
    }

    if (result && typeof result.then === 'function') {
      return Promise.resolve(result).then(
        (value) => {
          if (value !== undefined && value !== null) {
            this.append(value);
          }
          this.loading(false);
          return true;
        },
        (error) => {
          this.loading(false);
          throw error;
        }
      );
    }

    if (result !== undefined && result !== null) {
      this.append(result);
    }
    this.loading(false);
    return Promise.resolve(true);
  }

  check() {
    return this._checkLoad();
  }

  renderDom() {
    const element = super.renderDom();
    this._scheduleCheck();
    return element;
  }

  _renderItems() {
    replaceChildren(
      this._list,
      this._itemsData.map((item, index) =>
        this._renderItem ? this._renderItem(item, index, this) : item
      )
    );
    return this;
  }

  _handleScroll() {
    this._checkLoad();
  }

  _checkLoad() {
    if (this._loading || this._blocked || !this._el) {
      return this;
    }

    const distance =
      (this._el.scrollHeight || 0) - (this._el.scrollTop || 0) - (this._el.clientHeight || 0);

    if (distance <= this._threshold) {
      this.load();
    }

    return this;
  }

  _scheduleCheck() {
    if (this._checkScheduled || this._deleted || typeof queueMicrotask !== 'function') {
      return this;
    }

    this._checkScheduled = true;
    queueMicrotask(() => {
      this._checkScheduled = false;
      this._checkLoad();
    });
    return this;
  }

  _syncFooter() {
    if (this._loading) {
      replaceChildren(this._statusBox, normalizeChildren(this._loadingContent));
      this._footer.style('display', 'flex');
      return this;
    }

    if (this._blocked) {
      replaceChildren(this._statusBox, normalizeChildren(this._endContent));
      this._footer.style('display', 'flex');
      return this;
    }

    replaceChildren(this._statusBox, []);
    this._footer.style('display', 'none');
    return this;
  }

  _setupScroll(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        block,
        blocked,
        children,
        content,
        endText,
        items,
        loadMore,
        loading,
        loadingText,
        loop,
        onLoadMore,
        page,
        renderItem,
        reset,
        threshold,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (renderItem !== undefined) {
        this.renderItem(renderItem);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (children !== undefined) {
        this.content(children);
      }

      if (items !== undefined) {
        this.items(items);
      }

      if (loadMore !== undefined) {
        this.loadMore(loadMore);
      } else if (onLoadMore !== undefined) {
        this.loadMore(onLoadMore);
      }

      if (loop !== undefined) {
        this.loop(loop);
      }

      if (block !== undefined) {
        this.block(block);
      } else if (blocked !== undefined) {
        this.block(blocked);
      }

      if (loading !== undefined) {
        this.loading(loading);
      }

      if (threshold !== undefined) {
        this.threshold(threshold);
      }

      if (page !== undefined) {
        this.page(page);
      }

      if (loadingText !== undefined) {
        this.loadingText(loadingText);
      }

      if (endText !== undefined) {
        this.endText(endText);
      }

      if (reset !== undefined && reset) {
        this.reset();
      }

      return;
    }

    this.content(setup);
  }
}

export function vScroll(first = null, second = null, third = null) {
  return createComponentFactory(VScroll, first, second, third);
}
