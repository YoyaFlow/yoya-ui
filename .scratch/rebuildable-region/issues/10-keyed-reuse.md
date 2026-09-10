# 10 — keyed 复用（后置、可选）

**What to build:** 列表重排时按键复用节点，保住输入焦点与第三方实例；仅在出现真实痛点时启动。

**Blocked by:** 04 — vStateNode 接入自动触发

**Status:** ready-for-agent

- [ ] 按 key 复用 / 移动 / 销毁子节点，复用时不销毁 DOM 与事件 adapter。
- [ ] 无 key 时退回按位置对齐。
