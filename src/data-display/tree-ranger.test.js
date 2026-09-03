import { describe, expect, it } from 'vitest';
import { vTreeRanger } from '../index.js';

const makeColumns = () => [
  {
    title: '类型',
    load: () =>
      Promise.resolve([
        { id: 'a', name: '类型 A' },
        { id: 'b', name: '类型 B' }
      ]),
    renderItem: (item) => item.name,
    itemKey: (item) => item.id
  },
  {
    title: '字典项',
    load: ({ selection }) =>
      Promise.resolve(
        selection[0]?.id === 'a'
          ? [
              { id: 'a1', name: '项 1' },
              { id: 'a2', name: '项 2' }
            ]
          : [{ id: 'b1', name: '项 X' }]
      ),
    renderItem: (item) => item.name,
    itemKey: (item) => item.id
  }
];

describe('vTreeRanger', () => {
  it('renders first column and loads the next after selection', async () => {
    const browser = vTreeRanger({
      columns: makeColumns(),
      columnWidth: 200
    });
    const element = browser.render().renderDom();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(element.querySelectorAll('.yoya-vtreeranger-column')).toHaveLength(3);
    expect(element.querySelector('[data-index="0"]').textContent).toContain('类型 A');

    element.querySelector('[data-index="0"]').click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(browser.selectedKeys()[0]).toBe('a');
    expect(browser.current()).toBe(1);
    const secondColumn = element.querySelectorAll('.yoya-vtreeranger-column')[1];
    expect(secondColumn.textContent).toContain('项 1');
  });

  it('reports selection changes through change handler', async () => {
    const changed = [];
    const browser = vTreeRanger({
      change: (payload) => changed.push(payload.type),
      columns: makeColumns()
    });
    const element = browser.render().renderDom();
    await new Promise((resolve) => setTimeout(resolve, 20));

    element.querySelector('[data-index="1"]').click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(changed).toContain('select');
  });

  it('loads more pages when scrolled to bottom and stops when hasMore is false', async () => {
    const requests = [];
    const browser = vTreeRanger({
      itemHeight: 30,
      columns: [
        {
          pageSize: 200,
          title: '大表',
          load: ({ page }) => {
            requests.push(page);
            const start = (page - 1) * 200;
            return Promise.resolve({
              hasMore: start + 200 < 350,
              items: Array.from({ length: 200 }, (_, index) => ({
                id: start + index,
                name: `节点 ${start + index + 1}`
              }))
            });
          },
          renderItem: (item) => item.name,
          itemKey: (item) => item.id
        }
      ]
    });
    const element = browser.render().renderDom();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toEqual([1]);

    const list = element.querySelector('.yoya-vtreeranger-list');
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 300 });
    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 100000 });
    Object.defineProperty(list, 'scrollTop', { configurable: true, value: 99700 });
    list.dispatchEvent(new Event('scroll', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toEqual([1, 2]);

    list.dispatchEvent(new Event('scroll', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toEqual([1, 2]);
  });

  it('refreshes the current columns in place and keeps the selection', async () => {
    let typeItems = [
      { id: 'a1', name: '项 1' },
      { id: 'a2', name: '项 2' }
    ];
    const browser = vTreeRanger({
      columns: [
        {
          title: '类型',
          load: () =>
            Promise.resolve([
              { id: 'a', name: '类型 A' },
              { id: 'b', name: '类型 B' }
            ]),
          renderItem: (item) => item.name,
          itemKey: (item) => item.id
        },
        {
          title: '字典项',
          load: ({ selection }) => Promise.resolve(selection[0]?.id === 'a' ? typeItems : []),
          renderItem: (item) => item.name,
          itemKey: (item) => item.id
        }
      ]
    });
    const element = browser.render().renderDom();
    await new Promise((resolve) => setTimeout(resolve, 20));

    element.querySelector('[data-index="0"]').click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const secondColumn = element.querySelectorAll('.yoya-vtreeranger-column')[1];
    expect(secondColumn.textContent).toContain('项 2');

    typeItems = [
      { id: 'a1', name: '项 1' },
      { id: 'a3', name: '项 3' }
    ];
    browser.refresh();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(browser.selectedKeys()[0]).toBe('a');
    expect(secondColumn.textContent).toContain('项 3');
    expect(secondColumn.textContent).not.toContain('项 2');
  });
});
