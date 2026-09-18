// 绑定订阅注册表：为 devtools 写入事件提供「依赖该信号的绑定数」。
// 只登记 core 自己发起的订阅（值绑定与区域依赖），引擎内部派生不计入。
// 值用计数而不是 Set：Set 是每个 source 一份的对象，按行累加很贵；计数口径与
// 原来的 `set.size` 完全一致，devtools 的 dependentCount 不受影响。
const subscriberCounts = new WeakMap();
const regionOwners = new WeakMap();

// 观察者账本：派生信号（computed）用它知道「还有没有人在看」。
// 观察者清零就退订自己的依赖，否则长命依赖信号会一直持有派生闭包（连带闭包里的数据）。
const ledgers = new WeakMap();

/** 给承载信号登记观察者账本：add / remove 由订阅路径调用。 */
export function registerSubscriberLedger(source, ledger) {
  ledgers.set(source, ledger);
}

/**
 * 订阅 + 账本记账。核心所有订阅都从这里走（值绑定、区域依赖、句柄 subscribe、
 * 派生对依赖的订阅），账本因此能准确感知观察者的增减。
 */
export function subscribeWithLedger(adapter, source, listener) {
  const ledger = ledgers.get(source);
  ledger?.add();
  let dispose;
  try {
    dispose = adapter.subscribe(source, listener);
  } catch (error) {
    ledger?.remove();
    throw error;
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }

    released = true;
    ledger?.remove();
    dispose();
  };
}

/**
 * 经注册表订阅：与 adapter.subscribe 等价，额外维护 source 上的依赖计数，
 * 并在退订时同步清理。计数与账本记账合并在同一条路径里，
 * 少一层退订闭包（绑定按行创建，这一层会按行累加）。
 */
export function trackedSubscribe(adapter, source, listener) {
  const ledger = ledgers.get(source);
  ledger?.add();
  subscriberCounts.set(source, (subscriberCounts.get(source) ?? 0) + 1);
  let dispose;
  try {
    dispose = adapter.subscribe(source, listener);
  } catch (error) {
    ledger?.remove();
    decrementSubscriber(source);
    throw error;
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }

    released = true;
    ledger?.remove();
    decrementSubscriber(source);
    dispose();
  };
}

function decrementSubscriber(source) {
  const remaining = (subscriberCounts.get(source) ?? 0) - 1;
  if (remaining > 0) {
    subscriberCounts.set(source, remaining);
  } else {
    subscriberCounts.delete(source);
  }
}

/** 依赖该信号的绑定数（值绑定 + 区域依赖）。 */
export function dependentCount(source) {
  return subscriberCounts.get(source) || 0;
}

/** 登记依赖该信号的区域节点；写入口据此在 batch 内提前标记调度。 */
export function trackRegionOwner(source, node) {
  let set = regionOwners.get(source);
  if (!set) {
    set = new Set();
    regionOwners.set(source, set);
  }
  set.add(node);
  return () => set.delete(node);
}

/** 依赖该信号的区域节点（快照）。 */
export function dependentRegions(source) {
  return Array.from(regionOwners.get(source) || []);
}
