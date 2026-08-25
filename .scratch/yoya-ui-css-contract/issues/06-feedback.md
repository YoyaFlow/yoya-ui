# 06 — 迁移反馈批次：Message / Dialog / Message Manager

**What to build:** 让消息、弹窗和消息容器的静态样式进入 CSS，JS 只负责消息队列、自动关闭、弹窗开关和动态进度。

**Blocked by:** 01 — 建立 CSS 样式契约与覆盖检查

**Status:** ready-for-agent

- [ ] 消息类型色、倒计时条、关闭按钮和容器位置样式由 CSS 提供。
- [ ] 弹窗表面、圆角、阴影和打开状态视觉由 CSS 提供。
- [ ] 倒计时宽度等运行时值继续由 JS 更新。
- [ ] 现有反馈测试、示例和构建全部通过。
