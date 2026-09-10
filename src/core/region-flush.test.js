import { describe, expect, it, vi } from 'vitest';
import { div, vStateNode, vText } from '../index.js';
import { disableDevtools, enableDevtools, subscribeDevtools } from './devtools.js';

describe('region flush', () => {
  it('writes values back without rebuilding structure', () => {
    const data = { label: 'A' };
    const box = div((ele) => {
      ele.rebuildable();
      ele.span((line) => {
        line.attr('data-region-label', 'true');
        line.child(vText(() => data.label));
      });
    });
    const element = box.renderDom();
    const labelElement = element.querySelector('[data-region-label]');

    expect(labelElement.textContent).toBe('A');

    data.label = 'B';
    box.flush();

    expect(element.querySelector('[data-region-label]')).toBe(labelElement);
    expect(labelElement.textContent).toBe('B');

    box.rebuild();

    expect(element.querySelector('[data-region-label]')).not.toBe(labelElement);
  });

  it('skips DOM writes when values did not change', () => {
    const data = { label: 'A' };
    const box = div((ele) => {
      ele.rebuildable();
      ele.attr('data-label', () => data.label);
    });
    box.renderDom();

    const events = [];
    disableDevtools();
    enableDevtools();
    const unsubscribe = subscribeDevtools((event) => {
      if (event.type === 'attr' || event.type === 'text') {
        events.push(event);
      }
    });

    box.flush();
    box.flush();

    expect(events).toHaveLength(0);

    unsubscribe();
    disableDevtools();
  });

  it('does not consult the predicate', () => {
    const guard = vi.fn(() => false);
    const data = { label: 'A' };
    const box = div((ele) => {
      ele.rebuildable(guard);
      ele.attr('data-label', () => data.label);
    });
    const element = box.renderDom();

    data.label = 'B';
    box.flush();

    expect(guard).not.toHaveBeenCalled();
    expect(box.rebuildPending()).toBe(false);
    expect(element.getAttribute('data-label')).toBe('B');
  });

  it('flushes safely before the component is mounted', () => {
    const data = { label: 'A' };
    const component = vStateNode({
      state: () => ({ tick: 0 }),
      render() {
        return div((host) => {
          host.rebuildable();
          host.attr('data-label', () => data.label);
        });
      }
    });

    component.render();

    data.label = 'B';

    expect(() => component.flush()).not.toThrow();

    const element = component.render().renderDom();

    expect(element.getAttribute('data-label')).toBe('B');
  });

  it('flushes every binding of a component, regions included', () => {
    const data = { label: 'x', total: 1 };
    let region = null;
    const component = vStateNode({
      state: () => ({ tick: 0 }),
      render() {
        return div((host) => {
          host.attr('data-outside', () => String(data.total));
          host.div((ele) => {
            region = ele;
            ele.rebuildable();
            ele.attr('data-inside', () => data.label);
          });
        });
      }
    });
    const host = div().child(component);
    const element = host.renderDom();

    const panel = element.firstElementChild;
    expect(panel.getAttribute('data-outside')).toBe('1');

    data.total = 2;
    data.label = 'y';
    component.flush();

    expect(panel.getAttribute('data-outside')).toBe('2');
    expect(element.querySelector('[data-inside]').getAttribute('data-inside')).toBe('y');
    expect(region.rebuildPending()).toBe(false);
  });
});
