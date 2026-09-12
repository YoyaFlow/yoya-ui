# 初级开发者 Feedback 质疑清单（44 问三分类复盘）

本页回应一份外部「初级开发者视角」的 44 问质疑清单：提问者只用过 Vue / React，
第一次接触 yoya-ui。问题原文保持原始状态未做筛选——每一处旧框架直觉的落空，
本身就是文档需要提前拆掉的雷。

一句话版本：**44 问里没有一问否定库的可行性——5 问是拿旧框架机制硬套新模型，
33 问是能力存在但缺一张「概念映射表」，6 问是真缺失；其中最锋利的一把刀是
`rebuildable()` 的声明顺序：写反了不报错、静默失效。**

## 分类图例与统计

- **① 旧直觉化石**：问题不成立（拿 Vue / React 的机制来质问 yoya-ui），但雷是真的，文档要主动拆。
- **② 换形态**：能力存在、形态不同，需要映射表把旧概念接到新写法上。
- **③ 真缺失**：能力或文档确实没有，诚实承认，给缓解方式与 roadmap 归属。
- 另有 4 个 ② 类问题附带「轻度缺失」标注（19 / 30 / 39 / 43），计入 ② 不计入 ③。

| 分类         | 题数 | 题号                                     |
| ------------ | ---- | ---------------------------------------- |
| ① 旧直觉化石 | 5    | 3, 7, 8, 40, 44                          |
| ② 换形态     | 33   | 其余（19 / 30 / 39 / 43 带轻度缺失标注） |
| ③ 真缺失     | 6    | 20, 23, 27, 31, 41, 42                   |

优先级含义：**P0** = 新手第一小时就会撞上，FAQ 必答；**P1** = 采用决策相关；
**P2** = 有则更好。每题末尾的 `☐` 是文档改进 backlog 的勾选框。

## 一、打开文件第一眼（心智模型冲击）

### 1. 为什么没有 `<template>`？HTML 结构写在哪里？满屏的 `div((node) => {...})` 是什么东西？

- 分类：②
- 现状：setup 回调就是模板——`div((node) => { node.p('内容') })` 在内存里构建 ViewNode 树，结构与 HTML 一一对应，README「不需要学新语法」一节有逐行对照。
- 文档动作：quickstart 首屏放「同一页面的 HTML 写法 ↔ 声明式写法」对照表链接。
- 优先级：P0 ☐

### 2. 为什么不用 JSX？没有 JSX 的话语法高亮、自动补全怎么办？

- 分类：②
- 现状：无构建依赖是特性不是妥协。高亮就是普通 JS 高亮；补全走完整 d.ts（`types/`，回调 `node` 参数与方法全部有类型，消费方类型测试锁定），Prettier / ESLint 直接可用。
- 文档动作：FAQ 说明「编辑器体验现状：类型补全 ✓、Prettier ✓、无需专用插件」。
- 优先级：P1 ☐

### 3. 虚拟 DOM 在哪里？没有 diff 的话，状态变了它怎么知道该更新哪个节点？

- 分类：①
- 现状：不需要 diff。更新有两种精确粒度：值绑定 flush（signal 句柄传进 `attr()/style()/props`，值未变时连 DOM 都不碰）与区域 rebuild（`rebuildable()` 子树整片重跑）。每次更新为什么发生，devtools 的 region 事件带 trigger 可查。
- 文档动作：highlights §4 增补「无 vdom 时更新如何定位」FAQ。
- 优先级：P0 ☐

### 4. `ref` 为什么到处都要 `.value`？漏写会怎样，会不会静默不更新？

- 分类：②
- 现状：`ref/computed/batch` 与 Vue 概念同源（引擎为 vendored @preact/signals-core，适配层隔离）。绑定位置传句柄是特性——`attr('value', ref)` 即活绑定；在 `computed(() => count.value)` 里漏写 `.value` 会拿到句柄对象，字符串拼接会立刻显形（不是静默），devtools 的 signal-write 事件可查依赖数。
- 文档动作：新增「何时必须 `.value` / 何时直接传句柄」对照表。
- 优先级：P0 ☐

### 5. `v-if` 和 `v-for` 在哪？条件渲染和列表循环到底怎么写？

- 分类：②
- 现状：条件 = 把分支放进 `rebuildable()` 区域内用 `if` / 三元；循环 = setup 里 `map` 生成子节点，或 `vTable` 的 `rows()/data()` 数据驱动。
- 文档动作：quickstart 增设「Vue 模板指令 ↔ yoya 写法」映射表（v-if / v-for / v-show / v-model）。
- 优先级：P0 ☐

### 6. `v-model` 呢？没有双向绑定，表单输入框怎么搞？

- 分类：②
- 现状：表单收集走 `vForm` + 控件 `name()` → `form.values()` / `validate()`，提交时一次取全；输入实时写状态用 `on('input')` 写回 ref；控件属性位置传 signal 句柄即单向活绑定，写回由显式事件处理器负责（写回路径可见）。
- 文档动作：forms 文档头部加「从 v-model 迁移」一节。
- 优先级：P0 ☐

### 7. 这是不是就是 jQuery 换了个写法？直接操作 DOM 不是违反了"最佳实践"吗？

- 分类：①
- 现状：DSL 描述结构、区域随数据重建、事件与清理由节点托管（`destroy()` 自动解绑）；`renderDom()` 创建元素是节点引擎的唯一职责，组件代码直接操作 `document` 是被库纪律禁止的（`bindDocumentEvent` / `bindWindowEvent` / `injectDocumentStyle` 收口）。
- 文档动作：highlights §4 补一句「声明式描述结果 ≠ 命令式操作过程」。
- 优先级：P1 ☐

### 8. 没有虚拟 DOM，性能不会很差吗？

- 分类：①
- 现状：恰恰相反——省掉了 diff 全树对比。值级更新 `Object.is` 幂等（值不变不碰 DOM，输入框光标不受扰）；区域重建是局部子树、构建失败自动回滚；长列表用 `vScroll` 虚拟滚动。
- 文档动作：FAQ 增「性能口径」条目，引用 devtools region 事件自证更新范围。
- 优先级：P1 ☐

## 二、组件与通信（误解重灾区）

### 9. 子组件的 props 在哪？把整个 state 对象直接传给子组件，子组件想改就改，不会失控吗？

- 分类：②
- 现状：组件即工厂 / 对象：工厂参数与链式方法就是 props，状态在闭包里，对外只暴露作者定义的方法。「想改就改」不存在——子组件拿不到调用方的 ref，除非显式传入可写句柄，而那是显式授权。
- 文档动作：component-authoring 增「props 对应物：参数 + 方法 API」小节。
- 优先级：P1 ☐

### 10. 子组件怎么通知父组件？没有 `$emit`，没有 `onChange` 回调 props？

- 分类：②
- 现状：回调即协议：`vButton('保存', (btn) => btn.on('click', fn))`；自定义组件在工厂参数里收 `onXxx` 回调或暴露事件方法。普通 JS 函数调用，不需要 `$emit` 这类运行时协议。
- 文档动作：映射表加一行「$emit / onChange props ↔ 回调参数」。
- 优先级：P1 ☐

### 11. 跨了好几层的组件要共享状态怎么办？没有 `provide/inject`，没有 Context？

- 分类：②（文档缺失）
- 现状：对应物存在且已导出：`withContext(providers, build)` / `installContext` / `currentContext(key)`（`src/core/context.js`），权限作用域 `access()` 同样就近覆盖。缺的是面向使用者的文档。
- 文档动作：新增 context 使用文档（当前只有 API 无文档）。
- 优先级：P1 ☐

### 12. 组件标签写法呢？DevTools 里看不到组件树，这还是组件化吗？

- 分类：②
- 现状：工厂函数即组件（PascalCase 业务组件 / `vXxx` 库组件）。`enableDevtools()` 后有 signal-write（谁变了、旧值新值、dependents 数）与 region rebuild/flush（trigger 来源）事件，另有 inspector 演示页。
- 文档动作：devtools 文档补「组件树视角」一节。
- 优先级：P1 ☐

### 13. slot / children 怎么传？我想写一个卡片包装组件，往里面塞任意内容？

- 分类：②
- 现状：`child()` 接受 ViewNode、组件对象、字符串 / 数字任意混排；包装组件在工厂参数收 children 或 setup 里 `child()`；`vCardBody` 这类快捷方法就是具名 slot 的对应物。
- 文档动作：component-authoring 的 children 契约已冻结，FAQ 指路即可。
- 优先级：P1 ☐

### 14. 为什么组件还分"形态 A / 形态 B"？React 函数组件和 class 组件那套我还没理清，怎么又来两个形态？

- 分类：②
- 现状：三形态（薄工厂 / 对象组件 / 类节点）是同一模型的三个封装层级、按复杂度递进，不是流派之争；契约冻结在 component-authoring 文档，业务组件默认形态 B。
- 文档动作：component-authoring 开头补一张「什么时候用哪个形态」决策表。
- 优先级：P2 ☐

### 15. 逻辑复用怎么办？没有 composables 命名约定、没有自定义 hooks？

- 分类：②（文档缺失）
- 现状：composable 的对应物就是「返回 refs + 方法的普通函数」（demo `StateCounterExample` 即此模式）；确实没有 `use` 前缀这类社区约定。
- 文档动作：component-authoring 增「逻辑复用模式」小节，定一个返回值命名建议。
- 优先级：P1 ☐

### 16. 兄弟组件之间怎么通信？总不能都塞进一个 state 对象吧？

- 分类：②
- 现状：三条正路：状态上提到共同父级（ref 闭包）；`withContext` 分发；树外共享直接用 signal（模块级 store）或 `installSignals` 接外部 store 引擎。
- 文档动作：并入 context / 状态管理文档举例。
- 优先级：P2 ☐

## 三、响应式细节（Vue 记忆的误触）

### 17. 数组直接 `filter` 换新数组就行？不用担心下标赋值侦测不到？

- 分类：②
- 现状：对。引擎是浅层 signal：赋值即通知，换新数组就是正确姿势，没有 `Vue.set` 问题；但原地 `push` / 下标赋值 / 成员修改**不**通知（与 preact signals 同语义），统一走不可变更新即可。
- 文档动作：响应式说明写明「浅层语义 + 不可变更新」，这条最容易从 Vue 记忆里带错。
- 优先级：P0 ☐

### 18. `computed` 依赖是怎么收集的？改一个没被视图读过的 ref 会漏更新 / 过度更新吗？

- 分类：②
- 现状：读取时收集：区域构建期读到的依赖进订阅表，没被读过的 ref 改动不触发视图（也不需要）；过度更新被三层拦住——值绑定 `Object.is` 幂等、`computed` 惰性求值 + 等值不通知、区域只订自己读过的源。
- 文档动作：与第 4 题合并进「响应式语义」FAQ。
- 优先级：P1 ☐

### 19. `watch` / `watchEffect` 对应什么？

- 分类：②（轻度缺失）
- 现状：`signal.subscribe(listener)` 是底层订阅（不自动跑首次）；区域本身就是视图版 watchEffect；副作用模式 = `subscribe` + `registerRegionCleanup`。缺一个 `watch(() => …, cb)` 便捷封装。
- 文档动作：新增「副作用模式」小节；便捷封装列入 roadmap 候选。
- 优先级：P1 ☐

### 20. `reactive` 呢？为什么全是 ref，是不是不支持对象响应式？

- 分类：③
- 现状：没有深层 proxy `reactive`，这是刻意取舍（依赖语义必须与引擎无关，见 `src/core/signals/engine.js` 注释）。对象可以放进 ref（浅层）；推荐拆字段 ref + `computed` 派生；需要 store 形态可 `installSignals` 换外部引擎。
- 文档动作：FAQ 诚实条目「为什么没有 reactive」+ 推荐姿势示例。
- 优先级：P1 ☐

### 21. `key` 呢？列表重建不需要 key 吗？不怕有状态子节点被销毁重建吗？

- 分类：②
- 现状：key 机制存在：`addChild(key, child)` 带唯一性校验并镜像 `data-row-key`（keyed-child 测试锁定）。但要诚实：区域 rebuild 是整片替换（旧子树销毁），输入焦点等 DOM 态不跨重建保留——保活策略是把动态值放绑定位置（只刷值不重建），或用谓词门控跳过本次重建。
- 文档动作：新增「状态什么时候会丢 / 不会丢」FAQ，这条直接影响写法选择。
- 优先级：P0 ☐

### 22. 列表更新为什么走整片区域重建，而不是 vdom diff？列表有 5000 个节点怎么办？

- 分类：②
- 现状：区域重建成本 = 该子树大小，不随页面总节点数增长；5000 行不该全量渲染——`vScroll` 虚拟滚动（data-display 已导出）+ `vTable` 的 `rows()/data()` 数据驱动。
- 文档动作：性能 FAQ 引用 vScroll 用例。
- 优先级：P1 ☐

### 23. `rebuildable()` 那句"先调用再读数据"是什么意思？顺序写反了会怎样？

- 分类：③
- 现状：最尖锐的真雷。依赖捕获从 `rebuildable()` 声明那一刻开始（`beginCollect`），先读后声明的依赖不在捕获范围内 → 不订阅 → 数据变了不重建，**不报错、静默失效**。排查手段：`enableDevtools()` 的 region 事件（为什么这次只是 flush 不是 rebuild）与 signal-write 的 dependents 数。
- 文档动作：API 文档对「先声明再读数据」加粗警告 + devtools 排查指南 + FAQ 单列一条；中期可考虑 dev 模式下对「区域构建期读到但未捕获」的依赖给 console 提示。
- 优先级：P0 ☐

## 四、生命周期与工程化

### 24. `onMounted` / `onUnmounted` 在哪？为什么 `start()` / `destroy()` 要自己写？忘了 cleanup 会怎样？

- 分类：②
- 现状：`destroy()` 自动清理 `.on()` 事件、DOM 适配器与 `_cleanup`；文档 / 窗口级监听走 `bindDocumentEvent` / `bindWindowEvent`（随节点自动清理）；区域自持资源（定时器等）登记 `registerRegionCleanup`，重跑时自动执行上一轮清理——不登记的后果就是重跑累加，这正是该 API 存在的原因。
- 文档动作：component-authoring「清理契约」小节把「忘了会怎样」写明。
- 优先级：P1 ☐

### 25. 没有 `useEffect` 依赖数组，副作用该写在哪？

- 分类：②
- 现状：见第 19 题：`subscribe`（何时跑）+ `registerRegionCleanup`（如何清）组合即对应物；一次性初始化放组件工厂里。
- 文档动作：并入「副作用模式」小节。
- 优先级：P1 ☐

### 26. 事件修饰符呢？`.stop`、`.prevent`、`.passive`、`.once` 都要手写？

- 分类：②
- 现状：`.on(name, handler, { capture, once, passive })` 直通原生 options（同节点同事件只保留最新 handler，options 变化自动重绑）；`.stop` / `.prevent` 在 handler 里显式写 `e.stopPropagation()` / `e.preventDefault()`——显式优先于隐式协议。
- 文档动作：事件文档补 options 说明即可。
- 优先级：P2 ☐

### 27. CSS 怎么隔离？没有 scoped style、没有 CSS Modules，类名撞了怎么办？

- 分类：③（有缓解）
- 现状：无 scoped / Modules；库侧契约是 `yoya-` 前缀 BEM 类名 + `--yoya-*` token + `data-yoya-mode` / `data-yoya-density`，且有 className-contract / css-contract 测试锁定不漂移；业务样式完全自主，库不做运行时 CSS 注入。
- 文档动作：theme 文档已写类名契约，FAQ 加「为什么不需要 scoped」条目。
- 优先级：P2 ☐

### 28. 路由用什么？没有 vue-router / react-router 的对应物？

- 分类：②
- 现状：对应物存在且是独立子入口 `@yoyaflow/yoya-ui/router`：`vRouter` / `vRoute(pattern)` / `vLink` / `vRouterView` + `vRouterViews`（栈式多视图、tabs 状态持久化）；SSR 路由与 hydrate 有专门测试。
- 文档动作：README 特性列表突出 router 子入口——这份质疑清单证明「有但没人知道」等于没有。
- 优先级：P0 ☐

### 29. 全局状态管理呢？没有 Pinia / Redux / Zustand？

- 分类：②
- 现状：signals 本身就是状态层：树内共享靠闭包传 ref，树外共享靠模块级 signal；`installSignals` 适配层可接外部 store 引擎（zustand 形态，engine 注释明示该场景）。没有官方 store 便捷层，因为「跨组件可变引用」就是 signal 的第一性定义。
- 文档动作：与第 16 题合并写「状态放哪」决策树。
- 优先级：P1 ☐

### 30. 异步数据怎么发？loading、error、重试、缓存谁管？

- 分类：②（轻度缺失）
- 现状：`vDynamicLoader` 内建 loading / error 状态、`node.retry()` 与竞态代守卫（generation）；`configureRequest` / `RequestBase` 统一提交层。缓存 / 去重 / SWW 层暂无。
- 文档动作：补 async 模式文档；缓存层列入 roadmap 候选。
- 优先级：P1 ☐

### 31. 没有 ErrorBoundary，一个组件抛错是不是整个页面白屏？

- 分类：③
- 现状：无全局错误边界组件。现有缓解：区域 rebuild 构建失败自动回滚、旧内容保留（`rebuild()` 的 catch 路径）；SSR 每请求隔离，单请求异常不影响下一请求。页面级兜底（window.onerror 降级页）目前是使用方职责。
- 文档动作：FAQ 诚实条目 + roadmap 候选（页面级错误边界节点）。
- 优先级：P1 ☐

### 32. 怎么单测？没有 test-utils、没有 testing-library，断言 DOM 还是 ViewNode？

- 分类：②
- 现状：vitest + jsdom；被测对象就是普通对象和真实 DOM——断言 `renderDom()` 的元素或 ViewNode 树皆可，没有自定义渲染环境需要 mock，所以不需要 test-utils 这层皮。库自身 1000+ 用例（140 文件）就是范例。
- 文档动作：component-authoring 补「如何测试组件」小节并指向库内测试范例。
- 优先级：P2 ☐

### 33. 有 HMR 吗？改一行样式是不是整页刷新、状态全丢？

- 分类：②
- 现状：库与构建链解耦，examples 即用 vite（HMR 可用）；模块热替换后节点树随模块重建，组件树状态的保留粒度不如 Vue SFC HMR。
- 文档动作：FAQ 说明「库不管 HMR，跟你的构建走」。
- 优先级：P2 ☐

### 34. 没有 Vue/React DevTools，我怎么知道哪个信号变了触发了哪个节点更新？

- 分类：②
- 现状：对应物已内建：`@yoyaflow/yoya-ui/devtools` 的 `enableDevtools()` 输出 signal-write（signalId / previous / next / dependents）与 region rebuild / flush（带 trigger）事件，inspector 演示页可视化；docs/devtools.zh-CN.md 即为此写。
- 文档动作：devtools 文档补「排查静默失效」工作流（配合第 23 题）。
- 优先级：P0 ☐

### 35. TypeScript 类型怎么样？回调里的 `node` 是 any 吗？

- 分类：②
- 现状：不是 any。`types/` 覆盖全部子入口，`AttrValue` 等联合类型已包含 `SignalHandle` 活绑定形态；有消费方类型测试与 `npm run typecheck`，CI 门禁。
- 文档动作：README TypeScript 一节已覆盖，FAQ 指路。
- 优先级：P2 ☐

### 36. 为什么能 CDN 直接 import 就跑？生产也这么干吗？怎么 tree-shaking？

- 分类：②
- 现状：无构建与有构建都是一等公民：CDN 单文件（README quickstart 即此形态，jsdelivr）、npm ESM 分模块入口（天然 tree-shaking）、UMD、单 CSS 主题文件；`verify:dist` 在 CI 做体积预算门禁。生产可 CDN 也可 self-host dist。
- 文档动作：README Build output 一节已覆盖，FAQ 指路。
- 优先级：P1 ☐

### 37. SSR 支持吗？有真实案例吗？SEO 怎么办？

- 分类：②
- 现状：`renderToString` / `hydrate` / `createPage(requestState)` 同构一套代码，每请求 i18n 与权限实例化，router SSR / hydrate 有测试；`dist/examples/ssr-demo.html` 是发布产物里的真实案例；SSR 输出完整可爬 HTML。
- 文档动作：docs/ssr.zh-CN.md 已覆盖，FAQ 指路并强调 demo 产物路径。
- 优先级：P0 ☐

## 五、上手与"敢不敢用"（信任层）

### 38. 组件库在哪？表格、表单、弹窗、日期选择器去哪找？

- 分类：②（组件面有缺口）
- 现状：内置面：form（cascader / autocomplete / upload / rate / slider / tags-input / color-picker / svg-icon-picker…）、feedback（dialog / message / tooltip / confirm）、navigation（menu / tabs / breadcrumb / steps / anchor / navbar）、data-display（table / tree / tree-table / vscroll / badge / progress）、actions / async / chart（echarts）/ three。**日期选择器目前没有**，缺口与三方库接入姿势见 component-comparison.zh-CN.md。
- 文档动作：README 特性列表把组件面按分类点名；对照文档已覆盖。
- 优先级：P0 ☐

### 39. 我能在现有的 Vue / React 项目里局部用这个库吗？

- 分类：②（文档缺失）
- 现状：输出是真实 DOM、可挂任意宿主元素，island 式共存技术上可行且与宿主框架不抢渲染权；但没有官方「在 Vue / React 里用 yoya-ui」集成文档。
- 文档动作：component-comparison 已有三方库反向接入对比，补一篇「宿主共存」短文即可。
- 优先级：P1 ☐

### 40. 和原生 JS 到底差在哪？手写 DOM 加几个工具函数不也一样？

- 分类：①
- 现状：手写等于重新发明：区域响应式与值绑定、事件自动清理、SSR + hydrate、i18n、权限三态、主题 token、路由、a11y（focus trap）、1000+ 测试与契约冻结——这些是库已付清的成本。README「定位」与「为什么原生 Web」两节即为此问而写。
- 文档动作：README 已覆盖，FAQ 摘要指路。
- 优先级：P1 ☐

### 41. npm 周下载量多少？几个 stars？出 bug 提 issue 有人理吗？

- 分类：③
- 现状：早期项目、社交信号弱是事实。库里为此写了「Engineering signals」一节：0 运行时依赖、CI 徽章、测试规模、dist 门禁、公开 roadmap——用工程信号替代星数做采用判断；「冷启动」一节直接回应此问。
- 文档动作：README 已覆盖；FAQ 引用即可，不必回避。
- 优先级：P1 ☐

### 42. 就一个维护者？不维护了怎么办？

- 分类：③
- 现状：真实风险。缓解：MIT 许可、零运行时依赖（接手无供应链）、spec 驱动（design / ROADMAP 公开）、三形态契约文档冻结、核心是可读的少量 JS——fork 自持成本低于围城框架。
- 文档动作：README 冷启动一节已覆盖，FAQ 补「接手成本」具体口径。
- 优先级：P1 ☐

### 43. 有中文文档吗？视频教程呢？搜索能搜到答案吗？

- 分类：②（轻度缺失）
- 现状：中文是文档主源：README.zh-CN + docs/*.zh-CN.md 全套（导航见 docs/index.zh-CN.md）。视频教程与社区搜索生态没有。
- 文档动作：FAQ 指路文档导航页；视频教程列 roadmap 候选。
- 优先级：P1 ☐

### 44. 学这个的投入，为什么不直接学好 Vue 3？给我一个说服我老板的理由。

- 分类：①
- 现状：定位不是「替代 Vue」而是「原生 Web 的声明式扩展」——不与 Vue 二选一，概念还同源（ref / computed 心智直接迁移，引擎同属 preact signals 家族）。给老板的理由 README 已备好：0 运行时依赖、无构建可用、SSR 同构、工程信号一节。
- 文档动作：README 已覆盖；推广材料直接引用定位两节。
- 优先级：P1 ☐

## 复盘结论：文档改进 backlog

### P0（新手第一小时必撞，优先落地）

1. 新增 FAQ 页，首批收录 P0 十二问：1 / 3 / 4 / 5 / 6 / 17 / 21 / 23 / 28 / 34 / 37 / 38。
2. quickstart 增「Vue / React 概念映射表」：v-if / v-for / v-model / $emit / provide-inject / watch / slot → yoya 对应写法（覆盖 4 / 5 / 6 / 10 / 11 / 19）。
3. 「响应式语义」一节：浅层赋值通知（17）、依赖按读取收集（18）、`rebuildable()` 先声明再读数据的加粗警告与排查（23）。
4. 「状态什么时候会丢 / 不会丢」FAQ：区域整片替换 vs 值绑定保活（21）。
5. README 特性列表点名 router 与 devtools 子入口、按分类点名组件面（28 / 34 / 38）。

### P1（采用决策相关）

6. context 使用文档（11）、逻辑复用模式（15）、副作用模式（19 / 25）、async 数据模式与缓存缺口（30）。
7. 「为什么没有 reactive / ErrorBoundary」诚实条目 + roadmap 标注（20 / 31）。
8. 宿主共存短文：在 Vue / React 里局部使用（39）。
9. 组件 API 的 props 对应物与子父通信小节（9 / 10）。

### P2（有则更好）

10. 三形态决策表（14）、事件 options 说明（26）、组件测试小节（32）、HMR 口径（33）、CSS 隔离 FAQ（27）、TypeScript / 构建产物指路（35 / 36 / 2）。

### ③ 真缺失登记（进 roadmap 讨论）

- `rebuildable()` 顺序静默失效的 dev 期提示（23，最优先）
- watch 便捷封装（19）、异步缓存层（30）、页面级错误边界（31）、日期选择器（38）
- 深层 reactive：维持取舍，只补文档（20）
- 信任类（41 / 42 / 43 视频）：非代码项，按 README 口径回应
