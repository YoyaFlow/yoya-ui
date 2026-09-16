import { describe, expect, it } from 'vitest';
import { div, li, ref, ul, vText } from '../index.js';

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
