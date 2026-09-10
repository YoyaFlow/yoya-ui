import { describe, expect, it } from 'vitest';
import { div, vStateNode } from '../index.js';
import { disableDevtools, enableDevtools, subscribeDevtools } from './devtools.js';

describe('binding ownership without a declared scope', () => {
  it('evaluates a zero-argument binding on a standalone node at build time', () => {
    const data = { x: 'v' };
    const box = div((ele) => ele.attr('data-x', () => data.x));
    const element = box.renderDom();

    expect(element.getAttribute('data-x')).toBe('v');

    data.x = 'next';
    box.flush();

    expect(element.getAttribute('data-x')).toBe('next');
  });

  it('still rejects a parameterized binding without a source', () => {
    expect(() => div((ele) => ele.attr('data-x', (source) => String(source.x)))).toThrow(
      /data source/
    );
  });

  it('is not driven by a host component', () => {
    const data = { label: 'A' };
    const box = div((ele) => ele.attr('data-label', () => data.label));
    const component = vStateNode({
      state: () => ({ tick: 0 }),
      render: () =>
        div((host) => {
          host.attr('data-tick', (s) => String(s.tick));
          host.child(box);
        })
    });
    component.setState({ tick: 1 });

    data.label = 'B';

    expect(box.attr('data-label')).toBe('A');

    box.flush();

    expect(box.attr('data-label')).toBe('B');
  });

  it('does not write the DOM when the value is unchanged', () => {
    const data = { label: 'A' };
    const box = div((ele) => ele.attr('data-label', () => data.label));
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
});
