import { describe, expect, it, vi } from 'vitest';
import { div, vTree, vTreeNode } from '../index.js';

describe('vTree', () => {
  it('renders hierarchical nodes with expanded and collapsed branches', () => {
    const tree = vTree({
      nodes: [
        {
          children: [
            { id: 'api', label: 'API 网关' },
            { id: 'worker', label: 'Worker' }
          ],
          expanded: true,
          id: 'services',
          label: '服务'
        },
        {
          children: [{ id: 'profile', label: '资料' }],
          id: 'settings',
          label: '设置'
        }
      ]
    });
    const element = tree.render().renderDom();
    const rows = element.querySelectorAll('.yoya-vtree-node');

    expect(element.getAttribute('role')).toBe('tree');
    expect(element.getAttribute('aria-label')).toBe('树形控件');
    expect(rows).toHaveLength(4);
    expect(rows[0].getAttribute('aria-expanded')).toBe('true');
    expect(rows[1].getAttribute('aria-level')).toBe('2');
    expect(rows[1].querySelector('.yoya-vtree-label').textContent).toBe('API 网关');
    expect(rows[3].getAttribute('aria-expanded')).toBe('false');
  });

  it('expands and collapses a branch and reports the current keys', () => {
    const tree = vTree({
      nodes: [
        {
          children: [{ id: 'leaf', label: '叶子' }],
          id: 'root',
          label: '根节点'
        }
      ]
    });
    const element = tree.render().renderDom();
    const rootRow = element.querySelector('[data-node-id="root"]');

    expect(rootRow.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(1);

    rootRow.querySelector('.yoya-vtree-toggle').click();

    expect(tree.expandedKeys()).toEqual(['root']);
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(2);

    element.querySelector('[data-node-id="root"] .yoya-vtree-toggle').click();

    expect(tree.expandedKeys()).toEqual([]);
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(1);
  });

  it('renders custom left icons from node icon callbacks', () => {
    const icon = vi.fn((iconBox) => iconBox.span('F'));
    const tree = vTree({
      nodes: [{ id: 'folder', icon, label: '目录' }]
    });
    const element = tree.render().renderDom();

    expect(icon).toHaveBeenCalled();
    expect(element.querySelector('.yoya-vtree-icon').textContent).toBe('F');
  });

  it('supports custom expand and collapse toggle icons', () => {
    const toggleIcon = vi.fn((iconBox, expanded) => iconBox.text(expanded ? '开' : '关'));
    const tree = vTree({
      nodes: [
        {
          children: [{ id: 'leaf', label: '子节点' }],
          id: 'root',
          label: '根节点'
        }
      ],
      toggleIcon
    });
    const element = tree.render().renderDom();
    const rootToggle = element.querySelector('[data-node-id="root"] .yoya-vtree-toggle');

    expect(rootToggle.textContent).toBe('关');
    expect(rootToggle.getAttribute('aria-expanded')).toBe('false');

    rootToggle.click();

    const expandedToggle = element.querySelector('[data-node-id="root"] .yoya-vtree-toggle');
    expect(expandedToggle.textContent).toBe('开');
    expect(expandedToggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggleIcon).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('supports separate collapsed and expanded toggle icons', () => {
    const tree = vTree({
      nodes: [
        {
          children: [{ id: 'leaf', label: '子节点' }],
          id: 'root',
          label: '根节点'
        }
      ]
    });
    tree.toggleIcon(div('关'), div('开'));
    const element = tree.render().renderDom();
    const rootToggle = element.querySelector('[data-node-id="root"] .yoya-vtree-toggle');

    expect(rootToggle.textContent).toBe('关');

    rootToggle.click();

    const expandedToggle = element.querySelector('[data-node-id="root"] .yoya-vtree-toggle');
    expect(expandedToggle.textContent).toBe('开');
  });

  it('toggles expandable nodes that have no children', () => {
    const tree = vTree({
      nodes: [{ expandable: true, id: 'empty', label: '空文件夹' }]
    });
    const element = tree.render().renderDom();
    const toggle = element.querySelector('[data-node-id="empty"] .yoya-vtree-toggle');

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(1);

    toggle.click();

    const expandedToggle = element.querySelector('[data-node-id="empty"] .yoya-vtree-toggle');
    expect(tree.expandedKeys()).toEqual(['empty']);
    expect(expandedToggle.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(1);
  });

  it('builds nested tree nodes through vTree callbacks and vTreeNode', () => {
    const tree = vTree((root) => {
      root.ariaLabel('声明式目录');
      root.vTreeNode((node) => {
        node.id('root');
        node.label('根节点');
        node.expanded(true);
        node.vTreeNode((child) => {
          child.id('child');
          child.label('子节点');
          child.selected(true);
        });
      });
    });
    const element = tree.render().renderDom();

    expect(tree.nodes()).toHaveLength(1);
    expect(tree.nodes()[0].id).toBe('root');
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(2);
    expect(element.querySelector('[data-node-id="child"]').getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(vTreeNode('独立节点').label()).toBe('独立节点');
  });

  it('renders row actions without selecting the row', () => {
    const clicked = vi.fn();
    const tree = vTree({
      nodes: [
        {
          actions(actions) {
            actions.vButton((button) => {
              button.label('⋯');
              button.on('click', clicked);
            });
          },
          id: 'node',
          label: '节点'
        }
      ]
    });
    const element = tree.render().renderDom();
    const actionButton = element.querySelector(
      '[data-node-id="node"] .yoya-vtree-node-actions button'
    );

    actionButton.click();

    expect(clicked).toHaveBeenCalledTimes(1);
    expect(tree.selectedKeys()).toEqual([]);
  });

  it('selects one node at a time and emits select changes', () => {
    const changed = vi.fn();
    const tree = vTree({
      change: changed,
      nodes: [
        { id: 'api', label: 'API 网关' },
        { id: 'worker', label: 'Worker' }
      ]
    });
    const element = tree.render().renderDom();

    element.querySelector('[data-node-id="api"]').click();

    expect(tree.selectedKeys()).toEqual(['api']);
    expect(element.querySelector('[data-node-id="api"]').getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'api', selectedKeys: ['api'], type: 'select' })
    );

    element.querySelector('[data-node-id="worker"]').click();

    expect(tree.selectedKeys()).toEqual(['worker']);
    expect(element.querySelector('[data-node-id="api"]').getAttribute('aria-selected')).toBe(
      'false'
    );
    expect(element.querySelector('[data-node-id="worker"]').getAttribute('aria-selected')).toBe(
      'true'
    );
  });

  it('keeps multiple selected keys when multiple is enabled', () => {
    const tree = vTree({
      multiple: true,
      nodes: [
        { id: 'api', label: 'API 网关' },
        { id: 'worker', label: 'Worker' },
        { id: 'web', label: 'Web' }
      ]
    });
    const element = tree.render().renderDom();

    element.querySelector('[data-node-id="api"]').click();
    element.querySelector('[data-node-id="web"]').click();

    expect(tree.selectedKeys()).toEqual(['api', 'web']);
    expect(element.querySelectorAll('[aria-selected="true"]')).toHaveLength(2);
  });

  it('supports checkable nodes, parent indeterminate state, and check all', () => {
    const tree = vTree({
      checkable: true,
      nodes: [
        {
          children: [
            { id: 'leaf-a', label: '节点 A' },
            { id: 'leaf-b', label: '节点 B' }
          ],
          expanded: true,
          id: 'root',
          label: '分组'
        }
      ]
    });
    const element = tree.render().renderDom();
    const leafInput = element.querySelector('[data-node-id="leaf-a"] input');

    leafInput.checked = true;
    leafInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(tree.checkedKeys()).toEqual(['leaf-a']);
    expect(element.querySelector('[data-node-id="root"] input').indeterminate).toBe(true);

    const rootInput = element.querySelector('[data-node-id="root"] input');
    rootInput.checked = true;
    rootInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(tree.checkedKeys()).toEqual(expect.arrayContaining(['leaf-a', 'leaf-b', 'root']));
    expect(element.querySelector('[data-node-id="root"] input').indeterminate).toBe(false);

    tree.checkAll(false);

    expect(tree.checkedKeys()).toEqual([]);
  });

  it('updates data, expands and collapses all, and renders an empty state', () => {
    const tree = vTree({
      emptyText: '暂无节点',
      nodes: [
        {
          children: [{ id: 'child', label: '子节点' }],
          id: 'root',
          label: '根节点'
        }
      ]
    });
    const element = tree.render().renderDom();

    tree.expandAll();
    expect(tree.expandedKeys()).toEqual(['root']);
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(2);

    tree.collapseAll();
    expect(tree.expandedKeys()).toEqual([]);
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(1);

    tree.nodes([]);

    expect(element.querySelector('.yoya-vtree-empty').textContent).toBe('暂无节点');
    expect(element.querySelectorAll('.yoya-vtree-node')).toHaveLength(0);
  });

  it('skips disabled nodes when clicking and supports arrow-key navigation', () => {
    const tree = vTree({
      nodes: [
        {
          children: [
            { disabled: true, id: 'disabled', label: '禁用' },
            { id: 'enabled', label: '可用' }
          ],
          expanded: true,
          id: 'root',
          label: '根节点'
        }
      ]
    });
    const element = tree.render().renderDom();
    document.body.appendChild(element);

    element.querySelector('[data-node-id="disabled"]').click();
    expect(tree.selectedKeys()).toEqual([]);

    const rootRow = element.querySelector('[data-node-id="root"]');
    rootRow.focus();
    rootRow.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));

    expect(tree.expandedKeys()).toEqual(['root']);

    element
      .querySelector('[data-node-id="root"]')
      .dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));

    expect(document.activeElement.getAttribute('data-node-id')).toBe('enabled');
  });

  it('reports fresh node state in change events', () => {
    const details = [];
    const tree = vTree({
      change: (detail) => details.push(detail),
      checkable: true,
      nodes: [
        {
          children: [{ id: 'leaf', label: '叶子' }],
          expanded: true,
          id: 'root',
          label: '根节点'
        }
      ]
    });

    tree.check('leaf');
    expect(details.at(-1).node.checked).toBe(true);
    expect(details.at(-1).checkedKeys).toEqual(['leaf']);

    tree.select('root');
    expect(details.at(-1).node.selected).toBe(true);
    expect(details.at(-1).selectedKeys).toEqual(['root']);

    tree.collapseNode('root');
    expect(details.at(-1).node.expanded).toBe(false);
  });

  it('queries checked and selected state without mutating keys', () => {
    const tree = vTree({
      checkable: true,
      checkedKeys: ['a'],
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' }
      ]
    });

    expect(tree.checked('a')).toBe(true);
    expect(tree.checked('b')).toBe(false);
    expect(tree.checkedKeys()).toEqual(['a']);

    tree.select('b');
    expect(tree.selected('b')).toBe(true);
    expect(tree.selected('a')).toBe(false);
    expect(tree.selectedKeys()).toEqual(['b']);

    tree.checked(['a', 'b']);
    expect(tree.checkedKeys()).toEqual(['a', 'b']);
  });

  it('skips disabled nodes when checking all', () => {
    const tree = vTree({
      checkable: true,
      nodes: [
        { disabled: true, id: 'off', label: '禁用' },
        { id: 'on', label: '可用' }
      ]
    });

    tree.checkAll(true);

    expect(tree.checkedKeys()).toEqual(['on']);

    tree.checkAll(false);
    expect(tree.checkedKeys()).toEqual([]);
  });

  it('updates rows in place when selection changes', () => {
    const tree = vTree({
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' }
      ]
    });
    const element = tree.render().renderDom();
    const rowA = element.querySelector('[data-node-id="a"]');

    rowA.click();

    expect(element.querySelector('[data-node-id="a"]')).toBe(rowA);
    expect(rowA.getAttribute('aria-selected')).toBe('true');
  });

  it('updates checkbox rows in place without recreating them', () => {
    const tree = vTree({
      checkable: true,
      nodes: [
        {
          children: [
            { id: 'leaf-a', label: '节点 A' },
            { id: 'leaf-b', label: '节点 B' }
          ],
          expanded: true,
          id: 'root',
          label: '分组'
        }
      ]
    });
    const element = tree.render().renderDom();
    const rootInput = element.querySelector('[data-node-id="root"] input');
    const leafInput = element.querySelector('[data-node-id="leaf-a"] input');

    leafInput.checked = true;
    leafInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(element.querySelector('[data-node-id="root"] input')).toBe(rootInput);
    expect(element.querySelector('[data-node-id="leaf-a"] input')).toBe(leafInput);
    expect(rootInput.indeterminate).toBe(true);
    expect(rootInput.getAttribute('aria-checked')).toBe('mixed');
  });

  it('builds rows once during declarative setup', () => {
    const icon = vi.fn((iconBox) => iconBox.span('F'));

    vTree({
      checkable: true,
      multiple: true,
      nodes: [{ icon, id: 'a', label: 'A' }],
      selectable: true
    });

    expect(icon).toHaveBeenCalledTimes(1);
  });

  it('reflects selectable changes on existing rows', () => {
    const tree = vTree({
      nodes: [{ id: 'a', label: 'A' }]
    });
    const element = tree.render().renderDom();
    const row = element.querySelector('[data-node-id="a"]');

    expect(row.getAttribute('aria-selected')).toBe('false');

    tree.selectable(false);

    expect(row.getAttribute('aria-selected')).toBeNull();
  });

  it('registers vTree as a v-prefixed parent shortcut', () => {
    const page = div((root) => {
      root.vTree({
        nodes: [{ id: 'item', label: '目录项' }]
      });
    });
    const element = page.renderDom();

    expect(element.querySelector('.yoya-vtree')).not.toBeNull();
    expect(element.querySelector('.yoya-vtree-label').textContent).toBe('目录项');
  });
});
