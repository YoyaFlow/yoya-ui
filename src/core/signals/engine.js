import {
  Signal,
  batch as engineBatch,
  effect as engineEffect,
  signal as engineSignal,
  untracked as engineUntracked
} from './vendor/signals-core.js';

// 当前求值期间的收集器栈。读值走 read()，所以依赖收集由我们自己做，
// 不依赖具体引擎的追踪实现——换引擎时依赖语义不变（见 design.md §2.6）。
const collectors = [];

function recordRead(source) {
  const current = collectors.length > 0 ? collectors[collectors.length - 1] : null;
  if (current) {
    current.push(source);
  }
}

function uniqueSources(sources) {
  return sources.filter((source, index) => sources.indexOf(source) === index);
}

/**
 * 内化默认引擎适配器：只提供「值单元 + 变更通知 + 依赖收集」，
 * computed 由 core 自己实现，保证换引擎后派生语义一致。
 */
export const defaultAdapter = {
  name: 'yoya-signals-core',

  createSignal(initial) {
    return engineSignal(initial);
  },

  /** 追踪感知读取：在 collect 内读取会被记入依赖。 */
  read(source) {
    recordRead(source);
    return source.value;
  },

  /** 不建立依赖地读取。 */
  peek(source) {
    return source.peek();
  },

  write(source, value) {
    source.value = value;
  },

  /**
   * 契约：订阅不自动跑首次（绑定在构建期已求值过，重复回调只会造成多余刷新）。
   * 本引擎的 subscribe 会在订阅时立即回调一次，这里统一吞掉。
   */
  subscribe(source, listener) {
    let seenInitial = false;
    const dispose = source.subscribe((value) => {
      if (!seenInitial) {
        seenInitial = true;
        return;
      }

      listener(value);
    });
    seenInitial = true;
    return dispose;
  },

  /** 在追踪上下文内求值，并返回本次读到的依赖（去重、保序）。 */
  collect(fn) {
    const list = [];
    collectors.push(list);
    try {
      return { value: fn(), sources: uniqueSources(list) };
    } finally {
      collectors.pop();
    }
  },

  batch(fn) {
    return engineBatch(fn);
  },

  untracked(fn) {
    return engineUntracked(fn);
  },

  effect(fn) {
    return engineEffect(fn);
  },

  isSource(value) {
    return value instanceof Signal;
  }
};
