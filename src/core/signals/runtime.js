import { currentSignals } from './contract.js';
import { trackedSubscribe } from './observe.js';
import {
  acquireCollectorToken,
  collectInto,
  dedupeSourcesInPlace,
  releaseCollectorToken
} from './deps.js';

/** 读取绑定值：零参闭包直接调用，signal 句柄取 .value。 */
function readTargetValue() {
  const reader = this.reader;
  return typeof reader === 'function' ? reader() : reader.value;
}

/**
 * 响应式目标：把「求值」与「依赖订阅」分开。
 *
 * - evaluate()：在追踪上下文内求值，记录本次依赖（构建期与刷新期共用）。
 * - activate()：节点进入 DOM 后订阅依赖；服务端只求值不订阅。
 * - release()：节点销毁 / 区域重跑时退订。
 * - 依赖变化时重新求值并回调 sink.onValue(value)；重入的写入会在本轮结束后补一次。
 *
 * 形态：类 + 原型方法，不建实例闭包。值绑定是「每一行都有一两个」的对象，
 * 每个实例的闭包、访问器与订阅条目都会按行累加内存：官方 keyed 条目 1000 行实测，
 * 一行「标签绑 ref + 选中态 computed」的绑定开销从 3.9 MB 降到 1.6 MB。
 * 订阅走「单依赖快路径」：只有一个依赖时不建 Map / 数组 / 条目对象，
 * 直接把 source 与退订函数放在实例上——值绑定与句柄订阅绝大多数是这种形态。
 */
export class ReactiveTarget {
  constructor(reader, sink) {
    this.adapter = currentSignals();
    this.reader = reader; // 值位置：零参闭包或 signal 句柄
    this.sink = sink; // 提交点：onValue(value)（原型方法，不是实例闭包）
    this.onlySource = null; // 恰好一个依赖时的快路径
    this.sources = null; // 多依赖时 evaluate() 记下的依赖
    this.notify = null; // 依赖订阅用的监听器，首次订阅才建
    this.singleSource = null; // 单依赖快路径
    this.singleDispose = null;
    this.subscriptions = null; // 多依赖：[{ source, dispose }]
    this.active = false;
    this.evaluated = false;
    this.running = false;
    this.queued = false;
    this.value = undefined;
  }

  evaluate() {
    // 池化收集器：求值不再建 token / 依赖数组 / 结果对象（一次求值的分配 33 B → ~0）。
    const token = acquireCollectorToken();
    let value;
    try {
      value = collectInto(token, readTargetValue, this);
      const sources = token.sources;
      if (sources.length > 1) {
        dedupeSourcesInPlace(sources);
      }

      this.value = value;
      this.evaluated = true;

      // 单依赖不保留数组：绝大多数绑定（值绑定、句柄订阅）都只有一个依赖
      if (sources.length === 1) {
        this.onlySource = sources[0];
        this.sources = null;
      } else if (sources.length === 0) {
        this.onlySource = null;
        this.sources = null;
      } else {
        // 多依赖是少数：拷一份留给订阅路径，池里的数组留给下一次求值
        this.onlySource = null;
        this.sources = sources.slice();
      }
    } finally {
      releaseCollectorToken(token);
    }

    return this.value;
  }

  /** 订阅监听器按需创建：只求值不订阅（SSR）的目标不为它付一份闭包。 */
  dependencyListener() {
    if (!this.notify) {
      this.notify = () => this.onDependencyChange();
    }

    return this.notify;
  }

  onDependencyChange() {
    if (this.running) {
      this.queued = true;
      return;
    }

    this.refresh();
  }

  releaseSubscriptions() {
    this.singleDispose?.();
    this.singleSource = null;
    this.singleDispose = null;

    if (this.subscriptions) {
      this.subscriptions.forEach((entry) => entry.dispose());
      this.subscriptions = null;
    }
  }

  /**
   * 按当前依赖重订：**只动变化的部分**。
   *
   * 换成 store 形态的引擎（zustand 那种 `listeners.forEach` 通知）时，
   * 在回调里整体退订再重订会让遍历中的集合被改写，监听器被反复访问直至自激；
   * 依赖没变就复用订阅，既避免这个问题，也少一轮引擎开销。
   */
  syncSubscriptions() {
    if (!this.active) {
      return;
    }

    if (this.onlySource) {
      this.subscribeSingle(this.onlySource);
      return;
    }

    const sources = this.sources;
    if (!sources || sources.length === 0) {
      this.releaseSubscriptions();
      return;
    }

    this.subscribeMany(sources);
  }

  subscribeSingle(source) {
    // 上一轮是多依赖：先整体退订，再退回单依赖形态
    if (this.subscriptions) {
      this.releaseSubscriptions();
    }

    if (this.singleSource === source) {
      return;
    }

    this.singleDispose?.();
    this.singleSource = source;
    this.singleDispose = trackedSubscribe(this.adapter, source, this.dependencyListener());
  }

  subscribeMany(sources) {
    this.singleDispose?.();
    this.singleSource = null;
    this.singleDispose = null;

    const pending = new Map((this.subscriptions ?? []).map((entry) => [entry.source, entry]));
    const next = [];

    sources.forEach((source) => {
      const existing = pending.get(source);
      if (existing) {
        pending.delete(source);
        next.push(existing);
        return;
      }

      next.push({
        source,
        dispose: trackedSubscribe(this.adapter, source, this.dependencyListener())
      });
    });

    pending.forEach((entry) => entry.dispose());
    this.subscriptions = next;
  }

  /** 依赖变化后的刷新：重新求值 → 重订依赖 → 通知提交。 */
  refresh() {
    this.running = true;
    try {
      this.evaluate();
      this.syncSubscriptions();
    } finally {
      this.running = false;
    }

    this.sink.onValue(this.value);

    if (this.queued) {
      this.queued = false;
      this.refresh();
    }
  }

  activate() {
    if (this.active) {
      return;
    }

    this.active = true;
    if (!this.evaluated) {
      this.evaluate();
    }
    this.syncSubscriptions();
  }

  release() {
    this.active = false;
    this.releaseSubscriptions();
  }
}

/**
 * @param {{ read: (() => unknown) | { value: unknown }, sink: { onValue(value: unknown): void } }} options
 * read 是值位置（零参闭包或 signal 句柄），sink 是提交点。两者都不建实例闭包：
 * 绑定按行创建，闭包与上下文会按行累加内存。
 */
export function createReactiveTarget({ read, sink }) {
  return new ReactiveTarget(read, sink);
}
