# 响应式引擎生产评审反馈

本页回应一份外部「生产影响评审」对 yoya-ui 响应式引擎提出的 7.5 个关键问题：
区域重建、信号传播、computed 菱形、列表协调、错误边界、过渡与 KeepAlive、
hydration 失配诊断。每条结论都以源码与测试为依据，其中信号传播与菱形两条
另做了可复现实验验证；回应同时区分**基础库方案问题**（core 语义 / 协议）与
**组件方案问题**（上层组件实现选择），两层欠账分开记账。

一句话版本：**「重建即弃建」是显式协议且解法齐备——值绑定、谓词、预制节点
挂载，或干脆不用 rebuildable、以 style / attr 动态值控制显隐；「收养式局部协调」
是 vDOM 为隐式身份发明的机制，纯 JS 模式身份由句柄显式持有，无需额外处理。
computed 菱形由引擎天然支持；keyed 列表理应如此；错误回滚没有魔法，报错位置就是业务代码位置。真正的
欠账收窄为：组件层的同步渲染 ErrorBoundary 与基础库层的跨信号重建合并；页面缓存由 RouterViews 天然提供，异步场景错误用 `vDynamicLoader` 即可。**

## 逐条结论

| #   | 问题               | 层级                             | 结论                                                                        | 解决方案                                                                                                                                      | 依据                                                                                                               |
| --- | ------------------ | -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | 区域重建 DOM 身份  | 基础库                           | 弃建。子树整体重建、不收养；宿主元素身份保留                                | 值绑定原地更新；谓词延迟重建；预制节点挂载；**放弃 rebuildable：style / attr 动态值控制显隐**，身份天然保持                                   | [node.js](../../src/core/node.js)、[region-flush.test.js](../../src/core/region-flush.test.js)                     |
| 2   | 信号传播语义       | 基础库                           | 同步级联；`batch()` 不合并「同一区域订阅的多个信号」的重建                  | 短期：一次事件里合并写点 / 用 batch 避免中间态；根治：区域 pending 去重（同批次只重建一次）                                                   | 实验验证 + [engine.test.js](../../src/core/signals/engine.test.js)                                                 |
| 3   | computed 菱形      | 基础库                           | 不是问题：菱形一致性由内置引擎天然支持（实验验证）                          | 直接用 `computed` 组合菱形依赖，无需额外处理                                                                                                  | 实验验证 + [engine.js](../../src/core/signals/engine.js)                                                           |
| 4   | 列表协调语义       | 基础库（设计如此）               | 不是缺陷：JS 循环 / 判断就是 v-for / v-if，keyed 原语齐备，策略由开发者决定 | `addChild(key, node)` / `getChild(key)` / `removeChild(key)` 增量增删；预制节点挂载保身份；`vTable` 整体重建是组件自身实现选择，不是库缺口    | [keyed-child.test.js](../../src/core/keyed-child.test.js)、[state-node.js](../../src/examples/demos/state-node.js) |
| 5   | 错误边界与恢复     | 组件层缺组件，基础库已有回滚原语 | 无 ErrorBoundary 组件；区域 rebuild 失败回滚保留旧内容                      | 基础库：区域回滚直接用（报错位置即业务代码位置）；异步错误用 `vDynamicLoader`（error 态 + retry）；剩余缺口：同步渲染意外异常的 ErrorBoundary | [beginner-feedback.zh-CN.md](beginner-feedback.zh-CN.md) §31                                                       |
| 6   | 过渡与页面缓存     | 组件                             | `vTransition` 有（保身份 show/hide）；页面缓存由 `RouterViews` 天然提供     | 过渡用 `vTransition`；页面缓存用 `vRouterViews`（标签保持 + localStorage 持久化 + 刷新恢复）；DOM 保活用预制节点显隐                          | [transition.js](../../src/effects/transition.js)、[router.js](../../src/router/router.js)                          |
| 6.5 | hydration 失配诊断 | 基础库                           | 有 devtools 事件可定位；生产静默替换                                        | 开 `enableDevtools()` 订阅 `hydrate-mismatch`（expected/existing + 节点引用）；改进：dev 默认 console 警告 + DOM 路径                         | [hydrate-mismatch.test.js](../../src/core/hydrate-mismatch.test.js)                                                |

## 1. 区域重建：明确「弃建」协议，解法齐备（基础库层）

`rebuildable()` 区域的 `rebuild()` 会**清空子节点并重跑 setup**：旧子树进入待销毁
队列，新子树重新构建，成功后才替换 DOM；构建失败则回滚保留旧内容。区域宿主
元素自身的身份保留，但**子树内任何元素身份都不保留**——焦点、光标、选区、
内部滚动、iframe、媒体播放、CSS 过渡、挂在元素上的第三方实例全部随重建丢失。

这不是实现疏漏，而是写进文档的显式协议（[component-authoring.zh-CN.md](../component-authoring.zh-CN.md)
§6.1），并被 [region-flush.test.js](../../src/core/region-flush.test.js) 锁定：
`flush()` 后元素身份不变、`rebuild()` 后身份改变。

标准解法（同一协议内，按场景选用）：

- **值绑定原地更新**：signal 句柄传进 `attr()/style()/vText()`，写入后只改值
  不重建 DOM、不丢焦点；
- **放弃 rebuildable，用动态值控制显隐**：结构不变、只是显示 / 隐藏变化的场景，
  直接 `style('display', signal)` / `style('visibility', signal)` /
  `attr('aria-hidden', signal)`——节点身份天然保持，动画与焦点不中断，这是
  非模板组件最直接的解法，完全没有必要为此做额外的重建处理；
- **谓词延迟**：`rebuildable(predicate)` 为假时只 flush 值绑定、结构保持原样；
- **预制节点挂载**：需要保身份的节点先在区域外创建（拿到 ViewNode 句柄），
  再挂进主结构——身份跟着句柄走，与结构重跑解耦；
- **结构边界外置**：播放器、第三方实例等长生命周期内容放在区域之外。

**生产影响认定不成立（换形态）**：焦点、动画等确实随「弃建」丢失，但这是协议
显式声明的代价，且上面的解法覆盖了全部实际场景——值保身份、显隐走动态
style / attr、长生命周期内容外置或预制挂载。「收养式局部协调」是 vDOM diff
为保住**隐式身份**被迫发明的机制：模板框架里节点身份只能靠树比对推断，丢了
比对就丢身份，所以必须 diff 收养；纯 JS 模式下身份由 ViewNode 句柄**显式持有**，
保身份就是继续用同一个节点改值——不需要任何额外处理。

## 2. 信号传播：同步级联，`batch()` 合并不了跨信号的区域重建（基础库层）

默认引擎是内化的 @preact/signals-core（[engine.js](../../src/core/signals/engine.js)），
写入**同步**传播，没有自动微任务批处理。实验验证（devtools region 事件计数）：

- 区域同时订阅 `a`、`b` 两个信号，一次事件处理器里连续写两个信号 → **重建 2 次**；
- 包进 `batch(() => { a.value = …; b.value = …; })` → **仍然是 2 次**。

原因在实现结构：区域对每个依赖信号各建**一条独立订阅**
（`subscribeRegion()` 逐源 `trackedSubscribe`），而引擎的 batch 只把
「同一信号的多次写入」合并为一次通知（[engine.test.js](../../src/core/signals/engine.test.js)
锁定），不会跨信号去重同一个 `rebuild()`。`batch()` 的真实收益是：通知推迟到
批结束时，第一次重建读到的已是全部终值，**不会提交中间态**——但第二次重建是
纯冗余，仍然整树重跑。

**解决方案**：短期把一次事件里的多个写点收进一个处理函数并包 `batch()`（至少
消除中间态提交）；根治在区域侧加 pending 去重——同批次内多次触发只重建一次。
DevTools 的 `region` 事件（`trigger: 'signal'`）可直接计数验证改进效果。

## 3. computed 菱形：由引擎天然支持，当前没有此问题（基础库层）

实验验证 A→(B,C)→D 菱形：`a` 变更后，`d` 的订阅者**只收到一次终值**，没有中间
值。一致性由内置引擎**天然支持**：效果通知分代调度——B / C 的重算先跑，D 的
效果排在其后，求值时两个输入都已是新值。这不是需要使用者绕开的边界，而是
引擎当前直接提供的行为。

**解决方案**：直接用 `computed` 组合任意菱形依赖即可，无需额外处理——一致性
由引擎保证。派生链可任意分层（惰性求值 + 缓存），下游绑定与区域只读终值。

## 4. 列表协调：纯 JS 模式下理应如此，不是欠账

先纠正评审的前提：它预设了「框架必须内建 keyed diff / move」——那是模板 +
vDOM 框架的问题，因为模板把「结构如何随数据变化」藏进了框架，协调语义只能
由框架猜测。yoya 是纯 JS 声明式构建：

- **JS 的 `forEach` / `map` 循环就是 v-for**，`if` / 三元就是 v-if——结构怎么变，
  代码就怎么写，没有隐藏语义；
- **基础库已提供子节点操作原语**，怎么操作由开发者决定：
  `addChild(key, node)` 挂载并登记 key、`getChild(key)` 复用、
  `removeChild(key)` 删除单个子节点并销毁。key 唯一性校验、`data-row-key`
  镜像、DOM 身份保留均被 [keyed-child.test.js](../../src/core/keyed-child.test.js)
  锁定；区域重建时 keyed 子节点重跑不报重复 key（[region.test.js](../../src/core/region.test.js)）。

**keyed 的标准用法（纯 JS 方向设计，不引入模板语法）**：

```js
const list = div();
const row = div((line) => line.text('第一行')); // 预制节点：句柄在手

list.addChild('r1', row); // 挂载进主结构，身份由 ViewNode 句柄持有
list.getChild('r1'); // 复用
list.removeChild('r1'); // 删除单个子节点（增量，不碰兄弟）
```

「预制节点挂载」是保身份的正解：节点先创建、句柄先持有，再挂进主结构——
节点身份跟着 JS 对象走，与声明位置解耦。这套用法在演示与测试中都有体积：
`StateKeyedExample1`（[state-node.js](../../src/examples/demos/state-node.js)）演示
追加 / 移除的完整交互，`definition-complex.js` 用 `task.id` 做 key 组装任务行，
core 侧 keyed / region / devtools 测试均覆盖。

组件现状只是各自的实现选择，不是库缺口：`vTable.rows()/data()` 清空重建
（[table.js](../../src/data-display/table.js)）是该组件「简单数据驱动优先」的选择；
`tree-table` 展开/折叠保留行元素身份，证明组件需要身份时随时可以用同一套
原语自管。要不要增量渲染，属于组件各自的取舍。

**生产影响认定不成立（旧直觉化石）**：排序 / 过滤丢状态的场景，是因为把可变
列表放进了 `rebuildable()` 区域任其整树重跑；按库的设计用法——循环里
`addChild/removeChild` 增量协调、或预制节点挂载保身份——问题不存在。
文档动作：给 Vue / React 背景开发者补映射表（`v-for` ↔ `forEach/map` +
`addChild(key)`、`v-if` ↔ `if` / 三元），说明「协调策略属于业务代码」。

## 5. 错误边界：组件层缺组件，基础库回滚没有魔法

这条在 [beginner-feedback.zh-CN.md](beginner-feedback.zh-CN.md) §31 已列为真缺失，
但要分三层看，已有的解法比「无 ErrorBoundary」的印象多得多：

- **基础库层（已有）**：区域 `rebuild()` 先构建成功再替换，构建抛错自动回滚、
  旧内容保留（[node.js](../../src/core/node.js) 的 catch 路径）。**没有魔法**——
  rebuild 重跑的就是使用方写的 builder，异常从业务代码里抛出、原样 re-throw，
  报错位置（stack）就是业务代码位置，库不做包装或吞错。
- **异步组件（已有标准解法）**：异步数据 / 动态加载场景的错误展示不需要
  ErrorBoundary——`vDynamicLoader` 内建 loading / error 状态、`retry()` 与竞态
  代守卫（generation），错误就是组件状态的一部分，走正常 UI 流转
  （[dynamic-loader.js](../../src/async/dynamic-loader.js)）；`echart` / `three`
  也在各自内部 try/catch 降级。
- **组件层（剩余缺口）**：同步渲染期的**意外**异常（初始构建、非区域节点抛错）
  仍会冒泡白屏，没有通用隔离层。

**解决方案**：区域内的可恢复更新直接依赖 rebuild 回滚（异常即业务异常，定位
零成本）；异步场景优先用 `vDynamicLoader` 把错误纳入状态流（loading / error /
retry 都是正常 UI）；剩余的同步渲染意外异常才需要 ErrorBoundary——捕获子树
构建异常、渲染降级 UI、支持重试，页面级兜底在此之前是使用方职责。

## 6. 过渡与页面缓存：vTransition + RouterViews 已覆盖（组件层）

`vTransition`（[transition.js](../../src/effects/transition.js)）是**保身份**的
show/hide 过渡：同一元素切 enter/leave class（或 WAAPI），尊重
`prefers-reduced-motion`，SSR `toHTML()` 安全，`destroy()` 取消动画。因为它靠
`display` 切换而不是销毁节点，`motion: 'always'` 模式可当轻量保活用。

**页面缓存由 `RouterViews` 天然提供**（[router.js](../../src/router/router.js)）：
`vRouterViews` 是多标签工作区——打开的页面以标签保持，切换不关闭；标签列表
（`paths`）与激活页（`activePath`）持久化到 localStorage（`persist` 默认开启，
可配 `storageKey`），刷新后 `restoreTabs` 恢复整个工作区；配合路由
query / params，列表筛选状态编码在 URL 里随标签保留，回到标签即回到同一数据
视图。后台系统「列表页缓存」的刚需由此覆盖，无需专用 KeepAlive 组件。

DOM 级保活继续用第 1 条的纯 JS 标准解法：预制节点持有句柄 + 动态
style / attr 显隐。

当前边界（如实）：无列表 move 过渡组件（TransitionGroup）、无跨内容切换过渡
（out-in 等）；区域重建会中断区域内动画（第 1 条弃建协议的直接后果）。

**解决方案**：过渡用 `vTransition`；页面缓存直接用 `vRouterViews`；DOM 级保活
用预制节点 + 显隐控制。

## 6.5 hydration 失配：有可观测性，DX 中等（基础库层）

`hydrate()` 是收养式：`adoptElement` 逐节点对齐服务端 DOM，匹配则收养（不重建
元素），失配（标签 / 节点类型不一致）则 `replaceExisting` 替换节点并上报
`hydrate-mismatch` devtools 事件——带 `expected` / `existing` 可读名
（如 `div` vs `span`、`#text` vs `em`）与 ViewNode 引用。事件只在 devtools
开启时上报，生产路径零开销、静默替换。

[hydrate-mismatch.test.js](../../src/core/hydrate-mismatch.test.js) 覆盖：标签失配、
文本槽失配、匹配时保持安静——「半题」里说「有测试保确定」属实。

**解决方案**：开发期开 `enableDevtools()` 订阅事件拿节点引用定位；改进方向是
dev 下默认 console 警告并输出 DOM 路径 / 两侧片段。

## 改进 backlog（按层级与严重级排序）

**基础库层**：

1. **P0 区域重建合并**：同批次多信号触发只重建一次（严重，协议层小改）；

2. **P2 hydration 失配 DX**：dev 下默认 console 警告 + DOM 路径输出（中等）。

**组件层**：

1. **P0 ErrorBoundary**：页面级 / 组件级错误边界节点，异常隔离 + 降级 UI（致命）；
2. **P2 TransitionGroup**：列表 move 过渡组件（中等）。
