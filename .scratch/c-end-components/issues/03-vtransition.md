# 03 — vTransition 通用进出场过渡

**What to build:** 通用过渡组件（effects 分类），CSS 类驱动的 enter / leave 进出场，复用 `motion: auto|always` 的 reduced-motion 约定；可与 Dialog、Carousel 等现有组件组合使用；含演示页。

**Blocked by:** None — can start immediately.

**Status:** done（2026-09-12 补记：实现与测试早已落地，票面状态此前未更新；证据见本目录 STATUS.md）

- [ ] `show(true)` / `enter()` 应用进入态类，`show(false)` / `leave()` 应用离开态类并触发结束回调
- [ ] reduced-motion 下跳过动画直接切换状态
- [ ] SSR 输出确定（不读 window / document）
- [ ] 演示页可运行、源码可复制
