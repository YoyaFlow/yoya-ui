/**
 * 示例：把 store 类库适配成 yoya 状态引擎（这里用 zustand/vanilla）。
 * 复制到你自己的项目，把 import 换成你要用的库即可。
 *
 * store 形态与 signals 形态的区别：一个「值单元」就是一个极小的 store，
 * 读写走 getState / setState，通知走 subscribe。这类库通常：
 *   1. subscribe 不跑首次 —— 不用吞回调；
 *   2. 通知来自 store 而不是 effect —— 不需要 untracked；
 *   3. 没有批量提交 —— 不提供 batch，core 的 batch() 会自动退回直接执行。
 */
import { createStore } from 'zustand/vanilla';

export function createZustandAdapter() {
  return {
    name: 'zustand-example',

    createSignal(initial) {
      return createStore(() => ({ value: initial }));
    },

    read(source) {
      return source.getState().value;
    },

    write(source, value) {
      source.setState({ value });
    },

    subscribe(source, listener) {
      // store 每次 setState 都会换一份 state 对象，这里按 value 字段比较去重
      return source.subscribe((state, previous) => {
        if (!Object.is(state.value, previous.value)) {
          listener(state.value);
        }
      });
    }
  };
}
