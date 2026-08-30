import { describe, expect, it } from 'vitest';
import { SsrDocumentationPage } from './ssr-docs.js';

describe('SSR docs page', () => {
  it('renders the demo and hydrates the live host', async () => {
    const page = SsrDocumentationPage();
    const element = page.renderDom();
    document.body.appendChild(element);

    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const host = document.querySelector('#ssr-live-host');

    expect(element.getAttribute('data-ssr-page')).toBe('true');
    expect(host.textContent).toContain('欢迎使用服务端渲染');

    document.body.removeChild(element);
  });

  it('toggles between SSR and non-SSR rendering modes', async () => {
    const page = SsrDocumentationPage();
    const element = page.renderDom();
    document.body.appendChild(element);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const findButton = (label) =>
      [...element.querySelectorAll('button')].find((button) => button.textContent === label);
    const host = () => document.querySelector('#ssr-live-host');
    const outputPanel = () => element.querySelector('.ssr-demo-output');

    expect(findButton('非 SSR 模式')).not.toBeUndefined();

    findButton('非 SSR 模式').click();

    expect(outputPanel().textContent).toContain('非 SSR');
    expect(host().textContent).toContain('欢迎使用服务端渲染');

    findButton('SSR 模式').click();

    expect(outputPanel().textContent).toContain('data-client-only');
    expect(host().textContent).toContain('欢迎使用服务端渲染');

    document.body.removeChild(element);
  });
});
