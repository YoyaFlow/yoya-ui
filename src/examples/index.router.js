import {
  createI18n,
  router,
  section,
  toast,
  vContainer,
  vMessageContainer,
  vMenu,
  vMenuGroup,
  vMenuItem,
  vNavbar,
  vRouterViews
} from '../index.js';
import '../yoya.ui.css';
import { ComponentSource } from './component-source.js';
import { applyDemoStyles } from './demo-styles.js';
import { ButtonDocumentationPage } from './button-docs.js';
import {
  AvatarDocumentationPage,
  BadgeDocumentationPage,
  CarouselDocumentationPage,
  DetailDocumentationPage,
  ProgressDocumentationPage,
  ScrollDocumentationPage,
  TableDocumentationPage,
  TreeDocumentationPage
} from './data-display-docs.js';
import { MessageDocumentationPage, TooltipDocumentationPage } from './feedback-docs.js';
import { FieldDocumentationPage, FormDocumentationPage } from './form-docs.js';
import { ComponentDefinitionDocumentationPage } from './component-definition-docs.js';
import { EchartsDocumentationPage } from './echarts-docs.js';
import { IconsDocumentationPage } from './icons-docs.js';
import { I18nDocumentationPage } from './i18n-docs.js';
import { StateNodeDocumentationPage } from './state-node-docs.js';
import { SvgDocumentationPage } from './svg-docs.js';
import {
  GuideAdvantagesPage,
  GuideDesignPhilosophyPage,
  GuideInstallationPage,
  GuideOverviewPage,
  GuidePositioningPage
} from './guide-docs.js';
import {
  AnchorDocumentationPage,
  BreadcrumbDocumentationPage,
  MenuDocumentationPage,
  NavbarDocumentationPage,
  RouterDocumentationPage,
  RouterViewsDocumentationPage,
  StepsDocumentationPage,
  TabsDocumentationPage
} from './navigation-docs.js';
import {
  BodyDocumentationPage,
  DividerDocumentationPage,
  FlexDocumentationPage,
  GridDocumentationPage,
  MobileDocumentationPage,
  PopupDocumentationPage,
  TemplateDocumentationPage,
  SpacerDocumentationPage
} from './layout-docs.js';
import { getComponentDetail } from './detail-demos.js';

const componentMenuSections = [
  {
    id: 'guides',
    title: '开发指南',
    items: [
      { label: '概述', details: 'Overview' },
      { label: '定位', details: 'Positioning' },
      { label: '优势', details: 'Advantages' },
      { label: '设计理念', details: 'Design Philosophy' },
      { label: '安装方式', details: 'Installation' },
      { label: '定义组件', details: 'function + render()' },
      { label: '国际化', details: 'I18n / createI18n / i18nText' },
      { label: '状态节点', details: 'vStateNode' }
    ]
  },
  {
    id: 'general',
    title: '通用',
    items: [
      { label: '按钮', details: 'vButton' },
      { label: '按钮组', details: 'vButtons', status: 'planned' },
      { label: '悬浮按钮', details: 'vFloatButton', status: 'planned' },
      { label: '图标', details: 'SearchOutlined / UploadOutlined' },
      { label: 'SVG 动画', details: 'requestAnimationFrame / stroke-dashoffset' }
    ]
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
      { label: '分隔面板', details: 'Splitter', status: 'planned' }
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
      { label: '单选框', details: 'vRadio', status: 'planned' },
      { label: '文本域', details: 'vTextarea' },
      { label: '开关', details: 'vSwitch' },
      { label: '字段', details: 'vField' },
      { label: '日期时间', details: 'vTimer' },
      { label: '日期范围', details: 'vTimerRange' },
      { label: '文件上传', details: 'vUpload' },
      { label: '评分', details: 'vRate' }
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
      { label: '图表', details: 'vChart' },
      { label: '进度条', details: 'vProgress' },
      { label: '滚动组件', details: 'vScroll' },
      { label: '走马灯', details: 'vCarousel' }
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
    items: [{ label: 'ECharts 图表', details: 'vEchart / VEchart' }]
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

const layoutDocumentationPages = Object.freeze({
  0: DividerDocumentationPage,
  1: FlexDocumentationPage,
  2: GridDocumentationPage,
  3: BodyDocumentationPage,
  4: SpacerDocumentationPage,
  5: PopupDocumentationPage,
  6: TemplateDocumentationPage,
  7: MobileDocumentationPage
});

const feedbackDocumentationPages = Object.freeze({
  0: MessageDocumentationPage,
  2: TooltipDocumentationPage
});

const formDocumentationPages = Object.freeze({
  0: FormDocumentationPage,
  7: FieldDocumentationPage
});

const dataDisplayDocumentationPages = Object.freeze({
  0: AvatarDocumentationPage,
  1: BadgeDocumentationPage,
  2: DetailDocumentationPage,
  4: TableDocumentationPage,
  5: TreeDocumentationPage,
  8: ProgressDocumentationPage,
  9: ScrollDocumentationPage,
  10: CarouselDocumentationPage
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
  const menuItemRefs = [];
  const groupRefs = [];
  const topNavItemRefs = [];
  const routerViews = vRouterViews(appRouter, { lockTitle: true, title: '组件目录' });

  const syncSelection = () => {
    const currentPath = appRouter.currentPath();

    menuItemRefs.forEach(({ node, path, categoryId }) => {
      node.active(path === currentPath);
      node.attr('data-active-path', path === currentPath ? 'true' : null);

      const group = groupRefs.find((item) => item.categoryId === categoryId);
      if (group) {
        const active =
          currentPath === `/components/${categoryId}` ||
          currentPath.startsWith(`/components/${categoryId}/`);
        group.node.attr('data-active', active ? 'true' : null);
      }
    });

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

  const menu = vMenu((nav) => {
    nav.className('components-menu-list');
    nav.style('minWidth', '0');
    nav.style('padding', '0');
    nav.style('width', '100%');
    nav.style('gap', '4px');

    componentMenuSections.forEach((category, categoryIndex) => {
      const group = vMenuGroup((groupNode) => {
        groupNode.label(category.title);
        groupNode.attr('data-component-category', category.id);
        groupNode.style('gap', '4px');

        category.items.forEach((item, itemIndex) => {
          if (item.hidden) {
            return;
          }

          const status = item.status === 'planned' ? 'planned' : 'ready';
          const path = buildComponentItemPath(category.id, itemIndex);
          const menuItem = vMenuItem((entryView) => {
            entryView.attr({
              'data-component-category': category.id,
              'data-component-menu-index': `${categoryIndex}:${itemIndex}`,
              'data-component-status': status,
              'data-component-path': path
            });
            entryView.text(item.label);
            if (item.status === 'planned') {
              entryView.shortcut('待开发');
            } else if (item.details) {
              entryView.shortcut(item.details);
            }
            entryView.on('click', () => appRouter.navigate(path));
          });

          groupNode.child(menuItem);
          menuItemRefs.push({ categoryId: category.id, node: menuItem, path });
        });
      });

      groupRefs.push({ categoryId: category.id, node: group });
      nav.child(group);
    });
  });

  const workspace = vContainer((body) => {
    body.className('components-workspace');
    body.fill();
    body.style('gap', '16px');
    body.direction('row');

    body.vAside((sidebar) => {
      sidebar.className('components-menu');
      sidebar.attr('data-components-menu', 'true');
      sidebar.attr('aria-label', '组件菜单');
      sidebar.scrollable();

      sidebar.div((intro) => {
        intro.className('components-menu-intro');
        intro.h2('组件菜单');
        intro.p('按 docs/components.md 的分组顺序整理。');
      });

      sidebar.child(menu);
    });

    body.vMain((panel) => {
      panel.className('components-router-panel');
      panel.attr('data-components-router-views', 'true');
      panel.scrollable();
      panel.child(routerViews);
    });
  });

  const root = vContainer((view) => {
    view.className('components-demo-shell');
    view.attr('data-components-demo-shell', 'true');
    view.viewport();
    view.child(topNav);
    view.child(workspace);
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
      'yoya-ui 是面向后端与全栈开发者的轻量原生 JS UI 基础库，用 ViewNode DSL 构建可嵌入、可组合、低依赖的 Web UI。'
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
              '面向后端与全栈开发者的轻量原生JS基础库，同时提供常用UI组件库。',
              '回归本质，使用浏览器原生环境提供超越VUE和ReactJS的开发体验。',
              'AI生成组件直接可使用，避免环境问题，返工率极低。'
            ]
          },
          {
            title: '优势',
            points: [
              '无复杂框架运行时依赖，直接构建真实 DOM。适合长期运维项目，如客户内部环境部署。',
              '支持局部挂载、单页应用。',
              '组件、布局、路由、i18n、图表按模块扩展。'
            ]
          },
          {
            title: '设计理念',
            points: [
              '浏览器原生优先，用声明式组件组织视图。',
              '小核加扩展，组件边界清晰，能力按需引入。',
              '后端友好：可嵌入、可组合、可阅读、可复制。'
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
          { label: '定义组件', path: '/components/guides/5', details: 'function + render()' },
          { label: '国际化', path: '/components/guides/6', details: 'I18n / createI18n / .s()' },
          { label: '状态节点', path: '/components/guides/7', details: 'vStateNode' }
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
  if (category.id === 'guides' && itemIndex === 0) {
    return GuideOverviewPage().render();
  }

  if (category.id === 'guides' && itemIndex === 1) {
    return GuidePositioningPage().render();
  }

  if (category.id === 'guides' && itemIndex === 2) {
    return GuideAdvantagesPage().render();
  }

  if (category.id === 'guides' && itemIndex === 3) {
    return GuideDesignPhilosophyPage().render();
  }

  if (category.id === 'guides' && itemIndex === 4) {
    return GuideInstallationPage().render();
  }

  if (category.id === 'guides' && itemIndex === 5) {
    return ComponentDefinitionDocumentationPage().render();
  }

  if (category.id === 'guides' && itemIndex === 6) {
    return I18nDocumentationPage().render();
  }

  if (category.id === 'guides' && itemIndex === 7) {
    return StateNodeDocumentationPage().render();
  }

  if (category.id === 'third-party' && itemIndex === 0) {
    return EchartsDocumentationPage().render();
  }

  if (category.id === 'general' && itemIndex === 0) {
    return ButtonDocumentationPage().render();
  }

  if (category.id === 'general' && itemIndex === 3) {
    return IconsDocumentationPage().render();
  }

  if (category.id === 'general' && itemIndex === 4) {
    return SvgDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 3) {
    return MenuDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 1) {
    return BreadcrumbDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 0) {
    return AnchorDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 7) {
    return RouterDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 8) {
    return RouterViewsDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 5) {
    return StepsDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 6) {
    return TabsDocumentationPage().render();
  }

  if (category.id === 'navigation' && itemIndex === 9) {
    return NavbarDocumentationPage().render();
  }

  if (category.id === 'layout' && layoutDocumentationPages[itemIndex]) {
    return layoutDocumentationPages[itemIndex]().render();
  }

  if (category.id === 'feedback' && feedbackDocumentationPages[itemIndex]) {
    return feedbackDocumentationPages[itemIndex]().render();
  }

  if (category.id === 'form' && formDocumentationPages[itemIndex]) {
    return formDocumentationPages[itemIndex]().render();
  }

  if (category.id === 'data-display' && dataDisplayDocumentationPages[itemIndex]) {
    return dataDisplayDocumentationPages[itemIndex]().render();
  }

  const detail = getComponentDetail(category.id, itemIndex, item);
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
