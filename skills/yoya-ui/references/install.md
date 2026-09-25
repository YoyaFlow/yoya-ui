# 安装与导入（导出物清单）

用 yoya-ui 时**从哪个入口 import** 是第一个会踩的坑：0.7.2 起主入口只留渲染原语，i18n / 主题 / a11y
移到 `/tools`；CDN 上「直引增量入口」也会因裸包名解析失败。本页给出全部公开入口与判据。

## 三种接入方式

```bash
# 1) 脚手架：basic（最小 SPA）/ admin（后台，推荐）/ ssr（整页 SSR + hydrate）
npm create yoya-ui@latest my-app          # 等价 npx create-yoya-ui my-app
create-yoya-ui my-app --template admin
cd my-app && npm install && npm run dev

# 2) npm 模块（打包器）：组件包会把 core 作为 peer 一起装（共用同一份 core 实例）
npm install @yoyaflow/yoya-ui
npm install @yoyaflow/yoya-core           # 只要引擎时

# 3) CDN：只有**自包含单文件**能直接 import；增量入口需要 importmap
npm i -D @yoyaflow/yoya-compiler @babel/parser   # 可选：构建期编译路径
```

样式没有运行时注入，组件皮肤必须引一次：`import '@yoyaflow/yoya-ui/ui.css';`。

## `@yoyaflow/yoya-core`（引擎与元素面）

| 导入路径                               | 内容                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@yoyaflow/yoya-core`                  | 主入口：节点与原语（`ViewNode` / `ElementNode` / `HtmlElementNode` / `SvgElementNode` / `vNode` / `vText` / `slot`）、HTML 与 SVG 工厂 + 图标集、信号（`ref` / `computed` / `batch` / `isSignal` / `installSignals`）、权限与 Context（`createAccess` / `installAccess` / `withContext` / `inject` / `provide`）、文档/窗口事件 |
| `@yoyaflow/yoya-core/html`             | HTML 工厂（与主入口同一份）                                                                                                                                                                                                                                                                                                     |
| `@yoyaflow/yoya-core/svg`              | SVG 工厂 + 图标集（与主入口同一份）                                                                                                                                                                                                                                                                                             |
| `@yoyaflow/yoya-core/tools`            | a11y（`announce` / `createFocusTrap` / `getFocusableElements` / `moveByKey`）、i18n（`createI18n` / `i18nText` / `installI18nStringShortcut` …）、主题（`initYoyaTheme` / `setYoyaMode` / `setYoyaTheme` …）、组件作者契约（`applyElementOptions` / `componentNameOf` / `themeValue` / `runBuilder` …）                         |
| `@yoyaflow/yoya-core/dev`              | DevTools（`enableDevtools` / `subscribeDevtools` …）；旧名 `/devtools` 仍可用                                                                                                                                                                                                                                                   |
| `@yoyaflow/yoya-core/api`              | 通讯辅助：`RequestBase` / `Result` / `configureRequest`                                                                                                                                                                                                                                                                         |
| `@yoyaflow/yoya-core/ssr`              | SSR 原语：`renderToString` / `hydrate` / `mount` / `renderPage` / `hydrateOrMount` / `parseState` / `serializeState` / `resolveLocale`                                                                                                                                                                                          |
| `@yoyaflow/yoya-core/compiler-runtime` | 编译产物的运行期钩子（产物自己引，业务代码不写）                                                                                                                                                                                                                                                                                |
| `@yoyaflow/yoya-core/internal/*`       | 库内深引用白名单；**业务代码用公开入口**                                                                                                                                                                                                                                                                                        |

```js
import { body, div, svg, ref, computed, vNode, vText, createAccess } from '@yoyaflow/yoya-core';
import {
  createI18n,
  initYoyaTheme,
  announce,
  applyElementOptions
} from '@yoyaflow/yoya-core/tools';
import { RequestBase, Result } from '@yoyaflow/yoya-core/api';
import { renderToString, hydrate, mount } from '@yoyaflow/yoya-core/ssr';
import { enableDevtools } from '@yoyaflow/yoya-core/dev';
```

## `@yoyaflow/yoya-ui`（组件、路由与扩展）

| 导入路径                                                                  | 内容                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@yoyaflow/yoya-ui`                                                       | 根入口 = 全量面：core + tools + 全部组件 + 布局 + 主题 + router/SSR（按需树摇）                        |
| `@yoyaflow/yoya-ui/core`                                                  | 转发到 `@yoyaflow/yoya-core`（**同一实例**）                                                           |
| `@yoyaflow/yoya-ui/ui`                                                    | 组件 + layout + theme（不含 router / SSR）                                                             |
| `@yoyaflow/yoya-ui/router`                                                | 路由 + SSR：`createRouter` / `Router` / `renderPage` / `hydrateOrMount` / `renderToString` / `mount` … |
| `@yoyaflow/yoya-ui/{actions,navigation,feedback,form,data-display,async}` | 组件分类子入口（与 `/ui` 同一批组件）                                                                  |
| `@yoyaflow/yoya-ui/tools`                                                 | 转发到 `@yoyaflow/yoya-core/tools`                                                                     |
| `@yoyaflow/yoya-ui/svg`                                                   | SVG 元素面（= core 那份）                                                                              |
| `@yoyaflow/yoya-ui/dev` / `/devtools`                                     | DevTools（前者为规范路径）                                                                             |
| `@yoyaflow/yoya-ui/api`                                                   | = `@yoyaflow/yoya-core/api`                                                                            |
| `@yoyaflow/yoya-ui/echart` / `/three`                                     | `vEchart` / `vThree`（自备 echarts / three）                                                           |
| `@yoyaflow/yoya-ui/compiler` / `/compiler-runtime` / `/compiled-registry` | 编译器与运行期钩子                                                                                     |
| `@yoyaflow/yoya-ui/ui.css`                                                | 组件皮肤与主题变量                                                                                     |

> `/ssr` **不是**公开入口：SSR 原语从 `@yoyaflow/yoya-ui/router` 或 `@yoyaflow/yoya-core/ssr` 引。

## `@yoyaflow/yoya-compiler`（可选编译路径）

```js
import { yoyaCompile } from '@yoyaflow/yoya-compiler'; // unplugin 插件：.vite() / .rollup() / .esbuild() …
import { compileFile, reportCoverage } from '@yoyaflow/yoya-compiler';
```

## CDN

| 文件                              | 内容                                |
| --------------------------------- | ----------------------------------- |
| `dist/yoya.core.min.js`           | core 主入口（含 SVG 工厂 + 图标集） |
| `dist/yoya.ui.full.min.js`        | core + 全部组件 + 布局 + 主题       |
| `dist/yoya.ui-router.full.min.js` | 上面 + 路由 / SSR                   |
| `dist/yoya.router.full.min.js`    | core + 路由 / SSR                   |

```html
<script type="module">
  import {
    div,
    svg,
    ref,
    vText
  } from 'https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/yoya.core.min.js';
</script>

<!-- 想用包名写法：先加 import map -->
<script type="importmap">
  {
    "imports": {
      "@yoyaflow/yoya-ui": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/ui.js",
      "@yoyaflow/yoya-core": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-core@0.7.3/dist/index.js"
    }
  }
</script>
```

CDN 前缀：`cdn.jsdelivr.net`（全球）、`cdn.jsdmirror.com` / `s4.zstatic.net`（中国），路径完全一致。
**禁忌**：自包含单文件不要与 `@yoyaflow/yoya-core` 包混用，也不要同时引两个自包含文件（两份 core 会让
`instanceof` / 身份判定失配）。

## 报错对照

| 现象                                                          | 原因                                    | 修法                                                      |
| ------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `does not provide an export named 'createI18n'`（从主入口引） | 0.7.2 起 i18n / 主题 / a11y 在 `/tools` | 改 `from '@yoyaflow/yoya-core/tools'`（或 ui 同名子入口） |
| `Failed to resolve module specifier "@yoyaflow/yoya-core"`    | 从 CDN 直接引了增量入口                 | 用自包含单文件，或加 importmap                            |
| `Failed to resolve module specifier "@yoyaflow/yoya-ui/ssr"`  | `/ssr` 不是公开入口                     | 用 `@yoyaflow/yoya-ui/router` / `@yoyaflow/yoya-core/ssr` |
| `instanceof` 失配、信号写入不更新视图                         | 装了两份 core（`.full` + core 包）      | 二选一；非 `.full` 入口共享同一份 peer core               |
