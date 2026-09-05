import { describe, expect, it } from 'vitest';
import { div, span, vStateNode } from '../index.js';
import { vTbody, vTr } from '../data-display/table.js';

describe('multi-root fragments', () => {
  it('mounts multiple vStateNode roots as direct children without a wrapper', () => {
    const group = vStateNode({
      state: () => ({ names: ['Ada', 'Bob'] }),
      render(state) {
        return state.names.map((name) => vTr((tr) => tr.vTd(name)));
      }
    });
    const element = vTbody().child(group).renderDom();

    expect(element.children.length).toBe(2);
    expect(element.children[0].tagName).toBe('TR');
    expect(element.children[0].textContent).toBe('Ada');
    expect(element.children[1].textContent).toBe('Bob');
  });

  it('swaps a mounted multi-root fragment after a full rebuild', () => {
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(state) {
        return state.count === 0
          ? [div('a'), div('b')]
          : [div('c'), div('d'), div('e')];
      }
    });
    const host = div().child(component);
    const container = host.renderDom();
    const first = container.children[0];

    expect(container.children.length).toBe(2);
    expect(container.textContent).toBe('ab');

    component.setState({ count: 1 });

    expect(container.children.length).toBe(3);
    expect(container.children[0]).not.toBe(first);
    expect(container.textContent).toBe('cde');
  });

  it('renders a plain component returning an array of roots', () => {
    const component = () => [span('a'), span('b')];
    const element = div().child(component).renderDom();

    expect(element.children.length).toBe(2);
    expect(element.children[0].tagName).toBe('SPAN');
    expect(element.textContent).toBe('ab');
  });

  it('serializes multi-root fragments inline for SSR', () => {
    const component = vStateNode({
      state: () => ({ label: 'x' }),
      render(state) {
        return [span(state.label), span('y')];
      }
    });
    const html = div().child(component).toHTML();

    expect(html).toContain('<span>x</span><span>y</span>');
  });
});
