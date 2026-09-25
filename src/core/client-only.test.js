import { describe, expect, it } from 'vitest';
import { computed, div, ref, vButton, vClientOnly, vText } from '../index.js';
import { hydrate, renderToString } from '../yoya.ssr.js';

/** 客户端专属计数岛：数据在闭包、视图由定义函数返回（票 07：对象组件已退场）。 */
function createCounterIsland(initial = 1) {
  const count = ref(initial);

  return () =>
    div((root) => {
      root.span((line) => line.child(vText(computed(() => `n=${count.value}`))));
      root.button('+', (button) => {
        button.on('click', () => {
          count.value += 1;
        });
      });
    });
}

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

  it('renders client-only islands without server HTML', () => {
    const page = div((root) => {
      root.child(vClientOnly(() => vButton('按钮')));
    });

    const element = page.renderDom();

    expect(element.querySelector('button').textContent).toBe('按钮');
  });

  it('supports definition-function loaders in plain client rendering', () => {
    const counter = vClientOnly(() => createCounterIsland(1));
    const element = counter.renderDom();
    document.body.appendChild(element);

    element.querySelector('button').click();

    expect(document.body.textContent).toContain('n=2');
  });

  it('hydrates a definition-function island and keeps it interactive', () => {
    const page = () =>
      div((root) => {
        root.child(vClientOnly(() => createCounterIsland(2)));
      });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    hydrate(page, '#app');

    const button = document.querySelector('#app button');
    expect(button).not.toBeNull();
    button.click();
    expect(document.querySelector('#app').textContent).toContain('n=3');
  });
});
