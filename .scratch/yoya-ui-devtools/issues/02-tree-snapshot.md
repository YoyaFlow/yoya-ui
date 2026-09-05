# 02 — 视图树快照与节点身份

**What to build:** `getDevtoolsSnapshot(root)` 返回可画成视图树的纯数据快照：元素/文本/组件边界、fragment/多根、keyed 子节点、class/attr/text 都可见；每个节点有稳定 id（同一节点跨多次快照不变），并提供按 id 取真实 DOM 的查询，调试者能画出与页面一致的树并定位元素。

**Blocked by:** 01 — devtools 公开运行时契约

**Status:** ready-for-agent

- [ ] 快照区分 element / text / component 三种节点，包含 tag、class、attr、text、children
- [ ] 组件对象与多根 fragment 在快照中呈现完整边界与全部根节点
- [ ] 节点 id 稳定：同节点多次快照同 id；销毁后按 id 查 DOM 返回空
- [ ] element/text 渲染后可经 id 取到真实 DOM 节点，未渲染节点不报错
- [ ] 契约测试覆盖文本、组件、keyed 子节点、多根 fragment 与 id 稳定性
