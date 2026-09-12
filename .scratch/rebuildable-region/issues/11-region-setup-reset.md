# 11 — 区域重跑前重置累加型登记

**What to build:** 区域 setup 被重跑时，那些「调用一次就累加一次」的登记不会叠加：状态处理器、文档/窗口级监听、定时器都要在重跑前由引擎清理，使区域 setup 可以安全地当作纯构建反复执行。

**Blocked by:** 04 — vStateNode 接入自动触发

**Status:** done（2026-09-12 补记：实现与测试早已落地，票面状态此前未更新；证据见本目录 STATUS.md）

**背景：** 设计稿契约 4 要求「累加型 API 不得累积（引擎强制）」，工单 01–07 只落地了绑定归属与释放，这一条尚未实现：

- `registerStateHandler` 是数组 push，重跑一次就多一份处理器；
- `bindDocumentEvent` / `bindWindowEvent` 返回 unbind 函数，setup 里忽略返回值即叠加监听；
- `setInterval` / `setTimeout` 依赖 `destroy()` 清理，而区域重跑不销毁区域节点本身。

**为什么先于迁移：** 真实组件（如 vAutocomplete 的点击外部关闭）大量使用文档级监听，直接迁移会踩到这条。

- [x] `registerStateHandler` 在区域重跑前重置，重跑后处理器数量与首次构建一致。
- [x] 区域内 `bindDocumentEvent` / `bindWindowEvent` 的监听可被重跑替换，不叠加、不泄漏。
- [x] 定时器走统一登记入口 `registerRegionCleanup(fn)`，重跑时执行上一轮登记（文档说明）。
- [x] 契约测试覆盖处理器与文档监听在「重跑 N 次」后的登记数量恒定。

**实现说明：** 重跑前快照区域根的状态处理器并清空（失败时回滚），上一轮的 cleanup 本轮成功后执行；`bindDocumentEvent` / `bindWindowEvent` 已自动登记，第三方定时器需显式调用 `registerRegionCleanup`。
