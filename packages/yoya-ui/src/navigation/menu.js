import { aside, button, div, span, strong } from '@yoyaflow/yoya-core/html';
import { vButton } from '../actions/button.js';
import { bindDocumentEvent } from '@yoyaflow/yoya-core/internal/core/document-events.js';
import {
  componentNameOf,
  hasComponentIdentity,
  viewRootOf,
  vText
} from '@yoyaflow/yoya-core/internal/core/node.js';
import { computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import {
  applyComponentSetup,
  createComponentShortcut,
  delegateChildFactories,
  delegateNodeCommands,
  elementHasIdentity,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue
} from '../components/shared.js';

import { allocateId } from '@yoyaflow/yoya-core/internal/core/id.js';

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
 * 菜单容器（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写，**组件不继承基础元素**）。
 *
 * - **单元由容器自己的细粒度结构命令收进来**（`vMenuItem` / `vMenuGroup` / `vSubMenu` / `vMenuDivider`，
 *   同 `VTable` 的段命令）：追加时把**容器上下文** `trackState({ onStateChange })` 推给单元、写朝向、
 *   重算 roving tab 停点——迁移前这些动作挂在节点类型的 `child()` 覆盖上，闭包组件没有"子节点加入"
 *   这个时机（票 16 第 112 条），所以把命令收在自己身上；内容回调里的 `child(…)` / 视图根子工厂
 *   走**认领**（`adoptUnits`，按视图树快照幂等补做同一套动作）；
 * - **项账按视图树递归**（不再 `querySelectorAll`）：分组往下展开、**嵌套菜单不展开**（面板里的项归
 *   内层菜单管，与迁移前 `closest('[vn~="VMenu"]')` 的就近作用域同口径）；项自己派生 `tabindex`
 *   （容器推 `tabStop(…)`，票 16 第 113 条）；
 * - **容器态**：朝向是根上的读值绑定（样式按菜单作用域写，见 `MENU_UNIT_ORIENTATION`）；折叠态 /
 *   tab 停点由容器持有并往下推；
 * - **事件**（键盘漫游 / 聚焦）用引擎的元素级操作口子判命中（`view.owns(target)` + 嵌套菜单判定），
 *   动作走项的命令（`focus()` / `tabStop(…)`）——组件代码不碰 `_el` / `renderDom()`
 *   （票 16 第 114 / 115 条）；
 * - **行通道** `items(builder)`：把菜单根本身交给数据层（`vMenuWrapper` 在那里 `keyed(…)` 对账）；
 * - **内容回调的帧在视图根上**（`api.setupFunction`）：区域 `rebuildable()` 只在元素节点上订阅依赖，
 *   内容区就是组件根元素的容器靠这一条让"内容回调里声明区域 + 读信号"照旧可用。
 */
export function VMenu() {
  const orientationState = ref('vertical');
  /** 侧栏折叠态（侧栏推下来）：新加入的单元要立刻跟上同一口径。 */
  const sidebarCollapsedState = ref(false);
  /** 单元加入 / 状态变化的外部监听（侧栏折叠态重排用）：容器之间走回调，不派发 DOM 事件。 */
  let unitsChangeHandlers = [];
  /** 当前拿到 roving tab 停点的项（容器自己那份状态，不从 DOM 读回）。 */
  let tabStopItem = null;
  /** 外层容器上下文（`trackState(context)` 推进来）：自己的单元变化也要往上通知。 */
  let menuContext = null;
  /** 已经认领过的单元（推过容器上下文）：从 `WeakSet` 判，不重复建上下文对象。 */
  const adoptedUnits = new WeakSet();
  let view = null;

  return vNode((api, self) => {
    /** 朝向：三条属性一起绑定（`role` / `aria-orientation` / `data-orientation`）。 */
    const orientationValue = computed(() =>
      orientationState.value === 'horizontal' ? 'horizontal' : 'vertical'
    );

    /**
     * 走一遍**单元树**：分组往下展开，嵌套菜单不展开（它自己的项归它自己）。
     * 单元是组件时 `children()` 落到视图根（`ComponentNode.children()` 的内容侧语义）。
     */
    const walkUnits = (units, visit) => {
      units.forEach((unit) => {
        if (hasComponentIdentity(unit, 'VMenu')) {
          return;
        }

        visit(unit);

        if (hasComponentIdentity(unit, 'VMenuItem')) {
          return;
        }

        const nested = typeof unit?.children === 'function' ? unit.children() : null;

        if (nested && nested.length > 0) {
          walkUnits(nested, visit);
        }
      });
    };

    /** 自己的项（含分组里的项与子菜单触发器，不含嵌套菜单里的项）。 */
    const allItems = () => {
      const items = [];

      walkUnits(view ? view.children() : [], (unit) => {
        if (hasComponentIdentity(unit, 'VMenuItem')) {
          items.push(unit);
        }
      });

      return items;
    };

    const enabledItems = () => allItems().filter((item) => !item.disabled());

    /** 命中落进某个嵌套菜单时外层不管：内层菜单自己漫游（迁移前的就近作用域判定）。 */
    const nestedMenuOwnsTarget = (target) => {
      const owns = (units) =>
        units.some((unit) => {
          if (hasComponentIdentity(unit, 'VMenu')) {
            return unit.owns(target);
          }

          if (hasComponentIdentity(unit, 'VMenuItem')) {
            return false;
          }

          const nested = typeof unit?.children === 'function' ? unit.children() : null;

          return nested ? owns(nested) : false;
        });

      return owns(view ? view.children() : []);
    };

    const itemOfTarget = (target) => allItems().find((item) => item.owns(target));

    /**
     * roving tabindex：整棵树只留一个 `0`（默认落在第一个可用项上；当前停点还可用就留在原地）。
     * 停点是**容器状态**，往下推给项，项自己派生 `tabindex`（未进漫游的项不写该属性）。
     */
    const syncTabStops = (preferred = null) => {
      const items = allItems();
      const enabled = items.filter((item) => !item.disabled());
      const current = enabled.includes(preferred)
        ? preferred
        : enabled.includes(tabStopItem)
          ? tabStopItem
          : (enabled[0] ?? null);

      tabStopItem = current;
      items.forEach((item) => item.tabStop(item === current));

      return current;
    };

    /**
     * 认领自己的单元（**幂等**）：朝向写到"自身也带朝向位"的单元上、折叠态补标记、把容器上下文
     * 推给单元（项 / 分组 / 子菜单的状态变化回调进来）。
     *
     * 单元可能来自三条路：结构命令、行通道，以及内容回调里的 `menu.child(…)` / 视图根的子工厂
     * （区域重建时也走这条）。所以"认领"按**视图树快照**做，不假设每块内容都从命令进。
     */
    const adoptUnits = () => {
      (view ? view.children() : []).forEach((unit) => {
        applyMenuOrientation(unit, orientationValue.value);
        // 折叠态是容器自己的状态：新单元跟上、展开时一起清掉（幂等）
        applySidebarCollapsed(unit, sidebarCollapsedState.value);

        if (adoptedUnits.has(unit)) {
          return;
        }

        adoptedUnits.add(unit);
        // 容器态协议叫 `trackState`（不是 `track`）：单元里 `track` 是 HTML `<track>` 的短名，
        // 不带命令的单元（分隔线这种）会把 `unit.track(…)` 落到子工厂上，凭空建一个 `<track>` 元素
        unit.trackState?.({ onStateChange: handleUnitStateChange });
      });
    };

    /** 单元加入 / 状态变化：认领新单元 + 重算 tab 停点，并通知外层（侧栏折叠态重排 / 外层菜单）。 */
    const handleUnitStateChange = () => {
      adoptUnits();
      syncTabStops();
      unitsChangeHandlers.slice().forEach((handler) => handler());
      menuContext?.onStateChange?.();
    };

    /** 任意内容（字符串 / 节点 / 数组）落进根：与结构命令走同一条"加入时"路径。 */
    const appendContent = (children) => {
      view.child(children);
      handleUnitStateChange();

      return api;
    };

    /** 单元加入：普通匿名内容落进根，然后认领 + 重算。 */
    const appendUnit = (unit) => {
      view.child(unit);
      handleUnitStateChange();

      return api;
    };

    // 结构命令（同 `VTable` 的段命令）：建单元 + 收进来，链式回到容器
    api.vMenu = (setup) => appendUnit(vMenu(setup));
    api.vMenuDivider = (setup) => appendUnit(vMenuDivider(setup));
    api.vMenuGroup = (setup) => appendUnit(vMenuGroup(setup));
    api.vMenuItem = (setup) => appendUnit(vMenuItem(setup));
    api.vSidebar = (setup) => appendUnit(vSidebar(setup));
    api.vSubMenu = (setup) => appendUnit(vSubMenu(setup));

    api.orientation = (value = 'vertical') => {
      orientationState.value = value === 'horizontal' ? 'horizontal' : 'vertical';
      adoptUnits();
      return api;
    };
    api.horizontal = () => api.orientation('horizontal');
    api.vertical = () => api.orientation('vertical');

    /**
     * 可聚焦的菜单项（跳过禁用项）：菜单族的**公开命令**——`vDropdownMenu` 用它做打开后的
     * 首个 / 末个聚焦，跨模块只走命令（票 16 第 27 条）。
     */
    api.enabledItems = () => enabledItems();

    /** 指定 tab 停点（子菜单进入面板时用）。 */
    api.tabStop = (item = null) => syncTabStops(item);

    /**
     * 替换全部单元（迁移前 `setupContentSlot` 的替换语义）：先真清空（单元连同 DOM 一起摘掉，
     * 与 `VMenuItem` 的槽位盒同一口径），再按标准分派落新内容，最后重算 roving 停点。
     * 函数的交接契约与构建回调一致（回调句柄 = 菜单自己），所以菜单族的内容位都走这条命令。
     */
    api.replaceContent = (setup) => {
      replaceChildren(view, []);

      if (setup !== null && setup !== undefined) {
        // 标准分派：函数 = 构建回调（句柄 = 菜单自己，帧见 `api.setupFunction`）、对象 = 本组件
        // 覆盖的 `setupObject`、节点 / 数组 / 文本 = 元素语义
        self.node().setup(setup);
      }

      handleUnitStateChange();
      return api;
    };

    /**
     * 构建回调的**帧落在视图根**上（回调句柄仍是菜单自己）：菜单的"内容区"就是它的根元素，
     * 而区域 `rebuildable()` 只在元素节点上订阅依赖——声明在组件节点上的区域不会随信号重建
     * （见 `activateRegion` 的调用点）。于是内容回调（含 `vNavbar` / `vSidebar` / 下拉菜单的
     * `menuContent(cb)`，它们都走 `menu.setup(cb)`）里的 `menu.rebuildable()` + 读信号 =
     * 一张真能重建的区域，与菜单还是节点类型时同口径。
     *
     * 句柄用包装函数给出：`self.node()` 就是工厂返回值（组件节点），重建时也走同一条。
     */
    api.setupFunction = (builder) => {
      view.setupFunction(() => builder(self.node()));
      return api;
    };

    /**
     * 落地收口：结构建好到落地之间用 `child(…)` **直接投递**的单元（元素语义：容器不会再被叫一次）
     * 也进漫游——落地时统一重算一遍（幂等）。后续追加单元请走结构命令 / `replaceContent` / `items`，
     * 它们自带重算。
     */
    api.whenMount = () => {
      handleUnitStateChange();
    };

    /**
     * 区域声明 / 手动重建：落到**视图根**上（内容区就是它）。区域只在元素节点上订阅依赖，
     * 声明在组件节点上不会随信号重建，所以内容回调里的 `menu.rebuildable()` 由这里转发
     * （帧也是视图根的，见 `replaceContent`）。
     */
    api.rebuildable = (predicate) => {
      view.rebuildable(predicate);
      return api;
    };

    api.rebuild = (options) => {
      view.rebuild(options);
      return api;
    };

    /**
     * **行通道**（结构性收口，票 16 第 110 条的 ②+③）：把菜单的根本身交给数据层，让
     * `vMenuWrapper` 这类数据驱动外壳在它上面 `keyed(…)` 对账——与 `VTable` 的段命令同一角色。
     * 构建期的 `keyed` 只登记绑定（不立刻求值），所以先 `flush()` 对账行，再算 tab 停点
     * （同 `vScroll` 的口径）。
     */
    api.items = (builder) => {
      if (typeof builder === 'function') {
        builder(view);
        view.flush();
        handleUnitStateChange();
      }

      return api;
    };

    /** 包含判定（引擎口子）：外层菜单 / 侧栏用它判"命中是不是落在自己这棵子树里"。 */
    api.owns = (target) => view.owns(target);

    /** 外层容器上下文（与 `VMenuGroup` 的 `trackState(context)` 同族协议）。 */
    api.trackState = (next) => {
      menuContext = next ?? null;
      return api;
    };

    /** 侧栏折叠态（侧栏推给每个单元）：只写标记，不动结构。 */
    api.sidebarCollapsed = (value) => {
      sidebarCollapsedState.value = Boolean(value);
      adoptUnits();
      return api;
    };

    /** 单元的加入 / 状态变化（侧栏折叠态重排用）。 */
    api.whenUnitsChange = (handler) => {
      if (typeof handler === 'function') {
        unitsChangeHandlers = [...unitsChangeHandlers, handler];
      }

      return api;
    };

    // 调用方参数：朝向 → 子内容（迁移前 `_setupMenu` 的顺序）
    api.setupObject = (config) => {
      if (config === null || config === undefined) {
        return api;
      }

      const { children, horizontal, orientation, ...elementConfig } = config;

      if (Object.keys(elementConfig).length > 0) {
        view.setup(elementConfig);
      }

      if (orientation !== undefined) {
        api.orientation(orientation);
      } else if (horizontal !== undefined) {
        api.orientation(horizontal ? 'horizontal' : 'vertical');
      }

      if (children !== undefined) {
        appendContent(children);
      }

      return api;
    };

    api.setupString = (value) => appendContent(value);

    // 结构（R2）：朝向三条属性一起绑定；键盘漫游 / 聚焦挂在根上（事件委托）
    view = div(
      {
        attrs: {
          'aria-orientation': orientationValue,
          role: computed(() => (orientationValue.value === 'horizontal' ? 'menubar' : 'menu'))
        },
        'data-orientation': orientationValue,
        vn: 'VMenu'
      },
      (root) => {
        root.on('keydown', (event) => {
          if (!view.owns(event.target) || nestedMenuOwnsTarget(event.target)) {
            return;
          }

          const items = enabledItems();
          const step =
            orientationValue.value === 'horizontal'
              ? { ArrowLeft: -1, ArrowRight: 1 }
              : { ArrowDown: 1, ArrowUp: -1 };
          const delta = step[event.key];

          if (items.length === 0 || (!delta && event.key !== 'Home' && event.key !== 'End')) {
            return;
          }

          event.preventDefault();

          let nextIndex;

          if (event.key === 'Home') {
            nextIndex = 0;
          } else if (event.key === 'End') {
            nextIndex = items.length - 1;
          } else {
            const current = itemOfTarget(event.target);
            const at = Math.max(0, current ? items.indexOf(current) : 0);
            nextIndex = (at + delta + items.length) % items.length;
          }

          syncTabStops(items[nextIndex]);
          items[nextIndex].focus();
        });

        root.on('focusin', (event) => {
          if (!view.owns(event.target) || nestedMenuOwnsTarget(event.target)) {
            return;
          }

          const item = itemOfTarget(event.target);

          if (item && !item.disabled()) {
            syncTabStops(item);
          }
        });
      }
    );

    // 元素级命令代委托（族内 / 下拉菜单按 `menu.on(…)` / `menu.attr(…)` 与菜单对话）
    delegateNodeCommands(api, view);

    syncTabStops();
    return view;
  });
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
 * - **容器态**（菜单容器那一刀收口）：朝向不进项（样式按 `[vn~='VMenu'][data-orientation=…] …` 作用域写），
 *   容器只推两样——roving 停点（`tabStop(…)`，项自己派生 `tabindex`）与容器上下文（`trackState({ … })`，
 *   状态变化回调容器重算）；
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
  /** 容器上下文（`track(context)` 推进来）：状态变化要通知容器（不再派发 DOM 事件）。 */
  let menuContext = null;

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

      // 状态变化通知容器（容器重算 roving tabindex / 侧栏重排）：容器之间走回调，不派发 DOM 事件
      menuContext?.onStateChange?.();

      return api;
    };

    /** 容器上下文：`{ onStateChange }`（与 `VMenuGroup` 的 `trackState(context)` 同族协议）。 */
    api.trackState = (next) => {
      menuContext = next ?? null;
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
 * - **"子节点加入"时机**：迁移前的 `child()` 覆盖会在加入时通知侧栏重排、重算 tab 序；闭包组件没有
 *   这个时机（vNode 的 `api` 不允许定义 `child`），所以把追加命令收在自己身上——每次追加都
 *   `trackState` 往下推 + 往上回调（`groupContext.onStateChange`），菜单那一层再重算 tab 停点。
 */
export function VMenuGroup() {
  const labelId = allocateId('yoya-menu-group-label');
  /** 侧栏折叠态（外层容器推下来）：分组里新加入的单元要立刻跟上同一口径。 */
  const sidebarCollapsedState = ref(false);
  /** 外层容器上下文（`trackState(context)` 推进来）：分组里的单元变化要往上通知。 */
  let groupContext = null;
  let labelBox = null;
  let view = null;

  return vNode((api) => {
    api.label = (content) => {
      replaceChildren(labelBox, normalizeChildren(content));
      return api;
    };

    api.title = (content) => api.label(content);

    /** 外层容器上下文（与 `VMenu` 的 `trackState(context)` 同族协议）。 */
    api.trackState = (next) => {
      groupContext = next ?? null;
      return api;
    };

    /** 侧栏折叠态（容器语义）：自己的标签 + 组内单元一起跟上。 */
    api.sidebarCollapsed = (value) => {
      sidebarCollapsedState.value = Boolean(value);
      api.sidebarHidden(sidebarCollapsedState.value);

      (view ? view.children() : []).forEach((unit) =>
        applySidebarCollapsed(unit, sidebarCollapsedState.value)
      );

      return api;
    };

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

      if (sidebarCollapsedState.value) {
        applySidebarCollapsed(unit, true);
      }

      // 容器态：把上下文推给单元（项的状态变化回调到这里），再往上通知
      unit.trackState?.({ onStateChange: () => groupContext?.onStateChange?.() });
      groupContext?.onStateChange?.();

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

/**
 * 子菜单（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写，**组件不继承基础元素**）。
 *
 * 结构一次写清（R2）：
 * `div[VSubMenu] > button[VSubMenuTrigger VMenuItem] + div[VSubMenuPanel] > vMenu[VSubMenuContent VMenu]`。
 * 触发器是"一个菜单项 + 子菜单的 trigger"（多值身份，票 15 §1）：父菜单的键盘漫游按 `VMenuItem` 把它
 * 算成项，点击处理按 `VSubMenuTrigger` 把它排除；内容区既是子菜单的一部分（`VSubMenuContent`）也仍然是
 * 一个菜单（`VMenu`），所以"就近作用域"那套键盘漫游照旧成立。
 *
 * - 状态（`open` / `disabled` / `inline`）在闭包里，DOM（`data-open` / `data-disabled` / `data-inline` /
 *   `aria-expanded` / 快捷键文本）全走读值绑定；
 * - 命令只写状态 / 关掉下级（**不搬结构**）；"点外面关掉"+ Esc 是打开期间挂的文档级监听，关掉 / 销毁即释放；
 * - 命中判定用引擎口子（`trigger.owns(target)` / `panel.owns(target)`）、焦点交回走 `trigger.focus()`，
 *   组件代码不碰 `_el` / `renderDom()`（票 16 第 114 / 115 条）；
 * - **侧栏上下文** `sidebarContext(context)`：侧栏走查时推进来，开合时回调 `onOpenChange({ open, inline })`
 *   （溢出显示 / 折叠时自动展开由侧栏侧决定），子菜单不反查侧栏、也不认识侧栏。
 */
export function VSubMenu() {
  const panelId = allocateId('yoya-submenu-panel');
  const openState = ref(false);
  const disabledState = ref(false);
  const inlineState = ref(false);
  /** 侧栏上下文（侧栏走查推进来）：开合通知它。 */
  let sidebarContext = null;
  /** 打开期间挂的文档级监听释放函数（关掉 / 销毁即释放）。 */
  let globalCloseCleanup = null;
  let trigger = null;
  let menu = null;
  let panel = null;
  let view = null;

  return vNode((api) => {
    /** 触发器上的快捷键：滚动展开时按开合给 `▾` / `▸`，弹出式给 `›`（读值绑定）。 */
    const shortcutText = computed(() => (inlineState.value ? (openState.value ? '▾' : '▸') : '›'));

    const notifySidebar = () => {
      sidebarContext?.onOpenChange?.({
        inline: inlineState.value,
        open: openState.value
      });
    };

    const releaseGlobalClose = () => {
      if (globalCloseCleanup) {
        globalCloseCleanup();
      }
    };

    /** 打开期间："点外面关掉"（滚动展开的不挂）+ Esc 关掉整个子菜单树。 */
    const bindGlobalClose = () => {
      if (globalCloseCleanup) {
        return;
      }

      const unbinds = [];

      if (!inlineState.value) {
        unbinds.push(
          bindDocumentEvent('click', (event) => {
            if (!view.owns(event.target)) {
              api.close();
            }
          })
        );
      }

      unbinds.push(
        bindDocumentEvent('keydown', (event) => {
          if (event.key === 'Escape') {
            api.close();
          }
        })
      );

      globalCloseCleanup = () => {
        unbinds.forEach((unbind) => unbind());
        globalCloseCleanup = null;
      };
    };

    /** 关掉面板里的下级子菜单：按单元树递归 + 身份判定（下级自己再往下递归）。 */
    const closeDescendantSubMenus = () => {
      const visit = (units) => {
        units.forEach((unit) => {
          if (hasComponentIdentity(unit, 'VSubMenu')) {
            unit.close();
            return;
          }

          if (hasComponentIdentity(unit, 'VMenuItem')) {
            return;
          }

          const nested = typeof unit?.children === 'function' ? unit.children() : null;

          if (nested && nested.length > 0) {
            visit(nested);
          }
        });
      };

      visit(menu ? menu.children() : []);
    };

    /** 滚动展开时的"点谁亮谁"：面板里的项按身份比对（引擎口子判包含）。 */
    const selectInlineItem = (element) => {
      const visit = (units) => {
        units.forEach((unit) => {
          if (hasComponentIdentity(unit, 'VMenuItem')) {
            unit.active(unit.owns(element));
            return;
          }

          const nested = typeof unit?.children === 'function' ? unit.children() : null;

          if (nested && nested.length > 0) {
            visit(nested);
          }
        });
      };

      visit(menu.children());
    };

    const handleKeydown = (event) => {
      const enterKeys = ['ArrowRight', 'Enter', ' ', 'Spacebar'];
      const exitKey = event.key === 'ArrowLeft' || event.key === 'Escape';
      // 命中判定用引擎口子（不比对 `_el`）：事件来自自己这层的触发器 / 面板
      const onOwnTrigger = trigger.owns(event.target);
      const inOwnPanel = panel.owns(event.target);

      if (onOwnTrigger && enterKeys.includes(event.key)) {
        if (disabledState.value) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        api.open();

        const firstItem = menu.enabledItems()[0];

        if (firstItem) {
          menu.tabStop(firstItem);
          firstItem.focus();
        }

        return;
      }

      if (onOwnTrigger && exitKey && openState.value) {
        event.preventDefault();
        event.stopPropagation();
        api.close();
        trigger.focus();
        return;
      }

      // 焦点 / 事件落在自己的面板里（项或更低层的触发器）→ 退出这一层，焦点交回触发器
      if (exitKey && inOwnPanel) {
        event.preventDefault();
        event.stopPropagation();
        api.close();
        trigger.focus();
      }
    };

    // 触发器：一个菜单项 + 子菜单的 trigger（多值身份）
    trigger = applyComponentSetup(VMenuItem(), { vn: 'VSubMenuTrigger VMenuItem' })
      .attr({
        'aria-controls': panelId,
        'aria-expanded': computed(() => (openState.value ? 'true' : 'false')),
        'aria-haspopup': 'menu'
      })
      .shortcut(vText(shortcutText))
      .on('click', (event) => {
        event.preventDefault();

        if (!disabledState.value) {
          api.toggle();
        }
      });

    // 内容区：既是子菜单的一部分，也是一个菜单（多值身份）——键盘漫游的就近作用域判定照旧
    menu = applyComponentSetup(VMenu(), { vn: 'VSubMenuContent VMenu' });
    menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');

      if (menuItem && !menuItem.disabled && !elementHasIdentity(menuItem, 'VSubMenuTrigger')) {
        if (inlineState.value) {
          selectInlineItem(menuItem);
        } else {
          api.close();
        }
      }
    });

    panel = div({ id: panelId, vn: 'VSubMenuPanel' }, (box) => box.child(menu));

    api.trigger = (setup) => {
      if (setup === undefined) {
        return trigger;
      }

      if (typeof setup === 'function') {
        setup(trigger);
      } else {
        trigger.setup(setup);
      }

      return api;
    };

    api.label = (content) => {
      trigger.label(content);
      return api;
    };

    api.text = (content) => api.label(content);

    /** 内容位：`undefined` = 读回内层菜单；其余走内层菜单自己的内容命令（替换语义）。 */
    api.menuContent = (setup) => {
      if (setup === undefined) {
        return menu;
      }

      menu.replaceContent(setup);
      return api;
    };

    /** 事件目标 / 焦点是不是在自己的面板里（判"退出这一层"，**引擎口子**判包含）。 */
    api.panelOwns = (target) => panel.owns(target);

    api.inline = (value = true) => {
      inlineState.value = Boolean(value);
      return api;
    };

    /**
     * 禁用：写方法（与迁移前同口径——`Boolean(value)`，所以 `disabled()` 是"启用"）；
     * 禁用时连带关掉自己（面板不再可见）。
     */
    api.disabled = (value = true) => {
      disabledState.value = Boolean(value);
      trigger.disabled(disabledState.value);

      if (disabledState.value) {
        api.close();
      }

      return api;
    };

    /** 开 / 关：`true` 写入（与迁移前同口径——无参 = 打开）；禁用状态下打不开。 */
    api.open = (value = true) => {
      const open = Boolean(value) && !disabledState.value;

      openState.value = open;

      if (open) {
        bindGlobalClose();
      } else {
        closeDescendantSubMenus();
        releaseGlobalClose();
      }

      notifySidebar();
      return api;
    };

    api.close = () => api.open(false);

    api.toggle = () => api.open(!openState.value);

    /** 侧栏上下文（侧栏走查推进来）：绑定时就已打开的补一次通知（迁移前同口径）。 */
    api.sidebarContext = (next) => {
      sidebarContext = next ?? null;

      if (openState.value) {
        notifySidebar();
      }

      return api;
    };

    // 调用方参数：元素配置 → 触发器 / 文案 → 滚动展开 → 内容 → 禁用 → 打开态（迁移前顺序）
    api.setupObject = (config) => {
      if (config === null || config === undefined) {
        return api;
      }

      const {
        children,
        content,
        disabled,
        inline,
        label,
        menu: menuSetup,
        menuContent,
        open,
        text,
        trigger: triggerSetup,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        view.setup(elementConfig);
      }

      if (triggerSetup !== undefined) {
        api.trigger(triggerSetup);
      } else if (label !== undefined) {
        api.label(label);
      } else if (text !== undefined) {
        api.text(text);
      }

      if (inline !== undefined) {
        api.inline(inline);
      }

      const nestedSetup = menuContent ?? menuSetup ?? content ?? children;

      if (nestedSetup !== undefined) {
        api.menuContent(nestedSetup);
      }
      if (disabled !== undefined) {
        api.disabled(disabled);
      }
      if (open !== undefined) {
        api.open(open);
      }

      return api;
    };

    api.setupString = (value) => {
      api.label(value);
      return api;
    };

    /** 销毁：文档级监听必须释放（打开期间挂的）。 */
    api.whenDestroy = () => {
      releaseGlobalClose();
    };

    // 结构（R2）：状态类属性全是读值绑定
    view = div(
      {
        'data-disabled': computed(() => (disabledState.value ? 'true' : null)),
        'data-inline': computed(() => (inlineState.value ? 'true' : null)),
        'data-open': computed(() => (openState.value ? 'true' : null)),
        vn: 'VSubMenu'
      },
      (root) => {
        root.on('keydown', (event) => handleKeydown(event));
        root.child(trigger, panel);
      }
    );

    // 元素级命令代委托（`attr` / `style` / `on` …）+ 族内子工厂（与迁移前的外壳同口径）
    delegateNodeCommands(api, view);
    delegateChildFactories(api, view, MENU_CHILD_FACTORIES);

    return view;
  });
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
  // 朝向属性写在单元自己的视图根上（身份表给属性；菜单项不带朝向——样式按菜单作用域写）
  const attrs = MENU_UNIT_ORIENTATION[componentNameOf(child)]?.(orientation);

  if (attrs) {
    viewRootOf(child)?.attr(attrs);
  }
}

/**
 * 侧栏折叠态：把同一份状态转给一个单元——项自己带 `sidebarHidden`，容器带 `sidebarCollapsed`
 * （自己再往下转），分隔线没事可做。容器之间走命令，不写私有字段。
 */
function applySidebarCollapsed(unit, collapsed) {
  if (typeof unit?.sidebarCollapsed === 'function') {
    unit.sidebarCollapsed(collapsed);
    return;
  }

  unit?.sidebarHidden?.(collapsed);
}

/** 当前焦点元素（无 DOM 环境返回 null）：折叠侧栏时要把面板里的焦点交回触发器。 */
const activeElementOf = () => (typeof document === 'undefined' ? null : document.activeElement);

/**
 * 侧栏（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写，**组件不继承基础元素**）。
 *
 * 结构一次写清（R2）：
 * `aside[VSidebar] > div[VSidebarHeader] > strong[VSidebarTitle] + vButton[VSidebarToggle VButton]`
 * `+ vMenu[VSidebarMenu VMenu]`。
 *
 * - 折叠态（`collapsed` / `collapsible` / 响应式断点）在闭包里，DOM（`data-collapsed` / `data-collapsible` /
 *   `data-responsive*` / 开关文案与无障碍名称 / 标题位的 `data-sidebar-hidden`）全走读值绑定；
 * - 菜单区是**复用组件** `vMenu`：内容走它的 `replaceContent`、单元变化走 `whenUnitsChange`
 *   （新单元加进来就重排折叠态）、折叠态往下推走 `sidebarCollapsed`——侧栏不遍历结构改别人的 DOM；
 * - Esc 收起挂在 aside 上（焦点交给折叠开关 → 引擎口子 `focus()`）；文档级断点监听在销毁时释放；
 * - 折叠态读值 `isCollapsed()`（`collapsed()` 是写方法，与迁移前同口径）：侧栏上下文 / 溢出判定用。
 */
export function VSidebar() {
  const menuId = allocateId('yoya-sidebar-menu');
  const collapsedState = ref(false);
  const collapsibleState = ref(true);
  const ariaLabelState = ref('侧边导航');
  /** 响应式断点（`null` = 没开响应式；绑定据此写两条属性）。 */
  const responsiveQueryState = ref(null);
  let responsiveCleanup = null;
  let titleBox = null;
  let toggleBox = null;
  let menu = null;
  let view = null;

  return vNode((api, self) => {
    const ariaLabelText = computed(() => ariaLabelState.value);
    const menuLabelText = computed(() => `${ariaLabelState.value}菜单`);
    const toggleText = computed(() => (collapsedState.value ? '›' : '‹'));
    const toggleLabelText = computed(() =>
      collapsedState.value ? '展开侧边导航' : '收起侧边导航'
    );
    const expandedText = computed(() => (collapsedState.value ? 'false' : 'true'));

    const releaseResponsiveListener = () => {
      if (responsiveCleanup) {
        responsiveCleanup();
        responsiveCleanup = null;
      }
    };

    /** 点谁亮谁：菜单里的项按身份比对（引擎口子判包含），侧栏不持有激活状态。 */
    const activateMenuItem = (element) => {
      const visit = (units) => {
        units.forEach((unit) => {
          if (hasComponentIdentity(unit, 'VMenuItem')) {
            unit.active(unit.owns(element));
            return;
          }

          const nested = typeof unit?.children === 'function' ? unit.children() : null;

          if (nested && nested.length > 0) {
            visit(nested);
          }
        });
      };

      visit(menu.children());
    };

    titleBox = strong({ vn: 'VSidebarTitle' });

    toggleBox = vButton({ label: toggleText })
      .setup({ vn: 'VSidebarToggle VButton' })
      .attr({
        'aria-controls': menuId,
        'aria-expanded': expandedText,
        'aria-label': toggleLabelText
      })
      .on('click', () => api.toggle());

    menu = applyComponentSetup(VMenu(), { vn: 'VSidebarMenu VMenu' })
      .id(menuId)
      .attr('aria-label', menuLabelText);
    // 单元加入 / 状态变化 → 重排折叠态（容器之间走回调，不再派发 DOM 事件）
    menu.whenUnitsChange(() => setSidebarContentCollapsed(menu, collapsedState.value, self.node()));
    menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');

      if (menuItem && !menuItem.disabled && !elementHasIdentity(menuItem, 'VSubMenuTrigger')) {
        activateMenuItem(menuItem);
      }
    });

    api.title = (content) => {
      replaceChildren(titleBox, normalizeChildren(content));
      return api;
    };

    api.ariaLabel = (content) => {
      ariaLabelState.value = resolveTextValue(content) || '侧边导航';
      return api;
    };

    /** 菜单区：`undefined` = 读回菜单；其余走菜单自己的内容命令（替换语义）。 */
    api.menuContent = (setup) => {
      if (setup === undefined) {
        return menu;
      }

      menu.replaceContent(setup);
      return api;
    };

    /**
     * 折叠：写方法（与迁移前同口径——无参 = 收起；`collapsible(false)` 时不许收）。
     * 折叠态往下推给菜单区（`sidebarCollapsed`），标题位 / 开关 / 无障碍名称都由绑定派生。
     */
    api.collapsed = (value = true) => {
      if (!collapsibleState.value && value) {
        return api;
      }

      collapsedState.value = Boolean(value);
      setSidebarContentCollapsed(menu, collapsedState.value, self.node());
      return api;
    };

    api.collapsible = (value = true) => {
      collapsibleState.value = Boolean(value);
      return api;
    };

    api.toggle = () => api.collapsed(!collapsedState.value);

    /** 折叠态读值（侧栏上下文 / 溢出判定用；`collapsed()` 是写方法）。 */
    api.isCollapsed = () => collapsedState.value;

    /** 响应式：断点命中即收起 / 展开；`false` = 关掉断点（两条属性一起清）。 */
    api.responsive = (query = '(max-width: 768px)') => {
      releaseResponsiveListener();

      if (query === false) {
        responsiveQueryState.value = null;
        return api;
      }

      const mediaQuery = typeof query === 'string' && query ? query : '(max-width: 768px)';

      responsiveQueryState.value = mediaQuery;

      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return api;
      }

      const media = window.matchMedia(mediaQuery);
      const handleChange = (event) => api.collapsed(event.matches);

      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handleChange);
        responsiveCleanup = () => media.removeEventListener('change', handleChange);
      } else if (typeof media.addListener === 'function') {
        media.addListener(handleChange);
        responsiveCleanup = () => media.removeListener(handleChange);
      }

      api.collapsed(media.matches);
      return api;
    };

    // 调用方参数：元素配置 → 标题 → 无障碍名称 → 可否收起 → 菜单内容（迁移前顺序）
    api.setupObject = (config) => {
      if (config === null || config === undefined) {
        return api;
      }

      const {
        ariaLabel,
        children,
        collapsed,
        collapsible,
        content,
        menu: menuSetup,
        menuContent,
        responsive,
        title,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        view.setup(elementConfig);
      }
      // `collapsed` / `responsive` 迁移前靠"options 键 = 节点方法"派发（在 elementConfig 之后、
      // title 之前），闭包版按同一顺序显式还原
      if (collapsed !== undefined) {
        api.collapsed(collapsed);
      }
      if (responsive !== undefined) {
        api.responsive(responsive);
      }
      if (title !== undefined) {
        api.title(title);
      }
      if (ariaLabel !== undefined) {
        api.ariaLabel(ariaLabel);
      }
      if (collapsible !== undefined) {
        api.collapsible(collapsible);
      }

      const navigation = menuContent ?? menuSetup ?? content ?? children;

      if (navigation !== undefined) {
        api.menuContent(navigation);
      }

      return api;
    };

    api.setupString = (value) => {
      api.title(value);
      return api;
    };

    /** 销毁：断点监听必须释放（`whenUnitsChange` 挂在组件钩子上，随子树一起退场）。 */
    api.whenDestroy = () => {
      releaseResponsiveListener();
    };

    // 结构（R2）：折叠 / 断点 / 无障碍名称全是读值绑定
    view = aside(
      {
        attrs: { 'aria-label': ariaLabelText },
        'data-collapsed': computed(() => (collapsedState.value ? 'true' : null)),
        'data-collapsible': computed(() => (collapsibleState.value ? null : 'false')),
        'data-responsive': computed(() => (responsiveQueryState.value ? 'true' : null)),
        'data-responsive-query': responsiveQueryState,
        vn: 'VSidebar'
      },
      (root) => {
        root.on('keydown', (event) => {
          if (
            !collapsibleState.value ||
            event.key !== 'Escape' ||
            event.defaultPrevented ||
            collapsedState.value
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          api.collapsed(true);
          toggleBox.focus();
        });

        root.child(
          div({ vn: 'VSidebarHeader' }, (header) => header.child(titleBox, toggleBox)),
          menu
        );
      }
    );

    // 标题位：折叠态视觉隐藏（可访问性保留，样式在 `[data-sidebar-hidden='true']` 规则里）
    titleBox.attr(
      'data-sidebar-hidden',
      computed(() => (collapsedState.value ? 'true' : null))
    );

    // 元素级命令代委托 + 族内子工厂（与迁移前的外壳同口径）
    delegateNodeCommands(api, view);
    delegateChildFactories(api, view, MENU_CHILD_FACTORIES);

    return view;
  });
}

function setSidebarContentCollapsed(root, collapsed, sidebar) {
  const visit = (node, { preserveShortcut = false } = {}) => {
    // 容器（菜单 / 分组）自己往下转：折叠态是它们的状态，新加入的单元由它们补标记
    if (hasComponentIdentity(node, 'VMenu') || hasComponentIdentity(node, 'VMenuGroup')) {
      node.sidebarCollapsed?.(collapsed);
    }

    if (hasComponentIdentity(node, 'VMenuItem')) {
      // 菜单项是闭包组件了：标记落到它自己的槽位盒上（同一个 `data-sidebar-hidden` 口径）
      node.sidebarHidden(collapsed, { preserveShortcut });
      return;
    }

    if (hasComponentIdentity(node, 'VSubMenu')) {
      // 侧栏上下文：子菜单开合时回调进来（溢出显示 / 折叠时自动展开）
      bindSidebarSubMenu(sidebar, node);

      if (collapsed) {
        if (node.panelOwns(activeElementOf())) {
          node.trigger().focus();
        }
        node.close();
      }

      visit(node.trigger(), { preserveShortcut: true });
      visit(node.menuContent());
      return;
    }

    if (typeof node.children === 'function') {
      node.children().forEach(visit);
    }
  };

  visit(root);
}

/**
 * 绑一份侧栏上下文给子菜单：开合通知交给侧栏侧处理（子菜单不认识侧栏）。
 *
 * **只绑一次**：`sidebarContext()` 在"已打开"时会补一次通知（迁移前的首绑同口径），
 * 重复绑定会把"折叠态里打开 = 展开侧栏"重放一遍——折叠走查每次都经过这里，就会刚折叠又被展开。
 */
const boundSidebarSubMenus = new WeakSet();

function bindSidebarSubMenu(sidebar, submenu) {
  if (boundSidebarSubMenus.has(submenu)) {
    return;
  }

  boundSidebarSubMenus.add(submenu);
  submenu.sidebarContext({
    onOpenChange: ({ inline, open }) => {
      // 折叠态里"用户打开子菜单" = 顺手展开侧栏（展开本身会重走一遍走查）
      if (open && sidebar.isCollapsed()) {
        sidebar.collapsed(false);
        return;
      }

      sidebar.attr('data-overflow', open && !inline ? 'visible' : 'hidden');
    }
  });
}

export const vMenu = createComponentShortcut(VMenu);

export const vMenuItem = createComponentShortcut(VMenuItem);

export const vMenuGroup = createComponentShortcut(VMenuGroup);

export const vSubMenu = createComponentShortcut(VSubMenu);

export const vSidebar = createComponentShortcut(VSidebar);

/**
 * **数据驱动的菜单外壳**（票 16 第 110 条 ②+③，位置同 `VTableWrapper`）。
 *
 * 分工与表格族一致：**结构层**（`VMenu` 那一层：roving tabindex / 键盘漫游 / 子工厂）只做结构，
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
