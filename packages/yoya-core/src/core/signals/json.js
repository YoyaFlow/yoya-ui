import { normalizePath, readPath, splitPath, writePath } from '../json-path.js';
import { SignalHandle, isSignal, ref } from './handle.js';

/**
 * JSON 能力标记：句柄的值是一棵 JSON 树、可以按相对路径下钻时带这个符号。
 * 用 `Symbol.for` 让同一页面里的多份 yoya 副本互相识别（与 `SIGNAL_BRAND` 同口径）。
 */
export const JSON_SIGNAL = Symbol.for('yoya.jsonSignal');

/**
 * 精确 cell 后端钩子：句柄的值由某个**按路径寻址的源**背书时（如 GenUI 数据模型），
 * 它提供一个 `(relativePath) => handle` 工厂，下钻就直接落到那条路径自己的源上
 * ——读写在叶子上，通知也只到相关路径。没有这个钩子时退化成「根值派生 + 不可变写回」。
 */
export const JSON_SCOPE = Symbol.for('yoya.jsonScope');

/** 能装 JSON 的值：数组或纯对象。句柄不算（句柄是源，不是树里的节点）。 */
function isJsonValue(value) {
  return Array.isArray(value) || (value !== null && typeof value === 'object' && !isSignal(value));
}

/**
 * 相对拼接：`path` 一律按「相对当前节点」解释，**不允许以 `/` 逃到树外**
 * （绝对路径属于页面数据模型，不是这位 props 的命名空间）。
 */
function joinRelative(base, path) {
  const text = String(path ?? '').trim();

  if (text === '' || text === '.') {
    return normalizePath(base);
  }

  const segments = splitPath(base);
  for (const part of text.split('/')) {
    if (part === '' || part === '.') {
      continue;
    }

    if (part === '..') {
      segments.pop();
      continue;
    }

    segments.push(part);
  }

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

/**
 * 下钻前的检查：`null` / `undefined` 是「还没加载」，允许下钻（读 undefined、写会创建）；
 * 中途撞上标量才是真的用错了 —— 当场报错，不静默给 undefined。
 */
function assertDrillable(value, path) {
  let current = value;

  for (const segment of splitPath(path)) {
    if (current === null || current === undefined) {
      return;
    }

    if (!isJsonValue(current)) {
      throw new TypeError(
        `JSON 位只能按路径下钻对象/数组，路径 "${path}" 上遇到 ${typeof current}`
      );
    }

    current = current[segment];
  }
}

/**
 * 叶子句柄的适配层：读写都转发给**它所在的根句柄**，写入是不可变路径写。
 * 源（`_source`）用的就是 base 自己的源，所以同一路径反复下钻不会多出第二个真源，
 * 订阅与依赖收集跟直接读 base 完全一致。
 */
function jsonAdapter(base, path) {
  return {
    name: 'yoya-json',
    batch: (fn) => base._adapter.batch(fn),
    read: () => readPath(base.value, path),
    subscribe: (source, listener) => base._adapter.subscribe(source, listener),
    write: (_source, next) => {
      base.value = writePath(base.peek(), path, next);
    }
  };
}

class JsonHandle extends SignalHandle {
  constructor(base, path) {
    super(jsonAdapter(base, path), base._source, {
      writable: base._writable !== false
    });
    this._jsonBase = base;
    this._jsonPath = path;
  }

  /** 相对路径定位；返回的还是同一种句柄（可继续下钻、可订阅、可写）。 */
  at(path = '') {
    const next = joinRelative(this._jsonPath, path);

    if (next === this._jsonPath) {
      return this;
    }

    const scope = this._jsonBase[JSON_SCOPE];

    if (typeof scope === 'function') {
      return new JsonHandle(scope(next), '/');
    }

    assertDrillable(this._jsonBase.peek(), next);
    return new JsonHandle(this._jsonBase, next);
  }

  get [JSON_SIGNAL]() {
    return true;
  }
}

/**
 * 值 → JSON 活值句柄。
 *
 * - 已经是 JSON 句柄：原样返回；
 * - 是别的句柄（含数据模型背书的句柄）：**同源**包一层，不新建源；
 * - 普通对象 / 数组：包一个 `ref`。
 *
 * 拿到之后：`.value` 读写整棵树，`.at('rows/0/value')` 落到某一条路径，
 * `.subscribe` 观察变化。值域不是 JSON 的位不要用它 —— 标量位用 `asSignal`。
 */
export function asSignalJson(value) {
  if (isSignal(value) && value[JSON_SIGNAL] === true) {
    return value;
  }

  return new JsonHandle(isSignal(value) ? value : ref(value), '/');
}
