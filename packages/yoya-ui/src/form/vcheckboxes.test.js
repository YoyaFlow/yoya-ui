import { describe, expect, it } from 'vitest';
import { vCheckboxes } from '../index.js';

describe('vCheckboxes layout', () => {
  it('renders a single column by default', () => {
    const boxes = vCheckboxes({ options: ['A', 'B', 'C'] });
    const el = boxes.renderDom();
    // 没设列数就不写变量：规则里的 `var(--yoya-checkboxes-columns, 1)` 兜默认单列（R10）
    expect(el.style.getPropertyValue('--yoya-checkboxes-columns')).toBe('');
    expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
  });

  it('columns(n) writes the column count as a CSS variable', () => {
    const boxes = vCheckboxes({ options: ['A', 'B', 'C', 'D'], columns: 2 });
    const el = boxes.renderDom();
    expect(el.style.getPropertyValue('--yoya-checkboxes-columns')).toBe('2');
    expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
  });

  it('columns getter and dynamic updates', () => {
    const boxes = vCheckboxes({ options: ['A', 'B'], columns: 3 });
    expect(boxes.columns()).toBe(3);
    boxes.columns(1);
    expect(boxes.columns()).toBe(1);
    expect(boxes.renderDom().style.getPropertyValue('--yoya-checkboxes-columns')).toBe('1');
    boxes.columns(null);
    expect(boxes.columns()).toBe(null);
    expect(boxes.renderDom().style.getPropertyValue('--yoya-checkboxes-columns')).toBe('');
  });
});
