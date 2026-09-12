import { currentSignals } from './contract.js';
import { recordRead, withCollect, withoutCollect } from './deps.js';
import { dependentCount } from './observe.js';

// 句柄品牌：用 Symbol.for 让同一页面里的多份 yoya-ui 副本也能互相识别，
// 与 instanceof 相比不受模块重复打包影响。
const SIGNAL_BRAND = Symbol.for('yoya.signal');

// devtools 写入事件走 globalThis 共享 bridge（与 node.js 同模式）：
// 主入口与 devtools 子路径各自打包时仍共享同一开关/事件流；未导入 devtools 时 no-op。
const devtoolsBridgeKey = Symbol.for('yoya.devtools.bridge');

function currentDevtoolsBridge() {
  return typeof globalThis === 'undefined' ? null : globalThis[devtoolsBridgeKey] || null;
}

// 信号调试 id：仅在 devtools 开启且发生写入时才分配，WeakMap 不影响 GC。
const signalDebugIds = new WeakMap();
let nextSignalDebugId = 1;

function signalDebugId(handle) {
  let id = signalDebugIds.get(handle);
  if (id === undefined) {
    id = nextSignalDebugId;
    nextSignalDebugId += 1;
    signalDebugIds.set(handle, id);
  }
  return id;
}

/**
 * core 句柄：业务代码唯一可见的信号对象。
 * 引擎原生对象不直接外露，因此换引擎时业务代码、类型与错误文案都不变。
 */
export class SignalHandle {
  constructor(adapter, source, options = {}) {
    this._adapter = adapter; // 句柄与创建它的引擎绑定，换引擎不影响既有句柄
    this._source = source;
    this._writable = options.writable !== false;
    this._beforeRead = options.beforeRead || null;
  }

  get value() {
    if (this._beforeRead) {
      this._beforeRead();
    }

    recordRead(this._source);
    return this._adapter.read(this._source);
  }

  set value(next) {
    if (!this._writable) {
      throw new TypeError('computed signal is read-only');
    }

    const bridge = currentDevtoolsBridge();
    if (!bridge || !bridge.enabled()) {
      this._adapter.write(this._source, next);
      return;
    }

    const previous = withoutCollect(() => this._adapter.read(this._source));
    this._adapter.write(this._source, next);
    if (!Object.is(previous, next)) {
      bridge.emit({
        type: 'signal-write',
        signalId: signalDebugId(this),
        previous,
        next,
        dependents: dependentCount(this._source)
      });
    }
  }

  /** 不建立依赖地读取。 */
  peek() {
    if (this._beforeRead) {
      this._beforeRead();
    }

    return withoutCollect(() => this._adapter.read(this._source));
  }

  /** 底层订阅：返回退订函数，不自动跑首次。 */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('signal.subscribe requires a function');
    }

    if (this._beforeRead) {
      this._beforeRead();
    }

    return this._adapter.subscribe(this._source, listener);
  }

  update(updater) {
    this.value = updater(this.value);
    return this;
  }

  get [SIGNAL_BRAND]() {
    return true;
  }
}

/** 判断是否为 yoya 句柄（引擎原生 signal 不算，需经适配层进入）。 */
export function isSignal(value) {
  return Boolean(value && value[SIGNAL_BRAND] === true);
}

/** 创建一个可写信号。 */
export function ref(initial) {
  const adapter = currentSignals();
  return new SignalHandle(adapter, adapter.createSignal(initial));
}

/**
 * 创建一个只读派生信号。
 * 惰性：首次读取（或首次订阅）才求值；之后依赖变化时重算并写回承载信号，
 * 由引擎按「值是否变化」决定是否通知。派生语义因此与引擎无关。
 */
export function computed(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('computed() requires a function');
  }

  const adapter = currentSignals();
  const source = adapter.createSignal(undefined);
  let live = false;
  let disposers = [];

  const recompute = () => {
    disposers.forEach((dispose) => dispose());
    disposers = [];

    const { value, sources } = withCollect(fn);
    sources.forEach((dependency) => {
      disposers.push(adapter.subscribe(dependency, recompute));
    });

    adapter.write(source, value);
  };

  const ensureLive = () => {
    if (live) {
      return;
    }

    live = true;
    recompute();
  };

  return new SignalHandle(adapter, source, { writable: false, beforeRead: ensureLive });
}

/** 批量提交：引擎支持时交给引擎，否则直接执行（core 的脏集合另行合并）。 */
export function batch(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('batch() requires a function');
  }

  const adapter = currentSignals();
  return typeof adapter.batch === 'function' ? adapter.batch(fn) : fn();
}
