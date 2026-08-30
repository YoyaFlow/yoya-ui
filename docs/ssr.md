# 服务端渲染（SSR）

yoya-ui 的声明式视图树支持服务端渲染：服务端把页面渲染成完整 HTML，浏览器端收养这份 HTML 并绑定事件。事件处理函数是闭包，不会跨网络传输——它们由客户端重建同一份声明式定义后在 hydration 阶段绑定。

## 架构

```text
服务端：createPage(requestState) → renderToString → HTML + 序列化 state
客户端：读取序列化 state → createPage(state) → hydrate('#app', page) → 事件可用
```

- `renderToString(component, { state, maxNodes })`：输出 `{ html, state, exceeded }`。工厂创建的树在序列化后自动销毁，避免模块级注册表跨请求泄漏。
- `serializeState(state)` / `parseState(state)`：状态安全内联到 `<script>`（`<` 转义为 `\u003c`）。
- `hydrate(component, target, state)`：收养服务端 DOM（节点身份保持）、从 DOM 回读表单快照、绑定 pending 事件。
- `mount(component, target, state)`：客户端全量重建挂载（无服务端 HTML 时使用）。
- `Router.renderPath(path)`：不依赖 window 的服务端路由匹配（支持参数、守卫、404）。

## 页面约定

页面必须是**工厂函数**：`createPage(initialState) => ViewNode`。服务端与客户端用同一份工厂、同一份初始状态，保证树形一致。

```js
function createPage(initial) {
  const locale = createI18n({ language: initial.locale, messages });
  // ... 构建视图树 ...
  return page;
}
```

## 数据逻辑

- 首屏数据由服务端获取，以最小化形式序列化进页面；敏感逻辑与校验放服务端。
- 表单校验规则保持纯函数：服务端先 `validate()` 把错误状态烘焙进首屏 HTML，客户端同一套规则继续校验；用户 JS 加载前的输入由 hydration 阶段从 DOM 回写。
- i18n 每请求创建 `createI18n()` 实例；`.s()` 快捷方式用 `withI18nStringShortcut(locale, build)` 作用域化，共享单例不被请求修改。

## 开发纪律

- `render()` 与 `toHTML()` 路径保持 DOM-free 且确定性：不读 `document`/`window`，不用 `Date.now()`/`Math.random()` 影响输出。
- 浏览器 API（`matchMedia`、`localStorage`、`ResizeObserver` 等）一律加 `typeof xxx === 'undefined'` 守卫，且只放在事件路径或 `renderDom()` 中。
- 模块级可变状态（注册表、id 计数器）不跨请求共享；id 使用渲染上下文分配器（`allocateId`）保证确定性。
- 虚拟滚动等服务端只输出确定性初始窗口，hydration 后按真实视口校准。
- 服务端保持无状态：每请求渲染上下文 + 渲染后销毁 + 输出只依赖请求输入。

## 示例

`src/examples/ssr/`：综合页面（路由 + 表单 + i18n + 图表占位），`node src/examples/ssr/server.mjs` 直接产出页面 HTML。
