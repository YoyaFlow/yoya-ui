# yoya-ui 后台管理模板

标准管理后台布局：

- 左上角：logo + 系统名
- 中间：顶级导航
- 右上角：用户头像
- 下方：左侧菜单 + 右侧带标题的 RouterViews 内容区
- 点击顶级导航切换左侧菜单与内容路由

## 启动

```bash
npm install
npm run dev
```

## TypeScript

模板默认支持 TypeScript，非侵入接入：现有 `.js` 文件保持不动（`tsconfig.json` 已开启 `allowJs`），需要类型时直接新建或改写为 `.ts` 文件即可（Vite 原生支持）。运行 `npm run typecheck` 做类型检查。

## 结构

```text
src/
  main.js                       入口：初始化主题、加载菜单状态、装配外壳并挂载
  api/
    fetch.api.js                原始传输层（fetch 实现，换请求库只改这里）
    domain.api.js               领域请求入口：统一 Result 解析 + mock/真实切换
  shared/                       跨模块共享（按类别集中管理）
    ui.buttons.js               按钮类共享 UI（RowActionButton 行内操作按钮）
    ui.pages.js                 页面类共享 UI（PlaceholderPage 路由占位页）
  shell/                        应用外壳（按 api / components 组织）
    api/
      shell.req.js              外壳请求命令：QueryMenus 获取菜单（可换服务端接口）
      shell.mock.js             外壳 mock：模拟服务端返回（viewKey 由客户端映射页面）
      shell.views.js            外壳结果结构（Module / Route）
      shell.state.js            外壳状态类 ShellState：菜单 + 导航状态（当前模块/路径），加载时创建并持有路由，暴露导航动作（switchModule / navigate）
    components/
      admin-shell.js            AdminShell 外壳装配（布局组装 + 顶栏/侧栏从状态派生）
      app-navbar.js             AppNavbar 顶部导航（logo + 顶级导航 + 主题/头像）
      app-sidebar.js            AppSidebar 左侧导航外壳
      sidebar-menu.js           SidebarMenu 模块菜单组件
    router.js                   路由组装：viewKey → 页面组件映射 + 404 占位页兜底
  features/                     业务域 = 父模块节点（对应顶级菜单），下按菜单项分子模块
    dashboard/                  工作台
      overview/                 数据概览
        pages/dashboard-overview-page.js 页面编排：核心指标看板 + 趋势卡 + 图表 + 资源使用
        components/dashboard-chart.js     vChart 内置 SVG 适配器（柱状图 / 折线图）
      todos/                    待办审批（简单页示例）
        pages/todo-approval-page.js
    ops/                        运维
      services/                 服务清单（简单页示例）
        pages/service-list-page.js
      deploys/                  部署任务（简单页示例）
        pages/deploy-list-page.js
    system/                     系统
      members/                  成员管理业务域（CRUD 完整模块示例）
        pages/member-list-page.js 页面编排：组合工具栏、表格、弹窗与分页
        components/
          member-toolbar.js     MemberToolbar 搜索/新增工具栏
          member-table.js       MemberTable 成员表格
          member-form-dialog.js MemberFormDialog 新增/编辑弹窗
        api/
          member.mgr.js         管理请求命令（增删改查等）
          member.req.js         外部请求命令（其他模块调用本域能力）
          member.views.js       领域结果结构（列表项 / 详情）
          member.state.js       状态类 MembersPageState：持有数据与筛选，动作 submit 命令后驱动视图
          member.mock.js        演示用内存 mock（接入真实后端后删除）
        utils/options.js        领域常量（角色/状态选项与文案）
      roles/                    角色管理业务域（分页 CRUD 示例）
        pages/role-list-page.js 页面编排：搜索 + 表格 + 分页 + 表单弹窗
        components/             RoleToolbar / RoleTable / RoleFormDialog
        api/                    请求命令 / 状态类 / 结果结构 / mock
      permissions/              权限管理业务域（vTree 权限树示例）
        pages/permission-list-page.js 页面编排：权限树 + 工具栏 + 表单弹窗 + 删除确认
        components/             PermissionFormDialog
        api/                    请求命令 / 状态类 / 结果结构 / mock
      dicts/                    字典管理业务域（字典类型 + 字典项主从示例）
        pages/dict-list-page.js 页面编排：字典类型表格 + 编辑弹窗（基本信息 + 字典值表格）
        components/             DictEditorDialog / DictItemFormDialog
        api/                    请求命令 / 状态类 / 结果结构 / mock
```

目录规则遵循 yoya-ui skill 的业务模块组织（feature 自包含、页面只编排、api 管数据交互、state 管状态）。每个菜单项对应 `features/` 下的一个子模块目录；简单页只放 `pages/` 文件，有数据交互的页面展开 api / components / pages / utils。

扩展新模块：在 `features/` 下建父模块目录（如 `features/orders/`），每个菜单项对应一个子目录；在 `shell/api/shell.mock.js` 模拟返回的菜单数据里加一组 `{ key, label, icon, routes }`（key 与父目录名一致），并把菜单项的 `viewKey` 注册到 `shell/router.js` 的视图注册表。接入真实后端时删除 `shell.mock.js`，由服务端返回同样的菜单结构即可。简单页只放 `pages/` 文件，有数据交互的页面参考 `features/system/members` 的 api / components / pages 分层。

完整开发规则见 [RULES.md](./RULES.md)（目录结构、命名、api 分层、请求命令范式、共享组件、导航状态等）。
