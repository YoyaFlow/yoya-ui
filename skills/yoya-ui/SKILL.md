---
name: yoya-ui
description: 在项目中正确使用 yoya-ui UI 库时使用：声明式组件 DSL、页面组合、状态与可重建区域、表单收集与校验、权限与 Context、主题 token、SSR/hydrate、i18n；也适用于基于 yoya-ui/core 开发第三方组件。
---

# Yoya UI

yoya-ui 是服务端渲染优先、核心保持稳定的 Web 基础库：ViewNode 视图树 + 声明式 DSL，基于浏览器原生能力构建，提供 UI 组件仅为开箱即用、不代表库的能力边界。本 skill 教你在**使用方项目**中正确地用它拼页面、收集表单、定制主题、做 SSR 与 i18n。

## 快速开始

```js
import { div, vButton, vCard } from '@yoyaflow/yoya-ui';

div((root) => {
  root.vCard((card) => {
    card.vCardHeader('标题');
    card.vCardBody((body) => {
      body.p('内容');
      body.vButton('保存', (btn) => btn.on('click', () => console.log('saved')));
    });
  });
}).bindTo('#app');
```

## 核心语法

- **v 前缀工厂是复合组件**：`vButton`、`vCard`、`vForm`、`vInput`、`vSlider` 等；**原生标签工厂保留原义**：`div()`、`button()`、`input()` 始终是原生元素
- **setup callback 风格**：`vCard((card) => { card.vCardBody(...) })`，父节点快捷方法（`page.vButton`、`card.vCardHeader`）随处可用
- **setup 回调参数语义化命名**：回调收到的节点按职责命名（如 `vFormItem` 用 `itemOfLabel` / `labelField`），避免与闭包外层业务数据同名遮蔽；节点方法名与业务字段同名（label/value/status）时，漏掉 `()` 会拿到函数对象
- **文本**：字符串、`vText()`、i18n 节点、`'文案'.s('key')` 四种写法自动归一
- **事件绑定铁律**：快捷方法返回父节点而非子元素，事件必须用回调参数：
  - 错误：`page.button('保存').on('click', fn)`（handler 挂到 page 容器）
  - 正确：`page.button('保存', (btn) => btn.on('click', fn))`
- **不直接操作 document**：组件代码（含事件回调）不直接 `document.createElement` / `addEventListener`；需要文档级监听（外部点击、拖拽、Esc、滚动）时用 `bindDocumentEvent`，`window` 级用 `bindWindowEvent`，注入样式用 `injectDocumentStyle`
- **挂载走 `bindTo`**：`node.bindTo('#app')` 渲染并挂到容器；SSR 用 `hydrate` / `mount`。不要在业务代码里 `document.querySelector('#app').appendChild(node.renderDom())`——绕开挂载约定，容器不存在时还会直接抛错
- **复杂组件分块也走组件**：结构复杂时把每一块抽成同文件内的函数组件（PascalCase、描述 UI 单元、输入走参数），在 render 里组合；不要用匿名片段或 `renderTop` 这类位置式命名堆结构。详见 references/modules.md

## 文本与状态

动态文本用 `vText()` 创建：渲染为真实 Text 节点，可放进任何接受子节点的位置；SSR 输出自动转义。

状态用内置信号 `ref` 持有，值位置直接传句柄（`attr(key, count)`、`vText(count)`、`vInput({ value: count, disabled: locked })`），写入后绑定原地更新、DOM 不重建；派生值用 `computed`。

```js
import { computed, div, ref, vButton, vText } from '@yoyaflow/yoya-ui';

const count = ref(0);
const label = computed(() => (count.value > 0 ? `已完成 ${count.value} 次` : '待处理'));

div((root) => {
  root.p((line) => line.child(vText(label)));
  root.vButton('完成', (button) => {
    button.on('click', () => {
      count.value += 1;
    });
  });
}).bindTo('#app');
```

字符串、`vText()`、i18n 文本节点与 `'文案'.s('key')` 四种写法自动归一，混用不受影响；需要响应式语言切换时用 `.s()` 或 `locale.text()`。

也可以持有文本节点句柄用 `textContent(value)` 原地替换（命令式写法），但状态驱动优先用信号。

需要「结构随数据变化」的局部内容（列表重排、字段切换）用区域：声明 `rebuildable(谓词?)` 后，区域内读到的信号就成为它的依赖，信号变化时自动按谓词重建（也可手动 `rebuild()`）。区域重跑不保留区域内 DOM 身份（焦点/滚动/第三方实例会重建），区域外不受影响；谓词只决定「这次要不要花重建」，为假时只刷值并记 `rebuildPending()`。详见 references/state.md。

## 表单

`vForm` + `vFormItem` 收集与校验；控件设 `name()` 后自动进 `form.values()`；`form.validate()` 校验必填与自定义规则。详见 references/forms.md。

## C 端体验组件

面向内容站、工具与展示类页面的开箱组件：`vSkeleton` 骨架屏、`vLazyImage` 图片懒加载、`vTransition` 进出场过渡（`motion: 'always'` 强制动画）、`vMasonry` 瀑布流、`vImagePreview` 图片灯箱；`vCarousel` 已支持触摸/鼠标滑动。每种组件的用途与关键 API 见 references/components.md。

## 主题与样式

组件自带内聚样式；颜色、间距、控件尺寸等用 `--yoya-*` CSS 变量，换肤只覆盖变量；明暗/密度由 `data-yoya-mode`/`data-yoya-density` 切换。详见 references/theming.md。

## SSR 与 i18n

三份文件跑通 SSR，顺序是 **HomePage → 服务端 → 客户端**：

1. `home-page.js`：`HomePage(state)` 页面工厂，两端共用（只依赖可序列化状态）
2. `server.mjs`：`renderPage({ page: (page, state) => … }, state, { messages })` 一次产出文档骨架（`<head>` / `<body>` DSL + `#app` + `__YOYA_DATA__`）；**客户端入口不由它输出**，自己在 head DSL 里加 `head.script({ type: 'module', src: '/client.js' })`（路径与顺序由你决定）
3. `client.js`：浏览器入口（vite 构建成 `dist/client.js`，由你在 HTML 里写的那行 `<script type="module" src="/client.js">` 加载），文件里执行 `hydrateOrMount(HomePage, { messages })`——读状态脚本，有服务端 HTML 就 hydrate（收养 DOM、绑事件），否则 mount

渲染路径必须 DOM-free 且确定性（不读 `document`/`window`、不用 `Date.now()`/`Math.random()` 影响输出、请求状态按请求注入）；i18n 每请求实例，`'文案'.s('key')` 自动按请求语言翻译。可直接复制的三份完整文件、低层原语（`renderToString` / `hydrate` / `mount`）与要避免的操作清单见 references/ssr-i18n.md。

## 权限控制

组件只声明裸资源码 `node.access('system:member')`，读/写级别由用户持有决定：无读不渲染、无写只读/禁用；容器声明即整块作用域、就近覆盖。SPA 用 `installAccess(access)` 初始化一次，SSR 用入口 `options.access` 注入。通用数据注入用 `withContext(providers, build)` + `currentContext(key)`（构建期作用域，SSR 每请求隔离）。详见 references/access-context.md。

## DevTools（Beta）

开发期调试从独立子路径加载（主入口与 `core` 不导出）：`enableDevtools()` 开启后用 `subscribeDevtools(listener)` 订阅事件流，`getDevtoolsSnapshot(root)` 取视图树快照，`getDevtoolsDom(id)` / `getDevtoolsScope(id)` 定位真实 DOM 与作用域详情。事件含 `commit` / `destroy` / `attr` / `style` / `child` / `text` / `signal-write` / `region`。只在浏览器开发期使用，不在 SSR 或生产进程开启。详见 references/devtools.md。

## 参考文件（按需读取）

- [references/quickstart.md](references/quickstart.md)：安装导入、语法与挂载、常用组件 API 速查
- [references/components.md](references/components.md)：每种组件的用途、最小示例与关键 API
- [references/forms.md](references/forms.md)：vForm/vFormItem、收集校验、自定义控件
- [references/theming.md](references/theming.md)：主题 token、类名契约、样式定制
- [references/ssr-i18n.md](references/ssr-i18n.md)：SSR/hydrate、每请求 i18n、路由配合
- [references/state.md](references/state.md)：Signals（`ref` / `computed` / 值位置传句柄）、由信号驱动的可重建区域、引擎替换、fragment 与 keyed 子节点、事件单槽
- [references/access-context.md](references/access-context.md)：权限（read/write、scope、SPA/SSR 注入、admin 接线）与通用 Context 注入、无障碍原语
- [references/devtools.md](references/devtools.md)：DevTools（Beta）调试入口与事件契约
- [references/core.md](references/core.md)：基于 `yoya-ui/core` 开发第三方组件（形态、契约、打包）
- [references/modules.md](references/modules.md)：业务模块组织规则（目录结构、api 分层与命令范式、状态模块、业务/共享组件、应用外壳与导航、命名与结构分块、启动流程与新增菜单）

## 交付物说明

- npm 包发布内容只有 `dist/` 与 `types/`（见 `package.json` 的 `files` 字段），**不包含 `docs/`**；本 skill 已自包含，消费方无需仓库文档
- 权威 API 面以包内 `types/*.d.ts` 与 `dist/*.js` 为准；渲染示例见 `dist/examples/ssr-demo.html`
- 使用方需自行链接样式 `dist/yoya.ui.css`（组件皮肤契约，无运行时 CSS 注入）
