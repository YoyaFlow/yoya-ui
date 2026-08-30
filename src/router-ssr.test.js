// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createRouter } from './index.js';
import { renderToString } from './yoya.ssr.js';

function createApp(initial = {}) {
  const router = createRouter();
  router.route('/home', '首页');
  router.route('/user/:id', { view: (context) => `用户 ${context.params.id}` });
  router.notFound('未找到');
  router.renderPath(initial.path || '/');
  return router;
}

describe('router server render', () => {
  it('renders the matched route with path params', () => {
    const { html } = renderToString(createApp, { state: { path: '/user/7' } });

    expect(html).toContain('用户 7');
  });

  it('renders the not-found view for unknown paths', () => {
    const { html } = renderToString(createApp, { state: { path: '/missing' } });

    expect(html).toContain('未找到');
  });

  it('respects guards during server render', () => {
    const guarded = () => {
      const router = createRouter();
      router.beforeEach((to) => to.path !== '/secret');
      router.route('/secret', '机密');
      router.route('/public', '公开');
      router.renderPath('/secret');
      return router;
    };

    const { html } = renderToString(guarded);

    expect(html).not.toContain('机密');
  });
});
