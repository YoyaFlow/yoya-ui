import { beforeEach, describe, expect, it } from 'vitest';
import { componentSource } from './component-source.js';
import { componentDemoCategories, renderComponentsExample } from './components-demo.js';
import { AuditCard, DeploymentTaskCard, LocaleSwitchCard } from './demos/actions-feedback.js';
import { ServiceDetailCard, ServiceTableCard, SqlSnippetCard } from './demos/data-display.js';
import {
  OwnerFieldCard,
  ScheduleTimerCard,
  ServiceFormCard,
  TimerRangeCard
} from './demos/forms-datetime.js';
import { CommandMenuCard, OverlayMenuCard } from './demos/navigation.js';

const demoComponents = [
  DeploymentTaskCard,
  AuditCard,
  LocaleSwitchCard,
  CommandMenuCard,
  OverlayMenuCard,
  ServiceDetailCard,
  SqlSnippetCard,
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

    expect(componentDemoCategories).toHaveLength(4);
    expect(componentDemoCategories.flatMap((category) => category.demos)).toHaveLength(12);
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

    const categoryHeadings = Array.from(
      document.querySelectorAll('[data-demo-category] header h2'),
      (heading) => heading.textContent
    );

    expect(categoryHeadings).toEqual(['操作与反馈', '导航菜单', '数据展示', '表单与日期时间']);
    expect(document.querySelectorAll('[data-demo-category]')).toHaveLength(4);
    expect(document.querySelector('.yoya-vtimer-range')).not.toBeNull();
    expect(document.body.textContent).toContain('日期范围');
  });

  it('renders compound components and interactive feedback', () => {
    const root = renderComponentsExample('#app');

    const container = document.querySelector('.components-container');
    const firstExample = document.querySelector('.component-example');

    expect(root.commit().querySelectorAll('.yoya-vcard')).toHaveLength(12);
    expect(container.style.maxWidth).toBe('1120px');
    expect(container.style.marginLeft).toBe('auto');
    expect(container.style.marginRight).toBe('auto');
    expect(firstExample.style.gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(firstExample.children[0].classList.contains('yoya-vcard')).toBe(true);
    expect(firstExample.children[1].classList.contains('source-panel')).toBe(true);
    expect(document.body.textContent).toContain('部署任务');
    expect(document.body.textContent).toContain('保存配置');
    expect(document.body.textContent).toContain('命令菜单');
    expect(document.body.textContent).toContain('浮层菜单');
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

    expect(sourceBlocks).toHaveLength(12);
    sourceBlocks.forEach((block, index) => {
      expect(block.textContent).toContain(`export function ${componentNames[index]}`);
      expect(block.textContent).toMatch(/return\s*{\s*render\(\)\s*{\s*return vCard/s);
      expect(block.textContent).not.toContain('export function create');
      expect(block.textContent).not.toContain('__vite_ssr_import_');
    });
    expect(sourceBlocks[0].textContent).toContain("import { vCard, vText } from 'yoya-ui';");
    expect(sourceBlocks[0].textContent).toContain("['拉取镜像', '应用配置', '重启服务']");
    expect(sourceBlocks[8].textContent).toContain('defaultServiceValues');
    expect(sourceBlocks[9].textContent).toContain('const nextMode =');
    expect(sourceBlocks[10].textContent).toContain("mode: 'datetime-local'");
    expect(sourceBlocks[11].textContent).toContain('stack.vTimerRange');
  });
});
