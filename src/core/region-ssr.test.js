import { describe, expect, it } from 'vitest';
import { computed, div, ref, vText } from '../index.js';
import { hydrate, parseState, renderToString } from './ssr.js';

function createRegionPage(initial = {}) {
  const total = initial?.total ?? 0;
  const scope = initial?.scope ?? 'none';
  const totalRef = ref(total);
  const scopeRef = ref(scope);

  return div((ele) => {
    ele.rebuildable(() => false);
    ele.attr('data-scope', scopeRef);
    ele.child(vText(computed(() => `${totalRef.value} 项`)));
  });
}

describe('rebuildable region SSR first paint', () => {
  it('serializes region bound values into the server HTML', () => {
    const { html } = renderToString(createRegionPage, { state: { total: 3, scope: 'A' } });

    expect(html).toContain('data-scope="A"');
    expect(html).toContain('3 项');
  });

  it('builds the region exactly once per server render', () => {
    let builds = 0;
    const createPage = () =>
      div((ele) => {
        ele.rebuildable();
        builds += 1;
        ele.text('x');
      });

    renderToString(createPage);
    expect(builds).toBe(1);

    renderToString(createPage);
    expect(builds).toBe(2);
  });

  it('keeps request data isolated between renders', () => {
    const first = renderToString(createRegionPage, { state: { total: 1, scope: 'A' } });
    const second = renderToString(createRegionPage, { state: { total: 2, scope: 'B' } });

    expect(first.html).toContain('data-scope="A"');
    expect(first.html).toContain('1 项');
    expect(second.html).toContain('data-scope="B"');
    expect(second.html).toContain('2 项');
    expect(first.html).not.toContain('data-scope="B"');
  });

  it('hydrates the server HTML and keeps the region content', () => {
    const { html, state } = renderToString(createRegionPage, { state: { total: 5, scope: 'C' } });
    document.body.innerHTML = `<div id="app">${html}</div>`;
    const regionBefore = document.querySelector('#app div');

    hydrate(createRegionPage, '#app', parseState(state));

    expect(document.querySelector('#app div')).toBe(regionBefore);
    expect(document.querySelector('#app div').getAttribute('data-scope')).toBe('C');
    expect(document.querySelector('#app').textContent).toBe('5 项');
  });
});
