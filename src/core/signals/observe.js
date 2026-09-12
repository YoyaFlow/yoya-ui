// 绑定订阅注册表：为 devtools 写入事件提供「依赖该信号的绑定数」。
// 只登记 core 自己发起的订阅（值绑定与区域依赖），引擎内部派生不计入。
const subscribers = new WeakMap();

/**
 * 经注册表订阅：与 adapter.subscribe 等价，额外维护 source → 监听器集合，
 * 返回的退订函数会同步清理注册表。
 */
export function trackedSubscribe(adapter, source, listener) {
  let set = subscribers.get(source);
  if (!set) {
    set = new Set();
    subscribers.set(source, set);
  }

  set.add(listener);
  const dispose = adapter.subscribe(source, listener);
  return () => {
    set.delete(listener);
    dispose();
  };
}

/** 依赖该信号的绑定数（值绑定 + 区域依赖）。 */
export function dependentCount(source) {
  return subscribers.get(source)?.size || 0;
}
