// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { div, vRadios, vStateNode } from './index.js';
import { parseState, renderToString, serializeState } from './yoya.ssr.js';
import { radioGroups } from './form/controls.js';

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

describe('renderToString', () => {
  it('renders a ViewNode to HTML without a DOM', () => {
    const { exceeded, html } = renderToString(div((root) => root.span('hello')));

    expect(exceeded).toBe(false);
    expect(html).toBe('<div><span>hello</span></div>');
  });

  it('escapes attribute values in the serialized HTML', () => {
    const { html } = renderToString(div((root) => root.div().attr('data-x', '<b>&"\'</b>')));

    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
  });

  it('supports function factories and passes the initial state through', () => {
    const { html, state } = renderToString(createCounterPage, { state: { count: 3 } });

    expect(html).toContain('计数：3');
    expect(html).toContain('+3');
    expect(JSON.parse(state)).toEqual({ count: 3 });
  });

  it('supports component objects with a render method', () => {
    const component = {
      render() {
        return div((root) => root.span('object'));
      }
    };
    const { html } = renderToString(component);

    expect(html).toBe('<div><span>object</span></div>');
  });

  it('supports reusing a stateful component object across renders', () => {
    const page = createCounterPage({ count: 1 });

    const first = renderToString(page);
    const second = renderToString(page);

    expect(first.html).toContain('计数：1');
    expect(second.html).toBe(first.html);
  });

  it('flags oversized trees for client-side fallback instead of rendering them', () => {
    const page = div((root) => {
      for (let index = 0; index < 100; index += 1) {
        root.span(String(index));
      }
    });

    const { exceeded, html } = renderToString(page, { maxNodes: 50 });

    expect(exceeded).toBe(true);
    expect(html).toBe('');
  });
});

describe('state serialization', () => {
  it('serializes state as JSON safe for inline scripts', () => {
    const serialized = serializeState({ payload: '</script><script>alert(1)</script>' });

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c');
    expect(JSON.parse(serialized)).toEqual({ payload: '</script><script>alert(1)</script>' });
  });

  it('round-trips state through parseState', () => {
    const original = { items: [1, 2, 3], label: 'a<b' };

    expect(parseState(serializeState(original))).toEqual(original);
    expect(parseState(null)).toBeNull();
  });
});

describe('deterministic ids across renders', () => {
  it('produces identical HTML for identical input across renders', () => {
    const page = () =>
      div((root) => {
        root.vPagination({ total: 100 });
      });

    const first = renderToString(page);
    const second = renderToString(page);

    expect(second.html).toBe(first.html);
  });

  it('keeps ids unique across instances in a single render', () => {
    const { html } = renderToString(() =>
      div((root) => {
        root.vTimerRange();
        root.vTimerRange();
      })
    );
    const ids = [...html.matchAll(/yoya-vtimer-range-error-(\d+)/g)].map((match) => match[1]);

    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('server render lifecycle cleanup', () => {
  it('unregisters radio groups after factory renders', () => {
    const page = () => vRadios({ name: 'choice', options: ['a', 'b'], value: 'a' });

    renderToString(page);
    expect(radioGroups.size).toBe(0);

    renderToString(page);
    expect(radioGroups.size).toBe(0);
  });

  it('does not destroy caller-owned ViewNodes', () => {
    const page = div((root) => root.span('keep'));

    const { html } = renderToString(page);

    expect(page.toHTML()).toBe(html);
  });
});
