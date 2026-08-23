# 14 — 开发 VPagination 通用分页组件

**What to build:** 提供独立于数据查询和表格实现的通用分页组件，让页面通过统一 API 展示总数、页码和每页条数，并响应用户的翻页请求。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 提供 VPagination 和 vPagination 公共组件及父节点快捷调用。
- [ ] 支持当前页、总页数、总记录数、每页条数和可选的 pageSize 列表。
- [ ] 支持上一页、下一页、指定页和 pageSize 变更，并通过 change 回调上抛 `{ page, pageSize }`，组件自身不查询数据。
- [ ] 对外提供 `update(result)`，由组件内部维护和刷新所有分页显示节点。
- [ ] 首尾页和无数据状态正确禁用相关操作，并提供键盘操作与可访问语义。
- [ ] 提供公共 API 测试、与 vTable 组合的演示及使用文档。
