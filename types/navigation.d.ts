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

/** Anchor navigation with scroll tracking. */
export class VAnchor extends HtmlElementNode {
  ariaLabel(content: ChildInput): VAnchor;
  offset(): number;
  offset(value: number): VAnchor;
  target(): string;
  target(value: string | Element): VAnchor;
  items(value: Array<string | VAnchorItem | AnchorItemOptions>): VAnchor;
  child(...children: ChildInput[]): this;
  active(): string;
  active(value: string): VAnchor;
  activeHref(): string;
  activeHref(value: string): VAnchor;
}

export interface AnchorItemOptions {
  title?: ChildInput;
  href?: string;
  children?: Array<string | VAnchorItem | AnchorItemOptions>;
  [key: string]: any;
}

export class VAnchorItem extends HtmlElementNode {
  title(content?: ChildInput): this;
  text(content?: ChildInput): this;
  label(content?: ChildInput): this;
  href(value: string): VAnchorItem;
  nested(setup: SetupInput<HtmlElementNode>): VAnchorItem;
  subItems(setup: SetupInput<HtmlElementNode>): VAnchorItem;
  active(value?: boolean): VAnchorItem;
}

/** Breadcrumb navigation. */
export class VBreadcrumb extends HtmlElementNode {
  ariaLabel(content: ChildInput): VBreadcrumb;
  separator(content: ChildInput): VBreadcrumb;
  items(value: Array<string | VBreadcrumbItem | BreadcrumbItemOptions>): VBreadcrumb;
  child(...children: ChildInput[]): this;
}

export interface BreadcrumbItemOptions {
  label?: ChildInput;
  href?: string;
  active?: boolean;
  [key: string]: any;
}

export class VBreadcrumbItem extends HtmlElementNode {
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  content(content: ChildInput): VBreadcrumbItem;
  href(value: string): VBreadcrumbItem;
  to(value: string): VBreadcrumbItem;
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

/** Top navigation bar. */
export class VNavbar extends HtmlElementNode {
  ariaLabel(content: ChildInput): VNavbar;
  sticky(value?: boolean): VNavbar;
  title(content?: ChildInput): this;
  subtitle(content: ChildInput): VNavbar;
  brand(setup: SetupInput<HtmlElementNode>): VNavbar;
  menuContent(setup: SetupInput<HtmlElementNode>): VNavbar;
  actions(setup: SetupInput<HtmlElementNode>): VNavbar;
}

export interface StepItemOptions {
  title?: ChildInput;
  description?: ChildInput;
  icon?: ChildInput;
  status?: StepStatus;
  [key: string]: any;
}

/** Step indicator. */
export class VStep extends HtmlElementNode {
  title(content?: ChildInput): this;
  text(content?: ChildInput): this;
  description(content: ChildInput): VStep;
  desc(content: ChildInput): VStep;
  icon(content: ChildInput): VStep;
  status(): StepStatus | null;
  status(value: StepStatus | null): VStep;
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
  items(value: Array<string | VStep | StepItemOptions>): VSteps;
  next(): VSteps;
  prev(): VSteps;
  child(...children: ChildInput[]): this;
}

export interface TabItemOptions {
  key?: string;
  label?: ChildInput;
  content?: ChildInput | SetupCallback<HtmlElementNode>;
  disabled?: boolean;
  [key: string]: any;
}

/** Single tab. */
export class VTab extends HtmlElementNode {
  key(): string;
  key(value: string): VTab;
  value(): unknown;
  value(value: unknown): VTab;
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  title(content?: ChildInput): this;
  icon(content: ChildInput): VTab;
  content(setup: ChildInput | SetupCallback<HtmlElementNode>): VTab;
  disabled(value: boolean): VTab;
  active(value: boolean): VTab;
}

/** Tab group with selection state. */
export class VTabs extends HtmlElementNode {
  children(): HtmlElementNode[];
  items(value: Array<string | VTab | TabItemOptions>): VTabs;
  child(...children: ChildInput[]): this;
  active(): string | number;
  active(value: string | number): VTabs;
  activeIndex(): number;
  activeIndex(value: number): VTabs;
  ariaLabel(content: ChildInput): VTabs;
  orientation(): TabsOrientation;
  orientation(value: TabsOrientation): VTabs;
  variant(): TabsVariant;
  variant(value: TabsVariant): VTabs;
  size(): TabsSize;
  size(value: TabsSize): VTabs;
  change(): ((key: string | number, index: number) => void) | null;
  change(handler: ((key: string | number, index: number) => void) | null): VTabs;
  onChange(handler: ((key: string | number, index: number) => void) | null): VTabs;
  next(): VTabs;
  prev(): VTabs;
}

export const vAnchor: ElementFactory<VAnchor>;
export const vAnchorItem: ElementFactory<VAnchorItem>;
export const vBreadcrumb: ElementFactory<VBreadcrumb>;
export const vBreadcrumbItem: ElementFactory<VBreadcrumbItem>;
export const vMenu: ElementFactory<VMenu>;
export const vMenuDivider: ElementFactory<VMenuDivider>;
export const vMenuGroup: ElementFactory<VMenuGroup>;
export const vMenuItem: ElementFactory<VMenuItem>;
export const vNavbar: ElementFactory<VNavbar>;
export const vSidebar: ElementFactory<VSidebar>;
export const vStep: ElementFactory<VStep>;
export const vSteps: ElementFactory<VSteps>;
export const vSubMenu: ElementFactory<VSubMenu>;
export const vTab: ElementFactory<VTab>;
export const vTabs: ElementFactory<VTabs>;

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface NavigationParentShortcuts {
  vAnchor(first?: SetupInput<VAnchor> | null, callback?: SetupCallback<VAnchor>): VAnchor;
  vAnchorItem(
    first?: SetupInput<VAnchorItem> | null,
    callback?: SetupCallback<VAnchorItem>
  ): VAnchorItem;
  vBreadcrumb(
    first?: SetupInput<VBreadcrumb> | null,
    callback?: SetupCallback<VBreadcrumb>
  ): VBreadcrumb;
  vBreadcrumbItem(
    first?: SetupInput<VBreadcrumbItem> | null,
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
  vNavbar(first?: SetupInput<VNavbar> | null, callback?: SetupCallback<VNavbar>): VNavbar;
  vSidebar(first?: SetupInput<VSidebar> | null, callback?: SetupCallback<VSidebar>): VSidebar;
  vStep(first?: SetupInput<VStep> | null, callback?: SetupCallback<VStep>): VStep;
  vSteps(first?: SetupInput<VSteps> | null, callback?: SetupCallback<VSteps>): VSteps;
  vSubMenu(first?: SetupInput<VSubMenu> | null, callback?: SetupCallback<VSubMenu>): VSubMenu;
  vTab(first?: SetupInput<VTab> | null, callback?: SetupCallback<VTab>): VTab;
  vTabs(first?: SetupInput<VTabs> | null, callback?: SetupCallback<VTabs>): VTabs;
}

export type { ElementOptions };
