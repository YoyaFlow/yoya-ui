# 01 — rebuildable 区域重建方案（讨论整理）

**要做什么：** 给节点加一个「内容由状态驱动、在 flush 时重建」的声明式入口，
把库内约 129 处手写的 `replaceChildren` 收敛成一套语义明确的机制。

**现状：** 只有设计结论，无代码。全仓库、全分支、全历史都没有 `rebuildable` 实现。

**Status:** draft（核心语义与 API 形态已定；入口命名与区域发现机制待定，见第 9 节）

---

## 1. 背景

`vStateNode` 只解决「组件级」状态同步，手段是三条：
函数值绑定（值变化）、`update` 回调（手工 patch）、全量重建（兜底）。

组件级以下没有「局部结构变化」的入口，所以库内每个组件各写一遍。
证据：

- `replaceChildren(node, children)`（`src/components/shared.js:84`）＝
  销毁全部子节点 + `_el.replaceChildren()` + 重新 `child(...)`，
  在 41 个文件里出现约 129 次（含定义），密集在 tree(10) / tree-ranger(9) /
  vscroll(6) / steps(5) / table(4) / tabs(4) / pagination(4)。
- 想避免整体销毁时只能手写差量：`vTree.updateRows(force)`
  （`src/data-display/tree.js:818`）自己维护 `entry.selected / expanded / checked`
  快照做比较；`vAutocomplete._renderList()`
  （`src/form/autocomplete.js:257`）整体替换，并在 `_setHighlight`
  注释里说明「高亮时不能重建，会销毁正在点击的节点」。

结论：需求真实且普遍，缺的是声明式入口，不是能力。

## 2. 语义决策

### 2.1 区域重建 = 清空 + 重跑 setup（范围局部、深度全量）

不做引擎级 diff。标记过的节点在 flush 时由引擎**先清空子节点，再重跑 setup**，
旧子节点走既有 `_commitChildren()` 统一 `destroy()`。

取舍（明确定义，不假装保留身份）：

- 保住：区域外的兄弟 DOM、父级结构、页面滚动位置；
- 丢弃：区域内的焦点/选区/IME 态、内部滚动位置、CSS 过渡进度、
  挂在元素上的第三方实例（ECharts / AG Grid / CodeMirror 等）、
  外部闭包持有的旧节点引用、devtools 旧节点 id。

相比组件级重建（`_replaceResolved` 整段换 DOM）是实质改进，也是本方案的价值所在。

### 2.2 三个旋钮的边界

| 机制 | 回答的问题 | 归属 |
| --- | --- | --- |
| setup 重跑 | 重建**什么** | 本方案 v1 |
| guard（谓词参数） | 这次**要不要**花重建 | 本方案 v1（第 2 步实现） |
| key | 哪些子节点能**复用**（保住身份） | v2，不进 v1 |

值变化仍走函数值绑定（`vStateNode` 的 `flushBindings`），
区域重建只面向结构性变化，不作为默认手段。

## 3. API 形态

### 3.1 形态（已定）

```js
table.vTbody((body) => {
  body.rebuildable();                                 // 每次 flush 都重建
  state.rows.forEach((row) => body.tr((tr) => { ... }));
});

table.vTbody((body) => {
  body.rebuildable(() => !isComposing);               // 仅当谓词为真时，这次 flush 才重建
  state.rows.forEach((row) => body.tr((tr) => { ... }));
});
```

- 参数是**门禁谓词**（`() => boolean`），无参数、不注入 state；内容始终由节点的 setup 产出。
  谓词通过闭包读取外部状态，约定与事件回调一致：读稳定引用（如 `state.rows.length`），
  不要捕获值快照（如 `const rows = state.rows`），否则读到的是上一轮数据。
- 注意：以上只针对**门禁谓词**。**值函数**（`attr` / `style` / `vText` 的函数值）
  的参数形态正在从「零参」回归「有参」，见 §13。
- 不传参数＝无条件重建；传谓词＝谓词为真才重建，为假则本次跳过（必须记脏，见契约 6）。
- 谓词在**首次 setup 运行时被提取**保存到区域节点上；判定时机是
  「解除旧绑定 / 清空子节点 / 重跑 setup」**之前**（见 3.4），因此跳过时绑定原样保留。
- 谓词只表达「这次要不要花重建」，不表达内容条件。若谓词读的是区域自身的驱动数据
  （`() => a < 1` 而内容依赖 `a`），应把条件写进 setup 内部，否则会出现静默 stale。
- 谓词在「宿主组件 `setState` 驱动」的模型下等价于 `shouldComponentUpdate`：
  这次状态变化要不要重建我。纯显式 `refresh()` 的场景下它没有意义（调用方已经决策）。

### 3.2 为什么 v1 不做 builder 参数

- 唯一的函数槽已被谓词占用，再塞 builder 会出现「这个函数是 builder 还是谓词」的
  形状歧义；将来若确实需要「初始化与重建分离」，用选项对象
  `rebuildable({ when })` 或另立 API，而不是第二重载。
- 代价是 setup 会被重复执行，因此「累加型 API 不得累积」从可选项变成**引擎必须兜底**
  （见契约 4）；无法幂等的副作用不应写在区域 setup 里（见 3.3）。

### 3.3 区域 setup 里的调用安全性

| setup 里的调用 | 重跑行为 | 处理 |
| --- | --- | --- |
| `attr / style / class / styles / on` | 替换语义，安全 | 无需处理 |
| `registerStateAttrs` | 写对象，幂等 | 无需处理 |
| `child / text` | 追加 | 引擎重跑前清空 |
| `addChild(key, ...)` | 重复 key 抛错 | 引擎清空时 `_dropChildKeys` |
| `registerStateHandler` | 数组 push，会累积 | 引擎重跑前重置 |
| `bindDocumentEvent / bindWindowEvent` | 返回 unbind，忽略即叠加 | 引擎重跑前重置，或强制收集返回值 |
| `setTimeout / setInterval` | 靠 destroy 清理，节点不销毁就不清 | 引擎重跑前重置 |
| 第三方实例创建、请求、埋点等一次性副作用 | 每次重跑都重来 | **不放区域 setup**，上移到外层 |

### 3.4 判定顺序（一次重跑的完整步骤）

```
1. 宿主组件状态变化（changed.size > 0）或显式 refresh()
2. 对树中被标记的区域：每轮每区域只评估一次谓词（有候选变化时才评估）
3. 谓词为假 → 跳过：不解除绑定、不清空子节点，仅记脏，等待后续补重建
4. 谓词为真（或无谓词）→ 解除「区域根 + 子树」名下绑定
5. 清空子节点（等价 clearChildren，含 _dropChildKeys）→ 重跑 setup
6. flush 本轮新登记的绑定（本次重跑自带的小周期，不等外层 flush）
```

第 6 步是必需的：宿主的 `flushBindings()` 发生在 `_replaceResolved()` 物化 DOM 之前
（`src/core/state-node.js:136`），挂在 DOM 物化路径上的重跑赶不上那一轮 flush。

## 4. 契约（不变量）

1. **清空由引擎做**：重跑前引擎执行等价于 `clearChildren()` 的操作
   （含 `_dropChildKeys`，避免 `addChild` 重复 key 抛错），使用者不得依赖
   在 setup 首行自己清空。
2. **子节点归属唯一**：rebuildable 节点的子节点由它自己的 setup 产出，
   重跑前由引擎清空；外部对同一个节点追加子节点属违规，dev 模式断言报错。
3. **旧子节点必须被 destroy**：沿用 `_commitChildren()`；第三方 cleanup
   挂在 `destroy()` / `_cleanup` 上即生效。
4. **累加型 API 不得累积（引擎强制）**：至少覆盖 `registerStateHandler`
   （`src/core/node.js:545` 数组 push）、`bindDocumentEvent` / `bindWindowEvent`
   （`src/core/document-events.js:9`，返回 unbind）、定时器。
   因为 v1 没有 builder 参数可用来分离初始化，这一条必须由引擎在重跑前重置登记表，
   不能推给使用者；无法幂等的副作用由文档禁止写在区域 setup 里。
5. **谓词＝门禁**：签名 `() => boolean`，不注入参数；
   纯函数、每轮每区域只评估一次、注册是替换语义（与 `.on()` 单槽覆盖一致）；
   生命周期以一轮 setup 为界——重跑开始前先清空，本轮未登记则视为无谓词（无条件重建）；
   首次 flush 前无谓词同样视为可重建。
   **判定必须早于「解除绑定 / 清空子节点」**，跳过时绑定与子树保持原样。
   重跑过程中必须有重入保护：重跑期间不得再次触发判定或重跑，否则会递归。
6. **跳过必须记脏**：谓词为假时标记 pending，不得丢弃；谓词恢复为真后的
   下一次 flush 必须补一次重建。
7. **可观测**：只要触发判定，devtools 要能区分 `rebuild` / `skipped`，
   否则「状态变了界面没动」无法定位。
8. **SSR 不受影响**：首渲染是构建期行为，重跑只在客户端 flush 发生。
9. **绑定随重跑作废**：重跑前解除「本次重跑影响范围内」的全部绑定
   （区域根节点 + 其子树所拥有的绑定，登记时以调用方节点为 owner），
   重跑过程中重新登记；绝不允许绑定跨重跑存活。
   边界必须是子树级，不能清整个组件的绑定——区域外的绑定不会重新登记。
   配套两条：重跑必须在**它所属的绑定作用域内**执行（否则函数值登记直接抛
   `vStateNode binding scope required`）；`flushBindings()` 的遍历必须发生在
   重跑之后，否则会遍历到已解除的绑定或漏掉新登记的绑定。
10. **两级更新（否则是破坏性回归）**：`setState` 默认**只 flush 值绑定、不重建 DOM**
    （保持现有行为：`bindings.length > 0` 时不重建，焦点不丢）；结构重建只在区域
    谓词判定为真时发生。若把两者合并成"每次状态变化都重跑 setup"，等价于今天的全量重建，
    会丢掉输入焦点与滚动位置。
11. **区域树必须挂在视图树上，不得使用模块级注册表**：模块级注册表在 SSR 并发下会
    跨请求共享（AGENTS.md 明令禁止），并造成泄漏（`renderPage` 渲染后会 destroy 整棵树）。
12. **重入保护与变更排队**：重跑期间产生的状态变化必须入队、在本轮结束后统一处理；
    构建期上下文是同步作用域，禁止在构建过程中 `await`。
13. **区域必须有 builder**：被标记的节点必须带 setup（或工厂 callback），否则重跑会清空内容；
    应在 `rebuildable()` 调用点直接报错，而不是静默清空。

## 5. 实现落点

- 保存 setup 引用（v1 必需，因为内容只能由 setup 重跑产出）：两条入口都要记——
  `div(setup)` 走构造器（`src/core/node.js:268` 目前调用后即丢），
  `vTbody((body) => ...)` 走工厂 callback（`src/components/shared.js:43`）。
- 保存门禁谓词（可选）：注册为单槽，重复 `rebuildable(fn)` 覆盖上一个
  （与 `.on()` 一致的替换语义）。
- 重跑前重置登记表：`_stateHandlers`、cleanup/destroy 清单、区域内的
  document/window 监听与定时器（契约 4）。
- flush 插入点：`ElementNode.renderDom()`
  （`src/core/node.js:1312`）中 `_applyAccessState` 之后、`_commitChildren()` 之前
  ——「若标记且脏 → 谓词为真？→ 重置登记表 → 清空 → 重跑 setup → 继续原有子节点对齐」。
  旧的 pending 节点在第 4 步销毁，新节点在第 5 步 append，一次 flush 内完成。
- 脏标记：复用目前只写不读的 `_childrenDirty`
  （`src/core/node.js:596`），使其成为「区域待重跑」的唯一判据。
- 绑定归属与解除（契约 9）：`registerNodeBinding`
  （`src/core/node.js:106`）登记时记录 owner＝发起登记的节点；
  新增按子树解除的入口（如 `releaseBindings(root)`），并在
  `ViewNode.destroy()` 里顺带解除自身名下绑定，作为悬空写入的兜底——
  现有实现里绑定是组件级平铺数组（`scope.bindings`），没有归属信息。
- 手动入口：`body.refresh()` 强制重跑一次（与谓词门禁不冲突：显式刷新即显式决策）。

## 6. 测试清单

- 重跑内容随状态更新；子节点不重复；
- 旧子节点 `destroy()` 被调用（事件 adapter / cleanup 生效）；
- `registerStateHandler` 不累积；document / window 监听不叠加；
- 区域外兄弟节点的 DOM 引用不变；
- 区域内的焦点丢失是**明确断言的语义**，不是意外；
- 谓词为假 → 跳过且记脏；谓词恢复 → 补一次重建；
- 谓词每次 flush 只评估一次；重复 `rebuildable(...)` 为替换而非累积；
- 外部对区域节点追加子节点时 dev 断言报错；
- 重跑后旧绑定全部失效：区域外组件的绑定不受影响、区域内的绑定重新登记后仍能更新；
- 重跑后不存在重复绑定（同一 attr 只有一个绑定在写）；
- 对已销毁节点持有的旧绑定不再写入（`destroy()` 解除兜底）；
- SSR 首渲染不触发重跑（`toHTML` / `renderToString` 路径无副作用）。

## 7. 分阶段计划

1. **v1**：无参形态的区域重建（清空 + setup 重跑）+ 契约 1–4、7–9；
   迁移 1–2 个组件验证（优先 vTree 这种自己手写 diff 的）。
2. **v1.5**：谓词门禁（契约 5、6）+ 脏标记补重建 + devtools `skipped`。
3. **v2**：keyed 复用（`key` 提取器、复用/移动/销毁），只在出现
   「列表重排 + 焦点/第三方实例必须保留」的真实场景时启动。
4. **v3**：批量迁移 `replaceChildren` 调用点（约 129 处），逐组件替换、逐组件加测试。

## 8. 契约 9（重跑解除旧绑定）引入的风险与对策

| # | 风险 | 原因（代码依据） | 对策 |
| --- | --- | --- | --- |
| 1 | 重跑时机与 flush 顺序冲突 | `rebuild()` 的顺序是「build → `flushBindings()` → `_replaceResolved()`（物化 DOM）」（`src/core/state-node.js:136`）；区域重跑若插在 `renderDom()` 里，则本轮新登记的绑定不会被 flush，动态属性缺失直到下一次 `setState` | 区域重跑不进 DOM 物化路径，改为在 `applyStateChange` 开头的「待重跑队列」消费；直接 `refresh()` 的重跑自建「释放 → build → flush 本轮」小周期 |
| 2 | 组件 `bindings.length` 判据失真 | `applyStateChange` 用 `bindings.length > 0` 决定走绑定写回还是全量重建（`src/core/state-node.js:197`） | 谓词跳过时**不解除**绑定（绑定 `evaluate` 读的是活状态，跳过不会 stale）；只有真正重跑才解除并立即重登记 |
| 3 | 作用域对象被替换 | `rebuild()` 每次新建 `scope` 与 `bindings` 数组（`src/core/state-node.js:140`） | 区域**不得缓存 scope**，重跑时向宿主取当前 scope；缓存旧引用会给死数组登记绑定，表现为动态属性再也不更新 |
| 4 | 区域根节点自身属性残留 | 子树整体重建，但区域根节点的 `_attrs` / `_styles` 快照保留上次绑定写入的值 | 重跑前按登记表清理根节点名下的动态属性 / 样式 / 文本，或规定根节点动态属性必须重新登记 |
| 5 | 重跑中途抛错 | 无错误边界、无回滚；旧绑定已解除、新绑定只登记一半、旧子节点已进 `_pendingRemovals` | 两阶段：先构建到临时结构，成功后再替换；失败保留旧树并上报 |
| 6 | 遍历中修改绑定数组 | `flushBindings()` 用 `forEach` 遍历 `bindings` | 严格顺序：待重跑队列必须在 flush 之前清空，不得在遍历期间 push/splice |
| 7 | 游离节点归属歧义 | 区域 setup 创建但挂在区域外（tooltip / dialog / message 等传送门） | 明确「按树归属释放」为默认，并提供显式豁免 / 脱管入口 |
| 8 | 释放成本 | 按绑定数组过滤归属 → O(绑定数 × 子树规模) | 绑定按 owner 挂到节点上（每节点一个 `_bindings`），释放跟随子树遍历，成本降为 O(受影响节点数) |
| 9 | 绑定类型扩展 | 目前 kind 只有 `text / attr / style`，且 `withBindingScope` 仅被 vStateNode 使用（`src/core/node.js:96`、`src/core/state-node.js:143`） | 解除时按 kind / scope 区分，避免将来 i18n、access 等绑定被误杀 |
| 10 | 一次多余写入 | 新登记的绑定 `committed: false`，首次 flush 必然 commit | 可接受，测试里按预期断言即可 |
| 11 | 谓词闭包读到上一轮快照 | 谓词由上一轮 setup 创建，重跑前被调用 | 约定按稳定引用读取状态（与事件回调同一约定）；捕获值快照属使用者写法问题，文档明示 |
| 12 | 判定与重跑互相触发形成递归 | 重跑期间再次 flush / 再次判定 | 重入保护标记；重跑自带的小周期（步骤 6）在同一标记内完成 |

## 9. 问题清单（盘点）

### 9.1 已定，不再讨论

1. 语义：区域重建＝清空 + 重跑 setup，范围局部、深度全量，不做引擎级 diff（2.1）。
2. API 形态：`rebuildable()` 声明；`rebuildable(谓词)` 门禁；谓词零参、不注入 state；
   内容始终由节点 setup 产出（3.1）。
3. 判定顺序：guard → 释放本区域绑定 → 清空 → 重跑 setup → flush 本轮新绑定（3.4）。
4. 绑定随重跑作废；谓词跳过时**不解除**；重入保护（契约 5 / 6 / 9）。
5. 值函数去参数化、从外部取值；普通区域也可用值函数；绑定作用域下放到区域，
   `activeBindingScope` 从「组件作用域」改为「区域栈」。
   （`withBindingScope` 未在 `src/core/index.js` 导出，属内部实现，改动不构成公开 API 破坏。）
6. 统一触发入口：手动与自动走同一条 refresh 路径；`vStateNode` 退化为
   「state 容器 + 自动触发器」（§10）。

### 9.2 仍待决定

1. **统一入口的命名冲突（新发现）**：`refresh()` 已被 6 处公开 API 占用——
   `I18nTextNode.refresh()`（`types/core.d.ts:506`）、`VCol.refresh()`、
   `ResponsiveGrid.refresh()`、`MobileLayout.refresh()`（`types/layout.d.ts`）、
   `TreeRanger.refresh()`（`types/data-display.d.ts:340`）、`Router.refresh()`
   （`types/router.d.ts:56`）。统一入口若沿用 `refresh()` 会造成语义撞车，
   需在 `flush()` / `rerun()` / `rebuild()` 之间选，或加限定词。
2. **区域如何被发现**：宿主 `setState` 时怎么知道要刷新哪些区域——
   是「组件 render 输出即一个区域，嵌套区域随父重建」，还是构建期把被标记的节点
   登记到当前区域？倾向前者（少一套注册表）。
3. **gate 是否被手动入口绕过**：建议默认不绕过（guard 表达重建安全性），
   强制时用显式参数（`{ force: true }`）。
4. **`update` 回调的去留**：与区域重跑职责重叠；保留为优化还是由区域重跑取代；
   现有「`update` 返回 `true` 强制重建」的契约与测试如何处理。
5. **节点级旧状态机的边界**：`registerStateAttrs` / `registerStateHandler` /
   `node.setState(name, value)` 与区域 refresh 并存时的关系，避免两套 setState 误触。
6. 风险 4（区域根节点动态属性残留）两条对策选哪条。
7. 风险 5（重跑中途抛错）策略：两阶段提交，还是接受不可回滚并上报。
8. 风险 7（传送门 / 游离节点）的豁免入口形态。
9. 同轮内同一区域被多个来源触发的去重规则。
10. 命名总收口：`rebuildable` 是否改名（`-able` 形容词 + 谓词参数略显混合）。
11. 「初始化与重建分离」是否需要：若 v1 之后仍频繁出现第三方实例被反复重建，
    再评估选项对象或独立 builder API。

### 9.3 已定但缺实现细节（可细化，不需要新决策）

1. 区域栈实现：构建期 push/pop 时机、嵌套区域归属、SSR 下的行为。
2. 区域在未挂载（无 `_el`）时 refresh 的行为：只更新视图树，还是 no-op。
3. 绑定归属落到节点（每节点一个 `_bindings`）与按子树释放的遍历。
4. devtools 事件字段（`trigger: manual | state | parent`、handling 新取值）与中英文文档同步。
5. 类型声明补充：`types/core.d.ts`、`types/tests/consumer.ts`。
6. 迁移清单：约 45 处 `(s) => value` / `(state) => value` 改为零参闭包；
   涉及 10 个文件（含 `docs/component-authoring*`、`docs/highlights*`、
   `src/examples/state-node-docs.js`、`src/examples/demos/state-node.js`、
   `src/core/state-binding.test.js` 等）。
7. 测试基线更新：`src/core/state-node.test.js`、`state-binding.test.js`、
   `devtools.test.js` 中依赖旧语义（无 update 即全量重建、update 返回 true 重建）的断言。

## 10. 提议：统一触发入口，区域自持，vStateNode 退化为自动触发器

**动机：** 把「更新」的归属从组件下放到区域；手动与自动走同一条路径。

```js
node.refresh();             // 统一入口（手动）
vStateNode.setState(...);   // 自动：更新 state 后调用同一条路径
```

一次 refresh 的动作序列＝3.4 的判定顺序：释放本区域绑定 → 清空子节点 →
重跑 setup → flush 本区域新绑定。

**一次性解决的既有风险：**

- 风险 1（重跑时机与 flush 顺序冲突）：区域自带「build → flush」小周期，
  不再依赖宿主 flush 的先后；
- 风险 2（组件 `bindings.length` 判据失真）：绑定归区域，组件判据不受影响；
- 风险 3（scope 被替换后陈旧）：区域自持 scope，不缓存宿主对象。

**连带影响：**

- vStateNode 重新定位为「state 容器 + 自动触发器」；它的 render 输出天然构成一个区域；
- 第 9 节未决问题 1（区域是否必须存在于状态组件树内）→ 结论变为「不必」；
- 动态属性的手动触发诉求（`component.flush()`）被 refresh 统一吸收，
  不再需要单独一套值级入口。

**需要一并定死：**

1. 入口命名与位置：节点级 `refresh()` 与组件级入口是否都提供、如何区分值与结构。
2. guard 是否被手动 refresh 绕过：建议默认**不绕过**（guard 表达的是重建安全性，
   如输入法/拖拽中不重建），需要强刷时显式 `refresh({ force: true })`。
3. 刷新粒度：只刷自身区域；子树重建天然带出新子区域，不做递归刷新。
4. 触发源可观测：devtools 事件带 `trigger: manual | state | parent`，
   否则统一入口会丢掉「是谁触发的」这条信息。
5. 迁移期规则：组件级绑定与区域级绑定并存时的优先级与过渡，避免同一属性被两处写。
6. 与节点级旧状态机的关系：`node.setState(name, value)`（registerStateHandler 那套）
   与区域 refresh 的边界，避免两套 setState 语义互相误触。

## 11. 对 SSR 的影响

**总体：** 首渲染仍是纯构建，重跑只发生在客户端，SSR 链路不被破坏。
但有四处交叉必须处理，其中第 1 条会直接造成线上错误。

**范围收窄（重要）：** SSR 一致性只约束**首屏**。服务端 HTML 只在 hydrate 那一刻
被收养一次，hydrate 之后所有 DOM 都由 DSL 重建，区域重跑是「销毁旧子树 + 用 DSL 生成」，
**不需要与任何既有 HTML 对齐**。因此需要保证的只有两点：首屏构建确定性
（服务端与客户端 hydrate 产出同一棵树）与首屏数据同源（数据能在客户端拿到）。
11.1 的三条环境恢复仍然要做，但原因是**客户端运行时**（权限热切换、语言切换），
与 SSR 无关。

### 11.1 环境作用域必须随区域自持并在重跑时恢复（最高优先级）

`ViewNode` 在**构造时**捕获权限上下文（`this._accessContext = currentAccess()`，
`src/core/node.js:254`）；access / context / i18n 三套都是「作用域栈 + 构建期生效」的模式：

- access：`src/core/access.js:146` `currentAccess()`
- context：`src/core/context.js` 模块级 `contextStack`（push/pop）
- i18n：`src/core/i18n.js:326` `withI18nStringShortcut(locale, build)`

服务端正是靠 `scopeBuild(access, context, i18n, state, build)`
（`src/core/ssr.js:98`）把这三层作用域套住整页构建。

区域重跑发生在 flush 阶段，那时这些作用域早已出栈。后果：

- 重跑出来的新节点 `_accessContext` 为空 → **权限判定错误（无读不渲染，节点直接消失）**；
- `currentContext()` 读不到 provider → Context 丢失；
- `.s()` 快捷方式落到作用域外 → **语言回退默认值**。

**对策：** 区域不只要自持绑定，还要自持**构建期环境快照**
（access 上下文、context providers、i18n locale/实例），重跑时用
`withRenderScope` / `withAccess` / `withContext` / `withI18nStringShortcut`
把这几层作用域原样恢复。这条对客户端同样适用，只是在 SSR 场景下后果最明显。

### 11.2 零参闭包把「每请求隔离」从结构保证降级为约定

现在 `(s) => s.x` 的绑定数据只能来自组件 state（每请求新建），天然隔离。
零参闭包可以读任意外部变量；一旦读到模块级可变对象，服务端并发请求会互相污染——
这正是项目 SSR 纪律明令禁止的（「模块级可变状态不跨请求共享」）。

**对策：** 契约写明「区域与绑定的数据必须来自 `requestState` / 组件 state /
每请求作用域」；只写文档约束是下限，若要做到结构性保证，需要区域显式声明数据来源。

### 11.3 序列化链路

`renderPage` 把 `state` 序列化成 `__YOYA_DATA__`（`src/core/ssr.js:259`），
客户端据此重建同一棵树。区域可重建所依赖的数据若不在这个 state 里，
hydrate 后拿不到 → 服务端 HTML 与客户端首帧不一致。

### 11.4 build → flush 是构建期行为，不是客户端行为

「区域构建完成后 flush 自己的绑定」在**服务端也必须执行**，否则 `toHTML()`
会缺绑定值（现有 `src/core/state-binding.test.js` 有
“serializes bound values in toHTML before DOM mount” 专门守这条）。
也就是说：build → flush 与服务端/客户端无关，**只有「重跑」是客户端行为**。
实现时不要把 flush 挂到 DOM 路径上，否则就是风险 1 的翻版。

### 11.5 待定与注意事项

- `rerun()` 在无 DOM 环境（`document === undefined`）的行为：建议仍重跑视图树
  并求值绑定（可能再次 `toHTML()`），但不触碰 DOM；需明确。
- 确定性纪律重申：区域 setup 不得用 `Date.now()` / `Math.random()` 生成结构或 key，
  否则服务端首屏与客户端重建对不上。
- `allocateId`：区域内含 `allocateId` 的组件（tooltip / dropdown-menu / tree /
  navbar / controls 等）在重跑后会拿到新 id（内部自洽，外部若缓存旧 id 会失效）。
- SSR 契约测试：服务端 HTML 与客户端 hydrate 结果一致；重跑后权限态 / 语言 /
  context 保持；并发两请求互不污染。

## 12. 解法对照

真正需要**新增**的只有两项，其余都是复用现有机制、调整顺序或文档约束。

**新增 A — 构建期环境快照（解决 11.1，结构性解决）**

区域在构建时记录三样东西，重跑时用现成的对称 API 原样恢复：

| 环境 | 捕获 | 恢复 | 现状 |
| --- | --- | --- | --- |
| access | `currentAccess()`（`src/core/access.js:146`） | `withAccess(spec, build)`（:129） | 现成、对称 |
| context | `snapshotContext()`（`src/core/context.js:62`） | `withContext(providers, build)` | 现成、已导出 |
| i18n | 需新增内部 getter（`stringShortcutI18n` 目前是模块私有，`src/core/i18n.js:274`） | `withI18nStringShortcut(locale, build)`（:326） | 需补一个 getter |

成本：两处内部改动 + 区域多存三个字段。这是把「重跑丢权限 / 丢 context / 回退语言」
从文档约定升级为结构保证的方式。同样适用于客户端，只是 SSR 下后果最明显。

**新增 B — 区域树（解决 9.2-2「区域如何被发现」）**

构建期维护「当前区域栈」，被标记的节点登记为当前区域的子区域；重跑按
**父优先、子跳过**处理（父区域重建会产出一批新的子区域），区域重建时清空并重新收集。
没有它，组件级重跑会把嵌套区域一并吃掉，嵌套 `rebuildable()` 就失去意义。

**复用与顺序调整（无需新概念）**

| 问题 | 解法 | 成本 |
| --- | --- | --- |
| 风险 5 重跑中途抛错 | 顺序改为「先构建、成功后再释放替换」：guard → 在区域上下文里跑 setup 得到新子树并 flush 新绑定 → 成功后销毁旧子节点并挂新子树。契约 9 表述相应改为「绑定不跨重跑存活」 | 小 |
| 风险 6 遍历中改数组 | 由上一行顺带解决：flush 发生在替换之后，不再与释放交叠 | — |
| 风险 4 区域根节点属性残留 | 释放时按登记表还原：`attr(key, null)` / `style(key, null)` / `text('')`；`kind/key` 登记时已有（`src/core/node.js:106`） | 小 |
| 风险 7 传送门 / 游离节点 | 规则改为「区域只负责自己 `_children` 子树内的节点与绑定；游离节点由创建它的组件自行 destroy / 重建」，与 tooltip / dialog 现有自管生命周期的写法一致 | 小 |
| 9.2-1 入口命名 | 用 `rerun()`：`refresh()` 已被 6 处占用且语义各异；`rebuild()` 与标记 `rebuildable()` 词根相同；`flush()` 易与值写回混淆 | 小 |
| 9.2-3 guard 与手动入口 | 默认不绕过 guard；强刷用 `rerun({ force: true })` | 小 |
| 9.2-9 重复触发 | 以区域节点为 key 的 Set 去重，一轮内每区域最多一次，父优先 | 小 |
| 9.3-2 未挂载时 rerun | 只重建视图树并 flush 绑定，DOM 对齐留给下次 `renderDom()` | 小 |
| 11.4 build → flush 归属 | 把 flush 放在「区域构建完成」钩子里，客户端与服务端同路径，不挂 DOM 路径 | 小 |
| 11.2 每请求隔离 | 结构性保证有限，但给正面指引：数据放 `requestState` / 组件 state / **每请求 context**（`renderPage` 的 `options.context` 已支持，`currentContext()` 可在零参闭包内读），避免模块级可变对象 | 文档 |
| 11.5 确定性与 id | 区域 setup 禁用 `Date.now()` / `Math.random()` 生成结构或 key；需要稳定 id 时用显式 id，不用 `allocateId` | 文档 |
| 9.2-4 `update` 回调 | 保留为手工 patch 逃生口；「返回 true 强制重建」标注 deprecated，由区域 guard 取代，v1 保持兼容 | 小 |
| 9.2-5 节点级旧状态机 | 保留不动，标注 legacy；`node.setState(name, value)` 不触发区域 rerun，rerun 也不重置节点级 states | 文档 |

## 13. 提议：值函数恢复「有参」，环境恢复随之简化

**动机：** 零参闭包把「数据来源」交给使用者，诱发了陈旧快照（11.1 之外的 9.2 相关风险）
与 SSR 每请求隔离被削弱（11.2）两个问题；而 11.1 的「三件套快照」也正是难用的根源。

### 13.1 有参能解决哪些

| 问题 | 有参能否解决 | 原因 |
| --- | --- | --- |
| 闭包读到上一轮快照（风险 11） | 能，结构性解决 | 参数每次求值由引擎传入最新数据 |
| SSR 每请求隔离被削弱（11.2） | 能，回到结构保证 | 引擎传的是每请求 state，不依赖使用者自觉不碰模块变量 |
| 迁移成本（9.3-6，约 45 处） | 归零 | 现有代码本来就是 `(s) => value`，无需迁移 |
| context 作为数据通道的必要性 | 降为可选 | 数据走 state 即可；context 回归「注入点」本职 |

### 13.2 有参解决不了、但可以大幅简化的

「构建期环境」（access / i18n 快捷方式 / context）不是「值的数据」问题，而是
「节点如何被构建」的问题，参数改变不了。但其中两条不需要快照：

| 环境 | 简化后的解法 | 依据 |
| --- | --- | --- |
| access | 区域节点构造时已捕获 `_accessContext`（`src/core/node.js:254`），重跑时直接 `withRenderScope(region._accessContext, runSetup)` ——与 `renderDom()` 渲染子节点的做法一致（`src/core/node.js:1312`） | 零新增概念 |
| i18n | **`'key'.s()` 必须支持**（不再考虑"换写法"）：`.s()` 读的是模块级 `stringShortcutI18n`，默认落在全局共享实例（`src/core/i18n.js:274`），重跑在作用域外会切错语言。方案＝给 `stringShortcutI18n` 加一个内部 getter，区域构建时记录实例，重跑时 `withI18nStringShortcut(instance, runSetup)` 恢复 | 一行 getter + 一个字段 |
| context | 数据走 state 后一般不再需要；确实要用时 `snapshotContext()` 现成，区域记录一份 | 已有 API |

结论：原方案 12 节里的「构建期环境快照（三件套）」可缩小为
「access 零成本 + i18n 一个内部 getter + context 用现成的 `snapshotContext()`」——
三者合计不过是「区域存 3 个引用 + 1 个内部 getter + 重跑时包一层 with*」。

### 13.3 有参带来的新问题：普通区域的数据从哪来

`div((ele) => ...)` 的 setup 签名只给节点，不给数据；普通节点区域没有宿主 state。
三种做法：

1. **区域声明数据源**（建议）：`rebuildable(谓词?)` 之外再给一个可选声明
   （如 `ele.source(() => state)`），值函数的参数即该数据源的返回值；
   未声明时默认继承宿主 `vStateNode` 的 state。
2. 有参只在 `vStateNode` 内可用，普通区域退回零参闭包 —— 两套语义，使用者要记。
3. setup 也接收数据（`div((ele, data) => ...)`）—— 破坏现有 DSL 签名，不采用。

选 1 之后，「普通区域也能用值函数」这个目标仍然成立，并且同时拿到
「引擎传入 + 每请求隔离」的结构保证。

## 14. 致命问题排查（结论：无阻塞项，两条必须写死）

## 15. v1 边界与评审修正（2026-09-10 代码评审后）

评审（对照契约 1–13）确认核心语义成立、既有行为零回归，并补齐/定界如下：

1. **累加型登记已由引擎重置**（契约 4 落地）：区域重跑前快照并清空区域根的状态处理器
   （失败回滚），上一轮的 cleanup 在本轮成功后执行；`bindDocumentEvent` / `bindWindowEvent`
   自动登记进本轮 cleanup，第三方定时器需显式 `registerRegionCleanup(fn)`。
2. **嵌套区域已支持**：区域收集不再在区域边界停止，父区域只刷值时子区域仍会评估自己的谓词；
   父区域真正重建时子区域随新子树产出，本轮不再单独触发（按 `_owner` 链判定祖先）。
3. **声明约定**：区域内的值函数与登记应在 `rebuildable()` 之后书写——区域上下文在
   `rebuildable()` 调用点建立，之前的登记会落到外层作用域。
4. **v1 边界（延迟解析的组件子树）**：`x.child(SomeObjectComponent())` 这类子树中声明的区域，
   不会被组件的区域收集覆盖（`ComponentNode` 未解析时 `children()` 为空），其绑定也不随区域释放。
   见工单 12。迁移真实组件前需先确认目标组件的区域声明位置。
5. **有参值函数的启发式**：以 `fn.length > 0` 判定「需要数据源」，因此 `(s = {}) => …`、
   `(...args) => …` 会被判为零参并静默拿到 `undefined`；文档需提示这一边界。
6. **评审遗留项已收口**：契约 2 的子节点归属断言已实现（区域节点在 builder 之外
   `child()` / `addChild()` 直接报错）；§6 测试清单缺口已补齐（谓词每轮只评估一次、
   重复 `rebuildable()` 为替换语义、区域外绑定不受重跑影响、`destroy()` 解除绑定）；
   `types/tests/consumer.ts` 已覆盖 `rebuildable` / `dataSource` / `rerun` / `regionPending`。
7. **最终命名（2026-09-10 定稿）**：`rerun()` → **`rebuild()`**（与 `rebuildable()` 同词根，
   形容词声明 + 动词命令），`regionPending()` → **`rebuildPending()`**；并新增值级入口
   **`flush()`**（节点级与组件级：只求值写回绑定，不重建、不过谓词、幂等）。
   分工固定为「值变化用 `flush()`，结构变化用 `rebuild()`；两者都有时只调 `rebuild()`」，
   devtools 区域事件的 `action: 'flush' | 'rebuild'` 与此保持一致。

**会变成致命的（若不定）**

| # | 问题 | 后果 | 对策 | 状态 |
| --- | --- | --- | --- | --- |
| A | 值刷新与结构重建被合并成一件事 | 每次 `setState` 都重跑 setup → 等价于今天的全量重建，输入焦点、滚动位置、第三方实例全丢；对现有用法是破坏性回归 | 契约 10：`setState` 默认只 flush 值绑定；结构重建仅在区域谓词为真时发生 | 已加入契约 |
| B | 区域注册表用模块级全局 | SSR 并发请求共享注册表 → 跨请求污染 + 内存泄漏（`renderPage` 渲染后 destroy 整棵树） | 契约 11：区域树挂在视图树上 | 已加入契约 |

**必须写进契约的约束（不致命，但漏了会出疑难 bug）**

| # | 问题 | 对策 |
| --- | --- | --- |
| C | 重跑期间 `setState` → 递归 / 无限循环 | 契约 12：重入保护 + 变更入队，本轮结束后统一处理 |
| D | 标记了但没有 builder 的节点 | 契约 13：`rebuildable()` 调用点直接报错 |
| E | 区域 setup 里的一次性副作用（第三方实例、请求、定时器）无法被引擎全部兜底 | 可拦截的（`bindDocumentEvent` / `bindWindowEvent` / `on`）由引擎在重跑前自动清理；不可拦截的写进文档禁令 |
| F | 区域重建后外部闭包持有的旧节点引用变成悬空 | 文档明示；可在 dev 模式对「已 destroy 节点上的写入」告警 |
| G | 构建期上下文（当前区域 / 绑定作用域）用模块级变量 | 同步构建下安全；契约 12 禁止构建期 `await` |

**已核查确认不是问题的**

1. 两阶段替换用现有原语即可实现：`child()` 只改视图树、不碰 DOM，DOM 落地发生在
   `commit()` / `renderDom()`，因此"先构建成功、再销毁替换"天然可行。
2. access 恢复零成本：节点构造时已存 `_accessContext`（`src/core/node.js:254`），
   重跑时 `withRenderScope` 包一层即可，与 `renderDom()` 现行做法一致。
3. hydrate 一致性只在首屏构建期成立，重跑不参与；现有 `ssr.test.js` / `hydrate.test.js`
   已覆盖该链路。
4. 服务端同样要走「构建 → flush」，否则 `toHTML()` 缺绑定值；这与"重跑只在客户端"不冲突。
5. 普通区域的带参值函数若未声明数据源，应当直接报错，而不是静默传 `undefined`。
