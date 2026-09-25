/**
 * Entry types for `yoya-ui/ssr`: the **complete server entry** — core primitives (nodes / signals /
 * element factories including SVG) + html factories + layout + router / SSR primitives.
 *
 * 页面在服务端只引这一个入口就够了（vBody 之类的 layout 组件也在里面）；浏览器端请用
 * `yoya-ui/router`，避免把 layout 拖进客户端包体。运行期对应 `dist/yoya.ssr.js`（旧命名壳，
 * 转发到模块镜像 `dist/ssr.js`）。
 */
export * from '@yoyaflow/yoya-core/internal/types/core.js';
export * from '@yoyaflow/yoya-core/internal/types/html.js';
export * from './layout.js';
export * from './router.js';
export * from '@yoyaflow/yoya-core/internal/types/ssr.js';
