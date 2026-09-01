# 服务端渲染（SSR）集成指南

yoya-ui 的声明式视图树支持服务端渲染：服务端把页面渲染成完整 HTML 与序列化状态，浏览器端收养这份 HTML 并绑定事件。事件处理函数是闭包，不会跨网络传输——它们由客户端重建同一份声明式定义后在 hydration 阶段绑定。

## 1. 架构与流程

```text
浏览器请求 → 服务端：
  1. 解析请求（路径、locale、主题、cookie）
  2. createSsrPage(requestState) 构建页面
  3. renderToString → { html, state, exceeded }
  4. 组装 HTML 外壳：<div id="app">html</div> + __YOYA_DATA__ + 静态资源

浏览器：
  5. 经典 script（echarts 等）先执行 → 全局可用
  6. 模块脚本执行 client.js：
     - 读取 __YOYA_DATA__
     - #app 有服务端 HTML → hydrate() 收养 DOM、绑定事件
     - #app 为空（回退）→ mount() 全量客户端渲染
  7. 页面交互可用（表单校验、路由导航、图表初始化）
```

关键约定：**服务端与客户端使用同一份页面工厂 `createPage(requestState) => ViewNode`**。工厂接收请求状态（路径、locale 等），两边用相同输入构建出相同的树，hydration 才能按节点对齐。

> **入口约定**：页面工厂与渲染原语统一从 `yoya-ui/ssr` 导入（该入口已包含 core / html / layout / router / i18n），避免与主入口形成双副本导致 `instanceof` 失配；客户端由打包器去重为同一份模块。

## 2. 页面工厂约定

```js
// page.js —— 服务端与客户端共用
const messages = {
  'zh-CN': { title: 'SSR 示例', welcome: '欢迎', email: '邮箱' },
  'en-US': { title: 'SSR Demo', welcome: 'Welcome', email: 'Email' }
};

// 由渲染入口的 i18n 选项接收，让 ".s()" 自动按请求语言翻译
export const createLocale = (initial = {}) =>
  createI18n({ language: initial.locale || 'zh-CN', messages });

export function createSsrPage(initial = {}, deps = {}) {
  const router = createRouter();
  router.route('/home', '欢迎'.s('welcome'));
  // ...

  const page = div((root) => {
    root.h1('SSR 示例'.s('title'));
    root.child(router);
    root.child(form);
    root.child(vClientOnly(() => vEchart({ echartsLib: deps.echartsLib, option })));
  });

  router.renderPath(initial.path || '/home');
  return page;
}
```

要点：

- **工厂必须是函数**，`renderToString`/`hydrate`/`mount` 都会调用 `createPage(requestState)`；
- 请求状态只放可序列化的数据（路径、locale、表单初值等），不放函数；
- `deps` 用于注入不可序列化的客户端依赖（如 ECharts 库实例）；
- 语言：`createLocale(state)` 传给渲染入口的 `i18n` 选项，页面内直接写 `"文案".s(key)` 即可，无需手动传 locale；
- 表单校验在工厂内执行一次：服务端把错误状态烘焙进 HTML，客户端同一套规则继续校验。

### 2.1 高层入口（推荐）：renderPage + hydrateOrMount

把“语言实例 + 渲染 + 外壳组装 + 序列化”收敛成一次调用，页面 head/body 都用 DSL 定义，状态只传一次。底层原语 `renderToString`/`hydrate`/`mount` 保持可用。

```js
// home-page.js —— 页面即形态 A 组件，两端共用
import { createRouter, div } from 'yoya-ui';

export const messages = {
  'zh-CN': { title: 'SSR 示例', home: '首页' },
  'en-US': { title: 'SSR Demo', home: 'Home' }
};

export function HomePage(state) {
  const router = createRouter();
  router.mode(state.mode || 'history');
  router.route('/home', '首页'.s('home'));
  router.renderPath(state.path || '/home');

  return div((root) => {
    root.h1('SSR 示例'.s('title'));
    root.child(router);
  });
}
```

```js
// server.mjs
import { renderPage } from 'yoya-ui/ssr';
import { HomePage, messages } from './home-page.js';

const html = renderPage(
  {
    page: (page, state) => {
      page.head((head) => {
        head.title('SSR 示例'.s('title'));
        head.meta({ charset: 'utf-8' });
        head.link({ rel: 'stylesheet', href: '/yoya.ui.css' });
      });
      page.body((body) => {
        body.vBody((shell) => {
          shell.h1('SSR 示例'.s('title'));
          shell.child(HomePage(state)); // state = { lang, path, mode }
        });
      });
    }
  },
  { lang, path, mode: 'history' }, // 状态唯一来源
  { messages }                    // 按 state.lang 建每请求 i18n，.s() 自动作用域
);

res.end(html);
```

```js
// client.js —— 打包器构建，一行接入
import { hydrateOrMount } from 'yoya-ui/ssr';
import { HomePage, messages } from './home-page.js';

hydrateOrMount(HomePage, { messages });
// 自动读 __YOYA_DATA__ → #app 有服务端 HTML 走 hydrate，否则 mount
```

`renderPage` 输出结构：`<!doctype html>` + `<head>`（head DSL）+ `<body>`（body DSL 包在 `<div id="app">` 内）+ 状态脚本 + 客户端入口。`stateId`（默认 `__YOYA_DATA__`）与客户端容器可配置，多局部场景各自命名即可（局部渲染用底层 `renderToString`，见第 6 节）。

## 3. 服务端初始化（配合你的服务端代码）

库本身不依赖任何框架，`node:http`、Express、Hono、Koa 均可。核心只有两步：`renderToString` + 组装外壳。

### 3.1 最小 HTTP 服务

完整可运行示例见 `src/examples/ssr/server-http.mjs`（`node src/examples/ssr/server-http.mjs`，需先 `npm run build`）。核心逻辑：

```js
import { renderToString, resolveLocale, serializeState } from 'yoya-ui/ssr';
import { createSsrPage } from './page.js';

function renderPage(initial) {
  const { exceeded, html, state } = renderToString(createSsrPage, {
    maxNodes: 5000, // 超大页面回退客户端渲染
    state: initial,
    i18n: createLocale // 可选：自动把 ".s()" 作用域到请求语言
  });

  // exceeded 时只输出空壳，客户端自动走 mount()
  return buildShell(initial, exceeded ? '' : html, serializeState(initial));
}

// 每个请求：
const initial = {
  locale: resolveLocale(
    {
      cookie: req.headers.cookie,
      url: req.url,
      acceptLanguage: req.headers['accept-language']
    },
    { cookieKey: 'yoya-lang' }
  ), // cookie > query > Accept-Language
  mode: 'history',
  path: url.pathname
};
res.end(renderPage(initial));
```

语言标识由客户端通过 cookie 携带：切换语言时写 `document.cookie = 'yoya-lang=' + value + '; path=/'`，之后每次请求自动带上。`resolveLocale` 只接收已取好的原始字段（cookie / url / acceptLanguage），不依赖具体请求对象形态，取值由各框架自行完成：Node 系取 `req.headers.cookie`，Fetch 系取 `request.headers.get('cookie')`，Hono 取 `c.req.header('cookie')` 等。页面工厂、渲染、hydration 都不感知 cookie。若服务端做了页面级缓存，需要 `Vary: Cookie` 或按语言拆缓存。

### 3.2 每请求上下文（保持无状态）

- **locale/主题**：从请求解析，经 `createI18n({ language })` 每请求建实例；`.s()` 快捷方式由渲染入口的 `i18n` 选项自动作用域化（`renderToString`/`mount`/`hydrate` 均支持，`i18n` 可传实例或 `(state) => I18n` 工厂），也可用 `withI18nStringShortcut(locale, build)` 手动包裹；共享单例不被修改；
- **id 分配器**：`renderToString`/`hydrate`/`mount` 内部已用 `withIdAllocator` 包裹，同输入渲染产出相同 id，跨请求隔离；
- **渲染后清理**：工厂创建的树序列化后自动 `destroy()`，模块级注册表（如表单单选框组）不跨请求泄漏。

### 3.3 路由配合

- 服务端：工厂内 `router.renderPath(path)` 按请求路径渲染匹配视图（支持参数、守卫、404），不依赖 window；
- 客户端：hydration 后调用 `router.start()` 接管 hash/history；
- **history 模式**：服务端要为所有前端路由返回页面（SPA fallback）；**hash 模式**：服务端只需输出首页，路径在 hash 里由客户端读取。

## 4. 给前端提供首页资源

### 4.1 HTML 外壳模板

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>SSR 示例</title>
    <link rel="stylesheet" href="/assets/yoya.ui.css" />
    <!-- 非 SSR 模块用经典 script 全局加载（如 ECharts） -->
    <script src="/assets/echarts.min.js"></script>
  </head>
  <body>
    <!-- 服务端渲染的页面 HTML -->
    <div id="app">${html}</div>
    <!-- 序列化状态：客户端恢复用，已做 < 转义，可安全内联 -->
    <script type="application/json" id="__YOYA_DATA__">
      ${state}
    </script>
    <!-- 客户端启动脚本（打包产物） -->
    <script type="module" src="/assets/client.js"></script>
  </body>
</html>
```

### 4.2 静态资源布局（`npm run build` 后）

```text
dist/
  yoya.ui.js        # 浏览器入口（ESM）
  yoya.core.js      # 核心入口
  yoya.echart.js    # ECharts 组件入口（不包含 echarts 本体）
  yoya.ssr.js       # 服务端/客户端共用：renderToString / hydrate / mount
  echarts.min.js    # ECharts 本体（用 script 标签引入）
  yoya.ui.css       # 样式
  yoya-ui.umd.js    # UMD 版（window.YoyaUI）
```

服务端把 `dist/` 作为静态目录挂载（`/assets/*` 或 `/vendor/*`），并按 MIME 返回（`.js`/`.css`/`.html`/`.svg` 等）。ECharts 用经典 `<script>` 全局引入，避免被打包器按 CommonJS 包裹后 `window.echarts` 丢失。

### 4.3 客户端启动脚本（client.js）

```js
import { hydrate, mount, parseState } from 'yoya-ui/ssr';
import { createSsrPage } from './page.js'; // 打包器共享同一份工厂

const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');

if (app.firstElementChild) {
  // 有服务端 HTML → 收养 DOM、回读表单快照、绑定事件
  hydrate(createSsrPage, app, data, { i18n: createLocale });
} else {
  // 空壳（exceeded 回退或纯客户端模式）→ 全量渲染
  mount(createSsrPage, app, data, { i18n: createLocale });
}
```

`client.js` 由打包器（Vite 等）构建，保证 `page.js` 与 `yoya-ui/ssr` 解析到同一份模块实例（避免双副本 `instanceof` 失配）。

## 5. 大页面回退（maxNodes）

`renderToString(component, { maxNodes })` 统计视图节点数，超限返回 `{ exceeded: true, html: '' }`。服务端检测到 `exceeded` 就输出空壳，客户端走 `mount()` 全量渲染——保证超大列表/表格不会撑爆服务端 HTML。

## 6. 局部客户端加载（Islands）

个别非 SSR 组件模块（如 ECharts 图表）用 `vClientOnly(loader)` 标记：

- 服务端 `toHTML()` 只输出占位 div（`data-client-only`），不加载模块；
- hydration 阶段占位被真实组件替换，模块在浏览器端加载并初始化；
- 组件交互仍由自身客户端渲染路径提供。

```js
div((root) => {
  root.child(vClientOnly(() => vEchart({ option, echartsLib })));
});
```

## 7. 示例对照

- `node src/examples/ssr/server.mjs`：直接把页面 HTML 输出到 stdout，看产物用；
- `node src/examples/ssr/server-http.mjs`：完整 HTTP 服务（无打包最小演示），演示请求解析、SSR 渲染、静态资源提供、客户端 hydrate/mount 分支。先运行 `npm run build`。
- `dist/examples/ssr-demo.html`（构建 examples 后）：独立 SSR 演示页，浏览器内 renderToString → hydrate，演示按钮、弹窗、表单与中英文切换。
- 示例站（`npm run build:examples` + `npx vite preview`）：开发指南 → 服务端渲染页，含 SSR/非 SSR 模式切换交互演示。

## 8. 开发纪律与常见错误

**纪律**

- `render()` 与 `toHTML()` 路径保持 DOM-free 且确定性：不读 `document`/`window`，不用 `Date.now()`/`Math.random()` 影响输出；
- 浏览器 API 一律加 `typeof xxx === 'undefined'` 守卫，且只放在事件路径或 `renderDom()` 中；
- 模块级可变状态（注册表、id 计数器）不跨请求共享；
- 服务端保持无状态：每请求渲染上下文 + 渲染后销毁 + 输出只依赖请求输入。

**常见错误**

| 现象                                          | 原因                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `renderToString/mount requires a ViewNode...` | 页面工厂返回了非 ViewNode，或库被打了双份（客户端 bundle 与 `yoya-ui/ssr` 各一份）导致 `instanceof` 失配——用打包器统一解析 |
| hydration 后表单值被重置                      | 绑定阶段把服务端快照属性重放回 DOM——库已改为先回读快照再绑定，确认使用的是最新版本                                         |
| `ECharts library not provided`                | 没有用 `<script>` 引入 `echarts.min.js`，或 echarts 被打包器按 CommonJS 包裹（用 script 标签方案）                         |
| 服务端输出 id 每次不同                        | 模块级计数器被跨请求共享——库已用渲染上下文 id 分配器，确认组件使用 `allocateId`                                            |
| 页面加载慢（dev 模式）                        | dev 不打包，单页数百个 ESM 请求是正常现象；生产构建是少量静态分块                                                          |
