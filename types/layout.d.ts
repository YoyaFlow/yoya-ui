import type {
  ChildInput,
  ElementFactory,
  ElementOptions,
  SetupCallback,
  SetupInput,
  StyleValue
} from './core.js';
import type { HtmlElementNode } from './html.js';

// ---------------------------------------------------------------------------
// Layout option types
// ---------------------------------------------------------------------------

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type FlexWrap = boolean | 'wrap' | 'nowrap' | 'wrap-reverse';
export type Length = string | number;

export interface FlexOptions {
  align?: string;
  direction?: FlexDirection;
  wrap?: FlexWrap;
  gap?: Length;
  justify?: string;
}

export interface GridOptions {
  gap?: Length;
  autoFlow?: string;
  areas?: string;
  columns?: number | string;
  rows?: number | string;
}

export interface ContainerOptions {
  maxWidth?: Length;
  padding?: Length;
  paddingInline?: Length;
}

export interface SpacerOptions {
  size?: Length;
  orientation?: 'horizontal' | 'vertical';
}

export interface DividerOptions {
  orientation?: 'horizontal' | 'vertical';
}

export interface ColProps {
  span?: number;
  offset?: number;
  push?: number;
  pull?: number;
}

export type ColBreakpoint = number | ColProps;

export interface ColOptions extends ColProps {
  gutter?: Length;
  xs?: ColBreakpoint;
  sm?: ColBreakpoint;
  md?: ColBreakpoint;
  lg?: ColBreakpoint;
  xl?: ColBreakpoint;
}

export interface RowOptions {
  gutter?: Length;
  align?: string;
  justify?: string;
  wrap?: FlexWrap;
}

export interface ResponsiveGridBreakpoint {
  minWidth: number | string;
  columns: number;
}

export interface ResponsiveGridOptions {
  gap?: Length;
  minColumnWidth?: Length;
  breakpoints?: ResponsiveGridBreakpoint[] | Record<string, number>;
}

export interface VBodyOptions {
  background?: string;
  maxWidth?: Length;
  padding?: Length;
  gap?: Length;
  minHeight?: Length;
  content?: ChildInput;
  children?: ChildInput;
}

export interface ContainerLayoutOptions {
  direction?: FlexDirection;
  gap?: Length;
  viewport?: boolean;
  fill?: boolean;
  scrollable?: boolean;
}

export interface MobileLayoutOptions {
  align?: string;
  wrap?: FlexWrap;
  justify?: string;
  direction?: FlexDirection;
  mobileDirection?: FlexDirection;
  gap?: Length;
  mobileGap?: Length;
  breakpoint?: number;
  asideWidth?: Length;
  drawer?: boolean;
  viewport?: boolean;
  safeArea?: boolean;
}

export interface RegionOptions {
  height?: Length;
  width?: Length;
  size?: Length;
}

export type SplitPanelDirection = 'horizontal' | 'vertical';

/** Split panel with a draggable divider. */
export class VSplitPanel extends HtmlElementNode {
  direction(): SplitPanelDirection;
  direction(value: SplitPanelDirection): VSplitPanel;
  size(): string;
  size(value: Length): VSplitPanel;
  minSize(): number;
  minSize(value: number): VSplitPanel;
  reset(): VSplitPanel;
  first(setup: ChildInput | SetupCallback<HtmlElementNode>): VSplitPanel;
  second(setup: ChildInput | SetupCallback<HtmlElementNode>): VSplitPanel;
}

// ---------------------------------------------------------------------------
// Layout node interfaces
// ---------------------------------------------------------------------------

/** 24-column row container with gutter/justify/align/wrap helpers. */
export interface VRow extends HtmlElementNode {
  gutter(): Length | null;
  gutter(value: Length): VRow;
  justify(): StyleValue | undefined;
  justify(value: string): VRow;
  align(): StyleValue | undefined;
  align(value: string): VRow;
  wrap(): StyleValue | undefined;
  wrap(value: FlexWrap | null): VRow;
  child(...children: ChildInput[]): this;
}

/** Responsive 24-column cell: span/offset/push/pull with breakpoints. */
export interface VCol extends HtmlElementNode {
  refresh(): VCol;
  span(): number;
  span(value: number): VCol;
  offset(): number;
  offset(value: number): VCol;
  push(): number;
  push(value: number): VCol;
  pull(): number;
  pull(value: number): VCol;
  gutter(): Length | null;
  gutter(value: Length): VCol;
}

/** Responsive grid that swaps column counts at breakpoints. */
export interface ResponsiveGrid extends HtmlElementNode {
  refresh(): ResponsiveGrid;
  minColumnWidth(): string;
  minColumnWidth(value: Length): ResponsiveGrid;
  breakpoints(): ResponsiveGridBreakpoint[];
  breakpoints(value: ResponsiveGridBreakpoint[] | Record<string, number>): ResponsiveGrid;
}

/** Page body shell with themed defaults and a content slot. */
export interface VBody extends HtmlElementNode {
  background(): StyleValue | undefined;
  background(value: string): VBody;
  maxWidth(): StyleValue | undefined;
  maxWidth(value: Length): VBody;
  padding(): StyleValue | undefined;
  padding(value: Length): VBody;
  gap(): StyleValue | undefined;
  gap(value: Length): VBody;
  minHeight(): StyleValue | undefined;
  minHeight(value: Length): VBody;
  content(): HtmlElementNode;
  content(value: ChildInput | SetupCallback<HtmlElementNode>): VBody;
  child(...children: ChildInput[]): this;
}

/** Flex container with viewport/fill/scrollable/direction helpers. */
export interface VContainer extends HtmlElementNode {
  viewport(): boolean;
  viewport(value?: boolean): VContainer;
  fill(): boolean;
  fill(value?: boolean): VContainer;
  scrollable(): boolean;
  scrollable(value?: boolean): VContainer;
  direction(): FlexDirection;
  direction(value: FlexDirection): VContainer;
  child(...children: ChildInput[]): this;
}

/** Responsive layout shell with an aside drawer for small screens. */
export interface MobileLayout extends HtmlElementNode {
  refresh(): MobileLayout;
  breakpoint(): number;
  breakpoint(value: number): MobileLayout;
  direction(): FlexDirection;
  direction(desktop: FlexDirection, mobile?: FlexDirection): MobileLayout;
  mobileDirection(): FlexDirection;
  mobileDirection(value: FlexDirection): MobileLayout;
  gap(): Length;
  gap(desktop: Length, mobile?: Length): MobileLayout;
  mobileGap(): Length;
  mobileGap(value: Length): MobileLayout;
  asideWidth(): Length;
  asideWidth(value: Length): MobileLayout;
  viewport(): boolean;
  viewport(value?: boolean): MobileLayout;
  safeArea(): boolean;
  safeArea(value?: boolean): MobileLayout;
  drawer(): boolean;
  drawer(value?: boolean): MobileLayout;
  asideOpen(): boolean;
  asideOpen(value: boolean): MobileLayout;
  openAside(): MobileLayout;
  closeAside(): MobileLayout;
  toggleAside(): MobileLayout;
  mobile(): boolean;
  child(...children: ChildInput[]): this;
}

/** Sticky header/footer region. */
export interface VHeader extends HtmlElementNode {
  sticky(): boolean;
  sticky(value?: boolean): VHeader;
}

/** Scrollable aside region. */
export interface VAside extends HtmlElementNode {
  scrollable(): boolean;
  scrollable(value?: boolean): VAside;
}

/** Main scrollable region. */
export interface VMain extends HtmlElementNode {
  scrollable(): boolean;
  scrollable(value?: boolean): VMain;
}

/** Sticky footer region. */
export interface VFooter extends HtmlElementNode {
  sticky(): boolean;
  sticky(value?: boolean): VFooter;
}

/** Spacer with optional size and orientation. */
export interface Spacer extends HtmlElementNode {
  size?: Length;
  orientation?: 'horizontal' | 'vertical';
}

/** Divider separator. */
export interface Divider extends HtmlElementNode {
  orientation?: 'horizontal' | 'vertical';
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export interface LayoutFactory<N extends HtmlElementNode, O> extends ElementFactory<N> {
  (options: O, callback?: SetupCallback<N>): N;
}

/** Flex container (display: flex). */
export const flex: LayoutFactory<HtmlElementNode, FlexOptions>;
/** Column flex stack. */
export const stack: LayoutFactory<HtmlElementNode, FlexOptions>;
/** Vertical stack (alias of stack). */
export const vstack: LayoutFactory<HtmlElementNode, FlexOptions>;
/** Horizontal stack. */
export const hstack: LayoutFactory<HtmlElementNode, FlexOptions>;
/** Centered flex container. */
export const center: LayoutFactory<HtmlElementNode, FlexOptions>;

/** CSS grid container. */
export const grid: LayoutFactory<HtmlElementNode, GridOptions>;
/** Responsive grid with breakpoints. */
export const responsiveGrid: LayoutFactory<ResponsiveGrid, ResponsiveGridOptions>;

/** 24-column row container. */
export const vRow: LayoutFactory<VRow, RowOptions>;
/** 24-column cell with responsive breakpoints. */
export const vCol: LayoutFactory<VCol, ColOptions>;

/** Page body shell with themed surface defaults. */
export const vBody: LayoutFactory<VBody, VBodyOptions>;
/** Creates a vBody page and optionally binds it to a target. */
export function createVBodyPage(
  setup?: SetupInput<VBody> | null,
  target?: string | ParentNode
): VBody;

/** Max-width centered container. */
export const container: LayoutFactory<HtmlElementNode, ContainerOptions>;
/** Flex container with viewport/fill/scrollable helpers. */
export const vContainer: LayoutFactory<VContainer, ContainerLayoutOptions>;

/** Responsive desktop/mobile layout with aside drawer. */
export const mobileLayout: LayoutFactory<MobileLayout, MobileLayoutOptions>;
/** Alias of mobileLayout. */
export const vMobileLayout: typeof mobileLayout;

/** Header region with sticky support. */
export const vHeader: LayoutFactory<VHeader, RegionOptions>;
/** Aside region with scrollable support. */
export const vAside: LayoutFactory<VAside, RegionOptions>;
/** Main region with scrollable support. */
export const vMain: LayoutFactory<VMain, RegionOptions>;
/** Footer region with sticky support. */
export const vFooter: LayoutFactory<VFooter, RegionOptions>;

/** Flexible spacer. */
export const spacer: LayoutFactory<Spacer, SpacerOptions>;
/** Divider separator. */
export const divider: LayoutFactory<Divider, DividerOptions>;

/** Split panel with a draggable divider. */
export const vSplitPanel: ElementFactory<VSplitPanel> & {
  (first?: SetupInput<VSplitPanel> | null, callback?: SetupCallback<VSplitPanel>): VSplitPanel;
};

/** Masonry layout built on CSS multi-columns with configurable columns and gap. */
export class VMasonry extends HtmlElementNode {
  columns(): number;
  columns(value: number): VMasonry;
  gap(): number;
  gap(value: number): VMasonry;
  minColumnWidth(): number | null;
  minColumnWidth(value: number | null): VMasonry;
}

export const vMasonry: ElementFactory<VMasonry> & {
  (first?: SetupInput<VMasonry> | null, callback?: SetupCallback<VMasonry>): VMasonry;
};

// ---------------------------------------------------------------------------
// Theme shell
// ---------------------------------------------------------------------------

/**
 * Themed generic container: background, border, radius and text color driven
 * by --yoya-* tokens, with scroll and background-opacity control.
 */
export class VThemeShell extends HtmlElementNode {
  /** Virtual mode renders the shell's styles onto its single child instead of its own DOM node. */
  virtual(next?: boolean): VThemeShell;
  background(): StyleValue | undefined;
  background(value: string | null): VThemeShell;
  backgroundOpacity(alpha: number | string): VThemeShell;
  radius(): StyleValue | undefined;
  radius(value: string | number | null): VThemeShell;
  border(): StyleValue | undefined;
  border(value: string | null): VThemeShell;
  borderColor(): StyleValue | undefined;
  borderColor(value: string | null): VThemeShell;
  scrollable(next?: boolean): VThemeShell;
}

/** Creates a themed shell container. */
export const vThemeShell: ElementFactory<VThemeShell>;

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface LayoutParentShortcuts {
  flex(
    first?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  stack(
    first?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  vstack(
    first?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  hstack(
    first?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  center(
    first?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  grid(
    first?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  responsiveGrid(
    first?: SetupInput<ResponsiveGrid> | null,
    callback?: SetupCallback<ResponsiveGrid>
  ): ResponsiveGrid;
  vRow(first?: SetupInput<VRow> | null, callback?: SetupCallback<VRow>): VRow;
  vCol(first?: SetupInput<VCol> | null, callback?: SetupCallback<VCol>): VCol;
  vBody(first?: SetupInput<VBody> | null, callback?: SetupCallback<VBody>): VBody;
  container(
    first?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  vContainer(
    first?: SetupInput<VContainer> | null,
    callback?: SetupCallback<VContainer>
  ): VContainer;
  mobileLayout(
    first?: SetupInput<MobileLayout> | null,
    callback?: SetupCallback<MobileLayout>
  ): MobileLayout;
  vMobileLayout(
    first?: SetupInput<MobileLayout> | null,
    callback?: SetupCallback<MobileLayout>
  ): MobileLayout;
  vHeader(first?: SetupInput<VHeader> | null, callback?: SetupCallback<VHeader>): VHeader;
  vAside(first?: SetupInput<VAside> | null, callback?: SetupCallback<VAside>): VAside;
  vMain(first?: SetupInput<VMain> | null, callback?: SetupCallback<VMain>): VMain;
  vFooter(first?: SetupInput<VFooter> | null, callback?: SetupCallback<VFooter>): VFooter;
  spacer(first?: SetupInput<Spacer> | null, callback?: SetupCallback<Spacer>): Spacer;
  divider(first?: SetupInput<Divider> | null, callback?: SetupCallback<Divider>): Divider;
  vSplitPanel(
    first?: SetupInput<VSplitPanel> | null,
    callback?: SetupCallback<VSplitPanel>
  ): VSplitPanel;
  vMasonry(first?: SetupInput<VMasonry> | null, callback?: SetupCallback<VMasonry>): VMasonry;
}

export type { ElementOptions, SetupInput };
