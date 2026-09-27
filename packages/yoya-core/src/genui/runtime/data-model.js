import { ref } from '../../index.js';
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
 * 协议数据模型：一份普通 JSON + 按路径**惰性创建**的信号 cell。
 *
 * - `cell(path)` 返回 `ref` 句柄，可直接放进 yoya-ui 的值位置（`vText(handle)` /
 *   `props: { value: handle }` / `mountable(handle)`）——写入即原地更新 DOM，不重建。
 * - 写入是**不可变**的（父容器换引用），所以 `keyed()` 列表能看见"行引用变了"。
 * - 同一个路径永远拿到同一份 cell（缓存），重复渲染不会重复创建句柄。
 */
export class DataModel {
  constructor(initial = {}) {
    this._root = cloneValue(isPlainObject(initial) || Array.isArray(initial) ? initial : {});
    this._cells = new Map();
    this._listeners = new Set();
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
      cell = ref(readPath(this._root, normalized));
      this._cells.set(normalized, cell);
    }

    return cell;
  }

  has(path) {
    const normalized = normalizePath(path);
    return normalized === '/' || readPath(this._root, normalized) !== undefined;
  }

  /** 写路径（不可变），并刷新受影响的 cell。 */
  write(path, value) {
    const normalized = normalizePath(path);
    // 叶子值**按引用**落库：`keyed` 靠行引用判断「要不要重建」，深拷贝会让每次写入都换新行。
    // 代价是调用方要按不可变风格使用（写入传新对象，不去改手里那一份）。
    this._root = writePath(this._root, normalized, value);
    this._syncCells(splitPath(normalized));
    this._notify({ path: normalized, value });
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
    this._cells.forEach((cell, path) => {
      cell.value = readPath(this._root, path);
    });
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
    this._cells.clear();
    this._listeners.clear();
  }

  _syncCells(segments) {
    const changed = `/${segments.join('/')}`;

    this._cells.forEach((cell, path) => {
      // 祖先（写进去了）与后代（被写出的对象里）都可能变，两个方向都刷新
      if (isPathPrefix(path, changed) || isPathPrefix(changed === '/' ? '/' : changed, path)) {
        cell.value = readPath(this._root, path);
      }
    });
  }

  _notify(change) {
    this._listeners.forEach((listener) => listener(change));
  }
}
