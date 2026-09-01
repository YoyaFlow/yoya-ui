# yoya-ui

> [English](./README.md) | **简体中文**

> Browser-native UI library with declarative HTML authoring — no virtual DOM, no JSX/SFC, no build step required.
> 轻量原生 JS UI 基础库：小核心 + 开放标准 + 官方组件库，覆盖管理台、看板、工具与内容页等通用 Web 界面。

yoya-ui 是一套新的业务界面构建形式，也是一个 Web 基础库：直接在真实 DOM 上构建视图，声明式 HTML 写法、路由、i18n、主题与状态系统开箱即用，支持服务端渲染（SSR）与纯客户端渲染同代码切换。自带 UI 组件只是为了开箱即用，组件清单并不代表库的能力边界——原生元素与第三方组件以同样方式自由组合。

## Hello World——声明式构建与响应式 i18n

没有框架运行时、没有虚拟 DOM、没有 JSX 构建链：视图就是由原生 JS 描述的真实 DOM，i18n 只是字符串快捷方式。

```js
// HelloWorldExample —— 声明式构建
function HelloWorldExample() {
  return div((root) => {
    root.p('Hello，World！');
  });
}
```

```js
// HelloWorldExampleI18n —— 响应式 i18n 文本（带参数）
function HelloWorldExampleI18n() {
  return div((root) => {
    root.p('Hello, {name}!'.s('greeting.hello', { name: 'yoya-ui' }));
  });
}
```

## 特性

- **低门槛声明式构建**：采用声明式结构化 JS 元素构建方案，视图与操作逻辑同源，消除 HTML 标签化语言与复杂操作逻辑不兼容的问题；只学 HTML 与原生 JS 即可使用，无框架专属概念
- **通用 UI 基础**：面向所有 Web 开发者的通用 UI 库，同一套声明式代码可构建管理台、看板、工具类与内容类页面；相比 React/Vue，后端与全栈开发者也能更低门槛地上手
- **交付方式灵活**：可嵌入服务端模板、随后端服务同包发布（适合微服务原子化部署），也可作为独立 SPA 运行，同一套代码无需改动
- **构建可选、工程化可用**：构建产物可直接在普通页面中运行，无需 Vite 等打包工具；也支持 npm 安装后在 Vite/webpack 等工程化项目中使用
- **AI 友好**：声明式结构让 AI 生成的组件代码可直接运行，无论是否使用构建工具
- **开箱即用的组件库**：表单、导航、反馈、数据展示、布局、图表等高频场景开箱即用——这是基础库之上的便利，不代表库的能力边界
- **内置路由 / i18n / 主题 / 状态管理**：单页应用所需能力自带，无需额外选型
- **服务端渲染**：一套代码双模式可切换，整站服务端渲染与局部组件客户端加载加强均可用
- **小核心、零依赖、易扩展**：遵循标准组件形态，第三方组件可与内置组件无缝组合，按模块引入适配任意工程
- **长期维护友好**：核心库保持稳定，长期项目无需担心版本过时或升级重写
- **远离前端疲劳**：适合厌倦层出不穷的新概念、新框架与破坏性版本更新的开发者，语法回归原生 HTML 和 JS，核心保持稳定

## 安装

```bash
npm install @yoyaflow/yoya-ui
```

## 快速开始

```js
import { div, vButton, toast } from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

div((page) => {
  page.vButton('启动任务', (button) => {
    button.variant('primary');
    button.on('click', () => toast.success('任务已启动'));
  });
}).bindTo('#app');
```

页面只需要一个 `<div id="app"></div>`，用模块脚本加载即可。

## 服务端渲染（SSR）

同一份页面工厂代码，服务端渲染与客户端渲染可切换：

```js
// 服务端
import { renderToString } from '@yoyaflow/yoya-ui/ssr';
const { html, state } = renderToString(createPage, { state: { path: '/home' } });

// 客户端
import { hydrate, mount, parseState } from '@yoyaflow/yoya-ui/ssr';
const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');
if (app.firstElementChild) {
  hydrate(createPage, app, data); // 有服务端 HTML：收养 DOM、绑定事件
} else {
  mount(createPage, app, data); // 空壳：全量客户端渲染
}
```

要点：

- `vClientOnly(loader)`：非 SSR 模块（如 ECharts）服务端只出占位，hydration 后客户端加载
- `Router.renderPath(path)`：服务端按请求路径渲染匹配路由（参数 / 守卫 / 404）
- 每请求 i18n 实例、渲染上下文 id 分配器、渲染后自动销毁——服务端保持无状态
- `maxNodes` 超限自动回退客户端渲染

完整集成指南见 [docs/ssr.md](docs/ssr.md)；可运行示例：

```bash
npm run build
node src/examples/ssr/server-http.mjs
```

## 按需引入

```js
import { div, svg, createI18n } from '@yoyaflow/yoya-ui/core'; // 核心 HTML/SVG/状态
import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // 官方组件库
import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts 组件（需自行引入 echarts）
import { renderToString, hydrate } from '@yoyaflow/yoya-ui/ssr'; // 服务端渲染
import '@yoyaflow/yoya-ui/ui.css'; // 默认样式与主题变量
```

## TypeScript 支持

源码保持纯 JavaScript（无需构建也可直接运行，同样兼容工程化构建），通过随包发布的类型声明提供完整的 TypeScript 体验。`types/` 目录覆盖四个入口（根入口 / `core` / `echart` / `ssr`），并包含节点类、工厂函数签名、组件状态 API 与父节点快捷方法（如 `page.vButton(...)`）的类型。

TypeScript 项目无需额外配置即可获得提示与类型检查：

```ts
import { div, vButton, vCard, vTable, toast } from '@yoyaflow/yoya-ui';
import { createI18n } from '@yoyaflow/yoya-ui/core';
import { renderToString } from '@yoyaflow/yoya-ui/ssr';
import '@yoyaflow/yoya-ui/ui.css';

div((page) => {
  page.className('app');
  page.vButton('启动任务', (button) => {
    button.variant('primary');
    button.on('click', () => toast.success('任务已启动'));
  });
  page.vCard((card) => {
    card.vCardBody((body) => {
      body.vTable((table) => {
        table.columns([{ key: 'name', title: '名称', dataIndex: 'name' }]);
        table.rows([{ name: 'api-gateway' }]);
      });
    });
  });
});
```

库内维护类型声明质量：

```bash
npm run typecheck    # 校验声明文件与 consumer 类型测试
npm run test:types   # 同 typecheck
```

## 核心能力

| 分类        | 内容                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| HTML 元素   | WHATWG 全量元素工厂，`HtmlElementNode` 嵌套快捷方法                                                                       |
| SVG         | `svg()` 命名空间入口与内置图标（`SearchOutlined` 等）                                                                     |
| 布局        | `flex` / `grid` / `stack` / `container` / `vRow` / `vCol` / `vContainer` / `mobileLayout` / `themeShell`                  |
| 动作        | `vButton` / `vButtons` / `vFloatButton` / `vDropdownMenu` / `vContextMenu`                                                |
| 导航        | `vMenu` / `vBreadcrumb` / `vSteps` / `vTabs` / `vAnchor` / `vNavbar` / Router / `vLink`                                   |
| 反馈        | `vDialog` / `vTooltip` / `vMessage` / `vMessageManager` / `toast`                                                         |
| 表单        | `vForm` / `vInput` / `vSelect` / `vCheckbox` / `vRadio` / `vSwitch` / `vRate` / `vTimer` / `vUpload`                      |
| 数据展示    | `vCard` / `vTable` / `vTree` / `vPagination` / `vProgress` / `vScroll` / `vCarousel` / `vTimeline` / `vDetail` / 看板系列 |
| 图表        | `vEchart`（基于 ECharts，按需引入）                                                                                       |
| 异步        | `vDynamicLoader`                                                                                                          |
| 状态        | `vStateNode` / `@preact/signals-core` 扩展                                                                                |
| i18n / 主题 | `createI18n` / `withI18nStringShortcut` / 主题 token 与明暗模式                                                           |

完整组件与交互演示见示例站（`npm run examples:html` 后打开 `http://localhost:5173/#/components`）。

## 构建产物

```bash
npm run build
```

`dist/` 输出：

- `yoya.core.js` / `yoya.ui.js` — 核心与组件库 ESM 入口
- `yoya.echart.js` — ECharts 组件入口（不包含 echarts 本体）
- `yoya.ssr.js` — 服务端渲染入口（`renderToString` / `hydrate` / `mount`）
- `echarts.min.js` — ECharts 本体（用 `<script>` 标签全局引入）
- `yoya.ui.css` — 默认样式与主题变量
- `yoya-ui.umd.js` — UMD 版（`window.YoyaUI`）

## 开发

```bash
npm install
npm test              # vitest 全量测试
npm run lint          # eslint
npm run build         # 全量构建
npm run examples:html # 示例站（localhost:5173）
npm run format        # prettier
```

## 目录结构

```text
src/
  core/        ViewNode/ElementNode 核心、状态、i18n、主题、id 分配器、SSR 助手
  html/ svg/   HTML/SVG 元素工厂
  layout/      布局工厂
  actions/ navigation/ feedback/ form/ data-display/ async/ chart/ effects/
               官方组件库各分类
  components/  组件聚合与共享逻辑
  examples/    示例站（含 SSR 演示与复制即用指南）
  index.js     开发聚合入口
  yoya.core.js / yoya.ui.js / yoya.echart.js / yoya.ssr.js / yoya.ui.css
scripts/
  build-entries.mjs        ESM 入口构建
  copy-example-modules.mjs 示例资源拷贝
vite.config.js / vite.umd.config.js / vite.examples.config.js
```

## 文档

- [服务端渲染集成指南](docs/ssr.md)
- [组件开发规格](docs/component-development-spec.md)
- [组件库开发规范（第三方开发者）](docs/component-library-authoring.md)
- [主题样式规范](docs/theme-styling.md)
- [组件目录](docs/components.md)
- [核心实现摘要](docs/yoya-basic-core-summary.md)

## Codex 技能

在 Codex 中使用 yoya-ui：按[技能安装说明](skills/yoya-ui/README.md)安装 yoya-ui 技能，Codex 即可获得组件 DSL、页面组合、表单、主题、SSR/hydrate 与 i18n 的使用指导。

## License

MIT
