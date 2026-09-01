# yoya-ui 后台管理模板

标准管理后台布局：

- 左上角：logo + 系统名
- 中间：顶级导航
- 右上角：用户头像
- 下方：左侧可折叠菜单 + 右侧带标题的 RouterViews 内容区
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
  main.js                       入口：初始化主题、创建路由与外壳并挂载
  api/
    fetch.api.js                原始传输层（fetch 实现，换请求库只改这里）
    domain.api.js               领域请求入口：统一 Result 解析 + mock/真实切换
  app/
    modules.js                  模块配置（顶级导航 → 左侧菜单 → 路由）
    router.js                   路由组装（占位页兜底）
    admin-shell.js              AdminShell 页面组件（顶栏 + 侧栏 + 内容区组合）
  ui/
    placeholder-page.js         PlaceholderPage 通用占位页
    app-navbar.js               AppNavbar 顶部导航（logo + 顶级导航 + 主题/头像）
    app-sidebar.js              AppSidebar 左侧导航外壳
    sidebar-menu.js             SidebarMenu 模块菜单组件
  features/
    members/                    成员管理业务域（CRUD 示例）
      pages/member-list-page.js 页面编排：组合工具栏、表格、弹窗与分页
      components/
        member-toolbar.js       MemberToolbar 搜索/新增工具栏
        member-table.js         MemberTable 成员表格
        member-form-dialog.js   MemberFormDialog 新增/编辑弹窗
      api/
        member.mgr.js           管理请求命令（增删改查等）
        member.req.js           外部请求命令（其他模块调用本域能力）
        member.views.js         领域结果结构（列表项 / 详情）
        member.state.js         状态类 MembersPageState：持有数据与筛选，动作 submit 命令后驱动视图
        member.mock.js          演示用内存 mock（接入真实后端后删除）
      utils/options.js          领域常量（角色/状态选项与文案）
    permissions/                权限管理业务域（vTree 权限树示例）
      pages/permission-list-page.js 页面编排：权限树 + 工具栏 + 表单弹窗 + 删除确认
      components/
        permission-form-dialog.js PermissionFormDialog 新增/编辑权限弹窗
      api/
        permission.mgr.js       权限管理请求命令（查询树 / 新增 / 编辑 / 删除）
        permission.state.js     状态类 PermissionsPageState
        permission.views.js     权限节点结构
        permission.mock.js      演示用内存 mock
    roles/                      角色管理业务域（分页 CRUD 示例）
      pages/role-list-page.js   页面编排：搜索 + 表格 + 分页 + 表单弹窗
      components/               RoleToolbar / RoleTable / RoleFormDialog
      api/                      请求命令 / 状态类 / 结果结构 / mock
    dicts/                      字典管理业务域（字典类型 + 字典项主从示例）
      pages/dict-list-page.js   页面编排：字典类型表格 + 编辑弹窗（基本信息 + 字典值表格）
      components/               DictEditorDialog / DictItemFormDialog
      api/                      请求命令 / 状态类 / 结果结构 / mock
```

目录规则遵循 yoya-ui skill 的业务模块组织（feature 自包含、页面只编排、service 里 api 管数据交互、state 管状态）。

扩展新模块：在 `app/modules.js` 的 `modules` 数组里加一组 `{ key, label, icon, routes }`；有数据交互的页面参考 `features/members` 的 api / pages 分层。
