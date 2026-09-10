import { describe, expect, it } from 'vitest';
import { div, vStateNode } from '../index.js';

describe('rebuildable region data source', () => {
  it('feeds parameterized value functions from the declared data source', () => {
    const data = { label: 'a' };
    const box = div((ele) => {
      ele.dataSource(() => data);
      ele.rebuildable();
      ele.attr('data-label', (s) => s.label);
    });
    const element = box.renderDom();

    expect(element.getAttribute('data-label')).toBe('a');

    data.label = 'b';
    box.rerun();

    expect(element.getAttribute('data-label')).toBe('b');
  });

  it('rejects parameterized value functions without a data source', () => {
    expect(() =>
      div((ele) => {
        ele.rebuildable();
        ele.attr('data-x', (s) => s.x);
      })
    ).toThrow(/data source/);
  });

  it('still allows zero-argument closures without a data source', () => {
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
