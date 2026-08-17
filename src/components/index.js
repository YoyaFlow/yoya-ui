import { ViewNode, registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';

const componentClass = 'yoya-component';
const messageTypes = ['success', 'error', 'warning', 'info'];

/**
 * vButton 是复合按钮组件；button() 仍然保留为原生 HTML button 工厂。
 */
export class VButton extends HtmlElementNode {
  constructor(setup = null) {
    super('button', null);
    this._variant = 'secondary';
    this._size = 'medium';
    this._labelBox = new HtmlElementNode('span').className('yoya-vbutton-label');
    this._loadingBox = new HtmlElementNode('span')
      .className('yoya-vbutton-spinner')
      .attr('aria-hidden', 'true')
      .style('display', 'none');

    this.className(componentClass, 'yoya-vbutton');
    this.attr('type', 'button');
    this.styles({
      alignItems: 'center',
      borderRadius: '6px',
      borderStyle: 'solid',
      borderWidth: '1px',
      cursor: 'pointer',
      display: 'inline-flex',
      fontFamily: 'inherit',
      fontWeight: '600',
      gap: '6px',
      justifyContent: 'center',
      lineHeight: '1',
      transition: 'background 120ms ease, border-color 120ms ease, opacity 120ms ease',
      userSelect: 'none',
      whiteSpace: 'nowrap'
    });
    this.child(this._loadingBox, this._labelBox);
    this.type(this._variant);
    this.size(this._size);

    this._setupButton(setup);
  }

  label(content) {
    replaceChildren(this._labelBox, normalizeChildren(content));
    return this;
  }

  content(content) {
    return this.label(content);
  }

  type(value) {
    if (value === undefined) {
      return this._variant;
    }

    this._variant = value || 'secondary';
    this.attr('data-variant', this._variant);
    this.styles(buttonVariantStyles(this._variant));
    return this;
  }

  variant(value) {
    return this.type(value);
  }

  htmlType(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    const allowedTypes = new Set(['button', 'submit', 'reset']);
    return this.attr('type', allowedTypes.has(value) ? value : 'button');
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = value || 'medium';
    this.attr('data-size', this._size);
    this.styles(buttonSizeStyles(this._size));
    return this;
  }

  disabled(value = true) {
    this.setState('disabled', Boolean(value));
    this.attr('disabled', value ? true : null);
    this.style('cursor', value ? 'not-allowed' : 'pointer');
    this.style('opacity', value ? '0.62' : '1');
    return this;
  }

  loading(value = true) {
    const enabled = Boolean(value);
    this.setState('loading', enabled);
    this.attr('aria-busy', enabled ? 'true' : null);
    this._loadingBox.style('display', enabled ? null : 'none');
    this._loadingBox.textContent(enabled ? '...' : '');
    return this;
  }

  _setupButton(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, label, text, variant, type, htmlType, size, disabled, loading, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.label(text);
      } else if (children !== undefined) {
        this.label(children);
      }

      if (variant !== undefined) {
        this.variant(variant);
      } else if (type !== undefined) {
        this.type(type);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (htmlType !== undefined) {
        this.htmlType(htmlType);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (loading !== undefined) {
        this.loading(loading);
      }

      return;
    }

    this.label(setup);
  }
}

export class VCard extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vcard');
    this.styles({
      background: '#ffffff',
      border: '1px solid #d8dee8',
      borderRadius: '8px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
      color: '#111827',
      overflow: 'hidden'
    });
    applyComponentSetup(this, setup);
  }
}

export class VCardHeader extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-vcard-header');
    this.styles({
      borderBottom: '1px solid #e5e7eb',
      fontWeight: '700',
      padding: '12px 16px'
    });
    applyComponentSetup(this, setup);
  }
}

export class VCardBody extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-vcard-body');
    this.styles({
      padding: '16px'
    });
    applyComponentSetup(this, setup);
  }
}

export class VCardFooter extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-vcard-footer');
    this.styles({
      alignItems: 'center',
      background: '#f8fafc',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
      padding: '12px 16px'
    });
    applyComponentSetup(this, setup);
  }
}

export class VMenu extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vmenu');
    this.styles({
      display: 'flex',
      gap: '4px',
      minWidth: '180px',
      padding: '6px'
    });
    this.orientation('vertical');
    this._setupMenu(setup);
  }

  orientation(value = 'vertical') {
    const orientation = value === 'horizontal' ? 'horizontal' : 'vertical';

    this.attr('data-orientation', orientation);
    this.attr('role', orientation === 'horizontal' ? 'menubar' : 'menu');
    this.attr('aria-orientation', orientation);
    this.style('flexDirection', orientation === 'horizontal' ? 'row' : 'column');
    this.children().forEach((child) => {
      if (child instanceof VMenuItem) {
        child._menuOrientation(orientation);
      }
    });
    return this;
  }

  child(...children) {
    super.child(...children);
    const orientation = this.attr('data-orientation') || 'vertical';

    this.children().forEach((child) => {
      if (child instanceof VMenuItem) {
        child._menuOrientation(orientation);
      }
    });

    return this;
  }

  horizontal() {
    return this.orientation('horizontal');
  }

  vertical() {
    return this.orientation('vertical');
  }

  _setupMenu(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, orientation, horizontal, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (orientation !== undefined) {
        this.orientation(orientation);
      } else if (horizontal !== undefined) {
        this.orientation(horizontal ? 'horizontal' : 'vertical');
      }

      if (children !== undefined) {
        this.child(children);
      }

      return;
    }

    applyComponentSetup(this, setup);
  }
}

export class VMenuItem extends HtmlElementNode {
  constructor(setup = null) {
    super('button', null);
    this._iconBox = new HtmlElementNode('span')
      .className('yoya-vmenu-item-icon')
      .attr('aria-hidden', 'true')
      .style('display', 'none');
    this._labelBox = new HtmlElementNode('span').className('yoya-vmenu-item-label');
    this._shortcutBox = new HtmlElementNode('span')
      .className('yoya-vmenu-item-shortcut')
      .attr('aria-hidden', 'true')
      .style('display', 'none');

    this.className(componentClass, 'yoya-vmenu-item');
    this.attr({ role: 'menuitem', type: 'button' });
    this.styles({
      alignItems: 'center',
      background: 'transparent',
      border: '1px solid transparent',
      borderRadius: '6px',
      color: '#1f2937',
      cursor: 'pointer',
      display: 'grid',
      font: 'inherit',
      gap: '10px',
      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
      lineHeight: '1.2',
      minHeight: '34px',
      padding: '8px 10px',
      textAlign: 'left',
      width: '100%'
    });
    this.child(this._iconBox, this._labelBox, this._shortcutBox);
    this._setupMenuItem(setup);
  }

  text(content) {
    replaceChildren(this._labelBox, normalizeChildren(content));
    return this;
  }

  label(content) {
    return this.text(content);
  }

  content(content) {
    return this.text(content);
  }

  icon(content) {
    replaceChildren(this._iconBox, normalizeChildren(content));
    this._iconBox.style('display', content === null || content === undefined || content === '' ? 'none' : null);
    return this;
  }

  shortcut(content) {
    replaceChildren(this._shortcutBox, normalizeChildren(content));
    this._shortcutBox.style('display', content === null || content === undefined || content === '' ? 'none' : null);
    return this;
  }

  active(value = true) {
    const enabled = Boolean(value);

    this.setState('active', enabled);
    this.attr('data-active', enabled ? 'true' : null);
    this.attr('aria-current', enabled ? 'page' : null);
    this.styles(enabled ? {
      background: '#eff6ff',
      borderColor: '#bfdbfe',
      color: '#1d4ed8',
      fontWeight: '700'
    } : {
      background: 'transparent',
      borderColor: 'transparent',
      color: this.getBooleanState('danger') ? '#b91c1c' : '#1f2937',
      fontWeight: '400'
    });
    return this;
  }

  danger(value = true) {
    const enabled = Boolean(value);

    this.setState('danger', enabled);
    this.attr('data-danger', enabled ? 'true' : null);
    if (!this.getBooleanState('active')) {
      this.style('color', enabled ? '#b91c1c' : '#1f2937');
    }
    return this;
  }

  disabled(value = true) {
    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.style('cursor', enabled ? 'not-allowed' : 'pointer');
    this.style('opacity', enabled ? '0.55' : '1');
    return this;
  }

  hoverable(value = true) {
    this.attr('data-hoverable', value ? 'true' : null);
    return this;
  }

  _menuOrientation(orientation) {
    this.style('width', orientation === 'horizontal' ? 'auto' : '100%');
    return this;
  }

  _setupMenuItem(setup) {
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
        children,
        content,
        danger,
        disabled,
        icon,
        label,
        shortcut,
        text,
        ...elementConfig
      } = setup;

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
        this.text(children);
      }

      if (icon !== undefined) {
        this.icon(icon);
      }

      if (shortcut !== undefined) {
        this.shortcut(shortcut);
      }

      if (active !== undefined) {
        this.active(active);
      }

      if (danger !== undefined) {
        this.danger(danger);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      return;
    }

    this.text(setup);
  }
}

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

export function vButton(setup = null) {
  return new VButton(setup);
}

export function vCard(setup = null) {
  return new VCard(setup);
}

export function vCardHeader(setup = null) {
  return new VCardHeader(setup);
}

export function vCardBody(setup = null) {
  return new VCardBody(setup);
}

export function vCardFooter(setup = null) {
  return new VCardFooter(setup);
}

export function vMenu(setup = null) {
  return new VMenu(setup);
}

export function vMenuItem(setup = null) {
  return new VMenuItem(setup);
}

export function vMessage(setup = null) {
  return new VMessage(setup);
}

export function vMessageContainer(setup = null) {
  return new VMessageContainer(setup);
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

const componentFactories = {
  vButton,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vMenu,
  vMenuItem,
  vMessage,
  vMessageContainer
};

registerChildFactories(HtmlElementNode, componentFactories);

function applyComponentSetup(node, setup) {
  if (setup === null || setup === undefined) {
    return node;
  }

  if (typeof setup === 'function') {
    setup(node);
    return node;
  }

  if (setup instanceof ViewNode || Array.isArray(setup) || typeof setup === 'string' || typeof setup === 'number') {
    node.child(setup);
    return node;
  }

  if (isPlainObject(setup)) {
    node.setup(setup);
  }

  return node;
}

function normalizeChildren(content) {
  if (content === null || content === undefined) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
}

function replaceChildren(node, children) {
  node.children().forEach((child) => child.destroy());
  node._children = [];

  if (node._el) {
    node._el.replaceChildren();
  }

  if (children.length > 0) {
    node.child(children);
  }

  return node;
}

function removeChild(parent, child) {
  parent._children = parent.children().filter((existingChild) => existingChild !== child);
  return parent;
}

function buttonVariantStyles(variant) {
  const variants = {
    danger: {
      background: '#dc2626',
      borderColor: '#b91c1c',
      color: '#ffffff'
    },
    ghost: {
      background: 'transparent',
      borderColor: 'transparent',
      color: '#2563eb'
    },
    primary: {
      background: '#2563eb',
      borderColor: '#1d4ed8',
      color: '#ffffff'
    },
    secondary: {
      background: '#ffffff',
      borderColor: '#cbd5e1',
      color: '#1f2937'
    }
  };

  return variants[variant] || variants.secondary;
}

function buttonSizeStyles(size) {
  const sizes = {
    large: {
      fontSize: '15px',
      minHeight: '38px',
      padding: '0 16px'
    },
    medium: {
      fontSize: '14px',
      minHeight: '34px',
      padding: '0 14px'
    },
    small: {
      fontSize: '13px',
      minHeight: '30px',
      padding: '0 10px'
    }
  };

  return sizes[size] || sizes.medium;
}

function messageTypeStyles(type) {
  const styles = {
    error: {
      background: '#fef2f2',
      borderColor: '#fecaca',
      color: '#991b1b'
    },
    info: {
      background: '#eff6ff',
      borderColor: '#bfdbfe',
      color: '#1e3a8a'
    },
    success: {
      background: '#ecfdf5',
      borderColor: '#bbf7d0',
      color: '#166534'
    },
    warning: {
      background: '#fffbeb',
      borderColor: '#fde68a',
      color: '#92400e'
    }
  };

  return styles[type] || styles.info;
}

function placementStyles(placement) {
  const base = {
    bottom: null,
    left: null,
    right: null,
    top: null,
    transform: null
  };
  const placements = {
    'bottom-left': { bottom: '16px', left: '16px' },
    'bottom-right': { bottom: '16px', right: '16px' },
    bottom: { bottom: '16px', left: '50%', transform: 'translateX(-50%)' },
    'top-left': { left: '16px', top: '16px' },
    'top-right': { right: '16px', top: '16px' },
    top: { left: '50%', top: '16px', transform: 'translateX(-50%)' }
  };

  return { ...base, ...(placements[placement] || placements['top-right']) };
}

function normalizeMessageOptions(options = {}) {
  if (typeof options === 'number') {
    return { duration: options };
  }

  return options || {};
}

function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
