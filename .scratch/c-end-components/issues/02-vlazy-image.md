# 02 — vLazyImage 图片懒加载

**What to build:** 图片懒加载组件（async 分类），IntersectionObserver 进入视口才加载，原生 `loading="lazy"` 兜底；提供加载中占位、加载成功、加载失败三种状态与重试入口；SSR 输出确定性。

**Blocked by:** None — can start immediately.

**Status:** done（2026-09-12 补记：实现与测试早已落地，票面状态此前未更新；证据见本目录 STATUS.md）

- [ ] 未进入视口不触发加载，进入视口后设置 src 并触发加载
- [ ] 加载失败显示失败态并可重试；加载中显示占位
- [ ] SSR 输出不依赖 window / IntersectionObserver
- [ ] 演示页可运行、源码可复制
