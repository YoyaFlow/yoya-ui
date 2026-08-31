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
  features/                  # 业务域（按业务划分，如 orders / users / dashboard）
    orders/
      pages/                 # 页面模块（createPage 工厂 / 对象组件）
      components/            # 业务组件（形态 A 薄工厂 / 形态 B 对象组件）
      service/               # 数据请求与纯业务操作（不依赖 UI）
      state/                 # 共享状态（createXxxState 工厂 / vStateNode）
      utils/                 # 业务工具
      i18n/                  # 模块文案（可选，集中管理时放全局 messages）
  shared/                    # 跨业务域共享的业务组件（如用户选择器弹窗），自包含
  ui/                        # 通用 UI 组件（无业务语义，可选）
```

## 页面模块

- 一个页面 = 一个工厂（SSR 场景用 `createPage(requestState)`，服务端与客户端复用同一份）或对象组件（`render()` + 状态方法）
- 页面只做编排：组合业务组件、绑定事件、调用状态动作
- 请求状态只传可序列化数据（路径、筛选条件、locale），不放函数

```js
// features/orders/pages/order-list.js
export function createOrderListPage(initial = {}) {
  const state = createOrdersState(initial.filters); // 状态模块

  return div((page) => {
    page.h1('订单列表'.s('orders.title'));
    page.vButton('刷新', (btn) =>
      btn.on('click', async () => {
        state.setItems(await fetchOrders(initial.filters)); // service 提供数据
      })
    );
    page.child(OrderFilterBar({ filters: state.filters() }));
    page.child(OrderTable({ rows: state.items() }));
  });
}
```

## service 目录（数据请求与纯业务操作）

每个业务域下的 `service/` 存放不依赖 UI 的数据请求与纯业务逻辑，页面与组件只调用、不内联实现：

- **数据请求**：API 调用（fetch/axios 等）、请求参数组装、响应解析与错误归一化
- **纯业务操作**：不涉及 DOM 的业务规则（校验、计算、状态转换、领域动作编排）

```js
// features/orders/service/orders.js
export async function fetchOrders(filters) {
  const query = new URLSearchParams(filters).toString();
  const res = await fetch(`/api/orders?${query}`);
  if (!res.ok) {
    throw new Error(`orders request failed: ${res.status}`);
  }
  return res.json();
}

export function computeOrderTotal(items) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
```

约定：

- **service 与 state 分工**：service 负责「取数和动作」，state 负责「持有数据并驱动视图」；页面/组件调用 service 后把结果写入 state，不在组件里拼请求或写业务规则
- **保持纯逻辑**：service 不碰 DOM、不绑定事件、不引用视图节点，SSR 场景下可直接在服务端调用
- **依赖注入**：数据请求需要的请求上下文（cookie、token、locale）由调用方或工厂参数传入，service 内部不读全局可变状态，避免跨请求串数据
- **统一错误处理**：请求失败在 service 归一化抛错，组件层统一提示（如 `toast.error`），不在多处重复 try/catch

## 状态模块

- **局部状态**：对象组件闭包或返回对象上的属性
- **跨组件共享**：`vStateNode({ state, render, update })`，或自建 `createXxxState(initial)` 工厂返回 `{ 数据读取, 动作 }`
- 命名：`create<Domain>State` 工厂风格
- 状态模块保持纯数据：不碰 DOM、不绑定事件；`update` 返回 `true` 时由 vStateNode 全量重建

```js
// features/orders/state/orders.js
export function createOrdersState(initial = []) {
  let items = initial;
  return {
    items: () => items,
    add(item) {
      items = [...items, item];
    },
    remove(id) {
      items = items.filter((item) => item.id !== id);
    }
  };
}
```

## 业务组件

- **形态 A 薄工厂**：纯展示 / 配置化组合，直接返回 ViewNode
- **形态 B 对象组件**：带状态与交互的业务组件（默认形态），`{ render(), ... }`
- 业务组件命名用业务前缀（如 `OrderStatusBadge`、`OrderTable`），避免与库内 `v` 前缀冲突；需要时可 `registerChildFactories` 注册为页面快捷方法
- 业务组件进 `vForm` 时实现 `_collectValue()`，或经 `vFormItem.collectValue(...)` 桥接

## 共享业务组件

跨模块复用的组件按有无业务语义分两类放置：

- **通用 UI 组件**（无业务语义，如按钮、卡片封装）：放 `ui/`，或直接复用 yoya-ui 内置组件，不做业务封装
- **业务共享组件**（带业务语义且多模块使用，如「用户选择器弹窗」）：放 `shared/`，**自包含**（组件 + 状态/数据加载 + 文案），对外只暴露组件工厂

```text
src/
  shared/
    user-picker/
      user-picker.js          # 组件（形态 B 对象组件）
      user-picker-state.js    # 用户查询/分页状态工厂
      user-picker.messages.js # 文案（可选）
```

约定：

- **判据**：组件一旦承载业务语义（数据源、权限、业务字段），即使被多个模块使用也不放进 `ui/`；`ui/` 只放纯展示、无业务依赖的组件
- **自包含**：弹窗、下拉、数据加载、open/close 状态全部内聚在共享组件内，页面只调 `picker.open()`；共享组件对外暴露工厂与必要方法（如 `open()/close()/value()`），不暴露内部状态实现
- **依赖注入**：数据源（如用户列表 API）经工厂参数或状态工厂注入，共享组件不直接深层 import 某个业务域的内部实现，避免 `features/a` → `features/b` 的强耦合
- **浮层自洽**：弹窗/下拉类共享组件使用 fixed 定位浮层（`getBoundingClientRect` 计算坐标 + scroll/resize 重定位），组件自带定位逻辑，不依赖使用方容器样式
- **命名**：业务前缀（`UserPicker`），与库内 `v` 前缀组件区分；如需进 `vForm` 实现 `_collectValue()`

```js
// 使用方页面
const picker = UserPicker({ select: (user) => assignUser(user) });
page.child(picker);
page.vButton('选择用户', (btn) => btn.on('click', () => picker.open()));
```

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
