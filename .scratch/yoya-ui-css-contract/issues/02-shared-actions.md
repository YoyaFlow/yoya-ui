# 02 — 迁移共享动作批次：Button / Dropdown / Context Menu

**What to build:** 让按钮、下拉菜单和右键菜单的静态外观由 CSS 提供，JS 只保留 class、状态属性、动态定位和交互值。

**Blocked by:** 01 — 建立 CSS 样式契约与覆盖检查

**Status:** ready-for-agent

- [ ] 按钮变体、尺寸、hover、active、focus、disabled 和 loading 外观可由 CSS 或主题变量覆盖。
- [ ] 下拉和右键菜单的面板样式进入 CSS，打开状态由 data 钩子驱动。
- [ ] 菜单弹层坐标仍由 JS 动态计算。
- [ ] 现有按钮和浮层交互测试、示例和构建全部通过。
