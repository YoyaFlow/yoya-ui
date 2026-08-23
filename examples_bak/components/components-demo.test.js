import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VMessageManager, router } from '../../src/index.js';
import { componentSource } from './component-source.js';
import {
  componentDemoCategories,
  renderComponentsExample as renderComponentsExampleBase
} from './components-demo.js';
import { DemoCategoryPage } from './docs/demo-category-page.js';
import { DemoComponentPage } from './docs/demo-component-page.js';
import { DemoHomePage } from './docs/demo-home.js';
import { DemoShell } from './docs/demo-shell.js';
import {
  componentDemoRegistry,
  filterComponentEntries,
  findComponentEntry
} from './docs/demo-registry.js';
import { AuditCard, DeploymentTaskCard, LocaleSwitchCard } from './demos/actions.js';
import { DynamicModuleCard } from './demos/async.js';
import {
  CodeBlockCard,
  ChartAdapterCard,
  ServiceDetailCard,
  PagedServiceTableCard,
  ServiceTableCard,
  SqlSnippetCard
} from './demos/data-display.js';
import { LocalMessageManagerCard } from './demos/feedback.js';
import {
  OwnerFieldCard,
  ScheduleTimerCard,
  ServiceFormCard,
  TimerRangeCard
} from './demos/form.js';
import { BodyPageCard } from './demos/layout.js';
import { CommandMenuCard, OverlayMenuCard, SidebarCard, SubMenuCard } from './demos/navigation.js';
import {
  DeclarativeRouterCard,
  RouterNavigationCard,
  RouterViewsEditorCard
} from './demos/router.js';
import {
  DemoApiTable,
  DemoBoundaryList,
  DemoMetricCard,
  DemoSearchBox,
  DemoSection,
  DemoTagList
} from './docs/demo-ui.js';

const demoComponents = [
  DeploymentTaskCard,
  AuditCard,
  LocaleSwitchCard,
  LocalMessageManagerCard,
  CommandMenuCard,
  SubMenuCard,
  OverlayMenuCard,
  SidebarCard,
  RouterNavigationCard,
  DeclarativeRouterCard,
  RouterViewsEditorCard,
  DynamicModuleCard,
  BodyPageCard,
  ServiceDetailCard,
  SqlSnippetCard,
  CodeBlockCard,
  ServiceTableCard,
  PagedServiceTableCard,
  ChartAdapterCard,
  ServiceFormCard,
  OwnerFieldCard,
  ScheduleTimerCard,
  TimerRangeCard
];

const mountedRoots = [];
const existsInComponents = (path) => existsSync(new URL(path, import.meta.url));

function renderComponentsExample(target) {
  const root = renderComponentsExampleBase(target);
  mountedRoots.push(root);
  return root;
}

function openRoute(path) {
  const item = document.querySelector(`[data-components-menu-item="${path}"]`);
  expect(item).not.toBeNull();
  item.click();
  return item;
}

function getRouteTitles() {
  return Array.from(
    document.querySelectorAll('.yoya-vrouter-views-title .yoya-vrouter-views-label'),
    (label) => label.textContent
  );
}

describe('components example', () => {
  it('describes every demo entry through the registry boundary', () => {
    const ids = new Set();

    expect(componentDemoRegistry.categories).toHaveLength(8);
    expect(componentDemoRegistry.components.length).toBeGreaterThan(0);
    expect(componentDemoRegistry.demos).toHaveLength(23);
    expect(componentDemoRegistry.sources).toHaveLength(8);

    componentDemoRegistry.categories.forEach((category) => {
      expect(category.sourceDir).toMatch(/^examples\/components\/demos\//);
      expect(category.boundary.owns.length).toBeGreaterThan(0);
      expect(category.boundary.doesNotOwn.length).toBeGreaterThan(0);
    });

    componentDemoRegistry.demos.forEach((entry) => {
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      expect(entry.categoryId).toBeTypeOf('string');
      expect(entry.sourceFile).toMatch(/^examples\/components\/demos\//);
      expect(entry.imports.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.api)).toBe(true);
      expect(entry.behavior.length).toBeGreaterThan(0);
      expect(entry.boundaries.owns.length).toBeGreaterThan(0);
      expect(entry.boundaries.doesNotOwn.length).toBeGreaterThan(0);
    });

    expect(findComponentEntry('button')).not.toBeNull();
    expect(filterComponentEntries('按钮').length).toBeGreaterThan(0);
    expect(filterComponentEntries('布局组件').map((entry) => entry.id)).toEqual(['body']);
    expect(filterComponentEntries('examples/components/demos/form')).toHaveLength(4);
  });

  it('keeps the demo shell and page outlet separated from the content pages', () => {
    renderComponentsExample('#app');

    expect(document.querySelector('[data-demo-shell]')).not.toBeNull();
    expect(document.querySelector('[data-demo-sidebar]')).not.toBeNull();
    expect(document.querySelector('[data-demo-outlet]')).not.toBeNull();
  });

  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    mountedRoots
      .splice(0)
      .reverse()
      .forEach((root) => root.destroy?.());
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '/');
  });

  it('renders a menu-driven homepage shell with router views', () => {
    renderComponentsExample('#app');

    expect(document.querySelector('[data-components-menu]')).not.toBeNull();
    expect(document.querySelector('[data-components-menu-item="/"]')).not.toBeNull();
    expect(document.querySelector('.yoya-vrouter-views')).not.toBeNull();
    expect(document.querySelectorAll('[data-components-menu-item]')).toHaveLength(
      componentDemoCategories.length + componentDemoRegistry.demos.length + 1
    );
    expect(getRouteTitles()).toEqual(['首页']);
    expect(document.querySelector('.components-home-header h2').textContent).toBe('组件目录');
  });

  it('keeps demo files aligned with source domain directories', () => {
    [
      './demos/actions.js',
      './demos/async.js',
      './demos/data-display.js',
      './demos/feedback.js',
      './demos/form.js',
      './demos/layout.js',
      './demos/navigation.js',
      './demos/router.js'
    ].forEach((path) => {
      expect(existsInComponents(path)).toBe(true);
    });

    [
      './demos/actions-feedback.js',
      './demos/async-dynamic.js',
      './demos/forms-datetime.js',
      './demos/layout-page.js',
      './demos/routing.js'
    ].forEach((path) => {
      expect(existsInComponents(path)).toBe(false);
    });
  });

  it('keeps demo docs modules split by responsibility', () => {
    [
      './docs/demo-app.js',
      './docs/demo-category-page.js',
      './docs/demo-component-page.js',
      './docs/demo-home.js',
      './docs/demo-metadata.js',
      './docs/demo-registry.js',
      './docs/demo-shell.js',
      './docs/demo-ui.js'
    ].forEach((path) => {
      expect(existsInComponents(path)).toBe(true);
    });
  });

  it('generates displayed source directly from the component function', () => {
    function SampleCard() {
      return {
        render() {
          return 'sample';
        }
      };
    }

    expect(componentSource(SampleCard, ['vCard'])).toBe(`import { vCard } from 'yoya-ui';

export function SampleCard() {
  return {
    render() {
      return 'sample';
    }
  };
}`);
  });

  it('encapsulates every live demo as an object component', () => {
    const context = {
      locale: { text: (key) => key },
      toast: { error() {}, info() {}, success() {}, warning() {} }
    };

    expect(componentDemoCategories).toHaveLength(8);
    expect(componentDemoCategories.flatMap((category) => category.demos)).toHaveLength(23);
    demoComponents.forEach((Component) => {
      const instance = Component(context);
      expect(typeof instance.render).toBe('function');
      expect(Component.toString()).toMatch(
        new RegExp(`function ${Component.name}\\([^)]*\\)\\s*{[\\s\\S]*return\\s*{\\s*render\\(\\)`)
      );
    });
    renderComponentsExample('#app');
    expect(document.querySelector('[data-demo-shell]')).not.toBeNull();
    expect(document.querySelector('[data-components-menu]')).not.toBeNull();
    expect(document.querySelector('.yoya-vrouter-views')).not.toBeNull();
  });

  it('exposes docs pages and reusable docs UI as object components', () => {
    const navigate = vi.fn();
    const context = {
      locale: { text: (key) => key },
      navigate,
      toast: { error() {}, info() {}, success() {}, warning() {} }
    };
    const routerInstance = router();

    const component = componentDemoRegistry.demos[0];
    const category = componentDemoRegistry.categories[0];
    const nodes = [
      DemoHomePage({ navigate, registry: componentDemoRegistry, searchState: { query: '' } }),
      DemoCategoryPage({ category, context, navigate }),
      DemoComponentPage({ context, entry: component, navigate }),
      DemoShell({ registry: componentDemoRegistry, routerInstance }),
      DemoSection({ title: '示例' }),
      DemoMetricCard({ label: '组件', value: 1 }),
      DemoSearchBox({ onInput() {}, value: '' }),
      DemoTagList({ tags: ['a', 'b'] }),
      DemoBoundaryList({ boundaries: { doesNotOwn: ['x'], owns: ['y'], related: ['z'] } }),
      DemoApiTable({ rows: [] })
    ];

    nodes.forEach((node) => {
      expect(typeof node.render).toBe('function');
    });
  });

  it('groups demos into broad category sections and includes vTimerRange', () => {
    renderComponentsExample('#app');

    openRoute('/form');

    const categoryPage = document.querySelector('[data-demo-category="form"]');
    expect(categoryPage).not.toBeNull();
    const categoryHeading = categoryPage.querySelector('.component-category-header h2');
    expect(getRouteTitles()).toEqual(['首页', '表单控件']);
    expect(categoryHeading.textContent).toBe('表单控件');
    openRoute('/form/timer-range');
    const detailPage = document.querySelector('[data-demo-component-page="timer-range"]');
    expect(detailPage.querySelector('.yoya-vtimer-range')).not.toBeNull();
    expect(detailPage.textContent).toContain('日期范围');
  });

  it('separates category overviews from full demo documentation', () => {
    renderComponentsExample('#app');

    openRoute('/form');
    const categoryPage = document.querySelector('[data-demo-category="form"]');
    expect(categoryPage.querySelector('h2').textContent).toBe('表单控件');
    expect(categoryPage.textContent).toContain('负责');
    expect(categoryPage.textContent).toContain('不负责');
    expect(categoryPage.textContent).toContain('演示场景');
    expect(categoryPage.querySelectorAll('[data-source-example]')).toHaveLength(0);
    expect(categoryPage.querySelectorAll('[data-demo-scenario-card]')).toHaveLength(4);

    categoryPage.querySelector('[data-demo-scenario-link="timer-range"]').click();
    const detailPage = document.querySelector('[data-demo-component-page="timer-range"]');
    expect(detailPage.querySelector('[data-demo-breadcrumb]')).not.toBeNull();
    expect(detailPage.querySelector('[data-demo-live]')).not.toBeNull();
    expect(detailPage.querySelector('[data-source-example]')).not.toBeNull();
    expect(detailPage.querySelector('[data-demo-api-table]')).not.toBeNull();
  });

  it('labels directory metrics by their documentation object', () => {
    renderComponentsExample('#app');

    const home = document.querySelector('[data-demo-home]');
    expect(home.textContent).toContain('组件目录');
    expect(home.textContent).toContain('演示场景');
    expect(home.textContent).toContain('源码文件');
    expect(home.querySelector('[data-demo-source-index]')).not.toBeNull();

    const search = home.querySelector('[data-demo-search]');
    search.value = '布局组件';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(home.querySelectorAll('[data-demo-scenario-card]')).toHaveLength(1);
    expect(home.textContent).toContain('布局组件');
  });

  it('demonstrates vBody with a responsive page grid and generated component source', () => {
    renderComponentsExample('#app');

    openRoute('/layout/body');
    const layout = document.querySelector('[data-demo-component-page="body"]');
    const source = layout.querySelector('[data-source-example]').textContent;

    expect(layout.querySelector('.yoya-vbody')).not.toBeNull();
    expect(layout.querySelector('.yoya-vbody-content')).not.toBeNull();
    expect(layout.querySelector('.yoya-responsive-grid')).not.toBeNull();
    expect(source).toContain('body.vBody');
    expect(source).toContain('page.responsiveGrid');
  });

  it('demonstrates dynamic loading failure, retry, and generated component source', async () => {
    renderComponentsExample('#app');

    openRoute('/async/dynamic-loader');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const getDynamic = () => document.querySelector('[data-demo-component-page="dynamic-loader"]');
    const dynamic = getDynamic();
    const source = dynamic.querySelector('[data-source-example]').textContent;
    const loader = dynamic.querySelector('.yoya-vdynamic-loader');

    expect(loader.dataset.loaderState).toBe('pending');
    expect(loader.textContent).toContain('等待加载');
    dynamic.querySelector('#dynamic-load').click();
    await vi.waitFor(() => {
      const currentLoader = getDynamic()?.querySelector('.yoya-vdynamic-loader');
      expect(currentLoader?.dataset.loaderState).toBe('error');
      expect(currentLoader?.textContent ?? '').toContain('加载失败：模拟网络失败');
    });
    getDynamic().querySelector('#dynamic-retry').click();
    await vi.waitFor(() => {
      const currentLoader = getDynamic()?.querySelector('.yoya-vdynamic-loader');
      expect(currentLoader?.dataset.loaderState).toBe('loaded');
      expect(currentLoader?.textContent ?? '').toContain('审计模块已就绪');
    });
    expect(source).toContain('vDynamicLoader');
    expect(source).toContain('moduleLoader.retry');
  });

  it('demonstrates CodeBlock language, copy label, dynamic content, and generated source', () => {
    renderComponentsExample('#app');

    openRoute('/data-display/code-block');
    const dataDisplay = document.querySelector('[data-demo-component-page="code-block"]');
    const block = dataDisplay.querySelector('.yoya-code-block');
    const source = Array.from(
      dataDisplay.querySelectorAll('[data-source-example]'),
      (panel) => panel.textContent
    ).join('\n');

    expect(block.dataset.language).toBe('log');
    expect(block.querySelector('.yoya-vcode-copy').textContent).toBe('复制日志');
    expect(block.querySelector('.yoya-vcode-content').textContent).toContain('request_id=api-42');
    document.querySelector('#code-block-update').click();
    expect(block.querySelector('.yoya-vcode-content').textContent).toContain('status=recovered');
    expect(source).toContain('codeBlock');
    expect(source).toContain('logBlock.content');
  });

  it('demonstrates a library-agnostic chart adapter with generated source', () => {
    renderComponentsExample('#app');

    openRoute('/data-display/chart');
    const dataDisplay = document.querySelector('[data-demo-component-page="chart"]');
    const liveCard = dataDisplay.querySelector('[data-demo-live] .yoya-vcard');
    const source = dataDisplay.querySelector('[data-source-example]').textContent;

    expect(liveCard.querySelector('.yoya-vchart')).not.toBeNull();
    expect(liveCard.querySelectorAll('[data-chart-bar]')).toHaveLength(3);
    liveCard.querySelector('#chart-adapter-update').click();
    expect(liveCard.querySelectorAll('[data-chart-bar]')).toHaveLength(4);
    expect(liveCard.querySelector('[data-chart-bar="3"]').textContent).toBe('84');
    liveCard.querySelector('#chart-adapter-resize').click();
    expect(liveCard.querySelector('.yoya-vchart').style.height).toBe('240px');
    expect(source).toContain('vChart');
    expect(source).toContain('update(instance, context)');
  });

  it('demonstrates vPagination driving a paged table from the component function', () => {
    renderComponentsExample('#app');

    openRoute('/data-display/pagination');
    const dataDisplay = document.querySelector('[data-demo-component-page="pagination"]');
    const liveCard = dataDisplay.querySelector('[data-demo-card="paged-service-table"]');
    const source = dataDisplay.querySelector('[data-source-example]').textContent;

    expect(liveCard.querySelector('.yoya-vtable')).not.toBeNull();
    expect(liveCard.querySelector('.yoya-vpagination')).not.toBeNull();
    expect(liveCard.querySelectorAll('[data-row-index]')).toHaveLength(4);
    expect(liveCard.querySelector('.yoya-vpagination-summary').textContent).toContain('共 12 条');
    expect(source).toContain('vPagination');
    expect(source).toContain('vTable');

    liveCard.querySelector('[data-action="next"]').click();
    expect(liveCard.querySelector('.yoya-vpagination-summary').textContent).toContain(
      '第 2 / 3 页'
    );
    expect(liveCard.querySelectorAll('[data-row-index]')).toHaveLength(4);

    liveCard.querySelector('[data-role="page-size"]').value = '6';
    liveCard
      .querySelector('[data-role="page-size"]')
      .dispatchEvent(new Event('change', { bubbles: true }));
    expect(liveCard.querySelector('.yoya-vpagination-summary').textContent).toContain(
      '第 1 / 2 页'
    );
    expect(liveCard.querySelectorAll('[data-row-index]')).toHaveLength(6);
  });

  it('demonstrates an independent local message manager with generated source', () => {
    const destroyManager = vi.spyOn(VMessageManager.prototype, 'destroy');
    const root = renderComponentsExample('#app');

    openRoute('/feedback/message-manager');
    const feedback = document.querySelector('[data-demo-component-page="message-manager"]');
    const liveCard = feedback.querySelector('[data-demo-live] .yoya-vcard');
    const source = feedback.querySelector('[data-source-example]').textContent;

    expect(liveCard.querySelector('.yoya-vmessage-container')).not.toBeNull();
    expect(liveCard.textContent).not.toContain('局部保存成功');

    liveCard.querySelector('#local-message-success').click();
    expect(liveCard.textContent).toContain('局部保存成功');
    liveCard.querySelector('#local-message-replace').click();
    expect(liveCard.querySelectorAll('.yoya-vmessage')).toHaveLength(1);
    expect(liveCard.textContent).not.toContain('局部保存成功');
    expect(liveCard.textContent).toContain('同 ID 消息已替换');
    liveCard.querySelector('#local-message-clear').click();
    expect(liveCard.querySelectorAll('.yoya-vmessage')).toHaveLength(0);
    expect(source).toContain('vMessageManager');
    expect(source).toContain("id: 'local-status'");

    try {
      root.destroy();
      expect(destroyManager).toHaveBeenCalledTimes(1);
    } finally {
      destroyManager.mockRestore();
    }
  });

  it('demonstrates router links, params, query, 404, and generated component source', () => {
    renderComponentsExample('#app');

    openRoute('/router/router');
    const imperative = document.querySelector('[data-demo-component-page="router"]');
    const live = imperative.querySelector('[data-demo-live]');
    const links = live.querySelectorAll('.yoya-vlink');
    const outlet = live.querySelector('.yoya-vrouter-view');
    const source = imperative.querySelector('[data-source-example]').textContent;

    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    links[1].click();
    expect(outlet.textContent).toContain('用户 42');
    expect(outlet.textContent).toContain('profile');
    expect(links[1].getAttribute('aria-current')).toBe('page');
    links[2].click();
    expect(outlet.textContent).toContain('未找到 /missing');
    expect(source).toContain('nav.vLink');
    expect(source).toContain('stack.vRouterView');
  });

  it('demonstrates declarative vRouter and vRoute with generated component source', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    renderComponentsExample('#app');

    openRoute('/router/declarative-router');
    const declarative = document.querySelector('[data-demo-component-page="declarative-router"]');
    const source = declarative.querySelector('[data-source-example]').textContent;

    expect(declarative.querySelector('.yoya-vrouter-view')).not.toBeNull();
    expect(declarative.textContent).toContain('声明式首页');
    expect(source).toContain('vRouter');
    expect(source).toContain('vRoute');
    expect(addEventListener.mock.calls.filter(([type]) => type === 'hashchange')).toHaveLength(1);
    addEventListener.mockRestore();
  });

  it('demonstrates IDE-style titled router views with generated source', () => {
    renderComponentsExample('#app');

    openRoute('/router/router-views');
    const editor = document.querySelector('[data-demo-component-page="router-views"]');
    const liveCard = editor.querySelector('[data-demo-live] .yoya-vcard');
    const source = editor.querySelector('[data-source-example]').textContent;
    const views = liveCard.querySelector('.yoya-vrouter-views');

    expect(
      views.querySelector(
        '.yoya-vrouter-views-title .yoya-vrouter-views-label[aria-selected="true"]'
      ).textContent
    ).toBe('overview.js');
    expect(views.querySelector('.yoya-vrouter-views-content').textContent).toBe('项目概览内容');
    liveCard.querySelector('.yoya-vlink[href="#/settings"]').click();
    expect(
      views.querySelector(
        '.yoya-vrouter-views-title .yoya-vrouter-views-label[aria-selected="true"]'
      ).textContent
    ).toBe('settings.js');
    expect(views.querySelectorAll('.yoya-vrouter-views-title')).toHaveLength(2);
    expect(views.querySelectorAll('.yoya-vrouter-views-close')).toHaveLength(2);
    expect(views.querySelector('.yoya-vrouter-views-content').textContent).toBe('项目设置内容');
    views.querySelector('[data-router-view-path="/settings"] .yoya-vrouter-views-close').click();
    expect(views.querySelectorAll('.yoya-vrouter-views-title')).toHaveLength(1);
    expect(views.querySelector('.yoya-vrouter-views-content').textContent).toBe('项目概览内容');
    expect(source).toContain('vRouterViews');
    expect(source).toContain("title: 'overview.js'");
  });

  it('demonstrates accessible menu groups and dividers from the component function', () => {
    renderComponentsExample('#app');

    openRoute('/navigation/menu');
    const commandExample = document.querySelector('[data-demo-component-page="menu"]');
    const groups = commandExample.querySelectorAll('.yoya-vmenu-group');
    const divider = commandExample.querySelector('.yoya-vmenu-divider');
    const commandSource = commandExample.querySelector('[data-source-example]').textContent;

    expect(groups).toHaveLength(2);
    groups.forEach((group) => {
      const heading = group.querySelector('.yoya-vmenu-group-label');
      expect(heading.id).not.toBe('');
      expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
    });
    expect(divider.getAttribute('role')).toBe('separator');
    expect(commandSource).toContain('menu.vMenuGroup');
    expect(commandSource).toContain('menu.vMenuDivider');
  });

  it('demonstrates nested submenus from an object component in the navigation category', () => {
    renderComponentsExample('#app');

    openRoute('/navigation/submenu');
    const navigation = document.querySelector('[data-demo-component-page="submenu"]');
    const submenu = navigation.querySelector('.yoya-vsubmenu');
    const navigationSource = Array.from(
      navigation.querySelectorAll('[data-source-example]'),
      (source) => source.textContent
    ).join('\n');

    expect(submenu).not.toBeNull();
    expect(submenu?.querySelector('.yoya-vsubmenu-trigger').getAttribute('aria-expanded')).toBe(
      'false'
    );
    expect(navigationSource).toContain('menu.vSubMenu');
  });

  it('demonstrates a collapsible sidebar with generated component source', () => {
    renderComponentsExample('#app');

    openRoute('/navigation/sidebar');
    const navigation = document.querySelector('[data-demo-component-page="sidebar"]');
    const sidebar = navigation.querySelector('[data-demo-live] .yoya-vsidebar');
    const toggle = sidebar.querySelector('.yoya-vsidebar-toggle');
    const source = Array.from(
      navigation.querySelectorAll('[data-source-example]'),
      (panel) => panel.textContent
    ).join('\n');

    expect(sidebar.getAttribute('aria-label')).toBe('后台主导航');
    expect(sidebar.querySelector('[aria-current="page"]').textContent).toContain('服务概览');
    expect(sidebar.querySelector('.yoya-vmenu-group')).not.toBeNull();
    expect(sidebar.querySelector('.yoya-vsubmenu')).not.toBeNull();
    toggle.click();
    expect(sidebar.dataset.collapsed).toBe('true');
    expect(source).toContain('body.vSidebar');
    expect(source).toContain('menu.vMenuGroup');
    expect(source).toContain('menu.vSubMenu');
  });

  it('renders compound components and interactive feedback', () => {
    const root = renderComponentsExample('#app');

    expect(root.commit()).not.toBeNull();
    expect(
      document.querySelector('.components-home') || document.querySelector('.components-not-found')
    ).not.toBeNull();
    expect(document.querySelectorAll('[data-components-menu-item]')).toHaveLength(
      componentDemoCategories.length + componentDemoRegistry.demos.length + 1
    );
    expect(getRouteTitles()).toEqual(['首页']);
    expect(document.body.textContent).toContain('首页');

    openRoute('/actions/audit');
    const actions = document.querySelector('[data-demo-component-page="audit"]');
    expect(actions.textContent).toContain('危险按钮');
    actions.querySelector('#save-config').click();
    expect(document.body.textContent).toContain('设置已保存');

    openRoute('/actions/locale-switch');
    const localeActions = document.querySelector('[data-demo-component-page="locale-switch"]');
    localeActions.querySelector('#switch-en').click();
    expect(localeActions.querySelector('#switch-en').textContent).toContain('English');

    openRoute('/navigation/menu');
    const navigation = document.querySelector('[data-demo-component-page="menu"]');
    expect(navigation.textContent).toContain('命令菜单');
    navigation.querySelector('#menu-refresh').click();
    expect(document.body.textContent).toContain('菜单触发：刷新状态');
    openRoute('/navigation/dropdown-menu');
    const overlayNavigation = document.querySelector('[data-demo-component-page="dropdown-menu"]');
    overlayNavigation.querySelector('#dropdown-trigger').click();
    expect(document.querySelector('.yoya-vdropdown-menu').dataset.open).toBe('true');
    document.querySelector('#dropdown-export').click();
    expect(document.body.textContent).toContain('菜单触发：导出报表');

    const contextEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 36,
      clientY: 72
    });
    overlayNavigation.querySelector('#context-target').dispatchEvent(contextEvent);
    expect(contextEvent.defaultPrevented).toBe(true);
    expect(document.querySelector('.yoya-vcontext-menu').dataset.open).toBe('true');
    document.querySelector('#context-restart').click();
    expect(document.body.textContent).toContain('菜单触发：重启服务');

    openRoute('/data-display/detail');
    expect(document.querySelector('[data-demo-component-page="detail"]').textContent).toContain(
      '详情面板'
    );

    openRoute('/form/timer');
    const forms = document.querySelector('[data-demo-component-page="timer"]');
    expect(forms.textContent).toContain('日期时间');
    expect(forms.querySelectorAll('.yoya-vtimer')).toHaveLength(3);
    expect(forms.querySelectorAll('.timer-field label')).toHaveLength(3);
    expect(forms.querySelector('.timer-grid').style.gridTemplateColumns).toBe(
      'repeat(3, minmax(0, 1fr))'
    );
    expect(forms.querySelector('label[for="deploy-date"]')).not.toBeNull();
    expect(forms.querySelector('label[for="scheduled-at"]')).not.toBeNull();
    expect(forms.querySelector('label[for="daily-time"]')).not.toBeNull();
    expect(forms.querySelector('#deploy-date').type).toBe('date');
    expect(forms.querySelector('#deploy-date').value).toBe('2026-08-19');
    expect(forms.querySelector('#deploy-date').required).toBe(true);
    expect(forms.querySelector('#scheduled-at').type).toBe('datetime-local');
    expect(forms.querySelector('#scheduled-at').value).toBe('2026-08-19T14:30');
    expect(forms.querySelector('#scheduled-at').readOnly).toBe(true);
    expect(forms.querySelector('#daily-time').type).toBe('time');
    expect(forms.querySelector('#daily-time').value).toBe('09:00');
    expect(forms.querySelector('#daily-time').disabled).toBe(true);

    openRoute('/form/form');
    const serviceFormPage = document.querySelector('[data-demo-component-page="form"]');

    serviceFormPage
      .querySelector('#service-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.body.textContent).toContain('"serviceName":"api-gateway"');

    const formField = serviceFormPage.querySelector('#service-form .yoya-vfield');
    formField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    serviceFormPage.querySelector('#service-form .yoya-vfield-action').click();
    expect(serviceFormPage.querySelector('#service-form .yoya-vfield-editor').style.display).toBe(
      ''
    );

    const serviceNameInput = serviceFormPage.querySelector('#service-form .yoya-vinput');
    serviceNameInput.value = 'worker';
    serviceFormPage
      .querySelector('#service-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.body.textContent).toContain('"serviceName":"worker"');

    openRoute('/form/field');
    const fieldPage = document.querySelector('[data-demo-component-page="field"]');
    fieldPage.querySelector('.field-actions button').click();
    expect(document.body.textContent).toContain('编辑');

    openRoute('/layout/body');
    expect(document.querySelector('[data-demo-component-page="body"]').textContent).toContain(
      '布局组件'
    );
  });

  it('shows copy-pasteable module code beside the rendered component examples', () => {
    renderComponentsExample('#app');

    const routeChecks = [
      ['/layout/body', 1, 'BodyPageCard', 'body.vBody'],
      ['/actions/button', 1, 'DeploymentTaskCard', "['准备参数', '执行动作', '完成回写']"],
      ['/navigation/menu', 1, 'CommandMenuCard', 'menu.vMenuGroup'],
      ['/feedback/message-manager', 1, 'LocalMessageManagerCard', 'vMessageManager'],
      ['/form/timer', 1, 'ScheduleTimerCard', "mode: 'datetime-local'"],
      ['/data-display/chart', 1, 'ChartAdapterCard', 'vChart'],
      ['/async/dynamic-loader', 1, 'DynamicModuleCard', 'vDynamicLoader'],
      ['/router/router', 1, 'RouterNavigationCard', 'nav.vLink']
    ];

    routeChecks.forEach(([path, count, componentName, snippet]) => {
      openRoute(path);
      const sourceBlocks = document.querySelectorAll('[data-source-example]');
      const sourceText = Array.from(sourceBlocks, (block) => block.textContent).join('\n');
      expect(sourceBlocks).toHaveLength(count);
      expect(sourceBlocks[0].textContent).toContain(`export function ${componentName}`);
      expect(sourceText).toContain(snippet);
      expect(sourceText).not.toContain('__vite_ssr_import_');
    });
  });
});
