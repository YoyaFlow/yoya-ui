import { describe, expect, it } from 'vitest';
import { ViewNode } from '../../core/node.js';
import { PaginationExample1 } from './pagination.js';

describe('PaginationExample1', () => {
  it('render() returns a ViewNode so the docs shell can resolve it', () => {
    const example = PaginationExample1();

    expect(example.render()).toBeInstanceOf(ViewNode);
  });

  it('tracks the current page in its status line', () => {
    const demo = PaginationExample1();
    const element = demo.render().renderDom();
    const status = element.querySelector('[data-pagination-status]');

    expect(status.textContent).toBe('第 1 页，每页 10 条');

    const nextPage = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent.trim() === '下一页'
    );
    for (let index = 0; index < 4; index += 1) {
      nextPage.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    expect(status.textContent).toBe('第 5 页，每页 10 条');
  });
});
