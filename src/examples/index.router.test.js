import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonDemoDefinitions } from './button-docs.js';
import { ComponentSource, componentSource } from './component-source.js';
import { renderExamplesIndex } from './index.router.js';

let root = null;

function openRoute(path) {
  const item = document.querySelector(`[data-component-path="${path}"]`);
  expect(item).not.toBeNull();
  item.click();
  return item;
}

function selectedRouteTitle() {
  return document.querySelector('.yoya-vrouter-views-label[aria-selected="true"]')?.textContent;
}

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  root?.destroy?.();
  root = null;
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('renderExamplesIndex', () => {
  it('uses the same component for each button demo and its source', () => {
    expect(buttonDemoDefinitions).toHaveLength(5);
    buttonDemoDefinitions.forEach((demo) => {
      expect(demo.component).toBe(demo.sourceComponent);
    });
  });

  it('renders the menu workspace and intro page', () => {
    root = renderExamplesIndex('#app');

    expect(document.querySelector('.components-workspace')).not.toBeNull();
    expect(document.querySelector('[data-components-menu]')).not.toBeNull();
    expect(document.querySelector('[data-components-router-views]')).not.toBeNull();
    expect(document.querySelector('.components-route-page--intro')).not.toBeNull();
    expect(document.querySelectorAll('.yoya-vmenu-group')).toHaveLength(7);
    expect(document.querySelectorAll('.yoya-vmenu-item')).toHaveLength(42);
    expect(document.querySelectorAll('[data-component-status="planned"]')).toHaveLength(7);
    expect(selectedRouteTitle()).toBe('说明');
  });

  it.each([
    [
      '/components/layout/0',
      '分割线',
      'divider',
      'divider 分割线',
      'section',
      'DividerSectionExample1',
      'divider()',
      2
    ],
    [
      '/components/layout/1',
      '弹性布局',
      'flex',
      'flex 弹性布局',
      'wrap',
      'FlexToolbarExample1',
      'flex(',
      3
    ],
    ['/components/layout/2', '栅格', 'grid', 'grid 栅格', 'fixed', 'GridFixedExample1', 'grid(', 2],
    [
      '/components/layout/3',
      '页面容器',
      'body',
      'vBody 页面容器',
      'shell',
      'BodyShellExample1',
      'vBody(',
      2
    ],
    [
      '/components/layout/4',
      '间距',
      'spacer',
      'spacer 间距',
      'toolbar',
      'SpacerToolbarExample1',
      'spacer()',
      2
    ],
    [
      '/components/layout/5',
      '弹窗',
      'popup',
      'vDialog 弹窗',
      'launch',
      'PopupLaunchExample1',
      'dialog.open(true)',
      2
    ],
    [
      '/components/layout/6',
      '布局模板',
      'templates',
      '布局模板',
      'dashboard',
      'DashboardTemplateExample1',
      'vBody(',
      4
    ],
    [
      '/components/navigation/3',
      '菜单',
      'menu',
      'vMenu 菜单',
      'command',
      'CommandMenuCard',
      'vMenuDivider()',
      5
    ],
    [
      '/components/navigation/5',
      '步骤条',
      'steps',
      'vSteps 步骤条',
      'basic',
      'StepsBasicExample1',
      'vSteps((steps)',
      3
    ],
    [
      '/components/navigation/9',
      '导航栏',
      'navbar',
      'vNavbar 横向导航栏',
      'shell',
      'NavbarShellExample1',
      'vNavbar(',
      3
    ],
    [
      '/components/feedback/0',
      '消息',
      'message',
      'vMessage 消息',
      'types',
      'MessageTypesExample1',
      "vMessage({ type: 'success'",
      4
    ],
    [
      '/components/form/7',
      '字段',
      'field',
      'vField 字段',
      'detail',
      'FieldDetailExample1',
      'vDetail((detail)',
      3
    ],
    [
      '/components/data-display/1',
      '徽标数',
      'badge',
      'vBadge 徽标数',
      'count',
      'BadgeCountExample1',
      'vBadge({',
      3
    ],
    [
      '/components/data-display/2',
      '详情',
      'detail',
      'vDetail 详情',
      'basic',
      'DetailBasicExample1',
      'vDetail({',
      4
    ],
    [
      '/components/data-display/4',
      '表格',
      'table',
      'vTable 表格',
      'basic',
      'TableBasicExample1',
      'vTable({',
      3
    ],
    [
      '/components/data-display/5',
      '树形控件',
      'tree',
      'vTree 树形控件',
      'basic',
      'TreeBasicExample1',
      'vTree({',
      4
    ]
  ])(
    'renders detailed docs for %s',
    async (
      _path,
      routeTitle,
      docsKey,
      heading,
      firstDemoId,
      sourceName,
      sourceSnippet,
      demoCount
    ) => {
      root = renderExamplesIndex('#app');

      openRoute(_path);
      await vi.waitFor(() => {
        expect(selectedRouteTitle()).toBe(routeTitle);
      });

      const page = document.querySelector(
        `[data-layout-docs="${docsKey}"], [data-navigation-docs="${docsKey}"], [data-feedback-docs="${docsKey}"], [data-form-docs="${docsKey}"], [data-data-display-docs="${docsKey}"]`
      );
      expect(page).not.toBeNull();
      expect(page.querySelector('h1').textContent).toBe(heading);
      const demoNodes = page.querySelectorAll(
        '[data-layout-demo], [data-navigation-demo], [data-feedback-demo], [data-form-demo], [data-data-display-demo]'
      );
      expect(demoNodes).toHaveLength(demoCount);

      const source = page.querySelector(
        `[data-layout-demo="${firstDemoId}"] [data-source-example], [data-navigation-demo="${firstDemoId}"] [data-source-example], [data-feedback-demo="${firstDemoId}"] [data-source-example], [data-form-demo="${firstDemoId}"] [data-source-example], [data-data-display-demo="${firstDemoId}"] [data-source-example]`
      );
      expect(source).not.toBeNull();
      expect(source.textContent).toContain(`export function ${sourceName}`);
      expect(source.textContent).toContain(sourceSnippet);
    }
  );

  it('keeps popup documentation dialogs closed until the trigger is clicked', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/layout/5');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('弹窗');
    });
    await Promise.resolve();

    const page = document.querySelector('[data-layout-docs="popup"]');
    expect(page).not.toBeNull();
    expect(page.querySelector('dialog[open]')).toBeNull();

    const launchDemo = page.querySelector('[data-layout-demo="launch"]');
    launchDemo.querySelector('button').click();

    expect(launchDemo.querySelector('dialog[open]')).not.toBeNull();
  });

  it('shows interactive state changes in the horizontal navbar demo', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/navigation/9');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('导航栏');
    });

    const shellDemo = document.querySelector('[data-navigation-demo="shell"]');
    expect(shellDemo).not.toBeNull();

    const status = shellDemo.querySelector('[data-navbar-demo-status]');
    const items = shellDemo.querySelectorAll('.yoya-vnavbar-menu .yoya-vmenu-item');

    expect(status.textContent).toBe('当前：概览');
    expect(items[0].getAttribute('aria-current')).toBe('page');

    items[1].click();

    expect(status.textContent).toBe('当前：组件');
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('page');

    shellDemo.querySelector('.yoya-vnavbar-actions .yoya-vbutton').click();

    expect(status.textContent).toBe('已触发：登录');
  });

  it('moves the current step in the steps docs demo', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/navigation/5');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('步骤条');
    });

    const demo = document.querySelector('[data-navigation-demo="basic"]');
    const status = demo.querySelector('[data-steps-basic-status]');
    const nextButton = [...demo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('下一步')
    );
    const steps = demo.querySelector('.yoya-vsteps');

    expect(status.textContent).toBe('当前第 2 步：配置');
    expect(steps.dataset.current).toBe('1');

    nextButton.click();

    expect(status.textContent).toBe('当前第 3 步：发布');
    expect(steps.dataset.current).toBe('2');
    expect(demo.querySelectorAll('.yoya-vstep')[2].dataset.status).toBe('process');
  });

  it('shows tree selection and checkbox state changes in the tree docs demos', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/data-display/5');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('树形控件');
    });

    const basicDemo = document.querySelector('[data-data-display-demo="basic"]');
    const status = basicDemo.querySelector('[data-tree-demo-status]');

    basicDemo.querySelector('[data-node-id="web"]').click();

    expect(status.textContent).toBe('当前：Web 门户');

    const checkableDemo = document.querySelector('[data-data-display-demo="checkable"]');
    const checkStatus = checkableDemo.querySelector('[data-tree-check-status]');
    const apiInput = checkableDemo.querySelector('[data-node-id="api-gateway"] input');

    apiInput.checked = true;
    apiInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(checkStatus.textContent).toBe('已选 1 项');

    const fileManagerDemo = document.querySelector('[data-data-display-demo="file-manager"]');
    fileManagerDemo.querySelector('[data-node-id="tree.js"]').click();

    expect(fileManagerDemo.querySelector('[data-tree-file-name]').textContent).toBe('tree.js');
    expect(fileManagerDemo.querySelector('[data-tree-file-type]').textContent).toBe('JavaScript');

    const emptyToggle = fileManagerDemo.querySelector(
      '[data-node-id="components"] .yoya-vtree-toggle'
    );
    expect(emptyToggle.getAttribute('aria-expanded')).toBe('false');

    emptyToggle.click();

    expect(
      fileManagerDemo
        .querySelector('[data-node-id="components"] .yoya-vtree-toggle')
        .getAttribute('aria-expanded')
    ).toBe('true');

    const srcToggle = fileManagerDemo.querySelector('[data-node-id="src"] .yoya-vtree-toggle');
    expect(srcToggle.getAttribute('aria-expanded')).toBe('true');
    expect(srcToggle.querySelector('svg')).not.toBeNull();

    srcToggle.click();

    const collapsedToggle = fileManagerDemo.querySelector(
      '[data-node-id="src"] .yoya-vtree-toggle'
    );
    expect(collapsedToggle.getAttribute('aria-expanded')).toBe('false');
    expect(collapsedToggle.querySelector('svg path').getAttribute('d')).toContain('M20 20a2');

    collapsedToggle.click();

    const expandedToggle = fileManagerDemo.querySelector('[data-node-id="src"] .yoya-vtree-toggle');
    expect(expandedToggle.getAttribute('aria-expanded')).toBe('true');
    expect(expandedToggle.querySelector('svg path').getAttribute('d')).toContain('m6 14 1.45-2.9');

    const builderDemo = document.querySelector('[data-data-display-demo="builder"]');
    const builderStatus = builderDemo.querySelector('[data-tree-builder-status]');
    builderDemo.querySelector('[data-tree-builder-action="finance"]').click();

    expect(builderStatus.textContent).toBe('操作：财务');
    expect(
      builderDemo.querySelector('[data-node-id="finance"]').getAttribute('aria-selected')
    ).toBe('false');

    builderDemo.querySelector('[data-node-id="finance"]').click();

    expect(builderStatus.textContent).toBe('当前：财务');
  });

  it('shows the updated dropdown menu docs page with sticky selection state', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/navigation/2');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('下拉菜单');
    });

    const page = document.querySelector('[data-component-route-item="navigation:2"]');
    const dropdown = page.querySelector('[data-dropdown-demo]');
    const status = page.querySelector('[data-dropdown-demo-status]');
    const trigger = page.querySelector('[data-dropdown-demo-trigger]');
    const exportItem = page.querySelector('[data-dropdown-demo-item="export"]');

    expect(status.textContent).toBe('当前：未选择');
    expect(dropdown.dataset.placement).toBe('bottom-end');
    expect(page.querySelector('[data-source-example]').textContent).toContain(
      "placement('bottom-end')"
    );
    expect(page.querySelector('[data-source-example]').textContent).toContain(
      'closeOnSelect(false)'
    );

    trigger.click();

    expect(dropdown.dataset.open).toBe('true');

    exportItem.click();

    expect(status.textContent).toBe('当前：导出报表');
    expect(dropdown.dataset.open).toBe('true');
  });

  it('shows interactive row actions in the table documentation demo', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/data-display/4');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('表格');
    });

    const tableDemo = document.querySelector('[data-data-display-demo="basic"]');
    expect(tableDemo).not.toBeNull();

    const status = tableDemo.querySelector('[data-table-demo-status]');
    expect(status.textContent).toBe('等待操作');

    tableDemo.querySelector('[data-table-row-action="worker"]').click();

    expect(status.textContent).toBe('已选择 worker');
    expect(tableDemo.querySelector('.yoya-vtable-caption').textContent).toBe('服务列表');
    expect(tableDemo.querySelectorAll('.yoya-vtable-row')).toHaveLength(3);
  });

  it('updates badge counts and overflow text in the badge docs demo', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/data-display/1');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('徽标数');
    });

    const countDemo = document.querySelector('[data-data-display-demo="count"]');
    const status = countDemo.querySelector('[data-badge-count-status]');
    const addButton = [...countDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('加 1')
    );

    expect(status.textContent).toBe('当前 0');
    expect(countDemo.querySelector('.yoya-vbadge-count').textContent).toBe('0');
    expect(countDemo.textContent).toContain('99+');

    addButton.click();

    expect(status.textContent).toBe('当前 1');
    expect(countDemo.querySelector('.yoya-vbadge-count').textContent).toBe('1');
  });

  it('updates detail values when switching services in the detail docs demo', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/data-display/2');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('详情');
    });

    const detailDemo = document.querySelector('[data-data-display-demo="dynamic"]');
    const detail = detailDemo.querySelector('.yoya-vdetail');
    const switchButton = [...detailDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('切换服务')
    );

    expect(detail.textContent).toContain('api-gateway');
    expect(detail.textContent).toContain('运行中');

    switchButton.click();

    expect(detail.textContent).toContain('worker');
    expect(detail.textContent).toContain('维护中');
  });

  it('dynamically changes detail column counts in the detail docs demo', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/data-display/2');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('详情');
    });

    const columnsDemo = document.querySelector('[data-data-display-demo="columns"]');
    const detail = columnsDemo.querySelector('.yoya-vdetail');
    const status = columnsDemo.querySelector('[data-detail-columns-status]');
    const threeColumnsButton = [...columnsDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('3 列')
    );

    expect(status.textContent).toBe('当前 2 列');
    expect(detail.dataset.columns).toBe('2');
    expect(detail.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');

    threeColumnsButton.click();

    expect(status.textContent).toBe('当前 3 列');
    expect(detail.dataset.columns).toBe('3');
    expect(detail.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('keeps the button source compact and directly reusable', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/general/0');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const page = document.querySelector('[data-component-route-item="general:0"]');
    const source = page.querySelector('[data-source-example]').textContent;

    expect(source).toContain("import { vButton } from 'yoya-ui';");
    expect(source).toContain('export function ButtonExample1()');
    expect(source).toContain('return {');
    expect(source).toContain('render()');
    expect(source).toContain("return vButton('OK')");
    expect(source).toContain(".variant('primary')");
    expect(source).toContain(".on('click', () => {");
    expect(source).toContain("console.log('clicked')");
    expect(source).not.toContain('DeploymentTaskCard');
    expect(source).not.toContain('vCard');
  });

  it('renders the vButton documentation page as stacked interactive examples', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/general/0');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const page = document.querySelector('[data-button-docs="true"]');
    expect(page).not.toBeNull();
    expect(page.querySelector('h1').textContent).toBe('vButton 按钮');
    expect(page.querySelector('[data-button-usage]')).not.toBeNull();

    const demos = page.querySelectorAll('[data-button-demo]');
    expect(demos).toHaveLength(5);
    demos.forEach((demo) => {
      const live = demo.querySelector('[data-button-live]');
      const source = demo.querySelector('.source-panel');
      expect(live).not.toBeNull();
      expect(source).not.toBeNull();
      expect(live.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(source.querySelector('[data-source-example]').textContent).toMatch(
        /export function Button(?:[A-Za-z]+)?Example1\(\)/
      );
      expect(source.querySelector('[data-source-example]').textContent).toContain('return {');
      expect(source.querySelector('[data-source-example]').textContent).toContain('render()');
    });

    const loadingButton = page.querySelector(
      '[data-button-demo="states"] [data-button-live] button'
    );
    const basicSource = page.querySelector('[data-button-demo="basic"] [data-source-example]');
    expect(basicSource.textContent).toContain("return vButton('OK')");
    expect(basicSource.textContent).not.toContain('const button =');
    expect(basicSource.textContent).toContain("console.log('clicked')");
    expect(basicSource.textContent).toContain(".variant('primary')");
    expect(basicSource.textContent).toContain(".on('click'");
    loadingButton.click();
    expect(loadingButton.getAttribute('aria-busy')).toBe('true');
  });

  it('renders visibly different button sizes in the size example', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/general/0');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const buttons = document.querySelectorAll(
      '[data-button-demo="sizes"] [data-button-live] button'
    );
    const row = document.querySelector(
      '[data-button-demo="sizes"] [data-button-live] .yoya-hstack'
    );

    expect(row.style.alignItems).toBe('center');
    expect([...buttons].map((button) => button.dataset.size)).toEqual(['small', 'medium', 'large']);
  });

  it('renders an interactive form demo', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/form/1');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('输入框');
    });

    const page = document.querySelector('[data-component-route-item="form:1"]');
    const input = page.querySelector('.yoya-vinput');

    expect(input.value).toBe('yoya-ui');
    input.value = 'service-gateway';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(page.textContent).toContain('service-gateway');
    expect(page.querySelector('[data-source-example]').textContent).toContain(
      'export function InputExample1'
    );
  });

  it('renders the form documentation page with basic and validated demos', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/form/0');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('表单');
    });

    const page = document.querySelector('[data-form-docs="form"]');
    expect(page).not.toBeNull();
    expect(page.querySelector('h1').textContent).toBe('vForm 表单');
    expect(page.querySelectorAll('[data-form-demo]')).toHaveLength(3);
    expect(page.textContent).toContain('基础表单');
    expect(page.textContent).toContain('表单校验');
    expect(page.textContent).toContain('自定义取值');
    expect(
      page.querySelector('[data-form-demo="basic"] [data-source-example]').textContent
    ).toContain('export function FormExample1');
    expect(
      page.querySelector('[data-form-demo="basic"] [data-source-example]').textContent
    ).not.toContain('vCard');
    expect(
      page.querySelector('[data-form-demo="validated"] [data-source-example]').textContent
    ).toContain('export function FormExample2');
    expect(
      page.querySelector('[data-form-demo="validated"] [data-source-example]').textContent
    ).not.toContain('vCard');
    expect(
      page.querySelector('[data-form-demo="collect-value"] [data-source-example]').textContent
    ).toContain('export function FormExample3');
    expect(
      page.querySelector('[data-form-demo="collect-value"] [data-source-example]').textContent
    ).toContain('collectValue');

    const validated = page.querySelector('[data-form-demo="validated"]');
    validated.querySelector('button[type="submit"]').click();
    expect(validated.textContent).toContain('项目名称不能为空');
    expect(validated.textContent).toContain('请选择负责人角色');
    expect(validated.textContent).toContain('请检查必填项');

    const collect = page.querySelector('[data-form-demo="collect-value"]');
    collect.querySelector('button[type="submit"]').click();
    expect(collect.textContent).toContain('负责人：SRE Team');
  });

  it('renders vField docs combined with vDetail and saves edited values', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/form/7');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('字段');
    });

    const page = document.querySelector('[data-form-docs="field"]');
    expect(page.querySelector('h1').textContent).toBe('vField 字段');
    expect(page.querySelectorAll('[data-form-demo]')).toHaveLength(3);

    const detailDemo = page.querySelector('[data-form-demo="detail"]');
    const detailField = detailDemo.querySelector('.yoya-vfield');
    const detailItem = detailDemo.querySelector('.yoya-vdetail-item');

    expect(detailItem.dataset.labelVisible).toBeUndefined();
    expect(detailItem.style.gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(detailField.querySelector('.yoya-vfield-label').textContent).toBe('服务名称');

    detailField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    const detailAction = detailField.querySelector('.yoya-vfield-action');

    expect(detailAction.style.opacity).toBe('1');
    detailAction.click();
    expect(detailField.dataset.mode).toBe('edit');

    const saveDemo = page.querySelector('[data-form-demo="save"]');
    const saveField = saveDemo.querySelector('.yoya-vfield');
    saveField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    saveField.querySelector('.yoya-vfield-action').click();
    const saveInput = saveField.querySelector('input');
    saveInput.value = 'worker';
    saveInput.dispatchEvent(new Event('input', { bubbles: true }));
    const saveButton = [...saveDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('保存')
    );
    saveButton.click();

    expect(saveDemo.querySelector('[data-field-save-status]').textContent).toContain('worker');

    const validationDemo = page.querySelector('[data-form-demo="validation"]');
    const validationField = validationDemo.querySelector('.yoya-vfield');
    validationField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    validationField.querySelector('.yoya-vfield-action').click();
    const validationInput = validationField.querySelector('input');
    validationInput.value = '';
    validationInput.dispatchEvent(new Event('input', { bubbles: true }));
    const validateButton = [...validationDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('校验')
    );
    validateButton.click();

    expect(validationDemo.querySelector('[data-field-validation-status]').textContent).toBe(
      '校验未通过'
    );
    expect(validationDemo.textContent).toContain('服务名称不能为空');
  });

  it('shows a planned entry with placeholder source', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/general/1');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮组');
    });

    const page = document.querySelector('[data-component-route-item="general:1"]');
    expect(page.querySelector('.components-route-placeholder')).not.toBeNull();
    expect(page.textContent).toContain('待开发');
    expect(page.querySelector('[data-source-example]').textContent).toContain('// 按钮组');
  });

  it('renders the reusable source helper as an object component', () => {
    function SampleCard() {
      return {
        render() {
          return 'sample';
        }
      };
    }

    const sourceText = componentSource(SampleCard, ['vCard']);
    const sourcePanel = ComponentSource({
      component: SampleCard,
      imports: ['vCard'],
      title: '示例源码'
    });
    const element = sourcePanel.render().renderDom();

    expect(sourceText).toBe(`import { vCard } from 'yoya-ui';

export function SampleCard() {
  return {
    render() {
      return 'sample';
    }
  };
}`);
    expect(element.classList.contains('source-panel')).toBe(true);
    expect(element.querySelector('h2').textContent).toBe('示例源码');
  });

  it('renders the router views demo with a vertical left title bar', async () => {
    root = renderExamplesIndex('#app');

    openRoute('/components/navigation/8');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('路由视图');
    });

    const page = document.querySelector('[data-component-route-item="navigation:8"]');
    const demoViews = page.querySelector('.yoya-vrouter-views');
    const titlebar = demoViews.querySelector('.yoya-vrouter-views-titlebar');

    expect(demoViews.dataset.titlePosition).toBe('left');
    expect(titlebar.getAttribute('aria-orientation')).toBe('vertical');
    expect(titlebar.style.flexDirection).toBe('column');
  });
});
