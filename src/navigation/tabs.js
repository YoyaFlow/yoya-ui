import { ViewNode } from '../core/node.js';
import { allocateNumber } from '../core/id.js';
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

export class VTab extends ViewNode {
  constructor(setup = null) {
    super(null);
    this._active = false;
    this._disabled = false;
    this._index = 0;
    this._key = null;
    this._parent = null;

    const sequence = allocateNumber();
    this._tabId = `yoya-vtab-trigger-${sequence}`;
    this._panelId = `yoya-vtab-panel-${sequence}`;
    this._iconBox = new HtmlElementNode('span')
      .className('yoya-vtab-icon')
      .attr('aria-hidden', 'true')
      .style('display', 'none');
    this._labelBox = new HtmlElementNode('span').className('yoya-vtab-label');
    this._trigger = new HtmlElementNode('button')
      .className(componentClass, 'yoya-vtab-trigger')
      .attr({
        'aria-controls': this._panelId,
        id: this._tabId,
        role: 'tab',
        tabindex: '-1',
        type: 'button'
      });
    this._trigger.child(this._iconBox, this._labelBox);
    this._panel = new HtmlElementNode('section').className('yoya-vtab-panel').attr({
      'aria-labelledby': this._tabId,
      hidden: true,
      id: this._panelId,
      role: 'tabpanel',
      tabindex: '-1'
    });

    this._setupTab(setup);
    this._syncTab();
  }

  key(value) {
    if (value === undefined) {
      return this._key;
    }

    this._key = value === null || value === undefined ? null : String(resolveTextValue(value));
    return this;
  }

  value(value) {
    return this.key(value);
  }

  label(content) {
    if (content === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(content));
    return this;
  }

  text(content) {
    return this.label(content);
  }

  title(content) {
    return this.label(content);
  }

  icon(content) {
    replaceChildren(this._iconBox, normalizeChildren(content));
    this._iconBox.style(
      'display',
      content === null || content === undefined || content === '' ? 'none' : null
    );
    return this;
  }

  content(setup) {
    setupContentSlot(this._panel, setup);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this._disabled;
    }

    this._disabled = Boolean(value);
    this._trigger.attr({
      'aria-disabled': this._disabled ? 'true' : null,
      disabled: this._disabled ? true : null
    });
    this._syncTab();
    return this;
  }

  active(value) {
    if (value === undefined) {
      return this._active;
    }

    this._active = Boolean(value);
    this._syncTab();
    return this;
  }

  textContent() {
    return this._trigger.textContent();
  }

  destroy() {
    this._trigger.destroy();
    this._panel.destroy();
    return super.destroy();
  }

  _setupTab(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup)) {
      if (setup.length > 0) {
        this.label(setup[0]);
      }
      if (setup.length > 1) {
        this.content(setup[1]);
      }
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        content,
        disabled,
        icon,
        key,
        label,
        text,
        title,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this._trigger.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.label(text);
      } else if (title !== undefined) {
        this.label(title);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (children !== undefined) {
        this.content(children);
      }

      if (icon !== undefined) {
        this.icon(icon);
      }

      if (key !== undefined) {
        this.key(key);
      } else if (value !== undefined) {
        this.key(value);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      return;
    }

    this.label(setup);
  }

  _syncTab() {
    const active = this._active && !this._disabled;

    this._trigger.attr({
      'aria-selected': active ? 'true' : 'false',
      'data-active': active ? 'true' : null,
      tabindex: active ? '0' : '-1'
    });
    this._panel.attr({
      'data-active': active ? 'true' : null,
      hidden: active ? null : true,
      tabindex: active ? '0' : '-1'
    });
    return this;
  }
}

export class VTabs extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._tabs = [];
    this._activeIndex = 0;
    this._orientation = 'horizontal';
    this._variant = 'line';
    this._size = 'default';
    this._changeHandler = null;

    this._nav = new HtmlElementNode('div').className('yoya-vtabs-nav').attr({
      'aria-label': '标签页',
      'aria-orientation': 'horizontal',
      role: 'tablist'
    });
    this._panels = new HtmlElementNode('div').className('yoya-vtabs-panels');

    this.className(componentClass, 'yoya-vtabs');
    this.attr({
      'data-active-index': '0',
      'data-orientation': 'horizontal',
      'data-size': 'default',
      'data-variant': 'line'
    });
    this._nav.on('click', (event) => this._handleNavClick(event));
    this._nav.on('keydown', (event) => this._handleKeydown(event));
    HtmlElementNode.prototype.child.call(this, this._nav, this._panels);

    this._setupTabs(setup);
    this._syncTabs();
  }

  children() {
    return [...this._tabs];
  }

  items(value) {
    if (value === undefined) {
      return this.children();
    }

    replaceChildren(this._nav, []);
    replaceChildren(this._panels, []);
    this._tabs = [];

    if (Array.isArray(value)) {
      value.forEach((item) => this.child(normalizeTabItem(item)));
    }

    this._syncTabs();
    return this;
  }

  child(...children) {
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }

      if (child instanceof VTab) {
        if (!this._tabs.includes(child)) {
          this._tabs.push(child);
          child._parent = this;
          this._nav.child(child._trigger);
          this._panels.child(child._panel);
        }
        return;
      }

      super.child(child);
    });

    this._syncTabs();
    return this;
  }

  active(value) {
    if (value === undefined) {
      const tab = this._tabs[this._activeIndex];
      return tab ? (tab.key() ?? this._activeIndex) : null;
    }

    this._selectIndex(this._resolveIndex(value), false);
    return this;
  }

  activeIndex(value) {
    if (value === undefined) {
      return this._activeIndex;
    }

    this._selectIndex(value, false);
    return this;
  }

  ariaLabel(content) {
    if (content === undefined) {
      return this._nav.attr('aria-label');
    }

    this._nav.attr('aria-label', resolveTextValue(content) || '标签页');
    return this;
  }

  orientation(value) {
    if (value === undefined) {
      return this._orientation;
    }

    this._orientation = value === 'vertical' ? 'vertical' : 'horizontal';
    this.attr('data-orientation', this._orientation);
    this._nav.attr('aria-orientation', this._orientation);
    return this;
  }

  variant(value) {
    if (value === undefined) {
      return this._variant;
    }

    this._variant = ['card', 'line', 'pills'].includes(value) ? value : 'line';
    this.attr('data-variant', this._variant);
    return this;
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = ['default', 'large', 'small'].includes(value) ? value : 'default';
    this.attr('data-size', this._size);
    return this;
  }

  change(handler) {
    if (handler === undefined) {
      return this._changeHandler;
    }

    this._changeHandler = typeof handler === 'function' ? handler : null;
    return this;
  }

  onChange(handler) {
    return this.change(handler);
  }

  next() {
    const index = this._nextEnabledIndex(1);
    if (index >= 0) {
      this._selectIndex(index, true);
    }
    return this;
  }

  prev() {
    const index = this._nextEnabledIndex(-1);
    if (index >= 0) {
      this._selectIndex(index, true);
    }
    return this;
  }

  renderDom() {
    const element = super.renderDom();
    this._syncTabs();
    return element;
  }

  _setupTabs(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (setup instanceof VTab) {
      this.child(setup);
      return;
    }

    if (Array.isArray(setup)) {
      this.items(setup);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        active,
        ariaLabel,
        change,
        children,
        items,
        onChange,
        onTabChange,
        orientation,
        size,
        variant,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (ariaLabel !== undefined) {
        this.ariaLabel(ariaLabel);
      }

      if (orientation !== undefined) {
        this.orientation(orientation);
      }

      if (variant !== undefined) {
        this.variant(variant);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (typeof change === 'function') {
        this.change(change);
      } else if (typeof onChange === 'function') {
        this.change(onChange);
      } else if (typeof onTabChange === 'function') {
        this.change(onTabChange);
      }

      if (items !== undefined) {
        this.items(items);
      } else if (children !== undefined) {
        this.items(children);
      }

      if (active !== undefined) {
        this.active(active);
      }

      return;
    }

    this.items([setup]);
  }

  _syncTabs() {
    const tabs = this._tabs;

    if (tabs.length > 0 && tabs[this._activeIndex]?.disabled()) {
      const firstEnabled = tabs.findIndex((tab) => !tab.disabled());
      if (firstEnabled >= 0) {
        this._activeIndex = firstEnabled;
      }
    }

    const activeTab = tabs[this._activeIndex];
    this.attr('data-active-index', String(this._activeIndex));
    this.attr('data-tab-count', String(tabs.length));
    this.attr('data-active-key', activeTab?.key() != null ? String(activeTab.key()) : null);

    tabs.forEach((tab, index) => {
      tab._parent = this;
      tab._index = index;
      tab.active(index === this._activeIndex && !tab.disabled());
    });
    return this;
  }

  _selectTab(tab) {
    const index = this._tabs.indexOf(tab);

    if (index < 0 || tab.disabled()) {
      return this;
    }

    return this._selectIndex(index, true);
  }

  _selectIndex(index, emit = true) {
    const tabs = this._tabs;

    if (tabs.length === 0) {
      this._activeIndex = 0;
      this._syncTabs();
      return this;
    }

    let selectedIndex = this._clampIndex(index);
    if (tabs[selectedIndex]?.disabled()) {
      const firstEnabled = tabs.findIndex((tab) => !tab.disabled());
      selectedIndex = firstEnabled >= 0 ? firstEnabled : this._activeIndex;
    }
    const changed = selectedIndex !== this._activeIndex;

    this._activeIndex = selectedIndex >= 0 ? selectedIndex : this._activeIndex;
    this._syncTabs();

    if (emit && changed && typeof this._changeHandler === 'function') {
      const activeTab = tabs[this._activeIndex];
      this._changeHandler({
        active: activeTab.key() ?? this._activeIndex,
        index: this._activeIndex,
        item: activeTab,
        key: activeTab.key()
      });
    }

    return this;
  }

  _resolveIndex(value) {
    const tabs = this._tabs;

    if (typeof value === 'number') {
      return this._clampIndex(value);
    }

    const text = resolveTextValue(value);
    const keyIndex = tabs.findIndex((tab) => String(tab.key()) === String(text));

    if (keyIndex >= 0) {
      return keyIndex;
    }

    const numeric = Number(text);
    return this._clampIndex(Number.isFinite(numeric) ? numeric : 0);
  }

  _clampIndex(value) {
    if (!Number.isFinite(Number(value))) {
      return 0;
    }

    const index = Math.max(0, Math.floor(Number(value)));
    return this._tabs.length === 0 ? 0 : Math.min(index, this._tabs.length - 1);
  }

  _handleNavClick(event) {
    const trigger = event.target.closest?.('.yoya-vtab-trigger');

    if (!trigger || trigger.closest('.yoya-vtabs-nav') !== this._nav._el) {
      return;
    }

    const tab = this._tabs.find((entry) => entry._trigger._el === trigger);
    if (tab && !tab.disabled()) {
      this._selectTab(tab);
    }
  }

  _handleKeydown(event) {
    const trigger = event.target.closest?.('.yoya-vtab-trigger');

    if (!trigger || trigger.closest('.yoya-vtabs-nav') !== this._nav._el) {
      return;
    }

    const currentIndex = this._tabs.findIndex((tab) => tab._trigger._el === trigger);
    if (currentIndex < 0) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._selectTab(this._tabs[currentIndex]);
      return;
    }

    const keyStep =
      this._orientation === 'vertical'
        ? { ArrowDown: 1, ArrowUp: -1 }
        : { ArrowLeft: -1, ArrowRight: 1 };
    const enabledTabs = this._enabledTabs();

    if (
      enabledTabs.length === 0 ||
      (!keyStep[event.key] && event.key !== 'Home' && event.key !== 'End')
    ) {
      return;
    }

    event.preventDefault();

    let nextIndex;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabledTabs.length - 1;
    } else {
      const currentEnabledIndex = Math.max(0, enabledTabs.indexOf(this._tabs[currentIndex]));
      nextIndex =
        (currentEnabledIndex + keyStep[event.key] + enabledTabs.length) % enabledTabs.length;
    }

    const nextTab = enabledTabs[nextIndex];
    if (!nextTab) {
      return;
    }

    const nextTabIndex = this._tabs.indexOf(nextTab);
    this._selectIndex(nextTabIndex, true);
    nextTab._trigger._el?.focus();
  }

  _enabledTabs() {
    return this._tabs.filter((tab) => !tab.disabled());
  }

  _nextEnabledIndex(direction) {
    const enabled = this._enabledTabs();

    if (enabled.length === 0) {
      return -1;
    }

    const currentIndex = Math.max(0, enabled.indexOf(this._tabs[this._activeIndex]));
    return this._tabs.indexOf(
      enabled[(currentIndex + direction + enabled.length) % enabled.length]
    );
  }
}

export function vTabs(first = null, second = null, third = null) {
  return createComponentFactory(VTabs, first, second, third);
}

export function vTab(first = null, second = null, third = null) {
  return createComponentFactory(VTab, first, second, third);
}

function normalizeTabItem(item) {
  if (item instanceof VTab) {
    return item;
  }

  return vTab(item);
}
