/**
 * 示例：把 signals 类库适配成 yoya 状态引擎（这里用 @preact/signals-core）。
 * 复制到你自己的项目，把 import 换成你要用的库，再按同样的形状填四个方法即可。
 *
 * 这类库的两个特点：
 *   1. subscribe 会立即回调一次 —— 契约为「不跑首次」，要吞掉这一次；
 *   2. 监听器内部读值会变成依赖 —— 用 untracked 包一层，否则重建期间的读取
 *      会把订阅自我放大，表现为重复重建。
 */
import * as preactSignals from '@preact/signals-core';

export function createSignalsAdapter(signals = preactSignals) {
  const untracked = typeof signals.untracked === 'function' ? signals.untracked : (run) => run();

  return {
    name: 'signals-example',

    createSignal(initial) {
      return signals.signal(initial);
    },

    read(source) {
      return source.value;
    },

    write(source, value) {
      source.value = value;
    },

    subscribe(source, listener) {
      let seenInitial = false;
      const dispose = source.subscribe((value) => {
        if (!seenInitial) {
          seenInitial = true;
          return;
        }

        untracked(() => listener(value));
      });
      seenInitial = true;
      return dispose;
    },

    // 可选方法有就转发：没有 core 会退回自己的默认实现
    batch: (run) => signals.batch(run),
    untracked
  };
}
