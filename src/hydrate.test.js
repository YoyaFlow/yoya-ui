import { describe, expect, it } from 'vitest';
import { div, vStateNode } from './index.js';
import { hydrate, parseState, renderToString } from './yoya.ssr.js';

function createCounterPage(initialState = { count: 0 }) {
  return vStateNode({
    state: { count: initialState.count ?? 0 },
    render(state, component) {
      return div((page) => {
        page.span(`计数：${state.count}`);
        page.button(`+${state.count}`).on('click', () => {
          component.setState({ count: state.count + 1 });
        });
      });
    }
  });
}

describe('hydrate', () => {
  it('adopts the server DOM, keeps node identity, and binds events', () => {
    const { html, state } = renderToString(createCounterPage, { state: { count: 2 } });
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const buttonBefore = document.querySelector('#app button');
    const spanBefore = document.querySelector('#app span');

    hydrate(createCounterPage, '#app', parseState(state));

    expect(document.querySelector('#app button')).toBe(buttonBefore);
    expect(document.querySelector('#app span')).toBe(spanBefore);
    expect(document.querySelector('#app span').textContent).toBe('计数：2');

    document.querySelector('#app button').click();

    expect(document.querySelector('#app span').textContent).toBe('计数：3');
    expect(document.querySelector('#app button').textContent).toBe('+3');
  });

  it('reapplies attributes onto adopted elements', () => {
    const page = () =>
      div((root) => {
        root.div((row) => {
          row.attr({ 'data-row': '7', role: 'row' }).span('第七行');
        });
      });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const rowBefore = document.querySelector('#app [data-row]');

    hydrate(page, '#app');

    expect(document.querySelector('#app [data-row]')).toBe(rowBefore);
    expect(rowBefore.getAttribute('role')).toBe('row');
    expect(rowBefore.textContent).toBe('第七行');
  });

  it('hydrates a 1000-row page', () => {
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      id: String(index),
      label: `行 ${index}`
    }));
    const page = () =>
      div((root) => {
        rows.forEach((row) => {
          root.div((item) => {
            item.attr('data-row', row.id).span(row.label);
          });
        });
      });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    hydrate(page, '#app');

    const elements = document.querySelectorAll('#app [data-row]');
    expect(elements).toHaveLength(1000);
    expect(elements[999].textContent).toBe('行 999');
  });

  it('creates the tree when the container is empty', () => {
    document.body.innerHTML = '<div id="app"></div>';

    hydrate(createCounterPage, '#app', { count: 5 });

    expect(document.querySelector('#app button').textContent).toBe('+5');
    document.querySelector('#app button').click();
    expect(document.querySelector('#app span').textContent).toBe('计数：6');
  });
});
