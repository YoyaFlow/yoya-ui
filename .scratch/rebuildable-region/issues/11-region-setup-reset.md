# 11 — 区域重跑前重置累加型登记

**What to build:** 区域 setup 被重跑时，那些「调用一次就累加一次」的登记不会叠加：状态处理器、文档/窗口级监听、定时器都要在重跑前由引擎清理，使区域 setup 可以安全地当作纯构建反复执行。

**Blocked by:** 04 — vStateNode 接入自动触发

**Status:** ready-for-agent

**背景：** 设计稿契约 4 要求「累加型 API 不得累积（引擎强制）」，工单 01–07 只落地了绑定归属与释放，这一条尚未实现：

- `registerStateHandler` 是数组 push，重跑一次就多一份处理器；
- `bindDocumentEvent` / `bindWindowEvent` 返回 unbind 函数，setup 里忽略返回值即叠加监听；
- `setInterval` / `setTimeout` 依赖 `destroy()` 清理，而区域重跑不销毁区域节点本身。

**为什么先于迁移：** 真实组件（如 vAutocomplete 的点击外部关闭）大量使用文档级监听，直接迁移会踩到这条。

- [ ] `registerStateHandler` 在区域重跑前重置，重跑后处理器数量与首次构建一致。
- [ ] 区域内 `bindDocumentEvent` / `bindWindowEvent` 的监听可被重跑替换，不叠加、不泄漏。
- [ ] 区域重跑前清理本轮登记前的定时器（或提供统一的登记入口 + 文档禁令）。
- [ ] 契约测试覆盖上述三类在「重跑 N 次」后的登记数量恒定。
