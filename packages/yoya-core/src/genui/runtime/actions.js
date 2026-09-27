import { ERROR_CODES, GenUIError } from '../protocol/errors.js';

/**
 * 动作总线：节点上的 `on: { click: { $action: 'submit' } }` 最终落到这里。
 *
 * - `handle(name, fn)`：**具名处理器**。协议内建动作（set / toggle / …）就是这些；
 *   业务侧注册自己的处理器（如 `submit`）后，生成方只管发名字。
 * - `subscribe(fn)`：**全量监听**。宿主用它把动作转成后端调用（A2UI 的 `userAction` 回传）。
 *
 * 两者都会收到同一个事件对象：`{ name, params, source, surfaceId, event, target }`。
 */
export class ActionBus {
  constructor() {
    this._handlers = new Map();
    this._listeners = new Set();
  }

  handle(name, handler) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new GenUIError('动作名必须是非空字符串', { code: ERROR_CODES.action });
    }

    if (typeof handler !== 'function') {
      throw new GenUIError(`动作 "${name}" 的处理器必须是函数`, { code: ERROR_CODES.action });
    }

    const bucket = this._handlers.get(name) ?? new Set();
    bucket.add(handler);
    this._handlers.set(name, bucket);

    return () => {
      bucket.delete(handler);
      if (bucket.size === 0) {
        this._handlers.delete(name);
      }
    };
  }

  handleAll(handlers) {
    const disposers = Object.entries(handlers ?? {}).map(([name, handler]) =>
      this.handle(name, handler)
    );

    return () => disposers.forEach((dispose) => dispose());
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new GenUIError('动作监听器必须是函数', { code: ERROR_CODES.action });
    }

    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  handles(name) {
    return this._handlers.has(name);
  }

  names() {
    return [...this._handlers.keys()].sort();
  }

  /** 分发一个动作：先跑具名处理器，再通知全量监听者，返回各自的结果。 */
  async dispatch(event) {
    const normalized = {
      event: null,
      name: '',
      params: {},
      source: { componentId: '', surfaceId: '', type: '' },
      target: null,
      ...event
    };
    const results = [];

    for (const handler of [...(this._handlers.get(normalized.name) ?? [])]) {
      results.push(await handler(normalized));
    }

    for (const listener of [...this._listeners]) {
      results.push(await listener(normalized));
    }

    return results;
  }

  destroy() {
    this._handlers.clear();
    this._listeners.clear();
  }
}

/**
 * 协议内建动作：只认数据模型上的操作，不碰 DOM。
 *
 * | 动作            | params                  | 语义                     |
 * | --------------- | ----------------------- | ------------------------ |
 * | `assign`       | `{ assignments: [{ path, value }] }` | 赋值映射的规范形（多写一次提交） |
 * | `set` / `setData` | `{ path, value }`     | 写数据（活值绑定随之更新） |
 * | `patch`         | `{ path, value }`       | 浅合并对象               |
 * | `toggle`        | `{ path }`              | 布尔取反                 |
 * | `increment` / `decrement` | `{ path, by?, min?, max? }` | 数值步进（`by` 缺省 1，可夹上下限） |
 * | `push`          | `{ path, value }`       | 数组追加                 |
 * | `remove`        | `{ path, key }`         | 删除数组项 / 对象键      |
 * | `noop`          | —                       | 只发事件（监听者处理）   |
 */
export function installProtocolActions(bus, data) {
  return bus.handleAll({
    assign: ({ params }) => {
      const assignments = params?.assignments;

      if (!Array.isArray(assignments)) {
        throw new GenUIError('动作 "assign" 需要 params.assignments 数组', {
          code: ERROR_CODES.action
        });
      }

      return assignments.forEach(({ path, value }) => data.write(path, value));
    },
    decrement: ({ params }) => writeStepped(data, params, -1, 'decrement'),
    increment: ({ params }) => writeStepped(data, params, 1, 'increment'),
    noop: () => undefined,
    patch: ({ params }) => data.patch(requirePath(params, 'patch'), params?.value),
    push: ({ params }) => data.push(requirePath(params, 'push'), params?.value),
    remove: ({ params }) => data.remove(requirePath(params, 'remove'), params?.key),
    set: ({ params }) => data.write(requirePath(params, 'set'), params?.value),
    setData: ({ params }) => data.write(requirePath(params, 'setData'), params?.value),
    toggle: ({ params }) => data.toggle(requirePath(params, 'toggle'))
  });
}

/** 动作参数里的 `path`（必填）：写成别的形状当场报错，不静默。 */
function requirePath(params, name) {
  const path = params?.path;

  if (typeof path !== 'string' || path === '') {
    throw new GenUIError(`动作 "${name}" 需要 params.path`, { code: ERROR_CODES.action });
  }

  return path;
}

/**
 * 数值步进（`increment` / `decrement`）：**纯 schema 就能表达的交互**——
 * `{ "$action": "increment", "params": { "path": "/order/qty", "by": 1, "min": 1, "max": 99 } }`。
 *
 * `by` 缺省是 1；`min` / `max` 给了就夹住（数量步进器不用宿主写任何代码）。
 */
function writeStepped(data, params, direction, name) {
  const path = requirePath(params, name);
  const current = Number(data.read(path));
  const step = typeof params?.by === 'number' && params.by !== 0 ? Math.abs(params.by) : 1;
  const next = (Number.isFinite(current) ? current : 0) + direction * step;
  const min = typeof params?.min === 'number' ? params.min : null;
  const max = typeof params?.max === 'number' ? params.max : null;
  const clamped = Math.min(max ?? next, Math.max(min ?? next, next));

  return data.write(path, clamped);
}
