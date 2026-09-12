import { describe, expect, it } from 'vitest';
import { div, ref } from '../index.js';

describe('region value sources', () => {
  it('evaluates zero-argument closures from their own closure', () => {
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

  it('rejects parameterized value functions', () => {
    expect(() =>
      div((ele) => {
        ele.rebuildable();
        ele.attr('data-x', (source) => source.x);
      })
    ).toThrow(/no longer supported/);
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

  it('rebuilds when a ref read during the build changes', () => {
    const label = ref('host');
    const region = div((ele) => {
      ele.rebuildable();
      ele.attr('data-label', label);
    });
    const regionElement = region.renderDom();

    expect(regionElement.getAttribute('data-label')).toBe('host');

    label.value = 'next';

    expect(regionElement.getAttribute('data-label')).toBe('next');
  });
});
