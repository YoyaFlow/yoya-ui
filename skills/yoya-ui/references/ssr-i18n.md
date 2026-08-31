# SSR 与 i18n

## 架构

服务端把页面渲染成完整 HTML 与序列化状态；浏览器端收养这份 HTML 并绑定事件（事件处理是闭包，不跨网络，由客户端重建同一份声明式定义后在 hydration 阶段绑定）。

```text
请求 → 服务端：解析请求（路径/locale/主题/cookie）→ createPage(requestState)
       → renderToString → { html, state, exceeded } → 组装 HTML 外壳（#app + __YOYA_DATA__）
浏览器：有服务端 HTML → hydrate()；空壳（回退或纯客户端）→ mount()
```

## 页面工厂约定

**服务端与客户端必须使用同一份工厂** `createPage(requestState) => ViewNode`，两端用相同输入构建同一棵树，hydration 才能按节点对齐。

```js
// page.js —— 两端共用
export function createPage(initial = {}) {
  return div((root) => {
    root.h1('欢迎'.s('welcome'));
    root.child(router);
    root.child(form);
  });
}
```

请求状态只放可序列化数据（路径、locale、表单初值），不放函数；不可序列化的客户端依赖（如 ECharts 实例）通过 `deps` 注入。

## 渲染入口

```js
import { renderToString, resolveLocale, serializeState } from 'yoya-ui/ssr';

const initial = {
  locale: resolveLocale(
    { cookie: req.headers.cookie, url: req.url, acceptLanguage: req.headers['accept-language'] },
    { cookieKey: 'yoya-lang' }
  ), // cookie > query > Accept-Language
  path: url.pathname
};

const { exceeded, html, state } = renderToString(createPage, {
  maxNodes: 5000, // 超限返回 exceeded: true，客户端回退 mount()
  state: initial,
  i18n: (s) => createI18n({ language: s.locale, messages }) // 每请求实例，.s() 自动作用域
});
```

客户端切换语言时写 cookie（如 `document.cookie = 'yoya-lang=en; path=/'`），之后请求自动带上；页面级缓存需 `Vary: Cookie` 或按语言拆缓存。

## 客户端启动（client.js）

```js
import { hydrate, mount, parseState } from 'yoya-ui/ssr';
import { createPage } from './page.js';

const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');

if (app.firstElementChild) {
  hydrate(createPage, app, data, { i18n: createLocale });
} else {
  mount(createPage, app, data, { i18n: createLocale });
}
```

`client.js` 由打包器构建，保证 `page.js` 与 `yoya-ui/ssr` 解析到同一份模块实例（双副本会导致 `instanceof` 失配）。

## 大页面回退与 Islands

- `renderToString(component, { maxNodes })` 超限返回 `{ exceeded: true, html: '' }`，服务端输出空壳，客户端走 `mount()`
- 非 SSR 模块用 `vClientOnly(() => vEchart({ option, echartsLib }))`：服务端只输出占位 div，hydration 阶段由客户端加载替换

## 路由配合

- 服务端：工厂内 `router.renderPath(path)` 按请求路径渲染（不依赖 window）
- 客户端：hydration 后 `router.start()` 接管 hash/history
- history 模式服务端要为所有前端路由返回页面（SPA fallback）；hash 模式只需输出首页

## 开发纪律

- `render()/toHTML()` DOM-free 且确定性：不读 `document`/`window`，不用 `Date.now()`/`Math.random()` 影响输出
- 浏览器 API 加 `typeof xxx === 'undefined'` 守卫，只放事件路径或 `renderDom()`
- 模块级可变状态（注册表、id 计数器）不跨请求共享；id 由渲染上下文分配器分配
- 渲染后销毁组件树，输出只依赖请求输入（无状态）

## 常见错误

| 现象 | 原因 |
|---|---|
| `renderToString/mount requires a ViewNode...` | 工厂返回非 ViewNode，或库被打了双份导致 `instanceof` 失配 |
| hydration 后表单值被重置 | 绑定阶段重放服务端快照；确认使用先回读快照再绑定的版本 |
| 服务端 id 每次不同 | 模块级计数器被跨请求共享；组件应使用 `allocateId` |
| ECharts 相关报错 | 需用 `<script>` 引入 `echarts.min.js`，避免打包器按 CommonJS 包裹 |

## i18n

- 服务端每请求 `createI18n`；`.s()` 快捷方式由渲染入口 `i18n` 选项作用域化（可传实例或 `(state) => I18n` 工厂）
- 文本四种写法自动归一：字符串、`VTextNode`、`I18nTextNode`（切换语言原地更新）、`'文案'.s('key')`
