# 安装与导入

本文讲清三件事：怎么把 yoya-ui 装进项目、每个**导出物**（公开入口）该从哪 import、以及每种接入方式
（脚手架 / 打包器 / CDN）的边界。入口面的取舍理由见 [packages.md](packages.md)，产物清单与命名口径见
[artifacts-plan.md](artifacts-plan.md)。

当前版本：`@yoyaflow/yoya-core` / `@yoyaflow/yoya-ui` / `@yoyaflow/yoya-compiler` 均为 **0.7.3**
（Node `^20.19.0 || ^22.13.0 || >=24.0.0`；浏览器基线见 [browser-support.zh-CN.md](browser-support.zh-CN.md)）。

## 1. 三种接入方式

| 方式          | 适用                                           | 命令 / 入口                                                                 |
| ------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| 脚手架        | 起新项目，想直接看到完整工程范式               | `npm create yoya-ui@latest my-app`（模板：`basic` / `admin` / `ssr`）       |
| npm 模块      | 已有打包器（Vite / Rollup / Webpack / Rspack） | `npm i @yoyaflow/yoya-ui`（组件）或 `npm i @yoyaflow/yoya-core`（只要引擎） |
| CDN（免构建） | 静态页、旧系统嵌一段、AI 生成代码直接跑        | `dist/yoya.core.min.js` / `dist/yoya.ui.full.min.js` 等**自包含单文件**     |

```bash
# 脚手架：三个模板，依赖钉在当前发布版本
npm create yoya-ui@latest my-app
create-yoya-ui my-app --template admin   # admin | basic | ssr

# npm 模块：组件包会把 core 作为 peer 一起装上（两包共用同一份 core 实例）
npm install @yoyaflow/yoya-ui

# 只要引擎（写自己的组件库、极简页面）
npm install @yoyaflow/yoya-core
```

样式没有运行时 CSS 注入，组件皮肤要自己引一次：

```js
import '@yoyaflow/yoya-ui/ui.css';
```

## 2. `@yoyaflow/yoya-core`：引擎与元素面

主入口只放**渲染必需**的东西：节点与原语、元素工厂（HTML + SVG + 图标集）、信号、权限与 Context 原语。
辅助能力（i18n / 主题 / a11y / 组件作者契约）单独放在 `/tools`，用不到就不会进包。

| 导入路径                               | 内容                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@yoyaflow/yoya-core`                  | 主入口：`ViewNode` / `ElementNode` / `HtmlElementNode` / `SvgElementNode` / `vNode` / `vText` / `slot`，HTML 与 SVG 工厂 + 图标集，信号 `ref` / `computed` / `batch` / `isSignal` / `installSignals`，权限与 Context（`createAccess` / `installAccess` / `withContext` / `inject` / `provide`），文档与窗口事件（`bindDocumentEvent` / `bindWindowEvent`） |
| `@yoyaflow/yoya-core/html`             | HTML 工厂（与主入口同一份实现）                                                                                                                                                                                                                                                                                                                            |
| `@yoyaflow/yoya-core/svg`              | SVG 工厂与图标集（与主入口同一份实现）                                                                                                                                                                                                                                                                                                                     |
| `@yoyaflow/yoya-core/tools`            | a11y（`announce` / `createFocusTrap` / `getFocusableElements` / `moveByKey`）、i18n（`createI18n` / `i18nText` / `installI18nStringShortcut` …）、主题（`initYoyaTheme` / `setYoyaMode` / `setYoyaTheme` / `resolveYoyaMode` …）、组件作者契约（`applyElementOptions` / `componentNameOf` / `themeValue` / `runBuilder` …）                                |
| `@yoyaflow/yoya-core/dev`              | DevTools：`enableDevtools` / `disableDevtools` / `subscribeDevtools` / `getDevtoolsSnapshot` …；旧路径 `/devtools` 仍可用                                                                                                                                                                                                                                  |
| `@yoyaflow/yoya-core/api`              | 通讯辅助：`RequestBase` / `Result` / `configureRequest`                                                                                                                                                                                                                                                                                                    |
| `@yoyaflow/yoya-core/ssr`              | SSR 原语：`renderToString` / `hydrate` / `mount` / `renderPage` / `hydrateOrMount` / `parseState` / `serializeState` / `resolveLocale`                                                                                                                                                                                                                     |
| `@yoyaflow/yoya-core/compiler-runtime` | 编译产物的运行期钩子（由编译产物自己引入，业务代码不用直接写）                                                                                                                                                                                                                                                                                             |
| `@yoyaflow/yoya-core/internal/*`       | 库内深引用白名单（`internal/core/node.js`、`internal/svg/icons.js` 等）；**业务代码请用上面的公开入口**                                                                                                                                                                                                                                                    |

```js
// 主入口：页面原语、元素工厂、信号、权限
import { body, div, svg, ref, computed, vNode, vText, createAccess } from '@yoyaflow/yoya-core';

// 辅助能力：用哪个引哪个
import { createI18n } from '@yoyaflow/yoya-core/tools'; // i18n
import { initYoyaTheme, setYoyaMode } from '@yoyaflow/yoya-core/tools'; // 主题
import { announce, createFocusTrap } from '@yoyaflow/yoya-core/tools'; // a11y
import { applyElementOptions } from '@yoyaflow/yoya-core/tools'; // 组件作者契约（与主入口同一绑定）
import { RequestBase, Result } from '@yoyaflow/yoya-core/api'; // 通讯
import { renderToString, hydrate, mount } from '@yoyaflow/yoya-core/ssr'; // SSR 原语
import { enableDevtools } from '@yoyaflow/yoya-core/dev'; // DevTools
```

> 0.7.2 起 `createI18n` / `initYoyaTheme` / `announce` 这类符号**不在**主入口，要从 `/tools` 引入；
> 若从 `@yoyaflow/yoya-core` 主入口取 `createI18n`，会直接报「没有该导出」。

## 3. `@yoyaflow/yoya-ui`：组件、路由与扩展

| 导入路径                                                                  | 内容                                                                                                                 |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@yoyaflow/yoya-ui`                                                       | 根入口 = 全量面：core + tools + 全部组件 + 布局 + 主题 + 路由/SSR（树摇按需）                                        |
| `@yoyaflow/yoya-ui/core`                                                  | 转发到 `@yoyaflow/yoya-core`（**同一份实例**，不会拿不到 `instanceof`）                                              |
| `@yoyaflow/yoya-ui/ui`                                                    | 组件 + layout + theme（不含 router / SSR）                                                                           |
| `@yoyaflow/yoya-ui/router`                                                | 路由 + SSR：`createRouter` / `Router` / `renderPage` / `hydrateOrMount` / `renderToString` / `mount` …               |
| `@yoyaflow/yoya-ui/ssr`                                                   | **服务端完整入口**：core 原语 + html + layout + router / SSR；服务端页面只引它一个（`vBody` 等 layout 组件也在里面） |
| `@yoyaflow/yoya-ui/{actions,navigation,feedback,form,data-display,async}` | 组件分类子入口（与 `/ui` 同一批组件，只是切法不同）                                                                  |
| `@yoyaflow/yoya-ui/tools`                                                 | 转发到 `@yoyaflow/yoya-core/tools`（i18n / 主题 / a11y / 作者契约）                                                  |
| `@yoyaflow/yoya-ui/svg`                                                   | SVG 元素面（与 core 同一份实现）                                                                                     |
| `@yoyaflow/yoya-ui/dev`                                                   | 模块转发到 core 的 DevTools；旧路径 `/devtools` 仍可用                                                               |
| `@yoyaflow/yoya-ui/api`                                                   | = `@yoyaflow/yoya-core/api`                                                                                          |
| `@yoyaflow/yoya-ui/echart`                                                | `vEchart`（自备 `echarts`，用 `chart.echartsLib(echarts)` 传入）                                                     |
| `@yoyaflow/yoya-ui/three`                                                 | `vThree`（自备 `three`）                                                                                             |
| `@yoyaflow/yoya-ui/compiler`                                              | 转发到 `@yoyaflow/yoya-compiler`                                                                                     |
| `@yoyaflow/yoya-ui/compiler-runtime` / `/compiled-registry`               | 编译运行期钩子与预生成注册表数据                                                                                     |
| `@yoyaflow/yoya-ui/ui.css`                                                | 组件皮肤与主题变量（无运行时注入，必须引）                                                                           |
| `@yoyaflow/yoya-ui/internal/*`                                            | 模块镜像（`dist/**`）：库内深引用的稳定落点，业务代码优先用上面的公开入口                                            |

```js
// 最省事：根入口一次引全（打包器会按需树摇）
import {
  div,
  ref,
  vText,
  vButton,
  vCard,
  vForm,
  vTable,
  createRouter,
  renderPage
} from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

// 想更薄：引擎 / 组件 / 路由 分开引
import { div, ref, vText } from '@yoyaflow/yoya-core';
import { vButton, vCard } from '@yoyaflow/yoya-ui/ui';
import { createRouter, renderPage } from '@yoyaflow/yoya-ui/router';

// 服务端：一个入口拿齐页面渲染需要的东西（layout 的 vBody 也在）
import { renderPage, renderToString, vBody } from '@yoyaflow/yoya-ui/ssr';

// 扩展与工具
import { vEchart } from '@yoyaflow/yoya-ui/echart';
import { createI18n, initYoyaTheme } from '@yoyaflow/yoya-ui/tools';
import { enableDevtools } from '@yoyaflow/yoya-ui/dev';
```

## 4. `@yoyaflow/yoya-compiler`：可选编译路径

构建期把重复单元（表格行、列表项、树节点）编成「静态片段 + 位置寻址的写操作」。
它是独立包，也可从 `@yoyaflow/yoya-ui/compiler` 转发引入；运行期钩子由产物自动从 core 引。

```js
import { yoyaCompile } from '@yoyaflow/yoya-compiler'; // unplugin 插件：.vite() / .rollup() / .esbuild() …
import { compileFile, reportCoverage } from '@yoyaflow/yoya-compiler'; // 程序化 API
```

```bash
npm i -D @yoyaflow/yoya-compiler @babel/parser
```

细节见 [compiler.zh-CN.md](compiler.zh-CN.md)。

## 5. CDN：自包含单文件与 import map

CDN 上**直接可用的是自包含单文件**（core 内联在里面，一个 `<script type="module">` 就能跑）；
而 `dist/yoya.ui.js`、`dist/actions/*.js` 这类增量入口是「单行转发、core 走 peerDependency」，
从 URL 直接 import 会报裸包名解析失败——要用它们就得配 `importmap`。

| 文件                              | 内容                                | 体积（min） |
| --------------------------------- | ----------------------------------- | ----------- |
| `dist/yoya.core.min.js`           | core 主入口（含 SVG 工厂 + 图标集） | ≈95 kB      |
| `dist/yoya.ui.full.min.js`        | core + 全部组件 + 布局 + 主题       | ≈349 kB     |
| `dist/yoya.ui-router.full.min.js` | 上面这些 + 路由 / SSR               | ≈377 kB     |
| `dist/yoya.router.full.min.js`    | core + 路由 / SSR                   | ≈128 kB     |

```html
<!-- 自包含：免构建，直接可用 -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/yoya.ui.css"
/>
<script type="module">
  import {
    div,
    svg,
    ref,
    vText
  } from 'https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/yoya.core.min.js';
</script>
```

```html
<!-- 想用包名写法（含组件子入口）：加一张 import map，再照常 import -->
<script type="importmap">
  {
    "imports": {
      "@yoyaflow/yoya-ui": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/ui.js",
      "@yoyaflow/yoya-core": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-core@0.7.3/dist/index.js"
    }
  }
</script>
```

三种 CDN 前缀路径完全一致，只换域名：`cdn.jsdelivr.net`（全球）、`cdn.jsdmirror.com`（中国）、
`s4.zstatic.net`（中国）。

> **禁忌**：自包含单文件（`yoya.core.min.js`、`*.full.min.js`）**不要与 `@yoyaflow/yoya-core` 包混用**，
> 也不要同时引两个自包含文件——两份 core 会让 `instanceof` / 身份判定失配。

## 6. 样式与类型

- **样式**：`@yoyaflow/yoya-ui/ui.css`（打包器）或 `dist/yoya.ui.css`（CDN），二者同一个文件；
  主题 token 与类名契约见 [theme.zh-CN.md](theme.zh-CN.md)。
- **类型**：每个入口都有对应声明（`types/*.d.ts`），随包发布；打包器与编辑器自动生效，CDN 用户不用管。
- **发布内容**：npm 包里只有 `dist/`、`types/` 与许可文件，**不含 `docs/` 与源码**；
  TypeScript 直接以包内声明为准。

## 7. 常见错误速查

| 现象                                                                       | 原因                                                          | 修法                                                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `does not provide an export named 'createI18n'`（从 core / ui 主入口引）   | 0.7.2 起 i18n / 主题 / a11y 移到 `/tools`                     | 改成 `from '@yoyaflow/yoya-core/tools'`（或 `@yoyaflow/yoya-ui/tools`） |
| `Failed to resolve module specifier "@yoyaflow/yoya-core"`（浏览器控制台） | 从 CDN 直接 import 了**增量入口**（单行转发、core 走 peer）   | 换成自包含单文件，或加 `importmap`                                      |
| `[NAMESPACE_CONFLICT]` 告警 / 某个符号 import 不到                         | barrel 里同名符号有两份实现（0.7.2 的 `applyElementOptions`） | 升级到 0.7.4+；跨入口同名符号必须是同一绑定                             |
| `instanceof` 判定失败、信号更新不到视图                                    | 装了两份 core（既引了 `.full` 又引了 core 包）                | 二选一；非 `.full` 入口之间共用同一份 peer core                         |

## 8. 相关文档

- 包结构与边界：[packages.md](packages.md)（中文）
- 产物方案与命名口径：[artifacts-plan.md](artifacts-plan.md)（中文）
- 首个页面与常用 API：根目录 [README.zh-CN.md](../README.zh-CN.md)
- 服务端渲染：[ssr.zh-CN.md](ssr.zh-CN.md) · 主题：[theme.zh-CN.md](theme.zh-CN.md) · 编译路径：[compiler.zh-CN.md](compiler.zh-CN.md)
- 第三方组件作者：[component-authoring.zh-CN.md](component-authoring.zh-CN.md) · 第三方库接入：[interop.zh-CN.md](interop.zh-CN.md)
