import type {
  ComponentNode,
  ChildInput,
  ElementFactory,
  ElementOptions,
  KeyItem,
  PropValue,
  SignalHandle,
  SetupCallback,
  SetupInput,
  ViewNode
} from '@yoyaflow/yoya-core/internal/types/core.js';
import type { HtmlElementNode } from '@yoyaflow/yoya-core/internal/types/html.js';

// ---------------------------------------------------------------------------
// Avatar / Badge / Card / Code
// ---------------------------------------------------------------------------

/** `VAvatar({ … })` 的**直接参数**（= 组件自己的 props；`...rest` 按键分类透传到视图根）。 */
export interface AvatarOptions {
  alt?: ChildInput;
  children?: ChildInput;
  color?: PropValue<string | null>;
  content?: ChildInput;
  icon?: ChildInput;
  shape?: 'circle' | 'square' | string;
  size?: number | string;
  src?: PropValue<string | null>;
  status?: PropValue<string | null>;
  text?: ChildInput;
  /** 元素级配置（`class` / `style` / `onXxx` / `data-*` / `attrs` …）照旧透传。 */
  [key: string]: unknown;
}

/** 头像组件句柄：自己的命令面 + 引擎委托的元素面 / 子工厂（见 `ComponentNode`）。 */
export interface VAvatar extends ComponentNode {
  text(value?: ChildInput): this;
  content(value: ChildInput): VAvatar;
  icon(value: ChildInput): VAvatar;
  src(value: string): VAvatar;
  alt(value: string): VAvatar;
  size(): number | string;
  size(value: number | string): VAvatar;
  shape(): string;
  shape(value: 'circle' | 'square' | string): VAvatar;
  color(value: string): VAvatar;
  status(value: string): VAvatar;
}

export const VAvatar: { (props?: AvatarOptions): VAvatar };

/** `VBadge({ … })` 的**直接参数**（= 组件自己的 props；`...rest` 按键分类透传到视图根）。 */
export interface BadgeOptions {
  children?: ChildInput;
  color?: PropValue<string | null>;
  content?: ChildInput;
  count?: PropValue<number | string | null>;
  dot?: PropValue<boolean>;
  label?: ChildInput;
  offset?: PropValue<Array<number | string> | { x?: number | string; y?: number | string }>;
  overflowCount?: PropValue<number>;
  showZero?: PropValue<boolean>;
  status?: PropValue<string | null>;
  text?: ChildInput;
  title?: PropValue<ChildInput | null>;
  /** 元素级配置（`class` / `style` / `onXxx` / `data-*` / `attrs` …）照旧透传。 */
  [key: string]: unknown;
}

/** 徽标组件句柄：自己的命令面 + 引擎委托的元素面 / 子工厂（见 `ComponentNode`）。 */
export interface VBadge extends ComponentNode {
  child(...children: ChildInput[]): this;
  content(value: ChildInput): VBadge;
  count(): number;
  count(value: number): VBadge;
  overflowCount(): number;
  overflowCount(value: number): VBadge;
  showZero(value: boolean): VBadge;
  dot(value: boolean): VBadge;
  status(): string;
  status(value: string): VBadge;
  color(value: string): VBadge;
  text(value?: ChildInput): this;
  label(value?: ChildInput): this;
  title(value?: ChildInput): this;
  offset(value: Array<number | string>): VBadge;
}

/**
 * 组件定义函数（身份名 = 导出名）：**直接参数 = 组件自己的 props**，调用即得到组件节点。
 * **不给 `new` 签名**：`instanceof VBadge` 不是承诺的用法（身份判定用 `componentNameOf` /
 * `hasComponentIdentity`），构造签名从 0.7.0 起退场。
 */
export const VBadge: { (props?: BadgeOptions): VBadge };

/**
 * 卡片句柄：部件投递命令 + 引擎委托的元素面。
 *
 * 定义函数**没有 props**（`VCard()` 只建结构）；元素级选项走快捷方法
 * （`vCard({ class, style, onXxx })`），部件（header / body / footer）走命令投递、`vn_slot` 决定落位。
 */
export interface VCard extends ComponentNode {
  child(...children: ChildInput[]): this;
}

/** 卡片部件（A 形态薄工厂，返回元素节点）：位置由自己的 `vn_slot` 定。 */
export interface VCardHeader extends HtmlElementNode {}
export interface VCardBody extends HtmlElementNode {}
export interface VCardFooter extends HtmlElementNode {}

export const VCard: { (): VCard };
export const VCardHeader: { (): VCardHeader };
export const VCardBody: { (): VCardBody };
export const VCardFooter: { (): VCardFooter };

/** `VCode({ … })` 的**直接参数**。 */
export interface CodeOptions {
  children?: ChildInput;
  content?: ChildInput;
  copyLabel?: ChildInput;
  copyable?: PropValue<boolean>;
  language?: PropValue<string | null>;
  text?: ChildInput;
  [key: string]: unknown;
}

export interface VCode extends ComponentNode {
  content(content: ChildInput): VCode;
  text(content?: ChildInput): this;
  language(value: string): VCode;
  copyable(value?: boolean): VCode;
  copyLabel(value: ChildInput): VCode;
}

export const VCode: { (props?: CodeOptions): VCode };

/** `CodeBlock` = `VCode` 的别名形态（多值身份 `CodeBlock VCode`），props 与命令面同 `VCode`。 */
export interface CodeBlock extends VCode {}

export const CodeBlock: { (props?: CodeOptions): CodeBlock };

// ---------------------------------------------------------------------------
// Detail / Digital board
// ---------------------------------------------------------------------------

/** `vDetail({ … })` 的可派发键（定义函数无 props，键由节点 setupObject 分派到命令）。 */
export interface DetailOptions {
  column?: PropValue<number>;
  columns?: PropValue<number>;
  items?: Array<string | VDetailItem | DetailItemOptions>;
  [key: string]: unknown;
}

export interface VDetail extends ComponentNode {
  columns(): number;
  columns(value: number): VDetail;
  column(value: number): VDetail;
  items(value: Array<string | VDetailItem | DetailItemOptions>): VDetail;
}

export const VDetail: { (): VDetail };

export interface DetailItemOptions {
  label?: ChildInput;
  value?: ChildInput;
  text?: ChildInput;
  content?: ChildInput;
  children?: ChildInput;
  [key: string]: unknown;
}

export interface VDetailItem extends ComponentNode {
  label(content?: ChildInput): this;
  value(content: ChildInput): VDetailItem;
  content(content: ChildInput): VDetailItem;
}

export const VDetailItem: { (): VDetailItem };

/** `vDigitalBoard({ … })` 的可派发键。 */
export interface DigitalBoardOptions {
  columns?: PropValue<number>;
  [key: string]: unknown;
}

export interface VDigitalBoard extends ComponentNode {
  columns(): number;
  columns(value: number): VDigitalBoard;
}

export const VDigitalBoard: { (): VDigitalBoard };

/** `vDigitalBoardItem({ … })` 的可派发键。 */
export interface DigitalBoardItemOptions {
  icon?: ChildInput;
  label?: ChildInput;
  tone?: PropValue<string>;
  trend?: PropValue<number | string>;
  trendUp?: PropValue<boolean>;
  unit?: ChildInput;
  value?: ChildInput;
  [key: string]: unknown;
}

export interface VDigitalBoardItem extends ComponentNode {
  label(content?: ChildInput): this;
  value(content: ChildInput): VDigitalBoardItem;
  unit(content: ChildInput): VDigitalBoardItem;
  trend(): number;
  trend(value: number): VDigitalBoardItem;
  trendUp(value: boolean): VDigitalBoardItem;
  tone(value: string): VDigitalBoardItem;
  icon(content: ChildInput): VDigitalBoardItem;
}

export const VDigitalBoardItem: { (): VDigitalBoardItem };

// ---------------------------------------------------------------------------
// Charts / gauges / stats
// ---------------------------------------------------------------------------

/** `VGauge({ … })` 的直接参数。 */
export interface GaugeOptions {
  max?: PropValue<number>;
  tone?: PropValue<string>;
  unit?: ChildInput;
  value?: PropValue<number>;
  [key: string]: unknown;
}

export interface VGauge extends ComponentNode {
  value(): number;
  value(value: number): VGauge;
  max(): number;
  max(value: number): VGauge;
  unit(content: ChildInput): VGauge;
  tone(value: string): VGauge;
}

export const VGauge: { (props?: GaugeOptions): VGauge };

/** `VRingStat({ … })` 的直接参数。 */
export interface RingStatOptions {
  label?: ChildInput;
  percent?: PropValue<number>;
  size?: PropValue<number | string>;
  strokeWidth?: PropValue<number>;
  tone?: PropValue<string>;
  value?: PropValue<number>;
  [key: string]: unknown;
}

export interface VRingStat extends ComponentNode {
  percent(): number;
  percent(value: number): VRingStat;
  value(): number;
  value(value: number): VRingStat;
  label(content?: ChildInput): this;
  size(): number | string;
  size(value: number | string): VRingStat;
  strokeWidth(): number;
  strokeWidth(value: number): VRingStat;
  tone(value: string): VRingStat;
}

export const VRingStat: { (props?: RingStatOptions): VRingStat };

/** `VSparkline({ … })` 的直接参数。 */
export interface SparklineOptions {
  data?: PropValue<Array<number>>;
  fill?: PropValue<boolean>;
  strokeWidth?: PropValue<number>;
  tone?: PropValue<string>;
  [key: string]: unknown;
}

export interface VSparkline extends ComponentNode {
  data(values?: Array<number>): this;
  fill(value: boolean): VSparkline;
  strokeWidth(value: number): VSparkline;
  tone(value: string): VSparkline;
}

export const VSparkline: { (props?: SparklineOptions): VSparkline };

/** `VChart({ … })` 的直接参数：适配器 + 数据 + 尺寸（第三方图表宿主）。 */
export interface ChartOptions {
  adapter?: PropValue<unknown>;
  data?: ChildInput;
  height?: PropValue<number | string>;
  options?: PropValue<Record<string, unknown>>;
  width?: PropValue<number | string>;
  [key: string]: unknown;
}

export interface VChart extends ComponentNode {
  adapter(value: unknown): VChart;
  data(value?: unknown): this;
  options(value: Record<string, unknown>): VChart;
  width(): number;
  width(value: number): VChart;
  height(): number;
  height(value: number): VChart;
  resize(width?: number, height?: number): VChart;
  destroy(): this;
}

export const VChart: { (props?: ChartOptions): VChart };

// ---------------------------------------------------------------------------
// Timeline / Trend card
// ---------------------------------------------------------------------------

/** `VTimeline({ … })` 的直接参数：条目走匿名内容通道（`timeline.vTimelineItem(…)`）。 */
export interface TimelineOptions {
  children?: ChildInput;
  [key: string]: unknown;
}

export interface VTimeline extends ComponentNode {}

export const VTimeline: { (props?: TimelineOptions): VTimeline };

/** `VTimelineItem({ … })` 的直接参数。 */
export interface TimelineItemOptions {
  content?: ChildInput | SetupCallback<HtmlElementNode>;
  status?: PropValue<string>;
  time?: ChildInput;
  title?: ChildInput;
  [key: string]: unknown;
}

export interface VTimelineItem extends ComponentNode {
  status(): string;
  status(value: string): VTimelineItem;
  title(content?: ChildInput): this;
  time(content?: ChildInput): this;
  content(setup: ChildInput | SetupCallback<HtmlElementNode>): VTimelineItem;
}

export const VTimelineItem: { (props?: TimelineItemOptions): VTimelineItem };

/** `VTrendCard({ … })` 的直接参数。 */
export interface TrendCardOptions {
  data?: PropValue<Array<number>>;
  delta?: PropValue<number>;
  title?: ChildInput;
  tone?: PropValue<string>;
  unit?: ChildInput;
  up?: PropValue<boolean>;
  value?: ChildInput;
  [key: string]: unknown;
}

export interface VTrendCard extends ComponentNode {
  title(content?: ChildInput): this;
  value(content: ChildInput): VTrendCard;
  unit(content: ChildInput): VTrendCard;
  delta(value: number): VTrendCard;
  up(value: boolean): VTrendCard;
  data(values?: Array<number>): this;
  tone(value: string): VTrendCard;
}

export const VTrendCard: { (props?: TrendCardOptions): VTrendCard };

// ---------------------------------------------------------------------------
// Carousel / Progress / Pagination / Scroll
// ---------------------------------------------------------------------------

/** `vCarousel({ … })` 的可派发键（定义函数无 props）。 */
export interface CarouselOptions {
  active?: PropValue<number>;
  arrows?: PropValue<boolean>;
  autoplay?: PropValue<boolean>;
  children?: Array<unknown>;
  dots?: PropValue<boolean>;
  height?: PropValue<string | number>;
  interval?: PropValue<number>;
  items?: Array<unknown>;
  loop?: PropValue<boolean>;
  renderItem?: (item: unknown, index: number) => ChildInput;
  slides?: Array<unknown>;
  [key: string]: unknown;
}

export interface VCarousel extends ComponentNode {
  slides(value: Array<unknown>, render?: (item: unknown, index: number) => ChildInput): VCarousel;
  items(value: Array<unknown>, render?: (item: unknown, index: number) => ChildInput): VCarousel;
  renderItem(handler: (item: unknown, index: number) => ChildInput): VCarousel;
  active(): number;
  active(value: number): VCarousel;
  goTo(value: number): VCarousel;
  next(): VCarousel;
  prev(): VCarousel;
  loop(value: boolean): VCarousel;
  autoplay(value: boolean): VCarousel;
  start(): VCarousel;
  stop(): VCarousel;
  interval(): number;
  interval(value: number): VCarousel;
  arrows(value: boolean): VCarousel;
  dots(value: boolean): VCarousel;
  height(value: string | number): VCarousel;
}

export const VCarousel: { (): VCarousel };

/** `vProgress({ … })` 的可派发键（定义函数无 props）。 */
export interface ProgressOptions {
  active?: PropValue<boolean>;
  ariaLabel?: ChildInput;
  format?: (percent: number) => ChildInput;
  indeterminate?: PropValue<boolean>;
  label?: ChildInput;
  max?: PropValue<number>;
  percent?: PropValue<number>;
  showText?: PropValue<boolean>;
  size?: PropValue<string>;
  status?: PropValue<string>;
  strokeColor?: PropValue<string>;
  text?: ChildInput;
  value?: PropValue<number>;
  [key: string]: unknown;
}

export interface VProgress extends ComponentNode {
  value(): number;
  value(value: number): VProgress;
  max(): number;
  max(value: number): VProgress;
  percent(): number;
  percent(value: number): VProgress;
  showText(value: boolean): VProgress;
  label(content?: ChildInput): this;
  text(content?: ChildInput): this;
  format(handler: (percent: number) => ChildInput): VProgress;
  status(): string;
  status(value: string): VProgress;
  size(): string;
  size(value: string): VProgress;
  strokeColor(value: string): VProgress;
  indeterminate(value: boolean): VProgress;
  active(value: boolean): VProgress;
  ariaLabel(content: ChildInput): VProgress;
}

export const VProgress: { (): VProgress };

export interface PaginationOptions {
  page?: PropValue<number>;
  pageSize?: PropValue<number>;
  pageSizes?: PropValue<Array<number | { label: string; value: number }>>;
  total?: PropValue<number>;
  totalPages?: PropValue<number>;
  ariaLabel?: ChildInput;
  [key: string]: unknown;
}

/** 分页句柄：自己的命令面 + 引擎委托的元素面 / 子工厂（见 `ComponentNode`）。 */
export interface VPagination extends ComponentNode {
  change(): ((page: number, pageSize: number) => void) | null;
  change(handler: ((page: number, pageSize: number) => void) | null): VPagination;
  onChange(handler: ((page: number, pageSize: number) => void) | null): VPagination;
  page(): number;
  page(value: number): VPagination;
  pageSize(): number;
  pageSize(value: number): VPagination;
  pageSizes(): Array<{ label: string; value: number }>;
  pageSizes(value: Array<number | { label: string; value: number }>): VPagination;
  total(): number;
  total(value: number): VPagination;
  totalPages(): number;
  totalPages(value: number): VPagination;
  update(result?: Partial<PaginationOptions>): VPagination;
}

/** @deprecated 旧名（对象组件时代的叫法），等同 `VPagination`。 */
export type PaginationComponent = VPagination;

/**
 * `vScroll({ … })` 的 props——只收数据 + 元素选项；本组件的键走命令，其余按引擎的元素分派落视图根。
 */
export interface ScrollOptions {
  /** 列表数据（`items` / `append` 的数据口径）。 */
  items?: Array<unknown>;
  /** 静态内容通道（与 `items` 互斥，`items` 覆盖它）。 */
  content?: ChildInput | SetupCallback<HtmlElementNode>;
  /** `content` 的兼容别名。 */
  children?: ChildInput | SetupCallback<HtmlElementNode>;
  renderItem?: (item: unknown, index: number, scroll?: unknown) => ChildInput;
  loadMore?: (context: unknown) => unknown;
  onLoadMore?: (context: unknown) => unknown;
  virtual?: boolean | null;
  itemHeight?: number;
  overscan?: number;
  threshold?: number;
  page?: number;
  block?: boolean;
  blocked?: boolean;
  loop?: boolean;
  loading?: boolean;
  loadingText?: ChildInput;
  endText?: ChildInput;
  reset?: boolean;
  [key: string]: unknown;
}

export interface VScroll extends ComponentNode {
  content(setup: ChildInput | SetupCallback<HtmlElementNode>): VScroll;
  items(): Array<unknown>;
  items(value: Array<unknown>, render?: (item: unknown, index: number) => ChildInput): VScroll;
  append(value: Array<unknown>, render?: (item: unknown, index: number) => ChildInput): VScroll;
  renderItem(handler: (item: unknown, index: number) => ChildInput): VScroll;
  loadMore(handler: () => void): VScroll;
  onLoadMore(handler: () => void): VScroll;
  loop(): boolean;
  loop(value: boolean): VScroll;
  block(): boolean;
  block(value: boolean): VScroll;
  blocked(): boolean;
  blocked(value: boolean): VScroll;
  loading(): boolean;
  loading(value: boolean): VScroll;
  threshold(): number;
  threshold(value: number): VScroll;
  virtual(): boolean;
  virtual(value: boolean): VScroll;
  virtualize(value: boolean): VScroll;
  itemHeight(): number;
  itemHeight(value: number): VScroll;
  overscan(): number;
  overscan(value: number): VScroll;
  page(): number;
  page(value: number): VScroll;
  loadingText(): ChildInput;
  loadingText(content: ChildInput): VScroll;
  endText(): ChildInput;
  endText(content: ChildInput): VScroll;
  reset(): VScroll;
  clear(): VScroll;
  load(): VScroll;
  check(): VScroll;
}

export const VScroll: { (props?: ScrollOptions): VScroll };

// ---------------------------------------------------------------------------
// Tree Ranger
// ---------------------------------------------------------------------------

export interface TreeRangerColumnContext {
  column: number;
  offset: number;
  page: number;
  pageSize: number;
  selection: unknown[];
  selections: unknown[];
}

export interface TreeRangerLoadResult {
  hasMore?: boolean;
  items: unknown[];
  pageSize?: number;
}

export interface TreeRangerColumn {
  icon?: (item: unknown, index: number) => ChildInput;
  itemText?: (item: unknown) => string;
  pageSize?: number;
  title?: ChildInput;
  load?: (
    context: TreeRangerColumnContext
  ) => Promise<TreeRangerLoadResult | unknown[]> | TreeRangerLoadResult | unknown[];
  renderItem?: (item: unknown, index: number) => ChildInput;
  itemKey?: (item: unknown) => unknown;
}

export interface TreeRangerChangePayload {
  current: number;
  detail: unknown;
  selections: unknown[];
  type: string;
}

export interface TreeRangerOptions {
  ariaLabel?: string;
  columns?: TreeRangerColumn[];
  columnWidth?: number;
  emptyText?: string;
  itemHeight?: number;
  loadingText?: string;
  minSize?: number;
  overscan?: number;
  visibleColumns?: number;
  change?: (payload: TreeRangerChangePayload) => void;
  onChange?: (payload: TreeRangerChangePayload) => void;
}

export interface TreeRanger {
  ariaLabel(value?: string): TreeRanger;
  columns(): TreeRangerColumn[];
  columns(value: TreeRangerColumn[]): TreeRanger;
  itemHeight(value?: number): number | TreeRanger;
  overscan(value?: number): number | TreeRanger;
  columnWidth(value?: number): number | TreeRanger;
  minSize(value?: number): number | TreeRanger;
  visibleColumns(value?: number): number | TreeRanger;
  selectedKeys(): unknown[];
  selectedItems(): unknown[];
  current(): number;
  back(): TreeRanger;
  reload(): TreeRanger;
  refresh(): TreeRanger;
  change(handler: (payload: TreeRangerChangePayload) => void): TreeRanger;
  onChange(handler: (payload: TreeRangerChangePayload) => void): TreeRanger;
  [key: string]: any;
}

export function vTreeRanger(
  setup?: TreeRangerColumn[] | TreeRangerOptions | SetupCallback<TreeRanger>
): TreeRanger;
export const treeRanger: typeof vTreeRanger;
export function vTreeRangerColumn(setup?: unknown): unknown;

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export interface TableColumn {
  key?: string;
  field?: string;
  label?: ChildInput;
  title?: ChildInput;
  dataIndex?: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  wrap?: boolean;
  className?: string;
  style?: Record<string, unknown>;
  render?: (row: any, index: number, column: TableColumn) => ChildInput;
  [key: string]: any;
}

/** Column input accepted by vTableWrapper: shorthand strings/tuples or a full definition. */
export type TableColumnInput = string | number | [string, ChildInput] | TableColumn;

/** Row input: any object, or a primitive value when no columns are declared. */
export type TableRowInput = any;

/** Row identity: `row.id` / `row.key` by default, or whatever `rowKey` returns. */
export type TableRowKey = (row: TableRowInput) => unknown;

/** Per-row state and commands exposed as `wrapper.item(key).api`. */
export interface TableRowApi {
  /** Row-level selection state; writing it touches no data array. */
  selected: SignalHandle<boolean>;
  select(): void;
  [key: string]: unknown;
}

/** A keySet element of a data-driven table. */
export type TableRowItem = KeyItem<TableRowInput> & { api: TableRowApi };

/** Options accepted by vTableWrapper(). */
export interface TableWrapperOptions {
  caption?: ChildInput;
  columns?: Array<TableColumnInput>;
  rows?: Array<TableRowInput>;
  emptyText?: ChildInput;
  rowKey?: TableRowKey;
}

/**
 * Structure-only table shell: sections and rows are declared by the caller.
 * Props: `caption` plus element options (class / attrs / style / onXxx …) — sections
 * (the constant `caption` / `thead` / `tbody` / `tfoot`) are filled through commands:
 * `vTable((table) => table.vThead(…))` or `table.vThead(…)` at runtime.
 */
/** `VTable({ … })` 的直接参数：只有 `caption` 是数据，结构键（`vThead` / `vTbody` / `vTr` …）走命令。 */
export interface TableOptions {
  caption?: ChildInput;
  [key: string]: unknown;
}

export interface VTable extends ComponentNode {
  caption(content?: ChildInput): this;
  child(...children: ChildInput[]): this;
  vThead(setup?: SetupInput<VThead>): VTable;
  vTbody(setup?: SetupInput<VTbody>): VTable;
  vTfoot(setup?: SetupInput<VTfoot>): VTable;
  vTr(setup?: SetupInput<VTr>): VTable;
}

export const VTable: { (props?: TableOptions): VTable };

/** Data-driven table: owns columns / rows / emptyText and per-row state. */
export interface VTableWrapper extends ComponentNode {
  caption(): ChildInput;
  caption(content: ChildInput): VTableWrapper;
  columns(): TableColumn[];
  columns(value: Array<TableColumnInput>): VTableWrapper;
  rows(): Array<TableRowInput>;
  rows(value: Array<TableRowInput>): VTableWrapper;
  emptyText(): ChildInput;
  emptyText(content: ChildInput): VTableWrapper;
  rowKey(): TableRowKey | null;
  rowKey(handler: TableRowKey | null): VTableWrapper;
  item(key: unknown): TableRowItem | undefined;
  addRow(row: TableRowInput): VTableWrapper;
  updateRow(key: unknown, patch: Record<string, unknown>): VTableWrapper;
  removeRow(key: unknown): VTableWrapper;
  clearRows(): VTableWrapper;
}

export const VTableWrapper: { (): VTableWrapper };

export interface VThead extends ComponentNode {
  vTr(setup?: SetupInput<VTr>): VThead;
}
export interface VTbody extends ComponentNode {
  vTr(setup?: SetupInput<VTr>): VTbody;
}
export interface VTfoot extends ComponentNode {
  vTr(setup?: SetupInput<VTr>): VTfoot;
}
export interface VTr extends ComponentNode {
  vTh(setup?: SetupInput<VTh>): VTr;
  vTd(setup?: SetupInput<VTd>): VTr;
}
export interface VTh extends HtmlElementNode {}
export interface VTd extends HtmlElementNode {}

export const VThead: { (): VThead };
export const VTbody: { (): VTbody };
export const VTfoot: { (): VTfoot };
export const VTr: { (): VTr };
export const VTh: { (): VTh };
export const VTd: { (): VTd };

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export interface TreeNodeOptions {
  id?: string | number;
  key?: string | number;
  label?: ChildInput;
  title?: ChildInput;
  icon?: ChildInput;
  actions?: ChildInput;
  expanded?: boolean;
  expandable?: boolean;
  selected?: boolean;
  checked?: boolean;
  disabled?: boolean;
  children?: Array<TreeNodeOptions>;
  [key: string]: any;
}

export class VTreeNode {
  constructor(setup?: TreeNodeOptions | null);
  id(value: string | number): VTreeNode;
  key(value: string | number): VTreeNode;
  label(value: ChildInput): VTreeNode;
  text(value: ChildInput): VTreeNode;
  content(value: ChildInput): VTreeNode;
  title(value: ChildInput): VTreeNode;
  actions(value: ChildInput): VTreeNode;
  icon(value: ChildInput): VTreeNode;
  expanded(value: boolean): VTreeNode;
  expandable(value: boolean): VTreeNode;
  selected(value: boolean): VTreeNode;
  checked(value: boolean): VTreeNode;
  disabled(value: boolean): VTreeNode;
  toData(): TreeNodeOptions;
  vTreeNode(value: VTreeNode | TreeNodeOptions): VTreeNode;
  node(value: VTreeNode | TreeNodeOptions): VTreeNode;
  child(...children: Array<VTreeNode | TreeNodeOptions>): VTreeNode;
}

export interface TreeOptions {
  nodes?: Array<VTreeNode | TreeNodeOptions>;
  ariaLabel?: ChildInput;
  checkable?: boolean;
  multiple?: boolean;
  selectable?: boolean;
  toggleIcon?: ChildInput;
  emptyText?: ChildInput;
  expandedKeys?: Array<string | number>;
  selectedKeys?: Array<string | number>;
  checkedKeys?: Array<string | number>;
  change?: (keys: { checked: string[]; expanded: string[]; selected: string[] }) => void;
  onSelect?: (id: string | number, node: VTreeNode) => void;
  onToggle?: (id: string | number, node: VTreeNode) => void;
  onCheck?: (id: string | number, checked: boolean, node: VTreeNode) => void;
  [key: string]: any;
}

/** 树句柄：自己的命令面 + 引擎委托的元素面 / 子工厂（见 `ComponentNode`）。 */
export interface VTree extends ComponentNode {
  change(): ((keys: { checked: string[]; expanded: string[]; selected: string[] }) => void) | null;
  change(
    handler: ((keys: { checked: string[]; expanded: string[]; selected: string[] }) => void) | null
  ): VTree;
  onChange(
    handler: ((keys: { checked: string[]; expanded: string[]; selected: string[] }) => void) | null
  ): VTree;
  checked(id: string | number): boolean;
  checked(id: string | number, value: boolean): VTree;
  checkedKeys(): string[];
  checkedKeys(value: Array<string | number>): VTree;
  check(id: string | number, value?: boolean): VTree;
  checkable(value: boolean): VTree;
  checkAll(value?: boolean): VTree;
  collapseAll(): VTree;
  collapseNode(id: string | number): VTree;
  /** 命令 `data()` 与 HTML `<data>` 子工厂同名（运行期命令遮蔽它）：声明按两者并集写。 */
  data(value: Array<VTreeNode | TreeNodeOptions> | SetupInput<HtmlElementNode>): VTree;
  emptyText(value: ChildInput): VTree;
  expandAll(): VTree;
  expandedKeys(): string[];
  expandedKeys(value: Array<string | number>): VTree;
  expandNode(id: string | number, value?: boolean): VTree;
  multiple(value: boolean): VTree;
  nodes(value: Array<VTreeNode | TreeNodeOptions>): VTree;
  vTreeNode(setup: VTreeNode | TreeNodeOptions): VTreeNode;
  node(setup: VTreeNode | TreeNodeOptions): VTreeNode;
  addNode(setup: VTreeNode | TreeNodeOptions): VTreeNode;
  onCheck(handler: (id: string | number, checked: boolean, node: VTreeNode) => void): VTree;
  onSelect(handler: (id: string | number, node: VTreeNode) => void): VTree;
  onToggle(handler: (id: string | number, node: VTreeNode) => void): VTree;
  /** 命令 `select()` 与 HTML `<select>` 子工厂同名（运行期命令遮蔽它）：声明按两者并集写。 */
  select(id?: string | number, value?: boolean): VTree;
  selectable(value: boolean): VTree;
  selected(id: string | number): boolean;
  selected(id: string | number, value: boolean): VTree;
  selectedKeys(): string[];
  selectedKeys(value: Array<string | number>): VTree;
  toggleNode(id: string | number): VTree;
  toggleIcon(value: ChildInput, expandedValue?: ChildInput): VTree;
  update(value: Partial<TreeOptions>): VTree;
}

/** @deprecated 旧名（对象组件时代的叫法），等同 `VTree`。 */
export type TreeComponent = VTree;

export const VTree: { (): VTree };

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export const vAvatar: ElementFactory<VAvatar> & {
  (first?: AvatarOptions | SetupInput<VAvatar> | null, callback?: SetupCallback<VAvatar>): VAvatar;
};
/** 快捷方法：建组件 + 按出现顺序分派调用方参数（对象 = props、函数 = 构建回调、文本 = 内容）。 */
export const vBadge: ElementFactory<VBadge> & {
  (first?: BadgeOptions | SetupInput<VBadge> | null, callback?: SetupCallback<VBadge>): VBadge;
};
export const vCard: ElementFactory<VCard>;
export const vCardHeader: ElementFactory<VCardHeader>;
export const vCardBody: ElementFactory<VCardBody>;
export const vCardFooter: ElementFactory<VCardFooter>;
export const vCarousel: ElementFactory<VCarousel> & {
  (
    first?: CarouselOptions | SetupInput<VCarousel> | null,
    callback?: SetupCallback<VCarousel>
  ): VCarousel;
};
export const vChart: ElementFactory<VChart> & {
  (first?: ChartOptions | SetupInput<VChart> | null, callback?: SetupCallback<VChart>): VChart;
};
export const vCode: ElementFactory<VCode> & {
  (first?: CodeOptions | SetupInput<VCode> | null, callback?: SetupCallback<VCode>): VCode;
};
export const codeBlock: ElementFactory<CodeBlock> & {
  (
    first?: CodeOptions | SetupInput<CodeBlock> | null,
    callback?: SetupCallback<CodeBlock>
  ): CodeBlock;
};
export const vDetail: ElementFactory<VDetail> & {
  (first?: DetailOptions | SetupInput<VDetail> | null, callback?: SetupCallback<VDetail>): VDetail;
};
export const vDetailItem: ElementFactory<VDetailItem> & {
  (
    first?: DetailItemOptions | SetupInput<VDetailItem> | null,
    second?: SetupInput<VDetailItem>
  ): VDetailItem;
};
export const vDigitalBoard: ElementFactory<VDigitalBoard> & {
  (
    first?: DigitalBoardOptions | SetupInput<VDigitalBoard> | null,
    callback?: SetupCallback<VDigitalBoard>
  ): VDigitalBoard;
};
export const vDigitalBoardItem: ElementFactory<VDigitalBoardItem> & {
  (
    first?: DigitalBoardItemOptions | SetupInput<VDigitalBoardItem> | null,
    callback?: SetupCallback<VDigitalBoardItem>
  ): VDigitalBoardItem;
};
export const vGauge: ElementFactory<VGauge> & {
  (first?: GaugeOptions | SetupInput<VGauge> | null, callback?: SetupCallback<VGauge>): VGauge;
};
export const vPagination: ElementFactory<VPagination> & {
  (
    first?: PaginationOptions | SetupCallback<VPagination> | null,
    callback?: SetupCallback<VPagination>
  ): VPagination;
};
export const VPagination: typeof vPagination;
export const vProgress: ElementFactory<VProgress> & {
  (
    first?: ProgressOptions | SetupInput<VProgress> | null,
    callback?: SetupCallback<VProgress>
  ): VProgress;
};
export const vRingStat: ElementFactory<VRingStat> & {
  (
    first?: RingStatOptions | SetupInput<VRingStat> | null,
    callback?: SetupCallback<VRingStat>
  ): VRingStat;
};
export const vScroll: {
  (first?: ScrollOptions | SetupInput<VScroll> | null, callback?: SetupCallback<VScroll>): VScroll;
} & ElementFactory<VScroll>;
export const vSparkline: ElementFactory<VSparkline> & {
  (
    first?: SparklineOptions | SetupInput<VSparkline> | null,
    callback?: SetupCallback<VSparkline>
  ): VSparkline;
};
export interface TreeTableColumn {
  key?: string;
  title?: ChildInput;
  dataIndex?: string;
  sorter?: boolean;
  filterOptions?: Array<{ label: ChildInput; value: string | number }>;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => ChildInput;
  editable?: boolean;
  fixed?: 'left' | 'right' | string;
  validate?: (value: unknown) => string | null | undefined;
  width?: string | number;
  [key: string]: any;
}
/** `VTreeTable({ … })` 的直接参数。 */
export interface TreeTableOptions {
  columns?: Array<string | number | TreeTableColumn>;
  expandedKeys?: PropValue<Array<string | number>>;
  lazyLoad?: (
    node: Record<string, unknown>
  ) => Array<Record<string, unknown>> | Promise<Array<Record<string, unknown>>>;
  nodes?: PropValue<Array<Record<string, unknown>>>;
  rowKey?: (node: Record<string, unknown>, index: number) => string | number;
  rowSelection?: PropValue<boolean>;
  [key: string]: unknown;
}

/** Tree table: flat rows with indent, expand/collapse, selection linkage, lazy load. */
export interface VTreeTable extends ComponentNode {
  columns(value?: Array<string | number | TreeTableColumn>): this;
  nodes(value?: Array<Record<string, any>>): this;
  rowKey(handler?: (node: Record<string, unknown>, index: number) => string | number): this;
  rowSelection(value?: boolean): boolean | VTreeTable;
  lazyLoad(
    handler?: (
      node: Record<string, unknown>
    ) => Array<Record<string, unknown>> | Promise<Array<Record<string, unknown>>>
  ): VTreeTable;
  expandedKeys(value?: Array<string>): Array<string> | VTreeTable;
  expandKeys(value?: Array<string>): VTreeTable;
  checkedKeys(value?: Array<string>): Array<string> | VTreeTable;
  expandAll(): VTreeTable;
  collapseAll(): VTreeTable;
  visibleRowCount(): number;
}

export const VTreeTable: { (props?: TreeTableOptions): VTreeTable };
export const vTreeTable: ElementFactory<VTreeTable> & {
  (
    first?: TreeTableOptions | SetupInput<VTreeTable> | null,
    callback?: SetupCallback<VTreeTable>
  ): VTreeTable;
};
export const vTable: ElementFactory<VTable> & {
  (first?: TableOptions | SetupInput<VTable> | null, callback?: SetupCallback<VTable>): VTable;
};
export const vTableWrapper: {
  (
    first?: TableWrapperOptions | SetupCallback<VTableWrapper> | null,
    callback?: SetupCallback<VTableWrapper>
  ): VTableWrapper;
} & ElementFactory<VTableWrapper>;
export const vTbody: ElementFactory<VTbody>;
export const vTd: ElementFactory<VTd>;
export const vTfoot: ElementFactory<VTfoot>;
export const vTh: ElementFactory<VTh>;
export const vThead: ElementFactory<VThead>;
export const vTr: ElementFactory<VTr>;
export const vTree: ElementFactory<TreeComponent> & {
  (first?: TreeOptions | SetupCallback<VTree> | null, callback?: SetupCallback<VTree>): VTree;
};
export const vTreeNode: ElementFactory<VTreeNode> & {
  (first?: TreeNodeOptions | SetupCallback<VTreeNode> | null): VTreeNode;
};
export const vTimeline: ElementFactory<VTimeline> & {
  (
    first?: TimelineOptions | SetupInput<VTimeline> | null,
    callback?: SetupCallback<VTimeline>
  ): VTimeline;
};
export const vTimelineItem: ElementFactory<VTimelineItem> & {
  (
    first?: TimelineItemOptions | SetupInput<VTimelineItem> | null,
    callback?: SetupCallback<VTimelineItem>
  ): VTimelineItem;
};
export const vTrendCard: ElementFactory<VTrendCard> & {
  (
    first?: TrendCardOptions | SetupInput<VTrendCard> | null,
    callback?: SetupCallback<VTrendCard>
  ): VTrendCard;
};

/** `vImagePreview({ … })` 的可派发键（定义函数无 props）。 */
export interface ImagePreviewOptions {
  alt?: PropValue<string>;
  src?: PropValue<string | null>;
  thumb?: PropValue<string | null>;
  [key: string]: unknown;
}

/** Image lightbox with lazy large image, zoom / pan and ESC close. */
export interface VImagePreview extends ComponentNode {
  src(): string | null;
  src(value: string | null): VImagePreview;
  thumb(): string | null;
  thumb(value: string | null): VImagePreview;
  alt(): string;
  alt(value: string): VImagePreview;
  zoom(): number;
  zoom(value: number): VImagePreview;
  resetZoom(): VImagePreview;
  previewState(): 'open' | 'closed';
  open(): VImagePreview;
  close(): VImagePreview;
  toggle(): VImagePreview;
}

export const VImagePreview: { (): VImagePreview };

export const vImagePreview: ElementFactory<VImagePreview> & {
  (
    first?: ImagePreviewOptions | SetupInput<VImagePreview> | null,
    callback?: SetupCallback<VImagePreview>
  ): VImagePreview;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface DataDisplayParentShortcuts {
  vAvatar(
    first?: AvatarOptions | SetupInput<VAvatar> | null,
    callback?: SetupCallback<VAvatar>
  ): VAvatar;
  vBadge(
    first?: BadgeOptions | SetupInput<VBadge> | null,
    callback?: SetupCallback<VBadge>
  ): VBadge;
  vCard(first?: SetupInput<VCard> | null, callback?: SetupCallback<VCard>): VCard;
  vCardHeader(
    first?: SetupInput<VCardHeader> | null,
    callback?: SetupCallback<VCardHeader>
  ): VCardHeader;
  vCardBody(first?: SetupInput<VCardBody> | null, callback?: SetupCallback<VCardBody>): VCardBody;
  vCardFooter(
    first?: SetupInput<VCardFooter> | null,
    callback?: SetupCallback<VCardFooter>
  ): VCardFooter;
  vCarousel(
    first?: CarouselOptions | SetupInput<VCarousel> | null,
    callback?: SetupCallback<VCarousel>
  ): VCarousel;
  vCode(first?: CodeOptions | SetupInput<VCode> | null, callback?: SetupCallback<VCode>): VCode;
  vDetail(
    first?: DetailOptions | SetupInput<VDetail> | null,
    callback?: SetupCallback<VDetail>
  ): VDetail;
  vDetailItem(
    first?: DetailItemOptions | SetupInput<VDetailItem> | null,
    second?: SetupInput<VDetailItem>
  ): VDetailItem;
  vDigitalBoard(
    first?: DigitalBoardOptions | SetupInput<VDigitalBoard> | null,
    callback?: SetupCallback<VDigitalBoard>
  ): VDigitalBoard;
  vDigitalBoardItem(
    first?: DigitalBoardItemOptions | SetupInput<VDigitalBoardItem> | null,
    callback?: SetupCallback<VDigitalBoardItem>
  ): VDigitalBoardItem;
  vGauge(
    first?: GaugeOptions | SetupInput<VGauge> | null,
    callback?: SetupCallback<VGauge>
  ): VGauge;
  vImagePreview(
    first?: ImagePreviewOptions | SetupInput<VImagePreview> | null,
    callback?: SetupCallback<VImagePreview>
  ): VImagePreview;
  vPagination(
    first?: PaginationOptions | SetupInput<VPagination> | null,
    callback?: SetupCallback<VPagination>
  ): VPagination;
  vProgress(
    first?: ProgressOptions | SetupInput<VProgress> | null,
    callback?: SetupCallback<VProgress>
  ): VProgress;
  vRingStat(
    first?: RingStatOptions | SetupInput<VRingStat> | null,
    callback?: SetupCallback<VRingStat>
  ): VRingStat;
  vScroll(
    first?: ScrollOptions | SetupInput<VScroll> | null,
    callback?: SetupCallback<VScroll>
  ): VScroll;
  vSparkline(
    first?: SparklineOptions | SetupInput<VSparkline> | null,
    callback?: SetupCallback<VSparkline>
  ): VSparkline;
  vTreeTable(
    first?: TreeTableOptions | SetupInput<VTreeTable> | null,
    callback?: SetupCallback<VTreeTable>
  ): VTreeTable;
  vTable(
    first?: TableOptions | SetupInput<VTable> | null,
    callback?: SetupCallback<VTable>
  ): VTable;
  vTableWrapper(
    first?: TableWrapperOptions | SetupInput<VTableWrapper> | null,
    callback?: SetupCallback<VTableWrapper>
  ): VTableWrapper;
  vTimeline(
    first?: TimelineOptions | SetupInput<VTimeline> | null,
    callback?: SetupCallback<VTimeline>
  ): VTimeline;
  vTimelineItem(
    first?: TimelineItemOptions | SetupInput<VTimelineItem> | null,
    callback?: SetupCallback<VTimelineItem>
  ): VTimelineItem;
  vTrendCard(
    first?: TrendCardOptions | SetupInput<VTrendCard> | null,
    callback?: SetupCallback<VTrendCard>
  ): VTrendCard;
  vTree(first?: TreeOptions | SetupInput<VTree> | null, callback?: SetupCallback<VTree>): VTree;
}

export type { ElementOptions, ViewNode };

// 组件域把父快捷方法**并入** core 的节点接口（票 06 硬点 1）：core 的声明不再 import 组件，
// 增强在组件包自己的类型被引入时生效——与运行期"组件包被 import 时 registerChildFactories"同向。
declare module '@yoyaflow/yoya-core/html' {
  interface HtmlElementNode extends DataDisplayParentShortcuts {}
}

// 这几个快捷方法的返回类型属于本域（core 的声明里没有它们的位置）：
declare module '@yoyaflow/yoya-core' {
  interface ElementNode {
    /** codeBlock shortcut: code block with copy button (inherited by HtmlElementNode). */
    codeBlock(
      first?: import('@yoyaflow/yoya-core').SetupInput<CodeBlock> | null,
      options?: import('@yoyaflow/yoya-core').ElementOptions,
      callback?: import('@yoyaflow/yoya-core').SetupCallback<CodeBlock>
    ): CodeBlock;
  }
}
