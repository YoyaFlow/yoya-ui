import { ViewNode } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

export class VDetail extends HtmlElementNode {
  constructor(setup = null) {
    super('dl', null);
    this.className(componentClass, 'yoya-vdetail');
    this.styles({
      border: '1px solid #d8dee8',
      borderRadius: '8px',
      display: 'grid',
      gap: '0',
      margin: '0',
      overflow: 'hidden'
    });
    this._setupDetail(setup);
  }

  items(value) {
    if (value === undefined) {
      return this.children();
    }

    replaceChildren(this, []);

    if (Array.isArray(value)) {
      value.forEach((item) => {
        this.child(normalizeDetailItem(item));
      });
    }

    return this;
  }

  _setupDetail(setup) {
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
      this.setup(setup);
      return;
    }

    this.child(setup);
  }
}

export class VDetailItem extends HtmlElementNode {
  constructor(setup = null, value = undefined) {
    super('div', null);
    this._labelBox = new HtmlElementNode('dt').className('yoya-vdetail-label');
    this._valueBox = new HtmlElementNode('dd').className('yoya-vdetail-value');

    this.className('yoya-vdetail-item');
    this.styles({
      alignItems: 'start',
      display: 'grid',
      gap: '12px',
      gridTemplateColumns: 'minmax(120px, 180px) minmax(0, 1fr)',
      padding: '12px 16px'
    });
    this._labelBox.styles({
      color: '#475569',
      fontWeight: '700',
      margin: '0',
      wordBreak: 'break-word'
    });
    this._valueBox.styles({
      color: '#111827',
      margin: '0',
      wordBreak: 'break-word'
    });
    this.child(this._labelBox, this._valueBox);
    this._setupDetailItem(setup, value);
  }

  label(content) {
    if (content === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(content));
    return this;
  }

  value(content) {
    if (content === undefined) {
      return this._valueBox.textContent();
    }

    replaceChildren(this._valueBox, normalizeChildren(content));
    return this;
  }

  content(content) {
    return this.value(content);
  }

  _setupDetailItem(setup, value) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup) && value === undefined && setup.length >= 2) {
      this.label(setup[0]);
      this.value(setup[1]);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, content, label, text, value: itemValue, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      }

      if (itemValue !== undefined) {
        this.value(itemValue);
      } else if (content !== undefined) {
        this.value(content);
      } else if (text !== undefined) {
        this.value(text);
      } else if (children !== undefined) {
        this.value(children);
      }

      return;
    }

    if (value !== undefined) {
      this.label(setup);
      this.value(value);
      return;
    }

    this.value(setup);
  }
}

export function vDetail(first = null, second = null, third = null) {
  return createComponentFactory(VDetail, first, second, third);
}

export function vDetailItem(setup = null, value = undefined) {
  return setup instanceof VDetailItem && value === undefined
    ? setup
    : new VDetailItem(setup, value);
}

function normalizeDetailItem(item) {
  if (item instanceof VDetailItem) {
    return item;
  }

  if (Array.isArray(item) && item.length >= 2) {
    return vDetailItem(item[0], item[1]);
  }

  if (item instanceof ViewNode) {
    return vDetailItem({ value: item });
  }

  if (isPlainObject(item)) {
    return vDetailItem(item);
  }

  return vDetailItem({ value: item });
}
