import { describe, expect, it } from 'vitest';
import { vSuperTable } from '../index.js';

const people = [
  { id: 'a', name: 'Alice', age: 30, dept: 'ops' },
  { id: 'b', name: 'Bob', age: 25, dept: 'dev' },
  { id: 'c', name: 'Carol', age: 35, dept: 'ops' },
  { id: 'd', name: 'Dan', age: 28, dept: 'dev' }
];

const columns = [
  { key: 'name', title: '姓名', dataIndex: 'name', sorter: true },
  {
    key: 'dept',
    title: '部门',
    dataIndex: 'dept',
    filterOptions: [
      { label: '全部', value: '' },
      { label: '运维', value: 'ops' },
      { label: '开发', value: 'dev' }
    ]
  },
  { key: 'age', title: '年龄', dataIndex: 'age', sorter: true }
];

function render(superTable) {
  return superTable.renderDom();
}

describe('vSuperTable basics', () => {
  it('renders column headers and rows', () => {
    const table = vSuperTable({ columns, rows: people });
    const el = render(table);
    expect(el.querySelectorAll('th').length).toBe(columns.length);
    expect(el.querySelectorAll('tbody tr').length).toBe(people.length);
    expect(el.textContent).toContain('Alice');
  });

  it('sorts by column on header click, cycling asc -> desc -> none', () => {
    const table = vSuperTable({ columns, rows: people });
    const el = render(table);
    const clickSort = () =>
      el.querySelector('th[data-key="name"] button').dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    clickSort();
    let names = Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.textContent);
    expect(names[0]).toContain('Alice');

    clickSort();
    names = Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.textContent);
    expect(names[0]).toContain('Dan');

    clickSort();
    names = Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.textContent);
    expect(names[0]).toContain('Alice');
  });

  it('filters rows via column filter options', () => {
    const table = vSuperTable({ columns, rows: people });
    const el = render(table);
    const deptSelect = el.querySelector('th[data-key="dept"] select');
    deptSelect.value = 'ops';
    deptSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.textContent);
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.includes('ops'))).toBe(true);
  });

  it('keeps selection by rowKey across page changes', () => {
    const table = vSuperTable({
      columns,
      rows: people,
      pagination: { pageSize: 2 },
      rowSelection: true
    });
    const el = render(table);
    el.querySelector('tbody input[type="checkbox"]').dispatchEvent(
      new Event('change', { bubbles: true })
    );
    const nextBtn = el.querySelector('[data-testid="page-next"]');
    nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(table.selectedRowKeys()).toEqual([people[0].id]);
  });

  it('emits change with sort/filters/pagination/selectedKeys', () => {
    let payload = null;
    const table = vSuperTable({
      columns,
      rows: people,
      pagination: { pageSize: 2 },
      onChange: (p) => (payload = p)
    });
    const el = render(table);
    el.querySelector('th[data-key="name"] button').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(payload.sort).toEqual({ key: 'name', order: 'asc' });
    expect(payload.pagination.current).toBe(1);
    expect(payload.selectedKeys).toEqual([]);
  });

  it('serializes deterministically for SSR', () => {
    const table = vSuperTable({ columns, rows: people });
    const html = table.toHTML();
    expect(html).toContain('姓名');
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });
});

