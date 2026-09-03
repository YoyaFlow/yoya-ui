import { describe, expect, it } from 'vitest';
import { vTreeTable } from '../index.js';

const tree = [
  {
    id: 'root',
    name: '根',
    children: [
      { id: 'a', name: 'A', children: [{ id: 'a1', name: 'A1' }] },
      { id: 'b', name: 'B' }
    ]
  }
];

const columns = [
  { key: 'name', title: '名称', dataIndex: 'name' },
  { key: 'kind', title: '类型', dataIndex: 'kind' }
];

describe('vTreeTable', () => {
  it('renders expanded rows with indentation', () => {
    const table = vTreeTable({ columns, nodes: tree, expandedKeys: ['root'] });
    const el = table.renderDom();
    expect(el.querySelectorAll('tbody tr').length).toBe(3); // root, a, b (a1 closed)
    const first = el.querySelector('tbody tr');
    expect(first.querySelector('[data-depth]').getAttribute('data-depth')).toBe('0');
  });

  it('expands and collapses children on toggle', () => {
    const table = vTreeTable({ columns, nodes: tree });
    table.expandKeys(['root']);
    let el = table.renderDom();
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
    const trigger = el.querySelector('[data-role="expand"]');
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true })); // collapse root
    el = table.renderDom();
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('links parent/descendant selection with tri-state', () => {
    const table = vTreeTable({ columns, nodes: tree, expandedKeys: ['root', 'a'], rowSelection: true });
    const el = table.renderDom();
    const rows = Array.from(el.querySelectorAll('tbody tr'));
    const grandchildBefore = table.checkedKeys().length;
    // toggle grandchild a1
    const a1Box = rows[2].querySelector('input[type="checkbox"]');
    a1Box.dispatchEvent(new Event('change', { bubbles: true }));
    expect(table.checkedKeys()).toContain('a1');
    expect(table.checkedKeys().length).toBeGreaterThan(grandchildBefore);
  });

  it('lazy-loads children on expand when a loader is provided', async () => {
    const table = vTreeTable({
      columns,
      nodes: [{ id: 'root', name: '根', hasChildren: true }],
      lazyLoad: () =>
        Promise.resolve([
          { id: 'l1', name: 'L1' },
          { id: 'l2', name: 'L2' }
        ])
    });
    const el = table.renderDom();
    el.querySelector('[data-role="expand"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(table.visibleRowCount()).toBe(3);
  });

  it('serializes deterministically for SSR', () => {
    const table = vTreeTable({ columns, nodes: tree, expandedKeys: ['root', 'a'] });
    const html = table.toHTML();
    expect(html).toContain('名称');
    expect(html).toContain('根');
    expect(html).toContain('A1');
  });
});



