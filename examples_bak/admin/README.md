# 管理列表页示例

这是一个标准后台管理页面的完整示例，包含：

- 搜索表单：关键词和状态筛选。
- 独立数据服务：`admin-service.js` 导出 `createAdminQuery(records)`，返回和分页 API 类似的异步查询函数。
- 表格：姓名、邮箱、角色、状态和操作列。
- 行操作：启用/停用和删除，操作后自动刷新当前页。
- 分页：通用 `vPagination` 负责总数、当前页、页大小和翻页交互。

核心写法是把数据访问封装成函数，之后替换成真实请求时，只需要替换 `query` 的实现，页面状态和表格结构可以继续复用：

```js
import { section } from 'yoya-ui';

export function createAdminQuery(records) {
  return async ({ keyword = '', status = 'all', page = 1, pageSize = 10 } = {}) => {
    const filtered = records.filter((record) => {
      const text = `${record.name} ${record.email}`.toLowerCase();
      return (!keyword || text.includes(keyword.toLowerCase())) &&
        (status === 'all' || record.status === status);
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page: currentPage,
      pageSize,
      totalPages
    };
  };
}

export function renderAdminPage(target = '#app') {
  const query = createAdminQuery([
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', status: 'active' }
  ]);
  const root = section((page) => {
    page.h1('用户管理');
    page.form((form) => {
      form.input((input) => input.id('keyword').attr('type', 'search'));
      form.button((button) => {
        button.attr('type', 'submit').text('查询');
        button.on('click', async (event) => {
          event.preventDefault();
          const result = await query({ keyword: 'Ada', page: 1 });
          console.log(result.items);
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}
```

仓库中的 [admin-service.js](admin-service.js) 提供查询、状态更新和删除接口；[admin-page.js](admin-page.js) 使用闭包函数管理查询条件和分页状态，并负责组件定义与页面组合。

页面主体进一步拆为三个函数组件：

- `AdminSearchForm(params)`：接收输入节点引用以及提交、重置回调。
- `AdminUserTable(params)`：返回 `{ render, renderRows }` 对象，并上抛状态切换和删除操作。
- `AdminPagination(params)`：包裹通用 `vPagination`，对外保留 `update(result)`、`setFeedback(message)` 和 `change(handler)`。

它们都返回 Factory，并由页面统一组合：

```js
page.child(
  AdminSearchForm({ onSubmit, onReset }),
  userTable,
  pagination
);
```

搜索表单和分页组件通过参数回调调用页面闭包中的 `searchUsers`、`resetUsers` 和 `refreshUsers`。`refreshUsers` 查询完成后调用 `userTable.renderRows(records)` 和 `pagination.update(result)`。Table 不导入 service，Pagination 只回传 `{ page, pageSize }`，页面再决定是否继续查询。

页面中的状态徽标和行操作使用函数组件约定：参数函数返回 Factory，表格单元格通过 `child` 动态取得真实节点。

```js
import { span } from 'yoya-ui';

function AdminStatusBadge({ status }) {
  return () => span(status === 'active' ? '启用' : '停用')
    .className(`status status-${status}`);
}

row.td((cell) => {
  cell.child(AdminStatusBadge({ status: record.status }));
});
```

运行：

```bash
npm run examples:admin
```

然后访问 `/examples/admin/index.html`。
