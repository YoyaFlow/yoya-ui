# 08 — 契约收尾：移除静态样式辅助与内联残留

**What to build:** 完成 CSS-first 收口：删除不再需要的静态样式 helper 和静态内联声明，并防止未来组件重新引入静态内联样式。

**Blocked by:** 02 — 迁移共享动作批次：Button / Dropdown / Context Menu；03 — 迁移导航批次：Menu / SubMenu / Sidebar / Navbar / Steps；04 — 迁移表单批次：Input / Textarea / Select / Checkbox / Switch / Field / Form / Timer；05 — 迁移数据展示批次：Card / Detail / Table / Tree / Badge / Pagination / Code；06 — 迁移反馈批次：Message / Dialog / Message Manager；07 — 迁移布局、异步与路由批次：Layout / DynamicLoader / Router Views

**Status:** ready-for-agent

- [ ] 所有静态样式辅助和静态内联声明已移除。
- [ ] 新增回归检查，阻止组件源码重新引入静态视觉内联样式。
- [ ] 全量测试、示例、lint、格式检查和构建以 CSS-first 契约通过。
- [ ] 使用文档明确 `yoya.ui.css` 为 UI 包必带样式文件。
