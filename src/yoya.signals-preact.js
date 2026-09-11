// Signals 引擎插件入口：把用户安装的 @preact/signals-core 适配为 yoya 契约。
// 不加入主入口、不进 dependencies，按需从此子路径导入。
export { createPreactAdapter } from './signals/preact/index.js';
