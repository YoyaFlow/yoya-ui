import { batch as coreBatch, ref } from './signals/handle.js';

/**
 * keySet：按键的有序容器——`ref([])` 的替代品，同时按 key 保管「行行为 api」。
 *
 * 元素是 KeyItem 而不是裸数据：
 *
 *     KeyItem = { data, api }
 *
 * - `data`：应用那一行数据（`replace` / `merge` 换掉的就是它）；
 * - `api`：应用这一行的状态与命令（`item.api.selected = ref(false)`），
 *   **同 key 同 api**，key 离场时容器调用 `api.dispose?.()` 并丢弃元素。
 *
 * 之所以把两者放进同一个元素：排序、插入、移动、整表替换全都作用在元素上，
 * data 与 api 一起被搬动，结构上不存在「换了数据却丢了状态」或反过来的可能；
 * 键的身份由 `keyOf(data)` 决定（不缓存 key，只有一个真源）。
 *
 * 渲染仍在 DSL 里，keyed 直接接收容器：
 *
 *     const list = keySet(rows, (row) => row.id, (item) => {
 *       item.api.selected = ref(false);
 *       item.api.select = () => { item.api.selected.value = true; };
 *     });
 *
 *     tbody((body) => {
 *       body.keyed(list, (item) =>                      // item = KeyItem
 *         tr((line) => {
 *           line.attr('data-row-id', String(item.data.id));
 *           line.toggleClass('danger', item.api.selected);
 *           line.on('click', item.api.select);
 *         }));
 *     });
 *
 * 写数据走数据操作（每次产出新数组，容器**永不就地改数组**、绝不就地改 `data` 自身），
 * 读元素走 `item(key)` / `items()` / 写句柄触发的 keyed 对账；改渲染字段只写 `item.api` 上的信号，
 * 不碰数据数组，因此不触发对账。
 *
 * 契约：
 * - 读写口径不对称且刻意：**写**数据数组（`value = datas` / `replaceAll(datas)`），**读**元素表
 *   （`value` / `peek()` 给 `KeyItem[]`）；要数据用 `values()` / `get(key)`。
 * - `keyOf(data)` 就是身份：`replace` / `merge` 后 key 变了 = 旧 key 离场（api 释放）+ 新 key 入场（新元素、新 api）。
 * - 目标 key 不存在时**抛错**（写操作从严）；`item(key)` / `get(key)` / `has(key)` 这类**读**返回
 *   `undefined` / `false`，不抛。
 * - 元素与 api 在提交时一起建（`define(item)` 每个新 key 只调一次），因此没有"惰性建 api"这回事；
 *   `define` 必须是**纯**函数——它决定初始状态，且不得依赖容器当前内容（构造期容器还是空的）。
 * - 同一份数据里出现重复 key 时报错（与 `keyed()` 的重复键检查同口径）。
 */

/** 容器品牌：用 `Symbol.for` 让同一页面里的多份 yoya-ui 副本也能互相识别（与信号句柄同一套路）。 */
const KEY_SET_BRAND = Symbol.for('yoya.keySet');

/** 判断是否为 keySet 容器（keyed 据此选择「元素 = KeyItem、按 item.data 判内容」的接线）。 */
export function isKeySet(value) {
  return Boolean(value && value[KEY_SET_BRAND] === true);
}

export function keySet(initialValues = [], keyOf = null, define = null) {
  if (typeof keyOf !== 'function') {
    throw new TypeError('keySet() requires a keyOf(data) function');
  }

  if (define !== null && define !== undefined && typeof define !== 'function') {
    throw new TypeError('keySet() define must be a function (item)');
  }

  /** 元素表：KeyItem 的数组，既是真源也是句柄值。 */
  let items = [];
  /** key → KeyItem：只有在场键；键离场即删除（并释放 api）。 */
  const itemsByKey = new Map();
  /** key → 下标：每次提交重建，把按键读写从线性扫描压到 O(1)。 */
  let indexByKey = new Map();
  /** 数据句柄：读 = 元素表，写 = 数据数组（= replaceAll）。 */
  const handle = ref(items);

  const keyFor = (data) => keyOf(data);
  const dataRows = () => items.map((item) => item.data);

  /**
   * 提交前的元素准备，分两段以便重复键不会留下半成品：
   * 1. 一趟 keyOf 建「key → 下标」并查重；
   * 2. 按 key 复用已有元素（只换 `item.data`，api 原样续用），新 key 建元素并调 `define(item)`。
   */
  const prepare = (nextData) => {
    const count = nextData.length;
    const keys = new Array(count);
    const index = new Map();
    for (let position = 0; position < count; position += 1) {
      const key = keyFor(nextData[position]);
      if (index.has(key)) {
        throw new TypeError(`keySet() duplicate key: ${String(key)}`);
      }
      index.set(key, position);
      keys[position] = key;
    }

    const nextItems = new Array(count);
    for (let position = 0; position < count; position += 1) {
      const data = nextData[position];
      const key = keys[position];
      const existing = itemsByKey.get(key);
      if (existing) {
        // 同 key：元素与 api 原地续用，只把 data 换成新引用
        existing.data = data;
        nextItems[position] = existing;
        continue;
      }

      const item = { data, api: {} };
      itemsByKey.set(key, item);
      if (typeof define === 'function') {
        define(item);
      }
      nextItems[position] = item;
    }

    return { items: nextItems, index };
  };

  /** 释放离场键：只动不在场元素，在场元素的 api 绝不释放（「同 key 同 api」就靠这条）。 */
  const releaseDeparted = (index) => {
    let departed = null;
    itemsByKey.forEach((item, key) => {
      if (index.has(key)) {
        return;
      }
      if (typeof item.api?.dispose === 'function') {
        (departed ??= []).push(item.api.dispose);
      }
      itemsByKey.delete(key);
    });
    departed?.forEach((fn) => fn());
  };

  /**
   * 数据操作收口，顺序是契约的一部分：
   * 1. 建/复用元素（新 key 在这里调 define）；
   * 2. 释放**离场**键的 api——在写句柄之前，此时容器读到的仍是旧列表；
   * 3. 最后写句柄，触发一次 keyed 对账。
   */
  const commit = (nextData) => {
    const prepared = prepare(nextData);
    releaseDeparted(prepared.index);
    items = prepared.items;
    indexByKey = prepared.index;
    handle.value = items;
  };

  const requireIndex = (key, operation) => {
    const index = indexByKey.get(key);
    if (index === undefined) {
      throw new TypeError(`keySet().${operation}: key not found in the current values`);
    }
    return index;
  };

  const api = {
    // ── 数据句柄表面：可以像 ref([]) 一样直接交给 keyed() 与其它值位置 ──
    get value() {
      return handle.value;
    },
    set value(next) {
      api.replaceAll(next);
    },
    peek() {
      return handle.peek();
    },
    subscribe(listener) {
      return handle.subscribe(listener);
    },

    get [KEY_SET_BRAND]() {
      return true;
    },

    // ── 数据操作（都产出新数组；key 变化按「旧离场 + 新入场」处理）──
    replaceAll(datas) {
      commit(Array.isArray(datas) ? [...datas] : []);
      return api;
    },

    replace(key, data) {
      const index = requireIndex(key, 'replace');
      const next = dataRows();
      next[index] = data;
      commit(next);
      return api;
    },

    merge(key, patch) {
      const index = requireIndex(key, 'merge');
      const current = items[index].data;
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        throw new TypeError('keySet().merge requires an object row; use replace() otherwise');
      }
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new TypeError('keySet().merge requires an object patch');
      }
      const next = dataRows();
      next[index] = { ...current, ...patch };
      commit(next);
      return api;
    },

    add(data) {
      const next = dataRows();
      next.push(data);
      commit(next);
      return api;
    },

    insertBefore(data, beforeKey = null) {
      const index = beforeKey === null ? items.length : requireIndex(beforeKey, 'insertBefore');
      const next = dataRows();
      next.splice(index, 0, data);
      commit(next);
      return api;
    },

    insertAfter(data, afterKey = null) {
      const index = afterKey === null ? 0 : requireIndex(afterKey, 'insertAfter') + 1;
      const next = dataRows();
      next.splice(index, 0, data);
      commit(next);
      return api;
    },

    /**
     * 移动到目标键之前（目标为 null = 末尾）。位置由业务决定：容器只按 key 认，不认下标。
     * 移到自己之前 / 之后是 no-op；摘掉自身后按「目标在原列表里的位置」修正下标，
     * 避免目标在自身之后时少挪一位。
     */
    moveBefore(key, targetKey = null) {
      return moveWithin(key, targetKey, 'moveBefore', false);
    },

    /** 移动到目标键之后（目标为 null = 开头）。 */
    moveAfter(key, targetKey = null) {
      return moveWithin(key, targetKey, 'moveAfter', true);
    },

    remove(key) {
      const index = requireIndex(key, 'remove');
      const next = dataRows();
      next.splice(index, 1);
      commit(next);
      return api;
    },

    clear() {
      commit([]);
      return api;
    },

    /** 按元素排序：比较器收到 KeyItem（`item.data` / `item.api` 都在手），稳定排序。 */
    sort(compare) {
      if (typeof compare !== 'function') {
        throw new TypeError('keySet().sort requires a comparator (itemA, itemB)');
      }
      const sorted = [...items];
      sorted.sort((left, right) => compare(left, right));
      commit(sorted.map((item) => item.data));
      return api;
    },

    // ── 读 ──
    /** 元素（含 api）；不在列表里的 key 返回 undefined。 */
    item(key) {
      return itemsByKey.get(key);
    },

    /** 行数据；不在列表里的 key 返回 undefined。 */
    get(key) {
      const item = itemsByKey.get(key);
      return item ? item.data : undefined;
    },

    has(key) {
      return indexByKey.has(key);
    },

    /** 键在列表里的下标；不在列表里返回 -1（读语义，不抛）。 */
    indexOf(key) {
      const index = indexByKey.get(key);
      return index === undefined ? -1 : index;
    },

    /** 按列表顺序给出键（提交时建好的索引顺序，无需再跑 keyOf）。 */
    keys() {
      return [...indexByKey.keys()];
    },

    /** 元素表的副本（按列表顺序）。 */
    items() {
      return [...items];
    },

    /** 数据数组的副本（按列表顺序）。 */
    values() {
      return dataRows();
    },

    keyOf: keyFor,

    get size() {
      return items.length;
    },

    /** 批量编辑：批内写入立即生效，通知合并到批末一次（= 一次 keyed 对账）。 */
    batch(run) {
      return coreBatch(run);
    }
  };

  /** 移动收口：目标键为 null 时，moveBefore 落到末尾、moveAfter 落到开头（与 keyed 位置原语同向）。 */
  function moveWithin(key, targetKey, operation, after) {
    const from = requireIndex(key, operation);
    const hasTarget = targetKey !== null && targetKey !== undefined;
    if (!hasTarget) {
      const to = after ? 0 : items.length - 1;
      if (from === to) {
        return api;
      }
      const next = dataRows();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      commit(next);
      return api;
    }

    if (Object.is(targetKey, key)) {
      return api; // 移到自己之前 / 之后 = no-op
    }

    const targetIndex = requireIndex(targetKey, operation);
    const next = dataRows();
    const [moved] = next.splice(from, 1);
    const anchor = from < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(after ? anchor + 1 : anchor, 0, moved);
    commit(next);
    return api;
  }

  // 初始数据：构造期没有观察者，但仍要走同一条「建元素 + 调 define」的路径。
  const initial = prepare(Array.isArray(initialValues) ? [...initialValues] : []);
  items = initial.items;
  indexByKey = initial.index;
  handle.value = items;

  return api;
}
