import { describe, expect, it, vi } from 'vitest';
import { div, vStateNode, vText } from '../index.js';
import { vTbody, vTr } from '../data-display/table.js';

describe('vStateNode fragment', () => {
  it('renders the configured view root without an extra wrapper element', () => {
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render() {
        return div().attr('data-root', 'true').child(vText('0'));
      }
    });
    const element = component.render().renderDom();

    expect(element.getAttribute('data-root')).toBe('true');
    expect(element.tagName).toBe('DIV');
  });

  it('works as a table row without wrapper nodes', () => {
    const row = vStateNode({
      state: () => ({ name: 'Ada' }),
      render(state) {
        return vTr((tr) => tr.vTd(state.name));
      }
    });
    const element = vTbody().child(row).renderDom();

    expect(element.children.length).toBe(1);
    expect(element.firstElementChild.tagName).toBe('TR');
    expect(element.firstElementChild.textContent).toBe('Ada');
  });

  it('swaps the view root in place after a full rebuild', () => {
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(state) {
        return div(vText(String(state.count)));
      }
    });
    const host = div().child(component);
    const container = host.renderDom();
    const first = container.firstElementChild;

    expect(container.textContent).toBe('0');

    component.setState({ count: 1 });

    expect(container.children.length).toBe(1);
    expect(container.firstElementChild).not.toBe(first);
    expect(container.textContent).toBe('1');
  });

  it('clears subscriptions when destroyed through the view tree', () => {
    const listener = vi.fn();
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render() {
        return div(vText('0'));
      }
    });
    component.subscribe(listener);
    const host = div().child(component);

    host.renderDom();
    host.destroy();

    component.setState({ count: 1 });

    expect(listener).not.toHaveBeenCalled();
  });
});
