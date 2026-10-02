# resources/ —— 项目级资产：数据是什么 / 怎么取

- `<ns>/<name>.json`（推荐）或平铺 `<name>.json`（此时文件里写 `namespace`，缺省 `local`）：
  **一个资源一个文件**（可单独 blame / review）——字段、角色、单位、枚举含义；
  文件名就是资源名的真相（`resources/sales/orders.json` ↔ `sales/orders`），**文件里不写 `id`**；
- `sources.json`：**源清单** —— 「有哪些源」（怎么取：文件 / 库表 / 远端源）。**地址与凭据引用不在这里**；
- `queries/<name>.sql`：取数逻辑（**只放逻辑**）；
- `queries/<name>.json`：这条查询的**元数据**（`source` / `title` / `purpose` / `maxRows` / `params`
  的默认值与 `enum`）—— SQL 里放不下的声明式部分都在这儿。`.sql` 必需、`.json` 可省；
  `<name>.trans.js`（自定义重排，可省）同理一件一文件；
- **地址与凭据引用不在这里**：它们是机器绑定的，住运行时目录（`~/.genui`），或由部署方提供 `hosts`。

判据（元数据按「谁产生」归属）：

| 谁产生的 | 放哪 |
| --- | --- |
| 人给的决策（字段名 / 角色 / 口径 / 取数逻辑） | 这一层（进 Git、可 review、可 blame） |
| 扫出来的事实（表结构 / 列类型 / 行数 / 大小） | 跟着数据走（`../data/` 的 sidecar 或 `../cache/`） |
| 地址与凭据 | 哪个都不是 —— 运行时目录 |

同一个事实**不许两处都有**（对不上时就是差异，交给变更确认闭环）。

示例：`orders.json` + `sources.json` + `queries/orders_page.{sql,json}`（示例，跟着改成本项目的口径）。
