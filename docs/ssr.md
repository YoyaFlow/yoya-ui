# Server-Side Rendering (SSR) Integration Guide

yoya-ui's declarative view tree supports server-side rendering: the server renders the page to full HTML plus serialized state, and the browser adopts that HTML and binds events. Event handlers are closures and never travel over the wire—the client rebuilds the same declarative definition and binds them during hydration.

## 1. Architecture and flow

```text
Browser request -> server:
  1. Parse the request (path, locale, theme, cookie)
  2. createSsrPage(requestState) builds the page
  3. renderToString -> { html, state, exceeded }
  4. Assemble the HTML shell: <div id="app">html</div> + __YOYA_DATA__ + static assets

Browser:
  5. Classic scripts (e.g. ECharts) run first -> globals available
  6. The module script runs client.js:
     - reads __YOYA_DATA__
     - #app has server HTML -> hydrate() adopts the DOM and binds events
     - #app is empty (fallback) -> mount() renders fully on the client
  7. Page interactions are available (form validation, routing, chart init)
```

Key convention: **the server and client share the same page factory `createPage(requestState) => ViewNode`**. The factory receives request state (path, locale, etc.); both sides build the same tree from the same input so hydration can align nodes.

> **Entry convention**: import page factories (core / html DSL, layout / theme / components) from the `yoya-ui` root or from `yoya-ui/core` + `yoya-ui/ui` as needed, and render / router primitives from `yoya-ui/router`. All entries share one core module, which avoids duplicate module copies causing `instanceof` mismatches; bundlers dedupe the client side into one module instance.

## 2. Page factory convention

```js
// page.js - shared by server and client
const messages = {
  'zh-CN': { title: 'SSR 示例', welcome: '欢迎', email: '邮箱' },
  'en-US': { title: 'SSR Demo', welcome: 'Welcome', email: 'Email' }
};

// Received by the render entry's i18n option so ".s()" translates by request language
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

Points:

- **The factory must be a function**; `renderToString` / `hydrate` / `mount` all call `createPage(requestState)`.
- Request state only holds serializable data (path, locale, initial form values, etc.), never functions.
- `deps` injects non-serializable client dependencies (e.g. the ECharts library instance).
- Language: pass `createLocale(state)` to the render entry's `i18n` option; inside the page just write `"text".s(key)` without passing locale manually.
- Form validation runs once inside the factory: the server bakes error state into the HTML and the client continues validating with the same rules.

### 2.1 High-level entry (recommended): renderPage + hydrateOrMount

Collapse "language instance + render + shell assembly + serialization" into one call. Page head/body are defined with the DSL and state is passed once. The low-level primitives `renderToString` / `hydrate` / `mount` remain available.

```js
// home-page.js - a page is a Shape-A component shared by both sides
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
import { renderPage } from 'yoya-ui/router';
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
          shell.child(HomePage(state)); // state = { lang, path, mode }
        });
      });
    }
  },
  { lang, path, mode: 'history' }, // single source of state
  { messages } // creates per-request i18n by state.lang; .s() auto-scopes
);

res.end(html);
```

```js
// client.js - built by the bundler, one line
import { hydrateOrMount } from 'yoya-ui/router';
import { HomePage, messages } from './home-page.js';

hydrateOrMount(HomePage, { messages });
// reads __YOYA_DATA__ automatically -> hydrates when #app has server HTML, otherwise mounts
```

`renderPage` output structure: `<!doctype html>` + `<head>` (head DSL) + `<body>` (body DSL wrapped in `<div id="app">`) + state script + client entry. `stateId` (default `__YOYA_DATA__`) and the client container are configurable; multi-island scenarios give each island its own name (islands use the low-level `renderToString`, see §6).

## 3. Server initialization (with your server code)

The library does not depend on any framework; `node:http`, Express, Hono, or Koa all work. The core has two steps: `renderToString` + shell assembly.

### 3.1 Minimal HTTP server

See `src/examples/ssr/server-http.mjs` for a runnable example (`node src/examples/ssr/server-http.mjs`, run `npm run build` first). Core logic:

```js
import { renderToString, resolveLocale, serializeState } from 'yoya-ui/router';
import { createSsrPage } from './page.js';

function renderPage(initial) {
  const { exceeded, html, state } = renderToString(createSsrPage, {
    maxNodes: 5000, // oversized pages fall back to client rendering
    state: initial,
    i18n: createLocale // optional: auto-scope ".s()" to the request language
  });

  // when exceeded, output only the empty shell; the client mounts automatically
  return buildShell(initial, exceeded ? '' : html, serializeState(initial));
}

// per request:
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

The language marker travels via cookie: when switching languages, write `document.cookie = 'yoya-lang=' + value + '; path=/'`, and every later request carries it. `resolveLocale` only receives already-extracted raw fields (`cookie` / `url` / `acceptLanguage`) and does not depend on a specific request object. Each framework extracts them itself: Node reads `req.headers.cookie`, Fetch reads `request.headers.get('cookie')`, Hono reads `c.req.header('cookie')`, etc. The page factory, rendering, and hydration never touch cookies. If you cache pages at the server level, add `Vary: Cookie` or split the cache by language.

### 3.2 Per-request context (staying stateless)

- **locale/theme**: resolved from the request and built per request via `createI18n({ language })`. The `.s()` shortcut is auto-scoped by the render entry's `i18n` option (`renderToString` / `mount` / `hydrate` all support it; `i18n` accepts an instance or an `(state) => I18n` factory). You can also wrap manually with `withI18nStringShortcut(locale, build)`. Shared singletons are never mutated.
- **id allocator**: `renderToString` / `hydrate` / `mount` wrap rendering in `withIdAllocator`, so the same input produces the same ids and requests are isolated.
- **cleanup after render**: trees created by the factory are `destroy()`ed automatically after serialization; module-level registries (e.g. form checkbox groups) do not leak across requests.

### 3.3 Router integration

- Server: call `router.renderPath(path)` inside the factory to render the matched view for the request path (params, guards, and 404 supported; no `window` dependency).
- Client: after hydration, call `router.start()` to take over hash/history routing.
- **History mode**: the server must return the page for every frontend route (SPA fallback). **Hash mode**: the server only needs the home page; the client reads the path from the hash.

## 4. Serving home page assets

### 4.1 HTML shell template

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>SSR 示例</title>
    <link rel="stylesheet" href="/assets/yoya.ui.css" />
    <!-- non-SSR modules load as classic scripts (e.g. ECharts) -->
    <script src="/assets/echarts.min.js"></script>
  </head>
  <body>
    <!-- server-rendered page HTML -->
    <div id="app">${html}</div>
    <!-- serialized state; < is escaped and safe to inline -->
    <script type="application/json" id="__YOYA_DATA__">
      ${state}
    </script>
    <!-- client boot script (bundler output) -->
    <script type="module" src="/assets/client.js"></script>
  </body>
</html>
```

### 4.2 Static asset layout (after `npm run build`)

```text
dist/
  yoya.core.js          # core entry (engine + html + svg + state/i18n/access)
  yoya.core.chunk.js    # internal shared core chunk (auto-loaded by core/ui/router)
  yoya.ui.js            # incremental components + layout + theme entry
  yoya.router.js        # router + SSR: renderToString / hydrate / mount / renderPage
  yoya.echart.js        # ECharts component entry (does not bundle echarts itself)
  yoya.three.js         # Three.js component entry (does not bundle three itself)
  yoya.ui-router.full.js  # self-contained full (core + ui + router/SSR), CDN no-build
  echarts.min.js        # ECharts itself (loaded with a script tag)
  yoya.ui.css           # styles
  yoya.ui-router.umd.js # UMD build (window.YoyaUI)
```

Mount `dist/` as a static directory on the server (`/assets/*` or `/vendor/*`) and return correct MIME types (`.js` / `.css` / `.html` / `.svg`, etc.). Load ECharts with a classic `<script>` so bundler CommonJS wrapping does not hide `window.echarts`.

### 4.3 Client boot script (client.js)

```js
import { hydrate, mount, parseState } from 'yoya-ui/router';
import { createSsrPage } from './page.js'; // bundler shares the same factory

const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');

if (app.firstElementChild) {
  // server HTML exists -> adopt DOM, restore form snapshots, bind events
  hydrate(createSsrPage, app, data, { i18n: createLocale });
} else {
  // empty shell (exceeded fallback or pure client mode) -> render fully
  mount(createSsrPage, app, data, { i18n: createLocale });
}
```

`client.js` is built by the bundler (Vite etc.) so `page.js` and `yoya-ui/router` / `yoya-ui/core` resolve to the same shared module instance (avoiding duplicate-copy `instanceof` mismatches).

## 5. Oversized page fallback (maxNodes)

`renderToString(component, { maxNodes })` counts view nodes. When the limit is exceeded it returns `{ exceeded: true, html: '' }`. The server detects `exceeded` and outputs an empty shell; the client then calls `mount()` to render fully—huge lists/tables never blow up the server HTML.

## 6. Islands (client-only loading)

Mark individual non-SSR component modules (e.g. ECharts charts) with `vClientOnly(loader)`:

- On the server, `toHTML()` outputs only a placeholder `div` (`data-client-only`) and does not load the module.
- During hydration the placeholder is replaced by the real component; the module loads and initializes in the browser.
- Component interactions come from the component's own client render path.

```js
div((root) => {
  root.child(vClientOnly(() => vEchart({ option, echartsLib })));
});
```

## 7. Example references

- `node src/examples/ssr/server.mjs`: prints page HTML to stdout for inspecting the output.
- `node src/examples/ssr/server-http.mjs`: full HTTP service (minimal no-bundler demo) showing request parsing, SSR rendering, static assets, and the client hydrate/mount branch. Run `npm run build` first.
- `dist/examples/ssr-demo.html` (after building examples): standalone SSR demo page that runs renderToString -> hydrate in the browser, exercising buttons, dialogs, forms, and zh/en switching.
- Examples site (`npm run build:examples` + `npx vite preview`): Guides -> Server-Side Rendering page with SSR / non-SSR mode-switching demos.

## 8. Development discipline and common mistakes

**Discipline**

- `render()` and `toHTML()` paths stay DOM-free and deterministic: do not read `document`/`window`; do not let `Date.now()`/`Math.random()` affect output.
- Guard browser APIs with `typeof xxx === 'undefined'` and only use them in event paths or `renderDom()`.
- Module-level mutable state (registries, id counters) is never shared across requests.
- The server stays stateless: per-request render context + destroy after render + output depends only on request input.

**Common mistakes**

| Symptom                                       | Cause                                                                                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderToString/mount requires a ViewNode...` | The page factory returned a non-ViewNode, or the library exists twice (client bundle + `yoya-ui/router`) causing an `instanceof` mismatch—dedupe with the bundler |
| Form values reset after hydration             | The binding phase replayed server snapshot attributes into the DOM—the library already reads snapshots before binding; make sure you use the latest version       |
| `ECharts library not provided`                | `echarts.min.js` was not loaded with `<script>`, or echarts was wrapped as CommonJS by the bundler (use the script-tag approach)                                  |
| Server ids differ every time                  | A module-level counter is shared across requests—the library uses a per-render id allocator; make sure components use `allocateId`                                |
| Slow page load (dev mode)                     | Dev mode does not bundle; hundreds of ESM requests per page are normal. Production builds produce a few static chunks                                             |
