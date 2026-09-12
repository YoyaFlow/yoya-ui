/**
 * Zustand 引擎适配器（插件，不进主包、不进 dependencies）。
 *
 * 用法：
 * ```js
 * import { installSignals } from 'yoya-ui';
 * import { createZustandAdapter } from 'yoya-ui/signals-zustand';
 *
 * installSignals(createZustandAdapter(await import('zustand/vanilla')));
 * ```
 *
 * 与 signals 类库不同，zustand 是 store 形态：一个「值单元」就是一个极小的 store，
 * 读写走 getState / setState，通知走 subscribe。依赖收集、computed、调度与生命周期
 * 都由 core 负责，所以 store 类库同样能当引擎用——业务代码一行不改。
 */
export function createZustandAdapter(zustand) {
  if (!zustand || typeof zustand.createStore !== 'function') {
    throw new TypeError('createZustandAdapter requires the zustand/vanilla module');
  }

  return {
    name: 'zustand',

    createSignal(initial) {
      return zustand.createStore(() => ({ value: initial }));
    },

    read(source) {
      return source.getState().value;
    },

    write(source, value) {
      source.setState({ value });
    },

    /**
     * 契约：订阅不跑首次（store 的 subscribe 本身不跑首次）；
     * 值未变化时不通知——engine 以整块 state 换新，这里按 value 字段比较。
     */
    subscribe(source, listener) {
      return source.subscribe((state, previous) => {
        if (!Object.is(state.value, previous.value)) {
          listener(state.value);
        }
      });
    }

    // zustand 没有批量提交：一次 setState 一次通知，因此不提供 batch，
    // core 的 batch() 会自动退回「直接执行」。
  };
}
