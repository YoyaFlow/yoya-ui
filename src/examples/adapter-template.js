/**
 * 状态引擎插件模板：把这份文件复制到你自己的项目里，按 TODO 接入任意状态库。
 *
 * 契约只有四个必需方法（值单元 + 通知），依赖收集、computed、调度与生命周期
 * 都由 yoya-ui/core 负责，所以 signals 类库和 store 类库都一样接：
 *
 *   createSignal(initial)        建一个值单元，装 initial
 *   read(source)                 读当前值
 *   write(source, value)         写值
 *   subscribe(source, listener)  订阅变化，返回退订函数
 *
 * 两个常见坑：
 *   1. 有些库的 subscribe 会立即回调一次 —— 契约要求「不跑首次」，吞掉它；
 *   2. 有些库的监听器内部读值会变成依赖 —— 用库的 untracked 包一层，
 *      否则重建期间的读取会把订阅自我放大。
 *
 * 装法（业务代码一行不改）：
 *   import { installSignals } from '@yoyaflow/yoya-ui';
 *   installSignals(createMyAdapter(myStateLibrary));
 */
export function createMyAdapter(myStateLibrary) {
  if (!myStateLibrary) {
    throw new TypeError('createMyAdapter requires your state library module');
  }

  return {
    name: 'my-engine',

    createSignal(initial) {
      // TODO: 用你的库建一个「值单元」，把 initial 放进去
      return myStateLibrary.createCell(initial);
    },

    read(source) {
      // TODO: 读当前值
      return source.get();
    },

    write(source, value) {
      // TODO: 写值
      source.set(value);
    },

    subscribe(source, listener) {
      // TODO: 订阅变化并返回退订函数
      // 库若会立即回调一次，照下面吞掉首次：
      // let seenInitial = false;
      // return source.listen((value) => {
      //   if (!seenInitial) {
      //     seenInitial = true;
      //     return;
      //   }
      //   listener(value);
      // });
      return source.listen(listener);
    }

    // 可选方法：batch / untracked / effect / isSource 有就转发，
    // 没有 core 会退回自己的默认实现。
  };
}
