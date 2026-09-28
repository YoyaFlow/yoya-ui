/**
 * 由 yoya-kitgen 生成——勿手改。接线写在组件源码 JSDoc 的 @genui* 运行时标签里，重跑生成。
 * manifest：与本文件同一次扫描产出（版本一致），给模型看的目录在那边。
 */
import { createPlugin } from '@yoyaflow/yoya-core/genui';
import {
  center,
  container,
  divider,
  flex,
  grid,
  hstack,
  mobileLayout,
  responsiveGrid,
  spacer,
  stack,
  vAnchor,
  vAnchorItem,
  vAside,
  vAutocomplete,
  vAvatar,
  vAvatarUpload,
  vBadge,
  vBody,
  vBreadcrumb,
  vBreadcrumbItem,
  vButton,
  vButtons,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vCarousel,
  vCascader,
  vChart,
  vCheckbox,
  vCheckboxes,
  vCode,
  vCol,
  vColorPicker,
  vConfirm,
  vContainer,
  vContextMenu,
  vDetail,
  vDetailItem,
  vDialog,
  vDigitalBoard,
  vDigitalBoardItem,
  vDropdownMenu,
  vDynamicLoader,
  vField,
  vFloatButton,
  vFooter,
  vForm,
  vFormItem,
  vGauge,
  vGlowButton,
  vHeader,
  vImagePreview,
  vInput,
  vLanguageSwitch,
  vLazyImage,
  vMain,
  vMasonry,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vMenuWrapper,
  vMessage,
  vMessageContainer,
  vMessageManager,
  vNavbar,
  vPagination,
  vProgress,
  vRadio,
  vRadios,
  vRate,
  vRingStat,
  vRow,
  vScroll,
  vSelect,
  vSidebar,
  vSkeleton,
  vSlider,
  vSlot,
  vSparkline,
  vSplitPanel,
  vstack,
  vStep,
  vSteps,
  vSubMenu,
  vSvgIconPicker,
  vSwitch,
  vSymbolButton,
  vTab,
  vTable,
  vTableWrapper,
  vTabs,
  vTagsInput,
  vTbody,
  vTd,
  vTextarea,
  vTfoot,
  vTh,
  vThead,
  vThemeModeSwitch,
  vTimeline,
  vTimelineItem,
  vTimer,
  vTimerRange,
  vTooltip,
  vTr,
  vTransition,
  vTree,
  vTreeNode,
  vTreeRanger,
  vTreeRangerColumn,
  vTreeTable,
  vTrendCard,
  vUpload
} from '@yoyaflow/yoya-ui/ui';
import {
  vLink,
  vLinkLabel,
  vRoute,
  vRouter,
  vRouterView,
  vRouterViews
} from '@yoyaflow/yoya-ui/router';
import { vEchart } from '@yoyaflow/yoya-ui/echart';
import { vThree } from '@yoyaflow/yoya-ui/three';

export const namespace = 'yoyaflow/yoya-ui';
export const version = '0.7.6';

export const components = {
  Anchor: {
    factory: vAnchor,
    aliases: ['vAnchor', 'VAnchor'],
    itemBridge: { command: 'vAnchorItem', contentProp: null, itemType: 'vAnchorItem' }
  },
  AnchorItem: {
    factory: vAnchorItem,
    aliases: ['vAnchorItem', 'VAnchorItem'],
    textProp: 'title'
  },
  Aside: {
    factory: vAside,
    aliases: ['vAside', 'VAside']
  },
  Autocomplete: {
    factory: vAutocomplete,
    aliases: ['vAutocomplete', 'VAutocomplete']
  },
  Avatar: {
    factory: vAvatar,
    aliases: ['vAvatar', 'VAvatar'],
    childrenProp: 'children',
    props: { alt: 'alt', shape: 'shape', size: 'size', src: 'src' }
  },
  AvatarUpload: {
    factory: vAvatarUpload,
    aliases: ['vAvatarUpload', 'VAvatarUpload']
  },
  Badge: {
    factory: vBadge,
    aliases: ['vBadge', 'VBadge'],
    childrenProp: 'children',
    props: { count: 'count', dot: 'dot', label: 'label', status: 'status', text: 'text' }
  },
  Breadcrumb: {
    factory: vBreadcrumb,
    aliases: ['vBreadcrumb', 'VBreadcrumb'],
    itemBridge: {
      command: 'vBreadcrumbItem',
      contentProp: null,
      itemType: 'vBreadcrumbItem'
    }
  },
  BreadcrumbItem: {
    factory: vBreadcrumbItem,
    aliases: ['vBreadcrumbItem', 'VBreadcrumbItem'],
    textProp: 'label'
  },
  Button: {
    factory: vButton,
    aliases: ['vButton', 'VButton'],
    props: {
      disabled: { to: 'command:disabled', read: 'command:isDisabled' },
      label: 'label',
      loading: { to: 'command:loading', read: 'command:isLoading' },
      size: 'size',
      value: 'value',
      variant: 'variant'
    },
    events: { click: { channel: 'dom', event: 'click' } },
    textProp: 'label'
  },
  Buttons: {
    factory: vButtons,
    aliases: ['vButtons', 'VButtons']
  },
  Card: {
    factory: vCard,
    aliases: ['vCard', 'VCard']
  },
  CardBody: {
    factory: vCardBody,
    aliases: ['vCardBody', 'VCardBody'],
    kind: 'element'
  },
  CardFooter: {
    factory: vCardFooter,
    aliases: ['vCardFooter', 'VCardFooter'],
    kind: 'element'
  },
  CardHeader: {
    factory: vCardHeader,
    aliases: ['vCardHeader', 'VCardHeader'],
    kind: 'element'
  },
  Carousel: {
    factory: vCarousel,
    aliases: ['vCarousel', 'VCarousel']
  },
  Cascader: {
    factory: vCascader,
    aliases: ['vCascader', 'VCascader']
  },
  Chart: {
    factory: vChart,
    aliases: ['vChart', 'VChart']
  },
  Checkbox: {
    factory: vCheckbox,
    aliases: ['vCheckbox', 'VCheckbox'],
    props: {
      checked: { to: 'command:checked', read: 'command:checked', live: false },
      disabled: 'disabled',
      label: 'label',
      name: 'name',
      optionValue: 'optionValue'
    },
    events: { change: { channel: 'dom', event: 'change' } },
    textProp: 'label'
  },
  Checkboxes: {
    factory: vCheckboxes,
    aliases: ['vCheckboxes', 'VCheckboxes'],
    props: {
      columns: 'columns',
      disabled: 'disabled',
      multiple: 'multiple',
      name: 'name',
      options: 'options',
      value: { to: 'command:value', read: 'command:value', live: false }
    },
    events: { change: { channel: 'callback', prop: 'change', payload: '0' } },
    expose: { value: 'value' }
  },
  Code: {
    factory: vCode,
    aliases: ['vCode', 'VCode'],
    childrenProp: 'children'
  },
  ColorPicker: {
    factory: vColorPicker,
    aliases: ['vColorPicker', 'VColorPicker']
  },
  Confirm: {
    factory: vConfirm,
    aliases: ['vConfirm', 'VConfirm']
  },
  ContextMenu: {
    factory: vContextMenu,
    aliases: ['vContextMenu', 'VContextMenu']
  },
  Detail: {
    factory: vDetail,
    aliases: ['vDetail', 'VDetail'],
    itemBridge: { command: 'vDetailItem', contentProp: null, itemType: 'vDetailItem' }
  },
  DetailItem: {
    factory: vDetailItem,
    aliases: ['vDetailItem', 'VDetailItem']
  },
  Dialog: {
    factory: vDialog,
    aliases: ['vDialog', 'VDialog'],
    childrenProp: 'children',
    props: {
      closable: 'closable',
      open: { to: 'command:open', read: 'command:isOpen', live: false }
    },
    events: { close: { channel: 'callback', prop: 'onClose' } }
  },
  DigitalBoard: {
    factory: vDigitalBoard,
    aliases: ['vDigitalBoard', 'VDigitalBoard']
  },
  DigitalBoardItem: {
    factory: vDigitalBoardItem,
    aliases: ['vDigitalBoardItem', 'VDigitalBoardItem']
  },
  DropdownMenu: {
    factory: vDropdownMenu,
    aliases: ['vDropdownMenu', 'VDropdownMenu'],
    childrenProp: 'children'
  },
  DynamicLoader: {
    factory: vDynamicLoader,
    aliases: ['vDynamicLoader', 'VDynamicLoader']
  },
  Echart: {
    factory: vEchart,
    aliases: ['vEchart', 'VEchart']
  },
  Field: {
    factory: vField,
    aliases: ['vField', 'VField'],
    childCommand: 'control'
  },
  FloatButton: {
    factory: vFloatButton,
    aliases: ['vFloatButton', 'VFloatButton'],
    textProp: 'label'
  },
  Footer: {
    factory: vFooter,
    aliases: ['vFooter', 'VFooter']
  },
  Form: {
    factory: vForm,
    aliases: ['vForm', 'VForm']
  },
  FormItem: {
    factory: vFormItem,
    aliases: ['vFormItem', 'VFormItem']
  },
  Gauge: {
    factory: vGauge,
    aliases: ['vGauge', 'VGauge'],
    props: {
      max: 'max',
      unit: 'unit',
      value: { to: 'command:value', read: 'command:value', live: true }
    },
    expose: { value: 'value' }
  },
  GlowButton: {
    factory: vGlowButton,
    aliases: ['vGlowButton', 'VGlowButton'],
    textProp: 'label'
  },
  Header: {
    factory: vHeader,
    aliases: ['vHeader', 'VHeader']
  },
  ImagePreview: {
    factory: vImagePreview,
    aliases: ['vImagePreview', 'VImagePreview']
  },
  Input: {
    factory: vInput,
    aliases: ['vInput', 'VInput'],
    props: {
      disabled: { to: 'command:disabled', read: 'command:isDisabled' },
      error: { to: 'command:error' },
      name: 'name',
      placeholder: 'placeholder',
      readonly: { to: 'command:readonly', read: 'command:isReadonly' },
      required: { to: 'command:required' },
      type: 'type',
      value: { to: 'command:value', read: 'command:value', live: true }
    },
    events: {
      change: { channel: 'dom', event: 'change' },
      input: { channel: 'dom', event: 'input' }
    },
    expose: { value: 'value' }
  },
  LanguageSwitch: {
    factory: vLanguageSwitch,
    aliases: ['vLanguageSwitch', 'VLanguageSwitch']
  },
  LazyImage: {
    factory: vLazyImage,
    aliases: ['vLazyImage', 'VLazyImage'],
    props: { alt: 'alt', defer: 'defer', src: 'src' }
  },
  Link: {
    factory: vLink,
    aliases: ['vLink', 'VLink']
  },
  LinkLabel: {
    factory: vLinkLabel,
    aliases: ['vLinkLabel', 'VLinkLabel']
  },
  Main: {
    factory: vMain,
    aliases: ['vMain', 'VMain']
  },
  Masonry: {
    factory: vMasonry,
    aliases: ['vMasonry', 'VMasonry']
  },
  Menu: {
    factory: vMenu,
    aliases: ['vMenu', 'VMenu']
  },
  MenuDivider: {
    factory: vMenuDivider,
    aliases: ['vMenuDivider', 'VMenuDivider']
  },
  MenuGroup: {
    factory: vMenuGroup,
    aliases: ['vMenuGroup', 'VMenuGroup']
  },
  MenuItem: {
    factory: vMenuItem,
    aliases: ['vMenuItem', 'VMenuItem']
  },
  MenuWrapper: {
    factory: vMenuWrapper,
    aliases: ['vMenuWrapper', 'VMenuWrapper']
  },
  Message: {
    factory: vMessage,
    aliases: ['vMessage', 'VMessage'],
    childrenProp: 'children'
  },
  MessageContainer: {
    factory: vMessageContainer,
    aliases: ['vMessageContainer', 'VMessageContainer']
  },
  MessageManager: {
    factory: vMessageManager,
    aliases: ['vMessageManager', 'VMessageManager']
  },
  Navbar: {
    factory: vNavbar,
    aliases: ['vNavbar', 'VNavbar']
  },
  Pagination: {
    factory: vPagination,
    aliases: ['vPagination', 'VPagination']
  },
  Progress: {
    factory: vProgress,
    aliases: ['vProgress', 'VProgress'],
    props: { label: 'label', max: 'max', value: { to: 'command:value', live: false } },
    expose: { value: 'value' }
  },
  Radio: {
    factory: vRadio,
    aliases: ['vRadio', 'VRadio'],
    props: {
      checked: { to: 'command:checked', read: 'command:checked', live: false },
      disabled: 'disabled',
      label: 'label',
      name: 'name',
      optionValue: 'optionValue'
    },
    events: { change: { channel: 'dom', event: 'change' } },
    textProp: 'label'
  },
  Radios: {
    factory: vRadios,
    aliases: ['vRadios', 'VRadios'],
    props: {
      disabled: 'disabled',
      name: 'name',
      options: 'options',
      value: { to: 'command:value', read: 'command:value', live: false }
    },
    events: { change: { channel: 'callback', prop: 'change', payload: '0' } },
    expose: { value: 'value' }
  },
  Rate: {
    factory: vRate,
    aliases: ['vRate', 'VRate'],
    props: { max: 'max', value: { to: 'command:value', read: 'command:value', live: true } },
    expose: { value: 'value' }
  },
  RingStat: {
    factory: vRingStat,
    aliases: ['vRingStat', 'VRingStat']
  },
  Route: {
    factory: vRoute,
    aliases: ['vRoute', 'VRoute']
  },
  Router: {
    factory: vRouter,
    aliases: ['vRouter', 'VRouter']
  },
  RouterView: {
    factory: vRouterView,
    aliases: ['vRouterView', 'VRouterView']
  },
  RouterViews: {
    factory: vRouterViews,
    aliases: ['vRouterViews', 'VRouterViews']
  },
  Scroll: {
    factory: vScroll,
    aliases: ['vScroll', 'VScroll']
  },
  Select: {
    factory: vSelect,
    aliases: ['vSelect', 'VSelect'],
    props: {
      name: 'name',
      options: 'options',
      placeholder: 'placeholder',
      value: { to: 'command:value', read: 'command:value', live: true }
    },
    events: { change: { channel: 'dom', event: 'change' } },
    expose: { value: 'value' }
  },
  Sidebar: {
    factory: vSidebar,
    aliases: ['vSidebar', 'VSidebar']
  },
  Skeleton: {
    factory: vSkeleton,
    aliases: ['vSkeleton', 'VSkeleton']
  },
  Slider: {
    factory: vSlider,
    aliases: ['vSlider', 'VSlider'],
    props: {
      max: 'max',
      min: 'min',
      step: 'step',
      value: { to: 'command:value', read: 'command:value', live: true }
    },
    events: {
      change: { channel: 'dom', event: 'change' },
      input: { channel: 'dom', event: 'input' }
    },
    expose: { value: 'value' }
  },
  Slot: {
    factory: vSlot,
    aliases: ['vSlot', 'VSlot'],
    kind: 'element',
    textProp: 'setupString'
  },
  Sparkline: {
    factory: vSparkline,
    aliases: ['vSparkline', 'VSparkline']
  },
  SplitPanel: {
    factory: vSplitPanel,
    aliases: ['vSplitPanel', 'VSplitPanel']
  },
  Step: {
    factory: vStep,
    aliases: ['vStep', 'VStep'],
    props: { description: 'description', title: 'title' },
    textProp: 'title'
  },
  Steps: {
    factory: vSteps,
    aliases: ['vSteps', 'VSteps'],
    itemBridge: { command: 'vStep', contentProp: 'description', itemType: 'vStep' }
  },
  SubMenu: {
    factory: vSubMenu,
    aliases: ['vSubMenu', 'VSubMenu']
  },
  SvgIconPicker: {
    factory: vSvgIconPicker,
    aliases: ['vSvgIconPicker', 'VSvgIconPicker']
  },
  Switch: {
    factory: vSwitch,
    aliases: ['vSwitch', 'VSwitch'],
    props: {
      checked: { to: 'command:checked', read: 'command:checked', live: false },
      name: 'name'
    },
    events: { change: { channel: 'dom', event: 'change' } }
  },
  SymbolButton: {
    factory: vSymbolButton,
    aliases: ['vSymbolButton', 'VSymbolButton'],
    textProp: 'title'
  },
  Tab: {
    factory: vTab,
    aliases: ['vTab', 'VTab'],
    childrenProp: 'children',
    props: { disabled: 'disabled', icon: 'icon', label: 'label', value: 'value' },
    textProp: 'label'
  },
  Table: {
    factory: vTable,
    aliases: ['vTable', 'VTable']
  },
  TableWrapper: {
    factory: vTableWrapper,
    aliases: ['vTableWrapper', 'VTableWrapper']
  },
  Tabs: {
    factory: vTabs,
    aliases: ['vTabs', 'VTabs'],
    itemBridge: { command: 'vTab', contentProp: 'children', itemType: 'vTab' },
    props: {
      active: { to: 'command:active', live: false },
      ariaLabel: 'ariaLabel',
      orientation: 'orientation'
    },
    events: { change: { channel: 'callback', prop: 'change' } }
  },
  TagsInput: {
    factory: vTagsInput,
    aliases: ['vTagsInput', 'VTagsInput']
  },
  Tbody: {
    factory: vTbody,
    aliases: ['vTbody', 'VTbody']
  },
  Td: {
    factory: vTd,
    aliases: ['vTd', 'VTd']
  },
  Textarea: {
    factory: vTextarea,
    aliases: ['vTextarea', 'VTextarea'],
    props: {
      name: 'name',
      placeholder: 'placeholder',
      value: { to: 'command:value', read: 'command:value', live: true }
    },
    events: {
      change: { channel: 'dom', event: 'change' },
      input: { channel: 'dom', event: 'input' }
    },
    expose: { value: 'value' }
  },
  Tfoot: {
    factory: vTfoot,
    aliases: ['vTfoot', 'VTfoot']
  },
  Th: {
    factory: vTh,
    aliases: ['vTh', 'VTh']
  },
  Thead: {
    factory: vThead,
    aliases: ['vThead', 'VThead']
  },
  ThemeModeSwitch: {
    factory: vThemeModeSwitch,
    aliases: ['vThemeModeSwitch', 'VThemeModeSwitch']
  },
  Three: {
    factory: vThree,
    aliases: ['vThree', 'VThree']
  },
  Timeline: {
    factory: vTimeline,
    aliases: ['vTimeline', 'VTimeline'],
    itemBridge: {
      command: 'vTimelineItem',
      contentProp: 'content',
      itemType: 'vTimelineItem'
    }
  },
  TimelineItem: {
    factory: vTimelineItem,
    aliases: ['vTimelineItem', 'VTimelineItem'],
    childrenProp: 'content',
    props: { status: 'status', time: 'time', title: 'title' }
  },
  Timer: {
    factory: vTimer,
    aliases: ['vTimer', 'VTimer'],
    props: {
      mode: 'mode',
      type: 'type',
      value: { to: 'command:value', read: 'command:value', live: true }
    }
  },
  TimerRange: {
    factory: vTimerRange,
    aliases: ['vTimerRange', 'VTimerRange'],
    props: {
      mode: 'mode',
      end: 'end',
      start: 'start',
      value: { to: 'command:value', read: 'command:value', live: true }
    }
  },
  Tooltip: {
    factory: vTooltip,
    aliases: ['vTooltip', 'VTooltip'],
    childrenProp: 'children'
  },
  Tr: {
    factory: vTr,
    aliases: ['vTr', 'VTr']
  },
  Transition: {
    factory: vTransition,
    aliases: ['vTransition', 'VTransition']
  },
  Tree: {
    factory: vTree,
    aliases: ['vTree', 'VTree']
  },
  TreeNode: {
    factory: vTreeNode,
    aliases: ['vTreeNode', 'VTreeNode']
  },
  TreeRanger: {
    factory: vTreeRanger,
    aliases: ['vTreeRanger', 'VTreeRanger']
  },
  TreeRangerColumn: {
    factory: vTreeRangerColumn,
    aliases: ['vTreeRangerColumn', 'VTreeRangerColumn']
  },
  TreeTable: {
    factory: vTreeTable,
    aliases: ['vTreeTable', 'VTreeTable']
  },
  TrendCard: {
    factory: vTrendCard,
    aliases: ['vTrendCard', 'VTrendCard']
  },
  Upload: {
    factory: vUpload,
    aliases: ['vUpload', 'VUpload']
  }
};

export const core = {
  center: { factory: center, kind: 'element' },
  container: { factory: container, kind: 'element' },
  divider: { factory: divider, kind: 'element' },
  flex: { factory: flex, kind: 'element' },
  grid: { factory: grid, kind: 'element' },
  hstack: { factory: hstack, kind: 'element' },
  mobileLayout: { factory: mobileLayout, kind: 'element' },
  responsiveGrid: { factory: responsiveGrid, kind: 'element' },
  spacer: { factory: spacer, kind: 'element' },
  stack: { factory: stack, kind: 'element' },
  vBody: { factory: vBody, kind: 'element' },
  vCol: { factory: vCol, kind: 'element' },
  vContainer: { factory: vContainer, kind: 'element' },
  vRow: { factory: vRow, kind: 'element' },
  vstack: { factory: vstack, kind: 'element' }
};

export const repo = 'https://github.com/yoyaflow/yoya-ui.git';
export const aliases = ['yoya-ui'];

export const plugin = createPlugin({
  id: 'yoyaflow/yoya-ui@0.7.6',
  default: true,
  repo: 'https://github.com/yoyaflow/yoya-ui.git',
  aliases: ['yoya-ui'],
  components,
  core
});

export default plugin;
