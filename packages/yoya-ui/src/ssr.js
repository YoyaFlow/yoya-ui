// SSR 入口即服务端完整入口：core 原语（节点 / 信号 / HTML·SVG 工厂）+ html + layout +
// router / SSR 原语。服务端页面只引这一个入口就够（vBody 等 layout 组件也在里面）；
// 浏览器端用 `./router`，避免把 layout 拖进客户端包体。i18n / 主题 / a11y 仍在 `/tools`。
import './layout/index.js';

export * from '@yoyaflow/yoya-core/internal/core/index.js';
export * from '@yoyaflow/yoya-core/html';
export * from './layout/index.js';
export * from './router/index.js';
export * from '@yoyaflow/yoya-core/ssr';
