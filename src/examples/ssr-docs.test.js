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
});
