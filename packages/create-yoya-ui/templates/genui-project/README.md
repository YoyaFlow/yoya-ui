# genui-project —— GenUI 应用模板

**这是 agent 的工作目录**，也是一个普通的 npm 工程：宿主（`genui-mcp`）把「项目」认成**目录本身**，
所以 `cd` 进来起宿主 = 就在这个项目里干活。

> 形状契约：`docs/project-shape-v0.md`（v0 草案）。本目录是那份契约的**活样板**，
> 将来挪进 `create-yoya-ui` 的 `templates/` 变成 `--template genui`。

## 判据（一句话）

**数据是什么 / 怎么取 → 项目级；长什么样 → UI 级。**

```
genui-project/
├─ package.json            项目声明（workspaces：kits/*/* 与 apps/*）+ genui 段
├─ .gitignore              依赖 / 构建产物 / 可重建物 / 宿主过渡期目录
├─ resources/            ★ 项目级：数据是什么（<resource>.json）、怎么取（queries/*.sql）
├─ components/           ○ 项目级 L6 业务块（一文件一件；多 UI 共享才放这）
├─ kits/<owner>/<kit>/   ○ 本项目锁定的组件库副本（vendoring + provenance）
│                           注意：yoya-ui / yoya-core 是**基础库依赖**（走 package.json），不是 kit
├─ apps/<ui>/            ★ 每个 UI 一个可独立跑的工程（导出与部署的单位）
├─ data/                 ★ 默认数据根（数据文件 + 扫出来的 sidecar）
├─ cache/  versions/     ○ 可重建 / 预留（数据版本）
└─ .genui/               ○ 宿主账本：索引 / 引用图 / 统计（全部可重建）
```

## 起它

```bash
# 宿主（MCP 服务）：它把这个目录当项目（cwd 即项目，也可以 --project-dir 指它）
genui-mcp

# UI 工程：每个 apps/<ui>/ 都能单独跑
cd apps/main
npm install && npm run dev
```

## 接真数据（过渡期口径）

宿主**今天**仍把项目资产放在 `state/`（页面 / 清单 / 数据源登记表）——`resources/`、`apps/<ui>/src/pages/`、
`.genui/` 是契约里的目标位置，见契约 §12 的对照表。`state/` 已在 `.gitignore` 里：它是过渡期的宿主目录，
**不是项目的真相**。

想让示例页真的取到数，在本项目里建一份 `state/datasources.json`（登记表：**怎么取**）：

```json
{
  "version": 1,
  "roots": ["../data"],
  "sources": { "orders": { "title": "订单", "files": ["orders.csv"] } },
  "queries": {
    "orders_page": {
      "source": "orders",
      "title": "订单列表",
      "sql": "select id, customer, amount, status, owner, createdAt from orders\nwhere ($keyword is null or $keyword = '' or id like '%' || $keyword || '%')\n  and ($status is null or $status = '' or status = $status)\norder by id limit $pageSize offset ($page - 1) * $pageSize",
      "maxRows": 100,
      "params": {
        "keyword": { "type": "string", "label": "关键词", "default": "" },
        "status": {
          "type": "string",
          "label": "状态",
          "default": "",
          "enum": ["待付款", "已付款", "已发货", "已完成"]
        },
        "page": { "type": "number", "label": "页码", "default": 1 },
        "pageSize": { "type": "number", "label": "每页条数", "default": 10 }
      }
    }
  }
}
```

**参数契约要写全**：SQL 里的 `$name` 占位符靠这张 `params` 表给类型与默认值 —— 不写就会被当成 `null`
（查询静默返回空表，页面上只看到 0 行）。这段 SQL 就是 `resources/queries/orders_page.sql`。

**地址与凭据不写在这里**（它们是机器绑定的）：本机开发用运行时目录的解析表，部署时由部署方提供
`hosts` —— 见 `apps/main/src/actions.js` 与 `apps/main/genui.export.json`。

## 改成本项目的样子

1. `package.json` 的 `genui.project` 改成你的 `owner/name`（或删掉那行：宿主按目录名给 `local/<目录名>`）；
2. 把示例（一份资源 `resources/orders.json` + 一条取数逻辑 `resources/queries/orders_page.sql` +
   一个列表页 `apps/main/src/pages/orders-list.genui.json` + 一份数据 `data/orders.csv`）换成你自己的；
3. 要第二个界面（客户端 / 大屏 / 对内报表）：在 `apps/<ui>/` 再建一个 —— 项目级资产共用；
   **UI 之间不许直接互相引用**，要共享走 `components/` 或 promote。
