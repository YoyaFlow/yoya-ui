import { HtmlElementNode } from '../html/index.js';
import { VButton } from '../actions/button.js';
import { bindDocumentEvent } from '../core/document-events.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot
} from '../components/shared.js';

import { allocateId } from '../core/id.js';

export class VMenu extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vmenu');
    this.orientation('vertical');
    this.on('focusin', (event) => this._handleFocusin(event));
    this.on('keydown', (event) => this._handleKeydown(event));
    this.on('yoya:menuitem-statechange', () => this._syncTabStops());
    this._setupMenu(setup);
  }

  orientation(value = 'vertical') {
    const orientation = value === 'horizontal' ? 'horizontal' : 'vertical';

    this.attr('data-orientation', orientation);
    this.attr('role', orientation === 'horizontal' ? 'menubar' : 'menu');
    this.attr('aria-orientation', orientation);
    this.children().forEach((child) => {
      applyMenuOrientation(child, orientation);
    });
    return this;
  }

  child(...children) {
    super.child(...children);
    const orientation = this.attr('data-orientation') || 'vertical';

    this.children().forEach((child) => {
      applyMenuOrientation(child, orientation);
    });
    if (this._el) {
      this._syncTabStops();
    }
    this._sidebarContentChangeCallback?.();

    return this;
  }

  horizontal() {
    return this.orientation('horizontal');
  }

  vertical() {
    return this.orientation('vertical');
  }

  renderDom() {
    const element = super.renderDom();
    this._syncTabStops();
    return element;
  }

  _enabledMenuItems() {
    if (!this._el) {
      return [];
    }

    return this._menuItems().filter((item) => !item.disabled);
  }

  _menuItems() {
    if (!this._el) {
      return [];
    }

    return Array.from(this._el.querySelectorAll('.yoya-vmenu-item')).filter(
      (item) => item.closest('.yoya-vmenu') === this._el
    );
  }

  _syncTabStops(preferredItem = null) {
    if (!this._el) {
      return this;
    }

    const allItems = this._menuItems();
    const enabledItems = allItems.filter((item) => !item.disabled);
    const currentItem = enabledItems.includes(preferredItem)
      ? preferredItem
      : enabledItems.find((item) => item.tabIndex === 0) || enabledItems[0];

    allItems.forEach((item) => {
      item.tabIndex = item === currentItem ? 0 : -1;
    });
    return this;
  }

  _handleKeydown(event) {
    if (event.target.closest?.('.yoya-vmenu') !== this._el) {
      return;
    }

    const orientation = this.attr('data-orientation') || 'vertical';
    const keyStep =
      orientation === 'vertical' ? { ArrowDown: 1, ArrowUp: -1 } : { ArrowLeft: -1, ArrowRight: 1 };
    const items = this._enabledMenuItems();
    const currentItem = event.target.closest?.('.yoya-vmenu-item');

    if (
      items.length === 0 ||
      (!keyStep[event.key] && event.key !== 'Home' && event.key !== 'End')
    ) {
      return;
    }

    event.preventDefault();
    let nextIndex;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else {
      const currentIndex = Math.max(0, items.indexOf(currentItem));
      nextIndex = (currentIndex + keyStep[event.key] + items.length) % items.length;
    }

    const nextItem = items[nextIndex];
    this._syncTabStops(nextItem);
    nextItem.focus();
  }

  _handleFocusin(event) {
    if (event.target.closest?.('.yoya-vmenu') !== this._el) {
      return;
    }

    const item = event.target.closest?.('.yoya-vmenu-item');
    if (item && !item.disabled) {
      this._syncTabStops(item);
    }
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
    this.child(this._iconBox, this._labelBox, this._shortcutBox);
    this.on('mouseenter', () => this._setHover(true));
    this.on('mouseleave', () => this._setHover(false));
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
    this._iconBox.style(
      'display',
      content === null || content === undefined || content === '' ? 'none' : null
    );
    return this;
  }

  shortcut(content) {
    replaceChildren(this._shortcutBox, normalizeChildren(content));
    this._shortcutBox.style(
      'display',
      content === null || content === undefined || content === '' ? 'none' : null
    );
    return this;
  }

  active(value = true) {
    const enabled = Boolean(value);

    this.setState('active', enabled);
    this.attr('data-active', enabled ? 'true' : null);
    this.attr('aria-current', enabled ? 'page' : null);
    return this;
  }

  danger(value = true) {
    const enabled = Boolean(value);

    this.setState('danger', enabled);
    this.attr('data-danger', enabled ? 'true' : null);
    return this;
  }

  _setHover(hovered) {
    this.attr('data-hovered', hovered ? 'true' : null);
    return this;
  }

  disabled(value) {
    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.attr('aria-disabled', enabled ? 'true' : null);
    if (this._el) {
      const EventClass = this._el.ownerDocument.defaultView.Event;
      this._el.dispatchEvent(new EventClass('yoya:menuitem-statechange', { bubbles: true }));
    }
    return this;
  }

  hoverable(value = true) {
    this.attr('data-hoverable', value ? 'true' : null);
    return this;
  }

  _menuOrientation(orientation) {
    this.attr('data-orientation', orientation);
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

export class VMenuDivider extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vmenu-divider');
    this.attr('role', 'separator');
    this._menuOrientation('vertical');
    applyComponentSetup(this, setup);
  }

  _menuOrientation(orientation) {
    const horizontal = orientation === 'horizontal';
    this.attr('aria-orientation', horizontal ? 'vertical' : 'horizontal');
    this.attr('data-orientation', orientation);
    return this;
  }
}

export class VMenuGroup extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    const labelId = allocateId('yoya-vmenu-group-label');
    this._orientation = 'vertical';
    this._labelBox = new HtmlElementNode('div').className('yoya-vmenu-group-label').id(labelId);

    this.className(componentClass, 'yoya-vmenu-group');
    this.attr({ 'aria-labelledby': labelId, role: 'group' });
    super.child(this._labelBox);
    this._setupMenuGroup(setup);
  }

  label(content) {
    replaceChildren(this._labelBox, normalizeChildren(content));
    return this;
  }

  title(content) {
    return this.label(content);
  }

  child(...children) {
    super.child(...children);
    this.children().forEach((child) => applyMenuOrientation(child, this._orientation));
    if (this._el) {
      const EventClass = this._el.ownerDocument.defaultView.Event;
      this._el.dispatchEvent(new EventClass('yoya:menuitem-statechange', { bubbles: true }));
    }
    this._sidebarContentChangeCallback?.();
    return this;
  }

  _menuOrientation(orientation) {
    this._orientation = orientation === 'horizontal' ? 'horizontal' : 'vertical';
    this.attr('data-orientation', this._orientation);
    this.children().forEach((child) => applyMenuOrientation(child, this._orientation));
    return this;
  }

  _setupMenuGroup(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, label, title, ...elementConfig } = setup;
      if (Object.keys(elementConfig).length > 0) this.setup(elementConfig);
      if (label !== undefined) this.label(label);
      else if (title !== undefined) this.title(title);
      if (children !== undefined) this.child(children);
      return;
    }

    this.label(setup);
  }
}

export class VSubMenu extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    const panelId = allocateId('yoya-vsubmenu-panel');
    this._globalCloseCleanup = null;
    this._trigger = new VMenuItem()
      .className('yoya-vsubmenu-trigger')
      .attr({
        'aria-controls': panelId,
        'aria-expanded': 'false',
        'aria-haspopup': 'menu'
      })
      .shortcut('›')
      .on('click', (event) => {
        event.preventDefault();
        if (!this.getBooleanState('disabled')) {
          this.toggle();
        }
      });
    this._menu = new VMenu().className('yoya-vsubmenu-content');
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('.yoya-vmenu-item');
      if (menuItem && !menuItem.disabled && !menuItem.classList.contains('yoya-vsubmenu-trigger')) {
        if (this._inline) {
          this._selectInlineItem(menuItem);
        } else {
          this.close();
        }
      }
    });
    this._panel = new HtmlElementNode('div')
      .id(panelId)
      .className('yoya-vsubmenu-panel')
      .child(this._menu);

    this.className(componentClass, 'yoya-vsubmenu');
    this.on('keydown', (event) => this._handleKeydown(event));
    this.child(this._trigger, this._panel);
    this._setupSubMenu(setup);
  }

  trigger(setup) {
    if (setup === undefined) {
      return this._trigger;
    }

    if (typeof setup === 'function') {
      setup(this._trigger);
    } else {
      this._trigger._setupMenuItem(setup);
    }
    return this;
  }

  label(content) {
    this._trigger.label(content);
    return this;
  }

  text(content) {
    return this.label(content);
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    return this;
  }

  inline(value = true) {
    this._inline = Boolean(value);
    this.attr('data-inline', this._inline ? 'true' : null);
    this._trigger.shortcut(this._inline ? (this.getBooleanState('open') ? '▾' : '▸') : '›');

    return this;
  }

  disabled(value = true) {
    const disabled = Boolean(value);
    this.setState('disabled', disabled);
    this.attr('data-disabled', disabled ? 'true' : null);
    this._trigger.disabled(disabled);
    if (disabled) {
      this.close();
    }
    return this;
  }

  open(value = true) {
    const open = Boolean(value) && !this.getBooleanState('disabled');
    this.setState('open', open);
    this.attr('data-open', open ? 'true' : null);
    this._trigger.attr('aria-expanded', open ? 'true' : 'false');
    if (this._inline) {
      this._trigger.shortcut(open ? '▾' : '▸');
    }
    if (open) {
      this._bindGlobalCloseHandlers();
    } else {
      this._closeDescendantSubMenus();
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

  _selectInlineItem(element) {
    const visit = (children) => {
      children.forEach((child) => {
        if (child instanceof VMenuItem) {
          child.active(child.renderDom() === element);
        } else if (typeof child.children === 'function') {
          visit(child.children());
        }
      });
    };

    visit(this._menu.children());
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  _menuOrientation(orientation) {
    this.attr('data-orientation', orientation);
    this._trigger._menuOrientation(orientation);
    return this;
  }

  _handleKeydown(event) {
    const owningSubMenu = event.target.closest?.('.yoya-vsubmenu');
    const trigger = event.target.closest?.('.yoya-vsubmenu-trigger');
    const enterKeys = ['ArrowRight', 'Enter', ' ', 'Spacebar'];
    const exitKey = event.key === 'ArrowLeft' || event.key === 'Escape';

    if (
      owningSubMenu === this._el &&
      trigger === this._trigger._el &&
      enterKeys.includes(event.key)
    ) {
      if (this.getBooleanState('disabled')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.open();
      const firstItem = this._menu._enabledMenuItems()[0];
      if (firstItem) {
        this._menu._syncTabStops(firstItem);
        firstItem.focus();
      }
      return;
    }

    if (
      owningSubMenu === this._el &&
      trigger === this._trigger._el &&
      exitKey &&
      this.getBooleanState('open')
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      this._trigger._el?.focus();
      return;
    }

    const exitsOwnedMenu =
      exitKey &&
      ((owningSubMenu === this._el && trigger !== this._trigger._el) ||
        (owningSubMenu !== this._el && this._menu._el?.contains(event.target)));
    if (exitsOwnedMenu) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      this._trigger._el?.focus();
    }
  }

  _closeDescendantSubMenus() {
    const visit = (node) => {
      node.children().forEach((child) => {
        if (child instanceof VSubMenu) {
          child.close();
        } else if (typeof child.children === 'function') {
          visit(child);
        }
      });
    };

    visit(this._menu);
  }

  _bindGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      return;
    }

    const unbinds = [];
    if (!this._inline) {
      const handlePointer = (event) => {
        if (!this._el?.contains(event.target)) {
          this.close();
        }
      };
      unbinds.push(bindDocumentEvent('click', handlePointer));
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };
    unbinds.push(bindDocumentEvent('keydown', handleKey));

    this._globalCloseCleanup = () => {
      unbinds.forEach((unbind) => unbind());
      this._globalCloseCleanup = null;
    };
  }

  _releaseGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      this._globalCloseCleanup();
    }
  }

  _setupSubMenu(setup) {
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
        inline,
        label,
        menu,
        menuContent,
        open,
        text,
        trigger,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      if (trigger !== undefined) this.trigger(trigger);
      else if (label !== undefined) this.label(label);
      else if (text !== undefined) this.text(text);

      if (inline !== undefined) this.inline(inline);
      const nestedSetup = menuContent ?? menu ?? content ?? children;
      if (nestedSetup !== undefined) this.menuContent(nestedSetup);
      if (disabled !== undefined) this.disabled(disabled);
      if (open !== undefined) this.open(open);
      return;
    }

    this.label(setup);
  }
}

function applyMenuOrientation(child, orientation) {
  if (
    child instanceof VMenuItem ||
    child instanceof VMenuDivider ||
    child instanceof VMenuGroup ||
    child instanceof VSubMenu
  ) {
    child._menuOrientation(orientation);
  }
}

export class VSidebar extends HtmlElementNode {
  constructor(setup = null) {
    super('aside', null);
    const menuId = allocateId('yoya-vsidebar-menu');
    this._responsiveCleanup = null;
    this._collapsible = true;
    this._titleBox = new HtmlElementNode('strong').className('yoya-vsidebar-title');
    this._toggle = new VButton('‹')
      .className('yoya-vsidebar-toggle')
      .attr({
        'aria-controls': menuId,
        'aria-expanded': 'true',
        'aria-label': '收起侧边导航'
      })
      .on('click', () => this.toggle());
    this._header = new HtmlElementNode('div')
      .className('yoya-vsidebar-header')
      .child(this._titleBox, this._toggle);
    this._menu = new VMenu()
      .id(menuId)
      .className('yoya-vsidebar-menu')
      .attr('aria-label', '侧边导航菜单');
    this._menu._sidebarContentChangeCallback = () =>
      setSidebarContentCollapsed(this._menu, this.getBooleanState('collapsed'), this);
    this._menu.on('yoya:menuitem-statechange', this._menu._sidebarContentChangeCallback);
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('.yoya-vmenu-item');
      if (menuItem && !menuItem.disabled && !menuItem.classList.contains('yoya-vsubmenu-trigger')) {
        this._activateMenuItem(menuItem);
      }
    });

    this.className(componentClass, 'yoya-vsidebar');
    this.attr('aria-label', '侧边导航');
    this.on('keydown', (event) => {
      if (
        !this._collapsible ||
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        this.getBooleanState('collapsed')
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.collapsed(true);
      this._toggle._el?.focus();
    });
    this.child(this._header, this._menu);
    this._setupSidebar(setup);
  }

  _activateMenuItem(element) {
    const visit = (children) => {
      children.forEach((child) => {
        if (child instanceof VMenuItem) {
          child.active(child.renderDom() === element);
        } else if (typeof child.children === 'function') {
          visit(child.children());
        }
      });
    };

    visit(this._menu.children());
  }

  title(content) {
    replaceChildren(this._titleBox, normalizeChildren(content));
    return this;
  }

  ariaLabel(content) {
    const label = resolveTextValue(content) || '侧边导航';
    this.attr('aria-label', label);
    this._menu.attr('aria-label', `${label}菜单`);
    return this;
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    setSidebarContentCollapsed(this._menu, this.getBooleanState('collapsed'), this);
    return this;
  }

  collapsed(value = true) {
    if (!this._collapsible && value) {
      return this;
    }

    const collapsed = Boolean(value);
    this.setState('collapsed', collapsed);
    this.attr('data-collapsed', collapsed ? 'true' : null);
    this._toggle
      .label(collapsed ? '›' : '‹')
      .attr('aria-expanded', collapsed ? 'false' : 'true')
      .attr('aria-label', collapsed ? '展开侧边导航' : '收起侧边导航');
    setSidebarContentCollapsed(this._menu, collapsed, this);
    setSidebarVisuallyHidden(this._titleBox, collapsed);
    return this;
  }

  collapsible(value = true) {
    this._collapsible = Boolean(value);
    this._toggle.style('display', this._collapsible ? null : 'none');
    return this;
  }

  toggle() {
    return this.collapsed(!this.getBooleanState('collapsed'));
  }

  responsive(query = '(max-width: 768px)') {
    this._releaseResponsiveListener();

    if (query === false) {
      this.attr({ 'data-responsive': null, 'data-responsive-query': null });
      return this;
    }

    const mediaQuery = typeof query === 'string' && query ? query : '(max-width: 768px)';
    this.attr({ 'data-responsive': 'true', 'data-responsive-query': mediaQuery });
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return this;
    }

    const media = window.matchMedia(mediaQuery);
    const handleChange = (event) => this.collapsed(event.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      this._responsiveCleanup = () => media.removeEventListener('change', handleChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handleChange);
      this._responsiveCleanup = () => media.removeListener(handleChange);
    }
    this.collapsed(media.matches);
    return this;
  }

  destroy() {
    this._releaseResponsiveListener();
    return super.destroy();
  }

  _releaseResponsiveListener() {
    if (this._responsiveCleanup) {
      this._responsiveCleanup();
      this._responsiveCleanup = null;
    }
  }

  _setupSidebar(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        ariaLabel,
        children,
        collapsible,
        content,
        menu,
        menuContent,
        title,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      if (title !== undefined) this.title(title);
      if (ariaLabel !== undefined) this.ariaLabel(ariaLabel);
      if (collapsible !== undefined) this.collapsible(collapsible);
      const navigation = menuContent ?? menu ?? content ?? children;
      if (navigation !== undefined) this.menuContent(navigation);
      return;
    }

    this.title(setup);
  }
}

function setSidebarContentCollapsed(root, collapsed, sidebar) {
  const contentChangeCallback = sidebar?._menu._sidebarContentChangeCallback;
  const visit = (node, { preserveShortcut = false } = {}) => {
    if ((node instanceof VMenu || node instanceof VMenuGroup) && contentChangeCallback) {
      node._sidebarContentChangeCallback = contentChangeCallback;
    }

    if (node instanceof VMenuItem) {
      setSidebarVisuallyHidden(node._labelBox, collapsed);
      setSidebarVisuallyHidden(node._shortcutBox, collapsed && !preserveShortcut);
      return;
    }

    if (node instanceof VSubMenu) {
      bindSidebarSubMenuExpansion(node, sidebar);
      if (collapsed) {
        const activeElement = node._panel._el?.ownerDocument.activeElement;
        if (activeElement && node._panel._el.contains(activeElement)) {
          node._trigger._el?.focus();
        }
        node.close();
      }
      visit(node._trigger, { preserveShortcut: true });
      visit(node._menu);
      return;
    }

    if (node instanceof VMenuGroup) {
      setSidebarVisuallyHidden(node._labelBox, collapsed);
    }

    if (typeof node.children === 'function') {
      node.children().forEach(visit);
    }
  };

  visit(root);
}

function bindSidebarSubMenuExpansion(submenu, sidebar) {
  if (!sidebar || submenu._sidebarExpandOwner === sidebar) {
    return;
  }

  submenu._sidebarExpandOwner = sidebar;
  const originalOpen = submenu.open.bind(submenu);
  submenu.open = (value) => {
    const result = originalOpen(value);
    if (value && !submenu.getBooleanState('disabled') && sidebar.getBooleanState('collapsed')) {
      sidebar.collapsed(false);
    }
    sidebar.style(
      'overflow',
      submenu.getBooleanState('open') && !submenu._inline ? 'visible' : 'hidden'
    );
    return result;
  };
  if (submenu.getBooleanState('open')) {
    sidebar.style('overflow', submenu._inline ? 'hidden' : 'visible');
  }
  submenu._trigger.on('keydown', (event) => {
    if (
      !submenu.getBooleanState('disabled') &&
      sidebar.getBooleanState('collapsed') &&
      ['ArrowRight', 'Enter', ' ', 'Spacebar'].includes(event.key)
    ) {
      sidebar.collapsed(false);
    }
  });
}

function setSidebarVisuallyHidden(node, hidden) {
  const hiddenStyles = {
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px'
  };

  if (hidden) {
    if (!node._sidebarVisibleStyles) {
      node._sidebarVisibleStyles = Object.fromEntries(
        Object.keys(hiddenStyles).map((name) => [name, node.style(name) ?? null])
      );
    }
    node.styles(hiddenStyles);
    return;
  }

  if (node._sidebarVisibleStyles) {
    node.styles(node._sidebarVisibleStyles);
    node._sidebarVisibleStyles = null;
  }
}

export function vMenu(first = null, second = null, third = null) {
  return createComponentFactory(VMenu, first, second, third);
}

export function vMenuItem(first = null, second = null, third = null) {
  return createComponentFactory(VMenuItem, first, second, third);
}

export function vMenuDivider(first = null, second = null, third = null) {
  return createComponentFactory(VMenuDivider, first, second, third);
}

export function vMenuGroup(first = null, second = null, third = null) {
  return createComponentFactory(VMenuGroup, first, second, third);
}

export function vSubMenu(first = null, second = null, third = null) {
  return createComponentFactory(VSubMenu, first, second, third);
}

export function vSidebar(first = null, second = null, third = null) {
  return createComponentFactory(VSidebar, first, second, third);
}
