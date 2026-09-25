import { afterEach, describe, expect, it } from 'vitest';
import {
  computed,
  installSignals,
  isKeySet,
  keySet,
  li,
  ref,
  ul,
  vText
} from '@yoyaflow/yoya-core';
import { hydrate, renderToString } from './ssr.js';

/**
 * keySet 的可观察契约（票 38）：
 * 1. 元素是 KeyItem（`{ data, api }`）：排序 / 移动 / 换数据后两者不脱钩，键只有一个真源
 *    （`keyOf(item.data)`，不缓存）；
 * 2. 与 `ref(data[]) + keyed + 每行 computed` 逐项等价：DOM、`toHTML()`、SSR 输出逐字节一致；
 * 3. 同 key 同元素同 api；数据引用变了原位换新；键离场 → api.dispose 且元素消失，重现即新元素；
 * 4. 数据操作触发对账、`item.api` 上的信号写入**不触发**结构化 DOM 操作（O(1) 唤醒的来源）；
 * 5. 键不存在时写操作抛错、读返回空；重复键与非法参数照报；moveBefore(k, k) 是 no-op；
 * 6. 引擎无关：换 `installSignals` 的 store 形态适配器后仍然成立。
 */

const makeRows = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1, label: `label ${index + 1}` }));

function withDomCounters(run) {
  const counts = { insertBefore: 0, appendChild: 0, removeChild: 0, replaceChildren: 0 };
  const originals = {
    insertBefore: Node.prototype.insertBefore,
    appendChild: Node.prototype.appendChild,
    removeChild: Node.prototype.removeChild,
    replaceChildren: Element.prototype.replaceChildren
  };
  const total = () =>
    counts.insertBefore + counts.appendChild + counts.removeChild + counts.replaceChildren;

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
    return { counts, total: total(), result: run(counts) };
  } finally {
    Node.prototype.insertBefore = originals.insertBefore;
    Node.prototype.appendChild = originals.appendChild;
    Node.prototype.removeChild = originals.removeChild;
    Element.prototype.replaceChildren = originals.replaceChildren;
  }
}

/** 元素数组 → data-row-key 顺序，用来读对账结果。 */
const keysOfChildren = (element) =>
  [...element.children].map((child) => child.getAttribute('data-row-key'));

function storeShapedAdapter() {
  const registry = new WeakMap();
  const pending = new Map();
  let depth = 0;

  const notify = (source, value) => {
    const listeners = registry.get(source);
    if (listeners) {
      listeners.forEach((listener) => listener(value));
    }
  };

  return {
    name: 'store-shaped (test-only)',
    createSignal: (initial) => ({ value: initial }),
    read: (source) => source.value,
    write: (source, value) => {
      if (Object.is(source.value, value)) {
        return;
      }

      source.value = value;
      if (depth > 0) {
        pending.set(source, value);
      } else {
        notify(source, value);
      }
    },
    subscribe: (source, listener) => {
      let listeners = registry.get(source);
      if (!listeners) {
        listeners = new Set();
        registry.set(source, listeners);
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    batch: (run) => {
      depth += 1;
      try {
        return run();
      } finally {
        depth -= 1;
        if (depth === 0) {
          const jobs = [...pending];
          pending.clear();
          jobs.forEach(([source, value]) => notify(source, value));
        }
      }
    }
  };
}

function twoColumnList(set) {
  return ul((root) =>
    root.keyed(set, (item) =>
      li((line) => {
        line.child(vText(item.data.label));
        line.toggleClass('danger', item.api.selected);
      })
    )
  );
}

afterEach(() => {
  installSignals(null);
});

describe('keySet container', () => {
  it('renders the same markup as ref(list) + per-row computed', () => {
    const rows = makeRows(4);
    const selectedId = ref(1);
    const derived = ul((root) =>
      root.keyed(
        ref(rows),
        (row) => row.id,
        (row) =>
          li((line) => {
            line.child(vText(row.label));
            line.toggleClass(
              'danger',
              computed(() => selectedId.value === row.id)
            );
          })
      )
    );
    const set = keySet(
      rows,
      (row) => row.id,
      (item) => {
        item.api.selected = ref(item.data.id === 1);
      }
    );
    const container = twoColumnList(set);

    const derivedElement = derived.renderDom();
    const containerElement = container.renderDom();
    expect(containerElement.outerHTML).toBe(derivedElement.outerHTML);

    // 切换选中：派生写法写共享句柄（唤醒全部行），容器写法只写两行的 api
    selectedId.value = 3;
    set.item(1).api.selected.value = false;
    set.item(3).api.selected.value = true;

    expect(containerElement.outerHTML).toBe(derivedElement.outerHTML);
    expect(container.toHTML()).toBe(derived.toHTML());
  });

  it('keeps data and api paired through sort / move / replace / merge', () => {
    const set = keySet(
      makeRows(4),
      (row) => row.id,
      (item) => {
        item.api.mark = item.data.id;
      }
    );
    const paired = () =>
      set.peek().forEach((item) => expect(item.api.mark).toBe(set.keyOf(item.data)));

    paired();
    set.moveBefore(4, 1);
    paired();
    set.moveAfter(1, 3);
    paired();
    set.sort((left, right) => right.data.id - left.data.id);
    paired();
    set.replace(3, { id: 3, label: 'label 3 *' });
    set.merge(1, { label: 'merged' });
    paired();

    expect(isKeySet(set)).toBe(true);
    expect(set.keys()).toEqual([4, 3, 2, 1]);
    expect(set.get(3)).toEqual({ id: 3, label: 'label 3 *' });
    expect(set.item(1).data.label).toBe('merged');
    expect(set.values().map((row) => row.id)).toEqual([4, 3, 2, 1]);
    expect(set.items().map((item) => item.data.id)).toEqual([4, 3, 2, 1]);
    expect(set.size).toBe(4);
    expect(set.indexOf(2)).toBe(2);
    expect(set.indexOf(99)).toBe(-1);
    expect(set.has(2)).toBe(true);
    expect(set.item(99)).toBeUndefined();
    expect(set.get(99)).toBeUndefined();
  });

  it('reuses one element per key and rebuilds only rows whose data reference changed', () => {
    const set = keySet(makeRows(3), (row) => row.id);
    const builds = [];
    const list = ul((root) =>
      root.keyed(set, (item, index) => {
        builds.push(item.data.id);
        return li((line) => line.child(vText(`${item.data.label}@${index}`)));
      })
    );
    const element = list.renderDom();
    const firstItem = set.item(1);
    const firstApi = firstItem.api;
    const firstNode = [...element.children].find(
      (child) => child.getAttribute('data-row-key') === '1'
    );

    set.moveBefore(3, 1);
    list.flush();
    expect(keysOfChildren(element)).toEqual(['3', '1', '2']);
    expect(set.item(1)).toBe(firstItem);
    expect(set.item(1).api).toBe(firstApi);
    expect([...element.children].find((child) => child.getAttribute('data-row-key') === '1')).toBe(
      firstNode
    );
    expect(builds.filter((id) => id === 1)).toHaveLength(1);

    set.replace(1, { id: 1, label: 'label 1 *' });
    list.flush();
    expect(set.item(1)).toBe(firstItem);
    expect(set.item(1).api).toBe(firstApi);
    expect(builds.filter((id) => id === 1)).toHaveLength(2);
    const rebuilt = [...element.children].find(
      (child) => child.getAttribute('data-row-key') === '1'
    );
    expect(rebuilt).not.toBe(firstNode);
    expect(rebuilt.textContent).toBe('label 1 *@1');

    set.remove(1);
    list.flush();
    expect(set.item(1)).toBeUndefined();
    set.add({ id: 1, label: 'label 1 back' });
    list.flush();
    expect(set.item(1)).not.toBe(firstItem);
    expect(set.item(1).api).not.toBe(firstApi);
  });

  it('releases the api of departing keys and only those', () => {
    const disposed = [];
    const set = keySet(
      makeRows(3),
      (row) => row.id,
      (item) => {
        item.api.dispose = () => disposed.push(item.data.id);
      }
    );
    const list = ul((root) =>
      root.keyed(set, (item) => li((line) => line.child(vText(item.data.label))))
    );
    list.renderDom();

    set.remove(2);
    expect(disposed).toEqual([2]);
    expect(set.item(2)).toBeUndefined();
    expect(set.item(1)).toBeDefined();

    set.replace(1, { id: 9, label: 'nine' });
    expect(disposed).toEqual([2, 1]);
    expect(set.item(1)).toBeUndefined();
    expect(set.item(9).api.dispose).toBeDefined();

    set.clear();
    list.flush();
    expect(disposed).toEqual([2, 1, 3, 9]);
    expect(set.size).toBe(0);
    expect(set.items()).toEqual([]);

    // 没渲染过的容器同样按 key 释放，不依赖节点或对账
    const bareDisposed = [];
    const bare = keySet(
      makeRows(2),
      (row) => row.id,
      (item) => {
        item.api.dispose = () => bareDisposed.push(item.data.id);
      }
    );
    bare.clear();
    expect(bareDisposed).toEqual([1, 2]);
    expect(disposed).toEqual([2, 1, 3, 9]);
  });

  it('reconciles on data writes but does not touch the DOM for api writes', () => {
    const set = keySet(
      makeRows(3),
      (row) => row.id,
      (item) => {
        item.api.selected = ref(false);
      }
    );
    const list = twoColumnList(set);
    const element = list.renderDom();
    const before = [...element.children];

    const apiWrite = withDomCounters(() => {
      set.item(2).api.selected.value = true;
    });
    expect(apiWrite.total).toBe(0);
    expect(element.children[1].classList.contains('danger')).toBe(true);
    expect(element.children[0].classList.contains('danger')).toBe(false);
    expect([...element.children]).toEqual(before);

    const moved = withDomCounters(() => {
      set.moveBefore(3, 1);
      list.flush();
    });
    expect(moved.counts.insertBefore).toBe(1);
    expect(keysOfChildren(element)).toEqual(['3', '1', '2']);
    expect([...element.children]).toEqual([before[2], before[0], before[1]]);
  });

  it('treats same-key moves as no-ops and null targets as the ends', () => {
    const set = keySet(makeRows(4), (row) => row.id);
    const list = ul((root) =>
      root.keyed(set, (item) => li((line) => line.child(vText(item.data.label))))
    );
    const element = list.renderDom();

    const noop = withDomCounters(() => {
      set.moveBefore(2, 2);
      set.moveAfter(2, 2);
    });
    expect(noop.total).toBe(0);
    expect(set.keys()).toEqual([1, 2, 3, 4]);

    set.moveAfter(1, 3);
    expect(set.keys()).toEqual([2, 3, 1, 4]);
    set.moveBefore(1);
    expect(set.keys()).toEqual([2, 3, 4, 1]);
    set.moveAfter(3);
    expect(set.keys()).toEqual([3, 2, 4, 1]);

    list.flush();
    expect(keysOfChildren(element)).toEqual(['3', '2', '4', '1']);
  });

  it('sorts stably through a comparator over items', () => {
    const set = keySet(
      makeRows(4),
      (row) => row.id,
      (item) => {
        item.api.rank = item.data.id % 2;
      }
    );

    set.sort((left, right) => left.api.rank - right.api.rank);

    expect(set.keys()).toEqual([2, 4, 1, 3]);
    expect(set.values().map((row) => row.id)).toEqual([2, 4, 1, 3]);
  });

  it('coalesces batched writes into a single notification', () => {
    const set = keySet(makeRows(2), (row) => row.id);
    let notifications = 0;
    set.subscribe(() => {
      notifications += 1;
    });

    set.add({ id: 3 });
    set.add({ id: 4 });
    expect(notifications).toBe(2);

    set.batch(() => {
      set.add({ id: 5 });
      set.add({ id: 6 });
    });
    expect(notifications).toBe(3);
    expect(set.keys()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('rejects unknown keys and invalid operations', () => {
    const set = keySet(makeRows(3), (row) => row.id);

    expect(() => set.replace(99, { id: 99 })).toThrow(/key not found/);
    expect(() => set.remove(99)).toThrow(/key not found/);
    expect(() => set.insertAfter({ id: 99 }, 99)).toThrow(/key not found/);
    expect(() => set.moveBefore(99, 1)).toThrow(/key not found/);
    expect(() => set.moveBefore(1, 99)).toThrow(/key not found/);
    expect(() => set.merge(1, null)).toThrow(/object patch/);
    expect(() => set.sort(3)).toThrow(/comparator/);
    expect(() => keySet([], null)).toThrow(/keyOf/);
    expect(() => keySet([], (value) => value, 5)).toThrow(/define/);
    expect(() => keySet([{ id: 1 }, { id: 1 }], (row) => row.id)).toThrow(/duplicate key/);

    const scalars = keySet([1, 2], (value) => value);
    expect(() => scalars.merge(1, { a: 1 })).toThrow(/object row/);
  });

  it('serializes and hydrates like the ref-based list', () => {
    const state = { rows: makeRows(3), selectedId: 2 };
    const derivedPage = () => {
      const selectedId = ref(state.selectedId);
      return ul((root) =>
        root.keyed(
          ref(state.rows),
          (row) => row.id,
          (row) =>
            li((line) => {
              line.child(vText(row.label));
              line.toggleClass(
                'danger',
                computed(() => selectedId.value === row.id)
              );
            })
        )
      );
    };
    const makeContainerPage = () => {
      const set = keySet(
        state.rows,
        (row) => row.id,
        (item) => {
          item.api.selected = ref(item.data.id === state.selectedId);
        }
      );
      return { set, node: twoColumnList(set) };
    };
    const containerPage = () => makeContainerPage().node;

    expect(renderToString(containerPage).html).toBe(renderToString(derivedPage).html);

    const target = document.createElement('div');
    target.innerHTML = renderToString(containerPage).html;
    const page = makeContainerPage();
    hydrate(page.node, target);
    const element = target.firstElementChild;
    expect(element.children).toHaveLength(3);
    expect(element.children[1].classList.contains('danger')).toBe(true);

    // hydrate 后仍是同一套语义：api 写入只刷该行，数据操作走对账
    page.set.item(1).api.selected.value = true;
    expect(element.children[0].classList.contains('danger')).toBe(true);
    page.set.remove(3);
    page.node.flush();
    expect(element.children).toHaveLength(2);
  });

  it('works on a third-party store-shaped engine', () => {
    installSignals(storeShapedAdapter());
    const set = keySet(
      makeRows(3),
      (row) => row.id,
      (item) => {
        item.api.selected = ref(false);
      }
    );
    const list = twoColumnList(set);
    const element = list.renderDom();

    expect(element.children).toHaveLength(3);
    set.item(2).api.selected.value = true;
    expect(element.children[1].classList.contains('danger')).toBe(true);

    set.remove(2);
    list.flush();
    expect(element.children).toHaveLength(2);
    expect(keysOfChildren(element)).toEqual(['1', '3']);
  });
});
