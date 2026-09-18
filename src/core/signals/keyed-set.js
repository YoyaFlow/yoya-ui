import { currentSignals } from './contract.js';
import { SignalHandle } from './handle.js';

/**
 * 按键集合（keyed set）：一组「按 key 索引的布尔状态」——谁处于选中 / 激活 / 悬停 / 命中过滤。
 *
 * 解决的问题：长列表里「一行依某个共享键决定自身状态」如果写成 `ref` + 每行 `computed`，
 * 一次写入要唤醒全部行（N 次派生求值），因为每一行都订阅了同一个信号。本原语为**每个键**
 * 维护一个薄信号，写入只落在「旧键 / 新键」两个桶上——唤醒范围从 O(n) 变 O(1)，节点侧写法
 * 完全不变（`has(key)` 是值位置句柄，class / attr / style / text / props 都能直接用）。
 *
 * 语义与纪律：
 * - `has(key)` 返回**只读**句柄（写入必须走集合方法，否则 active 集合会与实际值失配）；
 * - 桶按需创建、初值取「调用时的成员状态」，因此先 `add()` 后 `has()` 不会丢状态；
 * - 写入口按 `Object.is` 去重（等值不提交）；`replace()` 只写差集；
 * - SSR 只求值不订阅（桶只是信号，订阅仍由客户端绑定/区域负责）；
 * - 句柄由 `ref()` 创建，因此 devtools 的 `signal-write` 事件、依赖计数、换引擎契约都与普通句柄一致；
 * - 生命周期：桶随键走。数据集里删掉某一行时调用 `drop(key)`；整体换数据时 `dispose()`。
 *   集合应当与它所描述的数据集同寿命（与 rows 数组同级），这是有界性的来源。
 */
export function createKeyedSet() {
  /** @type {Map<unknown, SignalHandle>} 键 → 对外只读句柄 */
  const views = new Map();
  /** @type {Map<unknown, SignalHandle>} 键 → 内部可写句柄（同一个 source） */
  const writers = new Map();
  const active = new Set();

  const bucketFor = (key) => {
    let view = views.get(key);
    if (view !== undefined) {
      return view;
    }

    const adapter = currentSignals();
    const source = adapter.createSignal(active.has(key));
    const writer = new SignalHandle(adapter, source);
    const readonly = new SignalHandle(adapter, source, { writable: false });
    writers.set(key, writer);
    views.set(key, readonly);
    return readonly;
  };

  const writeBucket = (key, next) => {
    const writer = writers.get(key);
    if (writer === undefined) {
      return; // 还没有人观察这个键：等 has(key) 首次调用时按当时状态建桶
    }

    if (!Object.is(writer.peek(), next)) {
      writer.value = next;
    }
  };

  const api = {
    /** 值位置句柄：`line.toggleClass('danger', active.has(row.id))`。只读。 */
    has(key) {
      return bucketFor(key);
    },

    /** 纯布尔读取：不求值也不订阅，适合 SSR 输出与命令式分支。 */
    isActive(key) {
      return active.has(key);
    },

    /** 当前激活的键（快照）。 */
    keys() {
      return Array.from(active);
    },

    get size() {
      return active.size;
    },

    /** 单选语义：把激活集合替换成只有这一个键。 */
    set(key) {
      if (active.size === 1 && active.has(key)) {
        return api;
      }

      active.forEach((previous) => writeBucket(previous, false));
      active.clear();
      active.add(key);
      writeBucket(key, true);
      return api;
    },

    /** 多选语义：加入一个键。 */
    add(key) {
      if (active.has(key)) {
        return api;
      }

      active.add(key);
      writeBucket(key, true);
      return api;
    },

    /** 多选语义：移除一个键。 */
    remove(key) {
      if (!active.delete(key)) {
        return api;
      }

      writeBucket(key, false);
      return api;
    },

    /** 多选语义：翻转一个键。 */
    toggle(key) {
      return active.has(key) ? api.remove(key) : api.add(key);
    },

    /** 批量替换：只写差集（全选 10k 行不会退化成 O(n²)）。 */
    replace(keys) {
      const next = new Set(keys);
      active.forEach((key) => {
        if (!next.has(key)) {
          writeBucket(key, false);
        }
      });
      next.forEach((key) => {
        if (!active.has(key)) {
          writeBucket(key, true);
        }
      });
      active.clear();
      next.forEach((key) => active.add(key));
      return api;
    },

    /** 清空激活集合（桶保留，值置 false）。 */
    clear() {
      active.forEach((key) => writeBucket(key, false));
      active.clear();
      return api;
    },

    /** 数据集里移除某个键：释放它的桶与其句柄（有界性的关键 API）。 */
    drop(key) {
      active.delete(key);
      writers.delete(key);
      views.delete(key);
      return api;
    },

    /** 整体释放（换数据集 / 销毁列表时调用）。 */
    dispose() {
      active.clear();
      writers.clear();
      views.clear();
      return api;
    }
  };

  return api;
}
