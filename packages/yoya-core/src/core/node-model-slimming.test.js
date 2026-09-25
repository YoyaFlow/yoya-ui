import { describe, expect, it } from 'vitest';
import { div, ref } from '@yoyaflow/yoya-core';

/**
 * 节点模型瘦身（票 34）的可观察契约：
 * 1. 构建闭包用**单槽**登记：一个节点只 setup 一次时，槽里是那个闭包本身，不是数组
 *    （原实现每次 setup 都建一个数组，官方行 8 个元素节点就是每行 8 个数组的瞬态垃圾）；
 * 2. 同一节点 setup 多次时才升级为数组，且重跑顺序仍是登记顺序（区域 rebuild 用）；
 * 3. 非区域节点在构建返回处清引用（票 18 的契约不变），区域节点保留以便重跑。
 */
describe('node builder slot', () => {
  it('keeps a single builder closure instead of a per-node array', () => {
    let duringBuild;
    const node = div((element) => {
      duringBuild = element._builders;
    });

    expect(typeof duringBuild).toBe('function');
    expect(Array.isArray(duringBuild)).toBe(false);
    expect(node._builders).toBeNull();
  });

  it('only creates the slot for nodes that actually have a builder', () => {
    const node = div();

    expect('_builders' in node).toBe(false);
  });

  it('upgrades to an array when the same node is set up twice and keeps the order', () => {
    const order = [];
    const node = div();
    node.setup(() => order.push('first'));
    node.setup(() => order.push('second'));

    expect(Array.isArray(node._builders)).toBe(false);

    const region = div();
    region.setup((element) => {
      element.rebuildable();
      order.push('region-first');
    });
    region.setup(() => order.push('region-second'));

    expect(Array.isArray(region._builders)).toBe(true);
    order.length = 0;
    region.rebuild();
    expect(order).toEqual(['region-first', 'region-second']);
  });

  it('keeps the region builder alive while plain nodes release theirs', () => {
    const rows = ref(['a']);
    const region = div((element) => {
      element.rebuildable();
      element.child(ref('x'));
    });
    const plain = div((element) => element.child(rows.value[0]));

    expect(region._builders).not.toBeNull();
    expect(plain._builders).toBeNull();
    expect(rows.peek()).toEqual(['a']);
  });
});
