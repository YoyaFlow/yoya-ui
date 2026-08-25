# 01 — 建立 CSS 样式契约与覆盖检查

**What to build:** 让 `yoya.ui.css` 成为所有预定义组件的静态样式契约，并通过覆盖检查证明每个组件 class 和状态钩子都有对应规则。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 为所有组件 class、变体和状态 data 钩子补齐静态 CSS 规则。
- [ ] 新增 CSS 覆盖检查，组件 class 缺失对应规则时测试失败。
- [ ] 示例页面引入 CSS 文件后保持现有外观和交互。
- [ ] 现有组件测试全部通过，内联样式继续作为过渡期兜底。
