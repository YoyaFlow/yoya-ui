// SSR 入口即服务端完整入口：core + html + layout + router + i18n + 渲染原语，
// 页面统一从该入口导入，避免与主入口形成双副本导致 instanceof 失配。
import './layout/index.js';

export * from './core/index.js';
export * from './html/index.js';
export * from './layout/index.js';
export * from './router/index.js';
export * from './core/ssr.js';
