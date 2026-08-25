import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue
} from '../components/shared.js';

export class VBreadcrumb extends HtmlElementNode {
  constructor(setup = null) {
    super('nav', null);
    this._separator = '›';
    this._list = new HtmlElementNode('ol').className('yoya-vbreadcrumb-list');

    this.className(componentClass, 'yoya-vbreadcrumb');
    this.attr({
      'aria-label': '面包屑',
      'data-separator': this._separator
    });
    super.child(this._list);
    this._setupBreadcrumb(setup);
    this._syncItems();
  }

  ariaLabel(content) {
    const label = resolveTextValue(content) || '面包屑';
    this.attr('aria-label', label);
    return this;
  }

  separator(content) {
    if (content === undefined) {
      return this._separator;
    }

    this._separator = content === null || content === '' ? '›' : content;
    this.attr('data-separator', resolveTextValue(this._separator));
    this._syncItems();
    return this;
  }

  items(value) {
    if (value === undefined) {
      return this._list.children();
    }

    replaceChildren(this._list, []);

    if (Array.isArray(value)) {
      value.forEach((item) => {
        this._list.child(normalizeBreadcrumbItem(item));
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

  _syncItems() {
    const items = this._list.children().filter((child) => child instanceof VBreadcrumbItem);

    this.attr('data-item-count', String(items.length));
    items.forEach((item, index) => {
      item._breadcrumbIndex = index;
      item._breadcrumbTotal = items.length;
      item._breadcrumbSeparator = this._separator;
      item._syncBreadcrumbItem();
    });
    return this;
  }

  _setupBreadcrumb(setup) {
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
      const { ariaLabel, children, items, separator, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (ariaLabel !== undefined) {
        this.ariaLabel(ariaLabel);
      }

      if (separator !== undefined) {
        this.separator(separator);
      }

      if (items !== undefined) {
        this.items(items);
      } else if (children !== undefined) {
        this.items(children);
      }

      return;
    }

    this.items([setup]);
  }
}

export class VBreadcrumbItem extends HtmlElementNode {
  constructor(setup = null, href = undefined) {
    super('li', null);
    this._href = null;
    this._active = false;
    this._breadcrumbIndex = 0;
    this._breadcrumbTotal = 1;
    this._breadcrumbSeparator = '›';
    this._linkBox = new HtmlElementNode('a').className('yoya-vbreadcrumb-link');
    this._currentBox = new HtmlElementNode('span').className('yoya-vbreadcrumb-current');
    this._separatorBox = new HtmlElementNode('span')
      .className('yoya-vbreadcrumb-separator')
      .attr('aria-hidden', 'true');

    this.className('yoya-vbreadcrumb-item');
    this.child(this._linkBox, this._currentBox, this._separatorBox);
    this._setupBreadcrumbItem(setup);

    if (href !== undefined) {
      this.href(href);
    }

    this._syncBreadcrumbItem();
  }

  label(content) {
    if (content === undefined) {
      return this._currentBox.textContent();
    }

    replaceChildren(this._linkBox, normalizeChildren(content));
    replaceChildren(this._currentBox, normalizeChildren(content));
    return this;
  }

  text(content) {
    return this.label(content);
  }

  content(content) {
    return this.label(content);
  }

  href(value) {
    if (value === undefined) {
      return this._href;
    }

    this._href = value === null || value === undefined ? null : String(resolveTextValue(value));
    this._syncBreadcrumbItem();
    return this;
  }

  to(value) {
    return this.href(value);
  }

  active(value = true) {
    this._active = Boolean(value);
    this._syncBreadcrumbItem();
    return this;
  }

  current(value = true) {
    return this.active(value);
  }

  _setupBreadcrumbItem(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup) && setup.length >= 2) {
      this.label(setup[0]);
      this.href(setup[1]);
      return;
    }

    if (isPlainObject(setup)) {
      const { active, children, content, current, href, label, text, to, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.text(text);
      } else if (content !== undefined) {
        this.content(content);
      } else if (children !== undefined) {
        this.label(children);
      }

      if (href !== undefined) {
        this.href(href);
      } else if (to !== undefined) {
        this.href(to);
      }

      if (active !== undefined) {
        this.active(active);
      } else if (current !== undefined) {
        this.active(current);
      }

      return;
    }

    this.label(setup);
  }

  _syncBreadcrumbItem() {
    const showLink = !this._active && Boolean(this._href);
    const showText = !showLink;

    this.attr('data-current', this._active ? 'true' : null);
    this.attr('aria-current', this._active ? 'page' : null);
    this._linkBox.attr('href', this._href || null);
    this._linkBox.style('display', showLink ? null : 'none');
    this._currentBox.style('display', showText ? null : 'none');
    this._separatorBox.style(
      'display',
      this._breadcrumbIndex >= this._breadcrumbTotal - 1 ? 'none' : null
    );
    replaceChildren(this._separatorBox, normalizeChildren(this._breadcrumbSeparator));
    return this;
  }
}

export function vBreadcrumb(first = null, second = null, third = null) {
  return createComponentFactory(VBreadcrumb, first, second, third);
}

export function vBreadcrumbItem(setup = null, href = undefined) {
  if (setup instanceof VBreadcrumbItem && href === undefined) {
    return setup;
  }

  return new VBreadcrumbItem(setup, href);
}

function normalizeBreadcrumbItem(item) {
  if (item instanceof VBreadcrumbItem) {
    return item;
  }

  if (Array.isArray(item) && item.length >= 2) {
    return vBreadcrumbItem(item[0], item[1]);
  }

  return vBreadcrumbItem(item);
}
