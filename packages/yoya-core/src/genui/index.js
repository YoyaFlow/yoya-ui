/** 全量入口：协议 + 运行时 + 方言（含 A2UI）+ 门面。 */
export * from './protocol/index.js';
export * from './runtime/index.js';
export * from './dialects/index.js';
export { convert, createGenUI, fromJson, GenUI } from './genui.js';
export { createPlugin } from './create-plugin.js';
