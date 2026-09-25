/**
 * `@yoyaflow/yoya-ui/core` 的声明：与 `@yoyaflow/yoya-core` 同一份类型。
 *
 * 运行期对应 `dist/core.js`（转发包），自包含单文件 `dist/yoya.core.js` 仍是 CDN 口径。
 * 之前的 `exports["./core"].types` 指向过这个不存在的文件，类型面因此一直缺这一格。
 */
export * from '@yoyaflow/yoya-core';
