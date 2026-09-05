# Spec：树形表格 / 确认弹窗 与基础能力补全（vTreeTable / vConfirm + Context / devtools / 无障碍 / i18n 纵深）

> 状态：`ready-for-agent`（分片待实施）。
> 本文综合既有对话与代码库现状生成；各分片可独立推进，但共享「测试缝」与「导出/契约」约束。

## Problem Statement

中后台开发者最常见的诉求集中在「树形表格、确认操作」两处，而这套库目前把它们留给了使用者自己拼装：

- 没有树形表格——树形层级只能靠嵌套表格或手写行缩进；
- 删除等危险操作要么用裸 `vDialog` 自己组装，要么退回到浏览器 `confirm()`。

同时，作为「基础库 + UI 组件库」，四块跨切面的能力是硬缺口：

- 没有通用 Context 注入原语（只有 i18n、access 两个专用作用域栈）；
- 没有 devtools / 调试面，复杂状态只能靠 console；
- 无障碍只有组件各自零散的 aria，没有 focus-trap / 键盘导航 / a11y 检查这些系统性原语；
- i18n 停留在「字符串替换」，没有复数/ICU、`Intl` 数字与日期格式化、懒加载 locale。

结果是：能拼出页面，但「生产级复杂业务 + SSR 确定性 + 可访问性」要大量自写纪律。

## Solution

一次性交付两个组件（`vTreeTable`、`vConfirm`）和四块基础能力（`Context`、`devtools`、`无障碍`、`i18n 纵深`）。组件与能力都以「声明式 DSL + 现有生命周期」为外部形态，复用既有 `setup` 回调、`child()` 组合、SSR 确定性、access/i18n 作用域栈等约定，不引入新渲染模型。

- `vTreeTable`：树形数据的扁平表格，行缩进 + 展开/折叠 + 选中联动，与 `vTree` 的节点语义一致。
- `vConfirm`：命令式确认弹窗，包装 `vDialog`，支持确定/取消回调、危险态、loading 确认与 SSR 安全。
- `Context`：通用作用域注入原语，复刻 i18n/access 的「scope 栈 + 构建期捕获 + 就近覆盖 + SSR 每请求隔离」模式。
- `devtools`：可注入的开发期钩子，默认关闭、零运行时开销，暴露视图树快照与更新事件。
- `无障碍`：focus-trap、键盘导航、aria 管理的标准原语，组件按需接入，配套交互契约测试。
- `i18n 纵深`：在现有 `I18n` 上扩展复数/ICU 占位、`Intl` 数字日期格式化、懒加载 locale 注册与语言探测器。

## User Stories

### vTreeTable

1. 作为页面作者，我想传入树形数据渲染带缩进的表格，以便层级信息在列中并列展示。
2. 作为页面作者，我想点击行首图标展开/折叠子树且 DOM 不重建，以便状态与焦点不丢。
3. 作为页面作者，我想节点选择与父/子联动（选中祖先联动后代），以便批量操作语义正确。
4. 作为页面作者，我想懒加载子树，以便组织/字典这类大层级按需加载。
5. 作为页面作者，我想树表在 SSR 输出确定且可 hydrate，以便与服务端渲染共存。

### vConfirm

6. 作为页面作者，我想用 `vConfirm({ ... })` 一步弹出确定/取消，以便删除等危险操作一致化。
7. 作为页面作者，我想确认按钮支持 loading 与危险态，以便异步删除不重复提交。
8. 作为页面作者，我想回调收到确认结果并可链式，以便页面流程简洁。
9. 作为页面作者，我想 `vConfirm` 在 SSR 下不渲染（纯客户端命令），以便服务端输出不含浮层。

### Context

10. 作为页面作者，我想用 `withContext(provider, build)` 注入「当前用户/门店/品牌主题实例」等跨层数据，以便任意深度的组件就近读取。
11. 作为页面作者，我想子节点就近覆盖祖先 Context，以便局部差异化而不用层层传参。
12. 作为组件作者，我想在构建期捕获 Context 并随渲染生效，以便组件与 SSR 保持同一套作用域。
13. 作为 SSR 使用方，我想入口 `options.context` 按请求注入且不跨请求共享，以便与 i18n/access 同构。

### devtools

14. 作为调试者，我想在开发期看到当前视图树快照，以便快速定位节点/组件结构。
15. 作为调试者，我想查看节点更新事件（属性/子项/销毁），以便追踪一次交互改了哪里。
16. 作为库作者，我想 devtools 默认关闭、按需 enable，以便生产零开销。
17. 作为使用者，我想 devtools 钩子不影响 SSR 与既有版本行为，以便可安全接入浏览器扩展。

### 无障碍

18. 作为视障用户，我想对话框/浮层获得 focus-trap 与正确 `role/aria-modal`，以便键盘循环在弹层内、Esc 关闭。
19. 作为键盘用户，我想菜单/表格/树/标签页支持方向键导航，以便不依赖鼠标。
20. 作为屏幕阅读器用户，我想动态区域（toast/loading）用 `aria-live` 正确播报，以便状态变化可感知。
21. 作为组件作者，我想复用 focus-trap 与键盘原语，以便新组件默认具备基本可访问性。
22. 作为维护者，我想有契约测试守卫 a11y 结构，以便回归不倒退。

### i18n 纵深

23. 作为多语言使用者，我想引用带复数的好消息，以便英文 `1 day / 2 days`、中文无复数时回退正确。
24. 作为使用者，我想数字/日期按 locale 用 `Intl` 格式化，以便 `1000`、`2026-09-03` 随语言呈现。
25. 作为使用者，我想按需注册 lazy locale，以便首屏不加载全部词典。
26. 作为 SSR 使用方，我想语言探测（cookie/header/url）已有基础，以便配合新能力稳定输出同构 HTML。

## Implementation Decisions

> 以下只描述模块/接口/架构决策，不给定具体文件路径。

### 组件分片

- **vTreeTable（data-display 模块）**：树形数据归一为「扁平行 + parent/children 关系」，渲染沿用表格列配置；`expandable` 状态树为「key → 是否展开」，展开/折叠只更新对应子树可见性，复用节点身份。选择联动复用 vTree 的父子语义（半选、全选、父联动）。
- **vConfirm（feedback 模块）**：命令式导出，内部包装 `vDialog` + 焦点管理；`open/close` 返回 Promise（resolve 确认/取消），danger 态走主题 token，确认支持 loading。SSR 下打开调用返回 `null`/空操作、不输出 DOM。

### 基础能力分片

- **Context（core 模块）**：复用 i18n/access 的「作用域栈 + 构建期捕获 + `withXxx(scope, build)` + `currentXxx()`」模式，新增通用 `withContext(providers, build)` 与 `currentContext(key)`，支持就近覆盖与嵌套；SSR 入口新增 `options.context` 每请求注入，与 i18n/access 走同一 `scopeBuild`。
- **devtools（core/可选入口）**：提供可注入的 `devMode` 钩子（视图树快照、节点 commit 事件、destroy 事件），通过环境标志或显式 `enableDevtools()` 开启；默认关闭、不引入任何依赖、不加入生产主入口（按需从独立入口导入）。输出为可被浏览器扩展订阅的同步事件流，不做持久化。
- **无障碍（core/组件）**：新增 focus-trap 与键盘导航原语（主动管理 `tabindex`、循环、恢复焦点），浮层组件接入 `role/aria-modal/aria-labelledby` 与 Esc 关闭；动态区域统一走 `aria-live`。原语对所有组件可选接入，不对现有 API 破坏性改动。
- **i18n 纵深（core/i18n 模块）**：扩展 `I18n` 的解析——插值支持复数/ICU 风格占位与 `Intl` 数字/日期格式化回调；新增 `registerLocale(name, loader)` 懒加载并 `subscribe` 后在注册完成时刷新文本节点；语言探测复用现有 `resolveLocale`，无破坏性 API 变更（新增选项而非改语义）。

### 交叉约束

- 所有新组件/能力必须符合既有契约：`yoya-*` 类名族、`data-*` kebab 状态、`@layer` 层内预设、主题 token、`replaceClassName` 可剥离。
- 组件演示走「源码演示」规范（demo 与页面壳分离、复用 `ComponentSource`、`.s()` i18n 快捷、single-file 内聚），并接受 demo-readability 自动检查。
- SSR 确定性：任何新能力渲染路径 DOM-free、只依赖请求输入，不读 `document/window`，不用 `Date.now()/Math.random()` 影响输出；id 走 `allocateId`。

## Testing Decisions

- **测试缝（尽量少/最高）**：优先走公共 API（从入口导入组件/方法，断言 `renderDom`/`toHTML`/事件/状态变化），不测私有字段与内部缓存——现有组件测试、i18n-ssr 测试、access 测试是同类先例。
- **vTreeTable**：展开/折叠不重建 DOM（保留输入/焦点）、父子选择联动、懒加载子树、SSR 确定性；先例见 vTree/table 测试与 `ssr-components` 冒烟。
- **vConfirm**：确认/取消回调与 Promise、danger/loading 态、SSR 打开返回空且 `toHTML` 不含浮层；先例见 vDialog/feedback 测试。
- **Context**：作用域嵌套与还原（`withContext` 内/外读取不同）、就近覆盖、`options.context` 每请求隔离（复制 i18n-ssr 的每请求模式）；先例见 i18n-ssr / access 测试。
- **devtools**：默认关闭、enable 后能收到 commit/destroy 事件、不影响正常渲染路径；先例见核心事件/生命周期相关测试。
- **无障碍**：focus-trap 循环与恢复、方向键导航、`aria-modal/aria-live` 结构断言；先例见 className/结构契约测试的思路，新增 a11y 契约测试。
- **i18n 纵深**：复数/ICU 占位解析、`Intl` 格式化随 locale 变化、懒加载后文本节点刷新、SSR 每请求确定性；先例见 i18n 与 i18n-ssr 测试。

## Out of Scope

- 不改底层「无虚拟 DOM / 直接建真实节点」模型；虚拟列表只复用现有 `vScroll.virtualize`，不重写通用渲染器。
- 无障碍首轮不含：RTL、语音/读屏深度定制、第三方 a11y 运行时（如 inert polyfill 之外的完整方案）。
- devtools 首轮不含：状态时间旅行、跨会话持久化、React DevTools 级 UI；只提供可订阅钩子。
- i18n 纵深首轮不含：完整 ICU MessageFormat 兼容、动态语言热替换的破坏性重构——只做增量扩展。
- 不引入 React/Vue/Web Components 互操作层；不做小程序/跨端渲染。

## Further Notes

- 各分片建议按 `vConfirm > 无障碍原语 > Context > vTreeTable > devtools > i18n 纵深` 的顺序推进（先补地基，再叠组件），但顺序可按团队优先级调整。
- 每个分片单独配契约测试与「源码演示」，合入需 `lint / typecheck / format / test` 全绿。
- 项目当前未接入 issue tracker；本 spec 先以文档形式沉淀。接入后可按 read-out 拆成独立 issue，各自打 `ready-for-agent` 标签发布实施。
