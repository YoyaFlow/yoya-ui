/**
 * `unplugin` 包装：把 `./plugin-core.js` 的形状驱动插件工厂导出成各打包器的入口
 * （`yoyaCompile.vite() / .rollup() / .webpack() / .esbuild() / .rspack() / .rolldown() / .farm()`）。
 *
 * **只有这个入口需要 `unplugin`**：
 * - Rollup / Vite 走 `@yoyaflow/yoya-compiler/rollup`（原生插件，不装 unplugin 也能跑）；
 * - 其它打包器走这里。Node 版本要求由所装的 unplugin 决定：**unplugin 2.3.x 支持 Node 18.12+**，
 *   unplugin 3.x 需要 Node 20.19+ / 22.12+（它在模块顶层用 `import.meta.dirname`）。
 *
 * 根入口（`@yoyaflow/yoya-compiler`）的 `yoyaCompile` 是同一个对象的**按需加载**版本，
 * 见 `./unplugin-bridge.js`：不碰它就不会加载 unplugin。
 */
import { createUnplugin } from 'unplugin';
import { yoyaPluginFactory } from './plugin-core.js';

export const yoyaCompile = createUnplugin(yoyaPluginFactory);

/** esbuild 形态的快捷导出（等价于 `yoyaCompile.esbuild(options)`），保留给已有配置直接用。 */
export function yoyaCompilePlugin(options) {
  return yoyaCompile.esbuild(options);
}

export * from './plugin-core.js';
