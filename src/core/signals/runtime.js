import { currentSignals } from './contract.js';
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
  let disposers = [];
  let active = false;
  let evaluated = false;
  let running = false;
  let queued = false;
  let value;

  const unsubscribeSources = () => {
    disposers.forEach((dispose) => dispose());
    disposers = [];
  };

  const subscribeSources = () => {
    if (!active) {
      return;
    }

    disposers = sources.map((source) => adapter.subscribe(source, onDependencyChange));
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
      unsubscribeSources();
      evaluate();
      subscribeSources();
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
      subscribeSources();
    },
    release() {
      active = false;
      unsubscribeSources();
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
