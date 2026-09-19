/**
 * 票 45 / ②：`renderPage` 输出编译产物的 inert 模板块（放在 app 容器之外）。
 */
import { describe, expect, it } from 'vitest';
import { div } from '../yoya.core.js';
import { hydrate, parseState, renderPage, renderToString } from './ssr.js';

const pageConfig = {
  page(page) {
    page.body((body) => body.child(div((root) => root.span('app'))));
  }
};

describe('renderPage fragments', () => {
  it('emits inert template blocks outside the app container', () => {
    const html = renderPage(
      pageConfig,
      {},
      {
        fragments: [{ signature: 'sig-1', html: '<tr><td>row</td></tr>' }]
      }
    );

    expect(html).toContain('<template data-yoya-fragment="sig-1"><tr><td>row</td></tr></template>');

    // 模板在 #app 容器之外：hydrate 的根内收养看不到它
    const containerEnd = html.indexOf('</div>');
    const templateStart = html.indexOf('<template');
    expect(templateStart).toBeGreaterThan(containerEnd);
  });

  it('keeps the document byte-identical when no fragments are passed', () => {
    expect(renderPage(pageConfig, {}, {})).toBe(renderPage(pageConfig, {}, { fragments: [] }));
  });

  it('hydrates the app container without touching the fragment templates', () => {
    const buildPage = () => div((root) => root.span('server'));
    const { html, state } = renderToString(buildPage, { state: {} });

    // 与 renderPage 的产物同形：#app 容器 + 容器外一个 inert 模板块
    document.body.innerHTML =
      `<div id="app">${html}</div>` +
      '<template data-yoya-fragment="sig-1"><tr><td>row</td></tr></template>';

    const appSpan = document.querySelector('#app span');
    const template = document.querySelector('template[data-yoya-fragment]');

    hydrate(buildPage, '#app', parseState(state));

    expect(document.querySelector('#app span')).toBe(appSpan); // 收养既有 DOM
    expect(document.querySelector('template[data-yoya-fragment]')).toBe(template); // 模板没被动
    expect(document.querySelector('#app').querySelectorAll('template').length).toBe(0); // 不在容器内
  });
});
