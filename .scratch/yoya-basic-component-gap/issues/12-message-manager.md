# 12 — 开发 VMessageManager 局部消息管理组件

**What to build:** 提供显式、可销毁的局部消息管理实例，使页面不必依赖全局 toast 单例。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 支持 show、close、clear、重复 ID 替换和消息类型快捷方法。
- [ ] 可绑定独立容器，销毁时清理定时器、事件和消息节点。
- [ ] 与现有 vMessageContainer、toast 兼容，并提供测试和演示。
