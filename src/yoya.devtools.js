// Devtools 独立入口：开发期视图树快照与生命周期事件流。
// 默认关闭、零运行时开销；不加入主入口，按需从此子路径导入。
export {
  disableDevtools,
  enableDevtools,
  getDevtoolsDom,
  getDevtoolsScope,
  getDevtoolsSnapshot,
  isDevtoolsEnabled,
  subscribeDevtools
} from './core/devtools.js';
