import { describe, expect, it } from 'vitest';
import { SsrDocumentationPage } from './ssr-docs.js';

const mockCanvasContext = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === 'canvas') {
        return document.createElement('canvas');
      }
      if (prop === 'measureText') {
        return () => ({ width: 0 });
      }
      return typeof prop === 'string' ? () => {} : undefined;
    }
  }
);

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => mockCanvasContext;
});

describe('SSR docs page', () => {
  it('renders the demo and hydrates the live host', async () => {
    const page = SsrDocumentationPage();
    const element = page.renderDom();
    document.body.appendChild(element);

    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const host = document.querySelector('#ssr-live-host');

    expect(element.getAttribute('data-ssr-page')).toBe('true');
    expect(element.querySelector('[data-ssr-copy-guide]')).not.toBeNull();
    const standalone = element.querySelector('[data-ssr-standalone-link]');
    expect(standalone).not.toBeNull();
    expect(standalone.getAttribute('target')).toBe('_blank');
    expect(standalone.getAttribute('href')).toContain('ssr-demo.html');
    expect(element.textContent).toContain('server.mjs');
    expect(element.textContent).toContain('client.js');
    expect(element.textContent).toContain('renderToString');
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
    const outputPanel = () => element.querySelector('[data-ssr-live-output]');

    expect(findButton('非 SSR 模式')).not.toBeUndefined();

    findButton('非 SSR 模式').click();

    expect(outputPanel().textContent).toContain('非 SSR');
    expect(host().textContent).toContain('欢迎使用服务端渲染');

    findButton('SSR 模式').click();

    expect(outputPanel().textContent).toContain('data-client-only');
    expect(host().textContent).toContain('欢迎使用服务端渲染');

    document.body.removeChild(element);
  });

  it('switches the live app language between Chinese and English', async () => {
    const page = SsrDocumentationPage();
    const element = page.renderDom();
    document.body.appendChild(element);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const findButton = (label) =>
      [...element.querySelectorAll('button')].find((button) => button.textContent === label);
    const host = () => document.querySelector('#ssr-live-host');

    expect(host().textContent).toContain('欢迎使用服务端渲染');

    findButton('English').click();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    expect(host().textContent).toContain('Welcome to SSR');

    findButton('中文').click();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    expect(host().textContent).toContain('欢迎使用服务端渲染');

    document.body.removeChild(element);
  });
});
