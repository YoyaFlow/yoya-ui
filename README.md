# yoya-ui

> Browser-native UI library with declarative HTML authoring — no virtual DOM, no JSX/SFC, no build chain.
> 面向后端与全栈开发者的轻量原生 JS UI 基础库：小核心 + 开放标准 + 官方组件库。

yoya-ui 直接在真实 DOM 上构建视图：声明式 HTML 写法、组件库、路由、i18n、主题与状态系统开箱即用，支持服务端渲染（SSR）与纯客户端渲染同代码切换。

## 特性

- **低门槛声明式构建**：直接用原生元素描述界面，只学 HTML 与原生 JS 即可使用，无框架专属概念
- **后端全栈友好**：面向后端与全栈开发者，无需前端框架经验即可快速构建后台与管理界面
- **微服务一体发布**：UI 与后端服务同包发布、随服务整体交付，适合微服务独立部署（原子化发布）
- **AI 友好**：声明式结构 + 零构建链，AI 生成的组件代码可直接运行
- **开箱即用的组件库**：表单、导航、反馈、数据展示、布局、图表等高频场景开箱即用
- **内置路由 / i18n / 主题 / 状态管理**：单页应用所需能力自带，无需额外选型
- **服务端渲染**：一套代码双模式可切换，整站服务端渲染与局部组件客户端加载加强均可用
- **小核心、零依赖、易扩展**：遵循标准组件形态，第三方组件可与内置组件无缝组合，按模块引入适配任意工程
- **长期维护友好**：核心库保持稳定，长期项目无需担心版本过时或升级重写

## 安装

```bash
npm install yoya-ui
```

## 快速开始

```js
import { div, vButton, toast } from 'yoya-ui';
import 'yoya-ui/ui.css';

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
import { renderToString } from 'yoya-ui/ssr';
const { html, state } = renderToString(createPage, { state: { path: '/home' } });

// 客户端
import { hydrate, mount, parseState } from 'yoya-ui/ssr';
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
import { div, svg, createI18n } from 'yoya-ui/core'; // 核心 HTML/SVG/状态
import { vButton, vCard, vForm, vTable } from 'yoya-ui/ui'; // 官方组件库
import { vEchart } from 'yoya-ui/echart'; // ECharts 组件（需自行引入 echarts）
import { renderToString, hydrate } from 'yoya-ui/ssr'; // 服务端渲染
import 'yoya-ui/ui.css'; // 默认样式与主题变量
```

## TypeScript 支持

源码保持纯 JavaScript（零构建、可直接运行），通过随包发布的类型声明提供完整的 TypeScript 体验。`types/` 目录覆盖四个入口（根入口 / `core` / `echart` / `ssr`），并包含节点类、工厂函数签名、组件状态 API 与父节点快捷方法（如 `page.vButton(...)`）的类型。

TypeScript 项目无需额外配置即可获得提示与类型检查：

```ts
import { div, vButton, vCard, vTable, toast } from 'yoya-ui';
import { createI18n } from 'yoya-ui/core';
import { renderToString } from 'yoya-ui/ssr';
import 'yoya-ui/ui.css';

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

## License

MIT
