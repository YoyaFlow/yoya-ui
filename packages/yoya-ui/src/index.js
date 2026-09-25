// 由 .scratch/src-layout/tools/target-migrate.mjs 生成：只导出当前已迁到目标仓的域。
export * from '@yoyaflow/yoya-core/internal/core/index.js';
export * from '@yoyaflow/yoya-core/html';
export * from '@yoyaflow/yoya-core/svg';
// 0.8 起 i18n / a11y / theme / 组件作者助手在 `/tools`，svg 在 `/svg`；
// 这个仓内 bar（测试与示例用）保持"全量面"，与 `src/ui-router.js` 同口径。
export * from '@yoyaflow/yoya-core/tools';
export * from './layout/index.js';
export * from './actions/index.js';
export * from './navigation/index.js';
export * from './feedback/index.js';
export * from './form/index.js';
export * from './data-display/index.js';
export * from './async/index.js';
export * from './i18n/index.js';
export * from './theme/index.js';
export * from './router/index.js';
export * from './effects/index.js';
