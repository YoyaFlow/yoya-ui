# 03 — 细粒度更新事件

**What to build:** 事件流从 commit/destroy 粗粒度升级为能回答「一次交互改了什么」的更新事件：区分首次渲染与后续变更，覆盖属性、class/style、子项增删重排、文本、销毁；事件携带单调递增序号与节点 id；重复渲染无实际变化时不产生噪声事件，销毁对账无泄漏。

**Blocked by:** 02 — 视图树快照与节点身份

**Status:** ready-for-agent

- [ ] 首次渲染产生 commit（mount）事件，后续实际变更产生对应 attr / child / text 粒度事件
- [ ] 已挂载节点的 attr/className/style/text 直接变更会立即上报，不依赖下次 renderDom
- [ ] 子项增删/重排通过 child 事件可见，事件内能区分 added / removed / reordered
- [ ] 事件均含 nodeId 与递增 seq；destroy 后不再产生该节点事件
- [ ] 契约测试：一次交互产生的最小事件序列、幂等渲染零噪声、监听器异常隔离
