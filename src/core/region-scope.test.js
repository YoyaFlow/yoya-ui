import { describe, expect, it } from 'vitest';
import { div, vStateNode } from '../index.js';

describe('region binding scope', () => {
  it('feeds zero-argument closures from the surrounding scope', () => {
    const data = { label: 'a' };
    const box = div((ele) => {
      ele.rebuildable();
      ele.attr('data-label', () => data.label);
    });
    const element = box.renderDom();

    expect(element.getAttribute('data-label')).toBe('a');

    data.label = 'b';
    box.rebuild();

    expect(element.getAttribute('data-label')).toBe('b');
  });

  it('rejects parameterized value functions without a source', () => {
    expect(() =>
      div((ele) => {
        ele.rebuildable();
        ele.attr('data-x', (s) => s.x);
      })
    ).toThrow(/data source/);
  });

  it('still allows zero-argument closures without a source', () => {
    const data = { label: 'a' };
    const box = div((ele) => {
      ele.rebuildable();
      ele.attr('data-label', () => data.label);
    });
    const element = box.renderDom();

    expect(element.getAttribute('data-label')).toBe('a');
  });

  it('inherits the host state for regions inside a state component', () => {
    const component = vStateNode({
      state: () => ({ label: 'host' }),
      render() {
        return div((ele) => {
          ele.rebuildable(() => false);
          ele.attr('data-label', (s) => s.label);
        });
      }
    });
    const host = div().child(component);
    const regionElement = host.renderDom().firstElementChild;

    expect(regionElement.getAttribute('data-label')).toBe('host');

    component.setState({ label: 'next' });

    expect(regionElement.getAttribute('data-label')).toBe('next');
  });
});
