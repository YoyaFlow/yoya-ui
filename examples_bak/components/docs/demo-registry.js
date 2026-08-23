import {
  AuditCard,
  DeploymentTaskCard,
  LocaleSwitchCard,
  actionsCategory as actionsSourceCategory
} from '../demos/actions.js';
import { DynamicModuleCard } from '../demos/async.js';
import {
  ChartAdapterCard,
  CodeBlockCard,
  PagedServiceTableCard,
  ServiceDetailCard,
  ServiceTableCard,
  SqlSnippetCard,
  dataDisplayCategory as dataDisplaySourceCategory
} from '../demos/data-display.js';
import {
  LocalMessageManagerCard,
  feedbackCategory as feedbackSourceCategory
} from '../demos/feedback.js';
import {
  OwnerFieldCard,
  ScheduleTimerCard,
  ServiceFormCard,
  TimerRangeCard,
  formCategory as formSourceCategory
} from '../demos/form.js';
import { BodyPageCard, layoutCategory as layoutSourceCategory } from '../demos/layout.js';
import {
  CommandMenuCard,
  OverlayMenuCard,
  SidebarCard,
  SubMenuCard,
  navigationCategory as navigationSourceCategory
} from '../demos/navigation.js';
import {
  DeclarativeRouterCard,
  RouterNavigationCard,
  RouterViewsEditorCard,
  routerCategory as routerSourceCategory
} from '../demos/router.js';
import { defineCategory, defineDemo } from './demo-metadata.js';

const sourceCategories = {
  actions: defineCategory({
    boundary: {
      doesNotOwn: ['路由状态', '表单采集', '异步加载', '数据分页'],
      owns: ['按钮、下拉和右键操作']
    },
    components: ['button'],
    description: actionsSourceCategory.description,
    id: 'actions',
    sourceDir: 'examples/components/demos/actions',
    title: actionsSourceCategory.title
  }),
  async: defineCategory({
    boundary: {
      doesNotOwn: ['导航状态', '表单采集', '数据展示逻辑'],
      owns: ['动态模块加载和重试']
    },
    components: ['dynamic-loader'],
    description: '异步模块状态、失败重试与缓存。',
    id: 'async',
    sourceDir: 'examples/components/demos/async',
    title: '异步加载'
  }),
  dataDisplay: defineCategory({
    boundary: {
      doesNotOwn: ['页面路由', '表单提交', '消息生命周期'],
      owns: ['详情、代码、表格、分页和图表展示']
    },
    components: ['detail', 'code', 'table', 'pagination', 'chart', 'code-block'],
    description: dataDisplaySourceCategory.description,
    id: 'data-display',
    sourceDir: 'examples/components/demos/data-display',
    title: dataDisplaySourceCategory.title
  }),
  feedback: defineCategory({
    boundary: {
      doesNotOwn: ['表单校验', '路由跳转', '数据分页'],
      owns: ['局部消息容器和消息替换']
    },
    components: ['message', 'message-manager'],
    description: feedbackSourceCategory.description,
    id: 'feedback',
    sourceDir: 'examples/components/demos/feedback',
    title: feedbackSourceCategory.title
  }),
  form: defineCategory({
    boundary: {
      doesNotOwn: ['数据表格分页', '路由视图管理', '全局消息'],
      owns: ['输入控件、字段和表单采集']
    },
    components: [
      'controls',
      'input',
      'select',
      'textarea',
      'checkbox',
      'switch',
      'checkboxes',
      'field',
      'timer',
      'timer-range',
      'form'
    ],
    description: formSourceCategory.description,
    id: 'form',
    sourceDir: 'examples/components/demos/form',
    title: formSourceCategory.title
  }),
  layout: defineCategory({
    boundary: {
      doesNotOwn: ['组件状态', '导航交互', '数据采集'],
      owns: ['页面容器、内容宽度和响应式网格']
    },
    components: ['body'],
    description: layoutSourceCategory.description,
    id: 'layout',
    sourceDir: 'examples/components/demos/layout',
    title: layoutSourceCategory.title
  }),
  navigation: defineCategory({
    boundary: {
      doesNotOwn: ['表单值采集', '分页逻辑', '异步加载'],
      owns: ['菜单、侧栏、子菜单和浮层导航']
    },
    components: ['menu', 'sidebar', 'dropdown-menu', 'context-menu'],
    description: navigationSourceCategory.description,
    id: 'navigation',
    sourceDir: 'examples/components/demos/navigation',
    title: navigationSourceCategory.title
  }),
  router: defineCategory({
    boundary: {
      doesNotOwn: ['菜单项样式', '表单采集', '消息状态'],
      owns: ['链接导航、路由匹配和路由视图']
    },
    components: ['router'],
    description: routerSourceCategory.description,
    id: 'router',
    sourceDir: 'examples/components/demos/router',
    title: routerSourceCategory.title
  })
};

function createDemo(entry) {
  return defineDemo(entry);
}

const demoDefinitions = [
  createDemo({
    api: [
      [
        'label(content)',
        'ViewNode | string | number',
        '-',
        '设置按钮显示内容。',
        '只负责按钮标签，不提交表单。'
      ],
      [
        'variant(value)',
        "'primary' | 'secondary' | 'danger' | 'ghost'",
        "'secondary'",
        '设置视觉语义。',
        '不负责权限判断。'
      ],
      [
        'size(value)',
        "'small' | 'medium' | 'large'",
        "'medium'",
        '设置尺寸。',
        '不负责响应式布局。'
      ],
      ['loading(value)', 'boolean', 'false', '显示忙碌状态。', '不自动禁用外部业务请求。'],
      ['disabled(value)', 'boolean', 'false', '禁用交互。', '业务是否可操作由调用方决定。']
    ],
    behavior: [
      '默认渲染为 type="button"，避免误触发表单提交。',
      'loading 时设置 aria-busy。',
      'disabled 时设置 disabled 属性并降低透明度。'
    ],
    boundaries: {
      doesNotOwn: ['权限判断', '请求生命周期', '表单提交策略'],
      owns: ['按钮语义', '视觉状态', '加载和禁用状态'],
      related: ['toast', 'vDropdownMenu', 'vForm']
    },
    categoryId: 'actions',
    categoryTitle: '操作组件',
    component: DeploymentTaskCard,
    componentLabel: 'vButton',
    description: '用于触发单个明确操作，支持 variant、size、loading 和 disabled 状态。',
    demoTitle: '按钮状态核心源码',
    id: 'button',
    imports: ['vButton', 'vCard', 'vText'],
    keywords: ['button', 'action', 'loading', 'disabled', '操作', '按钮'],
    related: ['dropdown-menu', 'form'],
    routePath: '/actions/button',
    sourceFile: 'examples/components/demos/actions.js',
    sourceTitle: '按钮状态核心源码',
    status: 'stable',
    summary: '用于触发单个明确操作。',
    title: '按钮状态'
  }),
  createDemo({
    api: [],
    behavior: ['聚合多按钮操作，适合任务卡片和流程页。'],
    boundaries: {
      doesNotOwn: ['权限判断', '请求生命周期'],
      owns: ['任务启动', '状态反馈', '加载状态展示'],
      related: ['toast']
    },
    categoryId: 'actions',
    categoryTitle: '操作组件',
    component: AuditCard,
    componentLabel: 'vButton',
    description: '展示危险操作按钮和状态反馈。',
    demoTitle: '危险按钮核心源码',
    id: 'audit',
    imports: ['vButton', 'vCard', 'vText'],
    keywords: ['audit', '配置', '审计'],
    related: ['button'],
    routePath: '/actions/audit',
    sourceFile: 'examples/components/demos/actions.js',
    sourceTitle: '危险按钮核心源码',
    status: 'stable',
    summary: '展示危险操作按钮和状态反馈。',
    title: '危险按钮'
  }),
  createDemo({
    api: [],
    behavior: ['切换语言后按钮文案保持同步，视觉状态不变。'],
    boundaries: {
      doesNotOwn: ['路由状态', '表单校验'],
      owns: ['语言切换按钮', '国际化反馈'],
      related: ['toast']
    },
    categoryId: 'actions',
    categoryTitle: '操作组件',
    component: LocaleSwitchCard,
    componentLabel: 'vButton',
    description: '展示国际化按钮与语言切换。',
    demoTitle: '国际化按钮核心源码',
    id: 'locale-switch',
    imports: ['vButton', 'vCard'],
    keywords: ['locale', 'i18n', '语言'],
    related: ['button'],
    routePath: '/actions/locale-switch',
    sourceFile: 'examples/components/demos/actions.js',
    sourceTitle: '国际化按钮核心源码',
    status: 'stable',
    summary: '展示国际化按钮与语言切换。',
    title: '国际化按钮'
  }),
  createDemo({
    api: [],
    behavior: ['自动重试后更新模块状态。'],
    boundaries: {
      doesNotOwn: ['路由导航', '菜单选择'],
      owns: ['加载状态', '失败重试', '模块缓存'],
      related: ['vCard']
    },
    categoryId: 'async',
    categoryTitle: '异步加载',
    component: DynamicModuleCard,
    componentLabel: 'vDynamicLoader',
    description: '展示异步模块加载、错误重试和缓存。',
    demoTitle: '动态模块加载核心源码',
    id: 'dynamic-loader',
    imports: ['div', 'vCard', 'vDynamicLoader'],
    keywords: ['dynamic', 'loader', 'async', '加载'],
    related: ['router', 'feedback'],
    routePath: '/async/dynamic-loader',
    sourceFile: 'examples/components/demos/async.js',
    sourceTitle: '动态模块加载核心源码',
    status: 'stable',
    summary: '展示异步模块加载。',
    title: '动态模块加载'
  }),
  createDemo({
    api: [],
    behavior: ['消息容器绑定在当前页面，销毁时统一清理。'],
    boundaries: {
      doesNotOwn: ['表单校验', '路由跳转'],
      owns: ['局部消息容器', '消息替换和清理'],
      related: ['message']
    },
    categoryId: 'feedback',
    categoryTitle: '反馈消息',
    component: LocalMessageManagerCard,
    componentLabel: 'vMessageManager',
    description: '展示局部消息容器、替换和清理。',
    demoTitle: '局部消息管理器核心源码',
    id: 'message-manager',
    imports: ['vCard', 'vMessageManager'],
    keywords: ['message', 'feedback', '消息'],
    related: ['message'],
    routePath: '/feedback/message-manager',
    sourceFile: 'examples/components/demos/feedback.js',
    sourceTitle: '局部消息管理器核心源码',
    status: 'stable',
    summary: '展示局部消息容器和清理。',
    title: '局部消息管理器'
  }),
  createDemo({
    api: [],
    behavior: ['详情项可混合文本和状态节点。'],
    boundaries: {
      doesNotOwn: ['分页', '图表绘制'],
      owns: ['标签/值详情布局'],
      related: ['code', 'table']
    },
    categoryId: 'data-display',
    categoryTitle: '数据展示',
    component: ServiceDetailCard,
    componentLabel: 'vDetail',
    description: '展示只读信息面板和字段布局。',
    demoTitle: '详情面板核心源码',
    id: 'detail',
    imports: ['vCard', 'vText'],
    keywords: ['detail', 'service', '详情'],
    related: ['table', 'code'],
    routePath: '/data-display/detail',
    sourceFile: 'examples/components/demos/data-display.js',
    sourceTitle: '详情面板核心源码',
    status: 'stable',
    summary: '展示只读信息面板和字段布局。',
    title: '详情面板'
  }),
  createDemo({
    api: [],
    behavior: ['支持复制按钮和语言标签。'],
    boundaries: {
      doesNotOwn: ['表格', '分页', '图表'],
      owns: ['代码片段呈现', '复制入口'],
      related: ['detail']
    },
    categoryId: 'data-display',
    categoryTitle: '数据展示',
    component: SqlSnippetCard,
    componentLabel: 'vCode',
    description: '适合 SQL、配置和简短代码片段。',
    demoTitle: '代码片段核心源码',
    id: 'code',
    imports: ['vCard'],
    keywords: ['code', 'sql', '代码'],
    related: ['code-block'],
    routePath: '/data-display/code',
    sourceFile: 'examples/components/demos/data-display.js',
    sourceTitle: '代码片段核心源码',
    status: 'stable',
    summary: '适合代码片段。',
    title: '代码片段'
  }),
  createDemo({
    api: [],
    behavior: ['提供复制按钮与更新内容按钮。'],
    boundaries: {
      doesNotOwn: ['表格', '分页'],
      owns: ['长代码片段', '复制和更新入口'],
      related: ['code']
    },
    categoryId: 'data-display',
    categoryTitle: '数据展示',
    component: CodeBlockCard,
    componentLabel: 'codeBlock',
    description: '展示日志和长代码块。',
    demoTitle: '日志代码块核心源码',
    id: 'code-block',
    imports: ['codeBlock', 'vCard'],
    keywords: ['code-block', 'log', '日志'],
    related: ['code'],
    routePath: '/data-display/code-block',
    sourceFile: 'examples/components/demos/data-display.js',
    sourceTitle: '日志代码块核心源码',
    status: 'stable',
    summary: '展示长代码块。',
    title: '日志代码块'
  }),
  createDemo({
    api: [],
    behavior: ['支持外部更新数据源和行操作。'],
    boundaries: {
      doesNotOwn: ['分页切片', '图表渲染'],
      owns: ['表格列定义', '行渲染', '空状态'],
      related: ['pagination', 'button']
    },
    categoryId: 'data-display',
    categoryTitle: '数据展示',
    component: ServiceTableCard,
    componentLabel: 'vTable',
    description: '展示表格列和行级操作。',
    demoTitle: '表格操作核心源码',
    id: 'table',
    imports: ['vButton', 'vCard'],
    keywords: ['table', 'data', '表格'],
    related: ['pagination'],
    routePath: '/data-display/table',
    sourceFile: 'examples/components/demos/data-display.js',
    sourceTitle: '表格操作核心源码',
    status: 'stable',
    summary: '展示表格列和行级操作。',
    title: '表格操作'
  }),
  createDemo({
    api: [],
    behavior: ['当前页变化会同步表格切片。'],
    boundaries: {
      doesNotOwn: ['表单校验', '消息生命周期'],
      owns: ['分页状态', '页面大小', '页码切片'],
      related: ['table']
    },
    categoryId: 'data-display',
    categoryTitle: '数据展示',
    component: PagedServiceTableCard,
    componentLabel: 'vPagination',
    description: '分页驱动表格切片。',
    demoTitle: '分页表格核心源码',
    id: 'pagination',
    imports: ['vCard', 'vPagination', 'vTable'],
    keywords: ['pagination', 'page', '分页'],
    related: ['table'],
    routePath: '/data-display/pagination',
    sourceFile: 'examples/components/demos/data-display.js',
    sourceTitle: '分页表格核心源码',
    status: 'stable',
    summary: '分页驱动表格切片。',
    title: '分页表格'
  }),
  createDemo({
    api: [],
    behavior: ['图表绘制由适配器完成，组件只负责生命周期。'],
    boundaries: {
      doesNotOwn: ['表单输入', '分页状态'],
      owns: ['图表宿主和生命周期'],
      related: ['table']
    },
    categoryId: 'data-display',
    categoryTitle: '数据展示',
    component: ChartAdapterCard,
    componentLabel: 'vChart',
    description: '展示图表宿主和适配器工作方式。',
    demoTitle: '图表宿主核心源码',
    id: 'chart',
    imports: ['vCard', 'vChart'],
    keywords: ['chart', 'adapter', '图表'],
    related: ['table', 'code-block'],
    routePath: '/data-display/chart',
    sourceFile: 'examples/components/demos/data-display.js',
    sourceTitle: '图表宿主核心源码',
    status: 'adapter',
    summary: '展示图表宿主和适配器。',
    title: '图表宿主'
  }),
  createDemo({
    api: [],
    behavior: ['菜单分组支持键盘导航并跳过分隔项。'],
    boundaries: {
      doesNotOwn: ['表单采集', '异步加载'],
      owns: ['命令菜单、分组、分隔线'],
      related: ['dropdown-menu', 'context-menu']
    },
    categoryId: 'navigation',
    categoryTitle: '导航菜单',
    component: CommandMenuCard,
    componentLabel: 'vMenu',
    description: '展示命令菜单和分组导航。',
    demoTitle: '命令菜单核心源码',
    id: 'menu',
    imports: ['vCard'],
    keywords: ['menu', 'command', '菜单'],
    related: ['sidebar', 'dropdown-menu'],
    routePath: '/navigation/menu',
    sourceFile: 'examples/components/demos/navigation.js',
    sourceTitle: '命令菜单核心源码',
    status: 'stable',
    summary: '展示命令菜单和分组导航。',
    title: '命令菜单'
  }),
  createDemo({
    api: [],
    behavior: ['子菜单支持展开、收起和外部点击关闭。'],
    boundaries: {
      doesNotOwn: ['表单校验', '路由参数'],
      owns: ['嵌套菜单结构', '展开/收起状态'],
      related: ['menu']
    },
    categoryId: 'navigation',
    categoryTitle: '导航菜单',
    component: SubMenuCard,
    componentLabel: 'vSubMenu',
    description: '展示嵌套子菜单交互。',
    demoTitle: '嵌套菜单核心源码',
    id: 'submenu',
    imports: ['vCard'],
    keywords: ['submenu', 'nested menu', '子菜单'],
    related: ['menu'],
    routePath: '/navigation/submenu',
    sourceFile: 'examples/components/demos/navigation.js',
    sourceTitle: '嵌套菜单核心源码',
    status: 'stable',
    summary: '展示嵌套子菜单交互。',
    title: '嵌套菜单'
  }),
  createDemo({
    api: [],
    behavior: ['右键目标可打开上下文菜单。'],
    boundaries: {
      doesNotOwn: ['表单采集', '分页状态'],
      owns: ['按钮触发菜单', '右键目标区域'],
      related: ['menu']
    },
    categoryId: 'navigation',
    categoryTitle: '导航菜单',
    component: OverlayMenuCard,
    componentLabel: 'vDropdownMenu/vContextMenu',
    description: '展示浮层菜单触发和右键菜单。',
    demoTitle: '浮层菜单核心源码',
    id: 'dropdown-menu',
    imports: ['vCard'],
    keywords: ['dropdown', 'context menu', '浮层'],
    related: ['menu'],
    routePath: '/navigation/dropdown-menu',
    sourceFile: 'examples/components/demos/navigation.js',
    sourceTitle: '浮层菜单核心源码',
    status: 'stable',
    summary: '展示浮层菜单触发。',
    title: '浮层菜单'
  }),
  createDemo({
    api: [],
    behavior: ['折叠时保留可访问标题和菜单标签。'],
    boundaries: {
      doesNotOwn: ['表单采集', '分页逻辑'],
      owns: ['侧栏标题、折叠按钮、菜单容器'],
      related: ['menu', 'submenu']
    },
    categoryId: 'navigation',
    categoryTitle: '导航菜单',
    component: SidebarCard,
    componentLabel: 'vSidebar',
    description: '展示后台侧栏与折叠行为。',
    demoTitle: '后台侧栏核心源码',
    id: 'sidebar',
    imports: ['vCard'],
    keywords: ['sidebar', 'nav', '侧栏'],
    related: ['menu', 'submenu'],
    routePath: '/navigation/sidebar',
    sourceFile: 'examples/components/demos/navigation.js',
    sourceTitle: '后台侧栏核心源码',
    status: 'stable',
    summary: '展示后台侧栏与折叠行为。',
    title: '后台侧栏'
  }),
  createDemo({
    api: [],
    behavior: ['表单提交与字段状态由调用方控制。'],
    boundaries: {
      doesNotOwn: ['路由导航', '图表渲染'],
      owns: ['表单采集', '字段编辑', '提交动作'],
      related: ['field', 'timer', 'checkboxes']
    },
    categoryId: 'form',
    categoryTitle: '表单控件',
    component: ServiceFormCard,
    componentLabel: 'vForm',
    description: '展示基础表单采集和提交。',
    demoTitle: '基础表单核心源码',
    id: 'form',
    imports: ['vCard', 'vText'],
    keywords: ['form', 'submit', '表单'],
    related: ['field', 'timer'],
    routePath: '/form/form',
    sourceFile: 'examples/components/demos/form.js',
    sourceTitle: '基础表单核心源码',
    status: 'stable',
    summary: '展示基础表单采集。',
    title: '基础表单'
  }),
  createDemo({
    api: [],
    behavior: ['编辑态和查看态之间切换时保留字段节点。'],
    boundaries: {
      doesNotOwn: ['表单提交', '路由跳转'],
      owns: ['字段展示和编辑状态'],
      related: ['form']
    },
    categoryId: 'form',
    categoryTitle: '表单控件',
    component: OwnerFieldCard,
    componentLabel: 'vField',
    description: '展示字段模式切换。',
    demoTitle: '字段模式核心源码',
    id: 'field',
    imports: ['vCard', 'vText'],
    keywords: ['field', 'edit', '字段'],
    related: ['form'],
    routePath: '/form/field',
    sourceFile: 'examples/components/demos/form.js',
    sourceTitle: '字段模式核心源码',
    status: 'stable',
    summary: '展示字段模式切换。',
    title: '字段模式'
  }),
  createDemo({
    api: [],
    behavior: ['支持日期、日期时间和时间模式。'],
    boundaries: {
      doesNotOwn: ['分页', '消息提示'],
      owns: ['日期时间输入'],
      related: ['form']
    },
    categoryId: 'form',
    categoryTitle: '表单控件',
    component: ScheduleTimerCard,
    componentLabel: 'vTimer',
    description: '展示日期和时间输入。',
    demoTitle: '日期时间核心源码',
    id: 'timer',
    imports: ['vCard'],
    keywords: ['timer', 'date', '时间'],
    related: ['timer-range'],
    routePath: '/form/timer',
    sourceFile: 'examples/components/demos/form.js',
    sourceTitle: '日期时间核心源码',
    status: 'stable',
    summary: '展示日期和时间输入。',
    title: '日期时间'
  }),
  createDemo({
    api: [],
    behavior: ['结束值早于开始值时显示错误。'],
    boundaries: {
      doesNotOwn: ['分页', '图表'],
      owns: ['开始值、结束值和区间校验'],
      related: ['timer']
    },
    categoryId: 'form',
    categoryTitle: '表单控件',
    component: TimerRangeCard,
    componentLabel: 'vTimerRange',
    description: '展示日期范围输入。',
    demoTitle: '日期范围核心源码',
    id: 'timer-range',
    imports: ['vCard', 'vText'],
    keywords: ['timer-range', 'range', '日期范围'],
    related: ['timer'],
    routePath: '/form/timer-range',
    sourceFile: 'examples/components/demos/form.js',
    sourceTitle: '日期范围核心源码',
    status: 'stable',
    summary: '展示日期范围输入。',
    title: '日期范围'
  }),
  createDemo({
    api: [],
    behavior: ['统一页面背景、内容宽度和留白。'],
    boundaries: {
      doesNotOwn: ['字段状态', '分页逻辑'],
      owns: ['页面容器和响应式栅格'],
      related: ['body']
    },
    categoryId: 'layout',
    categoryTitle: '布局组件',
    component: BodyPageCard,
    componentLabel: 'vBody',
    description: '展示页面容器与响应式网格。',
    demoTitle: '页面容器核心源码',
    id: 'body',
    imports: ['vCard'],
    keywords: ['body', 'layout', '页面'],
    related: ['responsive-grid'],
    routePath: '/layout/body',
    sourceFile: 'examples/components/demos/layout.js',
    sourceTitle: '页面容器核心源码',
    status: 'stable',
    summary: '展示页面容器与响应式网格。',
    title: '页面容器'
  }),
  createDemo({
    api: [],
    behavior: ['404、参数和 query 路由都能正常切换。'],
    boundaries: {
      doesNotOwn: ['菜单样式', '表单值'],
      owns: ['路由链接、路由视图和路由状态'],
      related: ['sidebar']
    },
    categoryId: 'router',
    categoryTitle: '路由组件',
    component: RouterNavigationCard,
    componentLabel: 'router',
    description: '展示路由链接和视图切换。',
    demoTitle: '路由链接与视图核心源码',
    id: 'router',
    imports: ['div', 'router', 'vCard'],
    keywords: ['router', 'link', 'route'],
    related: ['sidebar', 'vRouterViews'],
    routePath: '/router/router',
    sourceFile: 'examples/components/demos/router.js',
    sourceTitle: '路由链接与视图核心源码',
    status: 'stable',
    summary: '展示路由链接和视图切换。',
    title: '路由链接与视图'
  }),
  createDemo({
    api: [],
    behavior: ['声明式路由和视图保持同一套匹配器。'],
    boundaries: {
      doesNotOwn: ['菜单状态', '表单值'],
      owns: ['声明式路由配置'],
      related: ['router']
    },
    categoryId: 'router',
    categoryTitle: '路由组件',
    component: DeclarativeRouterCard,
    componentLabel: 'vRouter',
    description: '展示声明式路由。',
    demoTitle: '声明式路由核心源码',
    id: 'declarative-router',
    imports: ['div', 'vCard', 'vRoute', 'vRouter'],
    keywords: ['router', 'declarative', '声明式'],
    related: ['router'],
    routePath: '/router/declarative-router',
    sourceFile: 'examples/components/demos/router.js',
    sourceTitle: '声明式路由核心源码',
    status: 'stable',
    summary: '展示声明式路由。',
    title: '声明式路由'
  }),
  createDemo({
    api: [],
    behavior: ['访问过的路由会保留为文件标签。'],
    boundaries: {
      doesNotOwn: ['菜单动作', '表单状态'],
      owns: ['视图标签、关闭按钮、活动标签'],
      related: ['router']
    },
    categoryId: 'router',
    categoryTitle: '路由组件',
    component: RouterViewsEditorCard,
    componentLabel: 'vRouterViews',
    description: '展示 IDE 风格的路由视图。',
    demoTitle: 'IDE 风格路由视图核心源码',
    id: 'router-views',
    imports: ['div', 'vCard', 'vRoute', 'vRouter'],
    keywords: ['router views', 'tabs', '标签'],
    related: ['router'],
    routePath: '/router/router-views',
    sourceFile: 'examples/components/demos/router.js',
    sourceTitle: 'IDE 风格路由视图核心源码',
    status: 'stable',
    summary: '展示 IDE 风格的路由视图。',
    title: 'IDE 风格路由视图'
  })
];

const normalizedComponents = demoDefinitions.map((entry) =>
  (() => {
    const category =
      sourceCategories[entry.categoryId === 'data-display' ? 'dataDisplay' : entry.categoryId];
    return Object.freeze({
      ...entry,
      categoryDescription: category.description,
      categoryTitle: category.title,
      categorySlug: entry.categoryId,
      sourceDir: category.sourceDir,
      searchText: [
        entry.id,
        entry.title,
        entry.description,
        entry.sourceFile,
        entry.componentLabel,
        category.title,
        category.description,
        category.sourceDir,
        ...(entry.keywords ?? [])
      ]
        .join(' ')
        .toLowerCase()
    });
  })()
);

function createCategory(category) {
  return Object.freeze({
    ...category,
    demos: normalizedComponents.filter((entry) => entry.categoryId === category.id)
  });
}

const categories = [
  createCategory(sourceCategories.layout),
  createCategory(sourceCategories.actions),
  createCategory(sourceCategories.navigation),
  createCategory(sourceCategories.feedback),
  createCategory(sourceCategories.form),
  createCategory(sourceCategories.dataDisplay),
  createCategory(sourceCategories.async),
  createCategory(sourceCategories.router)
];

const demos = normalizedComponents;

const components = Object.freeze(
  Array.from(new Set(categories.flatMap((category) => category.components))).map((id) => {
    const demo = demos.find((entry) => entry.id === id);
    const category = categories.find((entry) => entry.components.includes(id));
    return Object.freeze({
      categoryId: category?.id ?? '',
      categoryTitle: category?.title ?? '',
      id,
      label: demo?.componentLabel ?? id,
      sourceDir: category?.sourceDir ?? '',
      title: demo?.componentLabel ?? id
    });
  })
);

const sources = Object.freeze(
  Array.from(new Set(demos.map((entry) => entry.sourceFile))).map((sourceFile) => {
    const sourceDemos = demos.filter((entry) => entry.sourceFile === sourceFile);
    const firstDemo = sourceDemos[0];
    return Object.freeze({
      categoryId: firstDemo.categoryId,
      categoryTitle: firstDemo.categoryTitle,
      demoIds: Object.freeze(sourceDemos.map((entry) => entry.id)),
      demoCount: sourceDemos.length,
      file: sourceFile,
      sourceDir: firstDemo.sourceDir
    });
  })
);

export const componentDemoCategories = categories;

export const componentDemoRegistry = Object.freeze({
  categories,
  components,
  demos,
  sources
});

export function findComponentEntry(id) {
  return demos.find((entry) => entry.id === id) || null;
}

export function filterComponentEntries(query) {
  const normalized = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return demos;
  }

  return demos.filter((entry) => entry.searchText.includes(normalized));
}

export function getCategoryEntry(categoryId) {
  return categories.find((category) => category.id === categoryId) || null;
}

export function getCategoryComponents(categoryId) {
  return components.filter((entry) => entry.categoryId === categoryId);
}

export function getCategoryDemos(categoryId) {
  return demos.filter((entry) => entry.categoryId === categoryId);
}

export function getScenarioEntries() {
  return demos;
}

export function getComponentRoutePaths() {
  return demos.map((entry) => entry.routePath);
}

export function getCategoryRoutePaths() {
  return categories.map((category) => `/${category.id}`);
}
