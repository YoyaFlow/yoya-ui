import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

export class VDialog extends HtmlElementNode {
  constructor(setup = null) {
    super('dialog', null);
    this.className(componentClass, 'yoya-vdialog');
    this.styles({
      background: '#ffffff',
      border: 'none',
      borderRadius: '10px',
      boxSizing: 'border-box',
      color: '#172033',
      maxWidth: 'min(92vw, 680px)',
      padding: '0',
      boxShadow: '0 24px 72px rgba(15, 23, 42, 0.2)',
      width: '100%'
    });
    this.attr('aria-modal', 'true');
    this.attr('role', 'dialog');
    this._pendingOpenSync = false;
    this._content = new HtmlElementNode('div').className('yoya-vdialog-content');
    this.child(this._content);
    this.on('cancel', (event) => {
      event.preventDefault();
      this.close();
    });
    this.on('close', () => {
      this.setState('open', false);
      this.attr('data-open', null);
      this.attr('open', null);
    });
    this._setupDialog(setup);
  }

  content(value) {
    replaceChildren(this._content, []);

    if (typeof value === 'function') {
      value(this._content);
      return this;
    }

    replaceChildren(this._content, normalizeChildren(value));
    return this;
  }

  open(value = true) {
    const enabled = Boolean(value);

    this.setState('open', enabled);
    this.attr('data-open', enabled ? 'true' : null);

    if (enabled) {
      this._openElement();
    } else {
      this._closeElement();
    }

    return this;
  }

  close() {
    return this.open(false);
  }

  renderDom() {
    const element = super.renderDom();

    if (this.getBooleanState('open')) {
      this._scheduleOpenSync();
    }

    return element;
  }

  _setupDialog(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, content, open, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (children !== undefined) {
        this.content(children);
      }

      if (open !== undefined) {
        this.open(open);
      }

      return;
    }

    this.content(setup);
  }

  _openElement({ defer = true } = {}) {
    this.style('display', null);

    if (!this._el) {
      this.attr('open', null);
      return;
    }

    if (typeof this._el.showModal !== 'function') {
      this.attr('open', true);
      return;
    }

    if (!this._el.isConnected) {
      this.attr('open', null);
      if (defer) {
        this._scheduleOpenSync();
      }
      return;
    }

    try {
      if (this._el.open && !this._isModal()) {
        this.attr('open', null);
      }

      if (!this._el.open) {
        this._el.showModal();
      }

      this.attr('open', true);
    } catch {
      this.attr('open', true);
    }
  }

  _closeElement() {
    if (this._el && typeof this._el.close === 'function') {
      try {
        if (this._el.open) {
          this._el.close();
        }
      } catch {
        // 忽略不支持的关闭行为。
      }
    }

    this.attr('open', null);

    if (this._el && typeof this._el.showModal !== 'function') {
      this.style('display', 'none');
    } else {
      this.style('display', null);
    }
  }

  _scheduleOpenSync() {
    if (this._pendingOpenSync) {
      return;
    }

    this._pendingOpenSync = true;
    queueMicrotask(() => {
      this._pendingOpenSync = false;

      if (this.getBooleanState('open')) {
        this._openElement({ defer: false });
      }
    });
  }

  _isModal() {
    if (!this._el || typeof this._el.matches !== 'function') {
      return false;
    }

    try {
      return this._el.matches(':modal');
    } catch {
      return false;
    }
  }
}

export function vDialog(first = null, second = null, third = null) {
  return createComponentFactory(VDialog, first, second, third);
}
