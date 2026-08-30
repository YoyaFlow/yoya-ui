import { describe, expect, it } from 'vitest';
import { div, vButton, vClientOnly, vStateNode } from './index.js';
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

  it('renders client-only islands without server HTML', () => {
    const page = div((root) => {
      root.child(vClientOnly(() => vButton('按钮')));
    });

    const element = page.renderDom();

    expect(element.querySelector('button').textContent).toBe('按钮');
  });

  it('supports component object loaders in plain client rendering', () => {
    const counter = vClientOnly(() =>
      vStateNode({
        state: { count: 1 },
        render(state, component) {
          return div((root) => {
            root.span(`n=${state.count}`);
            root.button('+').on('click', () => component.setState({ count: state.count + 1 }));
          });
        }
      })
    );
    const element = counter.renderDom();
    document.body.appendChild(element);

    element.querySelector('button').click();

    expect(document.body.textContent).toContain('n=2');
  });

  it('hydrates a component object island and keeps it interactive', () => {
    const page = () =>
      div((root) => {
        root.child(
          vClientOnly(() =>
            vStateNode({
              state: { count: 2 },
              render(state, component) {
                return div((inner) => {
                  inner.span(`n=${state.count}`);
                  inner
                    .button('+')
                    .on('click', () => component.setState({ count: state.count + 1 }));
                });
              }
            })
          )
        );
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
