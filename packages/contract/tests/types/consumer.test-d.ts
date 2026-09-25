/**
 * Type-level smoke test: exercises the public API through the package's own
 * `exports` map. Run with `npm run typecheck`.
 */
import {
  VButton,
  VBadge,
  VGlowButton,
  VLanguageSwitch as I18nVLanguageSwitch,
  VMasonry as LayoutVMasonry,
  VSlot as LayoutVSlot,
  VSplitPanel as LayoutVSplitPanel,
  VThemeModeSwitch as ThemeVThemeModeSwitch,
  VTransition,
  div,
  flex,
  htmls,
  vBadge,
  vButton,
  vCard,
  vCardBody,
  vDetail,
  vDetailItem,
  vForm,
  vInput,
  vPagination,
  vSelect,
  vTable,
  vTableWrapper,
  vTabs,
  vNode,
  vMenuWrapper,
  vSidebar,
  vSlot,
  vTree,
  vText,
  computed,
  EMPTY_CHILDREN,
  appendNodeChild,
  elementAttrs,
  elementClassNames,
  elementHasClass,
  elementStyles,
  installSignals,
  isKeySet,
  keySet,
  li,
  nodeChildren,
  ref,
  renderToString,
  router,
  svgs,
  toast,
  ul,
  SearchOutlined
} from 'yoya-ui';
import { ComponentNode, ElementNode, HtmlElementNode, ViewNode } from 'yoya-ui/core';
import { configureRequest, RequestBase, Result } from 'yoya-ui/api';
import { createI18n, i18nText } from 'yoya-ui/tools';
import {
  VButton as ActionsVButton,
  VButtons as ActionsVButtons,
  VContextMenu as ActionsVContextMenu,
  VDropdownMenu as ActionsVDropdownMenu,
  VFloatButton as ActionsVFloatButton,
  VSymbolButton as ActionsVSymbolButton,
  vButton as actionsVButton,
  vFloatButton as actionsVFloatButton
} from 'yoya-ui/actions';
import {
  VAnchor as NavigationVAnchor,
  VAnchorItem as NavigationVAnchorItem,
  VBreadcrumb as NavigationVBreadcrumb,
  VBreadcrumbItem as NavigationVBreadcrumbItem,
  VMenu as NavigationVMenu,
  VMenuDivider as NavigationVMenuDivider,
  VMenuGroup as NavigationVMenuGroup,
  VMenuItem as NavigationVMenuItem,
  VMenuWrapper as NavigationVMenuWrapper,
  VNavbar as NavigationVNavbar,
  VSidebar as NavigationVSidebar,
  VStep as NavigationVStep,
  VSteps as NavigationVSteps,
  VSubMenu as NavigationVSubMenu,
  VTab as NavigationVTab,
  VTabs as NavigationVTabs,
  vBreadcrumb as navigationVBreadcrumb,
  vMenu as navigationVMenu,
  vTabs as navigationVTabs
} from 'yoya-ui/navigation';
import {
  VDialog as FeedbackVDialog,
  VMessage as FeedbackVMessage,
  VMessageContainer as FeedbackVMessageContainer,
  VTooltip as FeedbackVTooltip,
  toast as feedbackToast,
  vDialog as feedbackVDialog,
  vMessage as feedbackVMessage,
  vTooltip as feedbackVTooltip
} from 'yoya-ui/feedback';
import {
  VAvatarUpload as FormVAvatarUpload,
  VAutocomplete as FormVAutocomplete,
  VCascader as FormVCascader,
  VCheckbox as FormVCheckbox,
  VCheckboxes as FormVCheckboxes,
  VColorPicker as FormVColorPicker,
  VForm as FormVForm,
  VFormItem as FormVFormItem,
  VInput as FormVInput,
  VRadio as FormVRadio,
  VRadios as FormVRadios,
  VRate as FormVRate,
  VSelect as FormVSelect,
  VSlider as FormVSlider,
  VSvgIconPicker as FormVSvgIconPicker,
  VSwitch as FormVSwitch,
  VTagsInput as FormVTagsInput,
  VTextarea as FormVTextarea,
  VTimer as FormVTimer,
  vCheckbox as formVCheckbox,
  vForm as formVForm,
  vInput as formVInput,
  vRate as formVRate,
  vSelect as formVSelect,
  vUpload as formVUpload
} from 'yoya-ui/form';
import {
  VAvatar as DisplayVAvatar,
  VBadge as DisplayVBadge,
  VCarousel as DisplayVCarousel,
  VCard as DisplayVCard,
  VChart as DisplayVChart,
  VCode as DisplayVCode,
  VDetail as DisplayVDetail,
  VDetailItem as DisplayVDetailItem,
  VDigitalBoard as DisplayVDigitalBoard,
  VDigitalBoardItem as DisplayVDigitalBoardItem,
  VGauge as DisplayVGauge,
  VImagePreview as DisplayVImagePreview,
  VPagination as DisplayVPagination,
  VProgress as DisplayVProgress,
  VRingStat as DisplayVRingStat,
  VScroll as DisplayVScroll,
  VSparkline as DisplayVSparkline,
  VTable as DisplayVTable,
  VTableWrapper as DisplayVTableWrapper,
  VTimeline as DisplayVTimeline,
  VTimelineItem as DisplayVTimelineItem,
  VTrendCard as DisplayVTrendCard,
  VTree as DisplayVTree,
  VTreeTable as DisplayVTreeTable,
  VThead as DisplayVThead,
  VTr as DisplayVTr,
  vBadge as displayVBadge,
  vPagination as displayVPagination,
  vTable as displayVTable,
  vTableWrapper as displayVTableWrapper,
  vTree as displayVTree
} from 'yoya-ui/data-display';
import {
  VSkeleton as AsyncVSkeleton,
  vDynamicLoader as asyncVDynamicLoader,
  vLazyImage as asyncVLazyImage,
  vSkeleton as asyncVSkeleton
} from 'yoya-ui/async';
import { VEchart, vEchart } from 'yoya-ui/echart';
import { VThree, vThree } from 'yoya-ui/three';
import { vLink, vRoute, vRouter } from 'yoya-ui/router';
import type { SignalsAdapter } from 'yoya-ui/core';
import { hydrate, mount, parseState, renderToString as ssrRender } from 'yoya-ui/router';
import { disableDevtools, enableDevtools, isDevtoolsEnabled, subscribeDevtools } from 'yoya-ui/dev';
import 'yoya-ui/ui.css';

// Element factories accept callback/text/object forms.
const page = div((root) => {
  root.className('page');
  root.style({ padding: '16px' });

  root.vButton('启动任务', (button) => {
    button.variant('primary');
    button.size('large');
    button.on('click', () => toast.success('任务已启动'));
  });

  root.flex({ gap: 8, direction: 'column' }, (column) => {
    column.vCard((card) => {
      card.vCardHeader('服务详情');
      card.vCardBody((body) => {
        body.vDetail((detail) => {
          detail.vDetailItem('服务名称', 'api-gateway');
          detail.vDetailItem('状态', '运行中');
        });
      });
    });
  });

  root.vInput((input) => {
    input.placeholder('请输入');
    input.clearable(true);
  });

  root.vSelect((select) => {
    select.options([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' }
    ]);
  });
});

// Communication contracts live in their own API entry.
const requestCommand: RequestBase = new RequestBase();
const requestResult: Result<string> = Result.from({ ok: true, data: 'ok' });
void configureRequest({ submit: () => ({ ok: true, data: null }) });
void requestCommand;
void requestResult;

// Return types are concrete node types.
const buttonNode: VButton = vButton('label', (b) => b.variant('danger'));
const badge = vBadge('notifications').count(3);
const form = vForm((f) => {
  f.vFormItem((item) => {
    item.name('name');
    item.label('名称');
  });
});

// 组件句柄口径：句柄是**组件节点**（身份走 `vn` 事实），元素级方法与子工厂由引擎委托到视图根，
// 所以 `attr` / `style` / `focus()` / `vCardBody(…)` 在句柄上照样成立（见 ComponentNode 的注释）。
const handleAsComponent: ComponentNode = buttonNode;
const handleElementSurface: HtmlElementNode = buttonNode;
buttonNode.attr('data-kind', 'primary');
buttonNode.style('marginTop', '4px');
void buttonNode.focus();
const cardHandle = vCard((card) => card.vCardHeader('标题'));
cardHandle.vCardBody('正文');
void handleAsComponent;
void handleElementSurface;

// 命令面必须**真的被约束**：库内组件的句柄是具名类型（没有索引签名），拼错就报错。
// @ts-expect-error VCard 上没有这个命令
vCard().notACommand();
// @ts-expect-error variant 只吃 'primary' | 'secondary' | 'ghost' | 'danger'
vButton('x').variant('fancy');

// 用户自己写的 vNode 组件：默认命令面是记录类型（不做拼写检查），
// 想要精确命令面就显式给泛型——这是目前推荐的写法。
const typedCounter = vNode<{ bump(): void }>((api) => {
  api.bump = () => {};
  return div('x');
});
typedCounter.bump();
// @ts-expect-error 显式泛型后，未知命令会被拦下
typedCounter.nope();

// 另一种（也是推荐的）写法：给 api 参数加 **type 字面量** 注解 —— TS 从参数注解推断，
// 句柄因此拿到精确命令面。注意两点：① 别写 `interface XxxApi extends VNodeApi`
// （会把索引签名带回来，又不精确了）；② 要链式返回就自引用句柄类型。
type CounterApi = {
  bump(): ComponentNode & CounterApi;
  value(): number;
};
const annotatedCounter = vNode((api: CounterApi) => {
  api.bump = () => annotatedCounter;
  api.value = () => 1;
  return div('x');
});
annotatedCounter.bump().value();
// @ts-expect-error 注解写法同样拦得住未知命令
annotatedCounter.nope();

// 组件定义函数的**直接参数**由 .d.ts 定义（以 VBadge 为样板）：`VBadge(props)` 收 BadgeOptions，
// 快捷方法 `vBadge(...)` 的首参是"props ∪ setup 分派"（对象 = props、文本 = 内容、函数 = 构建回调）。
const badgeFromProps: VBadge = VBadge({ count: 3, dot: true });
badgeFromProps.count(5);
const badgeFromShortcut: VBadge = vBadge({ count: 8, status: 'processing' });
badgeFromShortcut.label('标签');
// @ts-expect-error dot 只吃 boolean
VBadge({ dot: 'yes' });

// 口径说明：**快捷方法**抓不住"props 取值写错"——它的首参联合里含开放的 `ElementOptions`
// （为了 `class` / `style` / `onXxx` / `data-*` 透传），任何对象实参都能匹配那一支。
// 想要逐键检查就用**定义函数**（`VBadge({ … })`）或写成具名 props 变量再传。
vBadge({ overflowCount: 'many' });

// Layout options autocomplete and node helpers.
const layout = flex({ gap: 12, justify: 'space-between' }, (f) => {
  f.child(div('left'), div('right'));
});

// Node-internals helpers: class-node components touch child lists / classes / styles / attrs through these.
const helperBox = div('x');
appendNodeChild(helperBox, li('y'));
const helperChildren: ViewNode[] = nodeChildren(helperBox);
elementStyles(helperBox).color = 'red';
elementAttrs(helperBox)['data-mode'] = 'dark';
const helperClasses: string[] = elementClassNames(helperBox);
const helperHasClass: boolean = elementHasClass(helperBox, 'acme-badge');
void helperChildren;
void helperClasses;
void helperHasClass;
void EMPTY_CHILDREN;

// keySet: a key-addressed container that hands per-row apis to keyed().
const keySetRows = keySet<{ id: number; label: string }>(
  [],
  (row) => row.id,
  (item) => {
    item.api.selected = ref(false);
  }
);
const keySetEntry = keySetRows.item(1);
if (keySetEntry) {
  keySetEntry.data.label = keySetEntry.data.label.toUpperCase();
}
keySetRows.remove(1);
const keySetList = ul((root) => {
  root.keyed(keySetRows, (item, index) => li(`${item.data.label}@${index}`));
});
void isKeySet(keySetRows);
void keySetList;

// Data display components.
// 02 号票（data-display）：每个组件的**定义函数直参**逐键检查（一正一负进类型门禁）。
// 正例：定义函数收 props；负例：取值类型写错当场报错。
const avatarFromProps: DisplayVAvatar = DisplayVAvatar({ size: 40, src: 'a.png', status: null });
// @ts-expect-error `size` 只吃 number / string
DisplayVAvatar({ size: {} });
const gaugeFromProps: DisplayVGauge = DisplayVGauge({ max: 200, value: 30 });
// @ts-expect-error `value` 只吃 number / 句柄
DisplayVGauge({ value: '很多' });
const ringFromProps: DisplayVRingStat = DisplayVRingStat({ percent: 40, tone: 'success' });
// @ts-expect-error `percent` 只吃 number / 句柄
DisplayVRingStat({ percent: [] });
const sparkFromProps: DisplayVSparkline = DisplayVSparkline({ data: [1, 2, 3], fill: true });
// @ts-expect-error `fill` 只吃 boolean / 句柄
DisplayVSparkline({ fill: 'yes' });
const chartFromProps: DisplayVChart = DisplayVChart({ height: 240, width: '100%' });
// @ts-expect-error `height` 只吃 number / string / 句柄
DisplayVChart({ height: {} });
const codeFromProps: DisplayVCode = DisplayVCode({ copyLabel: '复制', language: 'js' });
// @ts-expect-error `copyable` 只吃 boolean / 句柄
DisplayVCode({ copyable: 'yes' });
const scrollFromProps: DisplayVScroll = DisplayVScroll({ itemHeight: 40, items: [1, 2] });
// @ts-expect-error `itemHeight` 只吃 number
DisplayVScroll({ itemHeight: '40' });
const tableFromProps: DisplayVTable = DisplayVTable({ caption: '服务列表' });
// @ts-expect-error `caption` 是内容位（对象不是 ChildInput）；结构键走命令
DisplayVTable({ caption: {} });
const treeTableFromProps: DisplayVTreeTable = DisplayVTreeTable({ columns: [{ key: 'name' }] });
// @ts-expect-error `columns` 只吃列定义数组
DisplayVTreeTable({ columns: 'name' });
const trendFromProps: DisplayVTrendCard = DisplayVTrendCard({ up: false, value: 12 });
// @ts-expect-error `up` 只吃 boolean / 句柄
DisplayVTrendCard({ up: 'no' });
const timelineFromProps: DisplayVTimeline = DisplayVTimeline({ children: '事件' });
// @ts-expect-error `children` 是内容位
DisplayVTimeline({ children: {} });
const timelineItemFromProps: DisplayVTimelineItem = DisplayVTimelineItem({ status: 'success' });
// @ts-expect-error `status` 只吃 string / 句柄
DisplayVTimelineItem({ status: 3 });
const imagePreviewFromProps: DisplayVImagePreview = DisplayVImagePreview();
// @ts-expect-error 定义函数没有 props（元素级选项走快捷方法 `vImagePreview({ class })`）
DisplayVImagePreview({ alt: '图' });

// 定义函数**没有 props 参数**的组件：类型上也写 `()`（运行期会静默丢掉实参）。
const cardFromDefinition: DisplayVCard = DisplayVCard();
const detailFromDefinition: DisplayVDetail = DisplayVDetail();
const detailItemFromDefinition: DisplayVDetailItem = DisplayVDetailItem();
const progressFromDefinition: DisplayVProgress = DisplayVProgress();
const treeFromDefinition: DisplayVTree = DisplayVTree();
const trFromDefinition: DisplayVTr = DisplayVTr();
// @ts-expect-error `VCard({ … })` 的参数会被运行期丢掉，类型上不收
DisplayVCard({ class: 'card' });
// @ts-expect-error 同上：`VDetail({ … })` 走快捷方法 `vDetail({ columns })`
DisplayVDetail({ columns: 2 });
// @ts-expect-error 同上：`VProgress({ … })` 走快捷方法 `vProgress({ value })`
DisplayVProgress({ value: 30 });

// 句柄口径：命令面收窄（具名类型、没有索引签名），拼错当场报错。
cardFromDefinition.vCardBody('正文');
// @ts-expect-error `VCard` 上没有这个命令
cardFromDefinition.notACommand();
const gaugeValue: number = gaugeFromProps.value();
const avatarNode: ComponentNode = avatarFromProps;
void gaugeValue;
void avatarNode;
// @ts-expect-error 分页句柄的命令面同样收窄
pagination.notACommand();

// 构造签名已退场：`instanceof VXxx` 不是承诺用法（身份走 componentNameOf / hasComponentIdentity），
// 收窄不到句柄，因此写下去就红。
const unknownMember: unknown = badge;
if (unknownMember instanceof DisplayVBadge) {
  // @ts-expect-error 没有构造签名 → 收窄到 `{}`，不是句柄
  unknownMember.attr('data-x', 'y');
}
// @ts-expect-error `new VCard()` 已退场（组件定义函数不再有构造签名）
new DisplayVCard();

vTable((table) => {
  table.vThead((head) => head.vTr((row) => row.vTh('名称')));
  table.vTbody((body) => body.keyed(keySetRows, (item) => li(item.data.label)));
  table.vTr((row) => row.vTd('值'));
  table.caption('服务列表');
});

const tableWrapper = vTableWrapper({
  caption: '服务列表',
  columns: [
    { key: 'name', title: '名称', width: 120 },
    { key: 'status', title: '状态', render: (row) => vBadge(String(row.status)) }
  ],
  emptyText: '暂无服务',
  rowKey: (row) => row.id,
  rows: [
    { id: 'gateway', name: 'gateway', status: 'running' },
    { id: 'worker', name: 'worker', status: 'idle' }
  ]
});
tableWrapper.columns([{ key: 'name', label: '名称' }]);
tableWrapper.rows([{ id: 'gateway', name: 'gateway' }]);
tableWrapper.emptyText('暂无服务').caption('服务列表');
tableWrapper.addRow({ id: 'web', name: 'web' });
tableWrapper.updateRow('gateway', { status: 'idle' });
tableWrapper.removeRow('web');
tableWrapper.clearRows();
tableWrapper.item('gateway')?.api.select();

vTabs((tabs) => {
  tabs.items([
    { key: 'a', label: '概览', content: div('A') },
    { key: 'b', label: '设置', content: div('B') }
  ]);
  tabs.change((key) => void key);
});

const pagination = vPagination({ total: 120 });
pagination.page(2).pageSize(20);
const paginationFromAlias: DisplayVPagination = DisplayVPagination({ total: 40 });
void paginationFromAlias;
void DisplayVDigitalBoard;
void DisplayVDetailItem;

// 03 号票（form）：布尔族的定义函数收 props；其余组件的可派发键进快捷方法首参。
const checkboxFromProps: FormVCheckbox = FormVCheckbox({ checked: true, label: '同意' });
// @ts-expect-error `checked` 只吃 boolean / 句柄
FormVCheckbox({ checked: 'yes' });
const switchFromProps: FormVSwitch = FormVSwitch({ checked: false, description: '说明' });
// @ts-expect-error `required` 只吃 boolean / 句柄
FormVSwitch({ required: 'yes' });
const radioFromProps: FormVRadio = FormVRadio({ optionValue: 'a', value: 'a' });
// @ts-expect-error `disabled` 只吃 boolean / 句柄
FormVRadio({ disabled: 'no' });
const checkboxesFromProps: FormVCheckboxes = FormVCheckboxes({ columns: 2, options: ['a', 'b'] });
// @ts-expect-error `columns` 只吃 number / null / 句柄
FormVCheckboxes({ columns: '2' });
const radiosFromProps: FormVRadios = FormVRadios({ options: [{ label: 'A', value: 'a' }] });
// @ts-expect-error `options` 只吃选项数组 / 句柄
FormVRadios({ options: 'a' });
const rateFromProps: FormVRate = FormVRate({ allowHalf: true, count: 5, value: 3 });
// @ts-expect-error `count` 只吃 number / 句柄
FormVRate({ count: '5' });

// 定义函数没有 props 参数的表单组件：类型上也写 `()`（实参走快捷方法的 setup 分派）。
const inputFromDefinition: FormVInput = FormVInput();
const textareaFromDefinition: FormVTextarea = FormVTextarea();
const selectFromDefinition: FormVSelect = FormVSelect();
const sliderFromDefinition: FormVSlider = FormVSlider();
const colorPickerFromDefinition: FormVColorPicker = FormVColorPicker();
const iconPickerFromDefinition: FormVSvgIconPicker = FormVSvgIconPicker();
const cascaderFromDefinition: FormVCascader = FormVCascader();
const tagsInputFromDefinition: FormVTagsInput = FormVTagsInput();
const autocompleteFromDefinition: FormVAutocomplete = FormVAutocomplete();
const formItemFromDefinition: FormVFormItem = FormVFormItem();
const timerFromDefinition: FormVTimer = FormVTimer();
const avatarUploadFromDefinition: FormVAvatarUpload = FormVAvatarUpload();
// @ts-expect-error `VInput({ … })` 的参数会被运行期丢掉，类型上不收
FormVInput({ value: 'x' });
// @ts-expect-error 同上：`VSelect({ … })` 走快捷方法 `vSelect({ options })`
FormVSelect({ options: ['a'] });
// @ts-expect-error 同上：`VSlider({ … })` 走快捷方法 `vSlider({ value })`
FormVSlider({ value: 3 });
void textareaFromDefinition;
void selectFromDefinition;
void sliderFromDefinition;
void colorPickerFromDefinition;
void iconPickerFromDefinition;
void cascaderFromDefinition;
void tagsInputFromDefinition;
void autocompleteFromDefinition;
void formItemFromDefinition;
void timerFromDefinition;
void avatarUploadFromDefinition;

// 控件族句柄的元素面仍是委托面（`vInput({ … })` 走节点 setupObject → 内层 input）。
const inputHandleValue = ref('待处理');
const inputWithProps: FormVInput = vInput({
  name: 'prop',
  placeholder: '搜索',
  value: inputHandleValue
});
inputWithProps.clear();
void inputWithProps;

// 04 号票（actions + navigation）：定义函数直参逐键检查；命令面句柄走 `()` + 快捷方法 options。
const buttonFromProps: ActionsVButton = ActionsVButton({ loading: true, variant: 'primary' });
// @ts-expect-error `variant` 只吃四个字面量之一 / 句柄
ActionsVButton({ variant: 'fancy' });
const buttonsFromProps: ActionsVButtons = ActionsVButtons({
  options: ['A', 'B'],
  selectable: true
});
// @ts-expect-error `selectable` 只吃 boolean / 句柄
ActionsVButtons({ selectable: 'yes' });
const floatButtonFromProps: ActionsVFloatButton = ActionsVFloatButton({
  position: 'br',
  size: 'large'
});
// @ts-expect-error `size` 只吃 'small' | 'medium' | 'large'
ActionsVFloatButton({ size: 'huge' });
const symbolButtonFromProps: ActionsVSymbolButton = ActionsVSymbolButton({ ariaLabel: '刷新' });
// @ts-expect-error `ariaLabel` 只吃 string
ActionsVSymbolButton({ ariaLabel: 42 });
const dropdownFromProps: ActionsVDropdownMenu = ActionsVDropdownMenu({
  label: '更多',
  placement: 'bottom-end'
});
// @ts-expect-error `placement` 只吃四个朝向字面量
ActionsVDropdownMenu({ placement: 'middle' });
const contextMenuFromProps: ActionsVContextMenu = ActionsVContextMenu({ closeOnSelect: false });
// @ts-expect-error `closeOnSelect` 只吃 boolean / 句柄
ActionsVContextMenu({ closeOnSelect: 'no' });
const anchorFromProps: NavigationVAnchor = NavigationVAnchor({ items: ['概览'], offset: 80 });
// @ts-expect-error `offset` 只吃 number / string / 句柄
NavigationVAnchor({ offset: {} });
const anchorItemFromProps: NavigationVAnchorItem = NavigationVAnchorItem({
  href: '#a',
  title: 'A'
});
// @ts-expect-error `href` 只吃 string / null / 句柄
NavigationVAnchorItem({ href: 7 });
const breadcrumbFromProps: NavigationVBreadcrumb = NavigationVBreadcrumb({
  separator: '/',
  items: ['A']
});
// @ts-expect-error `separator` 是内容位（对象不是 ChildInput）
NavigationVBreadcrumb({ separator: {} });
const breadcrumbItemFromProps: NavigationVBreadcrumbItem = NavigationVBreadcrumbItem({ to: '/a' });
// @ts-expect-error `to` 只吃 string / null
NavigationVBreadcrumbItem({ to: 7 });
const navbarFromProps: NavigationVNavbar = NavigationVNavbar({ sticky: true, title: '控制台' });
// @ts-expect-error `sticky` 只吃 boolean / 句柄
NavigationVNavbar({ sticky: 'yes' });
const stepFromProps: NavigationVStep = NavigationVStep({ status: 'finish', title: '第一步' });
// @ts-expect-error `status` 只吃三个状态字面量 / null
NavigationVStep({ status: 'done' });
const stepsFromProps: NavigationVSteps = NavigationVSteps({ current: 1, items: ['A', 'B'] });
// @ts-expect-error `current` 只吃 number / 句柄
NavigationVSteps({ current: '1' });
const tabFromProps: NavigationVTab = NavigationVTab({ key: 'a', label: '概览' });
// @ts-expect-error `active` 只吃 boolean / 句柄
NavigationVTab({ active: 'yes' });
const tabsFromProps: NavigationVTabs = NavigationVTabs({ active: 'a', items: [] });
// @ts-expect-error `variant` 只吃 'line' | 'card' | 'pills'
NavigationVTabs({ variant: 'ghost' });

// 无 props 的定义函数（`()`）：命令面 + 快捷方法 options。
const menuFromDefinition: NavigationVMenu = NavigationVMenu();
const menuGroupFromDefinition: NavigationVMenuGroup = NavigationVMenuGroup();
const menuItemFromDefinition: NavigationVMenuItem = NavigationVMenuItem();
const menuWrapperFromDefinition: NavigationVMenuWrapper = NavigationVMenuWrapper();
const subMenuFromDefinition: NavigationVSubMenu = NavigationVSubMenu();
const sidebarFromDefinition: NavigationVSidebar = NavigationVSidebar();
// @ts-expect-error `VMenu({ … })` 的参数会被运行期丢掉，类型上不收
NavigationVMenu({ orientation: 'horizontal' });
// @ts-expect-error 同上：`VSidebar({ … })` 走快捷方法 `vSidebar({ collapsed })`
NavigationVSidebar({ collapsed: true });
void menuFromDefinition;
void menuGroupFromDefinition;
void menuItemFromDefinition;
void menuWrapperFromDefinition;
void subMenuFromDefinition;
void sidebarFromDefinition;

const sidebarFromShortcut: NavigationVSidebar = vSidebar({ collapsed: true, title: '菜单' });
const menuWrapperFromShortcut: NavigationVMenuWrapper = vMenuWrapper({ items: ['A'] });
void sidebarFromShortcut;
void menuWrapperFromShortcut;

// 05 号票（其余分类）：feedback / async / layout / effects / theme / chart / three / i18n。
const dialogFromProps: FeedbackVDialog = FeedbackVDialog({ open: true, closable: false });
// @ts-expect-error `open` 只吃 boolean / 句柄
FeedbackVDialog({ open: 'yes' });
const messageFromProps: FeedbackVMessage = FeedbackVMessage({ type: 'success', closable: true });
// @ts-expect-error `type` 只吃四个消息类型之一 / 句柄
FeedbackVMessage({ type: 'notice' });
const messageContainerFromProps: FeedbackVMessageContainer = FeedbackVMessageContainer({
  inline: true,
  placement: 'bottom-right'
});
// @ts-expect-error `placement` 只吃六个位置之一
FeedbackVMessageContainer({ placement: 'middle' });
const tooltipFromProps: FeedbackVTooltip = FeedbackVTooltip({ placement: 'top', trigger: 'click' });
// @ts-expect-error `trigger` 只吃四个触发方式之一
FeedbackVTooltip({ trigger: 'double' });
const skeletonFromProps: AsyncVSkeleton = AsyncVSkeleton({ motion: 'always', rows: 5 });
// @ts-expect-error `rows` 只吃 number / 句柄
AsyncVSkeleton({ rows: '5' });
const masonryFromProps: LayoutVMasonry = LayoutVMasonry({ columns: 3, gap: 16 });
// @ts-expect-error `gap` 只吃 number / 句柄
LayoutVMasonry({ gap: '16' });
const splitPanelFromProps: LayoutVSplitPanel = LayoutVSplitPanel({
  direction: 'vertical',
  size: '40%'
});
// @ts-expect-error `direction` 只吃 'horizontal' | 'vertical'
LayoutVSplitPanel({ direction: 'diagonal' });
const themeSwitchFromProps: ThemeVThemeModeSwitch = ThemeVThemeModeSwitch({ persist: false });
// @ts-expect-error `persist` 只吃 boolean / 句柄
ThemeVThemeModeSwitch({ persist: 'no' });
const echartFromProps: VEchart = VEchart({ autoResize: true, height: 320 });
// @ts-expect-error `height` 只吃 number / string / 句柄
VEchart({ height: {} });
const threeFromProps: VThree = VThree({ autoRender: false, width: '100%' });
// @ts-expect-error `autoRender` 只吃 boolean / 句柄
VThree({ autoRender: 'no' });
const languageSwitchFromProps: I18nVLanguageSwitch = I18nVLanguageSwitch({
  languages: ['zh-CN', 'en-US'],
  size: 'small'
});
// @ts-expect-error `size` 只吃 'small' | 'medium' | 'large'
I18nVLanguageSwitch({ size: 'tiny' });

// 无 props 的定义函数（`()`）：`VSlot` 是 A 形态薄工厂，占位名走快捷方法。
const slotFromDefinition: LayoutVSlot = LayoutVSlot();
// @ts-expect-error `VSlot({ … })` 的参数会被运行期丢掉
LayoutVSlot({ name: 'header' });
const slotFromShortcut: LayoutVSlot = vSlot('body');
const slotFromObject: LayoutVSlot = vSlot({ name: 'footer' });

// 06 号票（类型收口）：对象组件协议（`{ render() }`）从类型面退场——子节点位置与页面工厂都不再收它，
// 组件只有 A 薄工厂 / B `vNode` 两种写法（身份判定走 `componentNameOf` / `hasComponentIdentity`）。
// @ts-expect-error `{ render() }` 不再是合法子节点
div((root) => root.child({ render: () => div('x') }));
// @ts-expect-error 页面工厂同样不收对象组件
renderToString({ render: () => div('x') });

void splitPanelFromProps;
void slotFromObject;
void dialogFromProps;
void messageFromProps;
void messageContainerFromProps;
void tooltipFromProps;
void skeletonFromProps;
void masonryFromProps;
void themeSwitchFromProps;
void echartFromProps;
void threeFromProps;
void languageSwitchFromProps;
void slotFromDefinition;
void slotFromShortcut;
void DisplayVCarousel;

// 剩余"命令面 / 部件"句柄：定义函数是 `()`（或部件快捷方法），命令面照旧可用，传实参被拒。
const carouselFromDefinition: DisplayVCarousel = DisplayVCarousel();
carouselFromDefinition.slides([1, 2, 3]).active(1);
const boardFromDefinition: DisplayVDigitalBoard = DisplayVDigitalBoard();
boardFromDefinition.columns(2);
const boardItemFromDefinition: DisplayVDigitalBoardItem = DisplayVDigitalBoardItem();
boardItemFromDefinition.value('12').unit('万');
const detailItemFromDefinition2: DisplayVDetailItem = DisplayVDetailItem();
detailItemFromDefinition2.label('名称').value('api-gateway');
const tableWrapperFromDefinition: DisplayVTableWrapper = DisplayVTableWrapper();
tableWrapperFromDefinition.rows([{ id: 1 }]).columns(['名称']);
const theadFromDefinition: DisplayVThead = DisplayVThead();
theadFromDefinition.vTr((row) => row.vTh('名称'));
const treeFromDefinition2: DisplayVTree = DisplayVTree();
treeFromDefinition2.expandAll().nodes([{ id: 'a', label: 'A' }]);
const menuDividerFromDefinition: NavigationVMenuDivider = NavigationVMenuDivider();
// @ts-expect-error `VCarousel({ … })` 的参数会被运行期丢掉（可派发键走 `vCarousel({ … })`）
DisplayVCarousel({ loop: true });
// @ts-expect-error 同上：`VDigitalBoard({ columns })` 走快捷方法
DisplayVDigitalBoard({ columns: 2 });
// @ts-expect-error 同上：`VDetailItem({ label })` 走快捷方法
DisplayVDetailItem({ label: '名称' });
// @ts-expect-error 同上：`VTableWrapper({ rows })` 走快捷方法
DisplayVTableWrapper({ rows: [] });
// @ts-expect-error 部件同样不接受实参（内容是子节点 / 部件命令）
DisplayVThead({ role: 'rowgroup' });
void carouselFromDefinition;
void boardFromDefinition;
void boardItemFromDefinition;
void detailItemFromDefinition2;
void tableWrapperFromDefinition;
void theadFromDefinition;
void treeFromDefinition2;
void menuDividerFromDefinition;

void buttonFromProps;
void buttonsFromProps;
void floatButtonFromProps;
void symbolButtonFromProps;
void dropdownFromProps;
void contextMenuFromProps;
void anchorFromProps;
void anchorItemFromProps;
void breadcrumbFromProps;
void breadcrumbItemFromProps;
void navbarFromProps;
void stepFromProps;
void stepsFromProps;
void tabFromProps;
void tabsFromProps;

const tree = vTree({
  nodes: [{ id: 'root', label: '根节点', children: [{ id: 'a', label: 'A' }] }],
  checkable: true
});
tree.expandAll().checkedKeys(['a']);

// Rebuildable region API.
const region = div((ele) => {
  ele.rebuildable(() => true);
  ele.child('region');
});
region.rebuildable(null);
region.rebuild();
region.rebuild({ force: true });
const rebuildPending: boolean = region.rebuildPending();
void rebuildPending;
region.flush();
region.flushAll();

// Signals drive values: handles go straight into value positions.
const count = ref(0);
const counter = div((ele) => {
  ele.attr('data-count', count);
  ele.child(vText(computed(() => `count=${count.value}`)));
});
counter.flush();

// Text positions take handles directly: HTML child() and SVG text hosts.
const label = ref('待处理');
const labelLine = div((ele) => ele.child(vText(label)));
const labelChild = div((ele) => ele.child(label));
const labelText = svgs.text((line) => line.text(label));
void labelLine;
void labelChild;
void labelText;

// Element value positions take literals, signal handles and zero-argument readers.
const readerCount = ref(3);
const readerNode = div((ele) => {
  ele.attr('data-count', readerCount);
  ele.attr('data-doubled', () => readerCount.value * 2);
  ele.style('width', () => `${readerCount.value}px`);
  ele.styles({ opacity: () => (readerCount.value > 0 ? 1 : 0) });
  ele.toggleClass('is-many', () => readerCount.value > 1);
  ele.child(vText(() => `count=${readerCount.value}`));
});
readerNode.mountable(() => readerCount.value > 0);
readerNode.flush();
void readerNode;

// @ts-expect-error parameterized readers are rejected at runtime and by the types
readerNode.attr('data-invalid', (value: string) => value);

// Component props take handles; readers belong to element value positions.
const propName = ref('待处理');
const propInput = vInput({ name: 'prop', value: propName, placeholder: '搜索' });
void propInput;

// Keyed children, event removal and class toggling are part of the node API.
const keyedHost = div((ele) => {
  ele.addChild('row-1', ele.span('A'));
  ele.getChild('row-1');
  ele.removeChild('row-1');
  ele.on('click', () => {});
  ele.off('click');
  ele.toggleClass('is-active', true);
  ele.toggleClass('is-busy', label);
});
void keyedHost;

// Element rows (`{ el, destroy }`): the compiler's element channel — DOM only, no
// node objects, reconciled by keyed() itself.
const elementChannelRows = ref([{ id: 1 }]);
const elementChannelList = ul((ele) => {
  ele.keyed(elementChannelRows, (row) => ({
    el: document.createElement('li'),
    destroy: () => void row.id
  }));
});
void elementChannelList;

// Row-level update protocol: keep the node when the row is content-equivalent,
// or update it in place when it really changed.
const keyedRows = ref([{ id: 1, title: 'A' }]);
const keyedWithProtocol = ul((ele) => {
  ele.keyed(
    keyedRows,
    (row) => row.id,
    (row) => li((item) => item.child(vText(row.title))),
    {
      equals: (previous, next) => previous.title === next.title,
      update: (node, previous, next) => {
        void previous;
        void next;
        return node;
      }
    }
  );
});
void keyedWithProtocol;

// htmls namespace: every WHATWG tag factory on one object, style alias included.
const byNamespace = htmls.div((root) => root.span('via htmls'));
const styleFactory = htmls.style;
const htmlFactory = htmls.html;
void byNamespace;
void styleFactory;
void htmlFactory;

// i18n.
const i18n = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': { hello: '你好' },
    en: { hello: 'Hello' }
  }
});
i18n.setLanguage('en');
const translated = i18n.t('hello');
void translated;
void i18nText;

// Router.
router((r) => {
  r.mode('hash');
  r.default('/home');
  r.route('/home', () => div('首页'));
  r.notFound(() => div('404'));
  r.start();
  r.navigate('/home');
});

// SSR helpers.
const result = renderToString(() => div('hello'), { state: { path: '/home' } });
const serialized = result.state;
const parsed = parseState(serialized);
void parsed;

// Pluggable state engine: the adapter contract is public and plugins are user-written
// (the examples site ships a copy-paste template).
const myEngine: SignalsAdapter = {
  name: 'my-engine',
  createSignal: (initial: unknown) => ({ value: initial, listeners: new Set<() => void>() }),
  read: (source: any) => source.value,
  write: (source: any, value: unknown) => {
    source.value = value;
    source.listeners.forEach((listener: () => void) => listener());
  },
  subscribe: (source: any, listener: (value: unknown) => void) => {
    const notify = () => listener(source.value);
    source.listeners.add(notify);
    return () => source.listeners.delete(notify);
  },
  batch: <T>(run: () => T) => run()
};
installSignals(myEngine);
installSignals(null);

const hydrated = hydrate(() => div('hello'), '#app', {});
const mounted = mount(() => div('hello'), document.body);
void hydrated;
void mounted;

// Document routes: internal HTML addresses and external links jump as real documents.
const documentRouter = vRouter({
  routes: [
    vRoute('/legacy/report.html', { title: '旧报表', url: true }),
    vRoute('/docs', { target: '_blank', url: 'https://example.com/docs' })
  ]
});
documentRouter.navigateDocument('/legacy/report.html', { replace: true });
const documentLink = vLink(documentRouter, { label: '文档', to: '/docs' });
void documentLink;

// ECharts component and icons.
vEchart((chart) => {
  chart.option({ series: [] });
  chart.height('300px');
});

// Three.js component and lifecycle api.
vThree((three) => {
  three.autoRender(false);
  three.height('320px');
  three.onReady(({ renderer, scene }) => {
    renderer.render(scene, three.getCamera());
  });
});

SearchOutlined().className('yoya-icon');

// ElementNode generic helpers.
const node: ElementNode = div('x');
node.child(vText('y'));

// Devtools opt-in runtime lives on its own subpath.
enableDevtools();
const devtoolsEnabled: boolean = isDevtoolsEnabled();
const stopDevtools: () => void = subscribeDevtools((event) => {
  const eventType: string = event.type;
  void eventType;
});
disableDevtools();
void devtoolsEnabled;
void stopDevtools;

// Keep variables referenced to avoid unused-import lint concerns.
void page;
void buttonNode;
void badge;
void form;
void layout;
void counter;
void ssrRender;
void i18n;

// Category subpath entries resolve to the same component contracts.
void ActionsVButton;
void actionsVButton;
void actionsVFloatButton;
void NavigationVBreadcrumb;
void NavigationVMenu;
void NavigationVTabs;
void navigationVBreadcrumb;
void navigationVMenu;
void navigationVTabs;
void FeedbackVDialog;
void FeedbackVMessage;
void FeedbackVTooltip;
void feedbackToast;
void feedbackVDialog;
void feedbackVMessage;
void feedbackVTooltip;
void FormVForm;
void FormVInput;
void FormVSelect;
void formVCheckbox;
void formVForm;
void formVInput;
void formVRate;
void formVSelect;
void formVUpload;
void DisplayVBadge;
void DisplayVTable;
void DisplayVTableWrapper;
void displayVBadge;
void displayVPagination;
void displayVTable;
void displayVTableWrapper;
void displayVTree;
void asyncVDynamicLoader;
void asyncVLazyImage;
void asyncVSkeleton;

// ---------------------------------------------------------------------------
// Compile path: build-time compiler plus the runtime hooks it generates calls to
// ---------------------------------------------------------------------------

import {
  buildComponentRegistry,
  compileComponent,
  componentKeyOf,
  compileFile,
  compileSource,
  elementWhitelistOf,
  reportCoverage,
  runCli,
  wireComponentModule,
  componentUnits,
  yoyaCompile,
  yoyaCompilePlugin,
  type ComponentRegistry,
  type ComponentRegistryResult,
  type CompileResult,
  type CoverageReport,
  type WiredRowModule,
  type YoyaCompilePlugin
} from '@yoyaflow/yoya-ui/compiler';
import {
  bindClass,
  bindComponent,
  bindText,
  cloneFragment,
  createElementList,
  pushOff,
  setAttr,
  type CompiledPlan,
  type CompiledRow
} from '@yoyaflow/yoya-ui/compiler-runtime';

declare const core: unknown;

const compileResult: CompileResult = compileSource({
  source: 'export function buildRow(row) { return tr((line) => line.td(String(row.id))); }',
  file: 'row.js',
  fn: 'buildRow',
  mode: 'element',
  core,
  runtime: 'yoya-ui/compiler-runtime'
});

const written: CompileResult & { out: string | null } = compileFile({
  source: '',
  file: 'row.js',
  out: 'row.generated.js',
  core
});

const coverage: CoverageReport = reportCoverage({ root: 'src', fn: 'buildRow', core });
const exitCode: Promise<number> = runCli(['--report', 'src', '--json'], { core });
const whitelist: Set<string> = elementWhitelistOf(core);
const plan: CompiledPlan | null = compileResult.plan;

const element: Element = cloneFragment('<tr><td>0</td></tr>');
const offs: Array<() => void> = [];
pushOff(offs, bindText(element, 'plain'));
pushOff(offs, bindClass(element, 'is-on', true));
pushOff(offs, setAttr(element, 'data-x', 1));

const list = createElementList<{ id: number }>(element, (row) => row.id);
list.sync([{ id: 1 }], (row): CompiledRow => ({ el: element, data: row, destroy: () => {} }));
const first: Element | undefined = list.elements()[0];

// 键镜像按选项显式打开（默认不写，行 DOM 与参考实现逐字节一致）。
const keyedList = createElementList<{ id: number }>(element, (row) => row.id, {
  keyAttribute: 'data-row-key'
});
const keyedListSize: number = keyedList.size;
void keyedListSize;

// 构建期 transform：unplugin 各打包器入口 + 纯函数两半都要能用。
const plugin: YoyaCompilePlugin = yoyaCompile.esbuild({
  core // 默认：按组件边界自动发现编译单元
});
const vitePlugin: YoyaCompilePlugin = yoyaCompile.vite({
  core,
  onArtifact: (name, source) => void [name, source]
});
// 库内逃生口：明确点名某个组件（业务侧不需要）
const rollupPlugin: YoyaCompilePlugin = yoyaCompile.rollup({
  core,
  units: [{ component: 'StatusPill', file: 'src/main.js', mode: 'element' }]
});
const webpackPlugin: YoyaCompilePlugin = yoyaCompile.webpack({ core, mode: 'node' });
const legacyEsbuildPlugin: YoyaCompilePlugin = yoyaCompilePlugin({ core });
void [plugin, vitePlugin, rollupPlugin, webpackPlugin, legacyEsbuildPlugin];
const wired: WiredRowModule | null = wireComponentModule({
  source: 'export function Card(props) { return div((box) => box.child(String(props.label))); }',
  target: { component: 'Card', file: 'src/main.js' },
  core
});
const discovered = componentUnits('export function Card(props) { return div((box) => box); }', {
  core,
  file: 'src/main.js'
});
void discovered;
if (wired) {
  const wiredCode: string = wired.code;
  const wiredModule: string = wired.module;
  const virtual: string = wired.virtual;
  const wiredMap: unknown = wired.map;
  const moduleMap: unknown = wired.moduleMap;
  void [wiredCode, wiredModule, virtual, wiredMap, moduleMap];
}

const componentResult: CompileResult = compileComponent({
  source: '',
  file: 'src/components/status-dot.js',
  export: 'StatusDot',
  core
});
const registryResult: ComponentRegistryResult = buildComponentRegistry({
  entries: [{ file: 'src/components/status-dot.js', export: 'StatusDot' }],
  dir: '.yoya/components',
  core
});
const componentRegistry: ComponentRegistry = registryResult.registry;
const componentKey: string = componentKeyOf('src/components/status-dot.js', 'StatusDot');
const linked: (() => void) | null = bindComponent(
  { hash: 'h', bind: () => () => {}, render: () => null },
  element,
  [{}],
  'h'
);

void written;
void coverage;
void exitCode;
void whitelist;
void plan;
void offs;
void first;
void componentResult;
void componentRegistry;
void componentKey;
void linked;
