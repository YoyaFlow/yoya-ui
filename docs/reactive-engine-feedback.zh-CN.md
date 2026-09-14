# 响应式引擎生产评审反馈

本页回应一份外部「生产影响评审」对 yoya-ui 响应式引擎提出的 7.5 个关键问题：
区域重建、信号传播、computed 菱形、列表协调、错误边界、过渡与 KeepAlive、
hydration 失配诊断。每条结论都以源码与测试为依据，其中信号传播与菱形两条
另做了可复现实验验证；回应同时区分**基础库方案问题**（core 语义 / 协议）与
**组件方案问题**（上层组件实现选择），两层欠账分开记账。

一句话版本：**「重建即弃建」是显式协议且解法齐备——值绑定、谓词、预制节点
挂载，或干脆不用 rebuildable、以 style / attr 动态值控制显隐；「收养式局部协调」
是 vDOM 为隐式身份发明的机制，纯 JS 模式身份由句柄显式持有，无需额外处理。
keyed 列表同理理应如此；错误回滚没有魔法，报错位置就是业务代码位置。真正的
欠账是组件层的 ErrorBoundary / KeepAlive，以及基础库层的跨信号重建合并。**

## 逐条结论

| #   | 问题               | 层级                             | 结论                                                                        | 解决方案                                                                                                                                   | 依据                                                                                                         |
| --- | ------------------ | -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1   | 区域重建 DOM 身份  | 基础库                           | 弃建。子树整体重建、不收养；宿主元素身份保留                                | 值绑定原地更新；谓词延迟重建；预制节点挂载；**放弃 rebuildable：style / attr 动态值控制显隐**，身份天然保持                                | [node.js](../src/core/node.js)、[region-flush.test.js](../src/core/region-flush.test.js)                     |
| 2   | 信号传播语义       | 基础库                           | 同步级联；`batch()` 不合并「同一区域订阅的多个信号」的重建                  | 短期：一次事件里合并写点 / 用 batch 避免中间态；根治：区域 pending 去重（同批次只重建一次）                                                | 实验验证 + [engine.test.js](../src/core/signals/engine.test.js)                                              |
| 3   | computed 菱形      | 基础库                           | 内置引擎 glitch-free（实验验证）；适配器契约不保证该语义                    | 内置引擎直接用；conformance 套件补菱形用例，或在契约文档标注「求值顺序依赖引擎调度」                                                       | 实验验证 + [contract.js](../src/core/signals/contract.js)                                                    |
| 4   | 列表协调语义       | 基础库（设计如此）               | 不是缺陷：JS 循环 / 判断就是 v-for / v-if，keyed 原语齐备，策略由开发者决定 | `addChild(key, node)` / `getChild(key)` / `removeChild(key)` 增量增删；预制节点挂载保身份；`vTable` 整体重建是组件自身实现选择，不是库缺口 | [keyed-child.test.js](../src/core/keyed-child.test.js)、[state-node.js](../src/examples/demos/state-node.js) |
| 5   | 错误边界与恢复     | 组件层缺组件，基础库已有回滚原语 | 无 ErrorBoundary 组件；区域 rebuild 失败回滚保留旧内容                      | 基础库：区域回滚直接用（报错位置即业务代码位置，无魔法包装）；组件层：新增页面级 / 组件级 ErrorBoundary 节点                               | [beginner-feedback.zh-CN.md](beginner-feedback.zh-CN.md) §31                                                 |
| 6   | 过渡与 KeepAlive   | 组件                             | `vTransition` 有（保身份 show/hide）；KeepAlive 与列表过渡无                | 现状：`vTransition` motion:'always' 可当轻量保活；组件层补 KeepAlive / TransitionGroup                                                     | [transition.js](../src/effects/transition.js)                                                                |
| 6.5 | hydration 失配诊断 | 基础库                           | 有 devtools 事件可定位；生产静默替换                                        | 开 `enableDevtools()` 订阅 `hydrate-mismatch`（expected/existing + 节点引用）；改进：dev 默认 console 警告 + DOM 路径                      | [hydrate-mismatch.test.js](../src/core/hydrate-mismatch.test.js)                                             |

## 1. 区域重建：明确「弃建」协议，解法齐备（基础库层）

`rebuildable()` 区域的 `rebuild()` 会**清空子节点并重跑 setup**：旧子树进入待销毁
队列，新子树重新构建，成功后才替换 DOM；构建失败则回滚保留旧内容。区域宿主
元素自身的身份保留，但**子树内任何元素身份都不保留**——焦点、光标、选区、
内部滚动、iframe、媒体播放、CSS 过渡、挂在元素上的第三方实例全部随重建丢失。

这不是实现疏漏，而是写进文档的显式协议（[component-authoring.zh-CN.md](component-authoring.zh-CN.md)
§6.1），并被 [region-flush.test.js](../src/core/region-flush.test.js) 锁定：
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

**解决方案**：短期把一次事件里的多个写点收进一个处理函数并包 `batch()`（至少
消除中间态提交）；根治在区域侧加 pending 去重——同批次内多次触发只重建一次。
DevTools 的 `region` 事件（`trigger: 'signal'`）可直接计数验证改进效果。

## 3. computed 菱形：内置引擎 glitch-free，契约不背书（基础库层）

实验验证 A→(B,C)→D 菱形：`a` 变更后，`d` 的订阅者**只收到一次终值**，没有中间
值。原因是内置引擎对效果通知做分代调度：B/C 的重算先跑，D 的效果排在其后，
求值时两个输入都已是新值。

但要诚实标注边界：yoya 的 `computed` 由 core 在「原始值单元」之上自实现
（[handle.js](../src/core/signals/handle.js)），glitch-free 依赖引擎的通知顺序。
而引擎契约（[contract.js](../src/core/signals/contract.js)）只要求
`createSignal/read/subscribe/write` 四个方法——换成同步逐个通知的 store 形态
适配器（conformance 套件自带的测试适配器就是这种形态），菱形中间态没有任何
契约保证，conformance 测试也没有菱形用例。

**解决方案**：内置引擎下菱形直接可用；若要兑现「换引擎语义不变」，给
conformance 套件补菱形用例，或在契约文档明确「求值顺序语义依赖引擎调度」。

## 4. 列表协调：纯 JS 模式下理应如此，不是欠账

先纠正评审的前提：它预设了「框架必须内建 keyed diff / move」——那是模板 +
vDOM 框架的问题，因为模板把「结构如何随数据变化」藏进了框架，协调语义只能
由框架猜测。yoya 是纯 JS 声明式构建：

- **JS 的 `forEach` / `map` 循环就是 v-for**，`if` / 三元就是 v-if——结构怎么变，
  代码就怎么写，没有隐藏语义；
- **基础库已提供子节点操作原语**，怎么操作由开发者决定：
  `addChild(key, node)` 挂载并登记 key、`getChild(key)` 复用、
  `removeChild(key)` 删除单个子节点并销毁。key 唯一性校验、`data-row-key`
  镜像、DOM 身份保留均被 [keyed-child.test.js](../src/core/keyed-child.test.js)
  锁定；区域重建时 keyed 子节点重跑不报重复 key（[region.test.js](../src/core/region.test.js)）。

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
`StateKeyedExample1`（[state-node.js](../src/examples/demos/state-node.js)）演示
追加 / 移除的完整交互，`definition-complex.js` 用 `task.id` 做 key 组装任务行，
core 侧 keyed / region / devtools 测试均覆盖。

组件现状只是各自的实现选择，不是库缺口：`vTable.rows()/data()` 清空重建
（[table.js](../src/data-display/table.js)）是该组件「简单数据驱动优先」的选择；
`tree-table` 展开/折叠保留行元素身份，证明组件需要身份时随时可以用同一套
原语自管。要不要增量渲染，属于组件各自的取舍。

**生产影响认定不成立（旧直觉化石）**：排序 / 过滤丢状态的场景，是因为把可变
列表放进了 `rebuildable()` 区域任其整树重跑；按库的设计用法——循环里
`addChild/removeChild` 增量协调、或预制节点挂载保身份——问题不存在。
文档动作：给 Vue / React 背景开发者补映射表（`v-for` ↔ `forEach/map` +
`addChild(key)`、`v-if` ↔ `if` / 三元），说明「协调策略属于业务代码」。

## 5. 错误边界：组件层缺组件，基础库回滚没有魔法

无 ErrorBoundary 组件、无渲染错误隔离层——这条在
[beginner-feedback.zh-CN.md](beginner-feedback.zh-CN.md) §31 已列为真缺失。但要
分清两层：

- **基础库层（已有）**：区域 `rebuild()` 先构建成功再替换，构建抛错自动回滚、
  旧内容保留（[node.js](../src/core/node.js) 的 catch 路径）。**没有魔法**——
  rebuild 重跑的就是使用方写的 builder，异常从业务代码里抛出、原样 re-throw，
  报错位置（stack）就是业务代码位置，库不做包装或吞错。
- **组件层（缺失）**：初始构建与非区域节点抛错仍会冒泡白屏；`vDynamicLoader`
  有 error 态与重试，`echart` / `three` 内部 try/catch 降级，但都是各组件各自
  处理，没有通用的页面级 / 组件级 ErrorBoundary 节点。

**解决方案**：区域内的可恢复更新直接依赖 rebuild 回滚（异常即业务异常，定位
零成本）；不可恢复路径需要组件层新增 ErrorBoundary——捕获子树构建异常、渲染
降级 UI、支持重试，页面级兜底在此之前是使用方职责。

## 6. 过渡与 KeepAlive：一半有一半没有（组件层）

`vTransition`（[transition.js](../src/effects/transition.js)）是**保身份**的
show/hide 过渡：同一元素切 enter/leave class（或 WAAPI），尊重
`prefers-reduced-motion`，SSR `toHTML()` 安全，`destroy()` 取消动画。因为它靠
`display` 切换而不是销毁节点，`motion: 'always'` 模式可当轻量 KeepAlive 用。

没有的：

- **KeepAlive 等价物**：全库检索零命中，router 无页面缓存；
- **列表过渡 / TransitionGroup**：无 keyed move 动画；
- **跨内容切换过渡（out-in 等）**：无，且区域重建会直接中断区域内动画
  （第 1 条弃建协议的直接后果）。

**解决方案**：轻量保活现在就用 `vTransition` display 切换；组件层 roadmap 补
KeepAlive（缓存 + 激活态生命周期）与列表过渡。

## 6.5 hydration 失配：有可观测性，DX 中等（基础库层）

`hydrate()` 是收养式：`adoptElement` 逐节点对齐服务端 DOM，匹配则收养（不重建
元素），失配（标签 / 节点类型不一致）则 `replaceExisting` 替换节点并上报
`hydrate-mismatch` devtools 事件——带 `expected` / `existing` 可读名
（如 `div` vs `span`、`#text` vs `em`）与 ViewNode 引用。事件只在 devtools
开启时上报，生产路径零开销、静默替换。

[hydrate-mismatch.test.js](../src/core/hydrate-mismatch.test.js) 覆盖：标签失配、
文本槽失配、匹配时保持安静——「半题」里说「有测试保确定」属实。

**解决方案**：开发期开 `enableDevtools()` 订阅事件拿节点引用定位；改进方向是
dev 下默认 console 警告并输出 DOM 路径 / 两侧片段。

## 改进 backlog（按层级与严重级排序）

**基础库层**：

1. **P0 区域重建合并**：同批次多信号触发只重建一次（严重，协议层小改）；
2. **P1 conformance 菱形用例**：把 glitch-free 从「内置引擎事实」变成受测语义（严重）；
3. **P2 hydration 失配 DX**：dev 下默认 console 警告 + DOM 路径输出（中等）。

**组件层**：

1. **P0 ErrorBoundary**：页面级 / 组件级错误边界节点，异常隔离 + 降级 UI（致命）；
2. **P2 KeepAlive / TransitionGroup**：display 保活组件、router 页面缓存、列表
   move 过渡（中等）。
