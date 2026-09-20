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
      href="https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.6.6/dist/yoya.ui.css"
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
      } from 'https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.6.6/dist/yoya.ui.full.min.js';

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
| Compile path (beta)    | Build-time compiler + `compiler-runtime` hooks: constant-structure rows / items become a static fragment plus positional writes  |

Only `ref` and `computed` are needed for state; there is no deep proxy and no proxy store. Details
per feature: [docs/highlights.md](docs/highlights.md).

### Compile path (beta)

A build-time tool for **repeated units** (table rows, list items, tree nodes): the compiler reads the
builder at build time and emits a module that clones a static fragment and writes only the live values.
Its hooks live in a separate subpath (`@yoyaflow/yoya-ui/compiler-runtime`); the main entry never includes
the compiler.

```bash
# Install: the compiler ships inside the package; bring your own @babel/parser (optional peer, not auto-installed)
npm i -D @yoyaflow/yoya-ui @babel/parser
```

```bash
npx yoya-compiler --file src/rows/row.js --fn buildRow --mode element --out src/generated/row.js
# Equivalent without the bin:
# node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --file … --fn buildRow --out …
```

The recommended wiring is the **build-time plugin** — written once with
[unplugin](https://unplugin.unjs.io/), so Vite / Rollup / Webpack / esbuild / Rspack / Rolldown / Farm
each get their entry (`yoyaCompile.vite(...)` / `.rollup(...)` / `.esbuild(...)` …) and you add one
line to the build config you already have. Your source stays untouched (the plugin renames `buildRow`
to `buildRowSource`, appends a same-name wrapper that delegates to the compiled factory, and keeps
the artifact in a virtual module; business code imports no generated file):

```js
import * as core from '@yoyaflow/yoya-ui/core';
import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';

plugins: [yoyaCompile.vite({ core })]; // module-level buildRow is compiled by convention
```

Lists keep their declarative form — `tbody((body) => body.keyed(rows, buildRow))` — because `keyed()`
accepts both element rows (`{ el, destroy }`) and node rows and picks the reconciler from the row
product. Targets are located by **AST symbol identity**, and anything unclear leaves the source alone
(no target, two same-name declarations, a parameter that is not a single identifier, or an
unbuildable shape all fall back to the generic path). The rewrite keeps a hires source map, so stack
traces still point at your source. See
[skills/yoya-ui/references/compile.md](skills/yoya-ui/references/compile.md).

```js
import { compileFile, reportCoverage } from '@yoyaflow/yoya-ui/compiler';
```

**No configuration needed**: `--core` defaults to the core that ships with the package (pass it only to
point at another copy) and `--runtime` defaults to `./compiler-runtime.js` (switch it to
`@yoyaflow/yoya-ui/compiler-runtime` when a bundler resolves imports). The artifact is a plain ESM module
and nothing on the runtime side changes. Anything it cannot classify falls back to the generic path for
that whole shape.

Status: **beta** — flags and artifact shapes may still change in a minor release, and not using it
changes nothing. Full contract (two channels, component registry, page `<template>` fragments,
`--report`): [docs/compiler.md](docs/compiler.md).

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

## Benchmark against other frameworks

Execution (nine standard operations) and memory, read from the official
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) runner — measured in a
**local test environment** (see the note above the table), not on the official site:

<!-- benchmark:readme:start 由 scripts/benchmark-report.mjs 生成 -->

> **Local test environment**: one Windows machine + Chrome for Testing 152.0.7977.64 (headless) + the official
> `playwright` runner, every entry measured **in the same round**; execution rows are medians of
> 15 samples, memory is a single sample. Cells read `measured (÷ vanilla)`, in ms / MB.
> **These are not the official site numbers** — only compare within the same round; size, first paint and the
> per-row detail (including the script / paint split) live in [`benchmark/report.html`](benchmark/report.html).

| Benchmark                        | vanillajs | yoya-**0.6.6** (compiled) | yoya-**0.6.6** (runtime) | Vue 3.5.39    | React 19.2.0  | Solid 1.9.3   | Svelte 5.42.1 |
| -------------------------------- | --------- | ------------------------- | ------------------------ | ------------- | ------------- | ------------- | ------------- |
| 01 create 1k rows                | 30.6      | 34.5 (1.13×)              | 44.5 (1.45×)             | 37.2 (1.22×)  | 38.9 (1.27×)  | 33.9 (1.11×)  | 33.9 (1.11×)  |
| 02 replace 1k rows               | 34.2      | 38.3 (1.12×)              | 46.3 (1.35×)             | 43.8 (1.28×)  | 45.2 (1.32×)  | 38.8 (1.13×)  | 41.8 (1.22×)  |
| 03 update every 10th row         | 21.6      | 21.4 (0.99×)              | 22.7 (1.05×)             | 25.4 (1.18×)  | 26.8 (1.24×)  | 20.7 (0.96×)  | 22.0 (1.02×)  |
| 04 select row                    | 7.0       | 6.4 (0.91×)               | 7.2 (1.03×)              | 9.1 (1.30×)   | 10.0 (1.43×)  | 7.8 (1.11×)   | 9.9 (1.41×)   |
| 05 swap rows                     | 23.1      | 24.2 (1.05×)              | 28.2 (1.22×)             | 27.8 (1.20×)  | 159.1 (6.89×) | 24.1 (1.04×)  | 24.8 (1.07×)  |
| 06 remove one row                | 17.5      | 18.1 (1.03×)              | 17.8 (1.02×)             | 20.9 (1.19×)  | 18.1 (1.03×)  | 17.6 (1.01×)  | 18.1 (1.03×)  |
| 07 create 10k rows               | 345.4     | 388.7 (1.13×)             | 501.0 (1.45×)            | 413.9 (1.20×) | 593.8 (1.72×) | 428.1 (1.24×) | 388.9 (1.13×) |
| 08 append 1k rows                | 34.6      | 40.8 (1.18×)              | 50.1 (1.45×)             | 40.6 (1.17×)  | 42.6 (1.23×)  | 36.2 (1.05×)  | 37.3 (1.08×)  |
| 09 clear x8                      | 16.7      | 25.2 (1.51×)              | 22.9 (1.37×)             | 24.8 (1.49×)  | 27.2 (1.63×)  | 21.8 (1.31×)  | 16.7 (1.00×)  |
| Nine-op geometric mean (overall) | 28.59     | 31.63 (1.11×)             | 35.82 (1.25×)            | 35.57 (1.24×) | 46.06 (1.61×) | 31.49 (1.10×) | 31.83 (1.11×) |
| 21 ready memory (MB)             | 1.06      | 1.30 (1.23×)              | 1.30 (1.23×)             | 1.27 (1.20×)  | 1.67 (1.58×)  | 1.08 (1.02×)  | 1.16 (1.10×)  |
| 22 run memory (MB)               | 2.45      | 3.95 (1.61×)              | 5.37 (2.19×)             | 4.59 (1.87×)  | 5.03 (2.05×)  | 3.34 (1.36×)  | 3.52 (1.44×)  |
| 25 run+clear memory (MB)         | 1.13      | 1.58 (1.40×)              | 1.70 (1.50×)             | 1.71 (1.52×)  | 2.38 (2.11×)  | 1.29 (1.14×)  | 1.36 (1.21×)  |

<!-- benchmark:readme:end -->

## Build output and size

```bash
npm run build   # entries in dist/, then a size report
```

No suffix and `.min` are incremental ESM entries (no core inside, the shared chunk loads
automatically); `.full` is self-contained (core inlined) for CDN and no-build single-file usage.

Incremental entries report two numbers: **the entry file itself** and **what a page actually
downloads** (entry plus the shared chunks it imports). Reading only the entry file overstates how
small core is — budget against the download column. The last column says what each entry contains.

| Entry                              | min+gzip (entry file ~ actual download) | Contents                                                                                                                                                                                            |
| ---------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yoya.core.js`                     | 2.5 KB ~ **28.9 KB**                    | Core node definitions, HTML primitives, SVG primitives + built-in icon set, Signals definitions and engine, **i18n runtime**, access control, context, a11y, theme helpers, ClientOnly              |
| `yoya.api.js`                      | 0.6 KB ~ **0.6 KB**                     | Communication helpers: `RequestBase` / `Result` / `configureRequest` (optional, independent from the rendering core)                                                                                |
| `yoya.ui.js` (all categories)      | 5.6 KB ~ **99.5 KB**                    | Components: layout / actions / navigation / feedback / form / data-display / async / effects + language switch + theme                                                                              |
| `yoya.router.js`                   | 10.4 KB ~ **30.6 KB**                   | Router (`createRouter` / `vRouter` / `vLink` / `vRouterViews`) + SSR primitives (`renderToString` / `renderPage` / `hydrate` / `mount` / `serializeState`)                                          |
| `yoya.compiler-runtime.js`         | 1.6 KB ~ **18.4 KB**                    | Runtime hooks for compiler-generated modules (`cloneFragment` / `adopt` / `bindChild` / `bindText` / `bindClass` / `setAttr` / `pushOff` / `createElementList`); the main entry never includes them |
| `yoya.devtools.js` (dev only)      | 0.1 KB ~ 1.6 KB                         | `enableDevtools` / `subscribeDevtools` / `getDevtoolsSnapshot` / `getDevtoolsDom` / `getDevtoolsScope`                                                                                              |
| `yoya.echart.js` / `yoya.three.js` | 1.5 / 2.0 KB ~ 19.6 / 20.0 KB           | `vEchart` / `vThree` wrappers                                                                                                                                                                       |

Self-contained entries (core inlined, single file):

| Artifact                              | raw      | min      | min+gzip | Contents                             |
| ------------------------------------- | -------- | -------- | -------- | ------------------------------------ |
| `yoya.router.full.js`                 | 294.0 KB | 132.4 KB | 38.9 KB  | core + router / SSR                  |
| `yoya.ui-router.full.js` (everything) | 829.1 KB | 465.6 KB | 114.1 KB | core + all components + router / SSR |
| `yoya.ui.full.js`                     | 759.9 KB | 433.5 KB | 104.3 KB | core + all components                |

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
- [Performance benchmark](docs/performance.md) (official js-framework-benchmark, numbers generated and gated)
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
