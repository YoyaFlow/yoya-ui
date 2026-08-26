# yoya-basic 核心特性总结

本文档用于为 `yoya-ui` 奠定后续 JS 基础库的底层基调。参考对象为本机项目 `D:\code\yoyaflow\yoya-basic`，重点不是照搬全部组件，而是识别其中稳定、可收拢、适合重建为基础能力的核心特性。

## 一句话定位

`yoya-basic` 是一个浏览器原生 HTML DSL 库：用 JS 函数和链式 API 描述 DOM、布局、组件、状态和主题，面向后端/全栈开发者在服务端渲染、微前端嵌入、后台管理页面和轻量交互页面中快速构建 Web UI。

它的核心不是“再造 React/Vue”，而是提供一个更接近 Kotlin HTML DSL 的浏览器原生 UI 构建语法。

## 项目形态

- 包名：`yoya-basic`
- 模块类型：ES Module
- 主入口：`src/yoya/index.js`
- 类型声明：`src/yoya/index.d.ts`
- 构建：Rollup 输出 `dist/yoya.esm.js` / `dist/yoya.esm.min.js`
- 示例：`src/examples`、`src/v1/examples`、`src/v2/examples`
- 测试：Node + jsdom 核心测试，Playwright 浏览器测试
- 文档：README、DESIGN、skills 文档和组件示例文档

## 适用场景

`yoya-basic` 最强调的使用场景是：

- 微前端架构：局部页面或独立功能块按需挂载。
- 服务端渲染 + 局部交互：后端模板先输出页面骨架，前端只接管部分交互。
- 后台管理系统：表单、表格、详情、菜单、消息等 CRUD 高频界面。
- AI 生成 UI：API 命名直观，链式调用和对象配置对代码生成友好。
- 不依赖大型框架的小型业务页面。

不推荐场景：

- 强依赖 React/Vue 生态的项目。

## 核心抽象

### 1. Tag 是底座

`Tag` 是所有 HTML 元素、布局组件、UI 组件的统一基类。

它负责：

- 创建真实 DOM 元素。
- 保存虚拟属性、样式、类名、事件和子元素。
- 提供链式 API。
- 提供 `bindTo()` 挂载到 DOM。
- 提供 `renderDom()` 渲染/更新元素树。
- 提供 `destroy()` 生命周期清理。
- 提供 `toHTML()` 输出 HTML 字符串。
- 提供状态注册、状态处理器、状态快照和状态拦截器。

`yoya-basic` 的底层模型可以理解为：

```text
Tag 实例
  -> 属性 attr
  -> 样式 styles
  -> 类 className
  -> 事件 on
  -> 子元素 child
  -> 状态 state
  -> DOM render/bind/destroy
```

### 2. 工厂函数是主要入口

库同时保留 Class 和工厂函数，但面向使用者时更推荐工厂函数：

```js
div((d) => {
  d.h1('标题');
  d.p('内容');
}).bindTo('#app');
```

典型工厂包括：

- 基础容器：`div`、`span`、`section`、`main`
- 标题文本：`h1`-`h6`、`p`、`a`、`strong`、`code`
- 表单元素：`button`、`input`、`textarea`、`select`、`form`
- 列表：`ul`、`ol`、`li`
- 表格：`table`、`tr`、`td`、`th`
- 媒体：`img`、`video`、`audio`、`canvas`
- 通用：`tag(name, setup)`

### 3. setup 统一初始化

`setup` 是 yoya-basic API 的关键语义，支持三种输入：

- 函数：声明式构建子元素和属性。
- 字符串：作为文本内容或组件默认字段。
- 对象：作为属性、样式、事件、children 配置。

这让同一个 API 同时适配人工编写、后端数据驱动和 AI 生成代码。

### 4. 链式调用是主要写法

大多数方法返回 `this`，例如：

```js
div().id('panel').className('surface').style('padding', '16px').text('Ready');
```

链式调用降低了模板和 DOM API 的切换成本，也让组件封装更一致。

### 5. 父元素拥有子元素快捷方法

`Tag` 原型扩展了常见元素方法，因此父元素内部可以直接写：

```js
div((page) => {
  page.header('标题');
  page.main((main) => {
    main.p('正文');
  });
});
```

这是一种接近 DSL 的核心体验。

## 模块能力

### 基础元素层

基础元素层提供 HTML 标签的节点类和工厂函数，是整个库的语法根基。`yoya-ui` 当前应覆盖 WHATWG HTML 标准中的 conforming HTML 元素；过时元素、SVG、MathML 和自定义元素不混入 `html` 模块，SVG 由 `svg` 模块独立承载。

关键能力：

- 统一属性设置：`attr()`、`id()`、`name()`
- 类名设置：`className()` / `class()`
- 样式设置：`style()` / `styles()`
- 事件绑定：`on()`、对象配置中的 `onclick`
- 内容管理：`text()`、`html()`、`child()`、`clear()`
- DOM 管理：`bindTo()`、`renderDom()`、`destroy()`、`toHTML()`

命名约定：

- 标签工厂默认与标签同名，例如 `div()`、`dialog()`、`search()`、`video()`。
- `<var>` 因为 JS 关键字冲突，使用 `varTag()`。
- `<style>` 顶层工厂仍为 `style()`；父节点快捷方法使用 `styleTag()`，避免覆盖 `.style()` 样式设置 API。
- SVG 子标签注册在独立的 `SvgElementNode` 上，使用 `text()`、`title()`、`style()` 等原始标签名，不污染 HTML 节点。

### 布局层

布局组件把常见 CSS 布局封装为语义化 API：

- `flex`
- `grid`
- `responsiveGrid`
- `stack`
- `hstack`
- `vstack`
- `center`
- `spacer`
- `container`
- `divider`

布局层的价值是减少业务页面反复手写 `display: flex`、`gap`、`alignItems` 等样式，同时建立统一布局语言。

`yoya-ui` 当前第一批布局组件已落地为 `flex`、`grid`、`stack`、`hstack`、`vstack`、`center`、`container`、`spacer`、`divider`。它们本质上仍是 `ElementNode`，通过内联样式和父节点快捷方法接入现有 ViewNode DSL。

### SVG 层

SVG 层提供浏览器原生矢量绘制 DSL：

- `svg`
- `circle`
- `rect`
- `line`
- `path`
- `g`
- `defs`
- `linearGradient`
- `radialGradient`
- `filter`

它适合绘制轻量图形、图标和自定义可视元素。

### UI 组件层

`yoya-basic` 已经沉淀了一批面向后台和业务页面的组件：

- Card：`vCard`、`vCardHeader`、`vCardBody`、`vCardFooter`
- Button：`vButton`
- Form：`vInput`、`vSelect`、`vTextarea`、`vCheckbox`、`vCheckboxes`、`vSwitch`、`vForm`
- Field：`vField`
- Detail：`vDetail`、`vDetailItem`
- Table：`vTable`、`vThead`、`vTbody`、`vTr`、`vTh`、`vTd`
- Menu：`vMenu`、`vMenuItem`、`vDropdownMenu`、`vContextMenu`、`vSidebar`
- Message：`toast`、`vMessage`、`vMessageContainer`
- Code：`vCode`、`codeBlock`
- Body：`vBody`
- Echart：`vEchart`
- Router：`vRouter`、`vRoute`、`vLink`、`vRouterView`

组件设计原则是：页面层优先使用组件，组件不满足时再使用布局和基础元素。

优先级：

```text
UI 组件 > 布局组件 > SVG 组件 > 基础元素
```

### 状态系统

状态系统由 `StateMachine` 和 `Tag` 状态扩展共同承担。

能力包括：

- 注册状态属性：`registerStateAttrs()`
- 支持 boolean / string / number 状态值。
- 注册状态处理器：`registerStateHandler()`
- 状态拦截：`registerStateInterceptor()`
- 状态快照：`saveStateSnapshot()` / `restoreStateSnapshot()`
- 状态组件封装：`vStateNode()` 提供 `state()` / `render()` / `update()`
- 组件内置常见状态：`disabled`、`active`、`error`、`loading` 等。

这使组件可以把交互状态和样式变化收敛到内部，而不是让业务页面直接操作 CSS。

### 主题系统

主题系统分两层：

- `core/theme.js`：状态机、主题对象、主题管理器、状态处理器注册。
- `theme/index.js` 和 `theme/islands`：CSS 变量、明暗主题、主题注册和切换。

主题能力包括：

- 注册主题。
- 切换主题。
- 自动/明亮/暗色模式。
- 组件级变量。
- 状态样式和变体样式。
- Islands 主题变量体系。

### i18n

i18n 模块提供轻量国际化：

- `registerLanguage()`
- `setLanguage()`
- `getLanguage()`
- `t()`
- `translate()`
- `initI18n()`
- `createText()`
- 本地存储语言选择。
- `vLanguageSwitch()` 预置语言下拉切换。
- 嵌套 key 查询和参数替换。

`yoya-ui` 当前先把最小 I18n 文本绑定放入 core：`I18n` 管理语言和词典，`I18nTextNode` 继承 `ViewTextNode`，语言切换时自动刷新文本节点。字符串快捷写法使用 `"内容".s("content-key")`，字符串本身只作为默认文案，key、语言包和当前语言都由外部 `I18n` 实例控制。语料库支持嵌套 JSON 和多个文件数组合并，例如 `messages: [commonCorpus, pageCorpus]`。语言选择可以通过 `storageKey` 持久化，`vLanguageSwitch` 提供预置下拉切换；完整语言包异步加载和复杂格式化仍建议后续作为 `i18n` 扩展入口补齐。

### 动态加载

`VDynamicLoader` 提供按需加载 JS 模块的能力：

- 加载状态：pending / loading / loaded / error
- 占位内容。
- 错误内容。
- 成功/失败/状态变化回调。
- 重试。
- 模块缓存。
- 批量预加载和缓存清理工具。

这类能力适合微前端、图表、低频功能页面和大型组件懒加载。

### 路由

`VRouter` 是轻量 hash/history 路由：

- hash 和 history 路由模式。
- 动态参数：`/user/:id`
- query 参数解析。
- 默认路由。
- 全局前置守卫和后置钩子。
- 路由级守卫。
- 404 处理。
- `vLink` 和 `vRouterView`。

它是 SPA 能力的最小补充，不是完整路由框架。

## 测试体现的核心契约

从 `tests/basic.test.js` 和浏览器测试可以看出，`yoya-basic` 最核心的行为契约是：

- 工厂函数必须能创建元素对象。
- 工厂函数必须支持函数、字符串、对象配置。
- 链式调用必须返回当前实例。
- 事件绑定必须可触发。
- 子元素必须可添加并渲染。
- 基础元素必须能扩展为父元素快捷方法。
- 类名支持空格、多个参数和数组。
- 表单元素属性必须同步到 DOM。
- `bindTo()` 能挂载到选择器或 DOM 元素。
- `toHTML()` 能输出基础 HTML 字符串。
- 删除标记元素不应继续渲染。
- 组件示例页面应能正常加载。
- `vField` 应支持编辑、保存、悬停、自动保存等交互。
- `VRouter` 应支持导航、动态参数、守卫、404、浏览器前进后退。

这些契约是后续 `yoya-ui` 重建底层结构时最值得保留的部分。

## 对 yoya-ui 的收拢建议

后续 `yoya-ui` 不建议直接复制 `yoya-basic` 的全部面积，而应该先收拢为稳定内核，再逐步扩展。

### 命名决策：使用 ViewNode 作为底层基础节点

`yoya-ui` 不沿用 `yoya-basic` 的 `Tag` 作为新内核命名。新项目统一使用 `ViewNode` 表达底层基础节点。

原因：

- `Tag` 偏向 HTML 标签，覆盖不了组件、布局、文本、SVG 和未来扩展节点。
- `VNode` 容易被理解为 Virtual DOM 节点，不符合 `yoya-ui` 的浏览器原生路线。
- `ViewNode` 表达“视图树中的节点”，既能承载真实 DOM 生命周期，也不暗示虚拟 DOM diff 框架。

建议命名层级：

```text
ViewNode       视图节点底座，负责生命周期、事件、子节点和状态
ElementNode    普通 DOM 元素节点，SVG 命名空间节点由 SvgElementNode 承载
HtmlElementNode HTML DSL 元素节点，承载 HTML 子元素和布局快捷方法
VTextNode      文本节点，配套工厂函数为 vText()
ComponentNode  组件节点
```

工厂函数仍保持 HTML DSL 风格：

```js
div((page) => {
  page.h1('标题');
  page.p('内容');
});
```

### 必须保留为核心

- 浏览器原生运行，保持 ES Module 友好。
- `ViewNode` 视图节点模型。
- 工厂函数优先的声明式 DSL。
- setup 函数 / 字符串 / 对象三种初始化方式。
- 链式 API。
- 父元素快捷子元素 API。
- `bindTo()` / `renderDom()` / `destroy()` / `toHTML()` 生命周期。
- 属性、类名、样式、事件、子元素统一管理。
- 最小状态系统：注册状态、设置状态、状态处理器。
- 最小布局系统：`flex`、`grid`、`stack`、`hstack`、`vstack`、`center`、`container`。
- 后台高频组件最小集：Button、Card、Form/Input、Table、Detail、Message。

### 应拆成可选扩展

- Router：作为 `router` 扩展包或子入口。
- i18n：核心只保留 `I18n` + `I18nTextNode` 的最小文本绑定；语言包加载、持久化和复杂格式化作为 `i18n` 扩展包或子入口。
- DynamicLoader：作为 `helper` 或 `micro` 扩展能力。
- SVG：作为 `svg` 子入口。
- Echart：作为图表适配层，避免进入核心包。
- 大型主题变量集：核心只定义主题机制，具体主题单独维护。

### 暂缓进入核心

- 过多业务化组件。
- 与某个视觉主题强绑定的样式细节。
- 完整 SPA 框架能力。
- 图表库深度封装。
- 大量示例页框架。

## yoya-ui 推荐底层结构

基础库阶段建议将源码收敛为以下结构：

```text
src/
  core/
    node.js         ViewNode、ElementNode、VTextNode、DOM 辅助和工厂注册
    i18n.js         I18n 和 I18nTextNode
    index.js        核心导出
  html/
    index.js        HtmlElementNode 和基础 HTML 元素工厂
  svg/
    index.js        SvgElementNode、SVG 入口和内部子元素扩展
  layout/
    index.js        布局工厂
  components/
    index.js        复杂组件入口
  router.js         hash/history 路由出口
  theme/
    index.js        主题入口
  extras/
    index.js        扩展入口
  index.js
```

第一阶段不要追求组件数量，先把 `ViewNode`、工厂函数、setup、链式调用、渲染生命周期、状态和布局打稳。

## yoya-ui 的产品基调

`yoya-ui` 应该定位为：

> 面向后端和全栈工程师的浏览器原生 JS UI 基础库，用声明式 DSL 构建服务端友好、可嵌入、可组合、低依赖的 Web UI。

设计关键词：

- 原生：优先使用浏览器能力，不引入虚拟 DOM 框架依赖。
- 小核：核心包只承载稳定基础能力。
- 组合：组件由基础元素和布局组合出来。
- 可读：API 像写 HTML 结构，而不是拼字符串。
- 后端友好：支持服务端模板嵌入、局部挂载、表单和表格高频场景。
- AI 友好：命名直白、对象配置明确、示例稳定。
- 渐进：可从一个局部交互开始，不要求整站改造。

## 后续重构顺序建议

1. 先实现 `ViewNode` 内核和基础元素工厂。
2. 补齐 `setup` 三种输入和链式 API。
3. 建立 DOM 生命周期：`bindTo`、`renderDom`、`destroy`、`toHTML`。
4. 加入事件绑定和自动清理。
5. 加入最小状态机。
6. 加入布局组件。
7. 加入 Button、Card、Form、Table、Message 等后台高频组件。
8. 再考虑主题、i18n、router、dynamic-loader、svg、chart 等扩展入口。

## 结论

`yoya-basic` 最值得继承的是它的底层语法模型，而不是全部组件数量。`yoya-ui` 的下一步应围绕“浏览器原生 HTML DSL + 小核心 + 后端友好组件”重建底层结构，把状态、生命周期、工厂函数和布局能力打成稳定内核，再通过子入口扩展路由、国际化、动态图表和高级组件。

## yoya-ui 相比 yoya-basic 需要优化的部分

### 1. 从“大而全”优化为“小核 + 扩展”

`yoya-basic` 把基础元素、布局、SVG、主题、i18n、router、dynamic-loader、echart 和大量组件集中在一个主入口。`yoya-ui` 应先建立稳定核心，再通过子入口扩展能力。

建议：

- 核心包只放 `ViewNode`、工厂函数、渲染生命周期、事件、状态、基础布局。
- 组件按 `components` 子入口提供。
- `router`、`i18n`、`svg`、`chart`、`dynamic-loader` 作为可选扩展。

### 2. 从组件数量优化为组件边界

`yoya-basic` 已有很多组件，但不同组件的成熟度、抽象层级和业务味道不完全一致。`yoya-ui` 应先定义组件准入标准。

建议：

- 第一批只保留后台高频组件：Button、Card、Input/Form、Table、Detail、Message。
- 每个组件必须有状态定义、样式变量、事件契约和测试。
- 业务化组件不进核心，放在 examples 或 recipes。

### 3. 从示例驱动优化为文档和测试驱动

`yoya-basic` 有大量示例页面，这对探索有帮助，但容易让项目主线变散。`yoya-ui` 应避免初始化阶段就放演示页面，把基线沉淀为文档、测试和最小 API。

建议：

- 当前阶段不保留 root `index.html` 演示页。
- 示例后续放入独立 `examples/` 或 `playground/`，不混入核心源码。
- 每个核心行为先有测试，再有文档和示例。

### 4. 从隐式能力优化为清晰导出面

`yoya-basic` 主入口导出大量符号，使用者很容易不知道应该从哪里开始。`yoya-ui` 应设计更清晰的导出层级。

建议：

```text
yoya-ui
yoya-ui/core
yoya-ui/elements
yoya-ui/layout
yoya-ui/components
yoya-ui/theme
yoya-ui/router
yoya-ui/i18n
```

主入口只导出最常用、最稳定的 API。

### 5. 从样式内联优化为 token 和主题契约

`yoya-basic` 中很多组件直接写样式，同时 Islands 主题又提供 CSS 变量。`yoya-ui` 应让主题变量成为明确契约。

建议：

- 核心组件只依赖统一 token。
- 组件状态样式通过 token 和 state handler 驱动。
- 主题实现和组件实现解耦。

### 6. 从运行时便利优化为生命周期安全

`yoya-basic` 已有 `destroy()`、状态机、动态加载等能力，但后续新项目应更严格管理事件、子元素和外部资源。

建议：

- `on()` 绑定的事件必须可被 `destroy()` 清理。
- 动态加载、router listener、message timer 都必须有销毁策略。
- DOM 更新要避免重复绑定事件和重复插入节点。

### 7. 从弱类型补充优化为类型优先

`yoya-basic` 有 `.d.ts`，但源码仍以 JS 为主。`yoya-ui` 可以继续用 JS，但需要让类型声明和 JSDoc 成为公开契约。

建议：

- 每个公开 API 必须有 `.d.ts` 或 JSDoc 类型。
- setup 函数、对象配置、状态值、事件回调要有明确类型。
- 构建时加入类型检查或声明文件校验。

### 8. 从旧构建链优化为现代 Vite 库模式

`yoya-basic` 使用 Rollup 和 Vite 并存。`yoya-ui` 当前已经使用 Vite library mode，应保持构建链更简单。

建议：

- 使用 Vite 统一开发、测试和构建配置。
- 输出 ESM 为主，UMD 作为兼容输出。
- 后续增加 subpath exports，支持 tree-shaking。

### 9. 从页面框架优化为后端嵌入优先

`yoya-basic` 有 v2 examples 框架和路由演示，已经接近小型 SPA。`yoya-ui` 应坚持后端/全栈开发者优先。

建议：

- 默认支持局部挂载，而不是要求整页接管。
- 表单、表格、详情、消息这些后端 CRUD 场景优先。
- SSR/模板集成方式要写成一等文档。

### 10. 从“能用”优化为“可维护内核”

新项目的目标不是复制旧项目，而是把旧项目中验证过的语法体验重建成更稳定的内核。

建议：

- 每一层只依赖更底层模块。
- 不让组件反向污染 core。
- 建立 API 冻结规则：核心 API 少改，扩展 API 可迭代。
- 测试覆盖核心契约：setup、child、render、bind、destroy、state、event、toHTML。
