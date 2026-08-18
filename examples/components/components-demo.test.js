import { beforeEach, describe, expect, it } from 'vitest';
import { renderComponentsExample } from './components-demo.js';

describe('components example', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it('renders compound components and interactive feedback', () => {
    const root = renderComponentsExample('#app');

    const container = document.querySelector('.components-container');
    const firstExample = document.querySelector('.component-example');

    expect(root.renderDom().querySelectorAll('.yoya-vcard')).toHaveLength(10);
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

    document.querySelector('#service-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    expect(document.body.textContent).toContain('"serviceName":"api-gateway"');

    const formField = document.querySelector('#service-form .yoya-vfield');
    formField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    document.querySelector('#service-form .yoya-vfield-action').click();
    expect(document.querySelector('#service-form .yoya-vfield-editor').style.display).toBe('');

    const serviceNameInput = document.querySelector('#service-form .yoya-vinput');
    serviceNameInput.value = 'worker';
    document.querySelector('#service-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    expect(document.body.textContent).toContain('"serviceName":"worker"');

    document.querySelector('.field-actions button').click();
    expect(document.body.textContent).toContain('编辑');
  });

  it('shows source code beside the rendered component examples', () => {
    renderComponentsExample('#app');

    const sourceBlocks = document.querySelectorAll('[data-source-example]');

    expect(sourceBlocks).toHaveLength(10);
    expect(sourceBlocks[0].textContent).toContain("card.vCardHeader('部署任务')");
    expect(sourceBlocks[1].textContent).toContain("toast.success('配置已保存'");
    expect(sourceBlocks[2].textContent).toContain("locale.setLanguage('en')");
    expect(sourceBlocks[3].textContent).toContain('menu.vMenuItem');
    expect(sourceBlocks[4].textContent).toContain('menu.vDropdownMenu');
    expect(sourceBlocks[4].textContent).toContain('menu.vContextMenu');
    expect(sourceBlocks[5].textContent).toContain('body.vDetail');
    expect(sourceBlocks[6].textContent).toContain('body.vCode');
    expect(sourceBlocks[7].textContent).toContain('body.vTable');
    expect(sourceBlocks[8].textContent).toContain('form.vField');
    expect(sourceBlocks[8].textContent).toContain('form.vCheckboxes');
    expect(sourceBlocks[8].textContent).toContain('form.vButton');
    expect(sourceBlocks[9].textContent).toContain("field.display('SRE Team')");
    expect(sourceBlocks[9].textContent).toContain('field.control');
  });
});
