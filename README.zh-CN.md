# yoya-ui

**渐进式的浏览器原生 UI 库：没有虚拟 DOM，也不需要构建步骤，用普通 JavaScript 写声明式界面。**

**简体中文** | [English](./README.md)

[![Release](https://img.shields.io/npm/v/@yoyaflow/yoya-ui?label=release&style=flat-square)](https://www.npmjs.com/package/@yoyaflow/yoya-ui)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/yoyaflow/yoya-ui/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/yoyaflow/yoya-ui/actions)
[![Types](https://img.shields.io/badge/types-TypeScript-blue?style=flat-square)](https://github.com/yoyaflow/yoya-ui/tree/main/types)

## 它是什么

yoya-ui 直接在真实 DOM 上工作：视图就是普通 JavaScript 函数，视图树里的每个节点都对应一个真实
DOM 元素，写下状态就更新绑定的位置。没有虚拟 DOM，没有 JSX 或模板编译，也不要求构建步骤。

组件库、路由、i18n、主题、权限和状态管理都随库提供，但没有一样接管你的构建链：可以只引入一个
入口，也可以全部用上；任何一个部分都能退回原生 DOM 写法。为什么这样设计，见
[为什么是 yoya-ui](docs/why-yoya-ui.zh-CN.md)。

## 给谁用

- **不想被构建工具绑住的团队** —— 随库发布的 ESM 文件在普通页面里直接能跑，已有的打包器配置也照常可用。
- **需要长期维护的项目** —— API 建立在 Web 标准之上，不用跟着框架的大版本重写。
- **老系统与已有页面** —— 在现有的 PHP / JSP / Vue / React 页面里逐块加入声明式交互，不需要迁移。
- **用 AI 生成代码的团队** —— 生成的代码和浏览器之间没有框架上下文，也没有构建魔法，存下来就能跑。

**不适合谁：**已经深度绑定某个框架生态（React / Vue / Angular），并且想要该生态的组件市场、
约定和工具链的团队。yoya-ui 不去包装这些库，只把真实 DOM 元素交给它们。

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
      href="https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@0.7.4/dist/yoya.ui.css"
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
      } from 'https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@0.7.4/dist/yoya.ui.full.min.js';

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

示例里同时用到原生元素（`p`）、官方组件（`vCard` / `vButton`）和状态句柄（`ref`）；URL 中的版本号
是写这份文档时的最新版本。

**中国网络访问慢？** 下面三家路径完全一致：把 `<version>` 换成已发布版本，只换域名、其余不变。

| CDN       | 前缀                                                              | 说明                      |
| --------- | ----------------------------------------------------------------- | ------------------------- |
| jsdmirror | `https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@<version>/dist/` | 中国（jsDelivr 中国镜像） |
| Zstatic   | `https://s4.zstatic.net/npm/@yoyaflow/yoya-ui@<version>/dist/`    | 中国                      |
| jsDelivr  | `https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@<version>/dist/`  | 全球                      |

前缀 + 文件名就是完整地址：`yoya.ui.full.min.js`、`yoya.ui.css`、`yoya.core.js` …

## 渐进式接入的四个层次

1. **一个 script 标签。** 就是上面的快速开始：CDN、真实页面、零工具链。
2. **渐进式增强。** `bindTo()` 把一块交互挂进已有页面 —— 静态 HTML、PHP / JSP 页面、Vue / React
   应用都行。加一块，其余部分原样不动。
3. **npm 与模块化。** `npm install @yoyaflow/yoya-ui`（会自动带上 `@yoyaflow/yoya-core`）；
   只要引擎原语就 `npm install @yoyaflow/yoya-core`。再按需要引入各个入口：

   ```js
   import { div, svg, vNode } from '@yoyaflow/yoya-core'; // 引擎、HTML/SVG、信号
   import { createI18n, initYoyaTheme } from '@yoyaflow/yoya-core/tools'; // i18n / 主题 / a11y / 组件写作规范
   import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // 官方组件
   import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts 扩展（自备 echarts）
   import { vThree } from '@yoyaflow/yoya-ui/three'; // Three.js 扩展（自备 three）
   import { renderPage, hydrateOrMount } from '@yoyaflow/yoya-ui/router'; // 路由 + SSR
   import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-core/api'; // 请求辅助
   import '@yoyaflow/yoya-ui/ui.css'; // 组件皮肤与主题变量
   ```

   > 需要构建期编译时再装：`npm i -D @yoyaflow/yoya-compiler @babel/parser unplugin magic-string`，
   > 说明见
   > [编译器文档](docs/compiler.zh-CN.md)。

4. **完整应用：SPA 或 SSR。** 单页应用不需要额外一层：内置路由（`history` / `hash` 模式、参数、
   守卫、404、`vLink`、`vRouterViews`）配合组件分类和 `ref` 状态就够了，同样不要求构建步骤；
   需要服务端渲染时，复用同一份页面工厂：

   ```bash
   npm install -g create-yoya-ui
   create-yoya-ui my-app --template admin   # SPA 外壳（admin / basic）或 SSR（ssr）
   ```

   服务端用 `renderPage()` 渲染这份工厂，浏览器端用 `hydrateOrMount()` 接管——一套代码，没有第二套
   渲染模型。详见 [docs/ssr.zh-CN.md](docs/ssr.zh-CN.md)。

## 能力一览

| 领域             | 内容                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| 声明式 HTML/SVG  | 全部 WHATWG 元素工厂、父节点快捷方法、`svgs` 命名空间、内置图标集                            |
| 组件             | 布局、操作、导航、反馈、表单、数据展示、异步、特效、看板，全部附带 TypeScript 类型声明       |
| 路由             | history / hash 模式、参数、守卫、404、`vLink`、`vRouterViews`                                |
| i18n             | `'文案'.s('key')` 快捷写法、响应式切换语言、SSR 每请求隔离                                   |
| 状态             | 在值的位置直接接 `ref` / `computed` 句柄、可重建区域、`keyed()` 列表、`mountable()` 条件挂载 |
| 主题             | 设计 token、明暗模式、`@layer` CSS 架构                                                      |
| 权限             | 声明资源码，隐藏 / 只读 / 禁用自动派生                                                       |
| 容错与性能       | `whenFailed()` 子树错误边界；`vScroll` 长列表自动虚拟化                                      |
| 扩展             | `vEchart` / `vThree` 子入口；任何能挂进 DOM 的库都能按同一套生命周期接入                     |
| DevTools（Beta） | 独立 `devtools` 入口：信号写入、区域重建、hydration 不一致                                   |
| 编译路径（Beta） | 可选的构建期编译器：把结构固定的列表行、表格行编译成静态片段，详见编译器文档                 |

状态只需要 `ref` 和 `computed`，没有深层代理，也没有代理 store。各项能力的细节见
[docs/highlights.zh-CN.md](docs/highlights.zh-CN.md)。

### 编译路径（Beta，可选）

同一段结构被反复创建时（长列表的行、树节点、表格单元格），可以在构建期把行工厂编译成
「静态片段 + 只写活值」的模块，省下每行的节点对象和绑定登记。编译器不参与运行期，不装、不跑也
不影响任何写法。

```bash
npm i -D @yoyaflow/yoya-compiler @babel/parser unplugin magic-string
```

命令行用法、构建插件接法、能编的形状与回退规则、运行期钩子：见
[docs/compiler.zh-CN.md](docs/compiler.zh-CN.md)。

## 一切是真实 DOM，第三方库直接接

视图树就是 DOM 树。任何"往元素里挂东西"的库——图表、编辑器、表格、地图——都能按同一套生命周期
接进来（`vNode` 闭包：`whenMount(host)` 初始化，配置更新时转发，`whenDestroy` 释放），然后像官方
组件一样用 `child()` 组合。`vEchart` 就是官方适配器：

- 适配只有一层薄组件：`vEchart` 只桥接生命周期，不携带 echarts 代码；
- 库实例由你交出（`chart.echartsLib(echarts)`），option 原样转发、不做响应式包装，依赖也不重新打包；
- `registerChildFactories` 让你的组件成为父节点快捷方法（`page.vEchart(…)`）；
- 只在浏览器跑的组件用 `vClientOnly()` 包住，SSR 只输出占位。

在线演示：`npm run examples:html`（组件目录，以及 Quill、AG Grid Community、Leaflet、CodeMirror 6、
Toast UI Viewer 与 `vThree` 演示）。扩展写法与跨库对照见
[docs/interop.zh-CN.md](docs/interop.zh-CN.md)。

## 可以直接验证的工程质量

Star 数只说明关注度，下面的这些都能在仓库里直接查到：

| 项目       | 当前值                                                                 | 怎么验证                                                                                         |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 运行时依赖 | **0**                                                                  | `package.json` 没有 `dependencies` 字段                                                          |
| 测试       | 1000+ 用例（DOM、状态、路由、i18n、权限、SSR/hydrate）                 | `npm test`                                                                                       |
| 类型声明   | 根入口 / core / api / ui / router / 扩展入口，含使用方类型测试         | `npm run typecheck`                                                                              |
| SSR 确定性 | 渲染 / hydrate / mount 均有覆盖，服务端不依赖 DOM                      | `packages/yoya-ui/src/testing/integration/*.ssr.test.js`、[docs/ssr.zh-CN.md](docs/ssr.zh-CN.md) |
| 产物校验   | 入口与产物一致、无双份 core、`.full` 自包含、体积表与产物一致          | `npm run build && npm run verify:dist`                                                           |
| 包边界     | core 不依赖组件包；yoya-ui 只通过 peer 依赖 core；编译器不按组件名分支 | `npm run verify:packages`                                                                        |
| 浏览器基线 | Chrome/Edge ≥ 123 · Firefox ≥ 120 · Safari/iOS ≥ 17.5，带降级兜底      | `browserslist`、[docs/browser-support.zh-CN.md](docs/browser-support.zh-CN.md)                   |
| 组件规范   | 组件写法、值位置、生命周期都有书面规范                                 | [docs/component-authoring.zh-CN.md](docs/component-authoring.zh-CN.md)                           |

这是个早期项目：关注的人还不多，也没有历史包袱，需求优先级仍然可以被影响。评估时建议直接看
仓库本身：测试、规范文档，以及与 Web 标准对齐的 API。我们接受的取舍写在
[docs/why-yoya-ui.zh-CN.md](docs/why-yoya-ui.zh-CN.md)。

## 与其他框架的基准对比

下面是九项标准操作的耗时和内存，用官方
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) 的 runner 在**本地测试
环境**测出，不是官方站点的成绩：

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
npm run build        # 构建 packages/*/dist、示例产物与体积表
npm run verify:dist  # 校验入口与产物一致、无双份 core、`.full` 自包含、README 体积表
```

仓库是 **五个包的 monorepo**（`packages/*`）：`yoya-core` 是引擎与基础能力（节点、信号、SSR
原语、HTML/SVG 工厂、i18n、主题、权限、组件写作规范）；`yoya-ui` 是组件与页面能力（组件、layout、
router、主题、扩展）；`yoya-compiler` 是可选用的构建期编译器；`contract` 是跨包测试；
`create-yoya-ui` 是脚手架。发布出去的包有两层产物：

- **常用入口**：`dist/yoya.ui.js`、`dist/yoya.ui-router.full.js` 及其 `.min` 版本。增量入口只做一行
  转发、core 通过 peer dependency 共享；`yoya.core.js`、`yoya.api.js` 和三个 `.full` 文件是
  **自包含**的（core 内联进单文件）。
- **模块目录**：`dist/core/**`、`dist/actions/**` 等（preserveModules），供库内部的 `/internal/*`
  深层导入使用。

非 `.full` 的入口共享同一份 core（出现第二份会让 `instanceof` 这类身份判断失效）；`.full` 是
自包含单文件，**不要和 `@yoyaflow/yoya-core` 包混用**，原因见
[docs/ssr.zh-CN.md](docs/ssr.zh-CN.md)。

从 0.7.2 起，入口按用途拆分：主入口是渲染原语和整个元素表（节点、HTML 与 **SVG 工厂 + 图标集**、
信号、`keyed`、`vText`、`slot`）；`/tools` 是 a11y、i18n、主题与组件写作规范，`/dev` 是 DevTools，
`/svg` 是元素表的显式别名，`/ssr` 是服务端完整入口（core + html + layout + router/SSR）。`dist/**`
下的模块可以通过 `./internal/*` 导入；旧路径 `@yoyaflow/yoya-core/devtools` 与
`@yoyaflow/yoya-ui/devtools` 仍然可用。

下表列出各入口的 min+gzip 体积（按产物的 import 关系重新打包并压缩后的传递闭包）。core 那一行是
自包含的；yoya-ui 各行只算在 core 之上新增的部分，所以实际下载量 = core + 该行。

<!-- bundle-sizes:start -->

| 入口                                 | 内容                                                                                | min+gzip |
| ------------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| `@yoyaflow/yoya-core`                | 节点 / 信号 / HTML·SVG 原语 + i18n·access·context·a11y·theme 原语（自包含）         | 26.5 KB  |
| `@yoyaflow/yoya-core/api`            | 请求辅助：RequestBase / Result / configureRequest                                   | 0.6 KB   |
| `@yoyaflow/yoya-core/tools`          | a11y / i18n / theme / 组件写作规范（core 自包含）                                   | 22.8 KB  |
| `@yoyaflow/yoya-ui`                  | 全部组件 + layout + router / SSR（core 由 peer 提供）                               | 80.4 KB  |
| `@yoyaflow/yoya-ui/ui`               | 全部组件 + layout + theme（不含 router / SSR）                                      | 72.9 KB  |
| `@yoyaflow/yoya-ui/router`           | router + SSR 原语（renderToString / renderPage / hydrate / hydrateOrMount / mount） | 9.0 KB   |
| `@yoyaflow/yoya-ui/ssr`              | 服务端完整入口：core 原语 + html + layout + router / SSR（core 由 peer 提供）       | 15.2 KB  |
| `@yoyaflow/yoya-ui/svg`              | SVG 工厂 + 图标集（转发到 core 主入口，同一份实现）                                 | 0.1 KB   |
| `@yoyaflow/yoya-ui/tools`            | a11y / i18n / theme / 组件写作规范（转发到 core，peer 提供）                        | 0.1 KB   |
| `@yoyaflow/yoya-ui/dev`              | devtools（转发到 core，peer 提供）                                                  | 0.1 KB   |
| `@yoyaflow/yoya-ui/actions`          | button / buttons / float-button / 菜单                                              | 9.5 KB   |
| `@yoyaflow/yoya-ui/navigation`       | menu / sidebar / anchor / breadcrumb / steps / tabs                                 | 12.8 KB  |
| `@yoyaflow/yoya-ui/feedback`         | dialog / tooltip / toast / vConfirm                                                 | 12.6 KB  |
| `@yoyaflow/yoya-ui/form`             | input / select / radio / upload / 控件族                                            | 22.9 KB  |
| `@yoyaflow/yoya-ui/data-display`     | table / tree / badge / progress / carousel / 看板族                                 | 28.9 KB  |
| `@yoyaflow/yoya-ui/async`            | vDynamicLoader / lazy-image                                                         | 4.2 KB   |
| `@yoyaflow/yoya-ui/echart`           | vEchart（ECharts 适配器，自备 echarts）                                             | 3.3 KB   |
| `@yoyaflow/yoya-ui/three`            | vThree（Three.js 适配器，自备 three）                                               | 3.8 KB   |
| `@yoyaflow/yoya-ui/compiler-runtime` | 编译路径的运行期钩子（主入口不含）                                                  | 0.1 KB   |

<!-- bundle-sizes:end -->

组件皮肤：`yoya.ui.css` 126.1 KB raw / 22.1 KB gzip（core 层无皮肤）。

> `yoya.ui.full.min.js` 这类 `.full` 是**自包含单文件**（core 内联），也就是上面 30 秒上手用的 CDN
> 路径；它**不能和 `@yoyaflow/yoya-core` 包混用**——第二份 core 会让 `instanceof` 这类身份判断
> 失效（注意事项见 [docs/ssr.zh-CN.md](docs/ssr.zh-CN.md)）。增量入口（`yoya.ui.js`、
> `yoya.actions.js` …）只做一行转发、core 走 peer dependency，因此**直接从 CDN 地址 import 它们
> 需要 import map**。

## 文档与版本策略

- [文档索引](docs/index.zh-CN.md) · [为什么是 yoya-ui](docs/why-yoya-ui.zh-CN.md) · [特性亮点](docs/highlights.zh-CN.md)
- [安装与导入](docs/install.zh-CN.md)（三种接入方式、各包导出物、CDN 与 import map）
- [AI 代码助手阅读指南](docs/agents.zh-CN.md) · [Codex Skill](skills/yoya-ui/README.md)
- [SSR 指南](docs/ssr.zh-CN.md) · [请求辅助](docs/api.zh-CN.md) · [主题规范](docs/theme.zh-CN.md) · [权限控制](docs/access-control.zh-CN.md) · [DevTools](docs/devtools.zh-CN.md)
- [浏览器基线与降级说明](docs/browser-support.zh-CN.md)
- [组件开发指南](docs/component-authoring.zh-CN.md) · [第三方库接入](docs/interop.zh-CN.md) · [跨库对照](docs/component-comparison.zh-CN.md)
- [性能基准](docs/performance.zh-CN.md)（官方 js-framework-benchmark，数字由脚本生成，构建时会校验）
- [路线图](ROADMAP.zh-CN.md)

迁移文档只针对**主版本**，所以没有 0.4 → 0.5 的迁移指南：1.0 之前 API 还在收敛，提交历史和路线图
就是记录。API 建在 Web 标准之上，稳定性来自平台本身，因此 **1.0 之后不再有新的主版本**——版本号
形如 `1.<年份>.<修复序号>`（如 `1.2026.0`、`1.2026.1`），核心 API 冻结。

## 开发

```bash
npm install
npm test              # Vitest 全量测试
npm run lint          # ESLint
npm run typecheck     # 类型声明 + 使用方类型测试
npm run build         # 构建包产物、示例产物与体积表
npm run verify:dist   # 产物校验：入口一致、SSR 冒烟、体积预算、README 体积表
npm run examples:html # 示例站（http://localhost:5173）
```

```text
packages/
  yoya-core/      引擎与基础能力：节点、信号、SSR、i18n、主题、权限、HTML/SVG 工厂、组件写作规范
  yoya-ui/        组件与页面能力：layout / actions / navigation / feedback / form / data-display /
                  async / i18n / theme / router / chart / three + 皮肤（yoya.ui.css）+ 类型
  yoya-compiler/  构建期编译器（可选工具；bin: yoya-compiler）
  contract/       跨包测试与仓库级检查（不发布）
  create-yoya-ui/ 脚手架（模板依赖钉当前版本）
examples/         示例站（SSR 演示与可复制指南）
scripts/          构建、体积报表、包边界与产物校验
docs/             公开文档（SSR、主题、权限、DevTools、组件开发、第三方接入等）
benchmark/        基准与体积数据源
skills/           Codex 技能（与文档同步）
```

## 许可证

MIT
