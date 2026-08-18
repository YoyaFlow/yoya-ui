import { beforeEach, describe, expect, it } from 'vitest';
import { renderComponentsExample } from './components-demo.js';

describe('components example', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it('renders compound components and interactive feedback', () => {
    const root = renderComponentsExample('#app');

    expect(root.renderDom().querySelectorAll('.yoya-vcard')).toHaveLength(8);
    expect(document.body.textContent).toContain('部署任务');
    expect(document.body.textContent).toContain('保存配置');
    expect(document.body.textContent).toContain('命令菜单');
    expect(document.body.textContent).toContain('浮层菜单');
    expect(document.body.textContent).toContain('服务详情');
    expect(document.body.textContent).toContain('SQL 片段');
    expect(document.body.textContent).toContain('服务表格');

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
  });

  it('shows source code beside the rendered component examples', () => {
    renderComponentsExample('#app');

    const sourceBlocks = document.querySelectorAll('[data-source-example]');

    expect(sourceBlocks).toHaveLength(8);
    expect(sourceBlocks[0].textContent).toContain("card.vCardHeader('部署任务')");
    expect(sourceBlocks[1].textContent).toContain("toast.success('配置已保存'");
    expect(sourceBlocks[2].textContent).toContain("locale.setLanguage('en')");
    expect(sourceBlocks[3].textContent).toContain('menu.vMenuItem');
    expect(sourceBlocks[4].textContent).toContain('menu.vDropdownMenu');
    expect(sourceBlocks[4].textContent).toContain('menu.vContextMenu');
    expect(sourceBlocks[5].textContent).toContain('body.vDetail');
    expect(sourceBlocks[6].textContent).toContain('body.vCode');
    expect(sourceBlocks[7].textContent).toContain('body.vTable');
  });
});
