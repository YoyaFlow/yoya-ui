import { beforeEach, describe, expect, it } from 'vitest';
import { renderRouterExample } from './router-demo.js';

describe('examples/router router demo', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="router-root"></main>';
    window.history.replaceState(null, '', '/');
  });

  it('renders the router shell and default overview route', () => {
    const root = renderRouterExample('#router-root');

    expect(root.tagName()).toBe('section');
    expect(document.querySelector('#router-demo h1').textContent).toBe('Router 路由演示');
    expect(document.querySelector('#router-current-path').textContent).toBe('当前路径：/overview');
    expect(document.querySelector('#router-view').textContent).toContain('路由概览');
    expect(document.querySelectorAll('[data-router-link]')).toHaveLength(5);
  });

  it('navigates to a dynamic route and renders params with query', () => {
    renderRouterExample('#router-root');

    document.querySelector('[data-router-link="/users/42?tab=profile"]').click();

    expect(window.location.hash).toBe('#/users/42?tab=profile');
    expect(document.querySelector('#router-current-path').textContent).toBe('当前路径：/users/42?tab=profile');
    expect(document.querySelector('#router-view').textContent).toContain('用户 42');
    expect(document.querySelector('#router-view').textContent).toContain('当前标签：profile');
    expect(document.querySelector('[data-router-link="/users/42?tab=profile"]').getAttribute('aria-current')).toBe(
      'page'
    );
  });

  it('renders not found and keeps blocked route from entering', () => {
    renderRouterExample('#router-root');

    document.querySelector('[data-router-link="/missing"]').click();
    expect(document.querySelector('#router-view').textContent).toContain('未找到 /missing');

    document.querySelector('[data-router-link="/admin"]').click();
    expect(document.querySelector('#router-view').textContent).toContain('未找到 /missing');
    expect(document.querySelector('#router-guard-message').textContent).toBe('守卫拦截：/admin 需要权限');
  });
});
