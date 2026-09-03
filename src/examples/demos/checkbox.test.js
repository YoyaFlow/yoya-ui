import { describe, expect, it } from 'vitest';
import { CheckboxColumnsExample } from './checkbox.js';

describe('vCheckboxes layout demo', () => {
  it('renders options in 2 columns and switches column count', () => {
    const demo = CheckboxColumnsExample();
    const el = demo.render().renderDom();

    const boxes = el.querySelector('.yoya-vcheckboxes');
    expect(el.querySelectorAll('.yoya-vcheckboxes input[type="checkbox"]')).toHaveLength(6);
    expect(boxes.style.gridTemplateColumns).toContain('repeat(2');

    const three = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent === '3 列'
    );
    three.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(boxes.style.gridTemplateColumns).toContain('repeat(3');
    expect(el.textContent).toContain('3 列');
  });
});
