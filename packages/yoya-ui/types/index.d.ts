/**
 * Default entry types for the `@yoyaflow/yoya-ui` package root.
 *
 * 拆包后根入口的声明面 = 组件 + router/SSR；核心面（节点 / 信号 / HTML / SVG）随
 * `@yoyaflow/yoya-core` 发布，由该包自己的 `types/index.d.ts` 负责。
 */
export * from './yoya.ui-router.js';
