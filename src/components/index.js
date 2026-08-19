import { ViewNode, VTextNode, registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';

const componentClass = 'yoya-component';
const messageTypes = ['success', 'error', 'warning', 'info'];
let timerRangeSequence = 0;

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

  disabled(value) {
    this.setState('disabled', Boolean(value));
    this.attr('disabled', value ? true : null);
    this.style('cursor', value ? 'not-allowed' : 'pointer');
    this.style('opacity', value ? '0.62' : '1');
    return this;
  }

  loading(value) {
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

  disabled(value) {
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

export class VDropdownMenu extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._closeOnSelect = true;
    this._globalCloseCleanup = null;
    this._trigger = new VButton('操作')
      .className('yoya-vdropdown-trigger')
      .attr({ 'aria-expanded': 'false', 'aria-haspopup': 'menu' })
      .on('click', (event) => {
        event.preventDefault();
        if (!this._trigger.getBooleanState('disabled')) {
          this.toggle();
        }
      });
    this._menu = new VMenu().className('yoya-vdropdown-content');
    this._panel = new HtmlElementNode('div')
      .className('yoya-vdropdown-panel')
      .styles({
        background: '#ffffff',
        border: '1px solid #d8dee8',
        borderRadius: '8px',
        boxShadow: '0 10px 26px rgba(15, 23, 42, 0.16)',
        display: 'none',
        minWidth: '200px',
        position: 'absolute',
        zIndex: '100'
      })
      .child(this._menu);

    this.className(componentClass, 'yoya-vdropdown-menu');
    this.styles({
      display: 'inline-flex',
      position: 'relative'
    });
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('.yoya-vmenu-item');
      if (this._closeOnSelect && menuItem && !menuItem.disabled) {
        this.close();
      }
    });
    this.child(this._trigger, this._panel);
    this.placement('bottom-start');
    this._setupDropdownMenu(setup);
  }

  trigger(setup) {
    if (setup === undefined) {
      return this._trigger;
    }

    setupButtonSlot(this._trigger, setup);
    return this;
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    return this;
  }

  placement(value) {
    if (value === undefined) {
      return this.attr('data-placement');
    }

    const placement = value || 'bottom-start';
    this.attr('data-placement', placement);
    this._panel.styles(dropdownPlacementStyles(placement));
    return this;
  }

  closeOnSelect(value = true) {
    this._closeOnSelect = Boolean(value);
    return this;
  }

  open(value = true) {
    const enabled = Boolean(value);

    this.setState('open', enabled);
    this.attr('data-open', enabled ? 'true' : null);
    this._trigger.attr('aria-expanded', enabled ? 'true' : 'false');
    this._panel.style('display', enabled ? null : 'none');

    if (enabled) {
      this._bindGlobalCloseHandlers();
    } else {
      this._releaseGlobalCloseHandlers();
    }

    return this;
  }

  close() {
    return this.open(false);
  }

  toggle() {
    return this.open(!this.getBooleanState('open'));
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  _bindGlobalCloseHandlers() {
    if (this._globalCloseCleanup || typeof document === 'undefined') {
      return;
    }

    const handlePointer = (event) => {
      if (!this._el?.contains(event.target)) {
        this.close();
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };

    document.addEventListener('click', handlePointer);
    document.addEventListener('keydown', handleKey);
    this._globalCloseCleanup = () => {
      document.removeEventListener('click', handlePointer);
      document.removeEventListener('keydown', handleKey);
      this._globalCloseCleanup = null;
    };
  }

  _releaseGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      this._globalCloseCleanup();
    }
  }

  _setupDropdownMenu(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        closeOnSelect,
        content,
        label,
        menu,
        menuContent,
        open,
        placement,
        text,
        trigger,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      if (trigger !== undefined) {
        this.trigger(trigger);
      } else if (label !== undefined) {
        this.trigger(label);
      } else if (text !== undefined) {
        this.trigger(text);
      }

      const menuSetup = menuContent ?? menu ?? content ?? children;
      if (menuSetup !== undefined) {
        this.menuContent(menuSetup);
      }

      if (placement !== undefined) {
        this.placement(placement);
      }

      if (closeOnSelect !== undefined) {
        this.closeOnSelect(closeOnSelect);
      }

      if (open !== undefined) {
        this.open(open);
      }

      return;
    }

    this.trigger(setup);
  }
}

export class VContextMenu extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._closeOnSelect = true;
    this._globalCloseCleanup = null;
    this._target = new HtmlElementNode('div')
      .className('yoya-vcontext-target')
      .styles({
        minWidth: '0'
      })
      .on('contextmenu', (event) => {
        event.preventDefault();
        this.openAt(event);
      });
    this._menu = new VMenu().className('yoya-vcontext-content');
    this._panel = new HtmlElementNode('div')
      .className('yoya-vcontext-panel')
      .styles({
        background: '#ffffff',
        border: '1px solid #d8dee8',
        borderRadius: '8px',
        boxShadow: '0 10px 26px rgba(15, 23, 42, 0.16)',
        display: 'none',
        minWidth: '200px',
        position: 'fixed',
        zIndex: '120'
      })
      .child(this._menu);

    this.className(componentClass, 'yoya-vcontext-menu');
    this.styles({
      display: 'block',
      minWidth: '0'
    });
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('.yoya-vmenu-item');
      if (this._closeOnSelect && menuItem && !menuItem.disabled) {
        this.close();
      }
    });
    this.child(this._target, this._panel);
    this._setupContextMenu(setup);
  }

  target(setup) {
    if (setup === undefined) {
      return this._target;
    }

    setupContentSlot(this._target, setup);
    return this;
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    return this;
  }

  closeOnSelect(value = true) {
    this._closeOnSelect = Boolean(value);
    return this;
  }

  openAt(pointOrX = 0, y = 0) {
    const point = normalizePoint(pointOrX, y);

    this._panel.styles({
      left: `${point.x}px`,
      top: `${point.y}px`
    });
    return this.open(true);
  }

  open(value = true) {
    const enabled = Boolean(value);

    this.setState('open', enabled);
    this.attr('data-open', enabled ? 'true' : null);
    this._panel.style('display', enabled ? null : 'none');

    if (enabled) {
      this._bindGlobalCloseHandlers();
    } else {
      this._releaseGlobalCloseHandlers();
    }

    return this;
  }

  close() {
    return this.open(false);
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  _bindGlobalCloseHandlers() {
    if (this._globalCloseCleanup || typeof document === 'undefined') {
      return;
    }

    const handlePointer = (event) => {
      if (!this._el?.contains(event.target)) {
        this.close();
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };

    document.addEventListener('click', handlePointer);
    document.addEventListener('keydown', handleKey);
    this._globalCloseCleanup = () => {
      document.removeEventListener('click', handlePointer);
      document.removeEventListener('keydown', handleKey);
      this._globalCloseCleanup = null;
    };
  }

  _releaseGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      this._globalCloseCleanup();
    }
  }

  _setupContextMenu(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        closeOnSelect,
        content,
        menu,
        menuContent,
        open,
        target,
        x,
        y,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      if (target !== undefined) {
        this.target(target);
      }

      const menuSetup = menuContent ?? menu ?? content ?? children;
      if (menuSetup !== undefined) {
        this.menuContent(menuSetup);
      }

      if (closeOnSelect !== undefined) {
        this.closeOnSelect(closeOnSelect);
      }

      if (open !== undefined) {
        if (open) {
          this.openAt(x ?? 0, y ?? 0);
        } else {
          this.close();
        }
      }

      return;
    }

    this.target(setup);
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

export class VCode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._languageBadge = new HtmlElementNode('span')
      .className('yoya-vcode-language')
      .style('display', 'none');
    this._copyButton = new HtmlElementNode('button')
      .className('yoya-vcode-copy')
      .attr({ 'aria-label': '复制代码', type: 'button' })
      .on('click', () => {
        void this.copy();
      });
    this._toolbar = new HtmlElementNode('div').className('yoya-vcode-toolbar');
    this._codeBox = new HtmlElementNode('code').className('yoya-vcode-content');
    this._preBox = new HtmlElementNode('pre').className('yoya-vcode-pre').child(this._codeBox);

    this.className(componentClass, 'yoya-vcode');
    this.styles({
      background: '#ffffff',
      border: '1px solid #d8dee8',
      borderRadius: '8px',
      color: '#172033',
      overflow: 'hidden'
    });
    this._toolbar.styles({
      alignItems: 'center',
      background: '#f8fafc',
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between',
      padding: '10px 12px'
    });
    this._languageBadge.styles({
      background: '#e2e8f0',
      borderRadius: '999px',
      color: '#334155',
      fontSize: '12px',
      fontWeight: '700',
      lineHeight: '1',
      padding: '4px 8px'
    });
    this._preBox.styles({
      background: '#fbfcfe',
      margin: '0',
      overflow: 'auto',
      padding: '14px 16px'
    });
    this._codeBox.styles({
      display: 'block',
      fontFamily:
        '"Cascadia Code", "Fira Code", ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: '13px',
      lineHeight: '1.55',
      minWidth: 'max-content',
      whiteSpace: 'pre'
    });
    this.copyLabel('复制');
    this.copyable(true);
    this._toolbar.child(this._languageBadge, this._copyButton);
    this.child(this._toolbar, this._preBox);
    this._setupCode(setup);
  }

  content(content) {
    replaceChildren(this._codeBox, normalizeChildren(content));
    return this;
  }

  text(content) {
    return this.content(content);
  }

  language(value) {
    if (value === undefined) {
      return this.attr('data-language');
    }

    const language = value === null || value === undefined ? '' : String(value);
    this.attr('data-language', language || null);
    this._languageBadge.style('display', language ? null : 'none');
    replaceChildren(this._languageBadge, language ? normalizeChildren(language) : []);
    return this;
  }

  copyable(value = undefined) {
    if (value === undefined) {
      return this.getBooleanState('copyable');
    }

    const enabled = Boolean(value);
    this.setState('copyable', enabled);
    this.attr('data-copyable', enabled ? 'true' : null);
    this._copyButton.style('display', enabled ? null : 'none');
    return this;
  }

  copyLabel(value) {
    if (value === undefined) {
      return this._copyButton.textContent();
    }

    replaceChildren(this._copyButton, normalizeChildren(value ?? '复制'));
    return this;
  }

  async copy() {
    const text = this._codeBox.textContent();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Copy should fail softly in unsupported contexts.
    }

    return text;
  }

  _setupCode(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, content, copyLabel, copyable, language, text, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (language !== undefined) {
        this.language(language);
      }

      if (copyLabel !== undefined) {
        this.copyLabel(copyLabel);
      }

      if (copyable !== undefined) {
        this.copyable(copyable);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (text !== undefined) {
        this.content(text);
      } else if (children !== undefined) {
        this.content(children);
      }

      return;
    }

    this.content(setup);
  }
}

export class VTable extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._columns = [];
    this._rows = [];
    this._emptyContent = '暂无数据';
    this._captionBox = new HtmlElementNode('caption').className('yoya-vtable-caption');
    this._head = new HtmlElementNode('thead').className('yoya-vtable-head');
    this._body = new HtmlElementNode('tbody').className('yoya-vtable-body');
    this._table = new HtmlElementNode('table').className('yoya-vtable-table');
    this._scroll = new HtmlElementNode('div').className('yoya-vtable-scroll');

    this.className(componentClass, 'yoya-vtable');
    this.styles({
      display: 'block',
      minWidth: '0'
    });
    this._scroll.styles({
      background: '#ffffff',
      border: '1px solid #d8dee8',
      borderRadius: '8px',
      overflowX: 'auto'
    });
    this._table.styles({
      borderCollapse: 'collapse',
      color: '#172033',
      width: '100%'
    });
    this._captionBox.styles({
      captionSide: 'top',
      color: '#111827',
      fontWeight: '700',
      padding: '0 0 12px',
      textAlign: 'left'
    });
    this._captionBox.style('display', 'none');
    this._scroll.child(this._table);
    this._table.child(this._captionBox, this._head, this._body);
    this.child(this._scroll);
    this._setupTable(setup);
  }

  caption(content) {
    if (content === undefined) {
      return this._captionBox.textContent();
    }

    const hasContent = content !== null && content !== undefined && content !== '';
    this._captionBox.style('display', hasContent ? null : 'none');
    replaceChildren(this._captionBox, hasContent ? normalizeChildren(content) : []);
    return this;
  }

  columns(value) {
    if (value === undefined) {
      return this._columns.slice();
    }

    this._columns = normalizeTableColumns(value);
    this._renderTable();
    return this;
  }

  rows(value) {
    if (value === undefined) {
      return this._rows.slice();
    }

    this._rows = Array.isArray(value) ? value.slice() : [];
    this._renderTable();
    return this;
  }

  empty(value) {
    if (value === undefined) {
      return this._emptyContent;
    }

    this._emptyContent = value;
    this._renderTable();
    return this;
  }

  emptyText(value) {
    if (value === undefined) {
      return this._emptyContent;
    }

    return this.empty(value);
  }

  data(value) {
    if (value === undefined) {
      return {
        caption: this.caption(),
        columns: this.columns(),
        emptyText: this.emptyText(),
        rows: this.rows()
      };
    }

    if (Array.isArray(value)) {
      this.rows(value);
      return this;
    }

    if (isPlainObject(value)) {
      const { caption, columns, empty, emptyText, rows } = value;

      if (caption !== undefined) {
        this.caption(caption);
      }

      if (columns !== undefined) {
        this.columns(columns);
      }

      if (rows !== undefined) {
        this.rows(rows);
      }

      if (emptyText !== undefined) {
        this.emptyText(emptyText);
      } else if (empty !== undefined) {
        this.emptyText(empty);
      }
    }

    return this;
  }

  _renderTable() {
    const resolvedColumns = this._columns.length > 0 ? this._columns : inferTableColumns(this._rows);
    const bodyColumns = resolvedColumns.length > 0 ? resolvedColumns : [{ key: '__value', label: '' }];

    replaceChildren(this._head, []);
    replaceChildren(this._body, []);

    if (resolvedColumns.length > 0) {
      const headRow = new HtmlElementNode('tr').className('yoya-vtable-head-row');

      resolvedColumns.forEach((column, columnIndex) => {
        const headerCell = new HtmlElementNode('th').className('yoya-vtable-head-cell');
        const columnKey = column.key ?? `column-${columnIndex}`;

        headerCell.attr('scope', 'col');
        headerCell.attr('data-key', columnKey);
        applyTableCellStyles(headerCell, column, 'head');
        appendTableCellContent(headerCell, column.label ?? column.title ?? column.key ?? '');
        headRow.child(headerCell);
      });

      this._head.child(headRow);
    }

    if (this._rows.length > 0) {
      this._rows.forEach((row, rowIndex) => {
        const bodyRow = new HtmlElementNode('tr').className('yoya-vtable-row');
        bodyRow.attr('data-row-index', String(rowIndex));

        bodyColumns.forEach((column, columnIndex) => {
          const cell = new HtmlElementNode('td').className('yoya-vtable-cell');
          const columnKey = column.key ?? `column-${columnIndex}`;

          cell.attr('data-key', columnKey);
          applyTableCellStyles(cell, column, 'body');
          appendTableCellContent(cell, resolveTableCellContent(column, row, rowIndex));
          bodyRow.child(cell);
        });

        this._body.child(bodyRow);
      });
    } else {
      const emptyRow = new HtmlElementNode('tr').className('yoya-vtable-empty-row');
      const emptyCell = new HtmlElementNode('td').className('yoya-vtable-empty');

      emptyCell.attr('colspan', String(Math.max(resolvedColumns.length, 1)));
      emptyCell.styles({
        color: '#64748b',
        padding: '18px 14px',
        textAlign: 'center'
      });
      appendTableCellContent(emptyCell, this._emptyContent);
      emptyRow.child(emptyCell);
      this._body.child(emptyRow);
    }
  }

  _setupTable(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup)) {
      this.rows(setup);
      return;
    }

    if (isPlainObject(setup)) {
      this.setup(setup);
      return;
    }

    this.caption(setup);
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

export function vDropdownMenu(setup = null) {
  return new VDropdownMenu(setup);
}

export function vContextMenu(setup = null) {
  return new VContextMenu(setup);
}

export function vMessage(setup = null) {
  return new VMessage(setup);
}

export function vMessageContainer(setup = null) {
  return new VMessageContainer(setup);
}

export function vDetail(setup = null) {
  return setup instanceof VDetail ? setup : new VDetail(setup);
}

export function vDetailItem(setup = null, value = undefined) {
  return setup instanceof VDetailItem && value === undefined ? setup : new VDetailItem(setup, value);
}

export function vCode(setup = null) {
  return setup instanceof VCode ? setup : new VCode(setup);
}

export function vTable(setup = null) {
  return setup instanceof VTable ? setup : new VTable(setup);
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
  vCode,
  vContextMenu,
  vDetail,
  vDetailItem,
  vDropdownMenu,
  vMenu,
  vMenuItem,
  vMessage,
  vMessageContainer,
  vTable
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

function setupButtonSlot(button, setup) {
  if (setup === null || setup === undefined) {
    return button;
  }

  if (typeof setup === 'function') {
    setup(button);
    return button;
  }

  if (isPlainObject(setup)) {
    button._setupButton(setup);
    return button;
  }

  button.label(setup);
  return button;
}

function setupContentSlot(node, setup) {
  replaceChildren(node, []);

  if (setup === null || setup === undefined) {
    return node;
  }

  if (typeof setup === 'function') {
    setup(node);
    return node;
  }

  applyComponentSetup(node, setup);
  return node;
}

function dropdownPlacementStyles(placement) {
  const base = {
    bottom: null,
    left: null,
    right: null,
    top: null
  };
  const placements = {
    'bottom-end': { right: '0', top: 'calc(100% + 6px)' },
    'bottom-start': { left: '0', top: 'calc(100% + 6px)' },
    'top-end': { bottom: 'calc(100% + 6px)', right: '0' },
    'top-start': { bottom: 'calc(100% + 6px)', left: '0' }
  };

  return { ...base, ...(placements[placement] || placements['bottom-start']) };
}

function normalizePoint(pointOrX, y) {
  if (pointOrX && typeof pointOrX === 'object') {
    return {
      x: Number(pointOrX.clientX ?? pointOrX.x ?? 0),
      y: Number(pointOrX.clientY ?? pointOrX.y ?? 0)
    };
  }

  return {
    x: Number(pointOrX || 0),
    y: Number(y || 0)
  };
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

function normalizeTableColumns(columns) {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.map((column, index) => {
    if (typeof column === 'string' || typeof column === 'number') {
      const key = String(column);
      return { key, label: key };
    }

    if (Array.isArray(column) && column.length > 0) {
      const [key, label = key] = column;
      return {
        key: key === undefined || key === null ? `column-${index}` : key,
        label: label ?? key ?? ''
      };
    }

    if (isPlainObject(column)) {
      const key = column.key ?? column.field ?? column.name ?? column.label ?? column.title ?? `column-${index}`;
      return {
        ...column,
        key,
        label: column.label ?? column.title ?? column.name ?? key
      };
    }

    const key = `column-${index}`;
    return { key, label: String(column ?? '') };
  });
}

function inferTableColumns(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const sampleRow = rows.find(
    (row) => row && typeof row === 'object' && !Array.isArray(row) && !(row instanceof ViewNode)
  );

  if (!sampleRow) {
    return [];
  }

  return Object.keys(sampleRow).map((key) => ({ key, label: key }));
}

function resolveTableCellContent(column, row, rowIndex) {
  if (typeof column.render === 'function') {
    return column.render(row, rowIndex, column);
  }

  if (typeof column.value === 'function') {
    return column.value(row, rowIndex, column);
  }

  if (column.key === '__value') {
    return row;
  }

  if (column.value !== undefined) {
    return column.value;
  }

  if (column.key && row && typeof row === 'object' && !Array.isArray(row)) {
    return row[column.key];
  }

  return row;
}

function appendTableCellContent(node, content) {
  if (content !== null && content !== undefined) {
    node.child(content);
  }

  return node;
}

function applyTableCellStyles(node, column, section) {
  const isHead = section === 'head';

  node.styles({
    borderBottom: '1px solid #e2e8f0',
    fontWeight: isHead ? '700' : '400',
    padding: '12px 14px',
    textAlign: column.align || 'left',
    verticalAlign: 'top',
    whiteSpace: column.wrap === false ? 'nowrap' : 'normal'
  });

  if (isHead) {
    node.style('background', '#f8fafc');
    node.style('color', '#334155');
  } else {
    node.style('color', '#172033');
  }

  if (column.className !== undefined) {
    node.className(column.className);
  }

  if (column.style !== undefined) {
    node.styles(column.style);
  }

  if (column.width !== undefined) {
    node.style('width', typeof column.width === 'number' ? `${column.width}px` : column.width);
  }

  if (column.minWidth !== undefined) {
    node.style('minWidth', typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth);
  }

  if (column.maxWidth !== undefined) {
    node.style('maxWidth', typeof column.maxWidth === 'number' ? `${column.maxWidth}px` : column.maxWidth);
  }
}

export class VInput extends HtmlElementNode {
  constructor(setup = null) {
    super('input', null);
    this._value = '';

    this.className(componentClass, 'yoya-vinput');
    this.attr('type', 'text');
    this.styles({
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: '#172033',
      font: 'inherit',
      minHeight: '34px',
      outline: 'none',
      padding: '0 12px',
      width: '100%'
    });

    this._setupInput(setup);
  }

  type(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    this.attr('type', value || 'text');
    return this;
  }

  value(value) {
    if (value === undefined) {
      return this._el?.value ?? this._value ?? this.attr('value') ?? '';
    }

    const next = resolveTextValue(value);
    this._value = next;
    this.attr('value', next);
    return this;
  }

  text(value) {
    return this.value(value);
  }

  content(value) {
    return this.value(value);
  }

  placeholder(value) {
    if (value === undefined) {
      return this.attr('placeholder');
    }

    const next = resolveTextValue(value);
    this.attr('placeholder', next || null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.style('cursor', enabled ? 'not-allowed' : 'text');
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  readonly(value) {
    if (value === undefined) {
      return this.getBooleanState('readonly');
    }

    const enabled = Boolean(value);

    this.setState('readonly', enabled);
    this.attr('readonly', enabled ? true : null);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this.attr('required', enabled ? true : null);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this.getBooleanState('error');
    }

    const enabled = Boolean(value);

    this.setState('error', enabled);
    this.attr('data-error', enabled ? 'true' : null);
    this.style('borderColor', enabled ? '#dc2626' : '#cbd5e1');
    this.style('boxShadow', enabled ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : null);
    return this;
  }

  _setupInput(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        content,
        disabled,
        error,
        placeholder,
        readonly,
        required,
        text,
        type,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (type !== undefined) {
        this.type(type);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }

      if (value !== undefined) {
        this.value(value);
      } else if (text !== undefined) {
        this.value(text);
      } else if (content !== undefined) {
        this.value(content);
      } else if (children !== undefined) {
        this.value(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (readonly !== undefined) {
        this.readonly(readonly);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (error !== undefined) {
        this.error(error);
      }

      return;
    }

    this.value(setup);
  }
}

export class VTimer extends VInput {
  constructor(setup = null) {
    super(null);
    this.className('yoya-vtimer');
    this.mode('date');
    this._setupTimer(setup);
  }

  mode(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    const supportedModes = new Set(['date', 'datetime-local', 'time']);
    this.attr('type', supportedModes.has(value) ? value : 'date');
    return this;
  }

  type(value) {
    return value === undefined ? this.mode() : this.mode(value);
  }

  _setupTimer(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { mode, type, ...inputSetup } = setup;

      this._setupInput(inputSetup);
      if (mode !== undefined) {
        this.mode(mode);
      } else if (type !== undefined) {
        this.mode(type);
      }
      return;
    }

    this.value(setup);
  }
}

export class VTimerRange extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    const errorId = `yoya-vtimer-range-error-${++timerRangeSequence}`;
    this._name = '';
    this._startTimer = vTimer()
      .className('yoya-vtimer-range-start')
      .attr('aria-label', '开始值')
      .attr('aria-describedby', errorId);
    this._endTimer = vTimer()
      .className('yoya-vtimer-range-end')
      .attr('aria-label', '结束值')
      .attr('aria-describedby', errorId);
    this._errorText = new VTextNode('');
    this._errorMessage = new HtmlElementNode('span')
      .className('yoya-vtimer-range-error')
      .id(errorId)
      .attr('aria-live', 'polite')
      .style('color', '#dc2626')
      .style('fontSize', '0.875rem')
      .style('gridColumn', '1 / -1')
      .child(this._errorText);

    this.className(componentClass, 'yoya-vtimer-range').attr('role', 'group');
    this.styles({
      alignItems: 'center',
      display: 'grid',
      gap: '8px',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)'
    });
    this._startTimer.on('change', (event) => this._handleTimerChange(event));
    this._endTimer.on('change', (event) => this._handleTimerChange(event));
    this.child(this._startTimer, this._endTimer, this._errorMessage);
    this._setupTimerRange(setup);
  }

  mode(value) {
    if (value === undefined) {
      return this._startTimer.mode();
    }

    this._startTimer.mode(value);
    this._endTimer.mode(value);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    this._startTimer.attr('name', this._name ? `${this._name}Start` : null);
    this._endTimer.attr('name', this._name ? `${this._name}End` : null);
    return this;
  }

  start(value) {
    if (value === undefined) {
      return this._startTimer.value();
    }

    this._startTimer.value(value);
    this._validate();
    return this;
  }

  end(value) {
    if (value === undefined) {
      return this._endTimer.value();
    }

    this._endTimer.value(value);
    this._validate();
    return this;
  }

  value(value) {
    if (value === undefined) {
      return { start: this.start(), end: this.end() };
    }

    const [start, end] = Array.isArray(value) ? value : [value?.start ?? '', value?.end ?? ''];
    this.start(start);
    this.end(end);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this._startTimer.disabled();
    }

    this._startTimer.disabled(value);
    this._endTimer.disabled(value);
    return this;
  }

  readonly(value) {
    if (value === undefined) {
      return this._startTimer.readonly();
    }

    this._startTimer.readonly(value);
    this._endTimer.readonly(value);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this._startTimer.required();
    }

    this._startTimer.required(value);
    this._endTimer.required(value);
    return this;
  }

  _setupTimerRange(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { disabled, end, mode, name, readonly, required, start, value, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (mode !== undefined) this.mode(mode);
      if (name !== undefined) this.name(name);
      if (value !== undefined) this.value(value);
      else this.value({ start, end });
      if (required !== undefined) this.required(required);
      if (readonly !== undefined) this.readonly(readonly);
      if (disabled !== undefined) this.disabled(disabled);
      return;
    }

    this.value(setup);
  }

  _handleTimerChange(event) {
    event.stopPropagation();
    this._validate();

    if (this._el) {
      const CustomEventClass = this._el.ownerDocument.defaultView.CustomEvent;
      this._el.dispatchEvent(
        new CustomEventClass('change', {
          bubbles: true,
          detail: this.value()
        })
      );
    }
  }

  _validate() {
    const { start, end } = this.value();
    const invalid = Boolean(start && end && end < start);

    this.attr('data-error', invalid ? 'true' : null);
    this.attr('data-invalid', invalid ? 'true' : null);
    this.attr('aria-invalid', invalid ? 'true' : null);
    this._startTimer.error(invalid);
    this._endTimer.error(invalid);
    this._startTimer.attr('aria-invalid', invalid ? 'true' : null);
    this._endTimer.attr('aria-invalid', invalid ? 'true' : null);
    this._errorText.textContent(invalid ? '结束值不能早于开始值' : '');
    return !invalid;
  }
}

export class VTextarea extends HtmlElementNode {
  constructor(setup = null) {
    super('textarea', null);
    this._value = '';

    this.className(componentClass, 'yoya-vtextarea');
    this.styles({
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: '#172033',
      font: 'inherit',
      minHeight: '88px',
      outline: 'none',
      padding: '10px 12px',
      resize: 'vertical',
      width: '100%'
    });

    this._setupTextarea(setup);
  }

  value(value) {
    if (value === undefined) {
      return this._el?.value ?? this._value ?? this.textContent();
    }

    const next = resolveTextValue(value);
    this._value = next;
    replaceChildren(this, next ? normalizeChildren(next) : []);

    if (this._el) {
      this._el.value = next;
    }

    return this;
  }

  text(value) {
    return this.value(value);
  }

  content(value) {
    return this.value(value);
  }

  placeholder(value) {
    if (value === undefined) {
      return this.attr('placeholder');
    }

    const next = resolveTextValue(value);
    this.attr('placeholder', next || null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.style('cursor', enabled ? 'not-allowed' : 'text');
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  readonly(value) {
    if (value === undefined) {
      return this.getBooleanState('readonly');
    }

    const enabled = Boolean(value);

    this.setState('readonly', enabled);
    this.attr('readonly', enabled ? true : null);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this.attr('required', enabled ? true : null);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this.getBooleanState('error');
    }

    const enabled = Boolean(value);

    this.setState('error', enabled);
    this.attr('data-error', enabled ? 'true' : null);
    this.style('borderColor', enabled ? '#dc2626' : '#cbd5e1');
    this.style('boxShadow', enabled ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : null);
    return this;
  }

  rows(value) {
    if (value === undefined) {
      return this.attr('rows');
    }

    this.attr('rows', value);
    return this;
  }

  _setupTextarea(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        content,
        disabled,
        error,
        placeholder,
        readonly,
        required,
        rows,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (rows !== undefined) {
        this.rows(rows);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }

      if (value !== undefined) {
        this.value(value);
      } else if (text !== undefined) {
        this.value(text);
      } else if (content !== undefined) {
        this.value(content);
      } else if (children !== undefined) {
        this.value(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (readonly !== undefined) {
        this.readonly(readonly);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (error !== undefined) {
        this.error(error);
      }

      return;
    }

    this.value(setup);
  }
}

export class VSelect extends HtmlElementNode {
  constructor(setup = null) {
    super('select', null);
    this._options = [];
    this._placeholder = '';
    this._value = '';

    this.className(componentClass, 'yoya-vselect');
    this.styles({
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: '#172033',
      cursor: 'pointer',
      font: 'inherit',
      minHeight: '34px',
      outline: 'none',
      padding: '0 32px 0 12px',
      width: '100%'
    });

    this._setupSelect(setup);
  }

  value(value) {
    if (value === undefined) {
      return this._el?.value ?? this._value ?? '';
    }

    this._value = resolveTextValue(value);
    this._renderOptions();
    return this;
  }

  text(value) {
    return this.value(value);
  }

  content(value) {
    return this.value(value);
  }

  placeholder(value) {
    if (value === undefined) {
      return this._placeholder;
    }

    this._placeholder = resolveTextValue(value);
    this._renderOptions();
    return this;
  }

  options(value) {
    if (value === undefined) {
      return this._options.slice();
    }

    this._options = Array.isArray(value) ? value.slice() : [];
    this._renderOptions();
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.style('cursor', enabled ? 'not-allowed' : 'pointer');
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this.attr('required', enabled ? true : null);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this.getBooleanState('error');
    }

    const enabled = Boolean(value);

    this.setState('error', enabled);
    this.attr('data-error', enabled ? 'true' : null);
    this.style('borderColor', enabled ? '#dc2626' : '#cbd5e1');
    this.style('boxShadow', enabled ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : null);
    return this;
  }

  clear() {
    return this.value('');
  }

  _renderOptions() {
    const nodes = [];
    const selectedValue = resolveTextValue(this._value);

    if (this._placeholder) {
      const placeholderNode = new HtmlElementNode('option').className('yoya-vselect-option');
      placeholderNode.attr({ disabled: true, value: '' });
      placeholderNode.attr('selected', selectedValue ? null : true);
      placeholderNode.styles({
        color: '#94a3b8'
      });
      replaceChildren(placeholderNode, normalizeChildren(this._placeholder));
      nodes.push(placeholderNode);
    }

    this._options.forEach((option, index) => {
      nodes.push(createSelectOptionNode(option, selectedValue, index));
    });

    replaceChildren(this, nodes);

    if (this._el) {
      this._el.value = selectedValue;
    }
  }

  _setupSelect(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        content,
        disabled,
        error,
        options,
        placeholder,
        required,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }

      if (options !== undefined) {
        this.options(options);
      }

      if (value !== undefined) {
        this.value(value);
      } else if (text !== undefined) {
        this.value(text);
      } else if (content !== undefined) {
        this.value(content);
      } else if (children !== undefined) {
        this.value(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (error !== undefined) {
        this.error(error);
      }

      return;
    }

    this.value(setup);
  }
}

class VBooleanControl extends HtmlElementNode {
  constructor(tagName, setup = null) {
    super('label', null);
    this._kind = tagName;
    this._optionValue = 'on';
    this._input = new HtmlElementNode('input').className(`yoya-v${tagName}-input`);
    this._visualBox = new HtmlElementNode('span').className(`yoya-v${tagName}-visual`);
    this._contentBox = new HtmlElementNode('span').className(`yoya-v${tagName}-content`);
    this._labelBox = new HtmlElementNode('span').className(`yoya-v${tagName}-label`);
    this._descriptionBox = new HtmlElementNode('span')
      .className(`yoya-v${tagName}-description`)
      .style('display', 'none');

    this.className(componentClass, `yoya-v${tagName}`);
    this.styles({
      alignItems: 'center',
      cursor: 'pointer',
      display: 'inline-grid',
      gap: '10px',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      position: 'relative'
    });
    this._input.attr('type', 'checkbox');
    this._input.styles({
      height: '1px',
      margin: '0',
      opacity: '0',
      pointerEvents: 'none',
      position: 'absolute',
      width: '1px'
    });
    this._contentBox.styles({
      display: 'grid',
      gap: '2px',
      minWidth: '0'
    });
    this._labelBox.styles({
      color: '#172033',
      fontWeight: '600',
      lineHeight: '1.35'
    });
    this._descriptionBox.styles({
      color: '#64748b',
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._contentBox.child(this._labelBox, this._descriptionBox);
    this.child(this._visualBox, this._input, this._contentBox);
    this._input.on('change', (event) => {
      if (this.getBooleanState('disabled')) {
        return;
      }

      this.checked(Boolean(event.target?.checked));
    });
  }

  label(value) {
    if (value === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(value));
    return this;
  }

  text(value) {
    return this.label(value);
  }

  content(value) {
    return this.label(value);
  }

  description(value) {
    if (value === undefined) {
      return this._descriptionBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._descriptionBox.style('display', hasContent ? null : 'none');
    replaceChildren(this._descriptionBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  checked(value) {
    if (value === undefined) {
      return this.getBooleanState('checked');
    }

    const enabled = Boolean(value);

    this.setState('checked', enabled);
    this.attr('data-checked', enabled ? 'true' : null);
    this._input.attr('checked', enabled ? true : null);
    this._syncVisual(enabled);
    return this;
  }

  value(value) {
    if (value === undefined) {
      return this.checked();
    }

    return this.checked(value);
  }

  optionValue(value) {
    if (value === undefined) {
      return this._optionValue;
    }

    this._optionValue = resolveTextValue(value) || 'on';
    this._input.attr('value', this._optionValue);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this._input.name();
    }

    this._input.name(value);
    this.attr('data-name', value ?? null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this._input.attr('disabled', enabled ? true : null);
    this.attr('aria-disabled', enabled ? 'true' : null);
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this._input.attr('required', enabled ? true : null);
    return this;
  }

  indeterminate(value) {
    if (value === undefined) {
      return this.getBooleanState('indeterminate');
    }

    const enabled = Boolean(value);

    this.setState('indeterminate', enabled);
    if (this._input._el) {
      this._input._el.indeterminate = enabled;
    }
    return this;
  }

  _setupBoolean(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        checked,
        children,
        content,
        description,
        disabled,
        label,
        name,
        optionValue,
        required,
        text,
        value,
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
        this.label(children);
      }

      if (description !== undefined) {
        this.description(description);
      }

      if (name !== undefined) {
        this.name(name);
      }

      if (optionValue !== undefined) {
        this.optionValue(optionValue);
      } else if (value !== undefined && typeof value !== 'boolean') {
        this.optionValue(value);
      }

      if (checked !== undefined) {
        this.checked(checked);
      } else if (value !== undefined && typeof value === 'boolean') {
        this.checked(value);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      return;
    }

    if (setup instanceof ViewNode || Array.isArray(setup) || typeof setup === 'string' || typeof setup === 'number') {
      this.label(setup);
      return;
    }

    this.label(setup);
  }

  _syncVisual() {}
}

export class VCheckbox extends VBooleanControl {
  constructor(setup = null) {
    super('checkbox');
    this._visualBox.styles({
      alignItems: 'center',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      boxSizing: 'border-box',
      color: '#ffffff',
      display: 'inline-flex',
      height: '16px',
      justifyContent: 'center',
      lineHeight: '1',
      transition: 'background 120ms ease, border-color 120ms ease',
      width: '16px'
    });
    this._syncVisual(false);
    this._setupBoolean(setup);
  }

  _syncVisual(enabled) {
    this._visualBox.styles({
      background: enabled ? '#2563eb' : '#ffffff',
      borderColor: enabled ? '#2563eb' : '#cbd5e1',
      color: enabled ? '#ffffff' : 'transparent'
    });
    replaceChildren(this._visualBox, enabled ? normalizeChildren('✓') : []);
  }

}

export class VSwitch extends VBooleanControl {
  constructor(setup = null) {
    super('switch');
    this._thumbBox = new HtmlElementNode('span').className('yoya-vswitch-thumb');
    this._visualBox.styles({
      background: '#cbd5e1',
      border: '1px solid #cbd5e1',
      borderRadius: '999px',
      boxSizing: 'border-box',
      display: 'inline-flex',
      height: '22px',
      padding: '2px',
      position: 'relative',
      transition: 'background 120ms ease, border-color 120ms ease',
      width: '40px'
    });
    this._thumbBox.styles({
      background: '#ffffff',
      borderRadius: '999px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.18)',
      height: '16px',
      transform: 'translateX(0)',
      transition: 'transform 120ms ease',
      width: '16px'
    });
    this._visualBox.child(this._thumbBox);
    this._syncVisual(false);
    this._setupBoolean(setup);
  }

  _syncVisual(enabled) {
    this._visualBox.styles({
      background: enabled ? '#2563eb' : '#cbd5e1',
      borderColor: enabled ? '#2563eb' : '#cbd5e1'
    });
    this._thumbBox.style('transform', enabled ? 'translateX(18px)' : 'translateX(0)');
  }

}

export class VCheckboxes extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._name = '';
    this._multiple = true;
    this._required = false;
    this._items = [];
    this._options = [];

    this.className(componentClass, 'yoya-vcheckboxes');
    this.styles({
      display: 'grid',
      gap: '8px',
      minWidth: '0'
    });

    this._setupCheckboxes(setup);
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    this.attr('data-name', this._name || null);
    return this;
  }

  multiple(value) {
    if (value === undefined) {
      return this._multiple;
    }

    const selected = this.value();
    this._multiple = Boolean(value);
    if (!this._multiple) {
      if (Array.isArray(selected)) {
        this.value(selected[0] ?? null);
      } else {
        this.value(selected);
      }
    }
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this._required;
    }

    this._required = Boolean(value);
    this.attr('data-required', this._required ? 'true' : null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('aria-disabled', enabled ? 'true' : null);
    this.style('opacity', enabled ? '0.64' : '1');
    this._items.forEach((item) => item.disabled(enabled));
    return this;
  }

  options(value) {
    if (value === undefined) {
      return this._options.slice();
    }

    this._options = Array.isArray(value) ? value.slice() : [];
    this._renderOptions();
    return this;
  }

  value(value) {
    if (value === undefined) {
      const selected = this._items
        .filter((item) => item.checked())
        .map((item) => item.optionValue());

      if (this._multiple) {
        return selected;
      }

      return selected[0] ?? null;
    }

    const values = normalizeValueList(value);
    const selectedValues = this._multiple ? values : values.slice(0, 1);

    this._items.forEach((item) => {
      const itemValue = resolveTextValue(item.optionValue());
      item.checked(selectedValues.includes(itemValue));
    });

    return this;
  }

  checkedValues(value) {
    if (value === undefined) {
      return this.value();
    }

    return this.value(value);
  }

  clear() {
    return this.value(this._multiple ? [] : null);
  }

  _renderOptions() {
    const normalizedItems = this._options.map((option, index) => createCheckboxGroupItem(option, index));

    this._items = normalizedItems;
    replaceChildren(this, normalizedItems);
    this._items.forEach((item) => {
      item.on('change', () => this._handleItemChange(item));
      if (this._name) {
        item.attr('data-group-name', this._name);
      }
    });
    this.value(this.value());
  }

  _handleItemChange(item) {
    if (!this._multiple && item.checked()) {
      this._items.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.checked(false);
        }
      });
    }
  }

  _setupCheckboxes(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, disabled, multiple, name, options, required, value, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (name !== undefined) {
        this.name(name);
      }

      if (multiple !== undefined) {
        this.multiple(multiple);
      }

      if (options !== undefined) {
        this.options(options);
      } else if (children !== undefined) {
        this.options(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (value !== undefined) {
        this.value(value);
      }

      return;
    }

    if (Array.isArray(setup)) {
      this.options(setup);
      return;
    }

    this.options([setup]);
  }
}

export class VField extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._mode = 'view';
    this._control = null;
    this._hovered = false;
    this._headerBox = new HtmlElementNode('div').className('yoya-vfield-header');
    this._displayBox = new HtmlElementNode('div').className('yoya-vfield-display');
    this._editorBox = new HtmlElementNode('div').className('yoya-vfield-editor').style('display', 'none');
    this._labelBox = new HtmlElementNode('div').className('yoya-vfield-label');
    this._hintBox = new HtmlElementNode('div').className('yoya-vfield-hint').style('display', 'none');
    this._errorBox = new HtmlElementNode('div').className('yoya-vfield-error').style('display', 'none');
    this._actionButton = new VButton('✎')
      .className('yoya-vfield-action')
      .size('small')
      .variant('secondary')
      .attr({ tabindex: '-1', 'aria-hidden': 'true' })
      .on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.mode(this._mode === 'edit' ? 'view' : 'edit');
      });

    this.className(componentClass, 'yoya-vfield');
    this.styles({
      display: 'grid',
      gap: '8px',
      minWidth: '0'
    });
    this._headerBox.styles({
      alignItems: 'center',
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between',
      minWidth: '0'
    });
    this._labelBox.styles({
      color: '#111827',
      flex: '1 1 auto',
      fontWeight: '700',
      lineHeight: '1.35'
    });
    this._displayBox.styles({
      border: '1px solid #d8dee8',
      borderRadius: '6px',
      color: '#172033',
      minHeight: '34px',
      padding: '8px 12px'
    });
    this._editorBox.styles({
      minWidth: '0'
    });
    this._hintBox.styles({
      color: '#64748b',
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._errorBox.styles({
      color: '#b91c1c',
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._actionButton.styles({
      flexShrink: '0',
      gap: '0',
      minWidth: '32px',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 120ms ease'
    });
    this._headerBox.child(this._labelBox, this._actionButton);
    this.child(this._headerBox, this._displayBox, this._editorBox, this._hintBox, this._errorBox);
    this.on('mouseenter', () => {
      this._hovered = true;
      this._syncActionButton();
    });
    this.on('mouseleave', () => {
      this._hovered = false;
      this._syncActionButton();
    });
    this._setupField(setup);
    this._syncActionButton();
  }

  label(value) {
    if (value === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(value));
    return this;
  }

  hint(value) {
    if (value === undefined) {
      return this._hintBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._hintBox.style('display', hasContent ? null : 'none');
    replaceChildren(this._hintBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this._errorBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._errorBox.style('display', hasContent ? null : 'none');
    this.attr('data-error', hasContent ? 'true' : null);
    replaceChildren(this._errorBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  display(value) {
    if (value === undefined) {
      return this._displayBox.textContent();
    }

    replaceChildren(this._displayBox, normalizeChildren(value));
    return this;
  }

  control(setup) {
    if (setup === undefined) {
      return this._control ?? findFieldControl(this._editorBox);
    }

    setupContentSlot(this._editorBox, setup);
    this._control = findFieldControl(this._editorBox);

    if (this._mode === 'view') {
      this._syncDisplayFromControl();
    }

    this._syncActionButton();

    return this;
  }

  editor(setup) {
    return this.control(setup);
  }

  value(value) {
    const control = this.control();

    if (value === undefined) {
      return control ? readControlValue(control) : this._displayBox.textContent();
    }

    if (control) {
      applyControlValue(control, value);
    } else {
      this.display(value);
    }

    if (this._mode === 'view') {
      this._syncDisplayFromControl();
    }

    return this;
  }

  mode(value) {
    if (value === undefined) {
      return this._mode;
    }

    this._mode = value === 'edit' ? 'edit' : 'view';
    this.attr('data-mode', this._mode);

    if (this._mode === 'edit') {
      this._displayBox.style('display', 'none');
      this._editorBox.style('display', null);
    } else {
      this._editorBox.style('display', 'none');
      this._displayBox.style('display', null);
      this._syncDisplayFromControl();
    }

    this._syncActionButton();

    return this;
  }

  view() {
    return this.mode('view');
  }

  edit() {
    return this.mode('edit');
  }

  _syncDisplayFromControl() {
    const control = this.control();

    if (!control) {
      return this;
    }

    const value = readControlValue(control);

    replaceChildren(this._displayBox, normalizeChildren(formatDisplayValue(value)));
    return this;
  }

  _syncActionButton() {
    if (!this._actionButton) {
      return this;
    }

    const hasControl = Boolean(this.control());
    const visible = hasControl && (this._hovered || this._mode === 'edit');
    const label = this._mode === 'edit' ? '完成' : '编辑';
    const symbol = this._mode === 'edit' ? '✓' : '✎';

    this._actionButton.label(symbol);
    this._actionButton.attr({
      'aria-hidden': visible ? null : 'true',
      'aria-label': label,
      title: label
    });
    this._actionButton.attr('tabindex', visible ? null : '-1');
    this._actionButton.style('opacity', visible ? '1' : '0');
    this._actionButton.style('pointerEvents', visible ? null : 'none');
    return this;
  }

  _setupField(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, control, display, editor, error, hint, label, mode, value, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      }

      if (hint !== undefined) {
        this.hint(hint);
      }

      if (display !== undefined) {
        this.display(display);
      }

      if (editor !== undefined) {
        this.editor(editor);
      } else if (control !== undefined) {
        this.control(control);
      } else if (children !== undefined) {
        this.editor(children);
      }

      if (value !== undefined) {
        this.value(value);
      }

      if (error !== undefined) {
        this.error(error);
      }

      if (mode !== undefined) {
        this.mode(mode);
      }

      return;
    }

    this.display(setup);
  }
}

export class VForm extends HtmlElementNode {
  constructor(setup = null) {
    super('form', null);

    this.className(componentClass, 'yoya-vform');
    this.styles({
      display: 'grid',
      gap: '16px',
      minWidth: '0'
    });

    this._setupForm(setup);
  }

  values(value) {
    if (value === undefined) {
      const result = {};
      collectFormValues(this, result);
      return result;
    }

    if (isPlainObject(value)) {
      applyFormValues(this, value);
    }

    return this;
  }

  value(value) {
    return this.values(value);
  }

  validate() {
    return validateFormControls(this);
  }

  reset() {
    if (this._el?.reset) {
      this._el.reset();
    }

    return this;
  }

  submit() {
    if (this._el?.requestSubmit) {
      this._el.requestSubmit();
    } else if (this._el?.dispatchEvent) {
      this._el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    return this;
  }

  _setupForm(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, values, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (children !== undefined) {
        applyComponentSetup(this, children);
      }

      if (values !== undefined) {
        this.values(values);
      }

      return;
    }

    this.child(setup);
  }
}

export function vInput(setup = null) {
  return setup instanceof VInput ? setup : new VInput(setup);
}

export function vTimer(setup = null) {
  return setup instanceof VTimer ? setup : new VTimer(setup);
}

export function vTimerRange(setup = null) {
  return setup instanceof VTimerRange ? setup : new VTimerRange(setup);
}

export function vTextarea(setup = null) {
  return setup instanceof VTextarea ? setup : new VTextarea(setup);
}

export function vSelect(setup = null) {
  return setup instanceof VSelect ? setup : new VSelect(setup);
}

export function vCheckbox(setup = null) {
  return setup instanceof VCheckbox ? setup : new VCheckbox(setup);
}

export function vSwitch(setup = null) {
  return setup instanceof VSwitch ? setup : new VSwitch(setup);
}

export function vCheckboxes(setup = null) {
  return setup instanceof VCheckboxes ? setup : new VCheckboxes(setup);
}

export function vField(setup = null) {
  return setup instanceof VField ? setup : new VField(setup);
}

export function vForm(setup = null) {
  return setup instanceof VForm ? setup : new VForm(setup);
}

const formComponentFactories = {
  vCheckbox,
  vCheckboxes,
  vField,
  vForm,
  vInput,
  vSelect,
  vSwitch,
  vTimer,
  vTimerRange,
  vTextarea
};

registerChildFactories(HtmlElementNode, formComponentFactories);

function resolveTextValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTextValue(item)).join('');
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value.textContent === 'function') {
    return value.textContent();
  }

  return String(value);
}

function formatDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTextValue(item)).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return resolveTextValue(value);
}

function normalizeValueList(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  return Array.isArray(value) ? value.map((item) => resolveTextValue(item)) : [resolveTextValue(value)];
}

function createSelectOptionNode(option, selectedValue, index) {
  if (option instanceof HtmlElementNode && option.tagName?.() === 'option') {
    const node = option;
    node.attr('selected', resolveTextValue(node.attr('value')) === selectedValue ? true : null);
    return node;
  }

  const normalized = normalizeSelectOption(option, index);
  const node = new HtmlElementNode('option').className('yoya-vselect-option');
  const isSelected = normalized.value === selectedValue;

  node.attr('value', normalized.value);
  node.attr('selected', isSelected ? true : null);

  if (normalized.disabled) {
    node.attr('disabled', true);
  }

  if (isSelected) {
    node.styles({
      color: '#172033'
    });
  }

  replaceChildren(node, normalizeChildren(normalized.label));
  return node;
}

function normalizeSelectOption(option, index) {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const text = resolveTextValue(option);
    return {
      label: text,
      value: text
    };
  }

  if (Array.isArray(option) && option.length > 0) {
    const [value, label = value] = option;
    return {
      label: label ?? value ?? '',
      value: resolveTextValue(value)
    };
  }

  if (option instanceof ViewNode) {
    const text = option.textContent();
    return {
      label: option,
      value: text
    };
  }

  if (isPlainObject(option)) {
    const value = option.value ?? option.key ?? option.id ?? option.label ?? option.text ?? option.title ?? `option-${index}`;
    const label = option.label ?? option.text ?? option.content ?? option.title ?? value;

    return {
      disabled: Boolean(option.disabled),
      label,
      value: resolveTextValue(value)
    };
  }

  const text = resolveTextValue(option);
  return {
    label: text,
    value: text
  };
}

function createCheckboxGroupItem(option, index) {
  if (option instanceof VCheckbox) {
    return option;
  }

  if (option instanceof ViewNode && !(option instanceof HtmlElementNode)) {
    return vCheckbox(option);
  }

  const normalized = normalizeCheckboxGroupOption(option, index);

  return new VCheckbox({
    checked: normalized.checked,
    description: normalized.description,
    disabled: normalized.disabled,
    label: normalized.label,
    optionValue: normalized.value,
    required: normalized.required
  });
}

function normalizeCheckboxGroupOption(option, index) {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const text = resolveTextValue(option);
    return {
      label: text,
      value: text
    };
  }

  if (Array.isArray(option) && option.length > 0) {
    const [value, label = value] = option;
    return {
      label: label ?? value ?? '',
      value: resolveTextValue(value)
    };
  }

  if (option instanceof VCheckbox) {
    return {
      checked: option.checked(),
      description: option.description(),
      disabled: option.disabled(),
      label: option.label(),
      required: option.required(),
      value: option.optionValue()
    };
  }

  if (option instanceof ViewNode) {
    const text = option.textContent();
    return {
      label: option,
      value: text
    };
  }

  if (isPlainObject(option)) {
    const value = option.value ?? option.key ?? option.id ?? option.label ?? option.text ?? `option-${index}`;
    const label = option.label ?? option.text ?? option.content ?? option.title ?? value;

    return {
      checked: Boolean(option.checked),
      description: option.description,
      disabled: Boolean(option.disabled),
      label,
      required: Boolean(option.required),
      value: resolveTextValue(value)
    };
  }

  const text = resolveTextValue(option);
  return {
    label: text,
    value: text
  };
}

function readControlValue(control) {
  if (!control) {
    return undefined;
  }

  if (control instanceof VCheckboxes) {
    return control.value();
  }

  if (control instanceof VCheckbox || control instanceof VSwitch) {
    return control.value();
  }

  if (control instanceof VInput || control instanceof VSelect || control instanceof VTextarea) {
    return control.value();
  }

  const tagName = typeof control.tagName === 'function' ? control.tagName() : '';

  if (tagName === 'input') {
    const type = resolveTextValue(control.attr('type') || 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      return control._el?.checked ?? Boolean(control.attr('checked'));
    }

    return control._el?.value ?? control.attr('value') ?? '';
  }

  if (tagName === 'select') {
    return control._el?.value ?? control.attr('value') ?? '';
  }

  if (tagName === 'textarea') {
    return control._el?.value ?? control.textContent();
  }

  if (typeof control.value === 'function') {
    try {
      return control.value();
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function applyControlValue(control, value) {
  if (!control) {
    return;
  }

  if (control instanceof VCheckboxes) {
    control.value(value);
    return;
  }

  if (control instanceof VCheckbox || control instanceof VSwitch) {
    control.value(value);
    return;
  }

  if (control instanceof VInput || control instanceof VSelect || control instanceof VTextarea) {
    control.value(value);
    return;
  }

  const tagName = typeof control.tagName === 'function' ? control.tagName() : '';

  if (tagName === 'textarea') {
    replaceChildren(control, normalizeChildren(resolveTextValue(value)));
    if (control._el) {
      control._el.value = resolveTextValue(value);
    }
    return;
  }

  if (tagName === 'select' || tagName === 'input') {
    const type = tagName === 'input' ? resolveTextValue(control.attr('type') || 'text').toLowerCase() : '';
    if (type === 'checkbox' || type === 'radio') {
      control.attr('checked', Boolean(value) ? true : null);
    } else {
      control.attr('value', Array.isArray(value) ? resolveTextValue(value[0]) : resolveTextValue(value));
    }
    return;
  }

  if (typeof control.value === 'function') {
    control.value(value);
  }
}

function collectFormValues(node, result) {
  if (!node || typeof node !== 'object') {
    return result;
  }

  if (node instanceof VForm) {
    node.children().forEach((child) => collectFormValues(child, result));
    return result;
  }

  if (node instanceof VField) {
    node.children().forEach((child) => collectFormValues(child, result));
    return result;
  }

  if (node instanceof VCheckboxes) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, node.value());
    }
    return result;
  }

  if (
    node instanceof VInput ||
    node instanceof VSelect ||
    node instanceof VTextarea ||
    node instanceof VCheckbox ||
    node instanceof VSwitch
  ) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, readControlValue(node));
    }
    return result;
  }

  const tagName = typeof node.tagName === 'function' ? node.tagName() : '';

  if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
    const name = typeof node.name === 'function' ? node.name() : node.attr?.('name');
    if (name) {
      assignFormValue(result, name, readControlValue(node));
    }
    return result;
  }

  if (typeof node.children === 'function') {
    node.children().forEach((child) => collectFormValues(child, result));
  }

  return result;
}

function applyFormValues(node, values) {
  if (!node || typeof node !== 'object' || !isPlainObject(values)) {
    return node;
  }

  function visit(current) {
    if (!current || typeof current !== 'object') {
      return;
    }

    if (current instanceof VField || current instanceof VForm) {
      current.children().forEach((child) => visit(child));
      return;
    }

    const name = typeof current.name === 'function' ? current.name() : current.attr?.('name');
    if (name && Object.prototype.hasOwnProperty.call(values, name)) {
      applyControlValue(current, values[name]);
      return;
    }

    if (typeof current.children === 'function') {
      current.children().forEach((child) => visit(child));
    }
  }

  visit(node);
  return node;
}

function validateFormControls(node) {
  let valid = true;

  function visit(current) {
    if (!current || !valid) {
      return;
    }

    if (current instanceof VForm || current instanceof VField) {
      current.children().forEach((child) => visit(child));
      return;
    }

    const isControl =
      current instanceof VCheckboxes ||
      current instanceof VInput ||
      current instanceof VSelect ||
      current instanceof VTextarea ||
      current instanceof VCheckbox ||
      current instanceof VSwitch ||
      (typeof current.tagName === 'function' &&
        ['input', 'select', 'textarea'].includes(current.tagName()));

    if (isControl) {
      if (!isControlDisabled(current) && isControlRequired(current)) {
        const value = readControlValue(current);
        if (Array.isArray(value)) {
          valid = value.length > 0;
        } else if (typeof value === 'boolean') {
          valid = value;
        } else {
          valid = value !== null && value !== undefined && String(value).length > 0;
        }
      }

      return;
    }

    if (typeof current.children === 'function') {
      current.children().forEach((child) => visit(child));
    }
  }

  visit(node);
  return valid;
}

function isControlRequired(control) {
  if (!control) {
    return false;
  }

  if (typeof control.required === 'function') {
    try {
      return Boolean(control.required());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('required'));
}

function isControlDisabled(control) {
  if (!control) {
    return false;
  }

  if (typeof control.disabled === 'function') {
    try {
      return Boolean(control.disabled());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('disabled'));
}

function findFieldControl(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (
    node instanceof VInput ||
    node instanceof VSelect ||
    node instanceof VTextarea ||
    node instanceof VCheckboxes ||
    node instanceof VCheckbox ||
    node instanceof VSwitch
  ) {
    return node;
  }

  if (typeof node.children !== 'function') {
    return null;
  }

  for (const child of node.children()) {
    const found = findFieldControl(child);
    if (found) {
      return found;
    }
  }

  return null;
}

function assignFormValue(result, name, value) {
  if (Object.prototype.hasOwnProperty.call(result, name)) {
    const existing = result[name];

    if (Array.isArray(existing)) {
      if (Array.isArray(value)) {
        result[name] = existing.concat(value);
      } else {
        existing.push(value);
      }
      return;
    }

    result[name] = Array.isArray(value) ? [existing].concat(value) : [existing, value];
    return;
  }

  result[name] = value;
}
