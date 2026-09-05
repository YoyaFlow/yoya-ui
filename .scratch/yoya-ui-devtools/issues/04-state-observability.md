# 04 — vStateNode 状态可观测

**What to build:** devtools 能展示 `vStateNode` 的状态变化：`setState` 变更了哪些 key、状态更新后走了 update 回调还是绑定写回还是 rebuild，都能在事件流与节点详情中看到，调试者能回答「这个值为什么变了、为什么重建」。

**Blocked by:** 03 — 细粒度更新事件

**Status:** ready-for-agent

- [ ] `setState` 产生 state 事件：含变更 keys、变更前后值、触发后的处理路径（update / bindings / rebuild）
- [ ] 绑定写回经已有 attr/text 事件可关联到同一事件序列与组件
- [ ] 状态组件挂载于树中时事件带组件节点 id，未挂载的组件实例事件不抛错
- [ ] 默认关闭零成本：不开启 devtools 时 vStateNode 路径无额外事件与对象分配
- [ ] 契约测试覆盖增量更新、函数 patch、绑定写回与 rebuild
