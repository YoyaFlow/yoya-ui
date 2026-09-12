import { currentSignals } from './contract.js';
import { trackedSubscribe } from './observe.js';
import { withCollect } from './deps.js';

/**
 * 响应式目标：把「求值」与「依赖订阅」分开。
 *
 * - evaluate()：在追踪上下文内求值，记录本次依赖（构建期与刷新期共用）。
 * - activate()：节点进入 DOM 后订阅依赖；服务端只求值不订阅。
 * - release()：节点销毁 / 区域重跑时退订。
 * - 依赖变化时重新求值并回调 onChange；重入的写入会在本轮结束后补一次。
 */
export function createReactiveTarget({ run, onChange }) {
  const adapter = currentSignals();
  let sources = [];
  let subscriptions = []; // [{ source, dispose }]：依赖未变时复用订阅
  let active = false;
  let evaluated = false;
  let running = false;
  let queued = false;
  let value;

  const releaseSubscriptions = () => {
    subscriptions.forEach((entry) => entry.dispose());
    subscriptions = [];
  };

  /**
   * 按当前依赖重订：**只动变化的部分**。
   *
   * 换成 store 形态的引擎（zustand 那种 `listeners.forEach` 通知）时，
   * 在回调里整体退订再重订会让遍历中的集合被改写，监听器被反复访问直至自激；
   * 依赖没变就复用订阅，既避免这个问题，也少一轮引擎开销。
   */
  const syncSubscriptions = () => {
    if (!active) {
      return;
    }

    const pending = new Map(subscriptions.map((entry) => [entry.source, entry]));
    const next = [];

    sources.forEach((source) => {
      const existing = pending.get(source);
      if (existing) {
        pending.delete(source);
        next.push(existing);
        return;
      }

      next.push({ source, dispose: trackedSubscribe(adapter, source, onDependencyChange) });
    });

    pending.forEach((entry) => entry.dispose());
    subscriptions = next;
  };

  const evaluate = () => {
    const result = withCollect(run);
    sources = result.sources;
    value = result.value;
    evaluated = true;
    return value;
  };

  function onDependencyChange() {
    if (running) {
      queued = true;
      return;
    }

    refresh();
  }

  /** 依赖变化后的刷新：重新求值 → 重订依赖 → 通知提交。 */
  function refresh() {
    running = true;
    try {
      evaluate();
      syncSubscriptions();
    } finally {
      running = false;
    }

    onChange(value);

    if (queued) {
      queued = false;
      refresh();
    }
  }

  return {
    evaluate,
    refresh,
    activate() {
      if (active) {
        return;
      }

      active = true;
      if (!evaluated) {
        evaluate();
      }
      syncSubscriptions();
    },
    release() {
      active = false;
      releaseSubscriptions();
    },
    get active() {
      return active;
    },
    get sourceCount() {
      return sources.length;
    },
    get value() {
      return value;
    }
  };
}
