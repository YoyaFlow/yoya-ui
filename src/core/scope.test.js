import { describe, expect, it } from 'vitest';
import { div, vStateNode, vText } from '../index.js';
import { renderToString } from './ssr.js';

describe('scope() binding source', () => {
  it('feeds parameterized bindings without requiring rebuildable()', () => {
    const data = { title: 'A', count: 0 };
    const card = div((root) => {
      root.scope(() => data);
      root.div((head) => head.span((line) => line.child(vText((d) => d.title))));
      root.div((body) => {
        body.div((mid) => mid.attr('data-count', (d) => String(d.count)));
      });
    });
    const element = card.renderDom();

    expect(element.textContent).toBe('A');
    expect(element.querySelector('[data-count]').getAttribute('data-count')).toBe('0');

    data.title = 'B';
    data.count = 1;
    card.flush();

    expect(element.textContent).toBe('B');
    expect(element.querySelector('[data-count]').getAttribute('data-count')).toBe('1');
  });

  it('overrides the inherited host state inside a component', () => {
    const data = { label: 'source' };
    const component = vStateNode({
      state: () => ({ label: 'host' }),
      render: () =>
        div((box) => {
          box.scope(() => data);
          box.attr('data-label', (s) => s.label);
        })
    });
    const element = component.render().renderDom();

    expect(element.getAttribute('data-label')).toBe('source');

    component.setState({ label: 'host2' });

    expect(element.getAttribute('data-label')).toBe('source');
  });

  it('rejects non-function getters', () => {
    expect(() => div((ele) => ele.scope({ label: 'x' }))).toThrow(/scope\(\) requires a function/);
  });

  it('writes standalone zero-argument bindings into SSR output', () => {
    const data = { label: 'server' };
    const html = renderToString(() => div((ele) => ele.attr('data-label', () => data.label)));

    expect(html.html).toContain('data-label="server"');
  });
});
