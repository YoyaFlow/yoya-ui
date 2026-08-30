import { describe, expect, it } from 'vitest';
import { div, createRouter, vLink } from './index.js';
import { hydrate, parseState, renderToString } from './yoya.ssr.js';

let activeRouter = null;

function createApp(initial = {}) {
  const router = createRouter();
  activeRouter = router;
  router.route('/home', '首页');
  router.route('/user/:id', { view: (context) => `用户 ${context.params.id}` });
  router.notFound('未找到');

  const page = div((root) => {
    root.child(vLink(router, { label: '首页链接', to: '/home' }));
    root.child(vLink(router, { label: '用户 9 链接', to: '/user/9' }));
    root.child(router);
  });
  router.renderPath(initial.path || '/');
  return page;
}

describe('router hydration and navigation takeover', () => {
  it('adopts the server-rendered route and takes over navigation', () => {
    const { html, state } = renderToString(createApp, { state: { path: '/user/9' } });
    document.body.innerHTML = `<div id="app">${html}</div>`;

    expect(document.querySelector('#app').textContent).toContain('用户 9');
    expect(document.querySelector('a.is-active').textContent).toContain('用户 9 链接');

    hydrate(createApp, '#app', parseState(state));
    const router = activeRouter;

    expect(document.querySelector('#app').textContent).toContain('用户 9');

    window.location.hash = '#/user/9';
    router.start();

    expect(document.querySelector('#app').textContent).toContain('用户 9');

    document.querySelector('a[href="#/home"]').click();

    expect(document.querySelector('#app').textContent).toContain('首页');
    expect(document.querySelector('a.is-active').textContent).toContain('首页链接');
  });
});
