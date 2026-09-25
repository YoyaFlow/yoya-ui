# yoya-ui

**浏览器原生扩展库：真·渐进式 —— 无虚拟 DOM、无构建步骤，纯 JS 声明式 UI 基础库。**

**简体中文** | [English](./README.md)

[![Release](https://img.shields.io/npm/v/@yoyaflow/yoya-ui?label=release&style=flat-square)](https://www.npmjs.com/package/@yoyaflow/yoya-ui)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/yoyaflow/yoya-ui/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/yoyaflow/yoya-ui/actions)
[![Types](https://img.shields.io/badge/types-TypeScript-blue?style=flat-square)](https://github.com/yoyaflow/yoya-ui/tree/main/types)

## 它是什么

它不是又一层跑在浏览器之上的框架运行时，而是对你已有 HTML / DOM 的**声明式扩展**：视图就是普通
JS 函数，视图树里的每个节点都是真实 DOM 元素的句柄，写入状态就更新绑定的位置——没有虚拟 DOM、
没有 JSX / 模板编译、不强制构建步骤。

组件库、路由、i18n、主题、权限与状态管理随库提供，但没有一样接管你的构建链：可以只引一个入口，
也可以全用；任何时刻都能退回原生 DOM 写法。定位长文与完整理由见
[为什么是 yoya-ui](docs/why-yoya-ui.zh-CN.md)。

## 给谁用

- **不想被构建工具绑架的团队** —— 随库发布的 ESM 文件在普通页面里直接能跑，已有打包器配置同样欢迎。
- **交付与长期维护型团队** —— 一套落在 Web 标准上的稳定 API，不必跟着框架大版本重写。
- **老旧系统与既有页面** —— 在已有的 PHP / JSP / Vue / React 页面里逐块加入声明式交互，无需迁移。
- **AI 生成的代码要能直接跑** —— 生成的代码与浏览器之间没有框架上下文、没有构建魔法。

**不适合谁：**已经深度绑定某个框架生态（React / Vue / Angular）、并且想要该生态的组件市场、
约定与工具链的团队。yoya-ui 刻意不重新包装这些库——它把真实 DOM 元素交给它们。

## 30 秒上手：单文件计数器

把下面内容存成 `index.html` 打开即可 —— 不装依赖、不构建。库与样式都从 CDN 引入。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>yoya-ui 计数器</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@0.7.3/dist/yoya.ui.css"
    />
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import {
        div,
        ref,
        vButton,
        vCard,
        vText
      } from 'https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@0.7.3/dist/yoya.ui.full.min.js';

      const count = ref(0); // 状态就是句柄：写入即更新绑定位置

      div((page) => {
        page.vCard((card) => {
          card.vCardHeader('计数器');
          card.vCardBody((body) => {
            body.p((line) => line.child(vText(count)));
            body.vButton('+1', (button) => {
              button.variant('primary');
              button.on('click', () => {
                count.value += 1;
              });
            });
            body.vButton('归零', (button) =>
              button.on('click', () => {
                count.value = 0;
              })
            );
          });
        });
      }).bindTo('#app');
    </script>
  </body>
</html>
```

一棵树三层写法：原生元素（`p`）、官方组件（`vCard` / `vButton`）与状态句柄（`ref`）。URL 里的版本号
是写作时的最新发布版本。

**中国网络访问慢？** 下面三家路径完全一致：把 `<version>` 换成已发布版本，只换域名、其余不变。

| CDN       | 前缀                                                              | 说明                      |
| --------- | ----------------------------------------------------------------- | ------------------------- |
| jsdmirror | `https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@<version>/dist/` | 中国（jsDelivr 中国镜像） |
| Zstatic   | `https://s4.zstatic.net/npm/@yoyaflow/yoya-ui@<version>/dist/`    | 中国                      |
| jsDelivr  | `https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@<version>/dist/`  | 全球                      |

前缀 + 文件名就是完整地址：`yoya.ui.full.min.js`、`yoya.ui.css`、`yoya.core.js` …

## 渐进式的四个档位

1. **一个 script 标签。** 就是上面的快速开始：CDN、真实页面、零工具链。
2. **渐进式增强。** `bindTo()` 把一块交互挂进已有页面 —— 静态 HTML、PHP / JSP 页面、Vue / React
   应用都行。加一块，其余部分原样不动。
3. **npm 与模块化。** `npm install @yoyaflow/yoya-ui`（会自动带上 `@yoyaflow/yoya-core`）；
   只要引擎原语就 `npm install @yoyaflow/yoya-core`。再按入口按需引入：

   ```js
   import { div, svg, vNode } from '@yoyaflow/yoya-core'; // 引擎、HTML/SVG、信号
   import { createI18n, initYoyaTheme } from '@yoyaflow/yoya-core/tools'; // i18n / 主题 / a11y / 组件作者契约
   import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // 官方组件
   import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts 扩展（自备 echarts）
   import { vThree } from '@yoyaflow/yoya-ui/three'; // Three.js 扩展（自备 three）
   import { renderPage, hydrateOrMount } from '@yoyaflow/yoya-ui/router'; // 路由 + SSR
   import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-core/api'; // 通讯辅助
   import '@yoyaflow/yoya-ui/ui.css'; // 组件皮肤与主题变量
   ```

   > 要用构建期编译器：`npm i -D @yoyaflow/yoya-compiler @babel/parser`。编译产物的运行期钩子在
   > `@yoyaflow/yoya-core/compiler-runtime`（只有编译过的项目才会加载它）。

4. **完整应用：SPA 或 SSR。** 整站单页应用不需要额外一层——内置路由（`history` / `hash` 模式、
   参数、守卫、404、`vLink`、`vRouterViews`）加上组件分类与 `ref` 状态，同样不强制构建步骤；
   需要服务端渲染时，复用同一份页面工厂即可：

   ```bash
   npm install -g create-yoya-ui
   create-yoya-ui my-app --template admin   # SPA 外壳（admin / basic）或 SSR（ssr）
   ```

   服务端用 `renderPage()` 渲染这份工厂，浏览器端用 `hydrateOrMount()` 接上——一套代码，没有第二套
   渲染模型。详见 [docs/ssr.zh-CN.md](docs/ssr.zh-CN.md)。

## 能力一览

| 领域             | 内容                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| 声明式 HTML/SVG  | 全部 WHATWG 元素工厂、父节点快捷方法、`svgs` 命名空间、内置图标集                        |
| 组件             | 布局、操作、导航、反馈、表单、数据展示、异步、特效、看板，全部附带 TypeScript 类型声明   |
| 路由             | history / hash 模式、参数、守卫、404、`vLink`、`vRouterViews`                            |
| i18n             | `'文案'.s('key')` 快捷写法、响应式切换语言、SSR 每请求隔离                               |
| 状态             | 值位置直接接 `ref` / `computed` 句柄、可重建区域、`keyed()` 列表、`mountable()` 条件挂载 |
| 主题             | 设计 token、明暗模式、`@layer` CSS 架构                                                  |
| 权限             | 声明资源码，隐藏 / 只读 / 禁用自动派生                                                   |
| 容错与性能       | `whenFailed()` 子树错误边界；`vScroll` 长列表自动虚拟化                                  |
| 扩展             | `vEchart` / `vThree` 子入口；任何能挂进 DOM 的库都按同一份生命周期契约组合               |
| DevTools（Beta） | 独立 `devtools` 入口：信号写入、区域重建、hydration 不一致                               |
| 编译路径（Beta） | 构建期编译器 + `compiler-runtime` 钩子：结构恒定的行 / 项编成「静态片段 + 位置写」       |

状态只需要 `ref` 与 `computed`：没有深层代理，也没有代理 store。各能力细节见
[docs/highlights.zh-CN.md](docs/highlights.zh-CN.md)。

### 编译路径（Beta）

只针对**重复单元**（表格行、列表项、树节点）的构建期工具：编译器在构建期读懂行构建函数，产出
"克隆静态片段 + 只写活值"的模块。它的钩子在独立子路径 `@yoyaflow/yoya-ui/compiler-runtime`，
主入口不含编译器。

```bash
# 安装：编译器就在同一个包里；另需自备构建期依赖 @babel/parser（optional peer，不会自动装）
npm i -D @yoyaflow/yoya-ui @babel/parser
```

```bash
npx yoya-compiler --file src/Row.js --component Row --mode element --out src/generated/row.js
# 不用 bin 的等价写法：
# node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --file … --component Row --out …
```

推荐接法是**构建期插件**——unplugin 写一遍，Vite / Rollup / Webpack / esbuild / Rspack / Rolldown / Farm
都有入口（`yoyaCompile.vite(...)` / `.rollup(...)` / `.esbuild(...)` …）。业务源码零改动：插件把
`Row` 改名为 `RowSource`、追加同名函数转调产物，产物进虚拟模块，业务代码不 import 任何生成物。
只在自己已有的构建配置里加一行：

```js
import * as core from '@yoyaflow/yoya-ui/core';
import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';

plugins: [yoyaCompile.vite({ core })]; // 编译单元＝组件边界（返回 UI 视图的顶层工厂）
```

列表照旧写 `tbody((body) => body.keyed(rows, Row))`：`element` 通道的 `{el, destroy}` 行与 `node`
通道的 ViewNode 行 `keyed()` 都直接吃（运行期按产出自选对账）。目标定位按 AST 符号身份，
**认不准就不动**（找不到 / 同名声明 ≥2 处 / 形状编不了 → 源码原样走通用路径）。
改写保留 hires sourcemap，线上报错仍定位到业务源码。
用法与契约见 [skills/yoya-ui/references/compile.md](skills/yoya-ui/references/compile.md)。

```js
import { compileFile, reportCoverage } from '@yoyaflow/yoya-ui/compiler';
```

**不需要配置**：`--core` 默认就是包自带的 core（只有换成另一份副本时才传）；`--runtime` 默认写
`./compiler-runtime.js`，用打包器时指到 `@yoyaflow/yoya-ui/compiler-runtime` 即可；产物是普通 ESM
模块，运行期不用改任何东西。认不出的构造会让**整个形状**回落通用路径（绝不半编译）。

状态：**Beta**——参数与产物格式仍可能在小版本内调整；不用它不影响任何现有写法。完整契约（两条通道、
组件注册表、页面 `<template>` 片段、`--report`）见 [docs/compiler.zh-CN.md](docs/compiler.zh-CN.md)。

## 一切是真实 DOM，第三方库直接接

视图树就是 DOM 树。任何"往元素里挂"的库——图表、编辑器、表格、地图——只需要一个生命周期明确的
形态 B 组件（`vNode` 闭包：`whenMount(host)` → 初始化，配置更新 → 转发，`whenDestroy` → 释放），
之后就能像官方组件一样用 `child()` 组合。`vEchart` 是参考实现：

- 库实例一次交出（`chart.echartsLib(echarts)`）；
- 没有 wrapper、没有适配层、不重新打包依赖；
- `registerChildFactories` 让你的组件成为父节点快捷方法（`page.vEchart(…)`）；
- 只在浏览器跑的组件用 `vClientOnly()` 包住，SSR 只输出占位。

在线演示：`npm run examples:html`（组件目录，以及 Quill、AG Grid Community、Leaflet、CodeMirror 6、
Toast UI Viewer 与 `vThree` 工厂沙盘）。扩展写法与跨库对照见
[docs/interop.zh-CN.md](docs/interop.zh-CN.md)。

## 可复核的工程信号

Star 数说明关注度，不说明正确性，所以下面这些都可以直接查：

| 信号       | 当前值                                                            | 怎么验证                                                                                         |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 运行时依赖 | **0**                                                             | `package.json` 无 `dependencies` 字段                                                            |
| 测试       | 1000+ 用例（DOM、状态、路由、i18n、权限、SSR/hydrate）            | `npm test`                                                                                       |
| 类型声明   | root / core / api / ui / router / 扩展入口，含消费方类型测试      | `npm run typecheck`                                                                              |
| SSR 确定性 | render / hydrate / mount 均有覆盖，设计上不碰 DOM                 | `packages/yoya-ui/src/testing/integration/*.ssr.test.js`、[docs/ssr.zh-CN.md](docs/ssr.zh-CN.md) |
| 产物校验   | exports↔dist、两包互不内联、宿主单例冒烟、`.full` 自包含、体积表  | `npm run build && npm run verify:dist`                                                           |
| 包边界     | core 不依赖组件；快线把 core 当 peer；编译器不认识组件            | `npm run verify:packages`                                                                        |
| 浏览器基线 | Chrome/Edge ≥ 123 · Firefox ≥ 120 · Safari/iOS ≥ 17.5，带降级兜底 | `browserslist`、[docs/browser-support.zh-CN.md](docs/browser-support.zh-CN.md)                   |
| 契约文档   | 组件形态、值位置、生命周期已写成规范                              | [docs/component-authoring.zh-CN.md](docs/component-authoring.zh-CN.md)                           |

这是一个早期项目：Star 少、没有历史生态包袱，优先级仍然可以影响。评估它时请看仓库本身——测试、
规范文档、与 Web 标准对齐的 API。更完整的说明（包括我们接受的取舍）见
[docs/why-yoya-ui.zh-CN.md](docs/why-yoya-ui.zh-CN.md)。

## 与其他框架的基准对比

执行（九项标准操作）与内存，取自官方
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) runner——**本地测试环境**
测得（口径见表格上方的说明），不是官方站点数字：

<!-- benchmark:readme:start 由 scripts/benchmark-report.mjs 生成 -->

> **本地测试环境**：单机 Windows + Chrome for Testing 152.0.7977.64（headless）+ 官方 runner `playwright`，
> 全部条目**同一轮**测出；执行项取 15 个样本的中位数，内存 1 次采样。
> 单元格格式为 `测量值（÷ 原生）`，执行项单位 ms、内存项 MB。**不是官方站点数字**，
> 横向对比只在同一轮内有效；体积、首屏与逐项明细（含 9 项 script / paint 分解）见 [`benchmark/report.html`](benchmark/report.html)。

| 基准                      | 原生 vanillajs | yoya-**0.7.3**（编译） | yoya-**0.7.3**（无编译） | Vue 3.5.39    | React 19.2.0  | Solid 1.9.3   | Svelte 5.42.1 |
| ------------------------- | -------------- | ---------------------- | ------------------------ | ------------- | ------------- | ------------- | ------------- |
| 01 创建 1000 行           | 30.5           | 35.3 (1.16×)           | 44.9 (1.47×)             | 36.8 (1.21×)  | 38.3 (1.26×)  | 33.6 (1.10×)  | 32.7 (1.07×)  |
| 02 替换 1000 行           | 32.8           | 38.5 (1.17×)           | 46.1 (1.41×)             | 40.7 (1.24×)  | 43.9 (1.34×)  | 35.9 (1.09×)  | 36.4 (1.11×)  |
| 03 每 10 行改文案         | 22.4           | 20.5 (0.92×)           | 23.2 (1.04×)             | 26.3 (1.17×)  | 27.0 (1.21×)  | 22.8 (1.02×)  | 22.3 (1.00×)  |
| 04 选中一行               | 7.3            | 5.8 (0.79×)            | 6.2 (0.85×)              | 7.6 (1.04×)   | 10.5 (1.44×)  | 9.1 (1.25×)   | 10.6 (1.45×)  |
| 05 交换两行               | 22.1           | 26.9 (1.22×)           | 28.0 (1.27×)             | 24.8 (1.12×)  | 157.3 (7.12×) | 24.5 (1.11×)  | 25.6 (1.16×)  |
| 06 删除一行               | 16.8           | 18.0 (1.07×)           | 19.1 (1.14×)             | 19.2 (1.14×)  | 18.4 (1.10×)  | 18.2 (1.08×)  | 17.9 (1.07×)  |
| 07 创建 10000 行          | 330.4          | 395.7 (1.20×)          | 539.3 (1.63×)            | 406.7 (1.23×) | 585.5 (1.77×) | 350.7 (1.06×) | 371.7 (1.13×) |
| 08 追加 1000 行           | 34.4           | 39.7 (1.15×)           | 48.9 (1.42×)             | 41.6 (1.21×)  | 50.4 (1.47×)  | 37.3 (1.08×)  | 36.8 (1.07×)  |
| 09 清空 ×8                | 15.3           | 20.6 (1.35×)           | 23.3 (1.52×)             | 20.1 (1.31×)  | 27.2 (1.78×)  | 17.6 (1.15×)  | 17.1 (1.12×)  |
| 九项几何平均（综合指标）  | 28.00          | 30.85 (1.10×)          | 35.85 (1.28×)            | 33.16 (1.18×) | 46.94 (1.68×) | 30.90 (1.10×) | 31.46 (1.12×) |
| 21 就绪内存（MB）         | 1.02           | 1.33 (1.31×)           | 1.29 (1.26×)             | 1.33 (1.30×)  | 1.64 (1.60×)  | 1.05 (1.03×)  | 1.14 (1.11×)  |
| 22 建 1000 行后内存（MB） | 2.44           | 4.12 (1.69×)           | 5.48 (2.24×)             | 4.58 (1.88×)  | 5.09 (2.08×)  | 3.33 (1.36×)  | 3.52 (1.44×)  |
| 25 建+清空后内存（MB）    | 1.16           | 1.64 (1.41×)           | 1.82 (1.57×)             | 1.70 (1.47×)  | 2.48 (2.14×)  | 1.29 (1.11×)  | 1.49 (1.29×)  |

<!-- benchmark:readme:end -->

## 构建产物与体积

```bash
npm run build        # packages/*/dist（发布面 + 模块镜像）+ dist/examples/ + 体积表
npm run verify:dist  # 产物完整性、两包互不内联、宿主单例冒烟、`.full` 自包含冒烟、README 体积表
```

仓库是 **五个包的 monorepo**（`packages/*`）：`yoya-core`（慢线：原语 + 组件作者契约）、
`yoya-ui`（快线：组件 / layout / router / 主题 / 扩展）、`yoya-compiler`（构建期编译器）、
`contract`（跨包契约测试）、`create-yoya-ui`（脚手架）。产物有两层：

- **发布面**：旧命名入口 + `.min`（`dist/yoya.ui.js`、`dist/yoya.ui-router.full.js` …）。增量入口是
  "单行转发、core 走 peer"；`yoya.core.js` / `yoya.api.js` / 三个 `.full` 是**自包含**（core 内联成单文件）；
- **模块镜像**：`dist/core/**`、`dist/actions/**` …（preserveModules）—— 这是 `/internal/*` 深引用的稳定落点。

单例口径：**非-full 入口**只通过 peerDependency 共享一份 core（双副本会让 `instanceof` / 身份判定失配）；
`.full` 是自包含单文件，**不与 core 包混用**（详见 [docs/ssr.zh-CN.md](docs/ssr.zh-CN.md) 的禁忌）。

入口面（0.7.2 起）：主入口是渲染原语 + 整个元素面（节点、HTML 与 **SVG 工厂 + 图标集**、信号、
`keyed`、`vText`、`slot`）；`/tools` 放 a11y + i18n + 主题 + 组件作者契约，`/dev` 放 DevTools，
`/svg` 仍是元素面的显式别名。旧的 `@yoyaflow/yoya-core/devtools` 与 `@yoyaflow/yoya-ui/devtools`
仍可解析。

下表是各入口的**传递闭包 min+gzip**（跟着产物的 import 图重打一次并压缩）。core 那一行是自包含的；
ui 各行量的是"在 core 之上再加多少"，所以实际下载量 = core 行 + 该行。

<!-- bundle-sizes:start -->

| 入口                                 | 内容                                                                                | min+gzip |
| ------------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| `@yoyaflow/yoya-core`                | 节点 / 信号 / HTML·SVG 原语 + i18n·access·context·a11y·theme 原语（自包含）         | 26.5 KB  |
| `@yoyaflow/yoya-core/api`            | 通讯辅助约束：RequestBase / Result / configureRequest                               | 0.6 KB   |
| `@yoyaflow/yoya-core/tools`          | a11y / i18n / theme / 组件作者契约原语（core 自包含）                               | 22.8 KB  |
| `@yoyaflow/yoya-ui`                  | 全部组件 + layout + router / SSR（core 由 peer 提供）                               | 80.4 KB  |
| `@yoyaflow/yoya-ui/ui`               | 全部组件 + layout + theme（不含 router / SSR）                                      | 72.9 KB  |
| `@yoyaflow/yoya-ui/router`           | router + SSR 原语（renderToString / renderPage / hydrate / hydrateOrMount / mount） | 9.0 KB   |
| `@yoyaflow/yoya-ui/svg`              | SVG 工厂 + 图标集（转发到 core 主入口，同一份实现）                                 | 0.1 KB   |
| `@yoyaflow/yoya-ui/tools`            | a11y / i18n / theme / 组件作者契约（转发到 core，peer 提供）                        | 0.1 KB   |
| `@yoyaflow/yoya-ui/dev`              | devtools（转发到 core，peer 提供）                                                  | 0.1 KB   |
| `@yoyaflow/yoya-ui/actions`          | button / buttons / float-button / 菜单                                              | 9.5 KB   |
| `@yoyaflow/yoya-ui/navigation`       | menu / sidebar / anchor / breadcrumb / steps / tabs                                 | 12.8 KB  |
| `@yoyaflow/yoya-ui/feedback`         | dialog / tooltip / toast / vConfirm                                                 | 12.6 KB  |
| `@yoyaflow/yoya-ui/form`             | input / select / radio / upload / 控件族                                            | 22.9 KB  |
| `@yoyaflow/yoya-ui/data-display`     | table / tree / badge / progress / carousel / 看板族                                 | 28.9 KB  |
| `@yoyaflow/yoya-ui/async`            | vDynamicLoader / lazy-image                                                         | 4.2 KB   |
| `@yoyaflow/yoya-ui/echart`           | vEchart（ECharts 封装，自备 echarts）                                               | 3.3 KB   |
| `@yoyaflow/yoya-ui/three`            | vThree（Three.js 封装，自备 three）                                                 | 3.8 KB   |
| `@yoyaflow/yoya-ui/compiler-runtime` | 编译路径的运行期钩子（主入口不含）                                                  | 0.1 KB   |

<!-- bundle-sizes:end -->

组件皮肤：`yoya.ui.css` 126.1 KB raw / 22.1 KB gzip（core 层无皮肤）。

> `yoya.ui.full.min.js` 这类 `.full` 是**自包含单文件**（core 内联），也就是上面 30 秒上手用的
> CDN 路径；它**不能与 `@yoyaflow/yoya-core` 包混用**——第二份 core 会让 `instanceof` / 身份判定
> 失配（禁忌见 [docs/ssr.zh-CN.md](docs/ssr.zh-CN.md)）。增量入口（`yoya.ui.js`、`yoya.actions.js` …）
> 是单行转发、core 走 peerDependency，因此**直接从 CDN 地址 import 它们需要 import map**。

## 文档与版本策略

- [文档索引](docs/index.zh-CN.md) · [为什么是 yoya-ui](docs/why-yoya-ui.zh-CN.md) · [特性亮点](docs/highlights.zh-CN.md)
- [安装与导入](docs/install.zh-CN.md)（三种接入方式、各包导出物、CDN 与 import map）
- [AI 代码助手阅读指南](docs/agents.zh-CN.md) · [Codex Skill](skills/yoya-ui/README.md)
- [SSR 指南](docs/ssr.zh-CN.md) · [请求辅助](docs/api.zh-CN.md) · [主题规范](docs/theme.zh-CN.md) · [权限控制](docs/access-control.zh-CN.md) · [DevTools](docs/devtools.zh-CN.md)
- [浏览器基线与降级口径](docs/browser-support.zh-CN.md)
- [组件开发指南](docs/component-authoring.zh-CN.md) · [第三方库接入](docs/interop.zh-CN.md) · [跨库对照](docs/component-comparison.zh-CN.md)
- [性能基准](docs/performance.zh-CN.md)（官方 js-framework-benchmark，数字由脚本生成并受门禁校验）
- [路线图](ROADMAP.zh-CN.md)

迁移指南只服务于**主版本**，所以刻意没有 0.4 → 0.5 的迁移文档：1.0 之前 API 仍在收敛，提交历史与
路线图就是记录。稳定性来自平台而不是发布节奏，因此 **1.0 之后不再有新的主版本**——版本号是
`1.<年份>.<修复序号>`（如 `1.2026.0`、`1.2026.1`），核心 API 冻结。

## 开发

```bash
npm install
npm test              # Vitest 全量测试
npm run lint          # ESLint
npm run typecheck     # 类型声明 + 消费方类型测试
npm run build         # 构建入口 + 体积报表
npm run verify:dist   # 分类隔离、SSR 冒烟、体积预算、README 体积表
npm run examples:html # 示例站（http://localhost:5173）
```

```text
packages/
  yoya-core/      慢线：core（节点/信号/SSR/i18n/theme/access/context/a11y）+ html + svg + 组件作者契约
  yoya-ui/        快线：layout / actions / navigation / feedback / form / data-display / async /
                  i18n / theme / router / chart / three + 皮肤（yoya.ui.css）+ 类型
  yoya-compiler/  构建期编译器（形状驱动、不认识组件；bin: yoya-compiler）
  contract/       跨包契约测试 + 全仓门禁（不进包）
  create-yoya-ui/ 脚手架（模板依赖钉当前版本）
examples/         示例站（SSR 演示与可复制指南）
scripts/          构建、体积报表、包边界 / 产物门禁
docs/             公开指南（SSR、主题、权限、DevTools、组件开发、第三方接入）
benchmark/        基准与体积数据源
skills/           Codex 技能（与仓库文档同步）
```

## 许可证

MIT
