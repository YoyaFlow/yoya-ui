# 响应式引擎生产评审反馈

本页回应一份外部「生产影响评审」对 yoya-ui 响应式引擎提出的 7.5 个关键问题：
区域重建、信号传播、computed 菱形、列表协调、错误边界、过渡与 KeepAlive、
hydration 失配诊断。每条结论都以源码与测试为依据，其中信号传播与菱形两条
另做了可复现实验验证。

一句话版本：**「重建即弃建」是显式协议且文档已写明，不是含糊其辞；真正欠账
是错误边界、跨信号的区域重建合并与 KeepAlive——7 问里 5.5 问成立，但没有任何
一问推翻引擎的可行性。**

## 逐条结论

| #   | 评审问题                  | 结论                                                                 | 依据                                                                                             |
| --- | ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | 区域重建的 DOM 身份保持   | 弃建。子树整体重建、不收养；宿主元素身份保留；值绑定原地更新保身份   | [node.js](../src/core/node.js)、[region-flush.test.js](../src/core/region-flush.test.js)         |
| 2   | 信号传播语义              | 同步级联；`batch()` 不合并「同一区域订阅的多个信号」的重建           | 实验验证 + [engine.test.js](../src/core/signals/engine.test.js)                                  |
| 3   | computed 菱形 glitch-free | 内置引擎成立（实验验证：订阅者只见终值）；适配器契约不保证该语义     | 实验验证 + [contract.js](../src/core/signals/contract.js)                                        |
| 4   | 列表协调语义              | 无自动 keyed move；手工 `addChild(key)` 保身份，`vTable` 整体重建    | [keyed-child.test.js](../src/core/keyed-child.test.js)、[table.js](../src/data-display/table.js) |
| 5   | 错误边界与恢复            | 缺失（已在新手清单 #31 承认）；区域 rebuild 失败回滚是唯一内建缓解   | [beginner-feedback.zh-CN.md](beginner-feedback.zh-CN.md) §31                                     |
| 6   | 过渡动画与 KeepAlive      | `vTransition` 有（保身份的 show/hide）；KeepAlive 与列表过渡无       | [transition.js](../src/effects/transition.js)                                                    |
| 6.5 | hydration 失配诊断        | 有 devtools 事件可定位（expected/existing + 节点引用）；生产静默替换 | [hydrate-mismatch.test.js](../src/core/hydrate-mismatch.test.js)                                 |

## 1. 区域重建：明确「弃建」协议

`rebuildable()` 区域的 `rebuild()` 会**清空子节点并重跑 setup**：旧子树进入待销毁
队列，新子树重新构建，成功后才替换 DOM；构建失败则回滚保留旧内容。区域宿主
元素自身的身份保留，但**子树内任何元素身份都不保留**——焦点、光标、选区、
内部滚动、iframe、媒体播放、CSS 过渡、挂在元素上的第三方实例全部随重建丢失。

这不是实现疏漏，而是写进文档的显式协议（[component-authoring.zh-CN.md](component-authoring.zh-CN.md)
§6.1：「重跑会清空子节点并重新执行 setup，因此区域内不保留 DOM 身份」），
并且被测试锁定：[region-flush.test.js](../src/core/region-flush.test.js) 断言
`flush()` 后元素身份不变、`rebuild()` 后身份改变。

缓解路径同样是协议的一部分：

- **值绑定原地更新**：signal 句柄传进 `attr()/style()/vText()`，写入后只改值不重建
  DOM、不丢焦点；
- **谓词延迟**：`rebuildable(predicate)` 为假时只 flush 值绑定、结构保持原样，
  重建留待 `rebuildPending()` 补齐；
- **结构边界外置**：需要保身份的输入框、播放器、第三方实例放在区域之外。

**生产影响认定成立（致命级）**：协议诚实、文档与测试齐备，但「收养式局部协调」
确实没有——重建成本恒等于区域子树大小，区域内动画与焦点必然中断。

## 2. 信号传播：同步级联，`batch()` 合并不了跨信号的区域重建

默认引擎是内化的 @preact/signals-core（[engine.js](../src/core/signals/engine.js)），
写入**同步**传播，没有自动微任务批处理。实验验证（devtools region 事件计数）：

- 区域同时订阅 `a`、`b` 两个信号，一次事件处理器里连续写两个信号 → **重建 2 次**；
- 包进 `batch(() => { a.value = …; b.value = …; })` → **仍然是 2 次**。

原因在实现结构：区域对每个依赖信号各建**一条独立订阅**
（`subscribeRegion()` 逐源 `trackedSubscribe`），而引擎的 batch 只把
「同一信号的多次写入」合并为一次通知（[engine.test.js](../src/core/signals/engine.test.js)
锁定），不会跨信号去重同一个 `rebuild()`。`batch()` 的真实收益是：通知推迟到
批结束时，第一次重建读到的已是全部终值，**不会提交中间态**——但第二次重建是
纯冗余，仍然整树重跑。

**生产影响认定成立（严重级）**：一次事件改 N 个被同一区域订阅的信号，重建次数
=N 而不是 1。DevTools 的 `region` 事件（`trigger: 'signal'`）可直接计数验证。
改进方向明确：区域侧加 pending 去重（同批次内多次触发只重建一次），或提供
`scheduleRebuild()` 微任务合批 API。

## 3. computed 菱形：内置引擎 glitch-free，契约不背书

实验验证 A→(B,C)→D 菱形：`a` 变更后，`d` 的订阅者**只收到一次终值**，没有中间
值（`seen === [终值]`）。原因是内置引擎对效果通知做分代调度：B/C 的重算先跑，
D 的效果排在其后，求值时两个输入都已是新值。

但要诚实标注边界：yoya 的 `computed` 由 core 在「原始值单元」之上自实现
（[handle.js](../src/core/signals/handle.js)），glitch-free 依赖引擎的通知顺序。
而引擎契约（[contract.js](../src/core/signals/contract.js)）只要求
`createSignal/read/subscribe/write` 四个方法——换成同步逐个通知的 store 形态
适配器（conformance 套件自带的测试适配器就是这种形态），菱形中间态没有任何
契约保证，conformance 测试也没有菱形用例。

**结论：默认引擎下评审的第 7 项协议要求成立；「换引擎语义不变」的承诺对
glitch 顺序不成立。** 建议给 conformance 套件补菱形用例，或在契约文档明确
「求值顺序语义依赖引擎调度」。

## 4. 列表协调：没有自动 keyed move，各组件各自为政

库内没有统一的列表 diff/move 层，现状分三档：

| 形态                        | 身份语义                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `rebuildable()` 内 `map`    | 整段重建：排序 / 过滤 = 子树全部新建，行内状态全丢                                                       |
| `addChild(key, …)` 手工 API | 保身份：`getChild(key)` 复用、`removeChild(key)` 增量删除                                                |
| 数据驱动组件                | `vTable.rows()/data()` 每次清空 tbody 整体重建；`tree-table` 展开/折叠保留行元素身份（测试断言同一元素） |

[keyed-child.test.js](../src/core/keyed-child.test.js) 锁定手工 keyed API：
key 唯一性校验、DOM 保留、`data-row-key` 镜像；[tree-table.test.js](../src/data-display/tree-table.test.js)
锁定树表的行身份。但 `vTable` 的 `_renderTable()` 是清空重建（[table.js](../src/data-display/table.js)），
排序场景与区域重建同样丢状态。

**生产影响认定成立（严重级）**：写排序 / 过滤列表时必须选 `addChild` 手工协调、
`vScroll` + 自管 key，或接受整树重建。自动 keyed 列表协调是明确缺口。

## 5. 错误边界：缺失，区域回滚是唯一内建缓解

无 ErrorBoundary 组件、无渲染错误隔离层——这条在
[beginner-feedback.zh-CN.md](beginner-feedback.zh-CN.md) §31 已列为真缺失。现状：

- **区域级回滚**：`rebuild()` 先构建成功再替换，构建抛错自动回滚、旧内容保留
  （[node.js](../src/core/node.js) 的 catch 路径），这是唯一的内建恢复机制；
- **异步组件**：`vDynamicLoader` 有 error 态与重试，`echart` / `three` 内部
  try/catch 降级；
- **初始构建与非区域节点抛错**：异常直接冒泡，页面级兜底
  （`window.onerror` 降级页）是使用方职责。

**生产影响认定成立（致命级）**：一次渲染异常仍可整页白屏。页面级错误边界节点
应进 roadmap 高优先级。

## 6. 过渡与 KeepAlive：一半有一半没有

`vTransition`（[transition.js](../src/effects/transition.js)）是**保身份**的
show/hide 过渡：同一元素切 enter/leave class（或 WAAPI），尊重
`prefers-reduced-motion`，SSR `toHTML()` 安全，`destroy()` 取消动画。因为它靠
`display` 切换而不是销毁节点，`motion: 'always'` 模式可当轻量 KeepAlive 用。

没有的：

- **KeepAlive 等价物**：全库检索零命中，router 无页面缓存；
- **列表过渡 / TransitionGroup**：无 keyed move 动画；
- **跨内容切换过渡（out-in 等）**：无，且区域重建会直接中断区域内动画
  （第 1 条弃建协议的直接后果）。

**生产影响认定成立（中等级）**：后台系统的列表页缓存刚需未覆盖，需自建
（display 切换保活）或等 roadmap。

## 6.5 hydration 失配：有可观测性，DX 中等

`hydrate()` 是收养式：`adoptElement` 逐节点对齐服务端 DOM，匹配则收养（不重建
元素），失配（标签 / 节点类型不一致）则 `replaceExisting` 替换节点并上报
`hydrate-mismatch` devtools 事件——带 `expected` / `existing` 可读名
（如 `div` vs `span`、`#text` vs `em`）与 ViewNode 引用。事件只在 devtools
开启时上报，生产路径零开销、静默替换。

[hydrate-mismatch.test.js](../src/core/hydrate-mismatch.test.js) 覆盖：标签失配、
文本槽失配、匹配时保持安静——「半题」里说「有测试保确定」属实。

缺的 DX：默认无 console 警告、事件不带 DOM 路径 / HTML 片段、失配不中断。
定位方式 = 开 `enableDevtools()` 订阅事件拿节点引用，比完全静默好，但不如
框架级「失配位置 + 两侧标记输出」。

## 改进 backlog（按评审严重级排序）

1. **P0 错误边界**：页面级 / 组件级 ErrorBoundary 节点，异常隔离 + 降级 UI（致命）；
2. **P0 区域重建合并**：同批次多信号触发只重建一次（严重，协议层小改）；
3. **P1 自动 keyed 列表协调**：`addChild` 之上提供 move/diff 或 keyed 列表组件（严重）；
4. **P1 conformance 菱形用例**：把 glitch-free 从「内置引擎事实」变成受测语义（严重）；
5. **P2 KeepAlive**：display 保活组件或 router 页面缓存（中等）；
6. **P2 hydration 失配 DX**：dev 下默认 console 警告 + DOM 路径输出（中等）。
