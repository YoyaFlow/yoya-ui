# 14 — 节点自带状态：state() + setState 自动 flushAll

**What to build:** 普通节点也能声明对象式状态（`state({ count: 1 })`），并让 `setState` 成为值级更新的驱动入口（写完自动 `flushAll()`），使「声明状态 → 绑定读它 → 写入后自动刷新」在元素节点这一层闭环。

**Blocked by:** 13 — 统一绑定归属与数据来源（scope / state）

**Status:** done（2026-09-12 补记：实现与测试早已落地，票面状态此前未更新；证据见本目录 STATUS.md）

**背景：** 票 13 之后，绑定的来源可以显式声明（`scope()`）或继承宿主，但普通节点仍然只有单字段的 `setState(name, value)`（且写完什么都不发生）。用户诉求：`ele.state({ count: 1, open: false })` + `setState('open', true)` / `setState({ count: 2 })`，写完自动刷新。

**契约：**

1. `state(initial)`：声明本节点自带状态。对象是**幂等种子**——只补缺省字段，区域重跑不重置；声明后本子树里的 `(s) => value` 读这份状态（`getState` / `getNumberState` 等同样可读）。
2. `setState('key', value)` 与 `setState(patch)` **同义**，只是单值与多值之分；两者都先写状态、再按注册顺序跑本节点处理器。
3. 写完触发 **`flushAll()`**：区域（`rebuildable()`）按谓词重建，普通节点只刷绑定；**结构变化仍然只由 `rebuild()` / 谓词决定**。
4. **构建期**（`setup` 执行中 / 区域重跑中）的 `setState` 只写状态，不触发刷新与重建；构建结束时由引擎统一刷一次（票 13 的首屏求值）。
5. `state()` 与 `scope()` **互斥**：同一节点只能有一个来源，冲突抛 `conflicts`。
6. 重入保护：刷新期间再次 `setState` 只入队，本轮结束后补一次刷新。

**命名冲突处理（重要）：** `state()` 原本被三个组件用作状态读取器，加了 `ViewNode.state()` 会被子类遮蔽（运行时静默失效 + 类型报错）。因此改名：

| 原 API | 新 API | 返回 |
| --- | --- | --- |
| `VLazyImage.state()` | `VLazyImage.loadState()` | `loading / loaded / error` |
| `VDynamicLoader.state()` | `VDynamicLoader.loadState()` | `DynamicLoaderStatus` |
| `VImagePreview.state()` | `VImagePreview.previewState()` | `open / closed` |

**验收：**

- [x] `ele.state({ count: 1, open: false })` 播种后，`(s) => s.count` 读到 1。
- [x] `setState('count', 2)` 与 `setState({ count: 2, open: true })` 行为一致，且写完绑定已刷新。
- [x] 区域重跑不重置种子状态（`setState` 过的值保留）。
- [x] 构建期 `setState` 不触发刷新与重建（构建次数不变）。
- [x] 区域节点自己 `setState` 会按 `flushAll()` 重建（谓词生效）。
- [x] `state()` 与 `scope()` 互斥，双向都报 `conflicts`。
- [x] 刷新期间 `setState` 排队，不递归、不漏刷。
- [x] 三个组件的状态读取器改名后，`typecheck` / 测试 / 文档同步通过。
- [x] 全量测试、`lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿。

**实现说明（2026-09-10）：**

- 引擎：`ViewNode.state(initial)`（幂等种子 + 自带来源，`source: 'state'`）、`scope()` 增加互斥检查与 `source: 'scope'` 标记、`setState` 分派（单值 / patch）+ `_applyStateValue` + `_requestFlushAll`（构建期跳过、重入入队）、`flushAll()`（区域 `rebuild()`、普通节点 `flush()`）。
- 测试：新增 `src/core/node-state-drives-updates.test.js`（8 例，覆盖上面全部契约）；`node-state.test.js` 里「setState 不刷绑定」的旧断言改写为新契约。
- 文档：`docs/component-authoring{,.zh-CN}.md` §6、`skills/yoya-ui/references/{state,core}.md`（含本机副本）、HTML 原生元素页 API 清单与示例同步；新增 `node.state(initial)` / `node.flushAll()` 两行。
- 类型：`types/core.d.ts`（`state` / `flushAll` / `setState` 重载）、`types/async.d.ts`、`types/data-display.d.ts`、`types/tests/consumer.ts`。
- 回归面：库内 19 处 `setState(...)` 调用点全部通过（都是组件根节点，无一是区域节点，所以 `flushAll` 走的是 `flush` 分支）；5 个已迁移组件不受影响。
