import { describe, expect, it } from 'vitest';
import { vCheckboxes } from '../index.js';

describe('vCheckboxes layout', () => {
  it('renders a single column by default', () => {
    const boxes = vCheckboxes({ options: ['A', 'B', 'C'] });
    const el = boxes.renderDom();
    expect(el.style.gridTemplateColumns).toBe('');
    expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
  });

  it('columns(n) renders n columns via gridTemplateColumns', () => {
    const boxes = vCheckboxes({ options: ['A', 'B', 'C', 'D'], columns: 2 });
    const el = boxes.renderDom();
    expect(el.style.gridTemplateColumns).toContain('repeat(2');
    expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
  });

  it('columns getter and dynamic updates', () => {
    const boxes = vCheckboxes({ options: ['A', 'B'], columns: 3 });
    expect(boxes.columns()).toBe(3);
    boxes.columns(1);
    expect(boxes.columns()).toBe(1);
    boxes.columns(null);
    expect(boxes.columns()).toBe(null);
  });
});
