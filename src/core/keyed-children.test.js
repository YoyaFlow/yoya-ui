import { describe, expect, it } from 'vitest';
import { div, li, ref, ul } from '../index.js';

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
