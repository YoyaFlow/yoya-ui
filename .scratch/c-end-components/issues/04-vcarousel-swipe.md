# 04 — vCarousel 触摸滑动

**What to build:** 给 vCarousel 增加触摸 / 指针滑动切换（pointer / mouse / touch 兼容），水平滑动超过阈值切换到下一项或上一项，垂直滚动不被拦截；滑动交互时暂停自动播放；含演示页。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 水平滑动超过阈值切换上一项 / 下一项；未达阈值回弹不切换
- [ ] 垂直滚动不触发切换（`touch-action: pan-y`）
- [ ] 滑动交互期间暂停 autoplay，交互结束后恢复
- [ ] 测试覆盖 + 演示页可运行
