# yoya-ui admin 模板开发规则

本文件是 admin 模板的开发规则全集：目录结构、命名、api 分层、请求命令范式、共享组件、导航状态、页面与 mock 接入。以代码为准，新增/修改功能时先对照本文件。

## 1. 目录结构

```text
src/
  main.js                装配根：注册 mock → 加载状态 → 装配外壳 → 启动
  api/                   全局传输层（fetch.api.js / domain.api.js）
  shared/                跨模块共享（按类别集中）
  shell/                 应用外壳（也是模块，按 api / components 组织）
  features/              业务域 = 父模块节点（对应顶级菜单）
    <父模块>/<菜单项>/     每个菜单项一个子模块，自包含 api / components / pages / utils
```

- **配置即目录**：菜单 `key` = features 父目录名 = 路由前缀（`system` ↔ `features/system/` ↔ `/system/members`）
- **模块自包含**：叶子模块只依赖自己的 api / components / pages / utils，不跨模块 import 内部实现
- **依赖方向**：跨模块唯一允许的引用是业务域 `req.js`（对外能力入口）；`shared → features/<域>/api/req.js` 是允许的公开单向依赖

## 2. 文件命名

- api 层：`<域>.<层>.js`（`member.mgr.js`、`shell.req.js`、`ui.buttons.js`）
- 页面：`<名字>-page.js`（`member-list-page.js`、`todo-approval-page.js`）
- 组件：PascalCase（`AdminShell`、`MemberTable`）
- 共享 UI 类别文件：`ui.<类别>.js`（`ui.buttons.js`、`ui.pages.js`）

## 3. api 分层

每个业务域（含外壳）的 `api/` 按职责分文件：

- `mgr.js`：本域管理请求命令（增删改查等）
- `req.js`：对外能力入口（其他模块 / 共享组件调用本域时使用）
- `views.js`：领域结果结构（纯数据类），由命令的 `toItem / toDetail` 映射
- `state.js`：状态类，持有数据与筛选，`subscribe(listener)` 通知视图更新
- `mock.js`：演示用内存 mock（接入真实后端后删除）

判据：有管理动作用 `mgr.js`；只提供查询给外部用 `req.js`；两者可并存（如 `member.mgr.js` + `member.req.js`）。

## 4. 请求命令范式

- 构造器收**单一 `init` 对象**，`id` / `parentId` / `typeId` 等字段也放里面，不单独取参数
- 导出为工厂：`命令名: (init) => new 命令类(init)`
- 消费方：`Mgr.命令({ ... }).submit()`，不写 `new`
- 命令类继承 `RequestBase`，覆写 `address() / method() / params() / body() / toItem() / toDetail()`

```js
export default {
  Query: (init) => new Query(init),
  Create: (init) => new Create(init),
  Update: (init) => new Update(init),
  Remove: (init) => new Remove(init)
};
```

## 5. 共享组件

- **通用 UI**（无业务语义）：放 `shared/ui.<类别>.js`
- **业务共享组件**（带业务语义且多模块使用）：放 `shared/<组件>/` 自包含子目录（组件 + 状态 + 文案），对外只暴露工厂
- **数据获取走 req.js**：共享组件需要业务数据时调用所属域 `api/<域>.req.js` 的公开能力（如 `MemberReq.QueryAvailable().submit()`），不自造数据请求、不注入数据源
- **不深层 import**：只允许跨模块引用 `req.js`，不 import 业务域的 pages / components / state 内部实现
- **自包含 UI 与状态**：弹窗、下拉、open/close 状态内聚在组件内，对外暴露工厂与必要方法（`open()/close()/value()`），不暴露内部状态实现
- **浮层自洽**：弹窗/下拉类共享组件自带 fixed 定位逻辑，不依赖使用方容器样式
- **危险确认统一 vConfirm**：删除/危险操作调用 `vConfirm({ title, content, danger, confirmText })`
  返回 `Promise<boolean>`，不自建 vDialog 确认层（表单类编辑弹窗仍用 vDialog）

## 6. 外壳与导航状态

- `ShellState` 是导航状态（当前模块 / 当前路径）的**唯一事实源**，持有 router，暴露 `switchModule(module)` / `navigate(path)`
- 路由订阅驱动同步：`router.subscribe → state.syncFromPath(path)`，状态变化时通知订阅者
- 顶栏 / 侧栏从状态**派生高亮**，组件不持有自己的激活状态
- `AdminShell` 只做装配：布局组装 + 状态接线，不直接操作 router
- 组件统一写法：节点在 `render()` 内声明式构建，内部引用（如 sidebar 实例、items Map）只用于动态更新
- 前进 / 后退、同模块内切换路由的高亮同步由状态管道自动完成，不需要手动调用

## 7. 页面规则

- **简单 / 占位页**：只放 `pages/<页面>-page.js`，可复用 `shared/ui.pages.js` 的 `PlaceholderPage`
- **有数据交互的页面**：展开完整模块（api / components / pages / utils）
- 页面只做编排：组合子组件、绑定事件、调用 state 动作，不写请求逻辑

## 8. mock 与数据接入

- 所有 mock 在 `main.js` 导入注册（副作用导入）
- mock 返回 `{ ok, data }` 结构，统一经 `Result.from` 解析
- 接入真实后端：删除对应 `mock.js`（或替换为真实接口），调用方零改动

## 9. 类型声明同步

- 改了 mgr / req / views / state 的 js 接口，必须同步对应 `d.ts`
- `d.ts` 与运行时一致：导出为工厂函数类型（如 `(init?) => Query`），不用 `typeof` 构造器类型

## 10. 新增菜单项 checklist（三处同步）

1. `features/` 建父模块目录与菜单项子目录、页面文件
2. `shell/api/shell.mock.js` 菜单数据加 `{ key, label, icon, routes: [{ path, title, viewKey }] }`，`key` 与目录名一致
3. `shell/router.js` 的 `viewRegistry` 注册 `viewKey → 页面组件`

## 11. 启动流程

`main.js` 固定顺序：

1. 导入并注册所有 mock（含 `shell.mock.js` / `auth.mock.js`）
2. `state.load()`：内部先 `loadSession()` 加载会话并 `installAccess(...)` 注入全局权限，再获取菜单（按权限过滤）+ 创建路由 + 订阅导航
3. `AdminShell({ state })` 装配外壳
4. `shell.render().bindTo('#app')`
5. `state.start()` 启动路由

## 12. 权限接入

- **会话与权限**：会话请求命令并入 `shell.req.js`（`ShellReq.Me()`），`shell/api/auth.mock.js` 提供 `/auth/me` 演示数据；会话状态融合进 `ShellState`（`user()` / `roles()` / `permissions()`），`loadSession()` 内 `installAccess` 注入全局。
- **菜单 / 路由**：`shell.mock.js` 的每条路由声明 `permCode`（与权限管理页的 code 对齐），`ShellState.load()` 按 `currentAccess().canRead(permCode)` 过滤菜单；无读的路由不注册，直达 URL 落到未找到页。
- **按钮 / 操作**：直接在按钮上声明 `.access('system:member:create')` 等裸码，无写权限自动禁用、无读自动隐藏（见 member-toolbar / member-table）。
- **体验层**：前端只做显隐 / 禁用，真正的拦截必须由后端按权限码校验。
