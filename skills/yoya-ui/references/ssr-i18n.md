# SSR 与 i18n

## 流程：HomePage → 服务端 → 客户端

```text
home-page.js   HomePage(state)                          ← 两端共用同一份工厂
     │
     ├─ 服务端   renderPage(..., state, { messages })    → 完整 HTML + __YOYA_DATA__
     │
     └─ 客户端   hydrateOrMount(HomePage, { messages })  → 收养 HTML、绑事件（无服务端 HTML 时 mount）
```

同一份页面工厂在两端各跑一次：服务端把结果写成 HTML，客户端用相同输入重建同一棵树，hydration 才能按节点对齐（**输入相同 → 树相同**）。事件处理是闭包，不跨网络。

下面三份文件复制到自己的工程即可跑通。

## 1. home-page.js —— 页面组件（两端共用）

```js
// home-page.js —— 页面即形态 A 组件，服务端与客户端共用
import { div } from '@yoyaflow/yoya-ui/core';
import { createRouter } from '@yoyaflow/yoya-ui/router';

export const messages = {
  'zh-CN': { title: 'SSR 示例', home: '首页' },
  'en-US': { title: 'SSR Demo', home: 'Home' }
};

export function HomePage(state) {
  const router = createRouter();
  router.mode(state.mode || 'history');
  router.route('/home', '首页'.s('home'));
  router.notFound('未找到');
  router.renderPath(state.path || '/home'); // 服务端按请求路径渲染

  return div((root) => {
    root.h1('SSR 示例'.s('title'));
    root.child(router);
  });
}
```

要点：

- 工厂签名 `HomePage(state)`；`state` 只放可序列化数据（`lang` / `path` / `mode`），不放函数
- 渲染路径必须 DOM-free 且确定性：不读 `document` / `window`，不用 `Date.now()` / `Math.random()` 影响输出（id 走渲染上下文的 `allocateId`）
- 每请求的数据与实例在工厂内部创建（信号、区域节点、组件实例），不要放模块级
- `'文案'.s('key')` 的 i18n 实例由入口的 `{ messages }` / `{ i18n }` 每请求作用域化

## 2. server.mjs —— 服务端入口

```js
// server.mjs —— 服务端（node:http，无框架依赖）
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { renderPage } from '@yoyaflow/yoya-ui/router';
import { HomePage, messages } from './home-page.js';

const DIST = join(import.meta.dirname, 'dist'); // npm run build 的产物
const MIME = { '.css': 'text/css', '.js': 'text/javascript' };

createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;

  // 静态资源：从 dist 目录按路径提供
  if (path !== '/') {
    const file = join(DIST, path.slice(1));
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
      return;
    }
  }

  // lang 由你的服务端解析（cookie / query / 登录态都行）
  const lang = req.headers.cookie?.includes('yoya-lang=en') ? 'en' : 'zh-CN';

  const html = renderPage(
    {
      page: (page, state) => {
        page.head((head) => {
          head.title('SSR 示例'.s('title'));
          head.meta({ charset: 'utf-8' });
          head.link({ rel: 'stylesheet', href: '/yoya.ui.css' });
        });
        page.body((body) => {
          body.div((shell) => {
            shell.child(HomePage(state)); // state = { lang, path, mode }
          });
        });
      }
    },
    { lang, path, mode: 'history' }, // 状态唯一来源
    { messages } // 按 state.lang 建每请求 i18n，.s() 自动作用域
  );

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(3000);
```

要点：

- `renderPage(pageConfig, state, { messages })` 一次收敛「语言实例 + 渲染 + 外壳组装 + 状态序列化」
- 输出结构：`<!doctype html>` + `<head>`（head DSL）+ `<body>`（body DSL 在 `<div id="app">` 内）+ `__YOYA_DATA__` 状态脚本 + `client.js` 入口
- `state` 是唯一来源：`{ lang, path, mode }` 由你的服务端解析后传入，透传给工厂与客户端
- 静态资源（`yoya.ui.css` / `client.js` / `yoya.core.js` …）从 `dist/` 目录提供；`echarts.min.js` 用 `<script>` 全局引入，不要打进模块

## 3. client.js —— 浏览器启动

```js
// client.js —— 浏览器端（由打包器构建，与 yoya-ui/core、yoya-ui/router 同一份共享模块）
import { hydrateOrMount } from '@yoyaflow/yoya-ui/router';
import { HomePage, messages } from './home-page.js';

hydrateOrMount(HomePage, { messages });
// 自动读 __YOYA_DATA__ → #app 有服务端 HTML 走 hydrate（收养 DOM、绑事件），否则 mount
```

要点：

- 多局部：`hydrateOrMount(createStats, { messages, stateId: 'yoya-data-stats', target: '#stats' })`，每块各自命名状态脚本与容器
- `renderPage` 的 `maxNodes` 超限回退也走这里：服务端输出空壳，客户端 `mount()` 全量渲染
- `client.js` 由打包器构建，保证 `home-page.js` 与 `yoya-ui/core`、`yoya-ui/router` 解析到同一份共享模块（双副本会导致 `instanceof` 失配）

## 4. 跑起来

1. `npm run build` 生成 `dist/`（`yoya.core.js` / `yoya.ui.js` / `yoya.router.js` / `yoya.ui.css` 等），把它挂成静态目录
2. 启动 `server.mjs`（仓库内可参考 `src/examples/ssr/server-http.mjs`），浏览器访问 `http://localhost:3000`
3. 服务端先出 HTML，客户端 `client.js` 接管交互；history 模式服务端对未匹配路径返回首页，hash 模式只需输出首页

## 低层原语（需要定制外壳时）

```js
// 服务端：自己组装 HTML 外壳
import { renderToString, resolveLocale, serializeState } from '@yoyaflow/yoya-ui/router';

const initial = {
  locale: resolveLocale(
    { cookie: req.headers.cookie, url: req.url, acceptLanguage: req.headers['accept-language'] },
    { cookieKey: 'yoya-lang' }
  ), // cookie > query > Accept-Language
  path: url.pathname
};

const { exceeded, html, state } = renderToString(HomePage, {
  maxNodes: 5000, // 超限返回 exceeded: true，服务端输出空壳、客户端回退 mount()
  state: initial,
  i18n: (s) => createI18n({ language: s.locale, messages }) // 每请求实例，.s() 自动作用域
});
```

```js
// 客户端：自己判断 hydrate / mount
import { hydrate, mount, parseState } from '@yoyaflow/yoya-ui/router';
import { HomePage, messages } from './home-page.js';

const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');
const i18n = () => createI18n({ language: data.lang, messages });

if (app.firstElementChild) {
  hydrate(HomePage, app, data, { i18n });
} else {
  mount(HomePage, app, data, { i18n });
}
```

语言切换写 cookie（如 `document.cookie = 'yoya-lang=en; path=/'`），之后请求自动带上；页面级缓存需 `Vary: Cookie` 或按语言拆缓存。

## 路由配合

- 服务端：工厂内 `router.renderPath(path)` 按请求路径渲染（不依赖 window）
- 客户端：hydration 后 `router.start()` 接管 hash/history
- history 模式服务端要为所有前端路由返回页面（SPA fallback）；hash 模式只需输出首页

## 大页面回退与 Islands

- `renderToString(component, { maxNodes })` 超限返回 `{ exceeded: true, html: '' }`，服务端输出空壳，客户端走 `mount()`
- 非 SSR 模块用 `vClientOnly(() => vEchart({ option, echartsLib }))`：服务端只输出占位 div，hydration 阶段由客户端加载替换

## 要避免的操作

| 避免                                                                                 | 应该                                                                                                                | 原因                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `render()` / `toHTML()` 里读 `document` / `window`                                   | 只在事件回调或 `renderDom()` 里访问；浏览器 API 加 `typeof` 守卫                                                    | 服务端没有 DOM，渲染路径必须 DOM-free                  |
| 用 `Date.now()` / `Math.random()` 影响输出（含 key、id）                             | 结构只依赖请求输入；id 用 `allocateId` 由渲染上下文分配                                                             | 两端产出的树不一致会导致 hydrate 错位                  |
| 组件里直接 `document.addEventListener` / `window.addEventListener`                   | `bindDocumentEvent` / `bindWindowEvent`，`destroy()` 时执行返回的 unbind                                            | 服务端无 DOM；客户端要能随节点销毁解绑                 |
| 请求相关状态、视图树或组件实例放模块级（当前用户、语言、计数器、区域节点、组件实例） | 每请求创建：`createAccess` / `createI18n` / `withContext` 经入口 `options` 注入，区域节点与组件实例在页面工厂内创建 | 模块级状态与视图树会在并发请求之间串数据、复用同一棵树 |
| 在服务端渲染期间调用 `rebuild()` / `flush()`                                         | 首屏只做构建（绑定在构建期写回），重建与刷新留给客户端交互（写入信号、区域 `rebuild()`）                            | 物化 DOM 需要浏览器环境，服务端调用没有意义            |
| 渲染期间发请求、埋点或设定时器                                                       | 副作用移到事件回调或客户端挂载之后                                                                                  | SSR 只负责输出，渲染结果可能被缓存或重放               |
| 用 `getBoundingClientRect` / `offsetWidth` 决定结构                                  | 结构由状态决定，测量只用于渲染后的定位逻辑                                                                          | 服务端没有布局，两端会不一致                           |
| 把函数放进请求状态传给 `renderPage`                                                  | 只传可序列化数据（路径、筛选条件、locale）                                                                          | 状态要序列化进 `__YOYA_DATA__` 并在客户端解析          |
| 假设客户端会重建服务端 DOM                                                           | `hydrate()` 收养既有 DOM、只补事件适配器                                                                            | 重建会闪烁首屏并丢掉服务端已渲染的状态                 |
| 绑定函数里读 `document` / `window`（`() => window.innerWidth`）                      | 绑定保持确定性且 DOM-free：只依赖信号 / 每请求数据                                                                  | 绑定在构建期会在服务端求值一次，DOM 依赖会直接抛错     |
| 信号建在模块级（模块顶层的 `const count = ref(0)`）                                  | 每请求 / 每组件实例创建信号（页面工厂或组件内部）                                                                   | 模块级信号会在并发请求间串数据，且不随请求销毁         |
| 用 `effect` 在服务端同步视图                                                         | 视图更新只用 `attr(key, signal)` / `vText(signal)`；`effect` 服务 DOM 之外的副作用，且服务端不执行                  | 服务端只求值一次、不订阅，`effect` 可能碰 DOM          |

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
