import { describe, expect, it } from 'vitest';
import { renderBasicElementsExample } from './basic-elements.js';

describe('examples/html basic elements', () => {
  it('renders frequent HTML elements grouped by category', () => {
    document.body.innerHTML = '<main id="example-root"></main>';

    const root = renderBasicElementsExample('#example-root');

    expect(root.tagName()).toBe('section');
    expect(document.querySelector('#basic-elements header h1').textContent).toBe('HTML 高频元素');
    expect(document.querySelectorAll('#basic-elements [data-example-kind]')).toHaveLength(6);

    expect(document.querySelector('[data-example-kind="structure"] nav a').getAttribute('href')).toBe(
      '#form-demo'
    );
    expect(document.querySelector('[data-example-kind="text"] strong').textContent).toBe('ViewNode');
    expect(document.querySelector('[data-example-kind="text"] code').textContent).toBe('VTextNode');
    expect(document.querySelectorAll('[data-example-kind="lists"] li')).toHaveLength(4);
    expect(document.querySelector('[data-example-kind="form"] fieldset legend').textContent).toBe(
      '资料表单'
    );
    expect(document.querySelector('[data-example-kind="table"] table caption').textContent).toBe(
      '核心节点职责'
    );
    expect(document.querySelector('[data-example-kind="media"] details summary').textContent).toBe(
      '查看状态元素'
    );
  });

  it('updates form preview and save status through DOM events', () => {
    document.body.innerHTML = '<main id="example-root"></main>';

    renderBasicElementsExample('#example-root');

    const nameInput = document.querySelector('#profile-name');
    const preview = document.querySelector('#profile-preview');
    const saveButton = document.querySelector('#save-profile');
    const status = document.querySelector('#save-status');
    const progress = document.querySelector('#save-progress');

    expect(preview.textContent).toBe('预览：未填写');
    expect(status.textContent).toBe('状态：等待编辑');
    expect(progress.getAttribute('value')).toBe('20');

    nameInput.value = 'Ada';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(preview.textContent).toBe('预览：Ada');
    expect(status.textContent).toBe('状态：正在编辑 Ada');

    saveButton.click();
    expect(status.textContent).toBe('状态：已保存 Ada');
    expect(progress.getAttribute('value')).toBe('100');
  });
});
