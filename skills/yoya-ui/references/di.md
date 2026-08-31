# 依赖注入推荐

yoya-ui 不强制引入运行时框架或 DI 容器，依赖注入采用两级方案：**工厂参数注入（默认） + 作用域上下文（跨层共享）**。

## 一级：工厂参数注入（默认）

依赖通过工厂参数显式传入，页面与组件不隐式获取全局状态。这是 SSR 每请求隔离与可测试性的基础。

```js
// 页面：请求状态 + 不可序列化依赖（deps）
export function createOrderListPage(initial = {}, deps = {}) {
  const { api } = deps; // 数据请求实现
  const state = createOrdersState(initial.filters);

  return div((page) => {
    page.vButton('刷新', (btn) =>
      btn.on('click', async () => state.setItems(await api.fetchOrders(initial.filters)))
    );
    page.child(OrderTable({ rows: state.items() }));
  });
}

// 渲染入口注入：服务端传真实实现，测试传假实现
renderToString(createOrderListPage, {
  state: initial,
  deps: { api: realOrdersApi },
  i18n: (s) => createI18n({ language: s.locale, messages })
});
```

适用：依赖深度浅（页面直接调 service/组件）、依赖数量少。共享业务组件同样用参数注入数据源：

```js
UserPicker({ fetchUsers: deps.api.fetchUsers, select: (user) => assignUser(user) });
```

## 二级：作用域上下文（跨层共享）

当同一依赖需要穿透多层组件（如全局配置、当前用户、请求级 token），逐层传参会造成噪音，改用**每请求作用域上下文**：依赖在根节点提供，子树按需注入。

```js
// 每请求创建上下文容器，放入不可序列化依赖
const ctx = createAppContext(initial, deps); // { api, config, token, ... }

// 根节点提供作用域（参考库内 withI18nStringShortcut 的作用域先例）
page.child(vProvide(ctx, () => createOrderListPage(initial, deps)));

// 深层组件按需取用
function OrderTable({ rows }) {
  return vTable({
    rows,
    onAction: (row) => useService(ctx => ctx.api.archive(row.id))
  });
}
```

约定：

- **每请求实例**：`createAppContext(initial, deps)` 在每次渲染/请求中创建，禁止模块级全局单例容器——否则 SSR 下不同请求的 token/用户会串数据
- **显式键**：上下文按名称取用（`ctx.api`、`ctx.config`），不做隐式魔法；组件仍可单独注入覆盖（参数优先于上下文）
- **作用域即边界**：`vProvide` 包裹的子树才可见该上下文，未包裹处取不到，避免全局污染
- **测试友好**：注入假实现即可，无需 mock 全局

## 不推荐

- **全局单例服务定位器**（`getService('api')` 全局访问）：SSR 下跨请求共享状态，与「每请求隔离」纪律冲突
- **隐式依赖**：组件从模块作用域直接 import 单例数据源，难以测试、难以按请求替换
- **重 DI 容器**（接口注册、自动装配）：对轻量核心库过重，收益低

## 与现有机制的关系

- SSR 的 `deps` 注入（`createPage(initial, deps)`）就是一级方案；请求上下文（cookie/token/locale）经 `initial` 显式传入 service，不读全局
- i18n 的 `withI18nStringShortcut` / 渲染入口 `i18n` 选项是「每请求作用域」的既有先例，二级方案沿同一模式
- 选择顺序：能参数注入就参数注入；穿透层数多再用作用域上下文；两者都避免全局单例
