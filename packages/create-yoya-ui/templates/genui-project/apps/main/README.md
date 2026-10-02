# UI 工程：main

这是一个**可独立运行**的 yoya-ui 工程（一个 UI 一个工程：导出与部署的单位就是它）。

```bash
npm install
npm run dev      # 本地看页面（默认 5173）
npm run build    # 构建产物，可直接发给 nginx
```

**别直接双击 `index.html`**（`file://` 打开）：ESM + 裸模块名会被浏览器 CORS 挡掉，
报 `Cross origin requests are only supported for protocol schemes…`。必须走 dev server（或构建后的 `dist/` 配 import map）。

**想马上看到页面**，两条路：

1. **交给宿主渲染**（最省事，页面声明是同一份真相）：把 `src/pages/orders-list.genui.json`
   用宿主的 `render_schema` 落成在线页面 —— 宿主的 BFF + 项目 `data/orders.csv` 直接供数；
2. `npm run dev` + 给这个 UI 配一张**本机地址表**（地址是机器绑定的，不进 Git）：

```html
<!-- index.html 里，<script type="module"> 之前加一行 -->
<script>globalThis.__GENUI_HOSTS__ = { 'orders-db': 'http://127.0.0.1:8787' };</script>
```

没配地址时页面会照常渲染，但取数那条线报错（控制台 + `/ui/errors/orders`）—— 这是有意的：
**缺地址必须报出来，不许静默给空表**。

与项目级资产的关系（**判据：数据是什么 / 怎么取 → 项目级；长什么样 → UI 级**）：

- 页面声明在本目录 `src/pages/`（真相，可 diff、可 review）；
- 资源定义与取数逻辑在项目级 `../../resources/`（跨 UI 只留一份）；
- `src/actions.js` 是**取数转发**：只写逻辑名，地址由环境给（`hosts`），缺地址当场报错；
- `genui.export.json` 是这个 UI 的**契约**：地址表 + 接线映射 + 断点清单（部署方照它接后端）。

## 两个示例页

| 页面 | 文件 | 示范什么 |
| --- | --- | --- |
| 列表（默认） | `src/pages/orders-list.genui.json` | 活绑定：`sources` + `@actions:/orders_page` + 筛选值驱动重取 |
| 表单 | `src/pages/orders-new.genui.json` | 表单 + **一个动作**：`vButton` 的 `$action: orders_create` → POST（描述符在 `src/actions.js`） |

切换：`?page=new`（模板不做路由，多页请上 yoya-ui 的 router）。

> **写动作在宿主里还跑不了**：宿主今天只认"已登记查询"（读），页面的写动作要么由**导出的应用**执行（`custodians` 里有 POST 描述符），
> 要么等**票 25（写通道）**。所以这个示例演示的是**应用侧**的写法，不是宿主的在线页面能力。

要第二个界面（客户端 / 大屏 / 对内报表）：在 `apps/<ui>/` 再建一个 —— 项目级资产共用；
**UI 之间不许直接互相引用**。

## 基础库版本（今天有个已知阻塞）

`dependencies` 里基础库按**版本范围**写（`@yoyaflow/yoya-ui` / `@yoyaflow/yoya-core` / `@yoyaflow/yoya-compiler`）——
这是目标形态（基础库 = 依赖，走 package.json）。

**但 npm 上发布的 `0.7.6` 比本地仓旧**：缺 `./genui` 等导出，按版本范围装完 `vite build`
会报 `Rolldown failed to resolve @yoyaflow/yoya-core/genui`。两种做法：

1. **重新发布 yoya-ui / yoya-core**（推荐，一次解决）；
2. 临时把这三个依赖换成 `file:` 指本地仓 —— **本模板现在就是这个状态**：
   `file:../../../../yoya-ui/packages/yoya-ui`（从 `apps/main/` 往上四层就是 `D:\code\yoyaflow`）。
   重发之后把这三行改回 `"^0.7.x"`；**这个相对路径只对"放在 genui-mcp 仓里的模板"成立**，
   挪进 `create-yoya-ui/templates/` 时要按那边的位置重算（或那时已经重发，直接用版本范围）。

实测（2026-09-30）：`file:` 指本地仓时 `npm install` + `npm run build` 都过（171 模块 / 493 KB）。
