# 01 — 区域声明与手动重跑

**What to build:** 节点声明为区域后能手动重建内容：`rebuildable()` 标记并记录 builder，`rerun()` 清空子节点、重跑 builder、落地 DOM；旧子节点被销毁、内容不重复、区域外兄弟节点不受影响。

**Blocked by:** None — can start immediately

**Status:** done（2026-09-12 补记：实现与测试早已落地，票面状态此前未更新；证据见本目录 STATUS.md）

- [x] `rebuildable(predicate?)` 记录 builder 与可选谓词；无可重跑 builder 时在调用点报错。
- [x] 两条入口都能记录 builder：元素构造器的 setup 与组件工厂 callback。
- [x] `rerun()` 先构建成功再替换；构建抛错时旧内容原样保留并向外抛出。
- [x] 重跑后子节点不重复、旧子节点被 destroy、区域外兄弟节点 DOM 引用不变。
- [x] `rerun()` 支持 `{ force: true }`；未标记的节点调用 `rerun()` 报错。
- [x] 重新执行 setup 时不会因 `addChild` 重复 key 抛错。
