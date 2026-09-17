import {
  Signal,
  batch as engineBatch,
  computed as engineComputed,
  effect as engineEffect,
  signal as engineSignal,
  untracked as engineUntracked
} from './vendor/signals-core.js';

/**
 * 内化默认引擎适配器：只提供「值单元 + 变更通知」。
 * 依赖收集、派生（computed）、调度与生命周期全部在 core，
 * 因此换引擎不会改变依赖语义与派生语义（见 design.md §2.6、§14）。
 */
export const defaultAdapter = {
  name: 'yoya-signals-core',

  createSignal(initial) {
    return engineSignal(initial);
  },

  /**
   * 可选能力：引擎原生派生。它自带失效版本号，未被观察时只缓存不订阅，
   * 因此「读一次就不再有人看」的派生不会把闭包钉在长命依赖信号上。
   */
  createComputed(run) {
    return engineComputed(run);
  },

  /** 读取当前值；是否登记依赖由 core 的收集器决定（core 在读到值前后自行记录）。 */
  read(source) {
    return source.value;
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
