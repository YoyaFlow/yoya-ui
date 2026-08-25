import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot
} from '../components/shared.js';

export class VAnchor extends HtmlElementNode {
  constructor(setup = null) {
    super('nav', null);
    this._activeHref = null;
    this._offset = 80;
    this._target = null;
    this._trackingBound = false;
    this._list = new HtmlElementNode('ul').className('yoya-vanchor-list');

    this.className(componentClass, 'yoya-vanchor');
    this.attr({
      'aria-label': '页面锚点',
      'data-offset': '80'
    });
    this.on('click', (event) => this._handleAnchorClick(event));
    super.child(this._list);
    this._setupAnchor(setup);
    this._syncItems();
  }

  ariaLabel(content) {
    const label = resolveTextValue(content) || '页面锚点';
    this.attr('aria-label', label);
    return this;
  }

  offset(value) {
    if (value === undefined) {
      return this._offset;
    }

    this._offset = Math.max(0, Number(resolveTextValue(value)) || 0);
    this.attr('data-offset', String(this._offset));
    return this;
  }

  target(value) {
    if (value === undefined) {
      return this._target;
    }

    this._target = value || null;
    return this;
  }

  items(value) {
    if (value === undefined) {
      return this._list.children();
    }

    replaceChildren(this._list, []);

    if (Array.isArray(value)) {
      value.forEach((item) => {
        this._list.child(normalizeAnchorItem(item));
      });
    }

    this._syncItems();
    return this;
  }

  child(...children) {
    this._list.child(...children);
    this._syncItems();
    return this;
  }

  active(value) {
    if (value === undefined) {
      return this._activeHref;
    }

    this._activeHref = value || null;
    this._syncActiveState();
    return this;
  }

  activeHref(value) {
    return this.active(value);
  }

  renderDom() {
    const element = super.renderDom();
    this._bindScrollTracking();
    return element;
  }

  destroy() {
    this._trackingBound = false;
    return super.destroy();
  }

  _syncItems() {
    const items = this._list.children().filter((child) => child instanceof VAnchorItem);

    this.attr('data-item-count', String(items.length));
    this._syncActiveState();
    return this;
  }

  _syncActiveState() {
    const activeHref = this._activeHref;

    this.attr('data-active-href', activeHref || null);
    const visit = (children) => {
      children.forEach((child) => {
        if (child instanceof VAnchorItem) {
          child.active(child.href() === activeHref);
          visit(child._childrenBox.children());
        }
      });
    };
    visit(this._list.children());
    return this;
  }

  _handleAnchorClick(event) {
    const link = event.target.closest?.('.yoya-vanchor-link');
    if (!link || !this._list.renderDom().contains(link)) {
      return;
    }

    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      return;
    }

    event.preventDefault();
    this._scrollToTarget(href);
  }

  _scrollToTarget(href) {
    const targetElement = this._resolveTargetElement(href);

    if (targetElement) {
      this._scrollElementIntoView(targetElement);
    }

    if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
      history.replaceState(null, '', href);
    }

    this.active(href);
  }

  _scrollElementIntoView(targetElement) {
    const container = this._resolveScrollContainer();
    const top = this._targetTop(targetElement);

    if (container === window || container === null) {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ behavior: 'smooth', top });
      }
      return;
    }

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ behavior: 'smooth', top });
    } else {
      container.scrollTop = top;
    }
  }

  _resolveScrollContainer() {
    if (!this._target) {
      return typeof window === 'undefined' ? null : window;
    }

    return resolveTargetElement(this._target) || (typeof window === 'undefined' ? null : window);
  }

  _resolveTargetElement(href) {
    const id = String(href).replace(/^#/, '');
    if (!id) {
      return null;
    }

    const scope = this._target ? resolveTargetElement(this._target) : document;
    if (!scope) {
      return null;
    }

    if (typeof scope.getElementById === 'function') {
      return scope.getElementById(id);
    }

    return scope.querySelector(`#${cssEscape(id)}`);
  }

  _targetTop(targetElement) {
    const container = this._resolveScrollContainer();
    const offset = this._offset || 0;

    if (!container || container === window) {
      const scrollTop =
        typeof window !== 'undefined'
          ? window.scrollY || document.documentElement?.scrollTop || 0
          : 0;
      return scrollTop + targetElement.getBoundingClientRect().top - offset;
    }

    const containerRect = container.getBoundingClientRect();
    return (
      container.scrollTop + targetElement.getBoundingClientRect().top - containerRect.top - offset
    );
  }

  _syncActiveFromScroll() {
    const container = this._resolveScrollContainer();
    const containerRect =
      container && container !== window && typeof container.getBoundingClientRect === 'function'
        ? container.getBoundingClientRect()
        : null;
    const threshold = this._offset || 0;
    const items = [];
    const collect = (children) => {
      children.forEach((child) => {
        if (child instanceof VAnchorItem) {
          items.push(child);
          collect(child._childrenBox.children());
        }
      });
    };
    collect(this._list.children());

    let activeHref = null;
    let foundTarget = false;
    items.forEach((item) => {
      const href = item.href();
      if (!href) {
        return;
      }

      const targetElement = this._resolveTargetElement(href);
      if (!targetElement) {
        return;
      }

      foundTarget = true;
      const rect = targetElement.getBoundingClientRect();
      const top = containerRect ? rect.top - containerRect.top : rect.top;
      if (top - threshold <= 0) {
        activeHref = href;
      }
    });

    if (foundTarget && activeHref !== this._activeHref) {
      this.active(activeHref);
    }
  }

  _bindScrollTracking() {
    if (this._trackingBound || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this._trackingBound = true;
    const handler = () => this._syncActiveFromScroll();
    const options = { capture: true, passive: true };

    window.addEventListener('scroll', handler, options);
    document.addEventListener('scroll', handler, options);
    this._cleanup.push(() => {
      window.removeEventListener('scroll', handler, { capture: true });
      document.removeEventListener('scroll', handler, { capture: true });
    });
    this._syncActiveFromScroll();
  }

  _setupAnchor(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup)) {
      this.items(setup);
      return;
    }

    if (isPlainObject(setup)) {
      const { activeHref, ariaLabel, children, items, offset, target, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (ariaLabel !== undefined) {
        this.ariaLabel(ariaLabel);
      }

      if (offset !== undefined) {
        this.offset(offset);
      }

      if (target !== undefined) {
        this.target(target);
      }

      if (items !== undefined) {
        this.items(items);
      } else if (children !== undefined) {
        this.items(children);
      }

      if (activeHref !== undefined) {
        this.active(activeHref);
      }

      return;
    }

    this.items([setup]);
  }
}

export class VAnchorItem extends HtmlElementNode {
  constructor(setup = null, href = undefined) {
    super('li', null);
    this._href = null;
    this._title = '';
    this._active = false;
    this._linkBox = new HtmlElementNode('a').className('yoya-vanchor-link');
    this._childrenBox = new HtmlElementNode('ul').className('yoya-vanchor-children');

    this.className('yoya-vanchor-item');
    this.child(this._linkBox, this._childrenBox);
    this._setupAnchorItem(setup);

    if (href !== undefined) {
      this.href(href);
    }

    this._syncAnchorItem();
  }

  title(content) {
    if (content === undefined) {
      return this._title;
    }

    this._title = content;
    replaceChildren(this._linkBox, normalizeChildren(content ?? ''));
    return this;
  }

  text(content) {
    return this.title(content);
  }

  label(content) {
    return this.title(content);
  }

  href(value) {
    if (value === undefined) {
      return this._href;
    }

    this._href = value === null || value === undefined ? null : String(resolveTextValue(value));
    this._syncAnchorItem();
    return this;
  }

  nested(setup) {
    if (setup === undefined) {
      return this._childrenBox.children();
    }

    if (Array.isArray(setup)) {
      replaceChildren(this._childrenBox, []);
      setup.forEach((item) => {
        this._childrenBox.child(normalizeAnchorItem(item));
      });
    } else {
      setupContentSlot(this._childrenBox, setup);
    }

    this._syncAnchorItem();
    return this;
  }

  subItems(setup) {
    return this.nested(setup);
  }

  active(value = true) {
    this._active = Boolean(value);
    this.attr('data-active', this._active ? 'true' : null);
    this.attr('aria-current', this._active ? 'true' : null);
    this._syncAnchorItem();
    return this;
  }

  _setupAnchorItem(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup) && setup.length >= 2) {
      this.title(setup[0]);
      this.href(setup[1]);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        active,
        children,
        content,
        href,
        items,
        label,
        nested,
        text,
        title,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (title !== undefined) {
        this.title(title);
      } else if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.text(text);
      } else if (content !== undefined) {
        this.text(content);
      }

      if (href !== undefined) {
        this.href(href);
      }

      const nestedSetup = nested ?? items ?? children;
      if (nestedSetup !== undefined) {
        this.nested(nestedSetup);
      }

      if (active !== undefined) {
        this.active(active);
      }

      return;
    }

    this.title(setup);
  }

  _syncAnchorItem() {
    const hasChildren = this._childrenBox.children().length > 0;

    this._linkBox.attr('href', this._href || null);
    this._childrenBox.style('display', hasChildren ? null : 'none');
    this.attr('data-has-children', hasChildren ? 'true' : null);
    return this;
  }
}

export function vAnchor(first = null, second = null, third = null) {
  return createComponentFactory(VAnchor, first, second, third);
}

export function vAnchorItem(setup = null, href = undefined) {
  if (setup instanceof VAnchorItem && href === undefined) {
    return setup;
  }

  return new VAnchorItem(setup, href);
}

function normalizeAnchorItem(item) {
  if (item instanceof VAnchorItem) {
    return item;
  }

  if (Array.isArray(item) && item.length >= 2) {
    return vAnchorItem(item[0], item[1]);
  }

  return vAnchorItem(item);
}

function resolveTargetElement(target) {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target;
  }

  if (typeof target === 'string' && typeof document !== 'undefined') {
    return document.querySelector(target);
  }

  return target || null;
}

function cssEscape(value) {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value;
}
