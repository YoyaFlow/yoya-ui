import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, div, p, ref, vNode, vstack, vText } from '../index.js';
import { ComponentNode, ViewNode } from './node.js';
import { renderToString } from './ssr.js';

let errorSpy = null;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

function CounterCard() {
  const count = ref(0);

  return vNode((api) => {
    api.bump = () => {
      count.value += 1;
      return api;
    };
    api.read = () => count.value;

    return vstack({ gap: '8px' }, (stack) => {
      stack.output((out) => out.child(vText(computed(() => `计数 ${count.value}`))));
      stack.vButton('+1', (button) => button.on('click', () => api.bump()));
    });
  });
}

function mount(node) {
  document.body.innerHTML = '';
  const host = document.createElement('div');
  document.body.appendChild(host);
  node.bindTo(host);
  return host;
}

describe('vNode component factory', () => {
  it('returns a node: usable as a root and as a child', () => {
    const card = CounterCard();

    expect(card).toBeInstanceOf(ComponentNode);
    expect(card).toBeInstanceOf(ViewNode);

    const asRoot = mount(card);
    expect(asRoot.textContent).toContain('计数 0');

    const asChild = mount(div((box) => box.child(CounterCard())));
    expect(asChild.textContent).toContain('计数 0');

    asChild.querySelector('button').click();
    expect(asChild.textContent).toContain('计数 1');
  });

  it('adds no placeholder element and renders arrays as a fragment', () => {
    const single = mount(CounterCard());
    expect(single.children).toHaveLength(1);
    expect(single.firstElementChild.className).toContain('yoya-vstack');

    const multi = mount(vNode(() => [p('A'), p('B')]));
    expect(multi.children).toHaveLength(2);
    expect(multi.textContent).toBe('AB');
  });

  it('attaches commands to the node itself, and `return api` returns the node', () => {
    const card = CounterCard();

    expect(card.read()).toBe(0);
    expect(card.bump()).toBe(card);
    expect(card.bump().read()).toBe(2);
  });

  it('rejects command names that collide with the node API', () => {
    expect(() => vNode((api) => ((api.child = () => {}), p('x')))).toThrow(/collides/);
    expect(() => vNode((api) => ((api.whenFailed = () => {}), p('x')))).toThrow(/collides/);
    expect(() => vNode((api) => ((api.render = () => {}), p('x')))).toThrow(/collides/);
    expect(() => vNode((api) => ((api._hidden = () => {}), p('x')))).toThrow(/collides/);
    expect(() => vNode((api) => ((api.mountable = () => {}), p('x')))).toThrow(/collides/);
    expect(() => vNode((api) => ((api.destroy = () => {}), p('x')))).toThrow(/collides/);
  });

  it('rejects non-command api values and invalid setup results', () => {
    expect(() => vNode()).toThrow(/setup function/);
    expect(() => vNode(() => 'not a node')).toThrow(/must return a ViewNode/);
    expect(() => vNode(() => [p('a'), 'b'])).toThrow(/must return a ViewNode/);
    expect(() =>
      vNode((api) => {
        api.value = 1;
        return p('x');
      })
    ).toThrow(/only collects command methods/);
  });

  it('keeps error boundaries declared inside setup working', () => {
    const card = vNode((api) => {
      api.name = () => 'boundary-card';

      return div((box) => {
        box.whenFailed(() => p('降级内容'));
        box.p('正常内容');
        box.button('触发', (button) => {
          button.on('click', () => {
            throw new Error('event boom');
          });
        });
      });
    });

    const host = mount(div((box) => box.child(card)));
    expect(host.textContent).toContain('正常内容');

    host.querySelector('button').click();

    expect(host.textContent).toContain('降级内容');
    expect(errorSpy.mock.calls[0][2].phase).toBe('event');
  });

  it('renders on the server through renderToString', () => {
    const { html } = renderToString(CounterCard());

    expect(html).toContain('计数 0');
  });

  it('keeps node-level capabilities such as mountable()', () => {
    const visible = ref(true);
    const card = CounterCard().mountable(visible);
    const host = mount(div((box) => box.child(card)));

    expect(host.textContent).toContain('计数 0');

    visible.value = false;

    expect(host.textContent.trim()).not.toContain('计数');
  });
});
