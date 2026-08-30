import { describe, expect, it } from 'vitest';
import { div, vButton, vClientOnly } from './index.js';
import { hydrate, renderToString } from './yoya.ssr.js';

describe('vClientOnly', () => {
  it('serializes only a placeholder for server-side rendering', () => {
    const page = () =>
      div((root) => {
        root.child(vClientOnly(() => div((item) => item.span('客户端内容'))));
      });

    const { html } = renderToString(page);

    expect(html).toContain('data-client-only');
    expect(html).not.toContain('客户端内容');
  });

  it('resolves the inner component when rendered in the browser', () => {
    const node = vClientOnly(() => vButton('按钮'));
    const element = node.renderDom();

    expect(element.tagName).toBe('BUTTON');
    expect(element.textContent).toBe('按钮');
  });

  it('replaces the placeholder during hydration', () => {
    const page = () =>
      div((root) => {
        root.child(vClientOnly(() => vButton('点击')));
      });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    hydrate(page, '#app');

    expect(document.querySelector('#app button')).not.toBeNull();
    expect(document.querySelector('#app [data-client-only]')).toBeNull();
  });
});
