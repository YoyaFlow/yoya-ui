# 组件开发规格

## Problem Statement

当前项目已经完成 `ViewNode`、HTML、SVG、布局、I18n 和 Router 的底层能力，具备创建复杂 UI 组件的基础。但如果直接把 `button()`、`div()`、`input()` 继续暴露到页面开发层作为主要拼装方式，页面代码会逐渐回到“用基础标签堆界面”的模式。

后端和全栈工程师需要的是一套更聚合的 JS Web UI 基础库：基础元素用于构建底层结构，复合组件用于承载业务页面中的常见交互、状态和视觉语义。尤其是 `button` 这类名称，如果同时代表原生 HTML 元素和复杂交互组件，会导致 API 语义混乱。

因此组件层必须建立清晰基调：基础 HTML 元素继续使用原始标签名，复杂多元素组件统一使用 `v` 前缀，例如 `vButton`、`vCard`、`vInput`、`vMenu`。

## Solution

在现有基础库上新增一套紧凑的组件层，参考 `yoya-basic` 的组件经验，但收拢命名、模块边界和测试方式。

组件层的用户视角目标是：

- 页面开发优先使用复合组件，而不是大量手写基础 HTML 元素。
- `button()` 永远表示基础 `<button>` 元素，`vButton()` 表示可扩展的按钮组件。
- `div()`、`section()`、`form()`、`input()` 等基础工厂保持 HTML 原始语义。
- `vCard()`、`vButton()`、`vMenu()`、`vField()` 等表示由多个元素、状态、样式和交互组合出的 UI 组件。
- 组件仍然遵循 `ViewNode` 的 setup callback 风格，可以自然写成 `vCard(card => { card.vCardHeader('标题'); card.vButton('保存'); })`。
- 所有文本输入仍支持原始字符串、`VTextNode`、`I18nTextNode` 和 `"默认文案".s("key")`。

第一阶段不追求一次性复刻 `yoya-basic` 的所有组件，而是优先建立最常用、最能证明组件层价值的组件。

## User Stories

1. As a backend developer, I want to call `vButton('保存')`, so that I can create a standard action button without manually assembling classes and states.
2. As a backend developer, I want `button('保存')` to keep meaning native HTML button, so that I can still create low-level markup when needed.
3. As a full-stack developer, I want compound components to use the `v` prefix, so that component APIs are distinguishable from HTML element factories.
4. As a page author, I want `page.vButton('提交')` inside setup callbacks, so that child component creation has the same ergonomic style as `page.div()` and `page.h1()`.
5. As a page author, I want `vCard(card => { ... })`, so that common content blocks have a consistent container structure.
6. As a page author, I want `card.vCardHeader()`、`card.vCardBody()` and `card.vCardFooter()`, so that card slots are explicit and do not conflict with HTML `header()` or `footer()`.
7. As a page author, I want `vButton` variants such as primary, secondary and danger, so that action priority is visible without custom style code.
8. As a page author, I want `vButton` disabled and loading states, so that async operations can communicate availability and progress.
9. As a page author, I want `vButton` to accept click handlers through the existing event API, so that event binding remains consistent with `ViewNode`.
10. As a page author, I want `vMessage` and `toast`, so that save, delete and validation feedback can be shown without building notification containers manually.
11. As a page author, I want toast success, error, warning and info helpers, so that common feedback states are easy to express.
12. As a page author, I want `vMenu` and `vMenuItem`, so that navigation and command lists have consistent keyboard and pointer behavior.
13. As a page author, I want `vDropdownMenu`, so that secondary actions can be grouped without hand-writing overlay behavior.
14. As a page author, I want `vContextMenu`, so that right-click actions can be attached to backend/admin data views.
15. As a page author, I want `vDetail` and `vDetailItem`, so that read-only business objects can be displayed with label/value structure.
16. As a page author, I want `vCode`, so that code snippets, SQL fragments or logs can be displayed with copy support.
17. As a page author, I want form components such as `vInput`, `vSelect`, `vTextarea` and `vSwitch`, so that form screens do not require repetitive native input wiring.
18. As a page author, I want `vField`, so that display/edit/save flows can be built around one field without rewriting the mode switch each time.
19. As a page author, I want `vCheckboxes`, so that single-select and multi-select option groups can share one component API.
20. As a page author, I want `vForm`, so that form-level value collection and validation can be added in one place.
21. As a page author, I want `vTimer` and a date range component, so that date, datetime, time and range inputs are standardized.
22. As a page author, I want `vTable`, so that common admin tables can render rows, empty states and row actions predictably.
23. As a page author, I want component text to support I18n nodes, so that language switching works without rebuilding the component tree.
24. As a page author, I want components to return `ViewNode` instances, so that they compose with HTML, SVG, layout and router outlets.
25. As a library maintainer, I want component modules grouped by domain instead of one file per tiny component, so that the project stays compact.
26. As a library maintainer, I want shared component helpers to stay internal until there is repeated need, so that the public API remains focused.
27. As a library maintainer, I want examples for each component batch, so that users can validate behavior in the browser.
28. As a library maintainer, I want tests to assert DOM output and user-visible state, so that refactors do not lock tests to private fields.
29. As a library maintainer, I want component factories registered as child shortcuts, so that setup callback style stays consistent across the library.
30. As a library maintainer, I want the component layer to avoid naming collisions with HTML and SVG factories, so that future full element coverage remains stable.

## Implementation Decisions

- 基础元素层继续使用原始标签名。`button()`、`input()`、`form()`、`table()` 等只表示原生 HTML 元素。
- 复杂多元素组件统一使用 `v` 前缀。公共工厂使用 `vButton`、`vCard`、`vMenu` 等形式，类名使用 `VButton`、`VCard`、`VMenu` 等形式。
- 组件子节点快捷方法也使用 `v` 前缀。页面和容器中应支持 `page.vButton()`、`page.vCard()`；卡片插槽应优先使用 `card.vCardHeader()`、`card.vCardBody()`、`card.vCardFooter()`。
- 不提供无前缀的复杂组件别名。避免 `card()`、`button()`、`menu()` 这类名称在组件层和基础元素层之间产生歧义。
- `toast` 是少数允许无 `v` 前缀的命令式快捷 API，因为它不是元素工厂，而是全局反馈入口。底层节点组件仍命名为 `vMessage`、`vMessageContainer`。
- 组件必须基于 `ViewNode` 和现有 HTML/layout 能力组合，不直接拼接 HTML 字符串，不把 DOM 创建逻辑散落在渲染阶段。
- 固定子结构可以缓存引用，例如卡片的 header/body/footer、菜单项的 icon/text/shortcut、按钮的 icon/label/spinner，后续状态变化只更新这些子节点。
- 文本参数统一走已有 child normalization。组件 API 接受原始字符串、数字、`VTextNode`、`I18nTextNode` 和其它 `ViewNode`。
- I18n 继续由外部 `I18n` 实例控制语言。组件不保存全局语言状态，只消费可渲染文本节点。
- 组件层保持紧凑模块组织。初期可以集中在组件入口或少量领域模块中，随着复杂度增加按 action、surface、feedback、menu、form、data 等领域分组，避免一个组件一个文件造成过度碎片化。
- 组件样式第一阶段采用零依赖策略。默认提供可用的内联样式和稳定 class hook，后续主题系统再统一抽象。
- 组件优先服务后台、管理台和服务端模板嵌入场景。视觉策略应克制、清晰、可扫描，避免营销页式装饰。
- 组件定义和演示代码以声明式写法优先：优先使用 setup callback、父节点快捷方法和链式方法组合；参数对象写法作为 API 说明保留一个完整案例，不在每个演示中重复。
- 第一批组件为 `vButton`、`vCard`、`vMessage`、`toast`，用于建立组件命名、结构缓存、事件和状态模式。
- 第二批组件为 `vMenu`、`vMenuItem`、`vDropdownMenu`、`vContextMenu`，用于建立浮层、命令项和可选键盘交互模式。
- 第三批组件为 `vDetail`、`vCode`、`vTable`，用于支撑后台常见详情、日志、代码和数据表展示。
- 第四批组件为 `vField`、`vInput`、`vSelect`、`vTextarea`、`vCheckbox`、`vCheckboxes`、`vSwitch`、`vForm`，用于支撑表单构建。
- 第五批组件为 `vTimer` 和日期范围组件。日期范围组件命名优先评估 `vTimerRange`，如果为了兼容 `yoya-basic` 再考虑 `vTimer2`。
- 第六批组件为 `vEchart` 或 `vChart`。图表组件应在确认依赖策略后再实现，避免过早引入大型运行时依赖。
- 复杂组件默认导出工厂函数，类导出保留给高级扩展和测试使用。
- 父节点快捷注册应复用现有 child factory 机制，并确保不会覆盖基础 HTML/SVG 方法。

## Testing Decisions

- 测试缝选择公共 API 层：从库入口导入 `vButton`、`vCard`、`toast` 等函数，断言渲染 DOM、HTML 输出、事件触发和状态变化。
- 不测试私有字段和内部缓存变量。缓存是否存在是实现细节，用户可见结果才是契约。
- 第一批组件测试应覆盖：工厂返回 `ViewNode`、字符串转文本节点、I18n 文本节点更新、class/attribute 输出、disabled/loading 状态、点击事件。
- `vCard` 测试应覆盖 header/body/footer 的创建顺序、setup callback 子元素添加、父节点 `vCard` 和 `vCardHeader` 快捷方法。
- `vButton` 测试应覆盖原生 `button()` 与复合 `vButton()` 的不同 DOM 结构或 class hook，确保命名差异对应实际行为差异。
- `vMessage` 和 `toast` 测试应覆盖消息创建、关闭、自动关闭配置和多消息容器行为。
- 后续菜单组件测试应覆盖菜单项状态、禁用项不触发操作、下拉开合和点击外部关闭。
- 后续表单组件测试应覆盖 value getter/setter、onChange、disabled、readonly、error 和表单数据收集。
- 示例测试或浏览器演示用于验证真实页面组合，不替代单元测试。
- 每个组件批次至少配一个 examples 页面，展示常用元素、事件和动态状态。
- 测试优先复用现有 Vitest + jsdom 环境，不新增浏览器自动化依赖，除非浮层定位或真实交互需要。

## Out of Scope

- 本规格不包含立即实现所有组件。
- 本规格不设计完整主题系统、设计 token 系统或 CSS-in-JS 方案。
- 本规格不引入 React、Vue 或 Web Components 运行时。
- 本规格不处理 MathML、自定义元素或非标准 HTML 元素。
- 本规格不要求图表组件立即绑定 ECharts，图表依赖策略需要单独确认。
- 本规格不把 Router 重做为组件路由系统，现有 `router()` 继续作为独立基础能力。
- 本规格不发布 npm 包，也不定义版本发布流程。

## Further Notes

- 组件优先级建议保持为：UI 复合组件 > 布局组件 > SVG 作用域元素 > 基础 HTML 元素。
- 组件命名的核心判断标准是“是否组合了多个元素、状态或交互”。满足这个标准就使用 `v` 前缀。
- 单纯对应原生标签的能力不使用 `v` 前缀。例如原生 `<button>` 是 `button()`，原生 `<input>` 是 `input()`。
- 组件文档和示例中应避免继续使用基础元素拼装已有组件能力，例如不要用 `div + button + span` 反复模拟 `vButton`。
- 当前会话没有可用 issue tracker 配置和发布工具，因此本规格先沉淀为项目文档。后续如果接入 issue tracker，可按 `ready-for-agent` 状态发布为开发任务。
