import { describe, expect, it } from 'vitest';
import { li, ref, ul, vText } from '@yoyaflow/yoya-core';

/**
 * keyed 对账的两条「无移动快路径」（票 30）+ 记账收敛（票 26）的可观察契约：
 * 1. 清空：整批摘除走 `replaceChildren`（票 15），不出现逐行 removeChild / insertBefore；
 * 2. 行引用与顺序都没变（含「重新赋值同一批行」）：零 DOM 操作、成员节点身份复用；
 * 3. 交换两行仍然只搬两行（票 10 的判据不许回退）；
 * 4. 清空后重建：行数、顺序、身份都正确；
 * 5. 段里有非成员兄弟时，清空只摘成员、兄弟留在原位。
 */
function withDomCounters(run) {
  const counts = { insertBefore: 0, appendChild: 0, removeChild: 0, replaceChildren: 0 };
  const originals = {
    insertBefore: Node.prototype.insertBefore,
    appendChild: Node.prototype.appendChild,
    removeChild: Node.prototype.removeChild,
    replaceChildren: Element.prototype.replaceChildren
  };

  Node.prototype.insertBefore = function (...args) {
    counts.insertBefore += 1;
    return originals.insertBefore.apply(this, args);
  };
  Node.prototype.appendChild = function (...args) {
    counts.appendChild += 1;
    return originals.appendChild.apply(this, args);
  };
  Node.prototype.removeChild = function (...args) {
    counts.removeChild += 1;
    return originals.removeChild.apply(this, args);
  };
  Element.prototype.replaceChildren = function (...args) {
    counts.replaceChildren += 1;
    return originals.replaceChildren.apply(this, args);
  };

  try {
    return { counts, result: run(counts) };
  } finally {
    Node.prototype.insertBefore = originals.insertBefore;
    Node.prototype.appendChild = originals.appendChild;
    Node.prototype.removeChild = originals.removeChild;
    Element.prototype.replaceChildren = originals.replaceChildren;
  }
}

function buildList(rows, extra = null) {
  const list = ul((node) => {
    if (extra) {
      node.li(() => {});
    }
    node.keyed(
      rows,
      (row) => row.id,
      (row) => li((item) => item.child(vText(row.label)))
    );
  });
  return list;
}

const makeRows = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1, label: `label ${index + 1}` }));

describe('keyed sync fast paths', () => {
  it('clears a segment with one batch removal and no per-row DOM work', () => {
    const rows = ref(makeRows(50));
    const list = buildList(rows);
    const element = list.renderDom();
    const members = [...element.children];

    const { counts } = withDomCounters(() => {
      rows.value = [];
      list.flush();
    });

    expect(element.children.length).toBe(0);
    expect(counts.replaceChildren).toBe(1);
    expect(counts.removeChild).toBe(0);
    expect(counts.insertBefore).toBe(0);
    expect(members.length).toBe(50);
  });

  it('keeps member nodes and touches no DOM when the same rows are re-synced', () => {
    const rows = ref(makeRows(20));
    const list = buildList(rows);
    const element = list.renderDom();
    const before = [...element.children];
    const nodes = [...list.children()];
    const reordered = rows.peek().slice();

    const { counts } = withDomCounters(() => {
      rows.value = reordered;
      list.flush();
    });

    expect([...element.children]).toEqual(before);
    expect([...list.children()]).toEqual(nodes);
    expect(counts).toEqual({ insertBefore: 0, appendChild: 0, removeChild: 0, replaceChildren: 0 });
  });

  it('still moves exactly two rows when two rows are swapped', () => {
    const rows = ref(makeRows(20));
    const list = buildList(rows);
    const element = list.renderDom();
    const next = rows.peek().slice();
    next[1] = rows.peek()[18];
    next[18] = rows.peek()[1];

    const { counts } = withDomCounters(() => {
      rows.value = next;
      list.flush();
    });

    expect(counts.insertBefore).toBe(2);
    expect(counts.removeChild).toBe(0);
    expect([...element.children].map((item) => item.textContent)).toEqual(
      next.map((row) => row.label)
    );
  });

  it('rebuilds a fresh list after a clear', () => {
    const rows = ref(makeRows(10));
    const list = buildList(rows);
    const element = list.renderDom();

    rows.value = [];
    list.flush();
    expect(element.children.length).toBe(0);

    rows.value = makeRows(10);
    list.flush();

    expect(element.children.length).toBe(10);
    expect([...element.children].map((item) => item.textContent)).toEqual(
      makeRows(10).map((row) => row.label)
    );
  });

  it('only detaches members when the segment has a non-member sibling', () => {
    const rows = ref(makeRows(5));
    const list = buildList(rows, true);
    const element = list.renderDom();
    expect(element.children.length).toBe(6);

    const sibling = element.children[0];
    rows.value = [];
    list.flush();

    expect(element.children.length).toBe(1);
    expect(element.children[0]).toBe(sibling);
  });

  it('reports duplicate keys before touching the DOM', () => {
    const rows = ref(makeRows(3));
    const list = buildList(rows);
    list.renderDom();
    const duplicate = [...rows.peek(), rows.peek()[0]];

    const { counts } = withDomCounters(() => {
      expect(() => {
        rows.value = duplicate;
        list.flush();
      }).toThrow(/duplicate row key/);
    });

    expect(counts).toEqual({ insertBefore: 0, appendChild: 0, removeChild: 0, replaceChildren: 0 });
  });
});
