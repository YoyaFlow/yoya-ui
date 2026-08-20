import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VMessageManager } from '../../src/index.js';
import { componentSource } from './component-source.js';
import { componentDemoCategories, renderComponentsExample } from './components-demo.js';
import {
  AuditCard,
  DeploymentTaskCard,
  LocaleSwitchCard,
  LocalMessageManagerCard
} from './demos/actions-feedback.js';
import { DynamicModuleCard } from './demos/async-dynamic.js';
import {
  CodeBlockCard,
  ServiceDetailCard,
  ServiceTableCard,
  SqlSnippetCard
} from './demos/data-display.js';
import {
  OwnerFieldCard,
  ScheduleTimerCard,
  ServiceFormCard,
  TimerRangeCard
} from './demos/forms-datetime.js';
import { BodyPageCard } from './demos/layout-page.js';
import { CommandMenuCard, OverlayMenuCard, SidebarCard, SubMenuCard } from './demos/navigation.js';
import { DeclarativeRouterCard, RouterNavigationCard } from './demos/routing.js';

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
  DynamicModuleCard,
  BodyPageCard,
  ServiceDetailCard,
  SqlSnippetCard,
  CodeBlockCard,
  ServiceTableCard,
  ServiceFormCard,
  OwnerFieldCard,
  ScheduleTimerCard,
  TimerRangeCard
];

describe('components example', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
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

    expect(componentDemoCategories).toHaveLength(7);
    expect(componentDemoCategories.flatMap((category) => category.demos)).toHaveLength(20);
    demoComponents.forEach((Component) => {
      const instance = Component(context);
      expect(typeof instance.render).toBe('function');
      expect(Component.toString()).toMatch(
        new RegExp(`function ${Component.name}\\([^)]*\\)\\s*{[\\s\\S]*return\\s*{\\s*render\\(\\)`)
      );
    });
    expect(renderComponentsExample.toString()).toContain('example.child(component(context))');
    expect(renderComponentsExample.toString()).toMatch(
      /ComponentSource.*component.*imports.*title/s
    );
  });

  it('groups demos into broad category sections and includes vTimerRange', () => {
    renderComponentsExample('#app');

    const categoryNavigation = document.querySelector('[aria-label="组件大类"]');
    const categoryLinks = Array.from(
      categoryNavigation.querySelectorAll('[data-demo-category-link]')
    );
    const categoryHeadings = Array.from(
      document.querySelectorAll('[data-demo-category] header h2'),
      (heading) => heading.textContent
    );

    expect(categoryLinks).toHaveLength(7);
    expect(categoryLinks.map((link) => link.getAttribute('href'))).toEqual([
      '#category-actions-feedback',
      '#category-navigation',
      '#category-routing',
      '#category-async-dynamic',
      '#category-layout-page',
      '#category-data-display',
      '#category-forms-datetime'
    ]);
    expect(categoryLinks.map((link) => link.textContent)).toEqual([
      '操作与反馈4 个演示',
      '导航菜单4 个演示',
      '路由导航2 个演示',
      '异步与动态1 个演示',
      '页面布局1 个演示',
      '数据展示4 个演示',
      '表单与日期时间4 个演示'
    ]);
    expect(categoryHeadings).toEqual([
      '操作与反馈',
      '导航菜单',
      '路由导航',
      '异步与动态',
      '页面布局',
      '数据展示',
      '表单与日期时间'
    ]);
    expect(document.querySelectorAll('[data-demo-category]')).toHaveLength(7);
    expect(document.querySelector('[data-demo-category="navigation"]').id).toBe(
      'category-navigation'
    );
    expect(document.querySelector('.yoya-vtimer-range')).not.toBeNull();
    expect(document.body.textContent).toContain('日期范围');
  });

  it('demonstrates vBody with a responsive page grid and generated component source', () => {
    renderComponentsExample('#app');

    const layout = document.querySelector('[data-demo-category="layout-page"]');
    const source = layout.querySelector('[data-source-example]').textContent;

    expect(layout.querySelector('.yoya-vbody')).not.toBeNull();
    expect(layout.querySelector('.yoya-vbody-content')).not.toBeNull();
    expect(layout.querySelector('.yoya-responsive-grid')).not.toBeNull();
    expect(source).toContain('body.vBody');
    expect(source).toContain('page.responsiveGrid');
  });

  it('demonstrates dynamic loading failure, retry, and generated component source', async () => {
    renderComponentsExample('#app');

    const dynamic = document.querySelector('[data-demo-category="async-dynamic"]');
    const loader = dynamic.querySelector('.yoya-vdynamic-loader');
    const source = dynamic.querySelector('[data-source-example]').textContent;

    expect(loader.dataset.loaderState).toBe('pending');
    expect(loader.textContent).toContain('等待加载');
    dynamic.querySelector('#dynamic-load').click();
    await vi.waitFor(() => expect(loader.dataset.loaderState).toBe('error'));
    expect(loader.textContent).toContain('模拟网络失败');
    dynamic.querySelector('#dynamic-retry').click();
    await vi.waitFor(() => expect(loader.dataset.loaderState).toBe('loaded'));
    expect(loader.textContent).toContain('审计模块已就绪');
    expect(source).toContain('vDynamicLoader');
    expect(source).toContain('moduleLoader.retry');
  });

  it('demonstrates CodeBlock language, copy label, dynamic content, and generated source', () => {
    renderComponentsExample('#app');

    const block = document.querySelector('.yoya-code-block');
    const source = Array.from(
      document.querySelectorAll('[data-demo-category="data-display"] [data-source-example]'),
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

  it('demonstrates an independent local message manager with generated source', () => {
    const destroyManager = vi.spyOn(VMessageManager.prototype, 'destroy');
    const root = renderComponentsExample('#app');

    const actions = document.querySelector('[data-demo-category="actions-feedback"]');
    const localExample = actions.querySelectorAll('.component-example')[3];
    const liveCard = localExample.querySelector(':scope > .yoya-vcard');
    const source = localExample.querySelector('[data-source-example]').textContent;

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

    const routing = document.querySelector('[data-demo-category="routing"]');
    const imperative = routing.querySelectorAll('.component-example')[0];
    const links = imperative.querySelectorAll('.yoya-vlink');
    const outlet = imperative.querySelector('.yoya-vrouter-view');
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

    const routing = document.querySelector('[data-demo-category="routing"]');
    const declarative = routing.querySelectorAll('.component-example')[1];
    const source = declarative.querySelector('[data-source-example]').textContent;

    expect(declarative.querySelector('.yoya-vrouter-view')).not.toBeNull();
    expect(declarative.textContent).toContain('声明式首页');
    expect(source).toContain('vRouter');
    expect(source).toContain('vRoute');
    expect(addEventListener.mock.calls.filter(([type]) => type === 'hashchange')).toHaveLength(0);
    addEventListener.mockRestore();
  });

  it('demonstrates accessible menu groups and dividers from the component function', () => {
    renderComponentsExample('#app');

    const navigation = document.querySelector('[data-demo-category="navigation"]');
    const commandExample = navigation.querySelector('.component-example');
    const groups = commandExample.querySelectorAll('.yoya-vmenu-group');
    const divider = commandExample.querySelector('.yoya-vmenu-divider');
    const commandSource = document.querySelectorAll('[data-source-example]')[4].textContent;

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

    const navigation = document.querySelector('[data-demo-category="navigation"]');
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

    const navigation = document.querySelector('[data-demo-category="navigation"]');
    const sidebar = navigation.querySelector('.yoya-vsidebar');
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

    const container = document.querySelector('.components-container');
    const firstExample = document.querySelector('.component-example');

    expect(root.commit().querySelectorAll('.component-example > .yoya-vcard')).toHaveLength(20);
    expect(container.style.maxWidth).toBe('1120px');
    expect(container.style.marginLeft).toBe('auto');
    expect(container.style.marginRight).toBe('auto');
    expect(firstExample.style.gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(firstExample.children[0].classList.contains('yoya-vcard')).toBe(true);
    expect(firstExample.children[1].classList.contains('source-panel')).toBe(true);
    expect(document.body.textContent).toContain('部署任务');
    expect(document.body.textContent).toContain('保存配置');
    expect(document.body.textContent).toContain('命令菜单');
    expect(document.body.textContent).toContain('嵌套菜单');
    expect(document.body.textContent).toContain('浮层菜单');
    expect(document.body.textContent).toContain('后台侧栏');
    expect(document.body.textContent).toContain('服务详情');
    expect(document.body.textContent).toContain('SQL 片段');
    expect(document.body.textContent).toContain('服务表格');
    expect(document.body.textContent).toContain('基础表单');
    expect(document.body.textContent).toContain('字段模式');
    expect(document.body.textContent).toContain('日期时间');
    expect(document.querySelectorAll('.yoya-vtimer')).toHaveLength(5);
    expect(document.querySelectorAll('.timer-field label')).toHaveLength(3);
    expect(document.querySelector('.timer-grid').style.gridTemplateColumns).toBe(
      'repeat(3, minmax(0, 1fr))'
    );
    expect(document.querySelector('label[for="deploy-date"]')).not.toBeNull();
    expect(document.querySelector('label[for="scheduled-at"]')).not.toBeNull();
    expect(document.querySelector('label[for="daily-time"]')).not.toBeNull();
    expect(document.querySelector('#deploy-date').type).toBe('date');
    expect(document.querySelector('#deploy-date').value).toBe('2026-08-19');
    expect(document.querySelector('#deploy-date').required).toBe(true);
    expect(document.querySelector('#scheduled-at').type).toBe('datetime-local');
    expect(document.querySelector('#scheduled-at').value).toBe('2026-08-19T14:30');
    expect(document.querySelector('#scheduled-at').readOnly).toBe(true);
    expect(document.querySelector('#daily-time').type).toBe('time');
    expect(document.querySelector('#daily-time').value).toBe('09:00');
    expect(document.querySelector('#daily-time').disabled).toBe(true);

    document.querySelector('#save-config').click();
    expect(document.body.textContent).toContain('配置已保存');

    document.querySelector('#switch-en').click();
    expect(document.querySelector('#save-config').textContent).toContain('Save');

    document.querySelector('#menu-refresh').click();
    expect(document.body.textContent).toContain('菜单触发：刷新状态');

    document.querySelector('#dropdown-trigger').click();
    expect(document.querySelector('.yoya-vdropdown-menu').dataset.open).toBe('true');
    document.querySelector('#dropdown-export').click();
    expect(document.body.textContent).toContain('菜单触发：导出报表');

    const contextEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 36,
      clientY: 72
    });
    document.querySelector('#context-target').dispatchEvent(contextEvent);
    expect(contextEvent.defaultPrevented).toBe(true);
    expect(document.querySelector('.yoya-vcontext-menu').dataset.open).toBe('true');
    document.querySelector('#context-restart').click();
    expect(document.body.textContent).toContain('菜单触发：重启服务');

    document
      .querySelector('#service-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.body.textContent).toContain('"serviceName":"api-gateway"');

    const formField = document.querySelector('#service-form .yoya-vfield');
    formField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    document.querySelector('#service-form .yoya-vfield-action').click();
    expect(document.querySelector('#service-form .yoya-vfield-editor').style.display).toBe('');

    const serviceNameInput = document.querySelector('#service-form .yoya-vinput');
    serviceNameInput.value = 'worker';
    document
      .querySelector('#service-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.body.textContent).toContain('"serviceName":"worker"');

    document.querySelector('.field-actions button').click();
    expect(document.body.textContent).toContain('编辑');
  });

  it('shows copy-pasteable module code beside the rendered component examples', () => {
    renderComponentsExample('#app');

    const sourceBlocks = document.querySelectorAll('[data-source-example]');
    const componentNames = demoComponents.map((Component) => Component.name);

    expect(sourceBlocks).toHaveLength(20);
    sourceBlocks.forEach((block, index) => {
      expect(block.textContent).toContain(`export function ${componentNames[index]}`);
      expect(block.textContent).toMatch(/return\s*{\s*render\(\)\s*{\s*return vCard/s);
      expect(block.textContent).not.toContain('export function create');
      expect(block.textContent).not.toContain('__vite_ssr_import_');
    });
    expect(sourceBlocks[0].textContent).toContain("import { vCard, vText } from 'yoya-ui';");
    expect(sourceBlocks[0].textContent).toContain("['拉取镜像', '应用配置', '重启服务']");
    expect(sourceBlocks[3].textContent).toContain('vMessageManager');
    expect(sourceBlocks[8].textContent).toContain('nav.vLink');
    expect(sourceBlocks[9].textContent).toContain('vRouter');
    expect(sourceBlocks[10].textContent).toContain('vDynamicLoader');
    expect(sourceBlocks[11].textContent).toContain('body.vBody');
    expect(sourceBlocks[14].textContent).toContain('codeBlock');
    expect(sourceBlocks[16].textContent).toContain('defaultServiceValues');
    expect(sourceBlocks[17].textContent).toContain('const nextMode =');
    expect(sourceBlocks[18].textContent).toContain("mode: 'datetime-local'");
    expect(sourceBlocks[19].textContent).toContain('stack.vTimerRange');
  });
});
