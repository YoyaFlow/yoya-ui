/**
 * Rollup / Vite 原生入口：`plugins: [yoyaCompileRollup({ core })]`。
 *
 * 返回的就是 `./plugin-core.js` 的标准 Rollup 插件对象（Vite 用的也是这套接口），
 * 因此**不需要 `unplugin`**，也就不受它的 Node 版本约束——这是给「只装 rollup / vite」的项目
 * 与老 Node 的推荐入口。
 *
 *     import { yoyaCompileRollup } from '@yoyaflow/yoya-compiler/rollup';
 *     export default { plugins: [yoyaCompileRollup({ core })] };
 */
import { yoyaPluginFactory } from './plugin-core.js';

export function yoyaCompileRollup(options = {}) {
  return yoyaPluginFactory(options);
}

export { yoyaPluginFactory };
export * from './plugin-core.js';
