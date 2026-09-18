import { describe, expect, it } from 'vitest';
import { div, li, ref, ul, vNode, vText } from '../index.js';

function permutations(items) {
  if (items.length <= 1) {
    return [items];
  }

  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
      item,
      ...rest
    ])
  );
}

describe('keyed children binding', () => {
  it('renders rows from a signal and reuses nodes across reorders', () => {
    const rows = ref([
      { id: 1, title: 'A' },
      { id: 2, title: 'B' }
    ]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.title)
      );
    });
    const element = list.renderDom();

    expect(element.textContent).toBe('AB');
    const firstItem = list.children()[0];

    rows.value = [...rows.value].reverse();

    expect(element.textContent).toBe('BA');
    expect(list.children()[1]).toBe(firstItem);
    expect(element.children[1]).toBe(firstItem._el);
  });

  it('keeps node identity when the row reference is unchanged', () => {
    const rowA = { id: 'a', title: 'A' };
    const rows = ref([rowA]);
    const builds = [];
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => {
          builds.push(row.id);
          return li(row.title);
        }
      );
    });
    list.renderDom();

    rows.value = [{ id: 'b', title: 'B' }, rowA];

    expect(builds).toEqual(['a', 'b']);
    expect(list.textContent()).toBe('BA');
  });

  it('replaces an item in place when its row reference changes', () => {
    const rows = ref([{ id: 1 }, { id: 2 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(`row-${row.id}`)
      );
    });
    const element = list.renderDom();
    const secondNode = list.children()[1];

    rows.value = [rows.value[0], { id: 2, version: 2 }];

    expect(list.children()[1]).not.toBe(secondNode);
    expect(element.textContent).toBe('row-1row-2');
  });

  it('adds, removes, and mixes with static siblings', () => {
    const rows = ref([{ id: 'x' }]);
    const list = ul((node) => {
      node.li('head');
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(`item-${row.id}`)
      );
      node.li('tail');
    });
    const element = list.renderDom();

    rows.value = [{ id: 'x' }, { id: 'y' }];
    expect(element.textContent).toBe('headitem-xitem-ytail');

    rows.value = [{ id: 'y' }];
    expect(element.textContent).toBe('headitem-ytail');
  });

  it('rejects duplicate row keys and non-signal sources', () => {
    const rows = ref([{ id: 1 }, { id: 2 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.id)
      );
    });
    list.renderDom();

    expect(() => {
      rows.value = [{ id: 1 }, { id: 1 }];
    }).toThrow(/duplicate/i);
    expect(() => div().keyed([], () => li('x'))).toThrow(/signal/i);
  });

  it('self-heals after clearChildren', () => {
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.id)
      );
    });
    list.renderDom();
    list.clearChildren();

    rows.value = [{ id: 3 }];

    expect(list.textContent()).toBe('3');
  });

  it('renders once on the server without subscribing', () => {
    const rows = ref([{ id: 1, title: 'A' }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.title)
      );
    });

    expect(list.toHTML()).toBe('<ul><li data-row-key="1">A</li></ul>');

    rows.value = [];
    expect(list.toHTML()).toBe('<ul><li data-row-key="1">A</li></ul>');
  });

  it('moves only the rows whose position changed', () => {
    const rows = ref(Array.from({ length: 100 }, (unused, index) => ({ id: index + 1 })));
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(String(row.id))
      );
    });
    const element = list.renderDom();
    const moved = [];
    const originalInsertBefore = element.insertBefore.bind(element);
    element.insertBefore = (child, anchor) => {
      moved.push(child.textContent);
      return originalInsertBefore(child, anchor);
    };
    const identities = list.children().map((row) => row);

    const swapped = rows.peek().slice();
    [swapped[0], swapped[99]] = [swapped[99], swapped[0]];
    rows.value = swapped;

    // 首尾两行换位只搬这两行；旧的相邻比较会把后面 99 行逐个挪一遍。
    expect(moved).toEqual(['1', '100']);
    expect(element.firstChild.textContent).toBe('100');
    expect(element.lastChild.textContent).toBe('1');
    expect(list.children().map((row) => row)).toEqual([
      identities[99],
      ...identities.slice(1, 99),
      identities[0]
    ]);
  });

  it('keeps the moved count minimal for rotations and no-op updates', () => {
    const rows = ref([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(String(row.id))
      );
    });
    const element = list.renderDom();
    const moved = [];
    const originalInsertBefore = element.insertBefore.bind(element);
    element.insertBefore = (child, anchor) => {
      moved.push(child.textContent);
      return originalInsertBefore(child, anchor);
    };

    rows.value = rows.peek().slice();
    expect(moved).toEqual([]);

    // [1, 2, 3] → [3, 1, 2]：只把 3 挪到最前
    rows.value = [rows.peek()[2], rows.peek()[0], rows.peek()[1]];
    expect(moved).toEqual(['3']);
    expect(element.textContent).toBe('312');
  });

  it('keeps view order, DOM order and node identity for every reorder of five rows', () => {
    for (const order of permutations([1, 2, 3, 4, 5])) {
      const rows = ref([1, 2, 3, 4, 5].map((id) => ({ id })));
      const list = ul((node) => {
        node.keyed(
          rows,
          (row) => row.id,
          (row) => li(String(row.id))
        );
      });
      const element = list.renderDom();
      const identities = list.children();

      rows.value = order.map((id) => rows.peek().find((row) => row.id === id));

      expect(element.textContent).toBe(order.join(''));
      expect(list.children().map((row) => Number(row.textContent()))).toEqual(order);
      order.forEach((id, index) => {
        expect(list.children()[index]).toBe(identities[id - 1]);
      });
    }
  });

  it('keeps two keyed segments in their own regions', () => {
    const left = ref([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const right = ref([{ id: 'x' }, { id: 'y' }]);
    const list = ul((node) => {
      node.li('head');
      node.keyed(
        left,
        (row) => row.id,
        (row) => li(row.id)
      );
      node.li('middle');
      node.keyed(
        right,
        (row) => row.id,
        (row) => li(row.id)
      );
      node.li('tail');
    });
    const element = list.renderDom();

    left.value = [left.peek()[2], left.peek()[0], left.peek()[1]];
    right.value = [right.peek()[1], right.peek()[0]];

    expect(element.textContent).toBe('headcabmiddleyxtail');
    expect(list.children().map((child) => child.textContent())).toEqual([
      'head',
      'c',
      'a',
      'b',
      'middle',
      'y',
      'x',
      'tail'
    ]);
  });

  it('handles delete, append and reorder in one update', () => {
    const rows = ref([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(String(row.id))
      );
      node.li('tail');
    });
    const element = list.renderDom();

    rows.value = [{ id: 4 }, { id: 1 }, { id: 5 }];

    expect(element.textContent).toBe('415tail');
    expect(list.children().map((child) => child.textContent())).toEqual(['4', '1', '5', 'tail']);
  });

  it('adopts mountable conditions on keyed rows', () => {
    const visible = ref(false);
    const rows = ref([{ id: 1 }, { id: 2 }]);
    const list = ul((node) => {
      node.li('head');
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(String(row.id)).mountable(row.id === 2 ? visible : true)
      );
      node.li('tail');
    });
    const element = list.renderDom();
    const hiddenRow = list.children()[2];

    // 条件为假：行不落地，但节点、状态与渲染结果都还在
    expect(element.textContent).toBe('head1tail');
    expect(hiddenRow.isMounted()).toBe(false);
    expect(hiddenRow._el).not.toBeNull();

    visible.value = true;
    expect(element.textContent).toBe('head12tail');
    expect(element.children[2]).toBe(hiddenRow._el);

    // 含隐藏行的换位：视图树与 DOM 都按可见顺序对齐
    visible.value = false;
    rows.value = [rows.peek()[1], rows.peek()[0]];
    expect(element.textContent).toBe('head1tail');

    visible.value = true;
    expect(element.textContent).toBe('head21tail');
    expect(list.children().map((child) => child.textContent())).toEqual(['head', '2', '1', 'tail']);
  });

  it('reorders multi-root component rows as a group', () => {
    const rows = ref([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => () => [li(`${row.id}-1`), li(`${row.id}-2`)]
      );
    });
    const element = list.renderDom();
    const firstRowNode = list.children()[0];

    expect(element.textContent).toBe('a-1a-2b-1b-2c-1c-2');

    rows.value = [rows.peek()[2], rows.peek()[0], rows.peek()[1]];

    expect(element.textContent).toBe('c-1c-2a-1a-2b-1b-2');
    expect(list.children()[1]).toBe(firstRowNode);
    expect([...element.children].map((child) => child.textContent)).toEqual([
      'c-1',
      'c-2',
      'a-1',
      'a-2',
      'b-1',
      'b-2'
    ]);
  });

  it('keeps a mounted multi-root row together when it goes away and comes back', () => {
    const visible = ref(false);
    const rows = ref([{ id: 'a' }, { id: 'b' }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) =>
          vNode(() => [li(`${row.id}-1`), li(`${row.id}-2`)]).mountable(
            row.id === 'b' ? visible : true
          )
      );
    });
    const element = list.renderDom();
    expect(element.textContent).toBe('a-1a-2');

    visible.value = true;
    expect(element.textContent).toBe('a-1a-2b-1b-2');

    visible.value = false;
    expect(element.textContent).toBe('a-1a-2');

    rows.value = [rows.peek()[1], rows.peek()[0]];
    visible.value = true;
    expect(element.textContent).toBe('b-1b-2a-1a-2');
  });
});

describe('keyed row update protocol', () => {
  it('reuses nodes for rows that compare equal even when the reference changed', () => {
    const rows = ref([{ id: 1, title: 'A' }]);
    const builds = [];
    const compared = [];
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => {
          builds.push(row.id);
          return li(row.title);
        },
        {
          equals: (prev, next) => {
            compared.push([prev.title, next.title]);
            return prev.title === next.title;
          }
        }
      );
    });
    const element = list.renderDom();
    const firstRow = list.children()[0];

    rows.value = [{ id: 1, title: 'A' }];

    expect(builds).toEqual([1]);
    expect(compared).toEqual([['A', 'A']]);
    expect(list.children()[0]).toBe(firstRow);
    expect(element.textContent).toBe('A');
  });

  it('updates rows in place through the update hook instead of rebuilding them', () => {
    const rows = ref([{ id: 1, title: 'A' }]);
    const builds = [];
    const updates = [];
    const titles = new Map();
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => {
          builds.push(row.id);
          const title = ref(row.title);
          titles.set(row.id, title);
          return li((item) => item.child(vText(title)));
        },
        {
          update: (rowNode, prev, next) => {
            updates.push([prev.title, next.title]);
            titles.get(next.id).value = next.title;
            return rowNode;
          }
        }
      );
    });
    const element = list.renderDom();
    const firstRow = list.children()[0];

    rows.value = [{ id: 1, title: 'B' }];

    expect(builds).toEqual([1]);
    expect(updates).toEqual([['A', 'B']]);
    expect(list.children()[0]).toBe(firstRow);
    expect(element.textContent).toBe('B');
  });

  it('prefers equals over update and rebuilds rows that are neither', () => {
    const rows = ref([{ id: 1, title: 'A' }]);
    const calls = [];
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => {
          calls.push(`build:${row.title}`);
          return li(row.title);
        },
        {
          equals: (prev, next) => {
            calls.push(`equals:${prev.title}->${next.title}`);
            return prev.title === next.title;
          },
          update: (rowNode, prev, next) => {
            calls.push(`update:${prev.title}->${next.title}`);
            return rowNode;
          }
        }
      );
    });
    const element = list.renderDom();
    const firstRow = list.children()[0];

    rows.value = [{ id: 1, title: 'A' }];
    expect(calls).toEqual(['build:A', 'equals:A->A']);
    expect(list.children()[0]).toBe(firstRow);

    // 内容真的变了：equals 为假 → 走原地更新
    rows.value = [{ id: 1, title: 'B' }];
    expect(calls.slice(-2)).toEqual(['equals:A->B', 'update:A->B']);
    expect(list.children()[0]).toBe(firstRow);
    expect(element.textContent).toBe('A');

    // 没有 update 时保持旧行为：原位换新
    const plainRows = ref([{ id: 7, title: 'X' }]);
    const plainList = ul((node) => {
      node.keyed(
        plainRows,
        (row) => row.id,
        (row) => li(row.title),
        { equals: () => false }
      );
    });
    plainList.renderDom();
    const plainRow = plainList.children()[0];

    plainRows.value = [{ id: 7, title: 'Y' }];

    expect(plainList.children()[0]).not.toBe(plainRow);
    expect(plainList.textContent()).toBe('Y');
  });

  it('keeps identity on reorder while the update hook is declared', () => {
    const rows = ref([
      { id: 1, title: 'A' },
      { id: 2, title: 'B' }
    ]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.title),
        { update: () => {} }
      );
    });
    list.renderDom();
    const firstRow = list.children()[0];

    rows.value = [rows.value[1], { id: 1, title: 'A2' }];

    expect(list.children()[1]).toBe(firstRow);
    expect(list.textContent()).toBe('BA');
  });

  it('rejects malformed options', () => {
    const rows = ref([]);

    expect(() =>
      ul((node) =>
        node.keyed(
          rows,
          (row) => row.id,
          () => li(),
          []
        )
      )
    ).toThrow(/options must be a plain object/);
    expect(() =>
      ul((node) =>
        node.keyed(
          rows,
          (row) => row.id,
          () => li(),
          { equals: 'nope' }
        )
      )
    ).toThrow(/equals must be a function/);
    expect(() =>
      ul((node) =>
        node.keyed(
          rows,
          (row) => row.id,
          () => li(),
          { update: 1 }
        )
      )
    ).toThrow(/update must be a function/);
  });
});
