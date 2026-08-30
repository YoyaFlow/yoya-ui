import { describe, expect, it } from 'vitest';
import { hydrate, parseState, renderToString } from '../../yoya.ssr.js';
import { createSsrPage } from './page.js';

describe('SSR example page', () => {
  it('renders, hydrates and stays interactive end to end', () => {
    const { html, state } = renderToString(createSsrPage, {
      state: { locale: 'zh-CN', path: '/home' }
    });

    expect(html).toContain('SSR 示例');
    expect(html).toContain('欢迎使用服务端渲染');
    expect(html).toContain('该项为必填');
    expect(html).toContain('data-client-only');
    expect(html).not.toContain('yoya-vechart');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    hydrate(createSsrPage, '#app', parseState(state));

    expect(document.querySelector('#app').textContent).toContain('欢迎使用服务端渲染');
    expect(document.querySelector('#app [data-error]')).not.toBeNull();
    expect(document.querySelector('#app').textContent).not.toContain('图表页');
    expect(document.querySelector('#app .yoya-vechart')).not.toBeNull();

    const input = document.querySelector('#app input[name="email"]');
    input.value = 'user@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.querySelector('#app [data-error]')).toBeNull();

    document.querySelector('#app a[href="#/chart"]').click();

    expect(document.querySelector('#app').textContent).toContain('图表页');
  });
});
