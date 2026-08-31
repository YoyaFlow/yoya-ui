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
      { label: '概述', details: 'Overview' },
      { label: '安装方式', details: 'Installation' },
      { label: 'HTML 原生元素', details: 'div / button / input / output' },
      { label: '组件', details: 'A 薄工厂 / B 对象组件' },
      { label: '国际化', details: 'I18n / createI18n / i18nText' },
      { label: '状态节点', details: 'vStateNode' },
      { label: '服务端渲染', details: 'renderToString / hydrate / mount' }
    ]
  },
  {
    id: 'general',
    title: '通用',
    items: [
      { label: '按钮', details: 'vButton' },
      { label: '按钮组', details: 'vButtons' },
      { label: '悬浮按钮', details: 'vFloatButton' },
      { label: '图标', details: 'SearchOutlined / UploadOutlined' },
      { label: 'SVG 动画', details: 'requestAnimationFrame / stroke-dashoffset' }
    ]
  },
  {
    id: 'effects',
    title: '特效组件',
    items: [{ label: '按钮', details: 'vGlowButton' }]
  },
  {
    id: 'layout',
    title: '布局',
    items: [
      { label: '分割线', details: 'divider' },
      { label: '弹性布局', details: 'flex / stack / hstack / vstack / center' },
      { label: '栅格', details: 'grid / responsiveGrid' },
      { label: '页面容器', details: 'vBody / container / grid / responsiveGrid' },
      { label: '间距', details: 'spacer' },
      { label: '弹窗', details: 'vDialog' },
      { label: '布局模板', details: 'admin / cloud / profile / docs' },
      { label: '移动布局', details: 'mobileLayout / vMobileLayout', hidden: true },
      { label: '分隔面板', details: 'vSplitPanel' }
    ]
  },
  {
    id: 'navigation',
    title: '导航',
    items: [
      { label: '锚点', details: 'vAnchor / vAnchorItem' },
      { label: '面包屑', details: 'vBreadcrumb / vBreadcrumbItem' },
      { label: '下拉菜单', details: 'vDropdownMenu / vContextMenu' },
      {
        label: '菜单',
        details:
          'vMenu / vMenuItem / vMenuGroup / vMenuDivider / vSubMenu / vSidebar / vDropdownMenu / vContextMenu'
      },
      { label: '分页', details: 'vPagination' },
      { label: '步骤条', details: 'vSteps / vStep' },
      { label: '标签页', details: 'vTabs / vTab' },
      { label: '路由', details: 'Router / vRouter / vLink / vRoute' },
      { label: '路由视图', details: 'vRouterView / vRouterViews' },
      { label: '导航栏', details: 'vNavbar / vMenu / vButton' }
    ]
  },
  {
    id: 'form',
    title: '表单与数据录入',
    items: [
      { label: '表单', details: 'vForm' },
      { label: '输入框', details: 'vInput' },
      { label: '选择框', details: 'vSelect' },
      { label: '多选框', details: 'vCheckbox / vCheckboxes' },
      { label: '单选框', details: 'vRadio' },
      { label: '文本域', details: 'vTextarea' },
      { label: '开关', details: 'vSwitch' },
      { label: '字段', details: 'vField' },
      { label: '日期时间', details: 'vTimer' },
      { label: '日期范围', details: 'vTimerRange' },
      { label: '文件上传', details: 'vUpload' },
      { label: '评分', details: 'vRate' },
      { label: '颜色选择器', details: 'vColorPicker' },
      { label: '滑动条', details: 'vSlider' },
      { label: '级联选择', details: 'vCascader' },
      { label: '标签输入', details: 'vTagsInput' },
      { label: '自动完成', details: 'vAutocomplete' }
    ]
  },
  {
    id: 'data-display',
    title: '数据展示',
    items: [
      { label: '头像', details: 'vAvatar' },
      { label: '徽标数', details: 'vBadge' },
      { label: '详情', details: 'vDetail / vDetailItem' },
      { label: '代码', details: 'vCode / codeBlock' },
      { label: '表格', details: 'vTable' },
      { label: '树形控件', details: 'vTree' },
      { label: '卡片', details: 'vCard / vCardHeader / vCardBody / vCardFooter' },
      { label: '进度条', details: 'vProgress' },
      { label: '滚动组件', details: 'vScroll' },
      { label: '走马灯', details: 'vCarousel' }
    ]
  },
  {
    id: 'board',
    title: '看板',
    items: [
      { label: '数字看板', details: 'vDigitalBoard / vDigitalBoardItem' },
      { label: '趋势卡', details: 'vTrendCard' },
      { label: '迷你走势', details: 'vSparkline' },
      { label: '环形统计', details: 'vRingStat' },
      { label: '仪表盘', details: 'vGauge' },
      { label: '时间线', details: 'vTimeline / vTimelineItem' }
    ]
  },
  {
    id: 'async',
    title: '异步',
    items: [{ label: '动态加载', details: 'vDynamicLoader' }]
  },
  {
    id: 'feedback',
    title: '反馈',
    items: [
      { label: '消息', details: 'vMessage / vMessageContainer / toast' },
      { label: '消息管理器', details: 'vMessageManager' },
      { label: '提示', details: 'vTooltip' }
    ]
  },
  {
    id: 'third-party',
    title: '第三方扩展',
    items: [
      { label: 'ECharts 图表', details: 'vEchart / VEchart' },
      { label: 'Signals 状态管理', details: 'signal / computed / effect' }
    ]
  },
  {
    id: 'theme',
    title: '主题',
    items: [{ label: '主题切换', details: 'light / dark / system / compact / raw-primary' }]
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
      const firstReadyIndex = category.items.findIndex(
        (item) => item.status !== 'planned' && !item.hidden
      );
      return {
        categoryId: category.id,
        label: category.title,
        path: buildComponentItemPath(category.id, firstReadyIndex >= 0 ? firstReadyIndex : 0)
      };
    })
  ];
}

const docsRouteLoaders = Object.freeze({
  'guides:0': () => import('./guide-docs.js').then((m) => m.GuideOverviewPage()),
  'guides:1': () => import('./guide-docs.js').then((m) => m.GuideInstallationPage()),
  'guides:2': () => import('./html-native-docs.js').then((m) => m.HtmlNativeDocumentationPage()),
  'guides:3': () =>
    import('./component-definition-docs.js').then((m) => m.ComponentDefinitionDocumentationPage()),
  'guides:4': () => import('./i18n-docs.js').then((m) => m.I18nDocumentationPage()),
  'guides:5': () => import('./state-node-docs.js').then((m) => m.StateNodeDocumentationPage()),
  'guides:6': () => import('./ssr-docs.js').then((m) => m.SsrDocumentationPage()),
  'general:0': () => import('./button-docs.js').then((m) => m.ButtonDocumentationPage()),
  'general:1': () => import('./button-group-docs.js').then((m) => m.ButtonGroupDocumentationPage()),
  'general:2': () => import('./float-button-docs.js').then((m) => m.FloatButtonDocumentationPage()),
  'general:3': () => import('./icons-docs.js').then((m) => m.IconsDocumentationPage()),
  'general:4': () => import('./svg-docs.js').then((m) => m.SvgDocumentationPage()),
  'effects:0': () => import('./effects-docs.js').then((m) => m.GlowButtonDocumentationPage()),
  'layout:0': () => import('./layout-docs.js').then((m) => m.DividerDocumentationPage()),
  'layout:1': () => import('./layout-docs.js').then((m) => m.FlexDocumentationPage()),
  'layout:2': () => import('./layout-docs.js').then((m) => m.GridDocumentationPage()),
  'layout:3': () => import('./layout-docs.js').then((m) => m.BodyDocumentationPage()),
  'layout:4': () => import('./layout-docs.js').then((m) => m.SpacerDocumentationPage()),
  'layout:5': () => import('./layout-docs.js').then((m) => m.PopupDocumentationPage()),
  'layout:6': () => import('./layout-docs.js').then((m) => m.TemplateDocumentationPage()),
  'layout:7': () => import('./layout-docs.js').then((m) => m.MobileDocumentationPage()),
  'layout:8': () => import('./layout-docs.js').then((m) => m.SplitPanelDocumentationPage()),
  'navigation:0': () => import('./navigation-docs.js').then((m) => m.AnchorDocumentationPage()),
  'navigation:1': () => import('./navigation-docs.js').then((m) => m.BreadcrumbDocumentationPage()),
  'navigation:3': () => import('./navigation-docs.js').then((m) => m.MenuDocumentationPage()),
  'navigation:5': () => import('./navigation-docs.js').then((m) => m.StepsDocumentationPage()),
  'navigation:6': () => import('./navigation-docs.js').then((m) => m.TabsDocumentationPage()),
  'navigation:7': () => import('./navigation-docs.js').then((m) => m.RouterDocumentationPage()),
  'navigation:8': () =>
    import('./navigation-docs.js').then((m) => m.RouterViewsDocumentationPage()),
  'navigation:9': () => import('./navigation-docs.js').then((m) => m.NavbarDocumentationPage()),
  'feedback:0': () => import('./feedback-docs.js').then((m) => m.MessageDocumentationPage()),
  'feedback:2': () => import('./feedback-docs.js').then((m) => m.TooltipDocumentationPage()),
  'form:0': () => import('./form-docs.js').then((m) => m.FormDocumentationPage()),
  'form:7': () => import('./form-docs.js').then((m) => m.FieldDocumentationPage()),
  'form:4': () => import('./radio-docs.js').then((m) => m.RadioDocumentationPage()),
  'form:12': () => import('./color-picker-docs.js').then((m) => m.ColorPickerDocumentationPage()),
  'form:13': () => import('./form-controls-docs.js').then((m) => m.SliderDocumentationPage()),
  'form:14': () => import('./form-controls-docs.js').then((m) => m.CascaderDocumentationPage()),
  'form:15': () => import('./form-controls-docs.js').then((m) => m.TagsInputDocumentationPage()),
  'form:16': () => import('./form-controls-docs.js').then((m) => m.AutocompleteDocumentationPage()),
  'data-display:0': () => import('./data-display-docs.js').then((m) => m.AvatarDocumentationPage()),
  'data-display:1': () => import('./data-display-docs.js').then((m) => m.BadgeDocumentationPage()),
  'data-display:2': () => import('./data-display-docs.js').then((m) => m.DetailDocumentationPage()),
  'data-display:4': () => import('./data-display-docs.js').then((m) => m.TableDocumentationPage()),
  'data-display:5': () => import('./data-display-docs.js').then((m) => m.TreeDocumentationPage()),
  'data-display:7': () =>
    import('./data-display-docs.js').then((m) => m.ProgressDocumentationPage()),
  'data-display:8': () => import('./data-display-docs.js').then((m) => m.ScrollDocumentationPage()),
  'data-display:9': () =>
    import('./data-display-docs.js').then((m) => m.CarouselDocumentationPage()),
  'third-party:0': () => import('./echarts-docs.js').then((m) => m.EchartsDocumentationPage()),
  'third-party:1': () => import('./signals-docs.js').then((m) => m.SignalsDocumentationPage()),
  'theme:0': () => import('./theme-docs.js').then((m) => m.ThemeDemonstrationPage())
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
    category.items.forEach((item, itemIndex) => {
      routerInstance.route(buildComponentItemPath(category.id, itemIndex), {
        title: item.label,
        view: () => createComponentItemView(category, item, itemIndex, context)
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
        (item, itemIndex) =>
          !item.hidden && buildComponentItemPath(category.id, itemIndex) === currentPath
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
        .map((item, itemIndex) => ({
          id: buildComponentItemPath(category.id, itemIndex),
          label: item.label
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
          intro.p('按 docs/components.md 的分组顺序整理。');
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
          const firstReadyIndex = category.items.findIndex(
            (item) => item.status !== 'planned' && !item.hidden
          );
          const path = buildComponentItemPath(
            category.id,
            firstReadyIndex >= 0 ? firstReadyIndex : 0
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
            path: '/components/guides/2',
            details: 'div / button / input / output'
          },
          {
            label: '组件',
            path: '/components/guides/3',
            details: 'A 薄工厂 / B 对象组件'
          },
          { label: '国际化', path: '/components/guides/4', details: 'I18n / createI18n / .s()' },
          { label: '状态节点', path: '/components/guides/5', details: 'vStateNode' },
          {
            label: '服务端渲染',
            path: '/components/guides/6',
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

function createComponentItemView(category, item, itemIndex, context) {
  const loadDocsView = docsRouteLoaders[`${category.id}:${itemIndex}`];

  if (loadDocsView) {
    return loadDocsView();
  }

  return import('./detail-demos.js').then((module) => {
    const detail = module.getComponentDetail(category.id, itemIndex, item);
    return createDetailItemView(category, item, itemIndex, context, detail);
  });
}

function createDetailItemView(category, item, itemIndex, context, detail) {
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
    view.attr('data-component-route-item', `${category.id}:${itemIndex}`);

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
        meta.code(buildComponentItemPath(category.id, itemIndex));
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

function buildComponentItemPath(categoryId, itemIndex) {
  return `/components/${categoryId}/${itemIndex}`;
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
