# 05 — 作用域可观测

**What to build:** devtools 的节点详情能展示节点声明与生效的 access 权限（含 readonly/hidden 结果），以及在 devtools 开启期间构建节点时可读的 Context/i18n 作用域，定位「为什么这里读到这个权限/locale」。

**Blocked by:** 02 — 视图树快照与节点身份

**Status:** ready-for-agent

- [ ] 快照或查询能给出节点声明的 access 资源码与当前生效状态（active / readonly / hidden）
- [ ] devtools 开启期间构建的节点捕获 Context 层与 i18n 实例引用，详情可读
- [ ] 未开启 devtools 构建的节点不额外捕获作用域，不影响既有内存与行为
- [ ] SSR 确定性不受影响：作用域捕获不读 document/window、不写入渲染输出
- [ ] 契约测试覆盖 access 状态、Context/i18n 捕获与关闭后无捕获
