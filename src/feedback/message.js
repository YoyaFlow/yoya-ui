import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  messageTypeStyles,
  normalizeChildren,
  normalizeMessageOptions,
  placementStyles,
  removeChild,
  replaceChildren
} from '../components/shared.js';

const messageTypes = ['success', 'error', 'warning', 'info'];

export class VMessage extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._closeHandlers = [];
    this._contentBox = new HtmlElementNode('span').className('yoya-vmessage-content');
    this._closeButton = new HtmlElementNode('button')
      .className('yoya-vmessage-close')
      .attr({ type: 'button', 'aria-label': 'Close message' })
      .style('display', 'none')
      .text('x')
      .on('click', () => this.close());

    this.className(componentClass, 'yoya-vmessage');
    this.attr('role', 'status');
    this.styles({
      alignItems: 'center',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '6px',
      color: '#1e3a8a',
      display: 'flex',
      gap: '10px',
      lineHeight: '1.4',
      padding: '10px 12px'
    });
    this.child(this._contentBox, this._closeButton);
    this.type('info');
    this._setupMessage(setup);
  }

  content(content) {
    replaceChildren(this._contentBox, normalizeChildren(content));
    return this;
  }

  type(value) {
    if (value === undefined) {
      return this.attr('data-type');
    }

    const nextType = messageTypes.includes(value) ? value : 'info';
    this.attr('data-type', nextType);
    this.styles(messageTypeStyles(nextType));
    return this;
  }

  closable(value = true) {
    this._closeButton.style('display', value ? null : 'none');
    return this;
  }

  onClose(handler) {
    if (typeof handler === 'function') {
      this._closeHandlers.push(handler);
    }

    return this;
  }

  close() {
    if (this._deleted) {
      return this;
    }

    this._closeHandlers.forEach((handler) => handler(this));
    return this.destroy();
  }

  _setupMessage(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, content, text, type, closable, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (text !== undefined) {
        this.content(text);
      } else if (children !== undefined) {
        this.content(children);
      }

      if (type !== undefined) {
        this.type(type);
      }

      if (closable !== undefined) {
        this.closable(closable);
      }

      return;
    }

    this.content(setup);
  }
}

export class VMessageContainer extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._nextId = 1;
    this._messages = new Map();
    this.className(componentClass, 'yoya-vmessage-container');
    this.attr({ 'aria-live': 'polite', 'data-placement': 'top-right' });
    this.styles({
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '360px',
      position: 'fixed',
      right: '16px',
      top: '16px',
      zIndex: '1000'
    });
    this._setupContainer(setup);
  }

  placement(value) {
    if (value === undefined) {
      return this.attr('data-placement');
    }

    this.attr('data-placement', value || 'top-right');
    this.styles(placementStyles(value || 'top-right'));
    return this;
  }

  show(content, options = {}) {
    const normalized = normalizeMessageOptions(options);
    const id = normalized.id || `message-${this._nextId++}`;

    if (this._messages.has(id)) {
      this.close(id);
    }

    const message = vMessage(content)
      .type(normalized.type || 'info')
      .closable(normalized.closable ?? true)
      .onClose(() => {
        const entry = this._messages.get(id);
        if (entry?.timer) {
          clearTimeout(entry.timer);
        }
        removeChild(this, message);
        this._messages.delete(id);
      });

    this._messages.set(id, { message, timer: null });
    this.child(message);

    if (normalized.duration !== 0) {
      const timer = setTimeout(() => this.close(id), normalized.duration ?? 3000);
      this._messages.set(id, { message, timer });
    }

    return id;
  }

  success(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'success' });
  }

  error(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'error' });
  }

  warning(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'warning' });
  }

  info(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'info' });
  }

  close(id) {
    const entry = this._messages.get(id);
    if (!entry) {
      return this;
    }

    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    entry.message.close();
    this._messages.delete(id);
    return this;
  }

  clear() {
    [...this._messages.keys()].forEach((id) => this.close(id));
    return this;
  }

  destroy() {
    this.clear();
    return super.destroy();
  }

  _setupContainer(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { placement, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (placement !== undefined) {
        this.placement(placement);
      }
    }
  }
}

export function vMessage(first = null, second = null, third = null) {
  return createComponentFactory(VMessage, first, second, third);
}

export function vMessageContainer(first = null, second = null, third = null) {
  return createComponentFactory(VMessageContainer, first, second, third);
}

export const toast = {
  _container: null,

  use(container) {
    this._container = container;
    return this;
  },

  container() {
    if (!this._container) {
      this._container = vMessageContainer();
      if (typeof document !== 'undefined' && document.body) {
        this._container.bindTo(document.body);
      }
    }

    return this._container;
  },

  show(content, options = {}) {
    return this.container().show(content, options);
  },

  success(content, options = {}) {
    return this.container().success(content, options);
  },

  error(content, options = {}) {
    return this.container().error(content, options);
  },

  warning(content, options = {}) {
    return this.container().warning(content, options);
  },

  info(content, options = {}) {
    return this.container().info(content, options);
  },

  close(id) {
    return this.container().close(id);
  },

  clear() {
    return this.container().clear();
  }
};
