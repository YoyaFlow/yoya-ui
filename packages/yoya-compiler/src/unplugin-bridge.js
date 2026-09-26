/**
 * 根入口的 `yoyaCompile` / `yoyaCompilePlugin`：**按需**加载 `unplugin`。
 *
 * 为什么要绕这一下：`unplugin` 是可选的构建期 peer，而且 3.x 是 **ESM-only**、模块顶层就用
 * `import.meta.dirname`（Node 20.11 才有）。静态 `import` 会让「只想用 CLI / 程序化 API /
 * Rollup 插件」的项目在 Node 18 / 20.9 上连包都 import 不进来——`dist/bin.js` 又 `export *`
 * 了根入口，CLI 也会一起挂。所以这里改成**第一次访问属性时才同步加载**：
 *
 * - 装 `unplugin` 2.x（有 CJS 入口）→ Node 18.12+ 可用；
 * - 装 `unplugin` 3.x → 走 `require(esm)`，Node 20.19+ / 22.12+ 可用；
 * - 没装 / 版本太老 → 抛出可读的错误，指路 `/rollup` 或换 unplugin 2。
 *
 * 不碰 `yoyaCompile` 的用法（CLI、`compileFile`、`reportCoverage`、`/rollup`）完全不加载 unplugin。
 */
import { createRequire } from 'node:module';
import { yoyaPluginFactory } from './plugin-core.js';

const requireFromHere = createRequire(import.meta.url);

/** 这些属性在探测（thenable / 调试打印）时不该触发加载。 */
const NO_LOAD = new Set(['then', 'toJSON', 'toString', 'valueOf']);

let cachedApi = null;

function unpluginApi() {
  if (cachedApi) {
    return cachedApi;
  }

  let module;
  try {
    module = requireFromHere('unplugin');
  } catch (error) {
    throw new Error(
      'yoya-compiler：需要构建期依赖 `unplugin`（`npm i -D unplugin`）。' +
        'Rollup / Vite 可以用 `@yoyaflow/yoya-compiler/rollup`（不需要 unplugin）；' +
        'Node 20.19 以下请装 `unplugin@2`。原始错误：' +
        String(error?.message ?? error),
      { cause: error }
    );
  }

  const createUnplugin = module.createUnplugin ?? module.default?.createUnplugin;

  if (typeof createUnplugin !== 'function') {
    throw new Error(
      'yoya-compiler：`unplugin` 版本不认识（缺 `createUnplugin`）——请装 unplugin 2.3+ 或 3.x。'
    );
  }

  cachedApi = createUnplugin(yoyaPluginFactory);
  return cachedApi;
}

/**
 * `unplugin` 工厂的惰性视图：`yoyaCompile.vite(options)` / `.rollup(options)` / `.esbuild(options)` …
 * 与直接 `import { yoyaCompile } from './plugin.js'` 得到的是同一个对象（同一个工厂、同样的入口）。
 */
export const yoyaCompile = new Proxy(
  {},
  {
    get(_target, property) {
      if (typeof property === 'symbol' || NO_LOAD.has(property)) {
        return undefined;
      }

      const api = unpluginApi();
      const value = api[property];
      return typeof value === 'function' ? value.bind(api) : value;
    },
    has(_target, property) {
      if (typeof property === 'symbol' || NO_LOAD.has(property)) {
        return false;
      }

      return property in unpluginApi();
    }
  }
);

/** esbuild 形态的快捷导出（等价于 `yoyaCompile.esbuild(options)`）。 */
export function yoyaCompilePlugin(options) {
  return unpluginApi().esbuild(options);
}
