# @yoyaflow/yoya-compiler

yoya-ui 的**构建期编译器**（可选工具，不属于运行期）。

## 它认识什么

- **形状**：元素工厂调用（`div((node) => …)`）、锚点结构、可折叠静态值、组件调用的摊平；
- **接口表**（只消费，不内建）：元素白名单（由 `@yoyaflow/yoya-core` 的工厂推导）、库内纯值 /
  助手（`themeValue` / `themeBorder`）、内容助手；
- **注册表**（数据，可缺）：业务项目自己的组件由插件扫**业务源码**生成；库内组件走
  `@yoyaflow/yoya-ui/compiled-registry`（随该库发布，属于可选输入）。

**它不认识任何组件名**：没有按组件名的分支、没有组件清单；查不到注册表条目就整体回落通用路径。

## 用法

```bash
npm i -D @yoyaflow/yoya-compiler @babel/parser magic-string
```

**Rollup / Vite** 用原生入口（不依赖 unplugin，Node 18.12+ 可用）：

```js
// vite.config.js（Rollup 同理：plugins 里放同一个插件对象）
import { yoyaCompileRollup } from '@yoyaflow/yoya-compiler/rollup';
export default { plugins: [yoyaCompileRollup({ core })] };
```

**其它打包器**（webpack / esbuild / rspack / rolldown / farm）装 `unplugin` 后用 unplugin 入口：

```bash
npm i -D unplugin      # Node 20.19 以下装 unplugin@2
```

```js
import { yoyaCompile } from '@yoyaflow/yoya-compiler';
export default { plugins: [yoyaCompile.webpack({ core })] };
```

Node 版本：`/rollup` 与 CLI 走 **Node 18.12+**；unplugin 2.3.x 同样 18.12+，unplugin 3.x 要
**Node 20.19+ / 22.12+**（它在模块顶层用 `import.meta.dirname`）。根入口的 `yoyaCompile` 是**按需加载**
unplugin 的——不碰它就不会加载，所以 CLI / 程序化 API / `/rollup` 在老 Node 上照常可用。

也就是说：**本包支持 Node 18.12 到最新版**（要 unplugin 多打包器入口时，Node < 20.19 装 `unplugin@2`）。
换 Node 版本自检（不需要测试框架）：

```bash
npm run build:packages     # 生成 dist
nvm use 18 && npm run smoke:compiler
nvm use 22 && npm run smoke:compiler
```

编译产物的运行期钩子在 `@yoyaflow/yoya-ui/compiler-runtime`（运行期子入口，主入口不含）。

## 与 `@yoyaflow/yoya-ui/compiler` 的关系

那是**老路径的转发壳**（发布路径兼容）。新项目直接依赖本包即可。
