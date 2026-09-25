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
3. **npm and modules.** `npm install @yoyaflow/yoya-ui` (pulls in `@yoyaflow/yoya-core`), or
   `npm install @yoyaflow/yoya-core` when you only want the engine primitives. Then import per entry:

   ```js
   import { div, svg, createI18n, vNode } from '@yoyaflow/yoya-core'; // engine, HTML/SVG, signals
   import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // official components
   import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts extension (bring echarts)
   import { vThree } from '@yoyaflow/yoya-ui/three'; // Three.js extension (bring three)
   import { renderPage, hydrateOrMount } from '@yoyaflow/yoya-ui/router'; // router + SSR
   import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-core/api'; // transport helpers
   import '@yoyaflow/yoya-ui/ui.css'; // component skin and theme variables
   ```

   > For the build-time compiler: `npm i -D @yoyaflow/yoya-compiler @babel/parser`. The runtime hooks used
   > by compiled artifacts live in `@yoyaflow/yoya-core/compiler-runtime` (loaded only by projects that
   > actually compiled).

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
npx yoya-compiler --file src/Row.js --component Row --mode element --out src/generated/row.js
# Equivalent without the bin:
# node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --file … --component Row --out …
```

The recommended wiring is the **build-time plugin** — written once with
[unplugin](https://unplugin.unjs.io/), so Vite / Rollup / Webpack / esbuild / Rspack / Rolldown / Farm
each get their entry (`yoyaCompile.vite(...)` / `.rollup(...)` / `.esbuild(...)` …) and you add one
line to the build config you already have. Your source stays untouched (the plugin renames `Row`
to `RowSource`, appends a same-name wrapper that delegates to the compiled factory, and keeps
the artifact in a virtual module; business code imports no generated file):

```js
import * as core from '@yoyaflow/yoya-ui/core';
import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';

plugins: [yoyaCompile.vite({ core })]; // compile units = component boundary (view-returning factories)
```

Lists keep their declarative form — `tbody((body) => body.keyed(rows, Row))` — because `keyed()`
accepts both element rows (`{ el, destroy }`) and node rows and picks the reconciler from the row
product. Targets are located by **AST symbol identity**, and anything unclear leaves the source alone
(no target, two same-name declarations, or an unbuildable shape all fall back to the generic path).
The rewrite keeps a hires source map, so stack traces still point at your source. See
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
spreadsheets, maps — needs one shape-B component with a documented lifecycle
(a `vNode` closure: `whenMount(host)` → init, option update → forward, `whenDestroy` → dispose)
and then composes with `child()` like a built-in. `vEchart` is the reference implementation:

- the library instance is handed over in one call (`chart.echartsLib(echarts)`);
- no wrapper, no adapter layer, no re-packaged dependency;
- `registerChildFactories` exposes your component as a parent shortcut (`page.vEchart(…)`);
- browser-only widgets wrap in `vClientOnly()` so SSR emits a placeholder.

Live demos: `npm run examples:html` (component catalog plus Quill, AG Grid Community, Leaflet,
CodeMirror 6, Toast UI Viewer, and a `vThree` factory simulation). The extension pattern and the
cross-library comparison: [docs/interop.md](docs/interop.md).

## Engineering signals you can verify

Star counts measure attention, not correctness, so here is what can be checked directly:

| Signal               | Value                                                                                              | How to verify                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Runtime dependencies | **0**                                                                                              | `package.json` — no `dependencies` block                                             |
| Test suite           | 1000+ cases (DOM, state, router, i18n, access, SSR/hydration)                                      | `npm test`                                                                           |
| Type declarations    | Root / core / api / ui / router / extensions, checked by consumer type tests                       | `npm run typecheck`                                                                  |
| SSR determinism      | Render / hydrate / mount covered, DOM-free by design                                               | `packages/yoya-ui/src/testing/integration/*.ssr.test.js`, [docs/ssr.md](docs/ssr.md) |
| Dist verification    | exports↔dist, no cross-package inlining, host singleton smoke, `.full` self-contained, size tables | `npm run build && npm run verify:dist`                                               |
| Package boundaries   | core depends on no component; the fast line treats core as a peer; the compiler knows no component | `npm run verify:packages`                                                            |
| Browser baseline     | Chrome/Edge ≥ 123 · Firefox ≥ 120 · Safari/iOS ≥ 17.5, with a degradation floor                    | `browserslist`, [docs/browser-support.md](docs/browser-support.md)                   |
| Contract documents   | Component shapes, value positions, lifecycle frozen in writing                                     | [docs/component-authoring.md](docs/component-authoring.md)                           |

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

| Benchmark                        | vanillajs | yoya-**0.7.3** (compiled) | yoya-**0.7.3** (runtime) | Vue 3.5.39    | React 19.2.0  | Solid 1.9.3   | Svelte 5.42.1 |
| -------------------------------- | --------- | ------------------------- | ------------------------ | ------------- | ------------- | ------------- | ------------- |
| 01 create 1k rows                | 30.5      | 35.3 (1.16×)              | 44.9 (1.47×)             | 36.8 (1.21×)  | 38.3 (1.26×)  | 33.6 (1.10×)  | 32.7 (1.07×)  |
| 02 replace 1k rows               | 32.8      | 38.5 (1.17×)              | 46.1 (1.41×)             | 40.7 (1.24×)  | 43.9 (1.34×)  | 35.9 (1.09×)  | 36.4 (1.11×)  |
| 03 update every 10th row         | 22.4      | 20.5 (0.92×)              | 23.2 (1.04×)             | 26.3 (1.17×)  | 27.0 (1.21×)  | 22.8 (1.02×)  | 22.3 (1.00×)  |
| 04 select row                    | 7.3       | 5.8 (0.79×)               | 6.2 (0.85×)              | 7.6 (1.04×)   | 10.5 (1.44×)  | 9.1 (1.25×)   | 10.6 (1.45×)  |
| 05 swap rows                     | 22.1      | 26.9 (1.22×)              | 28.0 (1.27×)             | 24.8 (1.12×)  | 157.3 (7.12×) | 24.5 (1.11×)  | 25.6 (1.16×)  |
| 06 remove one row                | 16.8      | 18.0 (1.07×)              | 19.1 (1.14×)             | 19.2 (1.14×)  | 18.4 (1.10×)  | 18.2 (1.08×)  | 17.9 (1.07×)  |
| 07 create 10k rows               | 330.4     | 395.7 (1.20×)             | 539.3 (1.63×)            | 406.7 (1.23×) | 585.5 (1.77×) | 350.7 (1.06×) | 371.7 (1.13×) |
| 08 append 1k rows                | 34.4      | 39.7 (1.15×)              | 48.9 (1.42×)             | 41.6 (1.21×)  | 50.4 (1.47×)  | 37.3 (1.08×)  | 36.8 (1.07×)  |
| 09 clear x8                      | 15.3      | 20.6 (1.35×)              | 23.3 (1.52×)             | 20.1 (1.31×)  | 27.2 (1.78×)  | 17.6 (1.15×)  | 17.1 (1.12×)  |
| Nine-op geometric mean (overall) | 28.00     | 30.85 (1.10×)             | 35.85 (1.28×)            | 33.16 (1.18×) | 46.94 (1.68×) | 30.90 (1.10×) | 31.46 (1.12×) |
| 21 ready memory (MB)             | 1.02      | 1.33 (1.31×)              | 1.29 (1.26×)             | 1.33 (1.30×)  | 1.64 (1.60×)  | 1.05 (1.03×)  | 1.14 (1.11×)  |
| 22 run memory (MB)               | 2.44      | 4.12 (1.69×)              | 5.48 (2.24×)             | 4.58 (1.88×)  | 5.09 (2.08×)  | 3.33 (1.36×)  | 3.52 (1.44×)  |
| 25 run+clear memory (MB)         | 1.16      | 1.64 (1.41×)              | 1.82 (1.57×)             | 1.70 (1.47×)  | 2.48 (2.14×)  | 1.29 (1.11×)  | 1.49 (1.29×)  |

<!-- benchmark:readme:end -->

## Build output and size

```bash
npm run build        # packages/*/dist (publish face + module mirrors) + dist/examples/ + size table
npm run verify:dist  # artifact completeness, no cross-package inlining, host singleton smoke, .full smoke, README table
```

The repo is a **five-package monorepo** (`packages/*`): `yoya-core` (slow line: primitives + the
component-authoring contract), `yoya-ui` (fast line: components / layout / router / theme /
extensions), `yoya-compiler` (build-time compiler), `contract` (cross-package contract tests) and
`create-yoya-ui` (scaffold). The published packages ship two layers:

- **publish face**: legacy entry names + `.min` (`dist/yoya.ui.js`, `dist/yoya.ui-router.full.js`, …).
  Incremental entries are one-line re-exports with core as a **peer**; `yoya.core.js` / `yoya.api.js` /
  the three `.full` bundles are **self-contained** (core inlined into a single file);
- **module mirrors**: `dist/core/**`, `dist/actions/**`, … (preserveModules) — the stable target for the
  library-internal `/internal/*` deep imports.

Singleton rules: **non-full entries** share exactly one core through the peer dependency (a second copy
breaks `instanceof` / identity checks); a `.full` bundle is a self-contained single file and **must not
be mixed with the `@yoyaflow/yoya-core` package** (see the prohibition in [docs/ssr.md](docs/ssr.md)).

The table below is each entry's **transitive closure, min+gzip** (the dist import graph is bundled
again and compressed). The core row is self-contained; each ui row measures what it adds _on top of_
core, so the real download is core + that row.

<!-- bundle-sizes:start -->

| 入口                                 | 内容                                                                                | min+gzip |
| ------------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| `@yoyaflow/yoya-core`                | 节点 / 信号 / HTML·SVG 原语 + i18n·access·context·a11y·theme 原语（自包含）         | 26.5 KB  |
| `@yoyaflow/yoya-core/api`            | 通讯辅助约束：RequestBase / Result / configureRequest                               | 0.6 KB   |
| `@yoyaflow/yoya-ui`                  | 全部组件 + layout + router / SSR（core 由 peer 提供）                               | 80.4 KB  |
| `@yoyaflow/yoya-ui/ui`               | 全部组件 + layout + theme（不含 router / SSR）                                      | 72.9 KB  |
| `@yoyaflow/yoya-ui/router`           | router + SSR 原语（renderToString / renderPage / hydrate / hydrateOrMount / mount） | 9.0 KB   |
| `@yoyaflow/yoya-ui/actions`          | button / buttons / float-button / 菜单                                              | 9.5 KB   |
| `@yoyaflow/yoya-ui/navigation`       | menu / sidebar / anchor / breadcrumb / steps / tabs                                 | 12.8 KB  |
| `@yoyaflow/yoya-ui/feedback`         | dialog / tooltip / toast / vConfirm                                                 | 12.6 KB  |
| `@yoyaflow/yoya-ui/form`             | input / select / radio / upload / 控件族                                            | 22.9 KB  |
| `@yoyaflow/yoya-ui/data-display`     | table / tree / badge / progress / carousel / 看板族                                 | 28.9 KB  |
| `@yoyaflow/yoya-ui/async`            | vDynamicLoader / lazy-image                                                         | 4.2 KB   |
| `@yoyaflow/yoya-ui/echart`           | vEchart（ECharts 封装，自备 echarts）                                               | 3.3 KB   |
| `@yoyaflow/yoya-ui/three`            | vThree（Three.js 封装，自备 three）                                                 | 3.8 KB   |
| `@yoyaflow/yoya-ui/compiler-runtime` | 编译路径的运行期钩子（主入口不含）                                                  | 0.1 KB   |

<!-- bundle-sizes:end -->

Component skin: `yoya.ui.css` 126.1 KB raw / 22.1 KB gzip (the core layer has no skin).

> The self-contained full bundles (the old `yoya.ui.full.min.js` and friends) are gone: with core
> delivered as a peer dependency, shipping an inlined copy would reintroduce the "two copies" hazard.

## Documentation and versioning

- [Documentation index](docs/index.md) · [Why yoya-ui](docs/why-yoya-ui.md) · [Feature highlights](docs/highlights.md)
- [AI coding-agent guide](docs/agents.md) · [Codex skill](skills/yoya-ui/README.md)
- [SSR guide](docs/ssr.md) · [Request helpers](docs/api.md) · [Theme spec](docs/theme.md) · [Access control](docs/access-control.md) · [DevTools](docs/devtools.md)
- [Browser baseline and degradation](docs/browser-support.md)
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
packages/
  yoya-core/      slow line: core (nodes/signals/SSR/i18n/theme/access/context/a11y) + html + svg + authoring contract
  yoya-ui/        fast line: layout / actions / navigation / feedback / form / data-display / async /
                  i18n / theme / router / chart / three + skin (yoya.ui.css) + types
  yoya-compiler/  build-time compiler (shape-driven, knows no component; bin: yoya-compiler)
  contract/       cross-package contract tests + repo-wide gates (not published)
  create-yoya-ui/ scaffold (templates pin the current version)
examples/         example site (SSR demos and copy-paste guides)
scripts/          build, size report, package-boundary / artifact gates
docs/             public guides (SSR, theme, access control, devtools, authoring, interop)
benchmark/        benchmark and size data sources
skills/           Codex skill (kept in sync with the docs)
```

## License

MIT
