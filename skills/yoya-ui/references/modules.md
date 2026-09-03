# 业务模块组织规则

面向 yoya-ui 使用方项目的业务代码组织方式，适配「ViewNode + 对象组件 + 手动更新」的模型。

## 核心原则

1. **按业务域组织，不按技术类型**：一个业务模块（feature）包含自己的页面、组件、状态与工具，自包含、可独立演进；不要 `pages/components/utils` 全局平铺
2. **页面只做编排**：页面组合子组件、绑定事件，不写散落的业务逻辑；逻辑下沉到组件或状态模块
3. **复用优先提取**：跨模块复用的逻辑提取为薄工厂或共享状态工厂
4. **状态显式化**：yoya-ui 无自动响应式，状态变化由组件决定何时更新 DOM；状态模块只存数据与纯动作，DOM/事件留在组件

## 目录结构

```text
src/
  features/                  # 业务域 = 父模块节点（对应顶级导航/菜单），下按菜单项分子模块
    orders/                  # 父模块（如订单管理，key 与路由前缀一致）
      order-list/            # 菜单项对应的子模块
        pages/               # 页面模块（createPage 工厂 / 对象组件）
        components/          # 业务组件（形态 A 薄工厂 / 形态 B 对象组件）
        api/                 # 请求命令与状态：mgr / req / views / state / mock
        utils/               # 业务工具
        i18n/                # 模块文案（可选，集中管理时放全局 messages）
      order-detail/          # 另一个菜单项子模块
        ...
  shared/                    # 跨业务域共享（按类别集中：ui.buttons.js / ui.pages.js 等）
```

## 页面模块

- 一个页面 = 一个工厂（SSR 场景用 `createPage(requestState)`，服务端与客户端复用同一份）或对象组件（`render()` + 状态方法）
- 页面只做编排：组合业务组件、绑定事件、调用状态动作
- 请求状态只传可序列化数据（路径、筛选条件、locale），不放函数
- 页面文件命名 `<名字>-page.js`（如 `order-list-page.js`）
- **简单页只放一个文件**：无数据交互的简单/占位页只放 `pages/<页面>-page.js`（可复用 shared 的占位页组件）；有数据交互的页面才展开 api / components / pages / utils 完整模块

```js
// features/orders/order-list/pages/order-list-page.js
export function createOrderListPage(initial = {}) {
  const state = new OrdersPageState(initial.filters); // api/order.state.js

  return div((page) => {
    page.h1('订单列表'.s('orders.title'));
    page.vButton('刷新', (btn) =>
      btn.on('click', async () => {
        await state.load(); // api/order.state.js 构造请求命令并 submit
      })
    );
    page.child(OrderFilterBar({ filters: state.filters() }));
    page.child(OrderTable({ rows: state.items() }));
  });
}
```

## api 目录（请求命令与状态）

每个业务域下的 `api/` 存放请求命令与状态，按文件职责分层（以 admin 模板代码为准）：

- `mgr.js`：本域管理请求命令（增删改查等），命令类继承 `RequestBase`
- `req.js`：对外能力入口（其他模块调用本域时使用）
- `views.js`：领域结果结构（纯数据类），由命令的 `toItem / toDetail` 映射
- `state.js`：状态类，持有数据与筛选，动作构造命令并 `submit()` 后写入状态
- `mock.js`：演示用内存 mock（接入真实后端后删除）
- 文件命名 `<域>.<层>.js`（如 `order.mgr.js`、`order.state.js`）；有管理动作用 `mgr.js`，只对外提供查询/能力用 `req.js`，两者可并存
- mock 返回 `{ ok, data }` 结构，统一经 `Result.from` 解析；接入真实后端删除 mock，调用方零改动

命令统一范式：构造器收单一 `init` 对象（`id` / `parentId` 等字段也放里面）；导出为工厂 `命令名: (init) => new 命令类(init)`；消费方 `Mgr.命令({ ... }).submit()`。

```js
// features/orders/order-list/api/order.mgr.js
import { RequestBase } from '@yoyaflow/yoya-ui';
import Orders from './order.views.js';

class Query extends RequestBase {
  constructor({ page = 1, pageSize = 10, keyword = '' } = {}) {
    super();
    this.page = page;
    this.pageSize = pageSize;
    this.keyword = keyword;
  }

  address() {
    return '/orders';
  }

  params() {
    return { page: this.page, pageSize: this.pageSize, keyword: this.keyword };
  }

  toItem(row) {
    return new Orders.ListItem(row);
  }
}

export default {
  Query: (init) => new Query(init)
};
```

约定：

- **state 负责「持有数据并驱动视图」**：页面/组件只调用 state 动作，不在组件里拼请求或写业务规则
- **保持纯逻辑**：命令与状态不碰 DOM、不绑定事件、不引用视图节点，SSR 场景下可直接在服务端调用
- **统一错误处理**：请求失败在 mock 或真实传输层归一化抛错，组件层统一提示（如 `toast.error`），不在多处重复 try/catch

## 状态模块

- **局部状态**：对象组件闭包或返回对象上的属性
- **页面状态类**：`api/<domain>.state.js` 默认导出状态类，持有数据与筛选，暴露动作方法；`subscribe(listener)` 通知视图更新（如模板 `MembersPageState`）
- **跨组件共享**：`vStateNode({ state, render, update })`，或自建状态工厂返回 `{ 数据读取, 动作 }`
- 状态保持纯数据：不碰 DOM、不绑定事件；动作构造请求命令并 `submit()` 后写入状态

```js
// features/orders/order-list/api/order.state.js
import OrderMgr from './order.mgr.js';

export default class OrdersPageState {
  constructor(initial = {}) {
    this._filters = initial;
    this._items = [];
    this._listeners = new Set();
  }

  filters() {
    return this._filters;
  }

  items() {
    return this._items;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async load() {
    const result = await OrderMgr.Query(this._filters).submit();
    this._items = result.data;
    this._emit();
    return result;
  }

  _emit() {
    this._listeners.forEach((listener) => listener());
  }
}
```

## 业务组件

- **形态 A 薄工厂**：纯展示 / 配置化组合，直接返回 ViewNode
- **形态 B 对象组件**：带状态与交互的业务组件（默认形态），`{ render(), ... }`
- 业务组件命名用业务前缀（如 `OrderStatusBadge`、`OrderTable`），避免与库内 `v` 前缀冲突；需要时可 `registerChildFactories` 注册为页面快捷方法
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

约定：

- **判据**：组件一旦承载业务语义（数据源、权限、业务字段），从 `shared/` 的类别文件提升为自包含子目录；纯展示、无业务依赖的组件留在 `ui.*.js` 类别文件中
- **数据获取走 req.js**：共享组件需要业务数据时，调用所属域 `api/<域>.req.js` 的公开能力（如 `MemberReq.QueryAvailable().submit()`），不自造数据请求；`shared → features/<域>/api/req.js` 是允许的公开单向依赖
- **不深层 import**：共享组件不 import 业务域的 pages / components / state 内部实现；只有 `req.js`（对外能力入口）可以被跨模块引用
- **自包含 UI 与状态**：弹窗、下拉、open/close 状态内聚在共享组件内，页面只调 `picker.open()`；对外暴露工厂与必要方法（如 `open()/close()/value()`），不暴露内部状态实现
- **浮层自洽**：弹窗/下拉类共享组件使用 fixed 定位浮层（`getBoundingClientRect` 计算坐标 + scroll/resize 重定位），组件自带定位逻辑，不依赖使用方容器样式
- **命名**：业务前缀（`UserPicker`），与库内 `v` 前缀组件区分；如需进 `vForm` 实现 `_collectValue()`

```js
// 使用方页面
const picker = UserPicker({ select: (user) => assignUser(user) });
page.child(picker);
page.vButton('选择用户', (btn) => btn.on('click', () => picker.open()));
```

## 应用外壳与导航状态

应用外壳（管理台布局、顶栏 / 侧栏 / 内容区）同样按模块组织：`api/`（请求与状态）+ `components/`（外壳组件），参考 admin 模板。

- **导航状态单一事实源**：当前模块 / 当前路径只存在状态对象（如 `ShellState`），持有 router，暴露 `switchModule(module)` / `navigate(path)`
- **路由订阅驱动**：`router.subscribe((context) => state.syncFromPath(context.path))`，状态变化时通知订阅者
- **组件只派生**：顶栏 / 侧栏从状态读取高亮，不持有自己的激活状态；外壳组件只做装配，不直接操作 router
- 前进 / 后退、同模块内切换路由的高亮同步由状态管道自动完成，不需要手动调用

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
- admin 脚手架：`ShellState.load()` 加载会话并注入全局权限 → 菜单按 `permCode` 过滤 → 按钮裸码 `.access()`（详见 access-control.md）
