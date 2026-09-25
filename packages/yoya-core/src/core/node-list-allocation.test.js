import { describe, expect, it } from 'vitest';
import { div, ref, ViewNode } from '@yoyaflow/yoya-core';
import { EMPTY_CHILDREN } from './node.js';

/**
 * 节点级名单的首次写入契约：名单按需创建（空名单不占数组），首次写入直接得到长度为 1 的数组。
 * 数组容量无法从 JS 观察，这里锁的是写入口带来的可观察不变量：哨兵归位、按需创建、
 * 清空后重新变成共享哨兵而不是留下空数组。
 */
describe('node-level list first write', () => {
  it('creates children, bindings, cleanup and keyed lists only on first write', () => {
    const node = div();

    expect(node._children).toBe(EMPTY_CHILDREN);
    expect('_bindings' in node).toBe(false);
    expect('_cleanup' in node).toBe(false);

    node.child('x');

    expect(node._children).toHaveLength(1);
    expect(node._children[0]).toBeInstanceOf(ViewNode);
  });

  it('writes a fresh single-element list after the children were cleared', () => {
    const node = div('a');
    const previous = node._children;

    node.clearChildren();
    expect(node._children).toBe(EMPTY_CHILDREN);

    node.child('b');

    expect(node._children).not.toBe(EMPTY_CHILDREN);
    expect(node._children).not.toBe(previous);
    expect(node._children).toHaveLength(1);
  });

  it('appends later children to the same list', () => {
    const node = div('a');
    const list = node._children;

    node.child('b');

    expect(node._children).toBe(list);
    expect(list).toHaveLength(2);
  });

  it('keeps binding and cleanup lists lazy and writable', () => {
    const count = ref(0);
    const node = div((el) => {
      el.attr('data-count', count);
      el.bindWindowEvent('resize', () => {});
    });
    node.renderDom();

    expect(node._bindings).toHaveLength(1);
    expect(node._cleanup).toHaveLength(1);

    node.destroy();

    expect(node._bindings).toHaveLength(0);
    expect(node._cleanup).toBeNull();
  });

  it('drops the region subscription list back to empty instead of an empty array', () => {
    const rows = ref(['a']);
    const region = div((el) => {
      el.rebuildable();
      el.div(rows.value[0]);
    });
    region.renderDom();

    expect(region._regionSubs).toHaveLength(1);

    region.destroy();

    expect(region._regionSubs).toBeNull();
  });

  it('does not accumulate a per-run list for keyed regions', () => {
    const rows = ref(['a']);
    const list = div((el) => {
      el.rebuildable();
      el.keyed(rows, (row) => div(row));
    });
    list.renderDom();

    rows.value = ['a', 'b'];
    list.rebuild();
    list.rebuild();

    // 段只活在本次 keyed() 的绑定闭包里：节点上不再有按重建次数增长的旧段名单
    expect('_keyedSegments' in list).toBe(false);
    expect(list._children).toHaveLength(2);
  });
});
