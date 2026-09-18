import { afterEach, describe, expect, it } from 'vitest';
import {
  computed,
  createKeyedSet,
  div,
  installSignals,
  ref,
  span,
  table,
  tr,
  vText
} from '../index.js';
import { defaultAdapter } from './signals/engine.js';
import { renderToString } from './ssr.js';

/** 计数适配器：统计 createSignal / write，用来把「唤醒范围」变成可断言的数字。 */
function createCountingAdapter() {
  const counts = { createSignal: 0, write: 0 };
  const adapter = {
    ...defaultAdapter,
    createSignal(initial) {
      counts.createSignal += 1;
      return defaultAdapter.createSignal(initial);
    },
    write(source, value) {
      counts.write += 1;
      return defaultAdapter.write(source, value);
    }
  };
  return { adapter, counts };
}

/** store 形态适配器（换引擎路径）：只保证本原语不依赖内化引擎的类型。 */
function createStoreAdapter() {
  const registry = new WeakMap();
  let depth = 0;
  const pending = new Map();
  const notify = (source, value) => {
    registry.get(source)?.forEach((listener) => listener(value));
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
          pending.forEach((value, source) => notify(source, value));
          pending.clear();
        }
      }
    }
  };
}

afterEach(() => {
  installSignals(null);
});

const makeRows = (count) => Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

/** 行结构：id 单元格 + 一行「激活态」，写法由 state 决定。 */
function buildList(rows, state, writing) {
  const list = table((node) => {
    node.tbody((body) => {
      body.keyed(
        rows,
        (row) => row.id,
        (row) =>
          tr((line) => {
            line.attr('data-row-id', String(row.id));
            line.td((cell) => cell.className('col-md-1').child(String(row.id)));
            if (writing === 'computed') {
              line.toggleClass(
                'danger',
                computed(() => state.value === row.id)
              );
            } else {
              line.toggleClass('danger', state.has(row.id));
            }
          })
      );
    });
  });
  return list;
}

const dangerIds = (element) =>
  [...element.querySelectorAll('tbody tr')]
    .filter((row) => row.classList.contains('danger'))
    .map((row) => row.getAttribute('data-row-id'));

describe('createKeyedSet', () => {
  it('produces the same DOM as the per-row computed writing', () => {
    const rows = makeRows(20);
    const selected = ref(null);
    const withComputed = buildList(ref(rows), selected, 'computed');
    const computedElement = withComputed.renderDom();
    selected.value = 7;
    withComputed.flush();

    const active = createKeyedSet();
    const withSet = buildList(ref(rows), active, 'keyed');
    const setElement = withSet.renderDom();
    active.set(7);

    expect(dangerIds(computedElement)).toEqual(['7']);
    expect(dangerIds(setElement)).toEqual(['7']);

    selected.value = 3;
    withComputed.flush();
    active.set(3);

    expect(dangerIds(computedElement)).toEqual(['3']);
    expect(dangerIds(setElement)).toEqual(['3']);
  });

  it('wakes only the two affected keys while the computed writing wakes every row', () => {
    const count = 200;
    const rows = makeRows(count);

    // 派生写法：写一次要跑 N 次派生
    let evaluations = 0;
    const selected = ref(null);
    const computedList = table((node) => {
      node.tbody((body) => {
        body.keyed(
          ref(rows),
          (row) => row.id,
          (row) =>
            tr((line) => {
              line.toggleClass(
                'danger',
                computed(() => {
                  evaluations += 1;
                  return selected.value === row.id;
                })
              );
            })
        );
      });
    });
    computedList.renderDom();
    evaluations = 0;
    selected.value = 5;
    expect(evaluations).toBe(count);

    // 按键集合：一次 set 只写「旧键 / 新键」，且与行数无关
    const { adapter, counts } = createCountingAdapter();
    installSignals(adapter);
    const active = createKeyedSet();
    const list = buildList(ref(rows), active, 'keyed');
    list.renderDom();

    counts.write = 0;
    active.set(5);
    expect(counts.write).toBeLessThanOrEqual(1); // 首次激活：只有一个键要写

    counts.write = 0;
    active.set(9);
    expect(counts.write).toBe(2); // 旧键置 false + 新键置 true

    counts.write = 0;
    active.set(9);
    expect(counts.write).toBe(0); // 等值不提交
  });

  it('only writes the diff on replace(), so select-all stays linear', () => {
    const rows = makeRows(1000);
    const { adapter, counts } = createCountingAdapter();
    installSignals(adapter);
    const active = createKeyedSet();
    buildList(ref(rows), active, 'keyed').renderDom();

    counts.write = 0;
    active.replace(rows.map((row) => row.id));
    expect(counts.write).toBe(1000);

    counts.write = 0;
    active.replace(rows.map((row) => row.id));
    expect(counts.write).toBe(0);

    counts.write = 0;
    active.replace(rows.slice(0, 999).map((row) => row.id));
    expect(counts.write).toBe(1);
  });

  it('serves class, attribute and text value positions from one handle', () => {
    const rows = makeRows(3);
    const active = createKeyedSet();
    const list = div((root) => {
      root.keyed(
        ref(rows),
        (row) => row.id,
        (row) =>
          div((line) => {
            line.attr('data-row-id', String(row.id));
            line.attr('data-active', active.has(row.id));
            line.className('row');
            line.toggleClass('danger', active.has(row.id));
            line.child(vText(active.has(row.id)));
          })
      );
    });
    const element = list.renderDom();

    active.set(2);

    const second = element.querySelector('[data-row-id="2"]');
    const first = element.querySelector('[data-row-id="1"]');
    // true → 框架按布尔属性语义写成 name=name；false → 移除属性
    expect(second.hasAttribute('data-active')).toBe(true);
    expect(second.classList.contains('danger')).toBe(true);
    expect(second.textContent).toBe('true');
    expect(first.hasAttribute('data-active')).toBe(false);
    expect(first.textContent).toBe('false');
  });

  it('renders the active key on the server without subscribing', () => {
    const rows = makeRows(3);
    const active = createKeyedSet();
    active.set(2);
    const page = div((root) => {
      root.keyed(
        ref(rows),
        (row) => row.id,
        (row) =>
          span((line) => {
            line.attr('data-row-id', String(row.id));
            line.toggleClass('danger', active.has(row.id));
          })
      );
    });

    const { html } = renderToString(page);
    const holder = document.createElement('div');
    holder.innerHTML = html;

    expect(holder.querySelector('[data-row-id="2"]').classList.contains('danger')).toBe(true);
    expect(holder.querySelector('[data-row-id="1"]').classList.contains('danger')).toBe(false);
    expect(active.isActive(2)).toBe(true);
  });

  it('keeps one bucket per observed key and releases it on drop / dispose', () => {
    const { adapter, counts } = createCountingAdapter();
    installSignals(adapter);
    const active = createKeyedSet();

    counts.createSignal = 0;
    active.has('a');
    active.has('b');
    active.has('a');
    expect(counts.createSignal).toBe(2); // 每个键一个桶，重复 has 不新建

    active.drop('a');
    counts.createSignal = 0;
    active.has('a');
    expect(counts.createSignal).toBe(1); // 桶已释放，重新按当时状态建

    active.dispose();
    counts.createSignal = 0;
    active.has('b');
    expect(counts.createSignal).toBe(1);
    expect(active.keys()).toEqual([]);
  });

  it('works with a third-party shaped engine', () => {
    installSignals(createStoreAdapter());
    const rows = makeRows(5);
    const active = createKeyedSet();
    const list = buildList(ref(rows), active, 'keyed');
    const element = list.renderDom();

    active.set(4);
    expect(dangerIds(element)).toEqual(['4']);

    active.set(1);
    expect(dangerIds(element)).toEqual(['1']);
  });

  it('reflects membership for keys that were activated before they were observed', () => {
    const active = createKeyedSet();
    active.add('later');
    const handle = active.has('later');

    expect(handle.value).toBe(true);
    active.remove('later');
    expect(handle.value).toBe(false);
  });
});
