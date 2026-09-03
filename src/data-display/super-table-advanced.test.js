import { describe, expect, it } from 'vitest';
import { vSuperTable } from '../index.js';

const people = [
  { id: 'a', name: 'Alice', age: 30, dept: 'ops' },
  { id: 'b', name: 'Bob', age: 25, dept: 'dev' },
  { id: 'c', name: 'Carol', age: 35, dept: 'ops' }
];

function dragEvent(type) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  event.dataTransfer = { effectAllowed: '', setData() {}, dropEffect: '' };
  return event;
}

describe('vSuperTable advanced', () => {
  it('expands and collapses a detail row', () => {
    const table = vSuperTable({
      columns: [{ key: 'name', title: '姓名', dataIndex: 'name' }, { key: 'age', title: '年龄', dataIndex: 'age' }],
      rows: people.map((p) => ({ ...p })).map((p) => ({ ...p })),
      expandable: () => '这是详情'
    });
    let el = table.renderDom();
    expect(el.querySelector('[data-role="row-detail"]')).toBeNull();
    el.querySelector('[data-role="row-expand"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el = table.renderDom();
    expect(el.querySelector('[data-role="row-detail"]')).toBeTruthy();
    expect(el.querySelector('[data-role="row-detail"]').textContent).toContain('这是详情');
  });

  it('edits a cell and commits the value back to data', () => {
    const table = vSuperTable({
      columns: [
        { key: 'age', title: '年龄', dataIndex: 'age', editable: true }
      ],
      rows: people.map((p) => ({ ...p }))
    });
    const el = table.renderDom();
    el.querySelector('[data-role="cell-edit"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const input = table.renderDom().querySelector('input[type="text"]');
    input.value = '88';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(String(table.rows()[0].age)).toBe('88');
  });

  it('keeps editing on failed validation without losing input', () => {
    const table = vSuperTable({
      columns: [
        {
          key: 'age',
          title: '年龄',
          dataIndex: 'age',
          editable: true,
          validate: (value) => (Number(value) >= 0 ? null : '年龄不能为负')
        }
      ],
      rows: people.map((p) => ({ ...p }))
    });
    const el = table.renderDom();
    el.querySelector('[data-role="cell-edit"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const input = table.renderDom().querySelector('input[type="text"]');
    input.value = '-5';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(table.renderDom().querySelector('input[type="text"]')).toBeTruthy();
    expect(table.rows()[0].age).toBe(30);
  });

  it('marks fixed columns on headers and cells', () => {
    const table = vSuperTable({
      columns: [
        { key: 'name', title: '姓名', dataIndex: 'name', fixed: 'left' },
        { key: 'age', title: '年龄', dataIndex: 'age' }
      ],
      rows: people.map((p) => ({ ...p }))
    });
    const el = table.renderDom();
    expect(el.querySelector('th[data-key="name"]').getAttribute('data-fixed')).toBe('left');
    expect(el.querySelector('td[data-key="name"]').getAttribute('data-fixed')).toBe('left');
  });

  it('reorders columns by drag and drop', () => {
    const table = vSuperTable({
      columns: [
        { key: 'name', title: '姓名', dataIndex: 'name' },
        { key: 'age', title: '年龄', dataIndex: 'age' }
      ],
      rows: people.map((p) => ({ ...p }))
    });
    const el = table.renderDom();
    const ageTh = el.querySelector('th[data-key="age"]');
    ageTh.dispatchEvent(dragEvent('dragstart', ageTh));
    const nameTh = el.querySelector('th[data-key="name"]');
    nameTh.dispatchEvent(dragEvent('drop', nameTh));
    const headers = Array.from(table.renderDom().querySelectorAll('th')).map((th) => th.getAttribute('data-key'));
    expect(headers.indexOf('age')).toBeLessThan(headers.indexOf('name'));
  });

  it('virtualizes large lists into a visible window that updates on scroll', () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({
      id: `r${index}`,
      name: `行 ${index}`,
      age: index
    }));
    const table = vSuperTable({
      columns: [{ key: 'name', title: '名称', dataIndex: 'name' }],
      rows,
      virtualize: true,
      itemHeight: 40
    });
    const el = table.renderDom();
    const initialCount = el.querySelectorAll('tbody tr').length;
    expect(initialCount).toBeLessThan(60);

    const viewport = el.querySelector('.yoya-vsupertable-viewport');
    viewport.scrollTop = 40 * 20;
    viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
    const afterCount = table.renderDom().querySelectorAll('tbody tr').length;
    expect(afterCount).toBeLessThan(60);
  });
});


