import type {
  ChildInput,
  ElementFactory,
  ElementOptions,
  SetupCallback,
  SetupInput,
  ViewNode
} from './core.js';
import type { HtmlElementNode } from './html.js';

// ---------------------------------------------------------------------------
// Avatar / Badge / Card / Code
// ---------------------------------------------------------------------------

export class VAvatar extends HtmlElementNode {
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

export class VBadge extends HtmlElementNode {
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

export class VCard extends HtmlElementNode {}
export class VCardHeader extends HtmlElementNode {}
export class VCardBody extends HtmlElementNode {}
export class VCardFooter extends HtmlElementNode {}

export class VCode extends HtmlElementNode {
  content(content: ChildInput): VCode;
  text(content?: ChildInput): this;
  language(value: string): VCode;
  copyable(value?: boolean): VCode;
  copyLabel(value: ChildInput): VCode;
}

export class CodeBlock extends VCode {}

// ---------------------------------------------------------------------------
// Detail / Digital board
// ---------------------------------------------------------------------------

export class VDetail extends HtmlElementNode {
  columns(): number;
  columns(value: number): VDetail;
  column(value: number): VDetail;
  items(value: Array<string | VDetailItem | DetailItemOptions>): VDetail;
}

export interface DetailItemOptions {
  label?: ChildInput;
  value?: ChildInput;
  [key: string]: any;
}

export class VDetailItem extends HtmlElementNode {
  label(content?: ChildInput): this;
  value(content: ChildInput): VDetailItem;
  content(content: ChildInput): VDetailItem;
}

export class VDigitalBoard extends HtmlElementNode {
  columns(): number;
  columns(value: number): VDigitalBoard;
}

export class VDigitalBoardItem extends HtmlElementNode {
  label(content?: ChildInput): this;
  value(content: ChildInput): VDigitalBoardItem;
  unit(content: ChildInput): VDigitalBoardItem;
  trend(): number;
  trend(value: number): VDigitalBoardItem;
  trendUp(value: boolean): VDigitalBoardItem;
  tone(value: string): VDigitalBoardItem;
  icon(content: ChildInput): VDigitalBoardItem;
}

// ---------------------------------------------------------------------------
// Charts / gauges / stats
// ---------------------------------------------------------------------------

export class VGauge extends HtmlElementNode {
  value(): number;
  value(value: number): VGauge;
  max(): number;
  max(value: number): VGauge;
  unit(content: ChildInput): VGauge;
  tone(value: string): VGauge;
}

export class VRingStat extends HtmlElementNode {
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

export class VSparkline extends HtmlElementNode {
  data(values?: Array<number>): this;
  fill(value: boolean): VSparkline;
  strokeWidth(value: number): VSparkline;
  tone(value: string): VSparkline;
}

export class VChart extends HtmlElementNode {
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

// ---------------------------------------------------------------------------
// Timeline / Trend card
// ---------------------------------------------------------------------------

export class VTimeline extends HtmlElementNode {}

export class VTimelineItem extends HtmlElementNode {
  status(): string;
  status(value: string): VTimelineItem;
  title(content?: ChildInput): this;
  time(content?: ChildInput): this;
  content(setup: ChildInput | SetupCallback<HtmlElementNode>): VTimelineItem;
}

export class VTrendCard extends HtmlElementNode {
  title(content?: ChildInput): this;
  value(content: ChildInput): VTrendCard;
  unit(content: ChildInput): VTrendCard;
  delta(value: number): VTrendCard;
  up(value: boolean): VTrendCard;
  data(values?: Array<number>): this;
  tone(value: string): VTrendCard;
}

// ---------------------------------------------------------------------------
// Carousel / Progress / Pagination / Scroll
// ---------------------------------------------------------------------------

export class VCarousel extends HtmlElementNode {
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

export class VProgress extends HtmlElementNode {
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

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  pageSizes?: Array<number | { label: string; value: number }>;
  total?: number;
  totalPages?: number;
  ariaLabel?: ChildInput;
  [key: string]: any;
}

/** Object component returned by vPagination(). */
export interface PaginationComponent {
  change(): ((page: number, pageSize: number) => void) | null;
  change(handler: ((page: number, pageSize: number) => void) | null): PaginationComponent;
  onChange(handler: ((page: number, pageSize: number) => void) | null): PaginationComponent;
  page(): number;
  page(value: number): PaginationComponent;
  pageSize(): number;
  pageSize(value: number): PaginationComponent;
  pageSizes(): Array<{ label: string; value: number }>;
  pageSizes(value: Array<number | { label: string; value: number }>): PaginationComponent;
  total(): number;
  total(value: number): PaginationComponent;
  totalPages(): number;
  totalPages(value: number): PaginationComponent;
  update(result?: Partial<PaginationOptions>): PaginationComponent;
  render(): HtmlElementNode;
  [key: string]: any;
}

export class VScroll extends HtmlElementNode {
  content(setup: ChildInput | SetupCallback<HtmlElementNode>): VScroll;
  items(value: Array<unknown>, render?: (item: unknown, index: number) => ChildInput): VScroll;
  append(value: Array<unknown>, render?: (item: unknown, index: number) => ChildInput): VScroll;
  renderItem(handler: (item: unknown, index: number) => ChildInput): VScroll;
  loadMore(handler: () => void): VScroll;
  onLoadMore(handler: () => void): VScroll;
  loop(value: boolean): VScroll;
  block(value: boolean): VScroll;
  blocked(value: boolean): VScroll;
  loading(value: boolean): VScroll;
  threshold(): number;
  threshold(value: number): VScroll;
  virtual(value: boolean): VScroll;
  virtualize(value: boolean): VScroll;
  itemHeight(): number;
  itemHeight(value: number): VScroll;
  overscan(): number;
  overscan(value: number): VScroll;
  page(): number;
  page(value: number): VScroll;
  loadingText(content: ChildInput): VScroll;
  endText(content: ChildInput): VScroll;
  reset(): VScroll;
  clear(): VScroll;
  load(): VScroll;
  check(): VScroll;
}

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
  render(): HtmlElementNode;
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
  title?: ChildInput;
  dataIndex?: string;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => ChildInput;
  width?: string | number;
  [key: string]: any;
}

export class VTable extends HtmlElementNode {
  caption(content?: ChildInput): this;
  columns(value: Array<TableColumn>): VTable;
  rows(value: Array<Record<string, unknown>>): VTable;
  empty(value: ChildInput): VTable;
  emptyText(value: ChildInput): VTable;
  data(value?: { columns?: Array<TableColumn>; rows?: Array<Record<string, unknown>> }): this;
  child(...children: ChildInput[]): this;
  vThead(setup: SetupInput<HtmlElementNode>): VTable;
  vTbody(setup: SetupInput<HtmlElementNode>): VTable;
  vTfoot(setup: SetupInput<HtmlElementNode>): VTable;
  vTr(setup: SetupInput<HtmlElementNode>): VTable;
}

export class VThead extends HtmlElementNode {}
export class VTbody extends HtmlElementNode {}
export class VTfoot extends HtmlElementNode {}
export class VTr extends HtmlElementNode {}
export class VTh extends HtmlElementNode {}
export class VTd extends HtmlElementNode {}

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

/** Object component returned by vTree(). */
export interface TreeComponent {
  change(): ((keys: { checked: string[]; expanded: string[]; selected: string[] }) => void) | null;
  change(
    handler: ((keys: { checked: string[]; expanded: string[]; selected: string[] }) => void) | null
  ): TreeComponent;
  onChange(
    handler: ((keys: { checked: string[]; expanded: string[]; selected: string[] }) => void) | null
  ): TreeComponent;
  checked(id: string | number): boolean;
  checked(id: string | number, value: boolean): TreeComponent;
  checkedKeys(): string[];
  checkedKeys(value: Array<string | number>): TreeComponent;
  check(id: string | number, value?: boolean): TreeComponent;
  checkable(value: boolean): TreeComponent;
  checkAll(value?: boolean): TreeComponent;
  collapseAll(): TreeComponent;
  collapseNode(id: string | number): TreeComponent;
  data(value: Array<VTreeNode | TreeNodeOptions>): TreeComponent;
  emptyText(value: ChildInput): TreeComponent;
  expandAll(): TreeComponent;
  expandedKeys(): string[];
  expandedKeys(value: Array<string | number>): TreeComponent;
  expandNode(id: string | number, value?: boolean): TreeComponent;
  multiple(value: boolean): TreeComponent;
  nodes(value: Array<VTreeNode | TreeNodeOptions>): TreeComponent;
  vTreeNode(setup: VTreeNode | TreeNodeOptions): VTreeNode;
  node(setup: VTreeNode | TreeNodeOptions): VTreeNode;
  addNode(setup: VTreeNode | TreeNodeOptions): VTreeNode;
  onCheck(handler: (id: string | number, checked: boolean, node: VTreeNode) => void): TreeComponent;
  onSelect(handler: (id: string | number, node: VTreeNode) => void): TreeComponent;
  onToggle(handler: (id: string | number, node: VTreeNode) => void): TreeComponent;
  render(): HtmlElementNode;
  select(id: string | number, value?: boolean): TreeComponent;
  selectable(value: boolean): TreeComponent;
  selected(id: string | number): boolean;
  selected(id: string | number, value: boolean): TreeComponent;
  selectedKeys(): string[];
  selectedKeys(value: Array<string | number>): TreeComponent;
  toggleNode(id: string | number): TreeComponent;
  toggleIcon(value: ChildInput, expandedValue?: ChildInput): TreeComponent;
  update(value: Partial<TreeOptions>): TreeComponent;
  destroy(): TreeComponent;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export const vAvatar: ElementFactory<VAvatar>;
export const vBadge: ElementFactory<VBadge>;
export const vCard: ElementFactory<VCard>;
export const vCardHeader: ElementFactory<VCardHeader>;
export const vCardBody: ElementFactory<VCardBody>;
export const vCardFooter: ElementFactory<VCardFooter>;
export const vCarousel: ElementFactory<VCarousel>;
export const vChart: ElementFactory<VChart>;
export const vCode: ElementFactory<VCode>;
export const codeBlock: ElementFactory<CodeBlock>;
export const vDetail: ElementFactory<VDetail>;
export const vDetailItem: ElementFactory<VDetailItem> & {
  (setup?: SetupInput<VDetailItem> | null, value?: ChildInput): VDetailItem;
};
export const vDigitalBoard: ElementFactory<VDigitalBoard>;
export const vDigitalBoardItem: ElementFactory<VDigitalBoardItem>;
export const vGauge: ElementFactory<VGauge>;
export const vPagination: ElementFactory<PaginationComponent> & {
  (
    first?: PaginationOptions | SetupCallback<PaginationComponent> | null,
    callback?: SetupCallback<PaginationComponent>
  ): PaginationComponent;
};
export const vProgress: ElementFactory<VProgress>;
export const vRingStat: ElementFactory<VRingStat>;
export const vScroll: ElementFactory<VScroll>;
export const vSparkline: ElementFactory<VSparkline>;
export interface SuperTableColumn {
  key?: string;
  title?: ChildInput;
  dataIndex?: string;
  sorter?: boolean;
  filterOptions?: Array<{ label: ChildInput; value: string | number }>;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => ChildInput;
  width?: string | number;
  [key: string]: any;
}

export interface SuperTableSort {
  key: string | null;
  order: 'asc' | 'desc' | null;
}

export interface SuperTableChangePayload {
  sort: SuperTableSort;
  filters: Record<string, unknown>;
  pagination?: { current: number; pageSize: number };
  selectedKeys: Array<string | number>;
}

/** Column-driven enhanced table: sorting, filtering, selection, pagination. */
export class VSuperTable extends HtmlElementNode {
  columns(value?: Array<string | number | SuperTableColumn>): this;
  rows(value?: Array<Record<string, unknown>>): this;
  rowKey(handler?: (row: Record<string, unknown>, index: number) => string | number): this;
  rowSelection(value?: boolean): boolean | VSuperTable;
  pagination(value?: boolean | { pageSize?: number }): boolean | VSuperTable;
  pageSize(value?: number): number | VSuperTable;
  page(value?: number): number | VSuperTable;
  selectedRowKeys(value?: Array<string | number>): Array<string | number> | VSuperTable;
  sort(value?: SuperTableSort): SuperTableSort | VSuperTable;
  change(handler?: (payload: SuperTableChangePayload) => void): VSuperTable;
  onChange(handler: (payload: SuperTableChangePayload) => void): VSuperTable;
}

export const vSuperTable: ElementFactory<VSuperTable>;
/** Tree table: flat rows with indent, expand/collapse, selection linkage, lazy load. */
export class VTreeTable extends HtmlElementNode {
  columns(value?: Array<string | number | SuperTableColumn>): this;
  nodes(value?: Array<Record<string, any>>): this;
  rowKey(handler?: (node: Record<string, unknown>, index: number) => string | number): this;
  rowSelection(value?: boolean): boolean | VTreeTable;
  lazyLoad(
    handler?: (node: Record<string, unknown>) =>
      Array<Record<string, unknown>> | Promise<Array<Record<string, unknown>>>
  ): VTreeTable;
  expandedKeys(value?: Array<string>): Array<string> | VTreeTable;
  expandKeys(value?: Array<string>): VTreeTable;
  checkedKeys(value?: Array<string>): Array<string> | VTreeTable;
  expandAll(): VTreeTable;
  collapseAll(): VTreeTable;
  visibleRowCount(): number;
}

export const vTreeTable: ElementFactory<VTreeTable>;
export const vTable: ElementFactory<VTable>;
export const vTbody: ElementFactory<VTbody>;
export const vTd: ElementFactory<VTd>;
export const vTfoot: ElementFactory<VTfoot>;
export const vTh: ElementFactory<VTh>;
export const vThead: ElementFactory<VThead>;
export const vTr: ElementFactory<VTr>;
export const vTree: ElementFactory<TreeComponent> & {
  (
    first?: TreeOptions | SetupCallback<TreeComponent> | null,
    callback?: SetupCallback<TreeComponent>
  ): TreeComponent;
};
export const vTreeNode: ElementFactory<VTreeNode> & {
  (first?: TreeNodeOptions | SetupCallback<VTreeNode> | null): VTreeNode;
};
export const vTimeline: ElementFactory<VTimeline>;
export const vTimelineItem: ElementFactory<VTimelineItem>;
export const vTrendCard: ElementFactory<VTrendCard>;

/** Image lightbox with lazy large image, zoom / pan and ESC close. */
export class VImagePreview extends HtmlElementNode {
  src(): string | null;
  src(value: string | null): VImagePreview;
  thumb(): string | null;
  thumb(value: string | null): VImagePreview;
  alt(): string;
  alt(value: string): VImagePreview;
  zoom(): number;
  zoom(value: number): VImagePreview;
  resetZoom(): VImagePreview;
  state(): 'open' | 'closed';
  open(): VImagePreview;
  close(): VImagePreview;
  toggle(): VImagePreview;
}

export const vImagePreview: ElementFactory<VImagePreview> & {
  (
    first?: SetupInput<VImagePreview> | null,
    callback?: SetupCallback<VImagePreview>
  ): VImagePreview;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface DataDisplayParentShortcuts {
  vAvatar(first?: SetupInput<VAvatar> | null, callback?: SetupCallback<VAvatar>): VAvatar;
  vBadge(first?: SetupInput<VBadge> | null, callback?: SetupCallback<VBadge>): VBadge;
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
  vCarousel(first?: SetupInput<VCarousel> | null, callback?: SetupCallback<VCarousel>): VCarousel;
  vCode(first?: SetupInput<VCode> | null, callback?: SetupCallback<VCode>): VCode;
  vDetail(first?: SetupInput<VDetail> | null, callback?: SetupCallback<VDetail>): VDetail;
  vDetailItem(setup?: SetupInput<VDetailItem> | null, value?: ChildInput): VDetailItem;
  vDigitalBoard(
    first?: SetupInput<VDigitalBoard> | null,
    callback?: SetupCallback<VDigitalBoard>
  ): VDigitalBoard;
  vDigitalBoardItem(
    first?: SetupInput<VDigitalBoardItem> | null,
    callback?: SetupCallback<VDigitalBoardItem>
  ): VDigitalBoardItem;
  vGauge(first?: SetupInput<VGauge> | null, callback?: SetupCallback<VGauge>): VGauge;
  vImagePreview(
    first?: SetupInput<VImagePreview> | null,
    callback?: SetupCallback<VImagePreview>
  ): VImagePreview;
  vPagination(
    first?: SetupInput<PaginationComponent> | null,
    callback?: SetupCallback<PaginationComponent>
  ): PaginationComponent;
  vProgress(first?: SetupInput<VProgress> | null, callback?: SetupCallback<VProgress>): VProgress;
  vRingStat(first?: SetupInput<VRingStat> | null, callback?: SetupCallback<VRingStat>): VRingStat;
  vScroll(first?: SetupInput<VScroll> | null, callback?: SetupCallback<VScroll>): VScroll;
  vSparkline(
    first?: SetupInput<VSparkline> | null,
    callback?: SetupCallback<VSparkline>
  ): VSparkline;
  vSuperTable(first?: SetupInput<VSuperTable> | null, callback?: SetupCallback<VSuperTable>): VSuperTable;
  vTreeTable(first?: SetupInput<VTreeTable> | null, callback?: SetupCallback<VTreeTable>): VTreeTable;
  vTable(first?: SetupInput<VTable> | null, callback?: SetupCallback<VTable>): VTable;
  vTimeline(first?: SetupInput<VTimeline> | null, callback?: SetupCallback<VTimeline>): VTimeline;
  vTimelineItem(
    first?: SetupInput<VTimelineItem> | null,
    callback?: SetupCallback<VTimelineItem>
  ): VTimelineItem;
  vTrendCard(
    first?: SetupInput<VTrendCard> | null,
    callback?: SetupCallback<VTrendCard>
  ): VTrendCard;
  vTree(
    first?: SetupInput<TreeComponent> | null,
    callback?: SetupCallback<TreeComponent>
  ): TreeComponent;
}

export type { ElementOptions, ViewNode };


