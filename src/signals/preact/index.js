/**
 * Preact Signals 引擎适配器（插件，不进主包、不进 dependencies）。
 *
 * 用法：
 * ```js
 * import { installSignals } from 'yoya-ui';
 * import { createPreactAdapter } from 'yoya-ui/signals-preact';
 *
 * installSignals(createPreactAdapter(await import('@preact/signals-core')));
 * ```
 *
 * 注意：同一时刻只激活一个引擎。两个引擎版本同页面共存时，值读写能互认，
 * 但依赖追踪各版本私有——表现为「该更新时静默不更新」，因此不提供并存。
 */
export function createPreactAdapter(signalsCore) {
  if (!signalsCore || typeof signalsCore.signal !== 'function') {
    throw new TypeError('createPreactAdapter requires the @preact/signals-core module');
  }

  const untracked =
    typeof signalsCore.untracked === 'function' ? signalsCore.untracked : (run) => run();

  const adapter = {
    name: 'preact-signals',

    createSignal(initial) {
      return signalsCore.signal(initial);
    },

    read(source) {
      return source.value;
    },

    write(source, value) {
      source.value = value;
    },

    /**
     * 归一化两处引擎差异：
     * 1. preact 的 subscribe 会立即回调一次，契约要求不跑首次；
     * 2. 监听器内部的读取不能变成该 effect 的依赖，否则重建期间的读取会把
     *    订阅自我放大，出现重复重建。
     */
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

    untracked
  };

  if (typeof signalsCore.batch === 'function') {
    adapter.batch = (run) => signalsCore.batch(run);
  }

  if (typeof signalsCore.effect === 'function') {
    adapter.effect = (run) => signalsCore.effect(run);
  }

  return adapter;
}
