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
      href="https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@0.6.0/dist/yoya.ui.css"
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
      } from 'https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@0.6.0/dist/yoya.ui.full.min.js';

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
3. **npm 与模块化。** `npm install @yoyaflow/yoya-ui`，再按入口按需引入：

   ```js
   import { div, svg, createI18n } from '@yoyaflow/yoya-ui/core'; // 引擎、HTML/SVG、信号
   import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // 官方组件
   import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts 扩展（自备 echarts）
   import { vThree } from '@yoyaflow/yoya-ui/three'; // Three.js 扩展（自备 three）
   import { renderPage, hydrateOrMount } from '@yoyaflow/yoya-ui/router'; // 路由 + SSR
   import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-ui/api'; // 通讯辅助
   import '@yoyaflow/yoya-ui/ui.css'; // 组件皮肤与主题变量
   ```

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

状态只需要 `ref` 与 `computed`：没有深层代理，也没有代理 store。各能力细节见
[docs/highlights.zh-CN.md](docs/highlights.zh-CN.md)。

## 一切是真实 DOM，第三方库直接接

视图树就是 DOM 树。任何"往元素里挂"的库——图表、编辑器、表格、地图——只需要一个生命周期明确的
薄节点类（`renderDom` → 初始化，配置更新 → 转发，`destroy` → 释放），之后就能像官方组件一样用
`child()` 组合。`vEchart` 是参考实现：

- 库实例一次交出（`chart.echartsLib(echarts)`）；
- 没有 wrapper、没有适配层、不重新打包依赖；
- `registerChildFactories` 让你的组件成为父节点快捷方法（`page.vEchart(…)`）；
- 只在浏览器跑的组件用 `vClientOnly()` 包住，SSR 只输出占位。

在线演示：`npm run examples:html`（组件目录，以及 Quill、AG Grid Community、Leaflet、CodeMirror 6、
Toast UI Viewer 与 `vThree` 工厂沙盘）。扩展写法与跨库对照见
[docs/interop.zh-CN.md](docs/interop.zh-CN.md)。

## 可复核的工程信号

Star 数说明关注度，不说明正确性，所以下面这些都可以直接查：

| 信号       | 当前值                                                       | 怎么验证                                                               |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 运行时依赖 | **0**                                                        | `package.json` 无 `dependencies` 字段                                  |
| 测试       | 1000+ 用例（DOM、状态、路由、i18n、权限、SSR/hydrate）       | `npm test`                                                             |
| 类型声明   | root / core / api / ui / router / 扩展入口，含消费方类型测试 | `npm run typecheck`                                                    |
| SSR 确定性 | render / hydrate / mount 均有覆盖，设计上不碰 DOM            | `src/*.ssr.test.js`、[docs/ssr.zh-CN.md](docs/ssr.zh-CN.md)            |
| 产物校验   | 分类隔离、SSR 单 core 冒烟、体积预算、README 体积表          | `npm run build && npm run verify:dist`                                 |
| 契约文档   | 组件形态、值位置、生命周期已写成规范                         | [docs/component-authoring.zh-CN.md](docs/component-authoring.zh-CN.md) |

这是一个早期项目：Star 少、没有历史生态包袱，优先级仍然可以影响。评估它时请看仓库本身——测试、
规范文档、与 Web 标准对齐的 API。更完整的说明（包括我们接受的取舍）见
[docs/why-yoya-ui.zh-CN.md](docs/why-yoya-ui.zh-CN.md)。

## 构建产物与体积

```bash
npm run build   # 产出 dist/，末尾打印体积表
```

无后缀与 `.min` 是增量 ESM 入口（不含 core，运行时会自动加载共享块）；`.full` 是自包含文件
（core 已内联），适合 CDN 与免构建单文件直用。

增量入口给两个数：**入口文件本身**与**实际下载量**（入口 + 它引用的公共 chunk）。只看入口文件会
以为 core 只有几 KB——按实际下载量估算首屏。最后一列说明每个入口到底包含什么。

| 入口                               | min+gzip（入口文件 ~ 实际下载量） | 包含内容                                                                                                                                              |
| ---------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yoya.core.js`                     | 2.3 KB ~ **23.1 KB**              | 核心节点定义、HTML 原语、SVG 原语、内置 SVG 图标集、Signals 定义与引擎、**i18n 处理器**、权限 access、context、a11y、theme helper、ClientOnly         |
| `yoya.api.js`                      | 0.6 KB ~ **0.6 KB**               | 通讯辅助约束：`RequestBase` / `Result` / `configureRequest`（可选，独立于渲染核心）                                                                   |
| `yoya.ui.js`（全部分类）           | 5.6 KB ~ **95.0 KB**              | 全部组件：layout / actions / navigation / feedback / form / data-display / async / effects + 语言切换组件 + theme                                     |
| `yoya.router.js`                   | 10.3 KB ~ **26.1 KB**             | router（`createRouter` / `vRouter` / `vLink` / `vRouterViews`）+ SSR 原语（`renderToString` / `renderPage` / `hydrate` / `mount` / `serializeState`） |
| `yoya.devtools.js`（开发期）       | 0.1 KB ~ 1.6 KB                   | `enableDevtools` / `subscribeDevtools` / `getDevtoolsSnapshot` / `getDevtoolsDom` / `getDevtoolsScope`                                                |
| `yoya.echart.js` / `yoya.three.js` | 1.5 / 2.0 KB ~ 15.3 / 15.7 KB     | `vEchart` / `vThree` 封装                                                                                                                             |

自包含入口（core 已内联，单文件直用）：

| 产物                             | raw      | min      | min+gzip | 包含内容                       |
| -------------------------------- | -------- | -------- | -------- | ------------------------------ |
| `yoya.router.full.js`            | 235.4 KB | 114.6 KB | 33.1 KB  | core + router / SSR            |
| `yoya.ui-router.full.js`（全量） | 769.3 KB | 447.1 KB | 108.1 KB | core + 全部组件 + router / SSR |
| `yoya.ui.full.js`                | 700.8 KB | 415.2 KB | 98.6 KB  | core + 全部组件                |

组件皮肤 `yoya.ui.css`：60.3 KB raw / **8.7 KB gzip**；core 层没有皮肤（与原生 HTML 一致），
只用 core 不需要引它。

`npm run build` 会打印同一张表外加每个公共 chunk；`npm run verify:dist` 在表格与产物不一致时失败，
`npm run report:bundle:write` 按当前产物刷新中英两张表。

## 文档与版本策略

- [文档索引](docs/index.zh-CN.md) · [为什么是 yoya-ui](docs/why-yoya-ui.zh-CN.md) · [特性亮点](docs/highlights.zh-CN.md)
- [AI 代码助手阅读指南](docs/agents.zh-CN.md) · [Codex Skill](skills/yoya-ui/README.md)
- [SSR 指南](docs/ssr.zh-CN.md) · [请求辅助](docs/api.zh-CN.md) · [主题规范](docs/theme.zh-CN.md) · [权限控制](docs/access-control.zh-CN.md) · [DevTools](docs/devtools.zh-CN.md)
- [组件开发指南](docs/component-authoring.zh-CN.md) · [第三方库接入](docs/interop.zh-CN.md) · [跨库对照](docs/component-comparison.zh-CN.md)
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
src/
  core/        ViewNode/ElementNode 核心、signals、i18n、theme、id 分配、SSR 辅助
  html/ svg/   HTML/SVG 元素工厂
  layout/      布局工厂
  actions/ navigation/ feedback/ form/ data-display/ async/ chart/ effects/
               官方组件分类
  components/  组件聚合与共享逻辑
  examples/    示例站（SSR 演示与可复制指南）
  index.js     开发期聚合入口
scripts/       入口构建、体积报表
types/         随包发布的全部入口 TypeScript 声明
docs/          公开指南（SSR、主题、权限、DevTools、组件开发、第三方接入）
```

## 许可证

MIT
