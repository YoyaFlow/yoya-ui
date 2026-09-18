// 区域重建调度：由 core 拥有「同一批次只重建一次」的语义。
// 引擎契约不要求 batch（可选项），因此合并不能押在 adapter.batch 上；
// 这里在 core batch 作用域内收集待重建区域，作用域结束时同步flush。
import { dependentRegions } from './observe.js';

let batchDepth = 0;
const scheduledRegions = new Set();

export function beginSignalsBatch() {
  batchDepth += 1;
}

export function isSignalsBatchActive() {
  return batchDepth > 0;
}

export function endSignalsBatch() {
  batchDepth -= 1;
  if (batchDepth === 0) {
    flushScheduledRegions();
  }
}

/** 信号触发的区域重建入口：batch 内合并，运行中排队，其余立即同步执行。 */
export function scheduleRegionRebuild(node) {
  if (node._regionRunning || batchDepth > 0) {
    node._regionScheduled = true;
    if (batchDepth > 0) {
      scheduledRegions.add(node);
    }
    return;
  }

  node.rebuild({ trigger: 'signal' });
}

/** 写入口调用：batch 内值变化时，预先把依赖区域标记为已调度。 */
export function scheduleRegionsForSource(source) {
  if (batchDepth === 0) {
    return;
  }

  dependentRegions(source).forEach((node) => {
    node._regionScheduled = true;
    scheduledRegions.add(node);
  });
}

/** 清除调度状态：真实重建、销毁或离开 DOM 时调用。 */
export function cancelScheduledRegionRebuild(node) {
  // 没排过队的节点不碰 Set：销毁整份列表时这里的 Set.delete 会按节点数累加
  // （集合里只会有 _regionScheduled === true 的节点）
  if (node._regionScheduled !== true) {
    return;
  }

  node._regionScheduled = false;
  scheduledRegions.delete(node);
}

function flushScheduledRegions() {
  if (scheduledRegions.size === 0) {
    return;
  }

  const regions = Array.from(scheduledRegions);
  scheduledRegions.clear();
  let firstError = null;

  regions.forEach((region) => {
    region._regionScheduled = false;
    if (region._deleted || !region._regionActive) {
      return;
    }

    try {
      region.rebuild({ trigger: 'signal' });
    } catch (error) {
      if (!firstError) {
        firstError = error;
      }
    }
  });

  if (firstError) {
    throw firstError;
  }
}
