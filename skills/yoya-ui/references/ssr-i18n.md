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

页面工厂按需从 `@yoyaflow/yoya-ui/core`（html 基础）与 `@yoyaflow/yoya-ui/ui`（layout/theme/组件）导入，渲染与路由原语从 `@yoyaflow/yoya-ui/router` 导入；多个入口共享同一份 core，避免双副本导致 `instanceof` 失配。

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

**推荐：`renderPage` 一行渲染整页文档**（head/body 用 DSL 定义，状态只传一次）：

```js
import { renderPage } from '@yoyaflow/yoya-ui/router';
import { HomePage, messages } from './home-page.js';

const html = renderPage(
  {
    page: (page, state) => {
      page.head((head) => {
        head.title('SSR 示例'.s('title'));
        head.meta({ charset: 'utf-8' });
        head.link({ rel: 'stylesheet', href: '/yoya.ui.css' });
      });
      page.body((body) => body.child(HomePage(state)));
    }
  },
  { lang, path, mode: 'history' }, // 状态唯一来源：lang 由你的服务端解析
  { messages } // 按 state.lang 建每请求 i18n
);
```

底层原语等价写法（需要定制时使用）：

```js
import { renderToString, resolveLocale, serializeState } from '@yoyaflow/yoya-ui/router';

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

**推荐：`hydrateOrMount` 一行接入**（自动读状态、判断服务端 HTML、hydrate/mount 二选一）：

```js
import { hydrateOrMount } from '@yoyaflow/yoya-ui/router';
import { HomePage, messages } from './home-page.js';

hydrateOrMount(HomePage, { messages });
// 多局部：hydrateOrMount(createStats, { messages, stateId: 'yoya-data-stats', target: '#stats' })
```

底层原语等价写法：

```js
import { hydrate, mount, parseState } from '@yoyaflow/yoya-ui/router';
import { createPage } from './page.js';

const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');

if (app.firstElementChild) {
  hydrate(createPage, app, data, { i18n: createLocale });
} else {
  mount(createPage, app, data, { i18n: createLocale });
}
```

`client.js` 由打包器构建，保证 `page.js` 与 `yoya-ui/core`、`yoya-ui/router` 解析到同一份共享模块实例（双副本会导致 `instanceof` 失配）。

## 大页面回退与 Islands

- `renderToString(component, { maxNodes })` 超限返回 `{ exceeded: true, html: '' }`，服务端输出空壳，客户端走 `mount()`
- 非 SSR 模块用 `vClientOnly(() => vEchart({ option, echartsLib }))`：服务端只输出占位 div，hydration 阶段由客户端加载替换

## 路由配合

- 服务端：工厂内 `router.renderPath(path)` 按请求路径渲染（不依赖 window）
- 客户端：hydration 后 `router.start()` 接管 hash/history
- history 模式服务端要为所有前端路由返回页面（SPA fallback）；hash 模式只需输出首页

## 要避免的操作

| 避免                                                                                 | 应该                                                                                                                | 原因                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `render()` / `toHTML()` 里读 `document` / `window`                                   | 只在事件回调或 `renderDom()` 里访问；浏览器 API 加 `typeof` 守卫                                                    | 服务端没有 DOM，渲染路径必须 DOM-free                  |
| 用 `Date.now()` / `Math.random()` 影响输出（含 key、id）                             | 结构只依赖请求输入；id 用 `allocateId` 由渲染上下文分配                                                             | 两端产出的树不一致会导致 hydrate 错位                  |
| 组件里直接 `document.addEventListener` / `window.addEventListener`                   | `bindDocumentEvent` / `bindWindowEvent`，`destroy()` 时执行返回的 unbind                                            | 服务端无 DOM；客户端要能随节点销毁解绑                 |
| 请求相关状态、视图树或组件实例放模块级（当前用户、语言、计数器、区域节点、组件实例） | 每请求创建：`createAccess` / `createI18n` / `withContext` 经入口 `options` 注入，区域节点与组件实例在页面工厂内创建 | 模块级状态与视图树会在并发请求之间串数据、复用同一棵树 |
| 在服务端渲染期间调用 `rebuild()` / `flush()`                                         | 首屏只做构建（绑定在构建期写回），重建与刷新留给客户端交互（`setState`、区域 `rebuild()` / `flush()`）              | 物化 DOM 需要浏览器环境，服务端调用没有意义            |
| 渲染期间发请求、埋点或设定时器                                                       | 副作用移到事件回调或客户端挂载之后                                                                                  | SSR 只负责输出，渲染结果可能被缓存或重放               |
| 用 `getBoundingClientRect` / `offsetWidth` 决定结构                                  | 结构由状态决定，测量只用于渲染后的定位逻辑                                                                          | 服务端没有布局，两端会不一致                           |
| 把函数放进请求状态传给 `renderPage`                                                  | 只传可序列化数据（路径、筛选条件、locale）                                                                          | 状态要序列化进 `__YOYA_DATA__` 并在客户端解析          |
| 假设客户端会重建服务端 DOM                                                           | `hydrate()` 收养既有 DOM、只补事件适配器                                                                            | 重建会闪烁首屏并丢掉服务端已渲染的状态                 |

渲染后销毁组件树，输出只依赖请求输入（服务端保持无状态）。

## 常见错误

| 现象                                          | 原因                                                              |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `renderToString/mount requires a ViewNode...` | 工厂返回非 ViewNode，或库被打了双份导致 `instanceof` 失配         |
| hydration 后表单值被重置                      | 绑定阶段重放服务端快照；确认使用先回读快照再绑定的版本            |
| 服务端 id 每次不同                            | 模块级计数器被跨请求共享；组件应使用 `allocateId`                 |
| ECharts 相关报错                              | 需用 `<script>` 引入 `echarts.min.js`，避免打包器按 CommonJS 包裹 |

## i18n

- 服务端每请求 `createI18n`；`.s()` 快捷方式由渲染入口 `i18n` 选项作用域化（可传实例或 `(state) => I18n` 工厂）
- 文本四种写法自动归一：字符串、`VTextNode`、`I18nTextNode`（切换语言原地更新）、`'文案'.s('key')`
