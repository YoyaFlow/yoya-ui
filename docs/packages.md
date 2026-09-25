# 包划分（monorepo）

仓库是 **npm workspaces** 的 monorepo，`packages/*` 下五个包，两条版本线加两个非发布包。

## 五个包

| 包                           | 线                   | 内容                                                                                                                                                                                | 依赖                                                                              |
| ---------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `@yoyaflow/yoya-core`        | **慢线**（兼容优先） | 节点 / 元素 / 信号 / 调度、HTML·SVG 工厂、SSR 原语、i18n·access·context·a11y·theme 原语、**组件作者契约**（`createComponentShortcut` / `applyComponentArguments` / `themeValue` …） | 无（运行期零依赖）                                                                |
| `@yoyaflow/yoya-ui`          | **快线**（追新）     | layout / actions / navigation / feedback / form / data-display / async / i18n / theme / router / echart / three + 皮肤 `yoya.ui.css` + 类型                                         | `peerDependencies: @yoyaflow/yoya-core ^0.7.0`；编译器包为**可选** peer           |
| `@yoyaflow/yoya-compiler`    | 构建期工具           | 编译器引擎：形状分析、发射、链接、注册表构建器、CLI / 插件。**不认识组件**（没有按组件名的分支与清单）                                                                              | peer：core（必需）、`@babel/parser`（可选）、ui（可选，只为读库内组件注册表数据） |
| `yoya-ui-contract`（不进包） | 契约                 | 跨包契约测试（core ⇄ ui 边界）+ 全仓门禁（结构 / DOM 访问 / 视图绑定基线）                                                                                                          | 同时依赖 core 与 ui                                                               |
| `create-yoya-ui`             | 脚手架               | `create-yoya-ui` CLI 与模板（模板依赖钉当前版本）                                                                                                                                   | —                                                                                 |

## 边界规则（都有门禁）

1. **core 不依赖组件**：`packages/yoya-core/src` 里没有组件域目录，也不出现 `@yoyaflow/yoya-ui` 的 import；
2. **快线把 core 当 peer**：`@yoyaflow/yoya-ui` 不把 core 写进 `dependencies`（那会带副本，破坏单例）；
3. **编译器不认识组件**：`packages/yoya-compiler/src` 不 import 任何组件域、不 import ui；它只消费 core 的接口表（元素白名单由 core 工厂推导、库内纯值 / 助手来自 core）与**可选**的注册表数据；
4. **库内知识留在库侧**："哪个文件属于哪个子入口、注册表键用哪个包名"写在 `scripts/compiler-registry.mjs`（通过参数注入编译器的通用构建器），不写进编译器；
5. **契约层是唯一同时引两个包的地方**（除编译器测试外）。

跑 `npm run verify:packages` 逐条核这五条。

## 运行期形态：两选一

```js
// 只要引擎（含 HTML/SVG/信号/SSR/i18n/theme/authoring）
import { div, vNode, createI18n } from '@yoyaflow/yoya-core';

// 要用组件（core 由 peer 自动带上）
import { vButton, vCard } from '@yoyaflow/yoya-ui/ui';
import '@yoyaflow/yoya-ui/ui.css';
```

要用**构建期编译**，再装一个只跑在构建期的包：

```bash
npm i -D @yoyaflow/yoya-compiler @babel/parser
```

编译产物的**运行期**钩子在 `@yoyaflow/yoya-core/compiler-runtime`（只有编译过的项目才会加载它；
主入口与组件入口都不带）。`@yoyaflow/yoya-ui/compiler`、`/compiler-runtime`、`/compiled-registry`
仍然可用——它们是老路径的**转发壳**。

## 发布面

`@yoyaflow/yoya-ui` 的 tarball 路径与 0.7.0 一致（`dist/yoya.*.js`、扁平 `types/yoya.*.d.ts`、
`exports` 旧面 17 个子入口）。产物分两类：

- **增量入口**（`yoya.ui.js` / `yoya.actions.js` …）：单行转发，core 走 peer，**不内联**；
- **自包含入口**（`yoya.core.js` / `yoya.api.js` / `yoya.ui.full.js` / `yoya.router.full.js` /
  `yoya.ui-router.full.js`）：core **内联**成单文件（"full 就是全包含"），适合 CDN 直用；
  **不要与 `@yoyaflow/yoya-core` 混用**（双副本会让 `instanceof` / 身份判定失配，见 `docs/ssr.md`）。

## 常用命令

```bash
npm run build            # 三个包各自产物 + 注册表 + 示例站 + 体积表
npm run verify:packages  # 包边界门禁（上面五条）
npm run verify:dist      # 产物门禁：exports↔dist / 互不内联 / 单例冒烟 / .full 冒烟 / README 体积表
npm test                 # 225 文件 / 1766 条（含契约与示例）
npm run typecheck        # 根 program + 只装 core 的独立 program
```
