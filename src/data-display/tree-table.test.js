import { describe, expect, it } from 'vitest';
import { vTreeTable } from '../index.js';
import { hydrate, parseState, renderToString } from '../yoya.ssr.js';

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
  const visibleRows = (el) => [...el.querySelectorAll('tbody tr:not([hidden])')];

  it('renders expanded rows with indentation', () => {
    const table = vTreeTable({ columns, nodes: tree, expandedKeys: ['root'] });
    const el = table.renderDom();
    // 行常驻：4 行都在 DOM 里，折叠的 a1 用 hidden 标记
    expect(el.querySelectorAll('tbody tr').length).toBe(4);
    expect(visibleRows(el).length).toBe(3); // root, a, b（a1 折叠）
    expect(el.querySelector('[data-row-key="a1"]').hasAttribute('hidden')).toBe(true);
    const first = visibleRows(el)[0];
    expect(first.querySelector('[data-depth]').getAttribute('data-depth')).toBe('0');
  });

  it('expands and collapses by toggling visibility, keeping row identity and focus', () => {
    const table = vTreeTable({ columns, nodes: tree });
    table.expandKeys(['root']);
    const el = table.renderDom();
    document.body.appendChild(el);

    const rootRow = el.querySelector('[data-row-key="root"]');
    const childRow = el.querySelector('[data-row-key="a"]');
    const trigger = rootRow.querySelector('[data-role="expand"]');
    el.scrollTop = 40;
    trigger.focus();

    expect(visibleRows(el).length).toBe(3);

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true })); // 折叠 root

    // 只切可见性：行不重建、焦点与滚动位置都还在
    expect(visibleRows(el).length).toBe(1);
    expect(el.querySelector('[data-row-key="root"]')).toBe(rootRow);
    expect(el.querySelector('[data-row-key="a"]')).toBe(childRow);
    expect(childRow.hasAttribute('hidden')).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(el.scrollTop).toBe(40);

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true })); // 再展开

    expect(visibleRows(el).length).toBe(3);
    expect(el.querySelector('[data-row-key="a"]')).toBe(childRow);
    expect(childRow.hasAttribute('hidden')).toBe(false);

    el.remove();
  });

  it('keeps exactly one expand symbol per row across repeated expansion syncs', () => {
    const table = vTreeTable({ columns, nodes: tree, expandedKeys: ['root'] });
    const el = table.renderDom();
    const symbols = () =>
      [...el.querySelectorAll('[data-role="expand"]')].map((button) => button.textContent);

    // root 展开、a 折叠；初次渲染不能把符号追加两遍
    expect(symbols()).toEqual(['▾', '▸']);

    const rootTrigger = el.querySelector('[data-row-key="root"] [data-role="expand"]');
    rootTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true })); // 折叠
    rootTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true })); // 展开

    expect(symbols()).toEqual(['▾', '▸']);

    table.expandKeys(['root', 'a']);

    expect(symbols()).toEqual(['▾', '▾']);
  });

  it('links parent/descendant selection with tri-state', () => {
    const table = vTreeTable({
      columns,
      nodes: tree,
      expandedKeys: ['root', 'a'],
      rowSelection: true
    });
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
    el.querySelector('[data-role="expand"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(table.visibleRowCount()).toBe(3);
    // 既有行不重建，新行插在父行之后
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
    expect(el.querySelector('[data-row-key="root"]').hasAttribute('hidden')).toBe(false);
    expect(el.querySelectorAll('tbody tr')[1].getAttribute('data-row-key')).toBe('l1');
  });

  it('serializes deterministically for SSR', () => {
    const create = () => vTreeTable({ columns, nodes: tree, expandedKeys: ['root', 'a'] });
    const html = create().toHTML();
    expect(html).toContain('名称');
    expect(html).toContain('根');
    expect(html).toContain('A1');
    expect(renderToString(create).html).toBe(renderToString(create).html);
  });

  it('hydrates the server HTML and keeps expansion free of rebuilds', () => {
    const create = () => vTreeTable({ columns, nodes: tree, expandedKeys: ['root'] });
    const server = renderToString(create);

    document.body.innerHTML = `<div id="app">${server.html}</div>`;
    const host = document.getElementById('app');
    const rootRowBefore = host.querySelector('[data-row-key="root"]');

    hydrate(create, host, parseState(server.state));

    expect(host.querySelector('[data-row-key="root"]')).toBe(rootRowBefore);

    host
      .querySelector('[data-role="expand"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // 折叠后仍是同一个行节点，只是隐藏
    expect(host.querySelector('[data-row-key="root"]')).toBe(rootRowBefore);
    expect(visibleRows(host).length).toBe(1);
    expect(host.querySelector('[data-row-key="a"]').hasAttribute('hidden')).toBe(true);
  });
});
