# 08 — 首个真实组件迁移

**What to build:** 用一个真实组件（vAutocomplete 或 vTree）替换手写的整体重建逻辑，行为不变、测试全绿，作为机制可用性的验证。

**Blocked by:** 04 — vStateNode 接入自动触发, 05 — 普通区域的数据源声明与带参值函数, 11 — 区域重跑前重置累加型登记

**Status:** ready-for-agent

- [x] 目标组件改用区域机制表达内容重建，删除对应手写重建调用。
- [x] 组件既有测试全部通过，交互行为（展开/高亮/选中）无回归。

**实现说明（vAutocomplete）：** 列表面板声明为区域（`list.rebuildable(() => !this._pointerOverList)`），
builder 由原 `_renderList` 的选项产出逻辑抽出为 `_buildOptions`；`_renderList()` 改为
`this._list.rerun()`，手写的 `replaceChildren(this._list, ...)` 已删除。
新增行为：指针悬停在列表上时推迟结构重建（只刷值并记 pending），`mouseleave` 时补一次重建——
把原先「靠 `_setHighlight` 不重建来躲避悬停打断点击」的保护扩展到建议集变化。
