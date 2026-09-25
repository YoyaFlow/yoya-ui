import type {
  ComponentNode,
  ChildInput,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput
} from './core.js';
import type { HtmlElementNode } from './html.js';

export type MenuOrientation = 'vertical' | 'horizontal';
export type StepStatus = 'process' | 'finish' | 'error';
export type StepDirection = 'horizontal' | 'vertical';
export type StepSize = 'small' | 'default';
export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsVariant = 'line' | 'card' | 'pills';
export type TabsSize = 'default' | 'large' | 'small';

/**
 * 锚点项输入：字符串 / 数字 = 标题，其余按项的标准分派。
 */
export type AnchorItemInput = string | number | VAnchorItem | AnchorItemOptions;

/**
 * `vAnchor({ … })` 的 props——只收数据 + 元素选项；锚点项从 `items`（或命令
 * `anchor.vAnchorItem(…)`）来，`children` 是 `items` 的兼容别名。
 */
export interface AnchorOptions {
  active?: PropValue<string | null>;
  activeHref?: PropValue<string | null>;
  ariaLabel?: ChildInput;
  /** `items` 的兼容别名。 */
  children?: AnchorItemInput[];
  items?: AnchorItemInput[];
  offset?: PropValue<number | string>;
  target?: string | Element;
  [key: string]: unknown;
}

/** Anchor navigation with scroll tracking. */
export interface VAnchor extends ComponentNode {
  ariaLabel(content?: ChildInput): VAnchor;
  offset(): number;
  offset(value: number | string): VAnchor;
  target(): string | Element | null;
  target(value: string | Element): VAnchor;
  items(): VAnchorItem[];
  items(value: AnchorItemInput | AnchorItemInput[]): VAnchor;
  child(...children: ChildInput[]): this;
  active(): string | null;
  active(value: string | null): VAnchor;
  activeHref(): string | null;
  activeHref(value: string | null): VAnchor;
}

export const VAnchor: { (props?: AnchorOptions): VAnchor };

export interface AnchorItemOptions {
  /** 标题：文本 / 句柄 / 节点（节点在构建期落位；`title()` 命令只收文本）。 */
  title?: ChildInput;
  text?: ChildInput;
  label?: ChildInput;
  content?: ChildInput;
  href?: PropValue<string | null>;
  active?: PropValue<boolean>;
  items?: AnchorItemInput[];
  /** 子项列表：数组 = 整批替换，函数 = 替换后声明（回调句柄是项句柄）。 */
  nested?: AnchorItemInput[] | SetupCallback<VAnchorItem>;
  /** `items` 的兼容别名。 */
  children?: AnchorItemInput[];
  [key: string]: unknown;
}

export interface VAnchorItem extends ComponentNode {
  title(content?: ChildInput): this;
  text(content?: ChildInput): this;
  label(content?: ChildInput): this;
  href(): string | null;
  href(value: string | null): VAnchorItem;
  items(): VAnchorItem[];
  items(value: AnchorItemInput | AnchorItemInput[]): VAnchorItem;
  vAnchorItem(setup: SetupInput<VAnchorItem>): VAnchorItem;
  /** 子项：读回的是**项节点**（与 `items()` 同源，结构由 `keyed` 对账）。 */
  nested(): VAnchorItem[];
  nested(setup: AnchorItemInput | AnchorItemInput[] | SetupCallback<VAnchorItem>): VAnchorItem;
  nestedItems(value: AnchorItemInput | AnchorItemInput[]): VAnchorItem;
  subItems(setup?: AnchorItemInput | AnchorItemInput[] | SetupCallback<VAnchorItem>): VAnchorItem;
  active(value?: boolean): VAnchorItem;
}

export const VAnchorItem: { (props?: AnchorItemOptions): VAnchorItem };

/** 面包屑层级输入：字符串 / 数字 = 文案，其余按项的标准分派。 */
export type BreadcrumbItemInput = string | number | VBreadcrumbItem | BreadcrumbItemOptions;

export interface BreadcrumbItemOptions {
  /** 文案：文本 / 句柄 / 节点（节点在构建期落位到当时可见的那个盒；`label()` 命令只收文本）。 */
  label?: ChildInput;
  /** `label` 的兼容别名。 */
  text?: ChildInput;
  content?: ChildInput;
  children?: ChildInput;
  /** 链接地址；没有地址（或空串）就是当前文本位。 */
  href?: string | null;
  /** `href` 的兼容别名。 */
  to?: string | null;
  /** 当前项：`aria-current="page"` + 文本位。 */
  active?: boolean;
  /** `active` 的兼容别名。 */
  current?: boolean;
  [key: string]: any;
}

/**
 * `vBreadcrumb({ … })` 的 props——只收数据 + 元素选项；层级从 `items`（或命令 `breadcrumb.vBreadcrumbItem(…)`）
 * 来，`children` 是 `items` 的兼容别名。
 */
export interface BreadcrumbOptions {
  /** 导航地标名称（`aria-label`）。 */
  ariaLabel?: ChildInput;
  /** 层级之间的分隔符；`null` / 空串回落到默认分隔符。 */
  separator?: ChildInput;
  items?: BreadcrumbItemInput | BreadcrumbItemInput[];
  /** `items` 的兼容别名。 */
  children?: BreadcrumbItemInput | BreadcrumbItemInput[];
  [key: string]: unknown;
}

/** Breadcrumb navigation. */
export interface VBreadcrumb extends ComponentNode {
  ariaLabel(): string;
  ariaLabel(content: ChildInput): VBreadcrumb;
  separator(): ChildInput;
  separator(content: ChildInput): VBreadcrumb;
  items(): VBreadcrumbItem[];
  items(value: BreadcrumbItemInput | BreadcrumbItemInput[]): VBreadcrumb;
  child(...children: ChildInput[]): this;
}

export const VBreadcrumb: { (props?: BreadcrumbOptions): VBreadcrumb };

export interface VBreadcrumbItem extends ComponentNode {
  label(): string;
  label(content: ChildInput): VBreadcrumbItem;
  text(): string;
  text(content: ChildInput): VBreadcrumbItem;
  content(): string;
  content(content: ChildInput): VBreadcrumbItem;
  href(): string | null;
  href(value: string | null): VBreadcrumbItem;
  to(value: string | null): VBreadcrumbItem;
  active(value?: boolean): VBreadcrumbItem;
  current(value?: boolean): VBreadcrumbItem;
}

export const VBreadcrumbItem: { (props?: BreadcrumbItemOptions): VBreadcrumbItem };

/** `vMenu({ … })` 的可派发键（定义函数无 props）。 */
export interface MenuOptions {
  children?: ChildInput;
  horizontal?: PropValue<boolean>;
  orientation?: PropValue<MenuOrientation>;
  [key: string]: unknown;
}

/** Menu container with keyboard navigation. */
export interface VMenu extends ComponentNode {
  orientation(): MenuOrientation;
  orientation(value?: MenuOrientation): VMenu;
  child(...children: ChildInput[]): this;
  horizontal(): VMenu;
  vertical(): VMenu;
  /** 可聚焦的菜单项（跳过禁用项）：族内 / 下拉菜单用它做打开后的首个 / 末个聚焦。 */
  enabledItems(): VMenuItem[];
  /** 指定 roving tab 停点（不传 = 重算一次，当前停点还可用就留在原地）。 */
  tabStop(item?: VMenuItem | null): VMenuItem | null;
  /** 替换全部单元（内容位：函数 = 构建回调，句柄 = 菜单自己；`null` = 清空）。 */
  replaceContent(setup: SetupInput<VMenu> | null): VMenu;
  /** 容器态协议：外层容器推进来的上下文（`{ onStateChange }`）。 */
  trackState(context: { onStateChange?: () => void } | null): VMenu;
  /** 折叠态（侧栏推给单元）：只写标记，不动结构。 */
  sidebarCollapsed(value: boolean): VMenu;
  /** 单元加入 / 状态变化的外部监听（侧栏折叠态重排用）。 */
  whenUnitsChange(handler: () => void): VMenu;
  /** 引擎口子：命中判定（`target` 是否落在自己这棵子树里）。 */
  owns(target: unknown): boolean;
  /** 行通道（结构性收口）：把菜单根本身交给数据层在上面 `keyed(…)` 对账（`vMenuWrapper` 就这么用）。 */
  items(builder: (root: HtmlElementNode) => void): VMenu;
}

export const VMenu: { (): VMenu };

/** 数据驱动外壳（同 `VTableWrapper` 的位置）：`items` 数据 + `keyed` 对账 + `active` / `onSelect`。 */
export interface MenuWrapperItem {
  key?: unknown;
  id?: unknown;
  label?: ChildInput;
  text?: ChildInput;
  icon?: ChildInput;
  shortcut?: ChildInput;
  danger?: boolean;
  disabled?: boolean;
  [key: string]: any;
}

/** `vMenuWrapper({ … })` 的可派发键（定义函数无 props）。 */
export interface MenuWrapperOptions {
  active?: unknown;
  items?: Array<MenuWrapperItem | string | number>;
  onSelect?: (key: unknown, entry: MenuWrapperItem, index: number) => void;
  orientation?: MenuOrientation;
  [key: string]: unknown;
}

export interface VMenuWrapper extends ComponentNode {
  items(): Array<MenuWrapperItem | string | number>;
  items(value: Array<MenuWrapperItem | string | number>): VMenuWrapper;
  active(): unknown;
  active(value: unknown): VMenuWrapper;
  orientation(): MenuOrientation | null;
  orientation(value: MenuOrientation): VMenuWrapper;
  onSelect(): ((key: unknown, entry: MenuWrapperItem, index: number) => void) | null;
  onSelect(handler: (key: unknown, entry: MenuWrapperItem, index: number) => void): VMenuWrapper;
}

export const VMenuWrapper: { (): VMenuWrapper };

/** Menu group label. */
export interface VMenuDivider extends ComponentNode {}

export const VMenuDivider: { (): VMenuDivider };

/** `vMenuItem({ … })` 的可派发键（定义函数无 props）。 */
export interface MenuItemOptions {
  children?: ChildInput;
  content?: ChildInput;
  danger?: PropValue<boolean>;
  disabled?: PropValue<boolean>;
  icon?: ChildInput;
  label?: ChildInput;
  shortcut?: ChildInput;
  text?: ChildInput;
  [key: string]: unknown;
}

/** Menu item with label/icon/shortcut/state helpers. */
export interface VMenuItem extends ComponentNode {
  text(content?: ChildInput): this;
  label(content?: ChildInput): this;
  content(content: ChildInput): VMenuItem;
  icon(content: ChildInput): VMenuItem;
  shortcut(content: ChildInput): VMenuItem;
  active(value?: boolean): VMenuItem;
  danger(value?: boolean): VMenuItem;
  disabled(value?: boolean): VMenuItem;
  hoverable(value?: boolean): VMenuItem;
}

export const VMenuItem: { (): VMenuItem };

/** `vMenuGroup({ … })` 的可派发键（定义函数无 props）。 */
export interface MenuGroupOptions {
  children?: ChildInput;
  label?: ChildInput;
  title?: ChildInput;
  [key: string]: unknown;
}

/** Menu group with an optional label. */
export interface VMenuGroup extends ComponentNode {
  label(content?: ChildInput): this;
  title(content?: ChildInput): this;
  child(...children: ChildInput[]): this;
}

export const VMenuGroup: { (): VMenuGroup };

/** `vSubMenu({ … })` 的可派发键（定义函数无 props）。 */
export interface SubMenuOptions {
  children?: ChildInput;
  content?: ChildInput;
  disabled?: PropValue<boolean>;
  inline?: PropValue<boolean>;
  label?: ChildInput;
  menu?: SetupInput<HtmlElementNode>;
  menuContent?: SetupInput<HtmlElementNode>;
  open?: PropValue<boolean>;
  text?: ChildInput;
  trigger?: SetupInput<HtmlElementNode>;
  [key: string]: unknown;
}

/** Collapsible sub-menu. */
export interface VSubMenu extends ComponentNode {
  trigger(): HtmlElementNode;
  trigger(setup: SetupInput<HtmlElementNode>): VSubMenu;
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  menuContent(): HtmlElementNode;
  menuContent(setup: SetupInput<HtmlElementNode>): VSubMenu;
  inline(value?: boolean): VSubMenu;
  disabled(value?: boolean): VSubMenu;
  open(value?: boolean): VSubMenu;
  close(): VSubMenu;
  toggle(): VSubMenu;
  /** 引擎口子：事件目标 / 焦点是不是在自己的面板里（"退出这一层"判定）。 */
  panelOwns(target: unknown): boolean;
  /** 侧栏上下文（侧栏走查推进来）：开合时回调 `onOpenChange({ open, inline })`。 */
  sidebarContext(
    context: { onOpenChange?: (state: { open: boolean; inline: boolean }) => void } | null
  ): VSubMenu;
}

export const VSubMenu: { (): VSubMenu };

/** `vSidebar({ … })` 的可派发键（定义函数无 props）。 */
export interface SidebarOptions {
  ariaLabel?: ChildInput;
  children?: SetupInput<HtmlElementNode>;
  collapsed?: PropValue<boolean>;
  collapsible?: PropValue<boolean>;
  content?: SetupInput<HtmlElementNode>;
  menu?: SetupInput<HtmlElementNode>;
  menuContent?: SetupInput<HtmlElementNode>;
  responsive?: PropValue<boolean | string>;
  title?: ChildInput;
  [key: string]: unknown;
}

/** Collapsible sidebar shell. */
export interface VSidebar extends ComponentNode {
  title(content?: ChildInput): this;
  ariaLabel(content: ChildInput): VSidebar;
  menuContent(): HtmlElementNode;
  menuContent(setup: SetupInput<HtmlElementNode>): VSidebar;
  collapsed(value?: boolean): VSidebar;
  /** 折叠态读值（`collapsed()` 是写方法）。 */
  isCollapsed(): boolean;
  collapsible(value?: boolean): VSidebar;
  toggle(): VSidebar;
  responsive(query?: string): VSidebar;
}

export const VSidebar: { (): VSidebar };

/**
 * `vNavbar({ … })` 的 props——只收数据 + 元素选项；品牌 / 菜单 / 动作三块内容走命令
 * （`menu` / `content` / `children` 都是 `menuContent` 的兼容键）。
 */
export interface NavbarOptions {
  /** 导航地标名称（`aria-label`；内层菜单跟一句 `${label}菜单`）。 */
  ariaLabel?: ChildInput;
  /** 品牌标题：文本 / 句柄（节点内容请在构建期给；`title()` 命令只收文本）。 */
  title?: ChildInput;
  /** 品牌副标题：同上。 */
  subtitle?: ChildInput;
  /** 自定义品牌内容（内容通道：节点 / 文本 / 构建回调，回调句柄 = 品牌盒）；`null` = 回默认品牌。 */
  brand?: SetupInput<HtmlElementNode> | null;
  /** 横向菜单内容（回调句柄 = 内层菜单）。 */
  menuContent?: SetupInput<HtmlElementNode>;
  /** `menuContent` 的兼容别名。 */
  menu?: SetupInput<HtmlElementNode>;
  /** `menuContent` 的兼容别名。 */
  content?: SetupInput<HtmlElementNode>;
  /** `menuContent` 的兼容别名。 */
  children?: SetupInput<HtmlElementNode>;
  /** 右侧动作区内容（回调句柄 = 动作盒）。 */
  actions?: SetupInput<HtmlElementNode>;
  /** 吸顶（默认 false；样式在 CSS 的 `data-sticky` 规则里）。 */
  sticky?: PropValue<boolean>;
  [key: string]: unknown;
}

/** Top navigation bar. */
export interface VNavbar extends ComponentNode {
  ariaLabel(): string;
  ariaLabel(content: ChildInput): VNavbar;
  sticky(value?: boolean): VNavbar;
  title(): string;
  title(content: ChildInput): VNavbar;
  subtitle(): string;
  subtitle(content: ChildInput): VNavbar;
  brand(setup: SetupInput<HtmlElementNode> | null): VNavbar;
  menuContent(): VMenu;
  menuContent(setup: SetupInput<HtmlElementNode>): VNavbar;
  actions(setup: SetupInput<HtmlElementNode>): VNavbar;
}

export const VNavbar: { (props?: NavbarOptions): VNavbar };

/**
 * 步骤项输入：字符串 / 数字 = 标题，其余按项的标准分派。
 */
export type StepItemInput = string | number | VStep | StepItemOptions;

export interface StepItemOptions {
  /** 文本 / 句柄 / 节点（节点在构建期落位；`title()` 命令只收文本）。 */
  title?: ChildInput;
  text?: ChildInput;
  description?: ChildInput;
  /** `description` 的兼容别名（`children` 同义）。 */
  desc?: ChildInput;
  children?: ChildInput;
  /** 指示器内容：文本 / 句柄 / 节点（节点在构建期落位）。 */
  icon?: ChildInput;
  status?: PropValue<StepStatus | null>;
  [key: string]: unknown;
}

/** Step indicator. */
export interface VStep extends ComponentNode {
  title(content?: ChildInput): this;
  text(content?: ChildInput): this;
  description(): ChildInput;
  description(content: ChildInput): VStep;
  desc(): ChildInput;
  desc(content: ChildInput): VStep;
  icon(): ChildInput;
  icon(content: ChildInput): VStep;
  status(): StepStatus | null;
  status(value: StepStatus | null): VStep;
}

export const VStep: { (props?: StepItemOptions): VStep };

/**
 * `vSteps({ … })` 的 props——只收数据 + 元素选项；步骤从 `items`（或命令 `steps.vStep(…)`）来，
 * `children` 是 `items` 的兼容别名。
 */
export interface StepsOptions {
  /** 当前步骤下标（从 0 起）。 */
  current?: PropValue<number>;
  status?: PropValue<StepStatus>;
  direction?: PropValue<StepDirection>;
  size?: PropValue<StepSize>;
  items?: StepItemInput[];
  /** `items` 的兼容别名。 */
  children?: StepItemInput[];
  [key: string]: unknown;
}

/** Step progress list. */
export interface VSteps extends ComponentNode {
  current(): number;
  current(value: number): VSteps;
  status(): StepStatus;
  status(value: StepStatus): VSteps;
  direction(): StepDirection;
  direction(value: StepDirection): VSteps;
  size(): StepSize;
  size(value: StepSize): VSteps;
  items(): VStep[];
  items(value: StepItemInput | StepItemInput[]): VSteps;
  next(): VSteps;
  prev(): VSteps;
  child(...children: ChildInput[]): this;
}

export const VSteps: { (props?: StepsOptions): VSteps };

/**
 * 页签输入：字符串 / 数字 = 标签，其余按项的标准分派。
 */
export type TabItemInput = string | number | VTab | TabItemOptions;

export interface TabItemOptions {
  key?: string;
  /** `key` 的兼容别名。 */
  value?: string;
  /** 标签：文本 / 句柄 / 节点（节点在构建期落位；`label()` 命令只收文本）。 */
  label?: ChildInput;
  /** `label` 的兼容别名（`title` 同义）。 */
  text?: ChildInput;
  title?: ChildInput;
  /** 图标：文本 / 句柄 / 节点（节点在构建期落位）。 */
  icon?: ChildInput;
  /** 面板内容（内容通道：节点 / 文本 / 构建回调）。 */
  content?: ChildInput | SetupCallback<HtmlElementNode>;
  /** `content` 的兼容别名。 */
  children?: ChildInput | SetupCallback<HtmlElementNode>;
  disabled?: PropValue<boolean>;
  active?: PropValue<boolean>;
  [key: string]: unknown;
}

/** Single tab. */
export interface VTab extends ComponentNode {
  key(): string | null;
  key(value: string): VTab;
  value(): string | null;
  value(value: string): VTab;
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  title(content?: ChildInput): this;
  icon(): ChildInput;
  icon(content: ChildInput): VTab;
  content(setup: ChildInput | SetupCallback<HtmlElementNode>): VTab;
  /** 面板句柄（容器投递进 `VTabsPanels`）。 */
  panel(): HtmlElementNode;
  /** 触发器句柄（容器投递进 `VTabsNav`）。 */
  trigger(): HtmlElementNode;
  disabled(): boolean;
  disabled(value: boolean): VTab;
  active(value?: boolean): VTab;
}

export const VTab: { (props?: TabItemOptions): VTab };

/**
 * `vTabs({ … })` 的 props——只收数据 + 元素选项；页签从 `items`（或命令 `tabs.vTab(…)`）来，
 * `children` 是 `items` 的兼容别名。
 */
export interface TabsOptions {
  /** key 或下标。 */
  active?: PropValue<string | number>;
  ariaLabel?: ChildInput;
  items?: TabItemInput[];
  /** `items` 的兼容别名。 */
  children?: TabItemInput[];
  orientation?: PropValue<TabsOrientation>;
  variant?: PropValue<TabsVariant>;
  size?: PropValue<TabsSize>;
  change?: (payload: TabChangePayload) => void;
  onChange?: (payload: TabChangePayload) => void;
  onTabChange?: (payload: TabChangePayload) => void;
  [key: string]: unknown;
}

/** 变更回调的载荷（与运行期一致）。 */
export interface TabChangePayload {
  active: string | number;
  index: number;
  item: VTab;
  key: string | null;
}

/** Tab group with selection state. */
export interface VTabs extends ComponentNode {
  children(): HtmlElementNode[];
  items(): VTab[];
  items(value: TabItemInput | TabItemInput[]): VTabs;
  child(...children: ChildInput[]): this;
  active(): string | number;
  active(value: string | number): VTabs;
  activeIndex(): number;
  activeIndex(value: number): VTabs;
  ariaLabel(): string;
  ariaLabel(content: ChildInput): VTabs;
  orientation(): TabsOrientation;
  orientation(value: TabsOrientation): VTabs;
  variant(): TabsVariant;
  variant(value: TabsVariant): VTabs;
  size(): TabsSize;
  size(value: TabsSize): VTabs;
  change(): ((payload: TabChangePayload) => void) | null;
  change(handler: ((payload: TabChangePayload) => void) | null): VTabs;
  onChange(handler: ((payload: TabChangePayload) => void) | null): VTabs;
  next(): VTabs;
  prev(): VTabs;
}

export const VTabs: { (props?: TabsOptions): VTabs };

export const vAnchor: {
  (
    first?: AnchorOptions | SetupCallback<VAnchor> | null,
    callback?: SetupCallback<VAnchor>
  ): VAnchor;
} & ElementFactory<VAnchor>;
export const vAnchorItem: {
  (
    first?: AnchorItemOptions | SetupInput<VAnchorItem> | null,
    callback?: SetupCallback<VAnchorItem>
  ): VAnchorItem;
} & ElementFactory<VAnchorItem>;
export const vBreadcrumb: {
  (
    first?: BreadcrumbOptions | SetupCallback<VBreadcrumb> | null,
    callback?: SetupCallback<VBreadcrumb>
  ): VBreadcrumb;
} & ElementFactory<VBreadcrumb>;
export const vBreadcrumbItem: {
  (
    first?: BreadcrumbItemOptions | SetupInput<VBreadcrumbItem> | null,
    callback?: SetupCallback<VBreadcrumbItem>
  ): VBreadcrumbItem;
} & ElementFactory<VBreadcrumbItem>;
export const vMenu: ElementFactory<VMenu> & {
  (first?: MenuOptions | SetupInput<VMenu> | null, callback?: SetupCallback<VMenu>): VMenu;
};
export const vMenuDivider: ElementFactory<VMenuDivider>;
export const vMenuGroup: ElementFactory<VMenuGroup> & {
  (
    first?: MenuGroupOptions | SetupInput<VMenuGroup> | null,
    callback?: SetupCallback<VMenuGroup>
  ): VMenuGroup;
};
export const vMenuItem: ElementFactory<VMenuItem> & {
  (
    first?: MenuItemOptions | SetupInput<VMenuItem> | null,
    callback?: SetupCallback<VMenuItem>
  ): VMenuItem;
};
export const vMenuWrapper: ElementFactory<VMenuWrapper> & {
  (
    first?: MenuWrapperOptions | SetupInput<VMenuWrapper> | null,
    callback?: SetupCallback<VMenuWrapper>
  ): VMenuWrapper;
};
export const vNavbar: {
  (
    first?: NavbarOptions | SetupCallback<VNavbar> | null,
    callback?: SetupCallback<VNavbar>
  ): VNavbar;
} & ElementFactory<VNavbar>;
export const vSidebar: ElementFactory<VSidebar> & {
  (
    first?: SidebarOptions | SetupInput<VSidebar> | null,
    callback?: SetupCallback<VSidebar>
  ): VSidebar;
};
export const vStep: {
  (first?: StepItemOptions | SetupInput<VStep> | null, callback?: SetupCallback<VStep>): VStep;
} & ElementFactory<VStep>;
export const vSteps: {
  (first?: StepsOptions | SetupCallback<VSteps> | null, callback?: SetupCallback<VSteps>): VSteps;
} & ElementFactory<VSteps>;
export const vSubMenu: ElementFactory<VSubMenu> & {
  (
    first?: SubMenuOptions | SetupInput<VSubMenu> | null,
    callback?: SetupCallback<VSubMenu>
  ): VSubMenu;
};
export const vTab: {
  (first?: TabItemOptions | SetupInput<VTab> | null, callback?: SetupCallback<VTab>): VTab;
} & ElementFactory<VTab>;
export const vTabs: {
  (first?: TabsOptions | SetupCallback<VTabs> | null, callback?: SetupCallback<VTabs>): VTabs;
} & ElementFactory<VTabs>;

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface NavigationParentShortcuts {
  vAnchor(
    first?: AnchorOptions | SetupInput<VAnchor> | null,
    callback?: SetupCallback<VAnchor>
  ): VAnchor;
  vAnchorItem(
    first?: AnchorItemOptions | SetupInput<VAnchorItem> | null,
    callback?: SetupCallback<VAnchorItem>
  ): VAnchorItem;
  vBreadcrumb(
    first?: BreadcrumbOptions | SetupCallback<VBreadcrumb> | null,
    callback?: SetupCallback<VBreadcrumb>
  ): VBreadcrumb;
  vBreadcrumbItem(
    first?: BreadcrumbItemOptions | SetupInput<VBreadcrumbItem> | null,
    callback?: SetupCallback<VBreadcrumbItem>
  ): VBreadcrumbItem;
  vMenu(first?: MenuOptions | SetupInput<VMenu> | null, callback?: SetupCallback<VMenu>): VMenu;
  vMenuDivider(
    first?: SetupInput<VMenuDivider> | null,
    callback?: SetupCallback<VMenuDivider>
  ): VMenuDivider;
  vMenuGroup(
    first?: MenuGroupOptions | SetupInput<VMenuGroup> | null,
    callback?: SetupCallback<VMenuGroup>
  ): VMenuGroup;
  vMenuItem(
    first?: MenuItemOptions | SetupInput<VMenuItem> | null,
    callback?: SetupCallback<VMenuItem>
  ): VMenuItem;
  vMenuWrapper(
    first?: MenuWrapperOptions | SetupInput<VMenuWrapper> | null,
    callback?: SetupCallback<VMenuWrapper>
  ): VMenuWrapper;
  vNavbar(
    first?: NavbarOptions | SetupCallback<VNavbar> | null,
    callback?: SetupCallback<VNavbar>
  ): VNavbar;
  vSidebar(
    first?: SidebarOptions | SetupInput<VSidebar> | null,
    callback?: SetupCallback<VSidebar>
  ): VSidebar;
  vStep(first?: StepItemOptions | SetupInput<VStep> | null, callback?: SetupCallback<VStep>): VStep;
  vSteps(
    first?: StepsOptions | SetupInput<VSteps> | null,
    callback?: SetupCallback<VSteps>
  ): VSteps;
  vSubMenu(first?: SetupInput<VSubMenu> | null, callback?: SetupCallback<VSubMenu>): VSubMenu;
  vTab(first?: TabItemOptions | SetupInput<VTab> | null, callback?: SetupCallback<VTab>): VTab;
  vTabs(first?: TabsOptions | SetupCallback<VTabs> | null, callback?: SetupCallback<VTabs>): VTabs;
}

export type { ElementOptions };
