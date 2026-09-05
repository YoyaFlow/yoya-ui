import {
  createI18n,
  FolderOpenOutlined,
  FolderOutlined,
  initYoyaTheme,
  router,
  section,
  toast,
  vBody,
  vContainer,
  vMessageContainer,
  vNavbar,
  vRouterViews,
  vSplitPanel,
  vThemeModeSwitch,
  vThemeShell,
  vTree
} from '../index.js';
import '../yoya.ui.css';
import { ComponentSource } from './component-source.js';
import { applyDemoStyles } from './demo-styles.js';

const componentMenuSections = [
  {
    id: 'guides',
    title: '开发指南',
    items: [
      { key: 'overview', label: '概述', details: 'Overview' },
      { key: 'installation', label: '安装方式', details: 'Installation' },
      { key: 'html-native', label: 'HTML 原生元素', details: 'div / button / input / output' },
      { key: 'component', label: '组件', details: 'A 薄工厂 / B 对象组件' },
      { key: 'i18n', label: '国际化', details: 'I18n / createI18n / i18nText' },
      { key: 'state-node', label: '状态节点', details: 'vStateNode' },
      { key: 'access-control', label: '权限控制', details: 'createAccess / withAccess / access' },
      { key: 'devtools', label: 'DevTools', details: 'enableDevtools / 快照 / 事件流' },
      { key: 'ssr', label: '服务端渲染', details: 'renderToString / hydrate / mount' }
    ]
  },
  {
    id: 'general',
    title: '通用',
    items: [
      { key: 'button', label: '按钮', details: 'vButton' },
      { key: 'button-group', label: '按钮组', details: 'vButtons' },
      { key: 'float-button', label: '悬浮按钮', details: 'vFloatButton' },
      { key: 'icons', label: '图标', details: 'SearchOutlined / UploadOutlined' },
      { key: 'svg', label: 'SVG 动画', details: 'requestAnimationFrame / stroke-dashoffset' }
    ]
  },
  {
    id: 'effects',
    title: '特效组件',
    items: [{ key: 'glow-button', label: '按钮', details: 'vGlowButton' }]
  },
  {
    id: 'layout',
    title: '布局',
    items: [
      { key: 'divider', label: '分割线', details: 'divider' },
      { key: 'flex', label: '弹性布局', details: 'flex / stack / hstack / vstack / center' },
      { key: 'grid', label: '栅格', details: 'grid / responsiveGrid' },
      { key: 'body', label: '页面容器', details: 'vBody / container / grid / responsiveGrid' },
      { key: 'spacer', label: '间距', details: 'spacer' },
      { key: 'dialog', label: '弹窗', details: 'vDialog' },
      { key: 'templates', label: '布局模板', details: 'admin / cloud / profile / docs' },
      { key: 'mobile', label: '移动布局', details: 'mobileLayout / vMobileLayout', hidden: true },
      { key: 'split-panel', label: '分隔面板', details: 'vSplitPanel' }
    ]
  },
  {
    id: 'navigation',
    title: '导航',
    items: [
      { key: 'anchor', label: '锚点', details: 'vAnchor / vAnchorItem' },
      { key: 'breadcrumb', label: '面包屑', details: 'vBreadcrumb / vBreadcrumbItem' },
      { key: 'dropdown', label: '下拉菜单', details: 'vDropdownMenu / vContextMenu' },
      {
        key: 'menu',
        label: '菜单',
        details:
          'vMenu / vMenuItem / vMenuGroup / vMenuDivider / vSubMenu / vSidebar / vDropdownMenu / vContextMenu'
      },
      { key: 'pagination', label: '分页', details: 'vPagination' },
      { key: 'steps', label: '步骤条', details: 'vSteps / vStep' },
      { key: 'tabs', label: '标签页', details: 'vTabs / vTab' },
      { key: 'router', label: '路由', details: 'Router / vRouter / vLink / vRoute' },
      { key: 'router-views', label: '路由视图', details: 'vRouterView / vRouterViews' },
      { key: 'navbar', label: '导航栏', details: 'vNavbar / vMenu / vButton' }
    ]
  },
  {
    id: 'form',
    title: '表单与数据录入',
    items: [
      { key: 'form', label: '表单', details: 'vForm' },
      { key: 'input', label: '输入框', details: 'vInput' },
      { key: 'select', label: '选择框', details: 'vSelect' },
      { key: 'checkbox', label: '多选框', details: 'vCheckbox / vCheckboxes' },
      { key: 'radio', label: '单选框', details: 'vRadio' },
      { key: 'textarea', label: '文本域', details: 'vTextarea' },
      { key: 'switch', label: '开关', details: 'vSwitch' },
      { key: 'field', label: '字段', details: 'vField' },
      { key: 'timer', label: '日期时间', details: 'vTimer' },
      { key: 'timer-range', label: '日期范围', details: 'vTimerRange' },
      { key: 'upload', label: '文件上传', details: 'vUpload' },
      { key: 'rate', label: '评分', details: 'vRate' },
      { key: 'color-picker', label: '颜色选择器', details: 'vColorPicker' },
      { key: 'slider', label: '滑动条', details: 'vSlider' },
      { key: 'cascader', label: '级联选择', details: 'vCascader' },
      { key: 'tags-input', label: '标签输入', details: 'vTagsInput' },
      { key: 'autocomplete', label: '自动完成', details: 'vAutocomplete' },
      { key: 'svg-icon-picker', label: '图标选择器', details: 'vSvgIconPicker' }
    ]
  },
  {
    id: 'data-display',
    title: '数据展示',
    items: [
      { key: 'avatar', label: '头像', details: 'vAvatar' },
      { key: 'badge', label: '徽标数', details: 'vBadge' },
      { key: 'detail', label: '详情', details: 'vDetail / vDetailItem' },
      { key: 'code', label: '代码', details: 'vCode / codeBlock' },
      { key: 'table', label: '表格', details: 'vTable' },
      { key: 'tree-table', label: '树形表格', details: 'vTreeTable 树形层级 / 懒加载' },
      { key: 'tree', label: '树形控件', details: 'vTree' },
      { key: 'card', label: '卡片', details: 'vCard / vCardHeader / vCardBody / vCardFooter' },
      { key: 'progress', label: '进度条', details: 'vProgress' },
      { key: 'scroll', label: '滚动组件', details: 'vScroll' },
      { key: 'carousel', label: '走马灯', details: 'vCarousel' },
      { key: 'tree-ranger', label: '多列浏览器', details: 'vTreeRanger' }
    ]
  },
  {
    id: 'board',
    title: '看板',
    items: [
      { key: 'digital-board', label: '数字看板', details: 'vDigitalBoard / vDigitalBoardItem' },
      { key: 'trend-card', label: '趋势卡', details: 'vTrendCard' },
      { key: 'sparkline', label: '迷你走势', details: 'vSparkline' },
      { key: 'ring-stat', label: '环形统计', details: 'vRingStat' },
      { key: 'gauge', label: '仪表盘', details: 'vGauge' },
      { key: 'timeline', label: '时间线', details: 'vTimeline / vTimelineItem' }
    ]
  },
  {
    id: 'async',
    title: '异步',
    items: [{ key: 'dynamic-loader', label: '动态加载', details: 'vDynamicLoader' }]
  },
  {
    id: 'c-end',
    title: 'C 端体验',
    items: [
      { key: 'skeleton', label: '骨架屏', details: 'vSkeleton' },
      { key: 'lazy-image', label: '懒加载图片', details: 'vLazyImage' },
      { key: 'transition', label: '过渡动效', details: 'vTransition' },
      { key: 'masonry', label: '瀑布流', details: 'vMasonry' },
      { key: 'image-preview', label: '图片预览', details: 'vImagePreview' }
    ]
  },
  {
    id: 'feedback',
    title: '反馈',
    items: [
      { key: 'message', label: '消息', details: 'vMessage / vMessageContainer / toast' },
      { key: 'message-manager', label: '消息管理器', details: 'vMessageManager' },
      { key: 'tooltip', label: '提示', details: 'vTooltip' },
      { key: 'confirm', label: '确认弹窗', details: 'vConfirm 命令式确认' }
    ]
  },
  {
    id: 'third-party',
    title: '第三方扩展',
    items: [
      { key: 'overview', label: '互操作概览', details: '真实 DOM 互操作演示与约束' },
      { key: 'quill', label: 'Quill 富文本', details: 'Quill 富文本编辑器' },
      { key: 'ag-grid', label: 'AG Grid 表格', details: 'AG Grid Community' },
      { key: 'leaflet', label: 'Leaflet 地图', details: 'Leaflet' },
      { key: 'codemirror', label: 'CodeMirror 编辑', details: 'CodeMirror 6' },
      { key: 'markdown-viewer', label: 'Markdown 查看', details: 'Toast UI Viewer' },
      { key: 'echarts', label: 'ECharts 图表', details: 'vEchart / VEchart' },
      { key: 'signals', label: 'Signals 状态管理', details: 'signal / computed / effect' }
    ]
  },
  {
    id: 'theme',
    title: '主题',
    items: [
      { key: 'theme', label: '主题切换', details: 'light / dark / system / compact / raw-primary' }
    ]
  }
];

const componentMenuStats = {
  categories: componentMenuSections.length,
  items: countComponentMenuItems(componentMenuSections),
  planned: countComponentMenuItems(componentMenuSections, 'planned')
};

function getTopNavigationItems() {
  return [
    { categoryId: 'overview', label: '概述', path: '/components' },
    ...componentMenuSections.map((category) => {
      const firstReadyItem = category.items.find(
        (item) => item.status !== 'planned' && !item.hidden
      );
      return {
        categoryId: category.id,
        label: category.title,
        path: buildComponentItemPath(category.id, firstReadyItem?.key ?? category.items[0].key)
      };
    })
  ];
}

const docsRouteLoaders = Object.freeze({
  'guides:overview': () => import('./guide-docs.js').then((m) => m.GuideOverviewPage()),
  'guides:installation': () => import('./guide-docs.js').then((m) => m.GuideInstallationPage()),
  'guides:html-native': () =>
    import('./html-native-docs.js').then((m) => m.HtmlNativeDocumentationPage()),
  'guides:component': () =>
    import('./component-definition-docs.js').then((m) => m.ComponentDefinitionDocumentationPage()),
  'guides:i18n': () => import('./i18n-docs.js').then((m) => m.I18nDocumentationPage()),
  'guides:state-node': () =>
    import('./state-node-docs.js').then((m) => m.StateNodeDocumentationPage()),
  'guides:access-control': () =>
    import('./access-control-docs.js').then((m) => m.AccessControlDocumentationPage()),
  'guides:devtools': () =>
    import('./devtools-docs.js').then((m) => m.DevtoolsDocumentationPage()),
  'data-display:tree-table': () =>
    import('./vtreetable-docs.js').then((m) => m.TreeTableDocumentationPage()),
  'guides:ssr': () => import('./ssr-docs.js').then((m) => m.SsrDocumentationPage()),
  'feedback:confirm': () => import('./vconfirm-docs.js').then((m) => m.ConfirmDocumentationPage()),
  'general:button': () => import('./button-docs.js').then((m) => m.ButtonDocumentationPage()),
  'general:button-group': () =>
    import('./button-group-docs.js').then((m) => m.ButtonGroupDocumentationPage()),
  'general:float-button': () =>
    import('./float-button-docs.js').then((m) => m.FloatButtonDocumentationPage()),
  'general:icons': () => import('./icons-docs.js').then((m) => m.IconsDocumentationPage()),
  'general:svg': () => import('./svg-docs.js').then((m) => m.SvgDocumentationPage()),
  'effects:glow-button': () =>
    import('./effects-docs.js').then((m) => m.GlowButtonDocumentationPage()),
  'layout:divider': () => import('./layout-docs.js').then((m) => m.DividerDocumentationPage()),
  'layout:flex': () => import('./layout-docs.js').then((m) => m.FlexDocumentationPage()),
  'layout:grid': () => import('./layout-docs.js').then((m) => m.GridDocumentationPage()),
  'layout:body': () => import('./layout-docs.js').then((m) => m.BodyDocumentationPage()),
  'layout:spacer': () => import('./layout-docs.js').then((m) => m.SpacerDocumentationPage()),
  'layout:dialog': () => import('./layout-docs.js').then((m) => m.PopupDocumentationPage()),
  'layout:templates': () => import('./layout-docs.js').then((m) => m.TemplateDocumentationPage()),
  'layout:mobile': () => import('./layout-docs.js').then((m) => m.MobileDocumentationPage()),
  'layout:split-panel': () =>
    import('./layout-docs.js').then((m) => m.SplitPanelDocumentationPage()),
  'navigation:anchor': () =>
    import('./navigation-docs.js').then((m) => m.AnchorDocumentationPage()),
  'navigation:breadcrumb': () =>
    import('./navigation-docs.js').then((m) => m.BreadcrumbDocumentationPage()),
  'navigation:menu': () => import('./navigation-docs.js').then((m) => m.MenuDocumentationPage()),
  'navigation:steps': () => import('./navigation-docs.js').then((m) => m.StepsDocumentationPage()),
  'navigation:tabs': () => import('./navigation-docs.js').then((m) => m.TabsDocumentationPage()),
  'navigation:router': () =>
    import('./navigation-docs.js').then((m) => m.RouterDocumentationPage()),
  'navigation:router-views': () =>
    import('./navigation-docs.js').then((m) => m.RouterViewsDocumentationPage()),
  'navigation:navbar': () =>
    import('./navigation-docs.js').then((m) => m.NavbarDocumentationPage()),
  'feedback:message': () => import('./feedback-docs.js').then((m) => m.MessageDocumentationPage()),
  'feedback:tooltip': () => import('./feedback-docs.js').then((m) => m.TooltipDocumentationPage()),
  'form:form': () => import('./form-docs.js').then((m) => m.FormDocumentationPage()),
  'form:checkbox': () => import('./checkbox-docs.js').then((m) => m.CheckboxDocumentationPage()),
  'form:field': () => import('./form-docs.js').then((m) => m.FieldDocumentationPage()),
  'form:radio': () => import('./radio-docs.js').then((m) => m.RadioDocumentationPage()),
  'form:color-picker': () =>
    import('./color-picker-docs.js').then((m) => m.ColorPickerDocumentationPage()),
  'form:slider': () => import('./form-controls-docs.js').then((m) => m.SliderDocumentationPage()),
  'form:cascader': () =>
    import('./form-controls-docs.js').then((m) => m.CascaderDocumentationPage()),
  'form:tags-input': () =>
    import('./form-controls-docs.js').then((m) => m.TagsInputDocumentationPage()),
  'form:autocomplete': () =>
    import('./form-controls-docs.js').then((m) => m.AutocompleteDocumentationPage()),
  'form:svg-icon-picker': () =>
    import('./svg-icon-picker-docs.js').then((m) => m.SvgIconPickerDocumentationPage()),
  'data-display:avatar': () =>
    import('./data-display-docs.js').then((m) => m.AvatarDocumentationPage()),
  'data-display:badge': () =>
    import('./data-display-docs.js').then((m) => m.BadgeDocumentationPage()),
  'data-display:detail': () =>
    import('./data-display-docs.js').then((m) => m.DetailDocumentationPage()),
  'data-display:table': () =>
    import('./data-display-docs.js').then((m) => m.TableDocumentationPage()),
  'data-display:tree': () =>
    import('./data-display-docs.js').then((m) => m.TreeDocumentationPage()),
  'data-display:progress': () =>
    import('./data-display-docs.js').then((m) => m.ProgressDocumentationPage()),
  'data-display:scroll': () =>
    import('./data-display-docs.js').then((m) => m.ScrollDocumentationPage()),
  'data-display:carousel': () =>
    import('./data-display-docs.js').then((m) => m.CarouselDocumentationPage()),
  'data-display:tree-ranger': () =>
    import('./data-display-docs.js').then((m) => m.TreeRangerDocumentationPage()),
  'c-end:skeleton': () => import('./c-end-docs.js').then((m) => m.SkeletonDocumentationPage()),
  'c-end:lazy-image': () => import('./c-end-docs.js').then((m) => m.LazyImageDocumentationPage()),
  'c-end:transition': () => import('./c-end-docs.js').then((m) => m.TransitionDocumentationPage()),
  'c-end:masonry': () => import('./c-end-docs.js').then((m) => m.MasonryDocumentationPage()),
  'c-end:image-preview': () =>
    import('./c-end-docs.js').then((m) => m.ImagePreviewDocumentationPage()),
  'third-party:echarts': () =>
    import('./echarts-docs.js').then((m) => m.EchartsDocumentationPage()),
  'third-party:signals': () =>
    import('./signals-docs.js').then((m) => m.SignalsDocumentationPage()),
  'third-party:overview': () => import('./interop-docs.js').then((m) => m.InteropOverviewPage()),
  'third-party:quill': () => import('./quill-docs.js').then((m) => m.QuillDocumentationPage()),
  'third-party:ag-grid': () => import('./ag-grid-docs.js').then((m) => m.AgGridDocumentationPage()),
  'third-party:leaflet': () =>
    import('./leaflet-docs.js').then((m) => m.LeafletDocumentationPage()),
  'third-party:codemirror': () =>
    import('./codemirror-docs.js').then((m) => m.CodeMirrorDocumentationPage()),
  'third-party:markdown-viewer': () =>
    import('./markdown-viewer-docs.js').then((m) => m.MarkdownViewerDocumentationPage()),
  'theme:theme': () => import('./theme-docs.js').then((m) => m.ThemeDemonstrationPage())
});

const locale = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': {
      actions: {
        danger: '危险操作',
        refresh: '刷新状态',
        save: '保存配置',
        start: '启动任务'
      }
    },
    en: {
      actions: {
        danger: 'Danger',
        refresh: 'Refresh',
        save: 'Save',
        start: 'Start job'
      }
    }
  }
});

export function renderExamplesIndex(target = '#app') {
  initYoyaTheme({ persist: true });
  const previousToastContainer = toast._container ?? null;
  const messageHost = vMessageContainer({ placement: 'top-right' }).bindTo(document.body);
  toast.use(messageHost);

  let appRouter = null;

  appRouter = router((r) => {
    r.default('/components');
    r.route('/components', {
      title: '概述',
      view: () => createOverviewView()
    });
    r.route('/components/overview', {
      title: '概述',
      view: () => createOverviewView()
    });
    r.route('/components/intro', {
      title: '概述',
      view: () => createOverviewView()
    });

    registerComponentsWorkspaceRoutes(r, { locale, toast });

    r.notFound(({ path }) => createNotFoundView(path));
  });

  const root = createComponentsView(appRouter);
  const mediaQuery =
    typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 960px)') : null;
  const applyStyles = () => applyDemoStyles(root);

  mediaQuery?.addEventListener?.('change', applyStyles);
  root.bindTo(target);
  appRouter.start();
  applyStyles();

  const destroy = root.destroy.bind(root);
  root.destroy = () => {
    mediaQuery?.removeEventListener?.('change', applyStyles);
    toast.use(previousToastContainer);
    messageHost.destroy?.();
    appRouter.stop?.();
    return destroy();
  };

  return root;
}

function registerComponentsWorkspaceRoutes(routerInstance, context) {
  componentMenuSections.forEach((category) => {
    category.items.forEach((item) => {
      routerInstance.route(buildComponentItemPath(category.id, item.key), {
        title: item.label,
        view: () => createComponentItemView(category, item, context)
      });
    });
  });
}

function createComponentsView(appRouter) {
  const topNavItemRefs = [];
  const routerViews = vRouterViews(appRouter, { lockTitle: true, title: '组件目录' });

  const syncSelection = () => {
    const currentPath = appRouter.currentPath();

    const activeCategory = componentMenuSections.find((category) =>
      category.items.some(
        (item) => !item.hidden && buildComponentItemPath(category.id, item.key) === currentPath
      )
    );
    if (activeCategory && menuTree) {
      menuTree.expandedKeys([...menuTree.expandedKeys(), activeCategory.id]);
      menuTree.selectedKeys([currentPath]);
    }

    topNavItemRefs.forEach(({ node, entry }) => {
      const active =
        entry.categoryId === 'overview'
          ? currentPath === '/components' ||
            currentPath === '/components/overview' ||
            currentPath === '/components/intro'
          : currentPath.startsWith(`/components/${entry.categoryId}/`);
      node.active(active);
      node.attr('data-active-path', active ? 'true' : null);
    });

    applyStyles();
  };

  const topNavigationItems = getTopNavigationItems();
  const topNav = vNavbar((navbar) => {
    navbar.attr('data-components-top-nav', 'true');
    navbar.ariaLabel('演示页面导航');
    navbar.title('yoya-ui');
    navbar.subtitle('组件演示');

    navbar.actions((actions) => {
      actions.child(vThemeModeSwitch());
    });

    navbar.menuContent((menu) => {
      topNavigationItems.forEach((entry) => {
        menu.vMenuItem((entryView) => {
          entryView.attr({
            'data-top-nav-item': entry.categoryId,
            'data-top-nav-path': entry.path
          });
          entryView.text(entry.label);
          entryView.on('click', () => appRouter.navigate(entry.path));
          topNavItemRefs.push({ entry, node: entryView });
        });
      });
    });
  });
  topNav.sticky();

  const menuTree = vTree({
    ariaLabel: '组件菜单',
    className: 'components-menu-tree',
    nodes: componentMenuSections.map((category, categoryIndex) => ({
      children: category.items
        .filter((item) => !item.hidden)
        .map((item) => ({
          id: buildComponentItemPath(category.id, item.key),
          label: item.status === 'planned' ? `${item.label}（待开发）` : item.label
        })),
      expanded: categoryIndex === 0,
      id: category.id,
      label: category.title
    })),
    onSelect: ({ id }) => {
      const path = String(id);
      if (path.startsWith('/components/')) {
        appRouter.navigate(path);
      }
    },
    selectable: true,
    toggleIcon: {
      collapsed: FolderOutlined().styles({ height: '16px', width: '16px' }),
      expanded: FolderOpenOutlined().styles({ height: '16px', width: '16px' })
    }
  });

  const workspace = vSplitPanel((panel) => {
    panel.className('components-workspace');
    panel.style('flex', '1 1 auto');
    panel.style('minHeight', '0');
    panel.size('280px');
    panel.minSize(180);

    panel.first((sidebar) => {
      sidebar.style('overflow', 'hidden');
      sidebar.div((menuBox) => {
        menuBox.className('components-menu');
        menuBox.attr('data-components-menu', 'true');
        menuBox.attr('aria-label', '组件菜单');
        menuBox.div((intro) => {
          intro.className('components-menu-intro');
          intro.h2('组件菜单');
        });
        menuBox.child(menuTree);
      });
    });

    panel.second((content) => {
      content.style('overflow', 'hidden');
      content.div((routerBox) => {
        routerBox.className('components-router-panel');
        routerBox.attr('data-components-router-views', 'true');
        routerBox.child(routerViews);
      });
    });
  });

  const appShell = vContainer((view) => {
    view.className('components-demo-shell');
    view.attr('data-components-demo-shell', 'true');
    view.viewport();
    view.child(topNav);
    view.child(workspace);
  });

  const root = vThemeShell((shell) => {
    shell.virtual();
    shell.child(vBody({ children: [appShell], gap: 0, maxWidth: '100%', padding: 0 }));
  });

  const applyStyles = () => applyDemoStyles(root);

  appRouter.subscribe(syncSelection);
  syncSelection();

  return root;
}

function createOverviewView() {
  return section((view) => {
    view.className('components-route-page components-route-page--overview');
    view.attr('data-overview-page', 'true');
    view.h2('概述');
    view.p(
      'yoya-ui 是面向所有 Web 开发者的轻量原生 JS UI 基础库，用 ViewNode DSL 构建可嵌入、可组合、低依赖的 Web UI；相比 React/Vue，后端与全栈开发者也能更方便地直接上手。'
    );
    view.p('左侧菜单查看组件分类，右侧页面包含实时演示、源码面板和开发指南。');

    view.section((principles) => {
      principles.className('components-overview-principles');
      principles.h3('定位与设计');
      principles.div((grid) => {
        grid.className('components-overview-grid components-overview-principles-grid');
        [
          {
            title: '定位',
            points: [
              '这是一套新的业务界面构建形式：Web 基础库，自带 UI 组件仅为开箱即用，不代表库的能力边界。',
              '面向所有 Web 开发者的轻量原生 JS 基础库，同时提供常用 UI 组件库；相比 React/Vue，后端与全栈开发者也能更低门槛地上手。',
              '回归本质，直接基于浏览器原生环境构建，相比 React/Vue 更轻、上手更直接。',
              'AI生成组件直接可使用，避免环境问题，返工率极低。',
              '适合厌倦前端层出不穷的新概念、新框架与破坏性版本更新的开发者。'
            ]
          },
          {
            title: '优势',
            points: [
              '核心库保持稳定，直接构建真实 DOM。适合长期运维项目，如客户内部环境部署。',
              '支持局部挂载、单页应用。',
              '组件、布局、路由、i18n、图表按模块扩展。',
              '视图语法基于原生 HTML 与声明式结构，消除 UI 库语法版本变更带来的迁移负担。'
            ]
          },
          {
            title: '设计理念',
            points: [
              '浏览器原生优先，采用声明式结构化 JS 元素组织视图，消除 HTML 标签化语言与复杂操作逻辑不兼容的问题。',
              '小核加扩展，组件边界清晰，能力按需引入。',
              '可嵌入、可组合：支持局部挂载与服务端模板嵌入，也可独立构建整站 SPA。'
            ]
          }
        ].forEach((principle) => {
          grid.article((card) => {
            card.className('components-overview-card components-overview-principle-card');
            card.attr('data-overview-principle', principle.title);
            card.h3(principle.title);
            card.ul((list) => {
              principle.points.forEach((point) => list.li(point));
            });
          });
        });
      });
    });

    view.div((metaGrid) => {
      metaGrid.className('components-route-meta-grid');

      metaGrid.article((meta) => {
        meta.className('components-route-meta');
        meta.h3('分类');
        meta.strong(String(componentMenuStats.categories));
      });

      metaGrid.article((meta) => {
        meta.className('components-route-meta');
        meta.h3('条目');
        meta.strong(String(componentMenuStats.items));
      });

      metaGrid.article((meta) => {
        meta.className('components-route-meta');
        meta.h3('待开发');
        meta.strong(String(componentMenuStats.planned));
      });
    });

    view.section((categories) => {
      categories.className('components-overview-section');
      categories.h3('分类导航');
      categories.div((grid) => {
        grid.className('components-overview-grid');
        componentMenuSections.forEach((category) => {
          const firstReadyItem = category.items.find(
            (item) => item.status !== 'planned' && !item.hidden
          );
          const path = buildComponentItemPath(
            category.id,
            firstReadyItem?.key ?? category.items[0].key
          );
          const readyItems = category.items.filter(
            (item) => !item.hidden && item.status !== 'planned'
          );

          grid.a((card) => {
            card.className('components-overview-card');
            card.attr({
              'data-overview-category': category.id,
              href: `#${path}`
            });
            card.h3(category.title);
            card.p(`${readyItems.length} 个可用演示`);
            card.p(
              readyItems
                .slice(0, 4)
                .map((item) => item.label)
                .join(' / ')
            );
            card.strong('查看分类');
          });
        });
      });
    });

    view.section((guides) => {
      guides.className('components-overview-guides');
      guides.h3('开发指南');
      guides.div((grid) => {
        grid.className('components-overview-grid');
        [
          {
            label: 'HTML 原生元素',
            path: '/components/guides/html-native',
            details: 'div / button / input / output'
          },
          {
            label: '组件',
            path: '/components/guides/component',
            details: 'A 薄工厂 / B 对象组件'
          },
          { label: '国际化', path: '/components/guides/i18n', details: 'I18n / createI18n / .s()' },
          { label: '状态节点', path: '/components/guides/state-node', details: 'vStateNode' },
          {
            label: '权限控制',
            path: '/components/guides/access-control',
            details: 'createAccess / withAccess / access'
          },
          {
            label: '服务端渲染',
            path: '/components/guides/ssr',
            details: 'renderToString / hydrate / mount'
          }
        ].forEach((guide) => {
          grid.a((card) => {
            card.className('components-overview-card components-overview-guide-card');
            card.attr({
              'data-overview-guide': guide.path,
              href: `#${guide.path}`
            });
            card.h3(guide.label);
            card.p(guide.details);
            card.strong('打开指南');
          });
        });
      });
    });
  });
}

function createComponentItemView(category, item, context) {
  const loadDocsView = docsRouteLoaders[`${category.id}:${item.key}`];

  if (loadDocsView) {
    return loadDocsView();
  }

  return import('./detail-demos.js').then((module) => {
    const detail = module.getComponentDetail(category.id, item.key, item);
    return createDetailItemView(category, item, context, detail);
  });
}

function createDetailItemView(category, item, context, detail) {
  const liveComponent = detail.component ? detail.component(context) : null;
  const sourcePanel = detail.component
    ? ComponentSource({
        component: detail.component,
        sourceComponent: detail.sourceComponent ?? detail.component,
        imports: detail.imports,
        title: detail.sourceTitle
      })
    : createPlannedSourcePanel(item, detail);

  return section((view) => {
    view.className('components-route-page components-route-page--item');
    view.attr('data-component-route-item', `${category.id}:${item.key}`);

    view.div((header) => {
      header.className('components-route-header');
      header.h2(item.label);
      header.p(category.title);
      header.p(item.details || detail.summary || ' ');
    });

    view.div((layout) => {
      layout.className('components-route-layout');
      layout.attr('data-demo-flow', 'content-source');

      layout.section((live) => {
        live.className('components-route-live');
        live.h3('实时演示');
        if (liveComponent) {
          live.child(liveComponent);
        } else {
          live.child(createPlannedLiveCard(item, detail));
        }
      });

      layout.child(sourcePanel);
    });

    view.div((metaGrid) => {
      metaGrid.className('components-route-meta-grid');

      metaGrid.article((meta) => {
        meta.className('components-route-meta');
        meta.h3('实现名');
        meta.code(item.details || '待开发');
      });

      metaGrid.article((meta) => {
        meta.className('components-route-meta');
        meta.h3('状态');
        meta.strong(detail.planned ? '待开发' : '可用');
      });

      metaGrid.article((meta) => {
        meta.className('components-route-meta');
        meta.h3('分类');
        meta.strong(category.title);
      });

      metaGrid.article((meta) => {
        meta.className('components-route-meta');
        meta.h3('路径');
        meta.code(buildComponentItemPath(category.id, item.key));
      });
    });

    if (detail.behavior.length > 0) {
      view.section((behavior) => {
        behavior.className('components-route-behavior');
        behavior.h3('行为');
        behavior.ul((list) => {
          detail.behavior.forEach((itemText) => {
            list.li(itemText);
          });
        });
      });
    }

    if (detail.notes.length > 0) {
      view.section((notes) => {
        notes.className('components-route-notes');
        notes.h3('要点');
        notes.div((tags) => {
          tags.className('components-route-note-list');
          detail.notes.forEach((note) => {
            tags.span((tag) => {
              tag.className('components-route-note');
              tag.text(note);
            });
          });
        });
      });
    }
  });
}

function createPlannedLiveCard(item, detail) {
  return section((card) => {
    card.className('components-route-placeholder');
    card.h3('待开发');
    card.p(detail.summary || item.details || '该条目暂时只有菜单预留。');
    card.p('后续补上真实实现后，这里会直接替换成 live demo。');
  });
}

function createPlannedSourcePanel(item, detail) {
  return section((panel) => {
    panel.className('source-panel');
    panel.h2(detail.sourceTitle || `${item.label} 源码`);
    panel.p('当前条目暂未实现，先保留说明位。');
    panel.pre((pre) => {
      pre.className('source-code');
      pre.code((code) => {
        code.attr('data-source-example', detail.sourceTitle || `${item.label} 源码`);
        code.text(`// ${item.label}\n// ${item.details || detail.summary || '待开发'}`);
      });
    });
  });
}

function buildComponentItemPath(categoryId, itemKey) {
  return `/components/${categoryId}/${itemKey}`;
}

function countComponentMenuItems(sections, status = null) {
  return sections.reduce((total, sectionEntry) => {
    const sectionCount = sectionEntry.items.filter((item) => {
      if (item.hidden) {
        return false;
      }

      if (status === null) {
        return true;
      }

      return (item.status ?? 'ready') === status;
    }).length;

    return total + sectionCount;
  }, 0);
}

function createNotFoundView(path) {
  return section((view) => {
    view.className('components-not-found');
    view.h2('未找到该示例');
    view.p(`路径：${path}`);

    view.a((link) => {
      link.attr({ href: '#/components' });
      link.text('返回组件目录');
    });
  });
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderExamplesIndex('#app');
}
