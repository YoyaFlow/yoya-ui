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
});
