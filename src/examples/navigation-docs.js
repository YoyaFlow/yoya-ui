import {
  section,
  toast,
  vBreadcrumb,
  vBreadcrumbItem,
  vCard,
  vSteps,
  vTab,
  vTabs,
  vText
} from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  AdminSidebarCard,
  CommandMenuCard,
  OverlayMenuCard,
  SidebarCard,
  SubMenuCard
} from './demos/navigation.js';
import { AnchorStandaloneDemo } from './demos/anchor.js';
import {
  DeclarativeRouterCard,
  RouterHistoryCard,
  RouterNavigationCard,
  RouterViewsEditorStandalone,
  RouterViewsTopStandalone
} from './demos/router.js';
import { RouterAsyncCard } from './demos/router-async.js';
import { RouterParamsCard } from './demos/router-params.js';

const examplesBaseUrl = import.meta.env?.BASE_URL || './';

const navigationDocsDefinitions = Object.freeze({
  anchor: createNavigationDocsDefinition({
    apiIntro:
      'vAnchor 用目录列表链接到页面区块，并在滚动时自动标记当前项。演示运行在独立 iframe 中，点击锚点不会修改组件目录自身的 hash。',
    apiRows: [
      [
        'vAnchor({ items, offset, target, ariaLabel })',
        '创建页面锚点目录，可配置滚动偏移、容器和导航名称。',
        'vAnchor({ offset: 16, items: [...] })'
      ],
      ['anchor.offset(value)', '设置滚动停靠偏移量。', 'anchor.offset(16)'],
      ['anchor.target(value)', '指定滚动容器选择器或元素。', "anchor.target('.docs-scroll')"],
      ['anchor.items(value)', '替换全部锚点项。', "anchor.items([{ href: '#api', title: 'API' }])"],
      ['anchor.active(href)', '手动设置当前锚点。', "anchor.active('#api')"],
      [
        'anchor.vAnchorItem(setup)',
        '声明单个锚点项。',
        "anchor.vAnchorItem((item) => item.title('API').href('#api'))"
      ],
      [
        'item.title(content) / item.href(content) / item.nested(setup)',
        '设置标题、链接地址和嵌套目录。',
        "item.nested((sub) => sub.vAnchorItem({ href: '#events', title: '事件' }))"
      ]
    ],
    apiSignature: `vAnchor((anchor) => {
  anchor.ariaLabel('文档目录');
  anchor.offset(16);
  anchor.vAnchorItem((item) => {
    item.title('开始');
    item.href('#start');
  });
  anchor.vAnchorItem((item) => {
    item.title('基础用法');
    item.href('#basic');
    item.nested((sub) => sub.vAnchorItem({ href: '#api', title: 'API' }));
  });
})`,
    examples: [
      {
        component: AnchorStandaloneDemo,
        description: '目录、嵌套项和滚动高亮都在独立 iframe 中运行，不干扰演示页地址。',
        frame: true,
        frameSrc: './anchor.html',
        id: 'basic',
        imports: ['section', 'vContainer'],
        sourceComponent: AnchorStandaloneDemo,
        sourceTitle: '锚点核心源码',
        title: '页面锚点'
      }
    ],
    examplesIntro: '锚点演示放在独立 iframe 中，避免点击 hash 链接改变组件目录 URL。',
    heading: 'vAnchor 锚点',
    intro:
      '锚点组件用于长文档、详情页和管理后台的章节导航。它把页面区块组织成目录，点击后平滑滚动，并随滚动自动高亮当前章节。',
    key: 'anchor',
    routeItem: 'navigation:0',
    title: '锚点',
    usageItems: [
      '长文档、帮助中心和详情页需要章节导航时使用。',
      '页面带固定头部时，用 offset() 补偿滚动停靠位置。',
      '锚点演示放在 iframe 中，避免 hash 链接和组件目录地址互相干扰。'
    ]
  }),
  breadcrumb: createNavigationDocsDefinition({
    apiIntro:
      'vBreadcrumb 用导航列表和分隔符表达当前页面位置，vBreadcrumbItem 负责每个层级。有 href 的层级渲染为链接，active 层级渲染为 aria-current="page" 的当前文本。',
    apiRows: [
      [
        'vBreadcrumb({ ariaLabel, separator, items })',
        '创建面包屑并配置导航名称、分隔符和层级数据。',
        "vBreadcrumb({ separator: '/' })"
      ],
      ['breadcrumb.ariaLabel(content)', '设置导航地标名称。', "breadcrumb.ariaLabel('服务导航')"],
      ['breadcrumb.separator(content)', '设置层级之间的分隔符。', "breadcrumb.separator('/')"],
      [
        'breadcrumb.items(value)',
        '替换全部层级数据。',
        "breadcrumb.items([{ label: '首页', href: '#/home' }])"
      ],
      [
        'breadcrumb.vBreadcrumbItem(setup)',
        '声明单个面包屑层级。',
        "breadcrumb.vBreadcrumbItem((item) => item.label('服务'))"
      ],
      [
        'item.label(content) / item.href(content)',
        '设置层级文案和链接地址。',
        "item.href('#/services')"
      ],
      ['item.active(value)', '把当前层级标记为 aria-current="page"。', 'item.active(true)']
    ],
    apiSignature: `vBreadcrumb((breadcrumb) => {
  breadcrumb.ariaLabel('服务导航');
  breadcrumb.separator('/');
  breadcrumb.vBreadcrumbItem((item) => {
    item.label('控制台');
    item.href('/console');
  });
  breadcrumb.vBreadcrumbItem((item) => {
    item.label('服务详情');
    item.active(true);
  });
})`,
    examples: [
      {
        component: BreadcrumbBasicExample1,
        description: '用链接层级和当前页组成标准面包屑，适合详情页和管理后台。',
        id: 'basic',
        imports: ['vBreadcrumb', 'vCard'],
        sourceComponent: BreadcrumbBasicExample1,
        sourceTitle: '基础面包屑核心源码',
        title: '基础面包屑'
      },
      {
        component: BreadcrumbDynamicExample1,
        description: 'active 可以动态切换，当前项会从链接变成 aria-current 文本。',
        id: 'dynamic',
        imports: ['vBreadcrumb', 'vBreadcrumbItem', 'vButton', 'vCard', 'vText'],
        sourceComponent: BreadcrumbDynamicExample1,
        sourceTitle: '动态当前项核心源码',
        title: '动态当前项'
      }
    ],
    examplesIntro: '下面两个示例分别展示基础层级和动态切换当前项。',
    heading: 'vBreadcrumb 面包屑',
    intro:
      '面包屑用于告诉用户当前所在位置，并允许通过上一级链接快速返回。vBreadcrumb 默认提供语义化 nav/ol 结构、可配置分隔符和当前页状态。',
    key: 'breadcrumb',
    routeItem: 'navigation:1',
    title: '面包屑',
    usageItems: [
      '详情页、管理后台和文档站点需要表达当前位置时使用。',
      '中间层级有页面地址时传入 href，当前页使用 active(true)。',
      '分隔符可以通过 separator() 换成 /、› 或自定义文本。'
    ]
  }),
  router: createNavigationDocsDefinition({
    apiIntro:
      '路由示例都运行在独立 iframe 页面中，不会修改组件目录自身的 hash 地址。' +
      'vLink 委托 Router 导航，vRouterView 负责承载匹配视图；Router 同时支持异步视图与按需加载。',
    apiRows: [
      [
        'router({ default, route, notFound })',
        '创建命令式路由出口。',
        "router((r) => r.route('/overview', view))"
      ],
      [
        'vRouter({ mode, default, routes, notFound })',
        '声明式创建路由。',
        "vRouter({ mode: 'history', default: '/home', routes: [...] })"
      ],
      [
        "router.mode('hash' | 'history')",
        '切换 URL 模式，默认是 hash。',
        "appRouter.mode('history')"
      ],
      ['vRoute(pattern, config)', '描述路径、标题和视图。', "vRoute('/users/:id', view)"],
      [
        'vLink(router, { to, params, query, replace })',
        '创建路由链接。',
        "vLink(appRouter, { label: '概览', to: '/overview' })"
      ],
      ['vRouterView(router, setup)', '承载当前匹配视图。', 'vRouterView(appRouter)'],
      [
        'view: () => import("./page.js")',
        '异步视图：动态加载模块，自动解包 export default、调用工厂并传入 context。',
        "r.route('/a', () => import('./a.js'))"
      ],
      [
        'context 参数',
        '页面工厂收到的第一个参数：{ params, query, path, pathname, route, router }。',
        'export default function Page({ params }) {}'
      ],
      [
        '视图形态：ViewNode / 文本 / 组件对象 / 工厂 / 模块',
        'Resolver 自动归一：组件对象调 render()，工厂以 context 调用，模块解包 default。',
        'import("./a.js").then((m) => m.Page)'
      ],
      [
        'loading(view) / error(view)',
        '设置全局异步加载与失败视图；路由级 { loading, error } 可覆盖。',
        "r.loading(() => div('加载中…'))"
      ],
      [
        'currentPath() / currentParams() / currentQuery()',
        '读取当前路径、参数和 query（返回拷贝）。',
        'appRouter.currentParams()'
      ],
      [
        'currentRoute() / currentView()',
        '读取当前路由记录与已渲染视图。',
        'appRouter.currentView()'
      ],
      [
        'subscribe(listener)',
        '订阅路由变化，回调收到 (context, router)，返回解绉函数。',
        'const off = appRouter.subscribe(() => {})'
      ],
      ['notFound(view)', '404 视图，同样支持异步、组件对象和工厂。', "r.notFound(() => div('404'))"]
    ],
    apiSignature: `vRouter({
  default: '/home',
  routes: [
    vRoute('/home', { title: '首页', view: () => div('首页') })
  ]
})`,
    examples: [
      {
        component: RouterNavigationCard,
        description: '命令式 Router、vLink 和 vRouterView 组合，包含参数、query 和 404。',
        frame: true,
        frameSrc: './router-links.html',
        id: 'links',
        imports: ['div', 'router', 'vCard'],
        sourceComponent: RouterNavigationCard,
        sourceTitle: '路由链接与视图核心源码',
        title: '路由链接与视图'
      },
      {
        component: DeclarativeRouterCard,
        description: 'vRouter 与 vRoute 用声明式配置描述路径和视图，交互方式保持一致。',
        frame: true,
        frameSrc: './declarative-router.html',
        id: 'declarative',
        imports: ['div', 'vCard', 'vRoute', 'vRouter'],
        sourceComponent: DeclarativeRouterCard,
        sourceTitle: '声明式路由核心源码',
        title: '声明式路由'
      },
      {
        component: RouterHistoryCard,
        description: 'history 模式在独立 iframe 中运行，pushState 不会修改父级演示页地址。',
        frame: true,
        frameSrc: './router-history.html',
        id: 'history',
        imports: ['div', 'vCard', 'vRoute', 'vRouter', 'vText'],
        sourceComponent: RouterHistoryCard,
        sourceTitle: 'History 路由核心源码',
        title: 'History 路由'
      },
      {
        component: RouterAsyncCard,
        description:
          '路由视图返回 import() 模块：先显示 loading，模块就绪后自动执行 export default 页面并传入 context。',
        frame: true,
        frameSrc: './router-async.html',
        id: 'async',
        imports: ['div', 'router', 'vCard', 'vRouterView'],
        sourceComponent: RouterAsyncCard,
        sourceTitle: '异步加载路由核心源码',
        title: '异步加载路由'
      },
      {
        component: RouterParamsCard,
        description:
          'default 页面函数接收 context（params/query），参数传给子组件，subscribe 监听路由变化。',
        frame: true,
        frameSrc: './router-params.html',
        id: 'params',
        imports: ['div', 'router', 'vCard', 'vRouterView', 'vText'],
        sourceComponent: RouterParamsCard,
        sourceTitle: '参数传递路由核心源码',
        title: '参数传递路由'
      }
    ],
    examplesIntro: '五个路由示例都运行在独立 iframe 中，避免与演示页 URL 冲突。',
    heading: 'Router 路由',
    intro:
      '路由组件负责把 URL、参数和视图连接起来。为了不让演示路由改动组件目录自身的 hash，这里全部使用 iframe 隔离运行。',
    key: 'router',
    routeItem: 'navigation:7',
    title: '路由',
    usageItems: [
      '需要 hash 或 history 路由、参数解析和视图切换时使用 Router / vRouter。',
      '页面跳转入口统一交给 vLink，不要在业务代码里手写 URL。',
      '路由演示放在 iframe 中，history 模式只影响 iframe 自己的地址。',
      '异步页面按需加载：view 直接返回 import()，模块用 export default 导出页面工厂。',
      '组件内取路由参数：页面工厂收 context；任意位置用 router.currentParams()；跟随变化用 subscribe()。'
    ]
  }),
  routerViews: createNavigationDocsDefinition({
    apiIntro:
      'vRouterViews 会把访问过的路由保存为标签页。两个演示都通过独立 iframe 运行，因此标签、标题和路由地址不会影响父级演示页面。',
    apiRows: [
      [
        'vRouterViews(router, { title, titlePosition, lockTitle, persist, titleResolver })',
        '创建标签页式路由视图。',
        "vRouterViews(appRouter, { titlePosition: 'left' })"
      ],
      [
        'views.titlePosition(value)',
        '切换 top / left / right 标题栏。',
        "views.titlePosition('left')"
      ],
      ['views.lockTitle(value)', '锁定标题栏并让内容撑满容器。', 'views.lockTitle(true)']
    ],
    apiSignature: `vRouterViews(appRouter, {
  title: '未打开文件',
  titlePosition: 'left'
})`,
    examples: [
      {
        component: RouterViewsEditorStandalone,
        description: '左侧标题栏更像 IDE 文件标签，访问过的路由会保留为标签。',
        frame: true,
        frameSrc: './router-views.html',
        id: 'editor',
        imports: ['div', 'vContainer', 'vRoute', 'vRouter', 'vRouterViews'],
        sourceComponent: RouterViewsEditorStandalone,
        sourceTitle: 'IDE 风格路由视图核心源码',
        title: 'IDE 风格'
      },
      {
        component: RouterViewsTopStandalone,
        description: '顶部标题栏适合放在页面主区，点击链接后自动新增和激活标签。',
        frame: true,
        frameSrc: './router-views-top.html',
        id: 'top',
        imports: ['div', 'vContainer', 'vRoute', 'vRouter', 'vRouterViews'],
        sourceComponent: RouterViewsTopStandalone,
        sourceTitle: '顶部标签路由视图核心源码',
        title: '顶部标签'
      }
    ],
    examplesIntro: '两个示例分别展示左侧标题栏和顶部标题栏。',
    heading: 'vRouterViews 路由视图',
    intro:
      '路由视图适合把访问过的页面保留为标签，方便在多个路由之间切换。演示放在独立 iframe 中，标签状态和 URL 都不会和组件目录互相干扰。',
    key: 'router-views',
    routeItem: 'navigation:8',
    title: '路由视图',
    usageItems: [
      '需要同时保留多个路由页面时使用 vRouterViews。',
      '空间紧凑时用 titlePosition("left")，页面主区用顶部标题栏。',
      '路由相关演示建议放入 iframe，避免路由 hash 和文档页冲突。',
      '标签项支持右键菜单：刷新、复制链接、关闭、关闭其他、关闭左侧/右侧、关闭全部。'
    ]
  }),
  menu: createNavigationDocsDefinition({
    apiIntro:
      'vMenu 负责菜单骨架，vMenuGroup 和 vMenuDivider 负责层级，vSubMenu 负责展开更深一层的选择。vDropdownMenu 和 vContextMenu 只是把同一套菜单内容挂到按钮或右键上。',
    apiRows: [
      [
        'vMenu({ orientation })',
        '创建纵向或横向菜单容器。',
        "vMenu({ orientation: 'horizontal' })"
      ],
      [
        'vMenuItem({ text, icon, shortcut, active, danger, disabled })',
        '定义可点击的菜单项。',
        "item.text('刷新状态')"
      ],
      ['vMenuGroup({ label, title })', '把相关动作归为一组。', "group.label('常用操作')"],
      ['vMenuDivider()', '在菜单中插入分隔线。', 'menu.vMenuDivider()'],
      [
        'vSubMenu({ label, trigger, menuContent, inline })',
        '展开二级或三级菜单；inline 时在菜单内上下展开。',
        'submenu.inline(true)'
      ],
      [
        'vSidebar({ title, ariaLabel, menuContent, responsive })',
        '把菜单装进可折叠侧边栏。',
        "vSidebar({ title: '运维中心' })"
      ],
      [
        'vDropdownMenu({ trigger, menuContent, placement })',
        '按钮触发的浮层菜单。',
        "vDropdownMenu({ placement: 'bottom-end' })"
      ],
      [
        'vContextMenu({ target, menuContent })',
        '右键触发的上下文菜单。',
        "vContextMenu({ target: '...' })"
      ]
    ],
    apiSignature: `vMenu((menu) => {
  menu.vMenuGroup(...);
  menu.vMenuDivider();
})`,
    examples: [
      {
        component: () => CommandMenuCard({ toast }),
        description: '长命令列表用分组和分隔线组织，读起来更像一组动作，而不是一串按钮。',
        id: 'command',
        imports: ['vCard'],
        sourceComponent: CommandMenuCard,
        sourceTitle: '命令菜单核心源码',
        title: '命令菜单'
      },
      {
        component: () => SubMenuCard({ toast }),
        description: '当菜单需要二级、三级入口时，vSubMenu 会把层级收起来，按需展开。',
        id: 'submenu',
        imports: ['vCard'],
        sourceComponent: SubMenuCard,
        sourceTitle: '嵌套菜单核心源码',
        title: '嵌套菜单'
      },
      {
        component: () => OverlayMenuCard({ toast }),
        description: '按钮触发和右键触发可以共用同一套菜单内容，适合次级操作。',
        id: 'overlay',
        imports: ['vCard'],
        sourceComponent: OverlayMenuCard,
        sourceTitle: '浮层菜单核心源码',
        title: '浮层菜单'
      },
      {
        component: () => SidebarCard({ toast }),
        description: '后台侧栏把菜单变成可折叠工作区导航，适合长列表和多级入口。',
        id: 'sidebar',
        imports: ['vCard'],
        sourceComponent: SidebarCard,
        sourceTitle: '侧栏菜单核心源码',
        title: '后台侧栏'
      },
      {
        component: () => AdminSidebarCard({ toast }),
        description: '常见管理系统左侧导航：工作台、组织、业务、系统设置和监控审计分组。',
        id: 'admin-sidebar',
        imports: ['vCard'],
        sourceComponent: AdminSidebarCard,
        sourceTitle: '管理系统左侧菜单核心源码',
        title: '管理系统左侧菜单'
      }
    ],
    examplesIntro: '下面五个示例分别展示命令菜单、嵌套菜单、浮层菜单、后台侧栏和管理系统左侧菜单。',
    heading: 'vMenu 菜单',
    intro:
      'vMenu 负责把导航动作整理成可扫描的列表，常见于命令面板、下拉菜单和后台侧栏。它和 vSubMenu、vSidebar、vDropdownMenu、vContextMenu 配合起来，足够覆盖大多数菜单场景。',
    key: 'menu',
    routeItem: 'navigation:3',
    title: '菜单',
    usageItems: [
      '命令列表、页面跳转和设置入口都适合先收进 vMenu。',
      '有多级入口时，用 vSubMenu 逐层展开，不要把所有项摊平。',
      '后台侧栏和右键菜单分别交给 vSidebar、vDropdownMenu 和 vContextMenu。'
    ]
  }),
  navbar: createNavigationDocsDefinition({
    apiIntro:
      'vNavbar 把品牌区、横向菜单和右侧动作区组合成统一顶栏，内部仍然复用 vMenu 的 horizontal 模式，所以左右方向键、Home 和 End 都保持菜单的行为。',
    apiRows: [
      [
        'vNavbar({ title, subtitle, ariaLabel, menuContent, actions })',
        '创建横向导航栏。',
        "vNavbar({ title: 'yoya-ui' })"
      ],
      ['navbar.title(content)', '设置品牌标题。', "navbar.title('yoya-ui')"],
      ['navbar.subtitle(content)', '设置品牌副标题。', "navbar.subtitle('Workspace')"],
      ['navbar.brand(setup)', '自定义品牌区域。', 'navbar.brand((brand) => brand.strong(...))'],
      [
        'navbar.menuContent(setup)',
        '填充横向菜单。',
        "navbar.menuContent((menu) => menu.vMenuItem('概览'))"
      ],
      [
        'navbar.actions(setup)',
        '放置右侧按钮或下拉菜单。',
        "navbar.actions((actions) => actions.vButton('登录'))"
      ],
      ['navbar.ariaLabel(content)', '设置导航地标名称。', "navbar.ariaLabel('产品主导航')"]
    ],
    apiSignature: `vNavbar((navbar) => {
  navbar.title('yoya-ui');
  navbar.menuContent((menu) => menu.vMenuItem('概览'));
  navbar.actions((actions) => actions.vButton('登录'));
})`,
    examples: [
      {
        component: NavbarShellExample1,
        description: '品牌、横向菜单和动作按钮一起放在顶栏里，适合产品首页和工作台。',
        id: 'shell',
        imports: ['vButton', 'vCard', 'vDropdownMenu', 'vNavbar', 'vText'],
        sourceTitle: '产品顶栏核心源码',
        title: '产品顶栏'
      },
      {
        component: NavbarBrandExample1,
        description: 'brand 槽可以放自定义品牌结构，适合带副标题的系统导航。',
        id: 'brand',
        imports: ['vButton', 'vCard', 'vNavbar', 'vText'],
        sourceTitle: '自定义品牌核心源码',
        title: '自定义品牌'
      },
      {
        component: NavbarWrapExample1,
        description: '在窄宽度里让菜单和动作自然换行，适合响应式顶栏。',
        id: 'wrap',
        imports: ['vButton', 'vCard', 'vNavbar', 'vText'],
        sourceTitle: '响应式顶栏核心源码',
        title: '窄屏换行'
      }
    ],
    examplesIntro: '下面三个示例分别展示产品顶栏、自定义品牌和窄屏换行。',
    heading: 'vNavbar 横向导航栏',
    intro:
      'vNavbar 负责把品牌、主导航和页面动作放进一条横向顶栏里。它内部沿用 vMenu 的焦点管理和键盘导航，所以横向菜单的可访问性不会丢。',
    key: 'navbar',
    routeItem: 'navigation:9',
    title: '导航栏',
    usageItems: [
      '页面最上方需要品牌、主导航和动作区时用它。',
      '菜单项需要横向排列并保持左右方向键导航时用它。',
      '右侧还有按钮、下拉和状态标签时，把它们一起放进 actions 槽。'
    ]
  }),
  steps: createNavigationDocsDefinition({
    apiIntro:
      'vSteps 用序号、状态和连接线表达多阶段流程，current 决定当前步骤，status 可以切换为 error。',
    apiRows: [
      [
        'vSteps({ current, status, items, direction, size })',
        '创建步骤条并设置当前步骤、状态和步骤数据。',
        'vSteps({ current: 1, items: ["创建", "配置"] })'
      ],
      ['steps.current(value)', '读取或设置当前步骤索引。', 'steps.current(2)'],
      [
        'steps.status(value)',
        '设置当前步骤状态：process / error / finish。',
        "steps.status('error')"
      ],
      ['steps.items(value)', '替换全部步骤数据。', 'steps.items([{ title: "创建" }])'],
      ['steps.direction(value)', '切换 horizontal 或 vertical。', "steps.direction('vertical')"],
      ['steps.size(value)', '切换 default 或 small。', "steps.size('small')"],
      ['steps.next() / steps.prev()', '向前或向后移动当前步骤。', 'steps.next()'],
      [
        'steps.vStep(setup)',
        '用回调声明单个步骤。',
        "steps.vStep((step) => step.title('配置').description('选择资源'))"
      ],
      [
        'step.title() / step.description() / step.icon() / step.status()',
        '设置步骤标题、说明、图标或单独状态。',
        "step.status('finish')"
      ]
    ],
    apiSignature: `const steps = vSteps({
  current: 1,
  items: [
    { title: '创建', description: '填写基本信息' },
    { title: '配置', description: '选择资源' },
    { title: '发布', description: '确认上线' }
  ]
});`,
    examples: [
      {
        component: StepsBasicExample1,
        description: '通过 current 驱动完成、当前和等待状态，按钮可以前后移动步骤。',
        id: 'basic',
        imports: ['vButton', 'vCard', 'vSteps', 'vText'],
        sourceTitle: '基础步骤核心源码',
        title: '基础步骤'
      },
      {
        component: StepsVerticalExample1,
        description: '纵向布局适合表单或审批详情，错误状态直接标记在当前步骤。',
        id: 'vertical',
        imports: ['vCard', 'vSteps'],
        sourceTitle: '纵向步骤核心源码',
        title: '纵向步骤'
      },
      {
        component: StepsCustomExample1,
        description: 'small 尺寸和自定义图标适合放在卡片摘要或紧凑工具栏中。',
        id: 'custom',
        imports: ['vCard', 'vStep', 'vSteps'],
        sourceTitle: '紧凑步骤核心源码',
        title: '紧凑步骤'
      }
    ],
    examplesIntro: '下面三个示例分别展示基础流程、纵向布局和紧凑样式。',
    heading: 'vSteps 步骤条',
    intro:
      '步骤条用于展示多阶段流程，比如发布、审批和表单填写。vSteps 用当前索引统一计算每个步骤的状态，适合驱动完整向导。',
    key: 'steps',
    routeItem: 'navigation:5',
    title: '步骤条',
    usageItems: [
      '流程步骤固定且需要展示进度时，用 vSteps 替代手写序号和连接线。',
      '当前步骤失败时，用 status("error") 表达需要处理的状态。',
      '表单或审批流空间不足时，使用 vertical 或 small 模式。'
    ]
  }),
  tabs: createNavigationDocsDefinition({
    apiIntro:
      'vTabs 用 tablist/tabpanel 组织内容区域，vTab 负责单个标签和面板。active 支持 key 或索引，箭头键会切换并聚焦标签。',
    apiRows: [
      [
        'vTabs({ active, items, orientation, variant, size })',
        '创建标签页，active 可用 key 或索引。',
        "vTabs({ active: 'overview', items: [...] })"
      ],
      ['tabs.active(value)', '读取或设置当前标签，支持 key 或索引。', "tabs.active('logs')"],
      [
        'tabs.items(value)',
        '替换全部标签数据。',
        "tabs.items([{ label: '概览', content: '概览内容' }])"
      ],
      [
        'tabs.change(handler) / tabs.onChange(handler)',
        '监听标签切换事件。',
        'tabs.change(({ active }) => ...)'
      ],
      ['tabs.orientation(value)', '切换 horizontal 或 vertical。', "tabs.orientation('vertical')"],
      ['tabs.variant(value)', '切换 line / card / pills 三种样式。', "tabs.variant('pills')"],
      ['tabs.size(value)', '切换 small / default / large。', "tabs.size('small')"],
      [
        'tabs.vTab(setup)',
        '用回调声明单个标签和面板。',
        "tabs.vTab((tab) => tab.label('概览').content('概览内容'))"
      ],
      [
        'tab.label() / tab.content() / tab.key() / tab.disabled()',
        '设置标签文案、面板内容、key 和禁用状态。',
        'tab.disabled(true)'
      ]
    ],
    apiSignature: `const tabs = vTabs((tabs) => {
  tabs.active('overview');
  tabs.vTab((tab) => {
    tab.key('overview');
    tab.label('概览');
    tab.content((panel) => panel.p('服务概览'));
  });
  tabs.vTab((tab) => {
    tab.key('logs');
    tab.label('日志');
    tab.content('运行日志');
  });
});`,
    examples: [
      {
        component: TabsBasicExample1,
        description: 'key 驱动当前标签，点击或方向键切换后同步状态文案。',
        id: 'basic',
        imports: ['vCard', 'vTabs', 'vText'],
        sourceTitle: '基础标签页核心源码',
        title: '基础标签页'
      },
      {
        component: TabsVerticalExample1,
        description: 'vertical 模式把标签放在左侧，适合详情页或设置页。',
        id: 'vertical',
        imports: ['vCard', 'vTabs'],
        sourceTitle: '纵向标签页核心源码',
        title: '纵向标签页'
      },
      {
        component: TabsCustomExample1,
        description: 'card 样式、small 尺寸和禁用标签适合紧凑的管理工具。',
        id: 'custom',
        imports: ['vCard', 'vTab', 'vTabs'],
        sourceTitle: '紧凑标签页核心源码',
        title: '紧凑标签页'
      }
    ],
    examplesIntro: '下面三个示例分别展示基础切换、纵向布局和紧凑样式。',
    heading: 'vTabs 标签页',
    intro:
      '标签页用于在同一区域内切换相关视图，避免把内容全部摊开。vTabs 提供语义化 tablist/tabpanel、键盘导航、禁用标签和多种视觉样式。',
    key: 'tabs',
    routeItem: 'navigation:6',
    title: '标签页',
    usageItems: [
      '详情页、设置页和同一对象的多类信息需要分区展示时使用。',
      '需要键盘可访问的标签切换时，使用 vTabs 而不是手写按钮和 hidden 面板。',
      '空间紧凑时使用 small、card 或 pills，垂直模式适合侧栏式布局。'
    ]
  })
});

export function MenuDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.menu);
}

export function AnchorDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.anchor);
}

export function BreadcrumbDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.breadcrumb);
}

export function RouterDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.router);
}

export function RouterViewsDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.routerViews);
}

export function NavbarDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.navbar);
}

export function StepsDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.steps);
}

export function TabsDocumentationPage() {
  return createNavigationDocumentationPage(navigationDocsDefinitions.tabs);
}

function createNavigationDocsDefinition(config) {
  return Object.freeze({
    apiIntro: config.apiIntro ?? '',
    apiRows: Object.freeze(config.apiRows ?? []),
    apiSignature: config.apiSignature ?? '',
    examples: Object.freeze(config.examples ?? []),
    examplesIntro: config.examplesIntro ?? '下面的示例可以直接复制到自己的对象组件中。',
    heading: config.heading,
    intro: config.intro,
    key: config.key,
    routeItem: config.routeItem,
    title: config.title,
    usageItems: Object.freeze(config.usageItems ?? []),
    usageIntro: config.usageIntro ?? '',
    usageTitle: config.usageTitle ?? '何时使用',
    apiTitle: config.apiTitle ?? '常用 API'
  });
}

function createNavigationDocumentationPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          `components-route-page components-navigation-docs components-navigation-docs--${definition.key}`
        );
        page.attr('data-component-route-item', definition.routeItem);
        page.attr('data-navigation-docs', definition.key);

        page.header((header) => {
          header.className('components-navigation-docs-header');
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-navigation-docs-usage');
          usage.attr('data-navigation-usage', definition.key);
          usage.h2(definition.usageTitle);
          if (definition.usageIntro) {
            usage.p(definition.usageIntro);
          }
          usage.ul((list) => {
            definition.usageItems.forEach((itemText) => {
              list.li(itemText);
            });
          });
        });

        page.section((api) => {
          api.className('components-navigation-docs-api');
          api.h2(definition.apiTitle);
          if (definition.apiIntro) {
            api.p(definition.apiIntro);
          }
          api.pre((pre) => {
            pre.className('navigation-api-signature');
            pre.code(definition.apiSignature);
          });
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              definition.apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.className('components-navigation-docs-examples');
          examples.h2('代码演示');
          examples.p(definition.examplesIntro);
          definition.examples.forEach((demo) => {
            examples.child(NavigationExampleSection(demo));
          });
        });
      });
    }
  };
}

function NavigationExampleSection(demo) {
  const liveDemo = demo.frame ? null : demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent ?? demo.component,
    imports: demo.imports ?? [],
    title: demo.sourceTitle ?? `${demo.title} 核心源码`
  });

  return {
    render() {
      return section((example) => {
        example.className('components-navigation-demo');
        example.attr('data-navigation-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-navigation-demo-live');
          live.attr('data-navigation-demo-live', 'true');
          if (demo.frame) {
            live.iframe((frame) => {
              frame.className('components-navigation-demo-frame');
              frame.attr('data-navigation-demo-frame', 'true');
              frame.attr('title', `${demo.title} 演示`);
              frame.attr('src', `${examplesBaseUrl}${demo.frameSrc.replace(/^\.\//, '')}`);
            });
          } else {
            live.child(liveDemo);
          }
        });
        example.child(sourcePanel);
      });
    }
  };
}

function NavbarShellExample1() {
  const status = vText('当前：概览');
  const menuItems = [];
  const setActive = (label, activeIndex) => {
    menuItems.forEach((item, index) => item.active(index === activeIndex));
    status.textContent(`当前：${label}`);
  };
  const showAction = (label) => {
    status.textContent(`已触发：${label}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('产品顶栏');
        card.vCardBody((body) => {
          body.vstack((shell) => {
            shell.style('gap', '14px');
            shell.vNavbar((navbar) => {
              navbar.ariaLabel('产品主导航');
              navbar.title('yoya-ui');
              navbar.subtitle('设计系统');
              navbar.menuContent((menu) => {
                ['概览', '组件', '文档'].forEach((label, index) => {
                  menu.vMenuItem((item) => {
                    item.text(label);
                    item.active(index === 0);
                    item.on('click', () => setActive(label, index));
                    menuItems[index] = item;
                  });
                });
              });
              navbar.actions((actions) => {
                actions.output((output) => {
                  output.className('components-route-note');
                  output.attr('data-navbar-demo-status', 'true');
                  output.child(status);
                });
                actions.span((badge) => {
                  badge.className('components-route-note');
                  badge.text('在线');
                });
                actions.vButton((button) => {
                  button.label('登录');
                  button.variant('primary');
                  button.on('click', () => showAction('登录'));
                });
                actions.vDropdownMenu((dropdown) => {
                  dropdown.trigger('更多');
                  dropdown.menuContent((commands) => {
                    commands.vMenuItem((item) => {
                      item.text('设置');
                      item.on('click', () => showAction('设置'));
                    });
                    commands.vMenuItem((item) => {
                      item.text('退出');
                      item.on('click', () => showAction('退出'));
                    });
                  });
                });
              });
            });
            shell.p('品牌、主导航和动作按钮都在同一条顶栏里。');
          });
        });
      });
    }
  };
}

function NavbarBrandExample1() {
  const status = vText('当前：服务');
  const menuItems = [];
  const setActive = (label, activeIndex) => {
    menuItems.forEach((item, index) => item.active(index === activeIndex));
    status.textContent(`当前：${label}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义品牌');
        card.vCardBody((body) => {
          body.vNavbar((navbar) => {
            navbar.ariaLabel('运维主导航');
            navbar.brand((brand) => {
              brand.strong('运维中心');
              brand.span('Workspace');
            });
            navbar.menuContent((menu) => {
              ['服务', '任务', '审计'].forEach((label, index) => {
                menu.vMenuItem((item) => {
                  item.text(label);
                  item.active(index === 0);
                  item.on('click', () => setActive(label, index));
                  menuItems[index] = item;
                });
              });
            });
            navbar.actions((actions) => {
              actions.output((output) => {
                output.className('components-route-note');
                output.child(status);
              });
              actions.vButton((button) => {
                button.label('同步');
                button.variant('secondary');
                button.on('click', () => status.textContent('同步完成'));
              });
              actions.vButton((button) => {
                button.label('新建');
                button.variant('primary');
                button.on('click', () => status.textContent('已进入新建流程'));
              });
            });
          });
        });
      });
    }
  };
}

function NavbarWrapExample1() {
  const status = vText('当前：概览');
  const menuItems = [];
  const setActive = (label, activeIndex) => {
    menuItems.forEach((item, index) => item.active(index === activeIndex));
    status.textContent(`当前：${label}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('窄屏换行');
        card.vCardBody((body) => {
          body.div((frame) => {
            frame.style('maxWidth', '720px');
            frame.vstack((shell) => {
              shell.style('gap', '14px');
              shell.vNavbar((navbar) => {
                navbar.title('yoya-ui');
                navbar.menuContent((menu) => {
                  ['概览', '配置', '日志', '审计'].forEach((label, index) => {
                    if (index === 2) {
                      menu.vMenuDivider();
                    }

                    menu.vMenuItem((item) => {
                      item.text(label);
                      item.active(index === 0);
                      item.on('click', () => setActive(label, index));
                      menuItems[index] = item;
                    });
                  });
                });
                navbar.actions((actions) => {
                  actions.output((output) => {
                    output.className('components-route-note');
                    output.child(status);
                  });
                  actions.vButton((button) => {
                    button.label('同步');
                    button.variant('secondary');
                    button.on('click', () => status.textContent('同步完成'));
                  });
                  actions.vButton((button) => {
                    button.label('发布');
                    button.variant('primary');
                    button.on('click', () => status.textContent('发布已提交'));
                  });
                });
              });
              shell.p('空间变窄时，动作区会自然换行。');
            });
          });
        });
      });
    }
  };
}

function StepsBasicExample1() {
  const steps = vSteps((steps) => {
    steps.current(1);
    steps.vStep((step) => {
      step.title('创建');
      step.description('填写服务信息');
    });
    steps.vStep((step) => {
      step.title('配置');
      step.description('选择部署资源');
    });
    steps.vStep((step) => {
      step.title('发布');
      step.description('确认并上线');
    });
  });
  const status = vText('当前第 2 步：配置');
  const syncStatus = () => {
    const step = steps.items()[steps.current()];
    status.textContent(`当前第 ${steps.current() + 1} 步：${step.title()}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础步骤');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('current 决定完成、当前和等待状态，按钮可以驱动向导前进或后退。');
            content.child(steps);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('当前步骤');
              row.spacer();
              row.output((output) => {
                output.attr('data-steps-basic-status', 'true');
                output.child(status);
              });
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('上一步');
              button.variant('secondary');
              button.on('click', () => {
                steps.prev();
                syncStatus();
              });
            });
            actions.vButton((button) => {
              button.label('下一步');
              button.variant('primary');
              button.on('click', () => {
                steps.next();
                syncStatus();
              });
            });
          });
        });
      });
    }
  };
}

function StepsVerticalExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('纵向步骤');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('纵向布局适合表单、审批详情等需要逐条阅读流程的场景。');
            content.child(
              vSteps((steps) => {
                steps.direction('vertical');
                steps.current(1);
                steps.status('error');
                steps.vStep((step) => {
                  step.title('提交申请');
                  step.description('填写申请单');
                });
                steps.vStep((step) => {
                  step.title('审批');
                  step.description('当前审批失败');
                });
                steps.vStep((step) => {
                  step.title('完成');
                  step.description('等待重新提交');
                });
              })
            );
          });
        });
      });
    }
  };
}

function StepsCustomExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('紧凑步骤');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('small 尺寸和自定义图标适合卡片摘要、状态面板等紧凑区域。');
            content.child(
              vSteps((steps) => {
                steps.current(2);
                steps.size('small');
                steps.vStep((step) => {
                  step.title('基础信息');
                  step.description('已填写');
                  step.icon('✓');
                });
                steps.vStep((step) => {
                  step.title('资源检查');
                  step.description('通过');
                  step.icon('✓');
                });
                steps.vStep((step) => {
                  step.title('发布');
                  step.description('准备上线');
                  step.icon('3');
                });
              })
            );
          });
        });
      });
    }
  };
}

function TabsBasicExample1() {
  const status = vText('当前：概览');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础标签页');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('key 驱动当前标签，点击或方向键切换后同步状态文案。');
            content.child(
              vTabs((tabs) => {
                tabs.ariaLabel('服务详情标签');
                tabs.change(({ item }) => status.textContent(`当前：${item.label()}`));
                tabs.vTab((tab) => {
                  tab.key('overview');
                  tab.label('概览');
                  tab.content((panel) => {
                    panel.p('服务概览');
                    panel.p('展示核心指标和近期变更。');
                  });
                });
                tabs.vTab((tab) => {
                  tab.key('logs');
                  tab.label('日志');
                  tab.content((panel) => panel.p('最近运行日志会显示在这里。'));
                });
                tabs.vTab((tab) => {
                  tab.key('audit');
                  tab.label('审计');
                  tab.content((panel) => panel.p('审计记录和操作历史。'));
                });
              })
            );
            content.div((row) => {
              row.style('alignItems', 'center');
              row.style('display', 'flex');
              row.style('justifyContent', 'space-between');
              row.span('当前标签');
              row.output((output) => {
                output.attr('data-tabs-basic-status', 'true');
                output.child(status);
              });
            });
          });
        });
      });
    }
  };
}

function TabsVerticalExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('纵向标签页');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vertical 模式把标签放在左侧，适合详情页或设置页。');
            content.child(
              vTabs((tabs) => {
                tabs.ariaLabel('设置页导航');
                tabs.orientation('vertical');
                tabs.variant('pills');
                tabs.vTab((tab) => {
                  tab.key('profile');
                  tab.label('基本信息');
                  tab.content((panel) => {
                    panel.p('服务名称、负责人和环境信息。');
                  });
                });
                tabs.vTab((tab) => {
                  tab.key('permissions');
                  tab.label('权限');
                  tab.content((panel) => {
                    panel.p('成员和角色权限设置。');
                  });
                });
                tabs.vTab((tab) => {
                  tab.key('notifications');
                  tab.label('通知');
                  tab.content((panel) => {
                    panel.p('消息通知偏好。');
                  });
                });
              })
            );
          });
        });
      });
    }
  };
}

function TabsCustomExample1() {
  const auditTab = vTab({
    content: '审计记录暂未开放',
    disabled: true,
    label: '审计'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('紧凑标签页');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('card 样式和 small 尺寸适合嵌入工具栏或详情卡片。');
            content.child(
              vTabs((tabs) => {
                tabs.ariaLabel('服务标签');
                tabs.size('small');
                tabs.variant('card');
                tabs.vTab((tab) => {
                  tab.key('overview');
                  tab.label('概览');
                  tab.content((panel) => panel.p('服务状态与核心指标。'));
                });
                tabs.vTab((tab) => {
                  tab.key('logs');
                  tab.label('日志');
                  tab.content((panel) => panel.p('查看最近日志。'));
                });
                tabs.child(auditTab);
              })
            );
          });
        });
      });
    }
  };
}

function BreadcrumbBasicExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础面包屑');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('链接层级可以返回上级，最后一个节点作为当前页面。');
            content.child(
              vBreadcrumb((breadcrumb) => {
                breadcrumb.ariaLabel('服务导航');
                breadcrumb.separator('/');
                breadcrumb.vBreadcrumbItem((item) => {
                  item.label('控制台');
                  item.href('#/console');
                });
                breadcrumb.vBreadcrumbItem((item) => {
                  item.label('服务列表');
                  item.href('#/services');
                });
                breadcrumb.vBreadcrumbItem((item) => {
                  item.label('api-gateway');
                  item.active(true);
                });
              })
            );
          });
        });
      });
    }
  };
}

function BreadcrumbDynamicExample1() {
  const status = vText('当前：服务详情');
  const items = [
    vBreadcrumbItem({ href: '/console', label: '控制台' }),
    vBreadcrumbItem({ href: '/services', label: '服务' }),
    vBreadcrumbItem({ active: true, label: '服务详情' })
  ];
  const select = (index) => {
    items.forEach((item, itemIndex) => item.active(itemIndex === index));
    status.textContent(`当前：${items[index].label()}`);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动态当前项');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('active 可以随时切换，当前项会从链接变成 aria-current 文本。');
            content.child(
              vBreadcrumb((breadcrumb) => {
                breadcrumb.ariaLabel('动态服务导航');
                breadcrumb.child(items);
              })
            );
            content.hstack((row) => {
              row.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
              ['控制台', '服务', '服务详情'].forEach((label, index) => {
                row.vButton((button) => {
                  button.label(label);
                  button.size('small');
                  button.variant('secondary');
                  button.on('click', () => select(index));
                });
              });
              row.spacer();
              row.output((output) => {
                output.attr('data-breadcrumb-demo-status', 'true');
                output.child(status);
              });
            });
          });
        });
      });
    }
  };
}
