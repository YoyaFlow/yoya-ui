import type {
  ChildInput,
  ElementFactory,
  ElementOptions,
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
  active?: string | null;
  activeHref?: string | null;
  ariaLabel?: ChildInput;
  /** `items` 的兼容别名。 */
  children?: AnchorItemInput[];
  items?: AnchorItemInput[];
  offset?: number | string;
  target?: string | Element;
  [key: string]: unknown;
}

/** Anchor navigation with scroll tracking. */
export class VAnchor extends HtmlElementNode {
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

export interface AnchorItemOptions {
  /** 标题：文本 / 句柄 / 节点（节点在构建期落位；`title()` 命令只收文本）。 */
  title?: ChildInput;
  text?: ChildInput;
  label?: ChildInput;
  content?: ChildInput;
  href?: string | null;
  active?: boolean;
  items?: AnchorItemInput[];
  /** 子项列表：数组 = 整批替换，函数 = 替换后声明（回调句柄是项句柄）。 */
  nested?: AnchorItemInput[] | SetupCallback<VAnchorItem>;
  /** `items` 的兼容别名。 */
  children?: AnchorItemInput[];
  [key: string]: any;
}

export class VAnchorItem extends HtmlElementNode {
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
export class VBreadcrumb extends HtmlElementNode {
  ariaLabel(): string;
  ariaLabel(content: ChildInput): VBreadcrumb;
  separator(): ChildInput;
  separator(content: ChildInput): VBreadcrumb;
  items(): VBreadcrumbItem[];
  items(value: BreadcrumbItemInput | BreadcrumbItemInput[]): VBreadcrumb;
  child(...children: ChildInput[]): this;
}

export class VBreadcrumbItem extends HtmlElementNode {
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

/** Menu container with keyboard navigation. */
export class VMenu extends HtmlElementNode {
  orientation(): MenuOrientation;
  orientation(value?: MenuOrientation): VMenu;
  child(...children: ChildInput[]): this;
  horizontal(): VMenu;
  vertical(): VMenu;
  /** 可聚焦的菜单项（跳过禁用项）：族内 / 下拉菜单用它做打开后的首个 / 末个聚焦。 */
  enabledItems(): HTMLElement[];
  /** 行通道（结构性收口）：把菜单根本身交给数据层在上面 `keyed(…)` 对账（`vMenuWrapper` 就这么用）。 */
  items(builder: (root: HtmlElementNode) => void): VMenu;
}

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

export class VMenuWrapper extends HtmlElementNode {
  items(): Array<MenuWrapperItem | string | number>;
  items(value: Array<MenuWrapperItem | string | number>): VMenuWrapper;
  active(): unknown;
  active(value: unknown): VMenuWrapper;
  orientation(): MenuOrientation | null;
  orientation(value: MenuOrientation): VMenuWrapper;
  onSelect(): ((key: unknown, entry: MenuWrapperItem, index: number) => void) | null;
  onSelect(handler: (key: unknown, entry: MenuWrapperItem, index: number) => void): VMenuWrapper;
}

/** Menu group label. */
export class VMenuDivider extends HtmlElementNode {}

/** Menu item with label/icon/shortcut/state helpers. */
export class VMenuItem extends HtmlElementNode {
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

/** Menu group with an optional label. */
export class VMenuGroup extends HtmlElementNode {
  label(content?: ChildInput): this;
  title(content?: ChildInput): this;
  child(...children: ChildInput[]): this;
}

/** Collapsible sub-menu. */
export class VSubMenu extends HtmlElementNode {
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
}

/** Collapsible sidebar shell. */
export class VSidebar extends HtmlElementNode {
  title(content?: ChildInput): this;
  ariaLabel(content: ChildInput): VSidebar;
  menuContent(): HtmlElementNode;
  menuContent(setup: SetupInput<HtmlElementNode>): VSidebar;
  collapsed(value?: boolean): VSidebar;
  toggle(): VSidebar;
  responsive(query?: string): VSidebar;
}

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
  sticky?: boolean;
  [key: string]: unknown;
}

/** Top navigation bar. */
export class VNavbar extends HtmlElementNode {
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
  status?: StepStatus | null;
  [key: string]: any;
}

/** Step indicator. */
export class VStep extends HtmlElementNode {
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

/**
 * `vSteps({ … })` 的 props——只收数据 + 元素选项；步骤从 `items`（或命令 `steps.vStep(…)`）来，
 * `children` 是 `items` 的兼容别名。
 */
export interface StepsOptions {
  /** 当前步骤下标（从 0 起）。 */
  current?: number;
  status?: StepStatus;
  direction?: StepDirection;
  size?: StepSize;
  items?: StepItemInput[];
  /** `items` 的兼容别名。 */
  children?: StepItemInput[];
  [key: string]: unknown;
}

/** Step progress list. */
export class VSteps extends HtmlElementNode {
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
  disabled?: boolean;
  active?: boolean;
  [key: string]: any;
}

/** Single tab. */
export class VTab extends HtmlElementNode {
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

/**
 * `vTabs({ … })` 的 props——只收数据 + 元素选项；页签从 `items`（或命令 `tabs.vTab(…)`）来，
 * `children` 是 `items` 的兼容别名。
 */
export interface TabsOptions {
  /** key 或下标。 */
  active?: string | number;
  ariaLabel?: ChildInput;
  items?: TabItemInput[];
  /** `items` 的兼容别名。 */
  children?: TabItemInput[];
  orientation?: TabsOrientation;
  variant?: TabsVariant;
  size?: TabsSize;
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
export class VTabs extends HtmlElementNode {
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
export const vMenu: ElementFactory<VMenu>;
export const vMenuDivider: ElementFactory<VMenuDivider>;
export const vMenuGroup: ElementFactory<VMenuGroup>;
export const vMenuItem: ElementFactory<VMenuItem>;
export const vMenuWrapper: ElementFactory<VMenuWrapper>;
export const vNavbar: {
  (
    first?: NavbarOptions | SetupCallback<VNavbar> | null,
    callback?: SetupCallback<VNavbar>
  ): VNavbar;
} & ElementFactory<VNavbar>;
export const vSidebar: ElementFactory<VSidebar>;
export const vStep: {
  (first?: StepItemOptions | SetupInput<VStep> | null, callback?: SetupCallback<VStep>): VStep;
} & ElementFactory<VStep>;
export const vSteps: {
  (first?: StepsOptions | SetupCallback<VSteps> | null, callback?: SetupCallback<VSteps>): VSteps;
} & ElementFactory<VSteps>;
export const vSubMenu: ElementFactory<VSubMenu>;
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
  vMenu(first?: SetupInput<VMenu> | null, callback?: SetupCallback<VMenu>): VMenu;
  vMenuDivider(
    first?: SetupInput<VMenuDivider> | null,
    callback?: SetupCallback<VMenuDivider>
  ): VMenuDivider;
  vMenuGroup(
    first?: SetupInput<VMenuGroup> | null,
    callback?: SetupCallback<VMenuGroup>
  ): VMenuGroup;
  vMenuItem(first?: SetupInput<VMenuItem> | null, callback?: SetupCallback<VMenuItem>): VMenuItem;
  vNavbar(
    first?: NavbarOptions | SetupCallback<VNavbar> | null,
    callback?: SetupCallback<VNavbar>
  ): VNavbar;
  vSidebar(first?: SetupInput<VSidebar> | null, callback?: SetupCallback<VSidebar>): VSidebar;
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
