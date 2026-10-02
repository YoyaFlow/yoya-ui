import { asSignal, isSignal } from '../../index.js';
import { currentSignals } from '../../core/signals/contract.js';
import { SignalHandle } from '../../core/signals/handle.js';
import { JSON_SCOPE } from '../../core/signals/json.js';
import { ERROR_CODES, GenUIError } from '../protocol/errors.js';
import {
  isPathPrefix,
  isPlainObject,
  normalizePath,
  readPath,
  splitPath,
  writePath
} from '../protocol/values.js';

/** 深拷贝 JSON 值（结构化克隆优先，失败回落手写递归）。 */
function cloneValue(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // 含不可克隆对象（函数 / 节点）时走下面的手写分支
    }
  }

  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (isPlainObject(value)) {
    const copy = {};
    Object.entries(value).forEach(([key, item]) => {
      copy[key] = cloneValue(item);
    });
    return copy;
  }

  return value;
}

/**
 * 值位上的句柄取当次值：数据模型只存 JSON——**句柄不落库**，
 * 否则快照 / 模板 / 序列化都会拿到句柄本身（嵌套 ref 的典型来源）。
 */
function plainValue(value) {
  return isSignal(value) ? asSignal(value).value : value;
}

/**
 * 协议数据模型：一份普通 JSON + 按路径**惰性创建**的信号 cell。
 *
 * - `cell(path)` 返回**模型背书**的句柄，可直接放进 yoya-ui 的值位置（`vText(handle)` /
 *   `props: { value: handle }` / `mountable(handle)`）——写入即原地更新 DOM，不重建。
 *   写这个句柄 = **写数据模型**（根 + 受影响 cell 刷新 + 通知订阅者），不是只改一个信号：
 *   组件侧的双向绑定（`value` 收句柄时）因此走的是模型那条路，快照 / 父路径 collect /
 *   页面 change 事件 / 暴露镜像 `#:/value` 全部与之一致。
 * - 写入是**不可变**的（父容器换引用），所以 `keyed()` 列表能看见"行引用变了"。
 * - 同一个路径永远拿到同一份 cell（缓存），重复渲染不会重复创建句柄。
 */
export class DataModel {
  constructor(initial = {}) {
    this._root = cloneValue(isPlainObject(initial) || Array.isArray(initial) ? initial : {});
    this._cells = new Map();
    this._listeners = new Set();
    this._computed = new Map();
    // 模型把值下发到 cell 时的计数：这期间句柄写入直落底层，不走模型（防递归）
    this._applying = 0;
  }

  get root() {
    return this._root;
  }

  /** 读当前值（不建立绑定）。 */
  read(path) {
    const normalized = normalizePath(path);
    const cell = this._cells.get(normalized);
    return cell ? cell.value : readPath(this._root, normalized);
  }

  /** 取（并按需创建）路径的活值句柄。 */
  cell(path) {
    const normalized = normalizePath(path);
    let cell = this._cells.get(normalized);

    if (!cell) {
      cell = createModelHandle(this, normalized);
      this._cells.set(normalized, cell);
    }

    return cell;
  }

  has(path) {
    const normalized = normalizePath(path);
    return normalized === '/' || readPath(this._root, normalized) !== undefined;
  }

  /** 注册 computed cell：目标只读，来源变化时由信号图自动重算。 */
  defineComputed(path, handle) {
    if (!isSignal(handle)) {
      throw new GenUIError('defineComputed 需要 signal 句柄', {
        code: ERROR_CODES.protocol,
        path
      });
    }

    const normalized = normalizePath(path);
    const dispose = handle.subscribe(() => {
      this._notify({ path: normalized, value: handle.value });
    });

    this._cells.set(normalized, handle);
    this._computed.set(normalized, { dispose, handle });

    return () => {
      dispose();
      const current = this._computed.get(normalized);

      if (current?.handle === handle) {
        this._computed.delete(normalized);
        this._cells.delete(normalized);
      }
    };
  }

  isComputed(path) {
    return this._computed.has(normalizePath(path));
  }

  /** 指定前缀下是否存在非空 computed 值（validate gate 检查 /ui/errors）。 */
  hasComputedValue(prefix) {
    const normalized = normalizePath(prefix);

    return [...this._computed].some(
      ([path, { handle }]) =>
        (path === normalized || path.startsWith(`${normalized}/`)) && handle.value !== null
    );
  }

  /** 写路径（不可变），并刷新受影响的 cell。 */
  write(path, value) {
    const normalized = normalizePath(path);

    if (this._computed.has(normalized)) {
      throw new GenUIError(`computed 目标 "${normalized}" 只读`, {
        code: ERROR_CODES.action,
        path: normalized
      });
    }

    // 叶子值**按引用**落库：`keyed` 靠行引用判断「要不要重建」，深拷贝会让每次写入都换新行。
    // 代价是调用方要按不可变风格使用（写入传新对象，不去改手里那一份）。
    // 句柄一律按当次值落库（`asSignal`）：数据模型只存 JSON，不让句柄进树。
    const next = plainValue(value);
    this._root = writePath(this._root, normalized, next);
    this._syncCells(splitPath(normalized));
    this._notify({ path: normalized, value: next });
    return this;
  }

  /** 浅合并对象（`patch('/user', { name: 'x' })`）。 */
  patch(path, partial) {
    const normalized = normalizePath(path);
    const current = readPath(this._root, normalized);
    const base = isPlainObject(current) ? current : {};
    return this.write(normalized, { ...base, ...(isPlainObject(partial) ? partial : {}) });
  }

  /** 布尔取反（`toggle('/ui/modalOpen')`）。 */
  toggle(path) {
    return this.write(path, !this.read(path));
  }

  /** 数组追加（换引用，列表可感知）。 */
  push(path, value) {
    const current = this.read(path);
    const list = Array.isArray(current) ? current.slice() : [];
    list.push(cloneValue(value));
    return this.write(path, list);
  }

  /** 数组按下标删除（对象按 key 删除）。 */
  remove(path, key) {
    const normalized = normalizePath(path);
    const current = readPath(this._root, normalized);

    if (Array.isArray(current)) {
      const index = Number(key);
      const next = Number.isFinite(index)
        ? current.filter((_, position) => position !== index)
        : current;
      return this.write(normalized, next);
    }

    if (isPlainObject(current) && key !== undefined) {
      const copy = { ...current };
      delete copy[key];
      return this.write(normalized, copy);
    }

    return this;
  }

  /** 整份替换（cell 句柄保持不变，绑定原地更新）。 */
  replace(next) {
    this._root = cloneValue(next ?? {});
    this._applyToCells();
    this._notify({ path: '/', value: this._root });
    return this;
  }

  snapshot() {
    return cloneValue(this._root);
  }

  /**
   * 订阅数据变化：`{ path, value }`。
   * 注意这是"数据变了"的通知，不是每一条绑定；视图更新由 yoya 的信号绑定负责。
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    this._computed.forEach(({ dispose }) => dispose());
    this._computed.clear();
    this._cells.clear();
    this._listeners.clear();
  }

  _syncCells(segments) {
    const changed = `/${segments.join('/')}`;
    const affected = [];

    this._cells.forEach((cell, path) => {
      if (this._computed.has(path)) {
        return;
      }

      // 祖先（写进去了）与后代（被写出的对象里）都可能变，两个方向都刷新
      if (isPathPrefix(path, changed) || isPathPrefix(changed === '/' ? '/' : changed, path)) {
        affected.push([path, cell]);
      }
    });

    this._applyToCells(affected);
  }

  /** 把模型当前值下发到 cell；下发期间句柄写入直落底层（见 createModelHandle）。 */
  _applyToCells(entries = this._cells) {
    // 统一成 [path, cell]：Map 的迭代顺序就是这样，_syncCells 收集的也是同一形状
    const list = entries instanceof Map ? [...entries] : entries;
    this._applying += 1;

    try {
      list.forEach(([path, cell]) => {
        if (this._computed.has(path)) {
          return;
        }

        const value = plainValue(readPath(this._root, path));

        if (!Object.is(cell.peek(), value)) {
          cell.value = value;
        }
      });
    } finally {
      this._applying -= 1;
    }
  }

  _notify(change) {
    this._listeners.forEach((listener) => listener(change));
  }
}

/**
 * 模型背书句柄：读取 / 订阅转发底层引擎，**写入落到数据模型**。
 *
 * - 值相等直接跳过（不重复通知、不重算派生）；
 * - `model._applying > 0`（模型正把值下发到 cell）时直写底层，避免"下发 → 又写回模型"的递归；
 * - 仍是真 `SignalHandle`（带 yoya 句柄品牌 + 可写）——组件侧 `isWritableSignal(value)`
 *   才认它，`value` 位置传句柄才接双向绑定。
 */
function createModelHandle(model, path) {
  const engine = currentSignals();
  const seed = plainValue(readPath(model._root, path));
  const unit = engine.createSignal(seed);
  const adapter = {
    batch: (fn) => engine.batch(fn),
    createSignal: (initial) => engine.createSignal(initial),
    isSource: (value) => (typeof engine.isSource === 'function' ? engine.isSource(value) : false),
    name: 'yoya-genui-data-model',
    read: (source) => engine.read(source),
    subscribe: (source, listener) => engine.subscribe(source, listener),
    write: (source, value) => {
      if (model._applying > 0) {
        engine.write(source, value);
        return;
      }

      // 组件 / 页面写入：句柄是入口，模型是唯一真源
      if (Object.is(engine.read(source), value)) {
        return;
      }

      model.write(path, value);
    }
  };

  if (typeof engine.createComputed === 'function') {
    adapter.createComputed = (run) => engine.createComputed(run);
  }
  if (typeof engine.untracked === 'function') {
    adapter.untracked = (fn) => engine.untracked(fn);
  }
  if (typeof engine.effect === 'function') {
    adapter.effect = (fn) => engine.effect(fn);
  }

  const handle = new SignalHandle(adapter, unit);

  // 路径下钻的精确后端：`asSignalJson(cell).at('a/b')` 直接落到 `/base/a/b` 的 cell 上，
  // 读写在叶子上、通知也只到相关路径（没有它就会退化成"整根替换 + 全树唤醒"）。
  handle[JSON_SCOPE] = (relativePath) => model.cell(`${path}${normalizePath(relativePath)}`);

  return handle;
}
