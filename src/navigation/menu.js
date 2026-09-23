import { button, div, HtmlElementNode, span } from '../html/index.js';
import { vButton } from '../actions/button.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { componentNameOf, hasComponentIdentity, viewRootOf } from '../core/node.js';
import { computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import {
  applyComponentSetup,
  createComponentShortcut,
  delegateChildFactories,
  delegateCommands,
  delegateNodeCommands,
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

  /**
   * 可聚焦的菜单项（跳过禁用项）：菜单族的**公开命令**——`vDropdownMenu` 用它做打开后的首个 / 末个聚焦，
   * 不再从外部读私有方法（票 16 第 27 条：跨模块只走命令）。
   */
  enabledItems() {
    if (!this._el) {
      return [];
    }

    return this._menuItems().filter((item) => !item.disabled);
  }

  /**
   * **行通道**（结构性收口，票 16 第 110 条的 ②+③）：把菜单的根本身交给数据层，
   * 让 `vMenuWrapper` 这类数据驱动外壳能在它上面 `keyed(…)` 对账——与 `VTable` 的段命令同一角色：
   * 数据层只认这条命令，不碰私有字段、也不自己解包视图根（票 16 第 27 条）。
   */
  items(builder) {
    if (typeof builder === 'function') {
      builder(this);
    }

    return this;
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
    const items = this.enabledItems();
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
 * 菜单项（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * - **一个组件函数 = 一个边界**（R1）：`MenuItemNode` 那层节点类型退场，状态与命令都在闭包里，
 *   视图由最后那个 `return` 一次写清（R2）；三个槽位盒（图标 / 标签 / 快捷键）常驻（R11 / R12：
 *   位置归组件自己，调用方不按名投递）；
 * - **匿名内容位 = 标签盒**：标签盒上写 `vn_slot: ''`（默认占位），调用方**未标记**的 `child(…)`
 *   就落进它——与迁移前 `child()` 覆盖是**同一条落位路径**（票 16 第 7 条；面包屑的 `<ol>` 同款写法）；
 * - 状态（`active` / `danger` / `disabled` / `hovered` / `hoverable`）都是读值绑定（R4 / R6），
 *   命令只写状态；标签 / 图标 / 快捷键是**运行期可替换的内容位**，留取用器（16 号第 103 条）；
 * - 朝向由父菜单写进来（族内协议：`applyMenuOrientation` 走身份表、子菜单走 `menuOrientation(…)`
 *   命令——这一条与 roving tabindex 一样，等菜单容器一起收口时再改成"容器态句柄下推"）；
 * - 元素级命令代委托（`attr` / `style` / `on` …）：族内（子菜单触发器、侧栏）就是按这套与项打交道的。
 */
export function VMenuItem() {
  const activeState = ref(false);
  const dangerState = ref(false);
  const disabledState = ref(false);
  const hoverState = ref(false);
  const hoverableState = ref(false);
  /** 容器给的 roving tab 停点（`null` = 还没被容器收进漫游，不写 `tabindex`）。 */
  const tabIndexState = ref(null);

  let iconBox = null;
  let labelBox = null;
  let shortcutBox = null;
  let view = null;

  return vNode((api) => {
    /** 空内容 = 真清空（`:empty` 规则负责不占地方，R5 不写行内 display）。 */
    const fillBox = (box, content) => {
      replaceChildren(box, isEmptyMenuContent(content) ? [] : normalizeChildren(content));
    };

    api.text = (content) => {
      replaceChildren(labelBox, normalizeChildren(content));
      return api;
    };
    api.label = (content) => api.text(content);
    api.content = (content) => api.text(content);
    api.icon = (content) => {
      fillBox(iconBox, content);
      return api;
    };
    api.shortcut = (content) => {
      fillBox(shortcutBox, content);
      return api;
    };

    api.active = (value = true) => {
      activeState.value = Boolean(value);
      return api;
    };

    api.danger = (value = true) => {
      dangerState.value = Boolean(value);
      return api;
    };

    /** 禁用：写方法（与迁移前同口径——`Boolean(value)`，所以 `disabled()` 是"启用"）；无参读当前值。 */
    api.disabled = (value) => {
      if (value === undefined) {
        return disabledState.value;
      }

      disabledState.value = Boolean(value);

      // 菜单的 roving tabindex 靠这条 DOM 事件重算（菜单容器那一刀会换成容器态下推）
      if (view?._el) {
        const EventClass = view._el.ownerDocument?.defaultView?.Event ?? Event;
        view._el.dispatchEvent(new EventClass('yoya:menuitem-statechange', { bubbles: true }));
      }

      return api;
    };

    api.hoverable = (value = true) => {
      hoverableState.value = Boolean(value);
      return api;
    };

    /** 容器态：当前 tab 停点（容器推给单元，单元自己派生 `tabindex`）。 */
    api.tabStop = (value = true) => {
      tabIndexState.value = Boolean(value);
      return api;
    };

    /** 把焦点交给项：容器漫游 / 下拉菜单都用它，不再从外面碰元素。 */
    api.focus = () => {
      // 引擎的元素级操作 API（组件代码里不碰 `_el` / `renderDom()`，见票 16 第 114 条）
      view.focus();
      return api;
    };

    /** 侧栏折叠态：标签 / 快捷键位标记成"视觉隐藏"（照旧走 `data-sidebar-hidden`，显隐归 CSS）。 */
    api.sidebarHidden = (hidden, { preserveShortcut = false } = {}) => {
      labelBox?.attr('data-sidebar-hidden', hidden ? 'true' : null);
      shortcutBox?.attr('data-sidebar-hidden', hidden && !preserveShortcut ? 'true' : null);
      return api;
    };

    // 调用方参数（对象 / 字符串）走标准分派：与迁移前 `_setupMenuItem` 的落位口径一致
    api.setupObject = (config) => applyMenuItemProps(api, view, config);
    api.setupString = (value) => applyMenuItemProps(api, view, value);

    // 结构（R2）：整棵树写在 return 里；状态类属性是读值绑定（R4 / R6）
    view = button(
      {
        attrs: {
          'aria-current': computed(() => (activeState.value ? 'page' : null)),
          'aria-disabled': computed(() => (disabledState.value ? 'true' : null)),
          disabled: computed(() => (disabledState.value ? true : null)),
          role: 'menuitem',
          type: 'button'
        },
        'data-active': computed(() => (activeState.value ? 'true' : null)),
        'data-danger': computed(() => (dangerState.value ? 'true' : null)),
        'data-hoverable': computed(() => (hoverableState.value ? 'true' : null)),
        'data-hovered': computed(() => (hoverState.value ? 'true' : null)),
        tabindex: computed(() =>
          tabIndexState.value === null ? null : tabIndexState.value ? 0 : -1
        ),
        vn: 'VMenuItem'
      },
      (root) => {
        root.on('mouseenter', () => {
          hoverState.value = true;
        });
        root.on('mouseleave', () => {
          hoverState.value = false;
        });

        root.child(
          span({ attrs: { 'aria-hidden': 'true' }, vn: 'VMenuItemIcon' }, (box) => {
            iconBox = box;
          }),
          // 匿名占位：未标记的内容（`vMenuItem(vText(...))` / `item.child(node)`）落进标签盒
          span({ vn: 'VMenuItemLabel', vn_slot: '' }, (box) => {
            labelBox = box;
          }),
          span({ attrs: { 'aria-hidden': 'true' }, vn: 'VMenuItemShortcut' }, (box) => {
            shortcutBox = box;
          })
        );
      }
    );

    // 元素级命令代委托（族内按 `attr(…)` / `on(…)` 与项对话）
    delegateNodeCommands(api, view);

    return view;
  });
}

/** 菜单项的 props 落位（迁移前 `_setupMenuItem` 的等价物）：文案 → 图标 → 快捷键 → 状态。 */
function applyMenuItemProps(api, view, setup) {
  if (setup === null || setup === undefined) {
    return api;
  }

  if (typeof setup === 'function') {
    setup(api);
    return api;
  }

  if (!isPlainObject(setup)) {
    api.text(setup);
    return api;
  }

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
    view.setup(elementConfig);
  }

  if (label !== undefined) {
    api.label(label);
  } else if (text !== undefined) {
    api.text(text);
  } else if (content !== undefined) {
    api.content(content);
  } else if (children !== undefined) {
    api.text(children);
  }

  if (icon !== undefined) {
    api.icon(icon);
  }
  if (shortcut !== undefined) {
    api.shortcut(shortcut);
  }
  if (active !== undefined) {
    api.active(active);
  }
  if (danger !== undefined) {
    api.danger(danger);
  }
  if (disabled !== undefined) {
    api.disabled(disabled);
  }

  return api;
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

/**
 * 菜单分组（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * `MenuGroupNode` 那层节点类型退场（组件不继承基础元素）：分组就是"带标签的一段单元"——
 * 标签盒常驻（运行期可替换 → 取用器），子单元是**普通匿名内容**（`child(…)` 落进分组根，
 * 与迁移前 `super.child(…)` 同一条落位路径）。
 *
 * 两处口径变化（见 16 号第 112 条）：
 * - **朝向**：② 之后朝向样式按菜单作用域写（`[vn~='VMenu'][data-orientation=…] …`），
 *   分组不再往下推 `data-orientation`；分组自己的属性位由菜单经身份表写（它自己还要用）。
 * - **"子节点加入"时机**：迁移前的 `child()` 覆盖会在加入时通知侧栏重排、重算 tab 序；
 *   闭包组件没有这个时机（vNode 的 `api` 不允许定义 `child`）——侧栏折叠态对"后加内容"要等
 *   下一次 `setSidebarContentCollapsed` 走查（新建分组时本来就会走一遍）。
 */
export function VMenuGroup() {
  const labelId = allocateId('yoya-menu-group-label');
  let labelBox = null;
  let view = null;

  return vNode((api) => {
    api.label = (content) => {
      replaceChildren(labelBox, normalizeChildren(content));
      return api;
    };

    api.title = (content) => api.label(content);

    /** 侧栏折叠态：标签位标记成"视觉隐藏"（`data-sidebar-hidden`，显隐归 CSS）。 */
    api.sidebarHidden = (hidden) => {
      labelBox?.attr('data-sidebar-hidden', hidden ? 'true' : null);
      return api;
    };

    // 调用方参数：对象 = 标签 / 子单元 / 元素配置；字符串 = 标签（迁移前 `_setupMenuGroup` 同口径）
    api.setupObject = (config) => {
      if (config === null || config === undefined) {
        return api;
      }

      const { children, label, title, ...elementConfig } = config;

      if (Object.keys(elementConfig).length > 0) {
        view.setup(elementConfig);
      }
      if (label !== undefined) {
        api.label(label);
      } else if (title !== undefined) {
        api.title(title);
      }
      if (children !== undefined) {
        view.child(children);
      }

      return api;
    };

    api.setupString = (value) => api.label(value);

    /**
     * **细粒度结构命令**（同 `VTable` 的段命令）：往分组里投递一个单元，并在**加入时**通知菜单
     * 重算 roving tabindex——迁移前这一步在节点类型的 `child()` 覆盖里，闭包组件没有那个时机，
     * 所以把命令收在自己身上（`_el` 只读判定 + DOM 事件，与菜单项 `disabled()` 的通知同口径）。
     */
    const appendUnit = (unit) => {
      view.child(unit);

      if (view._el) {
        const EventClass = view._el.ownerDocument?.defaultView?.Event ?? Event;
        view._el.dispatchEvent(new EventClass('yoya:menuitem-statechange', { bubbles: true }));
      }

      return unit;
    };

    api.vMenuItem = (setup) => appendUnit(vMenuItem(setup));
    api.vMenuGroup = (setup) => appendUnit(vMenuGroup(setup));
    api.vSubMenu = (setup) => appendUnit(vSubMenu(setup));
    api.vMenuDivider = (setup) => appendUnit(vMenuDivider(setup));

    // 结构（R2）：标签盒常驻，子单元按普通匿名内容往下排
    view = div(
      { attrs: { 'aria-labelledby': labelId, role: 'group' }, vn: 'VMenuGroup' },
      (root) => {
        root.child(
          div({ id: labelId, vn: 'VMenuGroupLabel' }, (box) => {
            labelBox = box;
          })
        );
      }
    );

    return view;
  });
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
    this._trigger = applyComponentSetup(VMenuItem(), { vn: 'VSubMenuTrigger VMenuItem' })
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
        if (hasComponentIdentity(child, 'VMenuItem')) {
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
      const firstItem = this._menu.enabledItems()[0];
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
 * 菜单单元的朝向契约：**朝向归菜单本身，样式按菜单作用域写**（②）。
 *
 * `yoya.ui.css` 里的朝向规则一律从 `[vn~='VMenu'][data-orientation='…']` 起头（如
 * `[vn~='VMenu'][data-orientation='horizontal'] [vn~='VMenuItem']`），所以**菜单项不再持有
 * `data-orientation`**——这条推写路径整条去掉（`MenuItemNode` 那一刀之后项是闭包，本来就只认 CSS）。
 *
 * 仍需要写属性的是"自身也要带朝向位"的单元：分隔线要把 `aria-orientation` 反过来写（竖菜单里的横线）、
 * 分组与子菜单要带自己的 `data-orientation`（它们要么继续往下传、要么自己还要用）。
 */
const MENU_UNIT_ORIENTATION = {
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
        if (hasComponentIdentity(child, 'VMenuItem')) {
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

    if (
      (unit instanceof MenuNode || hasComponentIdentity(node, 'VMenuGroup')) &&
      contentChangeCallback
    ) {
      unit._sidebarContentChangeCallback = contentChangeCallback;
    }

    if (hasComponentIdentity(node, 'VMenuItem')) {
      // 菜单项是闭包组件了：标记落到它自己的槽位盒上（同一个 `data-sidebar-hidden` 口径）
      node.sidebarHidden(collapsed, { preserveShortcut });
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

    if (hasComponentIdentity(node, 'VMenuGroup')) {
      // 分组是闭包组件了：视觉隐藏标记落在它自己的标签位上（同一个 `data-sidebar-hidden` 口径）
      node.sidebarHidden(collapsed);
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
    // 结构层命令：朝向 + **行通道**（数据驱动外壳在 `items(builder)` 里对账自己的行）
    delegateCommands(api, element, ['orientation', 'horizontal', 'vertical', 'items']);
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

export const vMenuItem = createComponentShortcut(VMenuItem);

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

/**
 * **数据驱动的菜单外壳**（票 16 第 110 条 ②+③，位置同 `VTableWrapper`）。
 *
 * 分工与表格族一致：**结构层**（`MenuNode` 那一层：roving tabindex / 键盘漫游 / 子工厂）只做结构，
 * 数据这一层在这里——
 *
 * - `items` 是纯数据（字符串 / 数字 = 标签；对象认 `key` / `id` / `label` / `text` / `icon` /
 *   `shortcut` / `danger` / `disabled`），通过结构层的 `items(builder)` 交出的**行通道**走 `keyed` 对账：
 *   改一条只动那一行，顺序由数据定（行键镜像成 `data-row-key`，与 `VTableWrapper` 同口径）；
 * - `active` 是**项的键**（不填则点谁亮谁）；点击回 `onSelect(key, entry, index)`；
 * - 嵌套子菜单 / 分组这类结构走结构层的 `vMenuGroup` / `vSubMenu`（数据外壳只覆盖一维列表）。
 */
export function VMenuWrapper() {
  const itemsState = ref([]);
  const activeState = ref(null);
  const orientationState = ref(null);
  let selectHandler = null;
  let menuBox = null;

  /** 数据行的账（键 → 项句柄）：只给"点谁亮谁"推状态用，数据真源仍是 `itemsState`。 */
  const itemNodes = new Map();
  /** 没声明 `key` / `id` 的对象行按对象身份发键（同一个对象反复写入保持同一个键）。 */
  const autoKeys = new WeakMap();
  let autoSerial = 0;

  const rowKeyOf = (entry) => {
    if (entry === null || typeof entry !== 'object') {
      return `item:${String(entry)}`;
    }

    const declared = entry.key ?? entry.id;

    if (declared !== undefined && declared !== null) {
      return declared;
    }

    let key = autoKeys.get(entry);

    if (key === undefined) {
      key = `item:auto-${autoSerial++}`;
      autoKeys.set(entry, key);
    }

    return key;
  };

  const labelOf = (entry) =>
    entry === null || typeof entry !== 'object'
      ? resolveTextValue(entry)
      : (entry.label ?? entry.text ?? '');

  return vNode((api) => {
    /** 一项：数据 → 菜单项（`active` 由这一层的状态派生）。 */
    const buildItem = (entry) => {
      const key = rowKeyOf(entry);
      const entryObject = typeof entry === 'object' && entry !== null ? entry : {};
      const item = VMenuItem();

      applyComponentSetup(item, {
        danger: entryObject.danger,
        disabled: entryObject.disabled,
        icon: entryObject.icon,
        label: labelOf(entry),
        shortcut: entryObject.shortcut
      });

      item.active(activeState.value !== null && activeState.value === key);
      item.on('click', () => {
        activeState.value = key;
        itemNodes.forEach((otherItem, otherKey) => otherItem.active(otherKey === key));

        if (typeof selectHandler === 'function') {
          const index = itemsState.value.indexOf(entry);
          selectHandler(key, entry, index < 0 ? undefined : index);
        }
      });

      itemNodes.set(key, item);
      return item;
    };

    api.items = (next) => {
      if (next === undefined) {
        return itemsState.value.slice();
      }

      itemNodes.clear();
      itemsState.value = Array.isArray(next) ? next.slice() : [];
      return api;
    };

    api.active = (next) => {
      if (next === undefined) {
        return activeState.value;
      }

      activeState.value = next ?? null;
      itemNodes.forEach((item, key) => item.active(key === activeState.value));
      return api;
    };

    api.orientation = (next) => {
      if (next === undefined) {
        return orientationState.value;
      }

      orientationState.value = next;
      menuBox?.orientation(next);
      return api;
    };

    api.onSelect = (handler) => {
      if (handler === undefined) {
        return selectHandler;
      }

      selectHandler = typeof handler === 'function' ? handler : null;
      return api;
    };

    api.setupObject = (config) => {
      const { active, items, onSelect, orientation, ...elementConfig } = config ?? {};

      if (Object.keys(elementConfig).length > 0) {
        menuBox?.setup(elementConfig);
      }
      if (items !== undefined) {
        api.items(items);
      }
      if (active !== undefined) {
        api.active(active);
      }
      if (orientation !== undefined) {
        api.orientation(orientation);
      }
      if (onSelect !== undefined) {
        api.onSelect(onSelect);
      }

      return api;
    };

    // 结构层：菜单本身；`items(builder)` 把根的行通道交给这一层做 `keyed` 对账
    menuBox = vMenu((menu) => {
      menu.items((root) => root.keyed(itemsState, rowKeyOf, (entry) => buildItem(entry)));
    });

    return menuBox;
  });
}

export const vMenuWrapper = createComponentShortcut(VMenuWrapper);
