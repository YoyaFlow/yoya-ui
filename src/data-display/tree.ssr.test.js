// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { vTree } from '../index.js';

describe('vTree server-side rendering', () => {
  it('builds and serializes to HTML without a DOM', () => {
    const tree = vTree({
      checkable: true,
      checkedKeys: ['leaf-a'],
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

    const html = tree.render().toHTML();

    expect(html).toContain('role="tree"');
    expect(html).toContain('data-node-id="leaf-b"');
  });

  it('expresses indeterminate state as aria-checked mixed in HTML', () => {
    const tree = vTree({
      checkable: true,
      checkedKeys: ['leaf-a'],
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

    const html = tree.render().toHTML();

    expect(html).toContain('aria-checked="mixed"');
    expect(html).toContain('aria-checked="true"');
  });
});
