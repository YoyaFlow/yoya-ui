import { currentSignals } from './contract.js';
import { recordRead, withCollect, withoutCollect } from './deps.js';
import { dependentCount, registerSubscriberLedger, subscribeWithLedger } from './observe.js';
import {
  beginSignalsBatch,
  endSignalsBatch,
  isSignalsBatchActive,
  scheduleRegionsForSource
} from './schedule.js';

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

    const batchActive = isSignalsBatchActive();
    const bridge = currentDevtoolsBridge();
    const needsPrevious = batchActive || (bridge && bridge.enabled());
    const previous = needsPrevious ? withoutCollect(() => this._adapter.read(this._source)) : null;
    const changed = needsPrevious ? !Object.is(previous, next) : false;
    if (batchActive && changed) {
      scheduleRegionsForSource(this._source);
    }

    if (!bridge || !bridge.enabled()) {
      this._adapter.write(this._source, next);
      return;
    }

    this._adapter.write(this._source, next);
    if (changed) {
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

    return subscribeWithLedger(this._adapter, this._source, listener);
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
 *
 * 生命周期：依赖订阅只在有观察者时长期维持。观察者（值绑定、区域依赖、句柄
 * subscribe、外层派生）清零时退订依赖——否则长命依赖信号会一直持有 recompute
 * 闭包，闭包捕获的行数据与节点跟着一起泄漏；此后再被读取或被观察时会重新求值。
 */
export function computed(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('computed() requires a function');
  }

  const adapter = currentSignals();

  // 引擎自带原生派生时优先用它：原生派生按引擎的失效版本号惰性重算，
  // 未被观察时既不订阅依赖也不持有闭包——「读一次就没人看」的派生因此可以回收。
  if (typeof adapter.createComputed === 'function') {
    // withCollect 让 fn 内部的读取落在自己的收集器里，不污染外层绑定 / 区域的依赖表。
    return new SignalHandle(
      adapter,
      adapter.createComputed(() => withCollect(fn).value),
      {
        writable: false
      }
    );
  }

  const source = adapter.createSignal(undefined);
  let live = false;
  let observers = 0;
  let subscriptions = []; // [{ source, dispose }]：依赖未变时复用订阅

  const recompute = () => {
    const { value, sources } = withCollect(fn);
    const pending = new Map(subscriptions.map((entry) => [entry.source, entry]));
    const next = [];

    // 依赖未变的订阅原样保留：store 形态引擎在通知遍历中新增监听器会被重复访问
    // （详见 runtime.js syncSubscriptions 的说明）。
    sources.forEach((dependency) => {
      const existing = pending.get(dependency);
      if (existing) {
        pending.delete(dependency);
        next.push(existing);
        return;
      }

      next.push({
        source: dependency,
        dispose: subscribeWithLedger(adapter, dependency, recompute)
      });
    });

    pending.forEach((entry) => entry.dispose());
    subscriptions = next;
    adapter.write(source, value);
  };

  const ensureLive = () => {
    if (live) {
      return;
    }

    live = true;
    recompute();
  };

  const releaseDependencies = () => {
    live = false;
    subscriptions.forEach((entry) => entry.dispose());
    subscriptions = [];
  };

  registerSubscriberLedger(source, {
    add() {
      observers += 1;
      ensureLive();
    },
    remove() {
      if (observers === 0) {
        return;
      }

      observers -= 1;
      if (observers === 0) {
        releaseDependencies();
      }
    }
  });

  return new SignalHandle(adapter, source, { writable: false, beforeRead: ensureLive });
}

/** 批量提交：core 拥有批次内的区域合并语义，引擎 batch 负责通知去重（契约必需方法）。 */
export function batch(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('batch() requires a function');
  }

  beginSignalsBatch();
  try {
    return currentSignals().batch(fn);
  } finally {
    endSignalsBatch();
  }
}
