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
  DetailDocumentationPage,
  TableDocumentationPage,
  TreeDocumentationPage
} from './data-display-docs.js';
import { MessageDocumentationPage } from './feedback-docs.js';
import { FieldDocumentationPage, FormDocumentationPage } from './form-docs.js';
import { EchartsDocumentationPage } from './echarts-docs.js';
import { IconsDocumentationPage } from './icons-docs.js';
import {
  AnchorDocumentationPage,
  BreadcrumbDocumentationPage,
  MenuDocumentationPage,
  NavbarDocumentationPage,
  RouterDocumentationPage,
  RouterViewsDocumentationPage,
  StepsDocumentationPage
} from './navigation-docs.js';
import {
  BodyDocumentationPage,
  DividerDocumentationPage,
  FlexDocumentationPage,
  GridDocumentationPage,
  PopupDocumentationPage,
  TemplateDocumentationPage,
  SpacerDocumentationPage
} from './layout-docs.js';
import { getComponentDetail } from './detail-demos.js';

const componentMenuSections = [
  {
    id: 'general',
    title: '通用',
    items: [
      { label: '按钮', details: 'vButton' },
      { label: '按钮组', details: 'vButtons', status: 'planned' },
      { label: '悬浮按钮', details: 'vFloatButton', status: 'planned' },
      { label: '图标', details: 'SearchOutlined / UploadOutlined' }
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
      { label: '标签页', details: 'vRouterViews' },
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
      { label: '文件上传', details: 'vUpload' }
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
      { label: '图表', details: 'vChart' }
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
      { label: '消息管理器', details: 'vMessageManager' }
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
    { categoryId: 'intro', label: '说明', path: '/components' },
    ...componentMenuSections.map((category) => {
      const firstReadyIndex = category.items.findIndex((item) => item.status !== 'planned');
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
  6: TemplateDocumentationPage
});

const feedbackDocumentationPages = Object.freeze({
  0: MessageDocumentationPage
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
  5: TreeDocumentationPage
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
      title: '说明',
      view: () => createComponentsIntroView()
    });
    r.route('/components/intro', {
      title: '说明',
      view: () => createComponentsIntroView()
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
        entry.categoryId === 'intro'
          ? currentPath === '/components' || currentPath === '/components/intro'
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

function createComponentsIntroView() {
  return section((view) => {
    view.className('components-route-page components-route-page--intro');
    view.h2('说明');
    view.p('左侧菜单按 docs/components.md 的内容整理，右侧显示实时演示和源码。');
    view.p('点击菜单项后可以直接查看对应组件的详细页面。');

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
  });
}

function createComponentItemView(category, item, itemIndex, context) {
  if (category.id === 'third-party' && itemIndex === 0) {
    return EchartsDocumentationPage().render();
  }

  if (category.id === 'general' && itemIndex === 0) {
    return ButtonDocumentationPage().render();
  }

  if (category.id === 'general' && itemIndex === 3) {
    return IconsDocumentationPage().render();
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
