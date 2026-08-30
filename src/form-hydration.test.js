import { describe, expect, it } from 'vitest';
import { vCheckboxes, vForm, vFormItem, vInput, vRadios } from './index.js';
import { hydrate, renderToString } from './yoya.ssr.js';

describe('form hydration', () => {
  it('syncs checkbox state from the DOM after hydration', () => {
    const page = () => vCheckboxes({ name: 'tags', options: ['a', 'b', 'c'], value: ['a'] });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    document.querySelector('input[value="c"]').click();

    const node = hydrate(page, '#app');

    expect(node.value()).toEqual(['a', 'c']);
  });

  it('syncs radio state from the DOM after hydration', () => {
    const page = () => vRadios({ name: 'choice', options: ['x', 'y'], value: 'x' });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    document.querySelector('input[value="x"]').click();
    document.querySelector('input[value="y"]').click();

    const node = hydrate(page, '#app');

    expect(node.value()).toBe('y');
  });

  it('syncs text input snapshots from the DOM after hydration', () => {
    let inputNode = null;
    const page = () => {
      const form = vForm();
      const item = vFormItem({ name: 'email', label: '邮箱' });
      inputNode = vInput({ name: 'email' });
      item.control(inputNode);
      form.child(item);
      return form;
    };
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    document.querySelector('#app input').value = 'user@example.com';

    const form = hydrate(page, '#app');

    expect(form.values()).toEqual({ email: 'user@example.com' });
    expect(inputNode._value).toBe('user@example.com');
  });

  it('bakes server validation errors into the HTML and keeps them after hydration', () => {
    const page = () => {
      const form = vForm();
      const item = vFormItem({ label: '邮箱', name: 'email', required: true });
      item.control(vInput({ name: 'email' }));
      form.child(item);
      form.validate();
      return form;
    };
    const { html } = renderToString(page);

    expect(html).toContain('该项为必填');
    expect(html).toContain('data-error');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    hydrate(page, '#app');

    expect(document.querySelector('#app .yoya-vform-item-error').textContent).toContain(
      '该项为必填'
    );
    expect(document.querySelector('#app [data-error]')).not.toBeNull();
  });

  it('revalidates pre-hydration input against the shared rules', () => {
    const page = () => {
      const form = vForm();
      const item = vFormItem({ label: '邮箱', name: 'email', required: true });
      item.control(vInput({ name: 'email' }));
      form.child(item);
      form.validate();
      return form;
    };
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    document.querySelector('#app input').value = 'filled@example.com';

    const form = hydrate(page, '#app');

    expect(form.validate()).toBe(true);
    expect(document.querySelector('#app [data-error]')).toBeNull();
  });
});
