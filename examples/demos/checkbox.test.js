import { describe, expect, it } from 'vitest';
import { CheckboxColumnsExample } from './checkbox.js';

describe('vCheckboxes layout demo', () => {
  it('renders options in 2 columns and switches column count', () => {
    const demo = CheckboxColumnsExample();
    const el = demo.renderDom();

    const boxes = el.querySelector('[vn~="VCheckboxes"]');
    expect(el.querySelectorAll('[vn~="VCheckboxes"] input[type="checkbox"]')).toHaveLength(6);
    // 列数是可配置几何，走 CSS 变量（R10）：JS 只写 `--yoya-checkboxes-columns`
    expect(boxes.style.getPropertyValue('--yoya-checkboxes-columns')).toBe('2');

    const three = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent === '3 列'
    );
    three.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(boxes.style.getPropertyValue('--yoya-checkboxes-columns')).toBe('3');
    expect(el.textContent).toContain('3 列');
  });
});
