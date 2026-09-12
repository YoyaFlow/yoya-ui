// 状态引擎插件入口：把用户安装的 zustand/vanilla 适配为 yoya 契约。
// 不加入主入口、不进 dependencies，按需从此子路径导入。
export { createZustandAdapter } from './signals/zustand/index.js';
