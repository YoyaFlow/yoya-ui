import { defaultAdapter } from './engine.js';

// 引擎契约：只要求「值单元 + 通知」四个方法，依赖收集、派生（computed）、调度与
// 生命周期全部由 core 负责。契约越窄，换引擎的影响面越小（见 design.md §2.6、§5）。
const REQUIRED_METHODS = ['createSignal', 'read', 'subscribe', 'write'];

let installedAdapter = null;

/**
 * 校验引擎适配器：缺任一必需方法立刻抛错，并列出缺失项。
 */
export function assertSignalsAdapter(adapter) {
  if (!adapter || (typeof adapter !== 'object' && typeof adapter !== 'function')) {
    throw new TypeError('signals adapter must be an object');
  }

  const missing = REQUIRED_METHODS.filter((name) => typeof adapter[name] !== 'function');

  if (missing.length > 0) {
    throw new TypeError(`signals adapter is missing required method(s): ${missing.join(', ')}`);
  }

  return adapter;
}

/**
 * 安装引擎适配器（替换语义，同一时刻只有一个引擎）。
 * 传 null / undefined 恢复内化默认引擎——用于测试与显式回退。
 */
export function installSignals(adapter) {
  if (adapter === null || adapter === undefined) {
    installedAdapter = null;
    return currentSignals();
  }

  installedAdapter = assertSignalsAdapter(adapter);
  return installedAdapter;
}

/** 当前生效的引擎适配器：已安装的优先，否则内化默认引擎。 */
export function currentSignals() {
  return installedAdapter || defaultAdapter;
}
