import { describe, expect, it, vi } from 'vitest';
import { ProvideInjectDocumentationPage } from './provide-inject-docs.js';

function mountPage() {
  const view = ProvideInjectDocumentationPage();
  const element = view.renderDom();
  return { element, view };
}

function demoOf(element, id) {
  return element.querySelector(`[data-provide-inject-demo="${id}"]`);
}

function liveOf(element, id) {
  return demoOf(element, id).querySelector('[data-provide-inject-demo-live]');
}

function buttonOf(element, id, label) {
  return [...demoOf(element, id).querySelectorAll('button')].find((button) =>
    button.textContent.includes(label)
  );
}

describe('provide / inject documentation page', () => {
  it('renders three live demos with their own source panels', () => {
    const { element, view } = mountPage();
    const ids = [...element.querySelectorAll('[data-provide-inject-demo]')].map(
      (demo) => demo.dataset.provideInjectDemo
    );
    const sources = [...element.querySelectorAll('[data-source-example]')].map(
      (panel) => panel.dataset.sourceExample
    );

    expect(ids).toEqual(['workspace', 'override', 'async']);
    expect(sources).toEqual(['跨层共享核心源码', '就近覆盖核心源码', '异步视图核心源码']);

    view.destroy();
  });

  it('updates the shared workspace in place from page shell buttons', () => {
    const { element, view } = mountPage();
    const live = liveOf(element, 'workspace');
    const summary = live.querySelector('p');
    const state = live.querySelector('[data-project-state]');

    expect(summary.textContent).toBe('项目：yoya-ui，6 人');
    expect(state.textContent).toBe('已同步');

    buttonOf(element, 'workspace', '改名').click();

    expect(live.querySelector('p')).toBe(summary);
    expect(summary.textContent).toBe('项目：yoya-flow，6 人');
    expect(state.textContent).toBe('有未保存改动');

    buttonOf(element, 'workspace', '转交').click();

    expect(live.querySelector('[data-project-owner]').textContent).toBe('负责人：Bob');
    expect(state.textContent).toBe('有未保存改动');

    view.destroy();
  });

  it('scopes a nested declaration to its own subtree', () => {
    const { element, view } = mountPage();
    const live = liveOf(element, 'override');
    const textOf = (scope) => live.querySelector(`[data-theme-scope="${scope}"]`).textContent;

    expect(textOf('外层')).toBe('外层：light');
    expect(textOf('内层')).toBe('内层：dark');
    expect(textOf('外层兄弟')).toBe('外层兄弟：light');

    buttonOf(element, 'override', '切换外层主题').click();

    expect(textOf('外层')).toBe('外层：dark');
    expect(textOf('内层')).toBe('内层：dark');
    expect(textOf('外层兄弟')).toBe('外层兄弟：dark');

    view.destroy();
  });

  it('keeps an asynchronously built view inside the ancestor scope', async () => {
    const { element, view } = mountPage();
    const live = liveOf(element, 'async');

    buttonOf(element, 'async', '加载视图').click();

    await vi.waitFor(() => {
      expect(live.querySelector('[data-async-tenant]')).toBeTruthy();
    });
    expect(live.querySelector('[data-async-tenant]').textContent).toBe('租户：acme');

    buttonOf(element, 'async', '切换租户').click();

    expect(live.querySelector('[data-async-tenant]').textContent).toBe('租户：globex');

    view.destroy();
  });
});
