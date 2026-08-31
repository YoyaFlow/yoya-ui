import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SsrDemoPage } from './demos/ssr-demo.js';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  delete document.documentElement.dataset.yoyaMode;
});

describe('SSR standalone demo page', () => {
  it('renders SSR HTML and hydrates buttons, dialog and form', async () => {
    const page = SsrDemoPage();
    const element = page.render().renderDom();
    document.body.appendChild(element);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const output = element.querySelector('[data-ssr-live-output]');
    expect(output.textContent).toContain('yoya-vdialog');
    expect(output.textContent).toContain('yoya-vform');

    const host = document.querySelector('#ssr-demo-host');
    expect(host.querySelector('[data-ssr-live]')).not.toBeNull();
    expect(host.textContent).toContain('注册表单');

    // 按钮：点击计数
    const counterButton = host.querySelector('[data-ssr-counter] button');
    expect(host.querySelector('[data-ssr-counter]').textContent).toContain('点击次数：0');
    counterButton.click();
    expect(host.querySelector('[data-ssr-counter]').textContent).toContain('点击次数：1');

    // 弹窗：打开/关闭
    host.querySelector('[data-ssr-dialog-open]').click();
    const dialog = host.querySelector('[data-ssr-dialog]');
    expect(dialog.hasAttribute('open')).toBe(true);
    dialog.querySelector('button').click();
    expect(dialog.hasAttribute('open')).toBe(false);

    // 表单：服务端烘焙的必填错误，提交不通过时不出现成功消息
    const form = host.querySelector('[data-ssr-form]');
    expect(form.querySelector('[data-error]')).not.toBeNull();
    host.querySelector('[data-ssr-submit]').click();
    expect(host.querySelector('[data-ssr-messages] .yoya-vmessage')).toBeNull();

    // 填写后提交：错误清除并弹出成功消息
    const inputs = form.querySelectorAll('input');
    inputs[0].value = 'Ada';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].value = 'ada@example.com';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    expect(form.querySelector('[data-error]')).toBeNull();
    host.querySelector('[data-ssr-submit]').click();
    expect(host.querySelector('[data-ssr-messages]').textContent).toContain('Ada');

    document.body.removeChild(element);
  });

  it('switches the live app language', async () => {
    const page = SsrDemoPage();
    const element = page.render().renderDom();
    document.body.appendChild(element);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const findButton = (label) =>
      [...element.querySelectorAll('button')].find((button) => button.textContent === label);
    const host = () => document.querySelector('#ssr-demo-host');

    expect(host().textContent).toContain('注册表单');

    findButton('English').click();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    expect(host().textContent).toContain('Sign-up Form');
    expect(localStorage.getItem('yoya-ui:ssr-demo-locale')).toBe('en-US');

    // 交互重建（计数按钮）也保持英文，不回退默认语言
    host().querySelector('[data-ssr-counter] button').click();
    expect(host().querySelector('[data-ssr-counter]').textContent).toContain('Clicks: 1');

    document.body.removeChild(element);
  });

  it('persists the language choice across page reloads', async () => {
    const first = SsrDemoPage();
    const firstElement = first.render().renderDom();
    document.body.appendChild(firstElement);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const findButton = (label) =>
      [...firstElement.querySelectorAll('button')].find((button) => button.textContent === label);
    findButton('English').click();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    firstElement.remove();

    const second = SsrDemoPage();
    const secondElement = second.render().renderDom();
    document.body.appendChild(secondElement);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    expect(document.querySelector('#ssr-demo-host').textContent).toContain('Sign-up Form');

    document.body.removeChild(secondElement);
  });

  it('provides theme switching alongside i18n', async () => {
    const page = SsrDemoPage();
    const element = page.render().renderDom();
    document.body.appendChild(element);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const switchRoot = element.querySelector('[data-ssr-theme-switch]');
    expect(switchRoot).not.toBeNull();
    const darkButton = switchRoot.querySelector('[data-theme-mode="dark"]');
    expect(darkButton).not.toBeNull();
    expect(element.style.background).toContain('var(--yoya-color-bg');
    expect(element.querySelector('.ssr-demo-output').style.color).toContain(
      'var(--yoya-color-text'
    );

    darkButton.click();
    expect(document.documentElement.dataset.yoyaMode).toBe('dark');

    const findButton = (label) =>
      [...element.querySelectorAll('button')].find((button) => button.textContent === label);
    findButton('English').click();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const host = document.querySelector('#ssr-demo-host');
    expect(host.textContent).toContain('Sign-up Form');
    expect(document.documentElement.dataset.yoyaMode).toBe('dark');

    document.body.removeChild(element);
  });
});
