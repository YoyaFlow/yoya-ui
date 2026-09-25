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
npm i -D @yoyaflow/yoya-compiler @babel/parser
```

```js
// vite.config.js
import { yoyaCompile } from '@yoyaflow/yoya-compiler';
export default { plugins: [yoyaCompile({ components: [{ file: 'src/row.js', export: 'Row' }] })] };
```

编译产物的运行期钩子在 `@yoyaflow/yoya-ui/compiler-runtime`（运行期子入口，主入口不含）。

## 与 `@yoyaflow/yoya-ui/compiler` 的关系

那是**老路径的转发壳**（发布路径兼容）。新项目直接依赖本包即可。
