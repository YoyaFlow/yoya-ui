import { beforeEach, describe, expect, it } from 'vitest';
import { renderComponentsExample } from './components-demo.js';

describe('components example', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it('renders compound components and interactive feedback', () => {
    const root = renderComponentsExample('#app');

    expect(root.renderDom().querySelectorAll('.yoya-vcard')).toHaveLength(3);
    expect(document.body.textContent).toContain('部署任务');
    expect(document.body.textContent).toContain('保存配置');

    document.querySelector('#save-config').click();
    expect(document.body.textContent).toContain('配置已保存');

    document.querySelector('#switch-en').click();
    expect(document.querySelector('#save-config').textContent).toContain('Save');
  });

  it('shows source code beside the rendered component examples', () => {
    renderComponentsExample('#app');

    const sourceBlocks = document.querySelectorAll('[data-source-example]');

    expect(sourceBlocks).toHaveLength(3);
    expect(sourceBlocks[0].textContent).toContain("card.vCardHeader('部署任务')");
    expect(sourceBlocks[1].textContent).toContain("toast.success('配置已保存'");
    expect(sourceBlocks[2].textContent).toContain("locale.setLanguage('en')");
  });
});
