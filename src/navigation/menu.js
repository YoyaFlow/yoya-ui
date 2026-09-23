import { div, HtmlElementNode } from '../html/index.js';
import { vButton } from '../actions/button.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { componentNameOf, viewRootOf } from '../core/node.js';
import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import {
  applyComponentSetup,
  createComponentShortcut,
  delegateChildFactories,
  delegateCommands,
  elementHasIdentity,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot
} from '../components/shared.js';

import { allocateId } from '../core/id.js';

/** 菜单族的子工厂名：容器组件把它们补到命令面上（`menu.vMenuItem(…)` 这类组件级 DSL 调用）。 */
const MENU_CHILD_FACTORIES = [
  'vMenu',
  'vMenuItem',
  'vMenuGroup',
  'vMenuDivider',
  'vSubMenu',
  'vSidebar'
];

/** 菜单内容归一：`null` / `undefined` / 空串 = 没有内容（空盒由 CSS 的 `:empty` 规则隐掉）。 */
const isEmptyMenuContent = (value) => value === null || value === undefined || value === '';

/**
 * 菜单容器的**节点类型**（不导出）：朝向落盘、tab 序维护、子节点加入时的朝向同步都在这里，
 * 公开组件 `vMenu` 是 vNode 外壳。族内 `VSubMenu` 的内容区也直接 `new` 它。
 */
export class MenuNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VMenu' });
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

    return Array.from(this._el.querySelectorAll('[vn~="VMenuItem"]')).filter(
      (item) => item.closest('[vn~="VMenu"]') === this._el
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
    if (event.target.closest?.('[vn~="VMenu"]') !== this._el) {
      return;
    }

    const orientation = this.attr('data-orientation') || 'vertical';
    const keyStep =
      orientation === 'vertical' ? { ArrowDown: 1, ArrowUp: -1 } : { ArrowLeft: -1, ArrowRight: 1 };
    const items = this._enabledMenuItems();
    const currentItem = event.target.closest?.('[vn~="VMenuItem"]');

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
    if (event.target.closest?.('[vn~="VMenu"]') !== this._el) {
      return;
    }

    const item = event.target.closest?.('[vn~="VMenuItem"]');
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

/**
 * 菜单项的**节点类型**（不导出）：元素级机制（三个槽位盒、hover、槽位替换、朝向）留在这里，
 * 公开组件 `vMenuItem` 是 vNode 外壳（身份 + 命令委托给它）。族内 `VSubMenu` 也直接 `new` 它，
 * 所以 DOM 形状只有这一份真源。
 */
export class MenuItemNode extends HtmlElementNode {
  constructor(setup = null) {
    super('button', { vn: 'VMenuItem' });
    // 内部状态用 ref 持有（票 01 约定）；active/danger/disabled 是「默认真」写方法，无参不是读
    this._active = ref(false);
    this._danger = ref(false);
    this._disabled = ref(false);
    this._iconBox = new HtmlElementNode('span', { vn: 'VMenuItemIcon' }).attr(
      'aria-hidden',
      'true'
    );
    this._labelBox = new HtmlElementNode('span', { vn: 'VMenuItemLabel' });
    this._shortcutBox = new HtmlElementNode('span', { vn: 'VMenuItemShortcut' }).attr(
      'aria-hidden',
      'true'
    );

    this.attr({ role: 'menuitem', type: 'button' });
    super.child(this._iconBox, this._labelBox, this._shortcutBox);
    this.on('mouseenter', () => this._setHover(true));
    this.on('mouseleave', () => this._setHover(false));
    this._setupMenuItem(setup);
  }

  /**
   * 匿名槽位：菜单项的内容位就是**标签盒**（与 `text()` 同一落点）。
   * `vMenuItem(i18n 文本节点)` 这类"节点参数"因此与字符串写法表现一致；
   * 三个槽位盒本身由构造函数用 `super.child()` 直接挂上。
   */
  child(...children) {
    this._labelBox.child(...children);
    return this;
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
    // 空内容 = 真清空（`.yoya.ui.css` 的 `:empty` 规则负责不占地方，R5 不再写行内 display）
    replaceChildren(this._iconBox, isEmptyMenuContent(content) ? [] : normalizeChildren(content));
    return this;
  }

  shortcut(content) {
    replaceChildren(
      this._shortcutBox,
      isEmptyMenuContent(content) ? [] : normalizeChildren(content)
    );
    return this;
  }

  active(value = true) {
    const enabled = Boolean(value);

    this._active.value = enabled;
    this.attr('data-active', enabled ? 'true' : null);
    this.attr('aria-current', enabled ? 'page' : null);
    return this;
  }

  danger(value = true) {
    const enabled = Boolean(value);

    this._danger.value = enabled;
    this.attr('data-danger', enabled ? 'true' : null);
    return this;
  }

  _setHover(hovered) {
    this.attr('data-hovered', hovered ? 'true' : null);
    return this;
  }

  disabled(value) {
    const enabled = Boolean(value);

    this._disabled.value = enabled;
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

/**
 * 分隔线（vNode 迁移样板）：`aria-orientation` 与父菜单朝向**相反**（竖菜单里的横线）。
 *
 * 朝向不进 `ref` 绑定：菜单在**挂载前**就把朝向写到每个子单元的视图根上，而"挂载前改 ref
 * 不会更新首帧"（绑定在构建期取值）——所以走 `applyMenuOrientation` 的直接属性写。
 */
export function vMenuDivider(setup = null) {
  return vNode(() =>
    div(
      {
        vn: 'VMenuDivider',
        role: 'separator',
        'data-orientation': 'vertical',
        'aria-orientation': 'horizontal'
      },
      (root) => {
        applyComponentSetup(root, setup);
      }
    )
  );
}

export const VMenuDivider = vMenuDivider;

/** 菜单分组的节点类型（不导出）；公开组件 `vMenuGroup` 是 vNode 外壳。 */
class MenuGroupNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VMenuGroup' });
    const labelId = allocateId('yoya-menu-group-label');
    this._orientation = 'vertical';
    this._labelBox = new HtmlElementNode('div', { vn: 'VMenuGroupLabel' }).id(labelId);

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

/** 子菜单的节点类型（不导出）；公开组件 `vSubMenu` 是 vNode 外壳。 */
class SubMenuNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VSubMenu' });
    const panelId = allocateId('yoya-submenu-panel');
    this._globalCloseCleanup = null;
    // 内部状态用 ref 持有（票 01 约定）；open/disabled 是「默认真」写方法，无参不是读
    this._open = ref(false);
    this._disabled = ref(false);
    // 触发器是"一个菜单项 + 子菜单的 trigger"：多值身份（票 15 §1），父菜单的键盘漫游
    // 靠 `[vn~="VMenuItem"]` 把它算进来，点击处理靠 `VSubMenuTrigger` 把它排除。
    this._trigger = new MenuItemNode({ vn: 'VSubMenuTrigger VMenuItem' })
      .attr({
        'aria-controls': panelId,
        'aria-expanded': 'false',
        'aria-haspopup': 'menu'
      })
      .shortcut('›')
      .on('click', (event) => {
        event.preventDefault();
        if (!this._disabled.value) {
          this.toggle();
        }
      });
    // 内容区既是子菜单的一部分（`VSubMenuContent`），也仍然是一个菜单（`VMenu`）：多值身份，
    // 于是键盘漫游 / `[vn~="VMenu"]` 的就近作用域判定照旧成立。
    this._menu = new MenuNode().setup({ vn: 'VSubMenuContent VMenu' });
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');
      if (menuItem && !menuItem.disabled && !elementHasIdentity(menuItem, 'VSubMenuTrigger')) {
        if (this._inline) {
          this._selectInlineItem(menuItem);
        } else {
          this.close();
        }
      }
    });
    this._panel = new HtmlElementNode('div')
      .id(panelId)
      .setup({ vn: 'VSubMenuPanel' })
      .child(this._menu);

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
    this._trigger.shortcut(this._inline ? (this._open.value ? '▾' : '▸') : '›');

    return this;
  }

  disabled(value = true) {
    const disabled = Boolean(value);
    this._disabled.value = disabled;
    this.attr('data-disabled', disabled ? 'true' : null);
    this._trigger.disabled(disabled);
    if (disabled) {
      this.close();
    }
    return this;
  }

  open(value = true) {
    const open = Boolean(value) && !this._disabled.value;
    this._open.value = open;
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
    return this.open(!this._open.value);
  }

  _selectInlineItem(element) {
    const visit = (children) => {
      children.forEach((child) => {
        if (viewRootOf(child) instanceof MenuItemNode) {
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
    const owningSubMenu = event.target.closest?.('[vn~="VSubMenu"]');
    const trigger = event.target.closest?.('[vn~="VSubMenuTrigger"]');
    const enterKeys = ['ArrowRight', 'Enter', ' ', 'Spacebar'];
    const exitKey = event.key === 'ArrowLeft' || event.key === 'Escape';

    if (
      owningSubMenu === this._el &&
      trigger === this._trigger._el &&
      enterKeys.includes(event.key)
    ) {
      if (this._disabled.value) {
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
      this._open.value
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
        // 子级可能是 vNode 组件（成员是 ComponentNode）：用身份判定并在视图根上调用
        const unit = viewRootOf(child) ?? child;
        if (unit instanceof SubMenuNode) {
          unit.close();
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

/**
 * 菜单单元的朝向契约：**父菜单把朝向写到子单元的视图根**。
 *
 * - 已迁移的 vNode 单元：根上带组件身份（`componentNameOf`），按表写属性——这些写发生在挂载前，
 *   必须落到根的属性快照（挂载前改 `ref` 不会进首帧，实测踩过）；
 * - 未迁移的类单元：仍走原来的 `_menuOrientation()`（迁移完成后这段可删）。
 */
const MENU_UNIT_ORIENTATION = {
  VMenuItem: (orientation) => ({ 'data-orientation': orientation }),
  // 分隔线：`aria-orientation` 与父菜单朝向相反（竖菜单里的横线）
  VMenuDivider: (orientation) => ({
    'data-orientation': orientation,
    'aria-orientation': orientation === 'horizontal' ? 'vertical' : 'horizontal'
  }),
  VMenuGroup: (orientation) => ({ 'data-orientation': orientation }),
  VSubMenu: (orientation) => ({ 'data-orientation': orientation })
};

function applyMenuOrientation(child, orientation) {
  // 组件成员先展开到视图根（节点类型），朝向的各类型口径都写在节点类型上：
  // 分组要往下继续传、分隔线要反过来写 aria-orientation、子菜单还要同步它的 trigger
  const unit = viewRootOf(child) ?? child;
  if (typeof unit?._menuOrientation === 'function') {
    unit._menuOrientation(orientation);
    return;
  }

  const attrs = MENU_UNIT_ORIENTATION[componentNameOf(child)]?.(orientation);
  if (attrs) {
    viewRootOf(child)?.attr(attrs);
  }
}

/** 侧栏的节点类型（不导出）；公开组件 `vSidebar` 是 vNode 外壳。 */
class SidebarNode extends HtmlElementNode {
  constructor(setup = null) {
    super('aside', { vn: 'VSidebar' });
    const menuId = allocateId('yoya-sidebar-menu');
    this._responsiveCleanup = null;
    this._collapsible = true;
    // 内部状态用 ref 持有（票 01 约定）；collapsed 是「默认真」写方法，无参不是读
    this._collapsed = ref(false);
    this._titleBox = new HtmlElementNode('strong', { vn: 'VSidebarTitle' });
    this._toggle = vButton('‹')
      .setup({ vn: 'VSidebarToggle VButton' })
      .attr({
        'aria-controls': menuId,
        'aria-expanded': 'true',
        'aria-label': '收起侧边导航'
      })
      .on('click', () => this.toggle());
    this._header = new HtmlElementNode('div')
      .setup({ vn: 'VSidebarHeader' })
      .child(this._titleBox, this._toggle);
    this._menu = new MenuNode()
      .id(menuId)
      .setup({ vn: 'VSidebarMenu VMenu' })
      .attr('aria-label', '侧边导航菜单');
    this._menu._sidebarContentChangeCallback = () =>
      setSidebarContentCollapsed(this._menu, this._collapsed.value, this);
    this._menu.on('yoya:menuitem-statechange', this._menu._sidebarContentChangeCallback);
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');
      if (menuItem && !menuItem.disabled && !elementHasIdentity(menuItem, 'VSubMenuTrigger')) {
        this._activateMenuItem(menuItem);
      }
    });

    this.attr('aria-label', '侧边导航');
    this.on('keydown', (event) => {
      if (
        !this._collapsible ||
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        this._collapsed.value
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.collapsed(true);
      this._toggle.focus?.();
    });
    this.child(this._header, this._menu);
    this._setupSidebar(setup);
  }

  _activateMenuItem(element) {
    const visit = (children) => {
      children.forEach((child) => {
        if (viewRootOf(child) instanceof MenuItemNode) {
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
    setSidebarContentCollapsed(this._menu, this._collapsed.value, this);
    return this;
  }

  collapsed(value = true) {
    if (!this._collapsible && value) {
      return this;
    }

    const collapsed = Boolean(value);
    this._collapsed.value = collapsed;
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
    // 折叠开关的显隐交给 CSS（`[data-collapsible='false']`），不再写行内 display
    this.attr('data-collapsible', this._collapsible ? null : 'false');
    return this;
  }

  toggle() {
    return this.collapsed(!this._collapsed.value);
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
    // 子单元可能是 vNode 组件（成员是 ComponentNode）：判定与取值都落到**视图根**（节点类型）上
    const unit = viewRootOf(node) ?? node;

    if ((unit instanceof MenuNode || unit instanceof MenuGroupNode) && contentChangeCallback) {
      unit._sidebarContentChangeCallback = contentChangeCallback;
    }

    if (unit instanceof MenuItemNode) {
      setSidebarVisuallyHidden(unit._labelBox, collapsed);
      setSidebarVisuallyHidden(unit._shortcutBox, collapsed && !preserveShortcut);
      return;
    }

    if (unit instanceof SubMenuNode) {
      bindSidebarSubMenuExpansion(unit, sidebar);
      if (collapsed) {
        const activeElement = unit._panel._el?.ownerDocument.activeElement;
        if (activeElement && unit._panel._el.contains(activeElement)) {
          unit._trigger._el?.focus();
        }
        unit.close();
      }
      visit(unit._trigger, { preserveShortcut: true });
      visit(unit._menu);
      return;
    }

    if (unit instanceof MenuGroupNode) {
      setSidebarVisuallyHidden(unit._labelBox, collapsed);
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
    if (value && !submenu._disabled.value && sidebar._collapsed.value) {
      sidebar.collapsed(false);
    }
    sidebar.attr('data-overflow', submenu._open.value && !submenu._inline ? 'visible' : 'hidden');
    return result;
  };
  if (submenu._open.value) {
    sidebar.attr('data-overflow', submenu._inline ? 'hidden' : 'visible');
  }
  submenu._trigger.on('keydown', (event) => {
    if (
      !submenu._disabled.value &&
      sidebar._collapsed.value &&
      ['ArrowRight', 'Enter', ' ', 'Spacebar'].includes(event.key)
    ) {
      sidebar.collapsed(false);
    }
  });
}

/**
 * 折叠态里把菜单文字 / 快捷键**视觉隐藏**（可访问性保留）：只写一个状态位，
 * 具体样式在 `yoya.ui.css` 的 `[data-sidebar-hidden='true']` 规则里（R5，不再存 / 还原行内样式）。
 */
function setSidebarVisuallyHidden(node, hidden) {
  node.attr('data-sidebar-hidden', hidden ? 'true' : null);
}

/**
 * 定义：**结构（视图根 + 身份）+ 命令**，调用方参数由快捷方法按标准分派落到这里（票 15 §4）。
 *
 * 三种 setup 入口：函数 = 构建回调（收到组件节点，可继续 `menu.vMenuItem(…)`）；
 * 对象 / 字符串 = 菜单 props（`MenuNode._setupMenu` 的既有口径）；节点 / 数组 = 子内容。
 * 同类实例复用（`vMenu(已有菜单)`）由 `createComponentShortcut` 判定。
 */
export function VMenu() {
  return vNode((api) => {
    const element = new MenuNode();
    delegateCommands(api, element, ['orientation', 'horizontal', 'vertical']);
    delegateChildFactories(api, element, MENU_CHILD_FACTORIES);
    api.setupObject = (config) => {
      element._setupMenu(config);
      return api;
    };
    api.setupString = (value) => {
      element._setupMenu(value);
      return api;
    };
    return element;
  });
}

export const vMenu = createComponentShortcut(VMenu);

export function VMenuItem() {
  return vNode((api) => {
    const element = new MenuItemNode();
    delegateCommands(api, element, [
      'text',
      'label',
      'content',
      'icon',
      'shortcut',
      'active',
      'danger',
      'disabled',
      'hoverable'
    ]);
    api.setupObject = (config) => {
      element._setupMenuItem(config);
      return api;
    };
    api.setupString = (value) => {
      element._setupMenuItem(value);
      return api;
    };
    return element;
  });
}

export const vMenuItem = createComponentShortcut(VMenuItem);

export function VMenuGroup() {
  return vNode((api) => {
    const element = new MenuGroupNode();
    delegateCommands(api, element, ['label', 'title']);
    delegateChildFactories(api, element, MENU_CHILD_FACTORIES);
    api.setupObject = (config) => {
      element._setupMenuGroup(config);
      return api;
    };
    api.setupString = (value) => {
      element._setupMenuGroup(value);
      return api;
    };
    return element;
  });
}

export const vMenuGroup = createComponentShortcut(VMenuGroup);

export function VSubMenu() {
  return vNode((api) => {
    const element = new SubMenuNode();
    delegateCommands(api, element, [
      'trigger',
      'label',
      'text',
      'menuContent',
      'inline',
      'disabled',
      'open',
      'close',
      'toggle'
    ]);
    delegateChildFactories(api, element, MENU_CHILD_FACTORIES);
    api.setupObject = (config) => {
      element._setupSubMenu(config);
      return api;
    };
    api.setupString = (value) => {
      element._setupSubMenu(value);
      return api;
    };
    return element;
  });
}

export const vSubMenu = createComponentShortcut(VSubMenu);

export function VSidebar() {
  return vNode((api) => {
    const element = new SidebarNode();
    delegateCommands(api, element, [
      'title',
      'ariaLabel',
      'menuContent',
      'collapsed',
      'collapsible',
      'toggle',
      'responsive'
    ]);
    delegateChildFactories(api, element, MENU_CHILD_FACTORIES);
    api.setupObject = (config) => {
      element._setupSidebar(config);
      return api;
    };
    api.setupString = (value) => {
      element._setupSidebar(value);
      return api;
    };
    return element;
  });
}

export const vSidebar = createComponentShortcut(VSidebar);
