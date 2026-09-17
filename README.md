# yoya-ui

**A browser-native extension library: truly progressive — no virtual DOM, no build step, declarative UI in plain JavaScript.**

**English** | [简体中文](./README.zh-CN.md)

[![Release](https://img.shields.io/npm/v/@yoyaflow/yoya-ui?label=release&style=flat-square)](https://www.npmjs.com/package/@yoyaflow/yoya-ui)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/yoyaflow/yoya-ui/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/yoyaflow/yoya-ui/actions)
[![Types](https://img.shields.io/badge/types-TypeScript-blue?style=flat-square)](https://github.com/yoyaflow/yoya-ui/tree/main/types)

## What it is

It is not another framework runtime layered on top of the browser. It **extends the HTML and DOM
you already have**: views are plain JavaScript functions, every node in the view tree is the handle
for a real DOM element, and writing state updates the bound spots in place — no virtual DOM, no JSX
or template compiler, no mandatory build step.

Component library, router, i18n, theme, access control and state management ship with it, but none
of them takes over your build chain: use one import or all of them, and fall back to native DOM
whenever you want. Positioning notes and the full rationale: [Why yoya-ui](docs/why-yoya-ui.md).

## Who it is for

- **Teams that do not want to be bound by build tooling** — the shipped ESM files run in a plain
  page, and an existing bundler setup is equally welcome.
- **Delivery and long-term maintenance teams** — one stable API on Web standards, instead of
  rewriting for a framework's next major version.
- **Legacy systems and existing pages** — drop declarative interaction into an existing
  PHP / JSP / Vue / React page, block by block, with no migration.
- **AI-generated code that has to run as-is** — no framework context or build magic between the
  generated code and the browser.

**Who it is not for:** teams that are already committed to a framework ecosystem (React / Vue /
Angular) and want that ecosystem's component market, conventions and tooling. yoya-ui deliberately
does not re-package those libraries — it hands them a real DOM element instead.

## Quick start: a counter in one file

Save this as `index.html` and open it — no build step, no install. Both the library and the styles
come from a CDN.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>yoya-ui counter</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.6.2/dist/yoya.ui.css"
    />
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import {
        div,
        ref,
        vButton,
        vCard,
        vText
      } from 'https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.6.2/dist/yoya.ui.full.min.js';

      const count = ref(0); // state is a handle: writing it updates the bound text

      div((page) => {
        page.vCard((card) => {
          card.vCardHeader('Counter');
          card.vCardBody((body) => {
            body.p((line) => line.child(vText(count)));
            body.vButton('+1', (button) => {
              button.variant('primary');
              button.on('click', () => {
                count.value += 1;
              });
            });
            body.vButton('Reset', (button) =>
              button.on('click', () => {
                count.value = 0;
              })
            );
          });
        });
      }).bindTo('#app');
    </script>
  </body>
</html>
```

One tree, three layers: native elements (`p`), an official component (`vCard` / `vButton`) and a
state handle (`ref`) — the version in the URLs is the latest release when this was written.

**Behind a CDN that is slow in China?** All three prefixes have identical paths: replace the domain
and keep the rest, and swap `<version>` for a released version number.

| CDN       | Prefix                                                            | Notes                   |
| --------- | ----------------------------------------------------------------- | ----------------------- |
| jsdmirror | `https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@<version>/dist/` | China (jsDelivr mirror) |
| Zstatic   | `https://s4.zstatic.net/npm/@yoyaflow/yoya-ui@<version>/dist/`    | China                   |
| jsDelivr  | `https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@<version>/dist/`  | Global                  |

Prefix plus file name is the full URL: `yoya.ui.full.min.js`, `yoya.ui.css`, `yoya.core.js`, …

## Progressive by design: four levels

1. **A script tag.** The quick start above: CDN, real page, zero tooling.
2. **Progressive enhancement.** `bindTo()` mounts one interactive block into an existing page — a
   static HTML file, a PHP / JSP page, or a Vue / React app. Add a block, keep the rest as it is.
3. **npm and modules.** `npm install @yoyaflow/yoya-ui`, then import per entry point:

   ```js
   import { div, svg, createI18n } from '@yoyaflow/yoya-ui/core'; // engine, HTML/SVG, signals
   import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // official components
   import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts extension (bring echarts)
   import { vThree } from '@yoyaflow/yoya-ui/three'; // Three.js extension (bring three)
   import { renderPage, hydrateOrMount } from '@yoyaflow/yoya-ui/router'; // router + SSR
   import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-ui/api'; // transport helpers
   import '@yoyaflow/yoya-ui/ui.css'; // component skin and theme variables
   ```

4. **A full application: SPA or SSR.** A single-page app needs no extra layer — the built-in router
   (`history` / `hash` modes, params, guards, 404, `vLink`, `vRouterViews`) plus the component
   categories and `ref` state, still without a mandatory build step. Server rendering reuses the same
   page factory instead:

   ```bash
   npm install -g create-yoya-ui
   create-yoya-ui my-app --template admin   # SPA shell (admin / basic) or SSR (ssr)
   ```

   On the server, `renderPage()` renders that factory and the browser reuses it with
   `hydrateOrMount()` — one codebase, no second rendering model. Guide: [docs/ssr.md](docs/ssr.md).

## What's in the box

| Area                   | Contents                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Declarative HTML & SVG | Every WHATWG element factory, nested parent shortcuts, `svgs` namespace, built-in icon set                                       |
| Components             | Layout, actions, navigation, feedback, forms, data display, async, effects, dashboard boards — all with shipped TypeScript types |
| Router                 | History/hash modes, params, guards, 404, `vLink`, `vRouterViews`                                                                 |
| i18n                   | `'text'.s('key')` shortcut, reactive switching, per-request isolation for SSR                                                    |
| State                  | `ref` / `computed` handles in value positions, rebuildable regions, `keyed()` lists, `mountable()`                               |
| Theme                  | Design tokens, light/dark, `@layer` CSS architecture                                                                             |
| Access control         | Declarative resource codes; hidden / read-only / disabled derived automatically                                                  |
| Errors & performance   | `whenFailed()` subtree boundaries; `vScroll` auto-virtualization for long lists                                                  |
| Extensions             | `vEchart`, `vThree` entries; any DOM-mountable library composes through the same lifecycle contract                              |
| DevTools (beta)        | Separate `devtools` entry for signal writes, region rebuilds, hydration mismatches                                               |

Only `ref` and `computed` are needed for state; there is no deep proxy and no proxy store. Details
per feature: [docs/highlights.md](docs/highlights.md).

## Everything is real DOM, so third-party libraries just plug in

The view tree is the DOM tree. A library that mounts into an element — charts, editors,
spreadsheets, maps — needs one thin node class with a documented lifecycle
(`renderDom` → init, option update → forward, `destroy` → dispose) and then composes with
`child()` like a built-in. `vEchart` is the reference implementation:

- the library instance is handed over in one call (`chart.echartsLib(echarts)`);
- no wrapper, no adapter layer, no re-packaged dependency;
- `registerChildFactories` exposes your component as a parent shortcut (`page.vEchart(…)`);
- browser-only widgets wrap in `vClientOnly()` so SSR emits a placeholder.

Live demos: `npm run examples:html` (component catalog plus Quill, AG Grid Community, Leaflet,
CodeMirror 6, Toast UI Viewer, and a `vThree` factory simulation). The extension pattern and the
cross-library comparison: [docs/interop.md](docs/interop.md).

## Engineering signals you can verify

Star counts measure attention, not correctness, so here is what can be checked directly:

| Signal               | Value                                                                        | How to verify                                              |
| -------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Runtime dependencies | **0**                                                                        | `package.json` — no `dependencies` block                   |
| Test suite           | 1000+ cases (DOM, state, router, i18n, access, SSR/hydration)                | `npm test`                                                 |
| Type declarations    | Root / core / api / ui / router / extensions, checked by consumer type tests | `npm run typecheck`                                        |
| SSR determinism      | Render / hydrate / mount covered, DOM-free by design                         | `src/*.ssr.test.js`, [docs/ssr.md](docs/ssr.md)            |
| Dist verification    | Category isolation, SSR single-core smoke, size budgets, README size tables  | `npm run build && npm run verify:dist`                     |
| Contract documents   | Component shapes, value positions, lifecycle frozen in writing               | [docs/component-authoring.md](docs/component-authoring.md) |

This is an early project: few stars, no legacy ecosystem to drag forward, and priorities are still
shapeable. If you are evaluating it, evaluate the repository — tests, spec docs, API alignment with
Web standards. Longer version, including the limitations we accept:
[docs/why-yoya-ui.md](docs/why-yoya-ui.md).

## Build output and size

```bash
npm run build   # entries in dist/, then a size report
```

No suffix and `.min` are incremental ESM entries (no core inside, the shared chunk loads
automatically); `.full` is self-contained (core inlined) for CDN and no-build single-file usage.

Incremental entries report two numbers: **the entry file itself** and **what a page actually
downloads** (entry plus the shared chunks it imports). Reading only the entry file overstates how
small core is — budget against the download column. The last column says what each entry contains.

| Entry                              | min+gzip (entry file ~ actual download) | Contents                                                                                                                                                                               |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yoya.core.js`                     | 2.3 KB ~ **23.1 KB**                    | Core node definitions, HTML primitives, SVG primitives + built-in icon set, Signals definitions and engine, **i18n runtime**, access control, context, a11y, theme helpers, ClientOnly |
| `yoya.api.js`                      | 0.6 KB ~ **0.6 KB**                     | Communication helpers: `RequestBase` / `Result` / `configureRequest` (optional, independent from the rendering core)                                                                   |
| `yoya.ui.js` (all categories)      | 5.6 KB ~ **95.0 KB**                    | Components: layout / actions / navigation / feedback / form / data-display / async / effects + language switch + theme                                                                 |
| `yoya.router.js`                   | 10.3 KB ~ **26.1 KB**                   | Router (`createRouter` / `vRouter` / `vLink` / `vRouterViews`) + SSR primitives (`renderToString` / `renderPage` / `hydrate` / `mount` / `serializeState`)                             |
| `yoya.devtools.js` (dev only)      | 0.1 KB ~ 1.6 KB                         | `enableDevtools` / `subscribeDevtools` / `getDevtoolsSnapshot` / `getDevtoolsDom` / `getDevtoolsScope`                                                                                 |
| `yoya.echart.js` / `yoya.three.js` | 1.5 / 2.0 KB ~ 15.3 / 15.7 KB           | `vEchart` / `vThree` wrappers                                                                                                                                                          |

Self-contained entries (core inlined, single file):

| Artifact                              | raw      | min      | min+gzip | Contents                             |
| ------------------------------------- | -------- | -------- | -------- | ------------------------------------ |
| `yoya.router.full.js`                 | 235.7 KB | 114.2 KB | 33.1 KB  | core + router / SSR                  |
| `yoya.ui-router.full.js` (everything) | 769.6 KB | 446.7 KB | 108.1 KB | core + all components + router / SSR |
| `yoya.ui.full.js`                     | 701.0 KB | 414.8 KB | 98.6 KB  | core + all components                |

Component skin `yoya.ui.css`: 60.3 KB raw / **8.7 KB gzip**. The core layer ships no skin of its own
(it behaves like plain HTML), so core-only pages do not load it.

`npm run build` prints the same table plus every shared chunk; `npm run verify:dist` fails when the
tables here drift from the artifacts, and `npm run report:bundle:write` refreshes them.

## Documentation and versioning

- [Documentation index](docs/index.md) · [Why yoya-ui](docs/why-yoya-ui.md) · [Feature highlights](docs/highlights.md)
- [AI coding-agent guide](docs/agents.md) · [Codex skill](skills/yoya-ui/README.md)
- [SSR guide](docs/ssr.md) · [Request helpers](docs/api.md) · [Theme spec](docs/theme.md) · [Access control](docs/access-control.md) · [DevTools](docs/devtools.md)
- [Component authoring](docs/component-authoring.md) · [Third-party interop](docs/interop.md)
  (cross-library comparison: [component-comparison.zh-CN.md](docs/component-comparison.zh-CN.md), Chinese)
- [Roadmap](ROADMAP.zh-CN.md) (Chinese)

Migration guides are written for **major** versions only, so there is deliberately no 0.4 → 0.5
guide: before 1.0 the API is still settling, and the commit history plus the roadmap are the record.
Stability here comes from the platform rather than from a release train, so **after 1.0 there is no
further major version** — releases are numbered `1.<year>.<patch>` (`1.2026.0`, `1.2026.1`, …) and
the core API is frozen.

## Development

```bash
npm install
npm test              # Vitest suite
npm run lint          # ESLint
npm run typecheck     # declarations + consumer type tests
npm run build         # entries + size report
npm run verify:dist   # isolation, SSR smoke, size budgets, README size tables
npm run examples:html # example site (http://localhost:5173)
```

```text
src/
  core/        ViewNode/ElementNode core, signals, i18n, theme, id allocator, SSR helpers
  html/ svg/   HTML/SVG element factories
  layout/      layout factories
  actions/ navigation/ feedback/ form/ data-display/ async/ chart/ effects/
               official component categories
  components/  component aggregation and shared logic
  examples/    example site (SSR demos and copy-paste guides)
  index.js     dev aggregate entry
scripts/       entry build and size report
types/         shipped TypeScript declarations for all entries
docs/          public guides (SSR, theme, access control, devtools, authoring, interop)
```

## License

MIT
