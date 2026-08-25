# 04 — 迁移表单批次：Input / Textarea / Select / Checkbox / Switch / Field / Form / Timer

**What to build:** 让表单类组件默认外观、错误态、禁用态和选中态由 CSS 提供，JS 保留值和校验等动态行为。

**Blocked by:** 01 — 建立 CSS 样式契约与覆盖检查；02 — 迁移共享动作批次：Button / Dropdown / Context Menu

**Status:** ready-for-agent

- [ ] 输入、选择、文本域、勾选和开关的默认与状态样式进入 CSS。
- [ ] Field 的查看/编辑/错误提示和 Form 的字段状态由 data 钩子驱动视觉。
- [ ] 日期时间输入保持现有值格式和范围校验行为。
- [ ] 现有表单测试、示例和构建全部通过。
