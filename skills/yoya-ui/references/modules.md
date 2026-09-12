# 业务模块组织规则

面向 yoya-ui 使用方项目的业务代码组织方式，适配「ViewNode + 对象组件 + 手动更新」的模型。结构以 `create-yoya-ui` 的 admin 模板为准（模板内的 `RULES.md` 是同一套规则的完整版）。

## 核心原则

1. **按业务域组织，不按技术类型**：一个业务模块（feature）包含自己的页面、组件、状态与工具，自包含、可独立演进；不要 `pages/components/utils` 全局平铺
2. **页面只做编排**：页面组合子组件、绑定事件，不写散落的业务逻辑；逻辑下沉到组件或状态模块
3. **复用优先提取**：跨模块复用的逻辑提取为薄工厂或共享状态工厂
4. **状态显式化**：yoya-ui 无自动响应式，状态变化由组件决定何时更新 DOM；状态模块只存数据与纯动作，DOM/事件留在组件
5. **配置即目录**：菜单 `key` = features 父目录名 = 路由前缀（`system` ↔ `features/system/` ↔ `/system/members`）

## 目录结构

```text
src/
  main.js                  # 装配根：注册 mock → 加载状态 → 装配外壳 → 启动
  api/                     # 全局传输层（注意与业务域内的 api/ 区分）
    fetch.api.js           # 原始传输：fetch 实现，换 ajax / 请求库只改这里
    domain.api.js          # 领域入口：mock 分发 + fetch 兜底 + Result 归一 + configureRequest
  shared/                  # 跨模块共享：ui.<类别>.js（通用 UI）或 <组件>/（带业务语义，自包含）
  shell/                   # 应用外壳（本身也是一个模块）
    router.js              # createAppRouter + viewRegistry（viewKey → 页面组件）
    api/                   # shell.views.js / shell.req.js / shell.state.js / *.mock.js
    components/            # AdminShell / AppNavbar / AppSidebar / SidebarMenu
  features/                # 业务域 = 顶级菜单，下按菜单项分子模块
    <domain>/<menu-item>/
      pages/               # <名字>-page.js
      components/          # 业务组件（形态 A 薄工厂 / 形态 B 对象组件）
      api/                 # <域>.mgr.js / .req.js / .views.js / .state.js / .mock.js（+ 同名 .d.ts）
      utils/               # 模块内小工具与常量
```

- **两层 `api/` 含义不同**：`src/api/` 是全局传输层；`features/**/api/` 是域内请求命令、结果结构与状态。这是最容易看混的一处。
- **模块自包含**：叶子模块只依赖自己的 api / components / pages / utils。
- **依赖方向**：跨模块唯一允许的引用是对方的 `api/<域>.req.js`；`shared → features/<域>/api/req.js` 是允许的公开单向依赖，不 import 别域的 pages / components / state 内部。
- **简单页只放一个文件**：无数据交互的简单/占位页只放 `pages/<名字>-page.js`（可复用 shared 的占位页组件）；有数据交互的页面才展开 api / components / pages / utils 四件套。
- **层级可简化**：父模块/菜单项两级目录对应导航层级；菜单项较少时可省掉一级，直接用 `features/<域>/{pages,components,api,utils}`。

## 页面模块

- **页面也是组件**：PascalCase 组件名（`MemberListPage`、`OrderListPage`），文件 `<名字>-page.js`；SSR 场景用 `createPage(requestState)` 作为服务端与客户端复用的入口
- 页面只做编排：组合业务组件、绑定事件、调用状态动作；不写请求逻辑、不堆散落结构
- 请求状态只传可序列化数据（路径、筛选条件、locale），不放函数
- **要驱动的先建后放，纯结构直接内联**：需要 `refresh()` / `update()` / `open()` 的组件必须先建再 `child()` 挂载——`child()` 与 `page.vXxx()` 都返回父节点，内联创建拿不到子组件句柄；纯展示块直接写在 render 里即可

```js
import { toast, vPagination, vstack } from '@yoyaflow/yoya-ui';
import MembersPageState from '../api/member.state.js';
import { MemberToolbar } from '../components/member-toolbar.js';
import { MemberTable } from '../components/member-table.js';
import { MemberFormDialog } from '../components/member-form-dialog.js';

export function MemberListPage() {
  const state = new MembersPageState();

  // 需要驱动的组件先建再挂：child() / page.vXxx() 都返回父节点，内联拿不到句柄
  const dialog = MemberFormDialog({ onSubmit: saveMember });
  const table = MemberTable({ rows: () => state.items(), onEdit: (row) => dialog.open(row) });
  const pagination = vPagination({ pageSize: 5, onChange: ({ page }) => applyPage(page) });

  // 关键接线：状态变化后由页面显式驱动视图（若状态是信号，绑定与区域会自动更新，无需这段接线）
  state.subscribe(() => {
    table.refresh();
    pagination.update({ page: state.page(), pageSize: state.pageSize(), total: state.total() });
  });
  state.load();

  function applyPage(page) {
    state.setPage(page);
    state.load();
  }

  function applyFilters(values) {
    state.setKeyword(values.keyword ?? '');
    state.setStatus(values.status ?? '');
    state.setPage(1);
    state.load();
  }

  async function saveMember(id, payload) {
    await (id === null ? state.add(payload) : state.edit(id, payload));
    toast.success('已保存');
  }

  return {
    render() {
      // 纯结构直接内联，上面建好的三个句柄只负责挂载
      return vstack({ gap: '16px' }, (page) => {
        page.h2('成员管理');
        page.vCard((card) => {
          card.vCardHeader('成员列表');
          card.vCardBody((body) => {
            body.child(MemberToolbar({ onSearch: applyFilters, onAdd: () => dialog.open(null) }));
            body.child(table).child(pagination);
          });
        });
        page.child(dialog);
      });
    },
    // 页面也是组件：父级 / 路由可以调用实例方法刷新
    refresh() {
      return state.load();
    }
  };
}
```

## api 目录（请求命令、结果结构与状态）

每个业务域下的 `api/` 存放不依赖 UI 的请求命令、结果结构与状态，页面与组件只调用、不内联实现：

- `<域>.mgr.js`：本域**管理请求命令**（增删改查、禁用、改字段等），命令类继承 `RequestBase`
- `<域>.req.js`：**对外能力入口**（其他模块 / 共享组件调用本域时使用，如 `MemberReq.QueryAvailable()`）
- `<域>.views.js`：**领域结果结构**（纯数据类），由命令的 `toItem / toDetail` 映射；类不单独导出，统一由默认导出命名空间提供
- `<域>.state.js`：**页面状态类**，持有数据与筛选，动作构造命令并 `submit()` 后写入状态
- `<域>.mock.js`：演示用内存 mock（接入真实后端后删除本文件，调用方零改动）
- 同名 `.d.ts` 与 js 一一对应（见「类型声明同步」）

判据：有管理动作用 `mgr.js`；只对外提供查询/能力用 `req.js`；两者可并存（`member.mgr.js` + `member.req.js`）。

传输分层：命令只描述请求（地址、方法、参数、映射），真正发包由库调用注册的传输层——`src/api/domain.api.js` 里的 `domainSubmit` 先匹配 mock、否则走 `fetch.api.js`，最后统一 `Result.from(raw, req)` 归一化；`configureRequest({ submit })` 完成注册。

## 请求命令范式

- 构造器收**单一 `init` 对象**（`id` / `parentId` / `typeId` 等字段也放里面，不单独取参数）
- 导出为工厂：`命令名: (init) => new 命令类(init)`；消费方 `Mgr.命令({ ... }).submit()`，不写 `new`
- 命令类覆写 `address() / method() / params() / body() / toItem() / toDetail()`
- 命令与状态**保持纯逻辑**：不碰 DOM、不绑定事件、不引用视图节点，SSR 场景下可直接在服务端调用
- **统一错误处理**：失败在 mock 或传输层归一化抛错，组件层统一提示（如 `toast.error`），不在多处重复 try/catch

```js
// features/system/members/api/member.mgr.js
import { RequestBase } from '@yoyaflow/yoya-ui';
import Members from './member.views.js';

class Query extends RequestBase {
  constructor({ page = 1, pageSize = 10, keyword = '' } = {}) {
    super();
    this.page = page;
    this.pageSize = pageSize;
    this.keyword = keyword;
  }

  address() {
    return '/members';
  }

  params() {
    return { page: this.page, pageSize: this.pageSize, keyword: this.keyword };
  }

  toItem(row) {
    return new Members.ListItem(row);
  }
}

export default {
  Query: (init) => new Query(init),
  Create: (init) => new Create(init),
  Update: (init) => new Update(init),
  Remove: (init) => new Remove(init)
};
```

## 状态模块

- **局部状态**：对象组件闭包或返回对象上的 `ref`；值位置直接传句柄，写入即写回（不要包 `computed(() => x.value)`，也别传 `x.value` 快照）
- **页面状态类**：`api/<域>.state.js` 默认导出 `<Domain>PageState`，持有数据与筛选、暴露动作方法；**要驱动视图的字段用 `ref` 持有**（同模块的视图 / 组件直接绑句柄），`subscribe(listener)` 只留给非视图副作用
- **跨组件共享**：共享同一组信号（在页面工厂或组件内创建后传下去），或自建状态工厂返回 `{ 数据读取, 动作 }`
- 状态保持纯数据：动作构造请求命令并 `submit()` 后写入状态——写入 `ref` 就完成通知；需要"结构随数据变化"时用可重建区域读信号（见 core.md）

```js
// features/system/members/api/member.state.js
import { ref } from '@yoyaflow/yoya-ui';
import MemberMgr from './member.mgr.js';

export default class MembersPageState {
  constructor(initial = {}) {
    this._filters = initial;
    // 要驱动视图的数据用 ref 持有：视图绑句柄，写入即更新，不需要手动通知
    this.items = ref([]);
    this.total = ref(0);
    this._listeners = new Set(); // 仅非视图副作用（埋点、持久化等）才需要
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async load() {
    const result = await MemberMgr.Query(this._filters).submit();
    this.items.value = result.data;
    this.total.value = result.total ?? result.data.length;
    this._emit();
    return result;
  }

  _emit() {
    this._listeners.forEach((listener) => listener());
  }
}
```

## 业务组件

- **形态 A 薄工厂**：纯展示 / 配置化组合，直接返回 ViewNode；**确定没有额外行为要定义时就用它**，不要为预留能力先包成对象组件
- **形态 B 对象组件**：确有内部状态或对外命令方法的业务组件才用它，返回 `{ render(), ... }`
- **一个业务块一个文件**：`member-table.js`（表格与行操作）、`member-toolbar.js`（筛选栏）、`member-form-dialog.js`（新增/编辑弹窗）
- 输入用 props 式参数与回调（`{ rows, onEdit, onRemove }`），**组件自己不请求数据**：数据由页面从状态取来传入
- 命名用业务前缀（`MemberTable`），与库内 `v` 前缀区分；需要时可 `registerChildFactories` 注册为页面快捷方法
- 弹窗 / 下拉类自带 fixed 定位与 open/close 状态，对外只暴露工厂与必要方法，不暴露内部状态实现
- 业务组件进 `vForm` 时实现 `_collectValue()`，或经 `vFormItem.collectValue(...)` 桥接

## 共享业务组件

跨模块复用的组件统一放 `shared/`，按类别集中组织：通用 UI 组件按类别建文件（如按钮类 `ui.buttons.js`、页面类 `ui.pages.js`）；带业务语义的共享组件自包含一个子目录（组件 + 状态 + 文案），对外只暴露组件工厂。

```text
src/
  shared/
    ui.buttons.js             # 通用 UI：按钮类（RowActionButton 等，无业务语义）
    ui.pages.js               # 通用 UI：页面类（PlaceholderPage 等）
    user-picker/
      user-picker.js          # 组件（形态 B 对象组件）
      user-picker-state.js    # 组件状态（查询/分页等，数据走所属域 req.js）
      user-picker.messages.js # 文案（可选）
```

- **判据**：组件一旦承载业务语义（数据源、权限、业务字段），从 `shared/` 的类别文件提升为自包含子目录；纯展示、无业务依赖的组件留在 `ui.*.js`
- **数据获取走 req.js**：共享组件需要业务数据时调用所属域 `api/<域>.req.js`，不自造数据请求
- **不深层 import**：不 import 业务域的 pages / components / state 内部实现
- **自包含 UI 与状态**：弹窗、下拉、open/close 状态内聚在组件内，页面只调 `picker.open()`；对外暴露工厂与必要方法（`open()/close()/value()`）
- **浮层自洽**：fixed 定位浮层用 `getBoundingClientRect` 计算坐标并跟随 scroll/resize 重定位，不依赖使用方容器样式
- **危险确认统一 vConfirm**：删除/危险操作调用 `vConfirm({ title, content, danger, confirmText })` 取 `Promise<boolean>`，不自建 vDialog 确认层（表单类编辑弹窗仍用 vDialog）

```js
// 使用方页面
const picker = UserPicker({ select: (user) => assignUser(user) });
page.child(picker);
page.vButton('选择用户', (btn) => btn.on('click', () => picker.open()));
```

## 应用外壳与导航状态

应用外壳（管理台布局、顶栏 / 侧栏 / 内容区）同样按模块组织：`shell/api/`（请求与状态）+ `shell/components/`（外壳组件）+ `shell/router.js`（路由与 `viewRegistry`），参考 admin 模板。

- **导航状态单一事实源**：当前模块 / 当前路径只存在状态对象（`ShellState`），持有 router，暴露 `switchModule(module)` / `navigate(path)` / `syncFromPath(path)`
- **路由订阅驱动**：`router.subscribe((context) => state.syncFromPath(context.path))`，状态变化时通知订阅者
- **组件只派生**：顶栏 / 侧栏从状态读取高亮，不持有自己的激活状态；外壳组件只做装配（`AdminShell` 不直接操作 router）
- 前进 / 后退、同模块内切换路由的高亮同步由状态管道自动完成，不需要手动调用
- **会话与权限**：`loadSession()` 拿用户/角色/权限并 `installAccess(createAccess(...))` 注入全局；菜单每条路由声明 `permCode`，`load()` 按 `currentAccess().canRead(permCode)` 过滤，无读路由不注册（直达 URL 落到未找到页）

## 组件函数命名与页面组合

函数按职责分类，命名各守一套：

| 分类                 | 命名                              | 示例                                                 |
| -------------------- | --------------------------------- | ---------------------------------------------------- |
| 组件工厂（产出 UI）  | PascalCase 业务前缀               | `MemberTable`、`MemberSearchForm`、`PlaceholderPage` |
| 页面工厂（也是组件） | PascalCase 组件名                 | `MemberListPage`、`OrderListPage`                    |
| mgr / req 请求命令   | `DomainMgr.xxx` / `DomainReq.xxx` | `MemberMgr.Query`、`MemberReq.QueryAvailable`        |
| views 结果类         | PascalCase                        | `MemberListItem`、`MemberDetail`                     |
| 状态类               | `<Domain>PageState`               | `MembersPageState`                                   |
| 页面内部编排 / 回调  | 动词（不对外暴露为组件）          | `switchModule`、`syncPagination`                     |

- 组件工厂不占 `v` 前缀（`v` 前缀保留给库组件），也不以动词/过程名命名；`pageView`、`tableNode`、`createMemberListPage` 这类产出 UI 却用动作名/工厂名的函数属于命名错误
- 判定口诀：返回值是 ViewNode / 组件对象 → 组件工厂 → PascalCase 业务名；返回值是数据/状态 → `create` 或动词命名
- 组件按业务域落位 `features/<域>/components/`，页面在 `pages/`，请求 / 结果 / 状态都在 `api/`

### 结构块也用函数组件

复杂组件（尤其页面）需要分块定义结构时，文件内部的每一块同样抽成**同文件的函数组件**，在 render 里组合；整棵树看上去应当是一层层组件拼起来的，而不是一段过程式布局代码。

```js
// 同一个文件内：块组件 PascalCase 命名并描述 UI 单元；输入显式、产出 ViewNode
function MemberSummary({ stats }) {
  // 值变化走值绑定：只写回文本，不重建节点
  return p((line) => line.child(vText(() => `共 ${stats().total} 人`)));
}

function MemberFilter({ onInput }) {
  return input((field) => {
    field.attr({ placeholder: '搜索成员…', type: 'text' });
    field.on('input', (event) => onInput(event.target.value));
  });
}

function MemberRow({ row, onSelect }) {
  return li((item) => {
    item.text(row.name);
    item.on('click', () => onSelect(row.id));
  });
}

function MemberRows({ rows, onSelect }) {
  return ul((list) => {
    list.rebuildable(); // 结构随筛选变化：区域负责重建
    rows().forEach((row) => list.addChild(row.id, MemberRow({ row, onSelect })));
  });
}

export function MemberPanel({ state, onFilter, onSelect }) {
  return div((panel) => {
    panel.child(MemberSummary({ stats: () => ({ total: state.members.length }) }));
    panel.child(MemberFilter({ onInput: onFilter }));
    panel.child(MemberRows({ rows: () => state.members, onSelect }));
  });
}
```

- 块组件用与导出组件同一套形态（形态 A 直接返回 ViewNode，或形态 B 返回 `{ render() }`），只是作用域留在文件内；不要用匿名箭头函数或 `renderTop` / `BlockA` 这类位置式命名
- **活数据用 getter 传**：`MemberRows({ rows: () => state.members })` 而不是 `rows: state.members`——数组/对象引用在状态更新后会变陈旧，尤其配合区域重跑时 builder 读到的还是旧值；回写一律走回调（`onSelect(id)`）。不要在块组件里隐式读取外层状态，这样它才能独立阅读、单独替换，必要时直接提升为可复用组件
- **块内的更新分工**：值变化用值绑定（信号优先：`vText(signal)`、`attr(name, signal)`），结构变化用区域——块在自己那层声明 `rebuildable()`，并在 builder 里读当前数据；区域外的输入框等节点不会因此被重建
- 一个块只负责自己那块的 DOM；跨块共享的状态、格式化与样式 token 放在模块级 helper 或组件入口
- 深度以读得懂为界：2–3 层通常足够；更深时先问「这一层该不该独立成组件（或拆文件）」

## 类型声明同步

- 改了 `mgr / req / views / state` 的 js 接口，必须同步对应 `d.ts`
- `d.ts` 与运行时一致：命令导出为工厂函数类型（如 `(init?) => Query`），不用 `typeof` 构造器类型

## 复用与组合

- 跨模块复用：提取薄工厂或状态工厂，页面用 `child()` / 快捷方法组合
- 事件：组件对外用方法调用或 `.on()` 回调；跨模块状态变化用共享状态工厂通知，避免事件链过长
- 避免：同一业务逻辑在多个页面重复实现（应提取到 feature 内组件/状态）

## i18n

- 文案就近放业务模块 `i18n/` 或全局 messages；写法 `'订单列表'.s('orders.title')`
- key 按模块命名空间：`orders.title`、`orders.status.pending`

## SSR 纪律（业务模块同样适用）

- 页面工厂 `render()/toHTML()` DOM-free 且确定性：不读 `document`/`window`、不用 `Date.now()`/`Math.random()` 影响输出
- 请求状态显式传入，渲染后组件树销毁；共享状态实例不要跨请求复用

## 权限接入

- 组件只声明裸资源码 `.access('system:member')`；用户持有 裸码 = 读+写、`r.` = 只读、`w.` = 读+写（显式）
- 容器声明即整块作用域（无读整块隐藏），子节点自行声明就近覆盖
- SPA 启动 `installAccess(createAccess({ permissions, roles }))` 一次；SSR 入口 `options.access` 每请求注入
- admin 脚手架三层接线：`ShellState.loadSession()` 注入全局权限 → 菜单按 `permCode` 过滤 → 按钮裸码 `.access('system:member:create')`（无写自动禁用、无读自动隐藏）
- **体验层而已**：前端只做显隐 / 禁用，真正的拦截必须由后端按权限码校验

## 启动流程与新增菜单 checklist

`main.js` 固定顺序：

1. 导入并注册所有 mock（副作用导入，含 `shell.mock.js` / `auth.mock.js`）
2. `state.load()`：内部先 `loadSession()` 加载会话并 `installAccess(...)`，再取菜单（按权限过滤）+ 创建路由 + 订阅导航
3. `AdminShell({ state })` 装配外壳 → `shell.render().bindTo('#app')`
4. `state.start()` 启动路由

新增一个菜单项要**同步三处**：

1. `features/<域>/<菜单项>/pages/<名字>-page.js`（有数据交互再补 api / components / utils）
2. `shell/api/shell.mock.js` 菜单数据加 `{ key, label, icon, routes: [{ path, title, viewKey }] }`，`key` 与目录名一致
3. `shell/router.js` 的 `viewRegistry` 注册 `viewKey → 页面组件`
