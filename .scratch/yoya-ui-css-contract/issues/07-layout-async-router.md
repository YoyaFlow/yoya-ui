# 07 — 迁移布局、异步与路由批次：Layout / DynamicLoader / Router Views

**What to build:** 让布局工厂、动态加载器和路由标签视图的静态样式进入 CSS，运行时尺寸和坐标继续由 JS 或 CSS 变量提供。

**Blocked by:** 01 — 建立 CSS 样式契约与覆盖检查

**Status:** ready-for-agent

- [ ] 页面容器、栅格、分割线和间距的默认样式由 CSS 提供。
- [ ] 动态加载器的状态提示样式由 CSS 提供。
- [ ] 路由标签栏、标签页、溢出弹层和标签位置的静态样式由 CSS 提供。
- [ ] 响应式列数、弹层坐标等运行时值保持 JS 驱动，现有测试和构建通过。
