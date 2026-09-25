# yoya-ui

**A progressive, browser-native UI library: no virtual DOM, no build step — declarative interfaces in plain JavaScript.**

**English** | [简体中文](./README.zh-CN.md)

[![Release](https://img.shields.io/npm/v/@yoyaflow/yoya-ui?label=release&style=flat-square)](https://www.npmjs.com/package/@yoyaflow/yoya-ui)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/yoyaflow/yoya-ui/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/yoyaflow/yoya-ui/actions)
[![Types](https://img.shields.io/badge/types-TypeScript-blue?style=flat-square)](https://github.com/yoyaflow/yoya-ui/tree/main/types)

## What it is

yoya-ui works directly on the real DOM: views are plain JavaScript functions, every node in the
view tree maps to a real DOM element, and writing state updates the bound spots in place. No virtual
DOM, no JSX or template compiler, no build step required.

Component library, router, i18n, theme, access control and state management ship with it, but none
of them takes over your build chain: use one entry or all of them, and fall back to native DOM
whenever you want. Why it is built this way: [Why yoya-ui](docs/why-yoya-ui.md).

## Who it is for

- **Teams that do not want to be tied to build tooling** — the shipped ESM files run in a plain
  page, and an existing bundler setup keeps working.
- **Projects that need long-term maintenance** — one API built on Web standards, instead of
  rewriting for a framework's next major version.
- **Legacy systems and existing pages** — drop declarative interaction into an existing
  PHP / JSP / Vue / React page, block by block, with no migration.
- **Teams using AI-generated code** — no framework context and no build magic between the
  generated code and the browser, so it runs as soon as it is saved.

**Who it is not for:** teams that are already committed to a framework ecosystem (React / Vue /
Angular) and want that ecosystem's component market, conventions and tooling. yoya-ui does not
re-package those libraries; it hands them a real DOM element instead.

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
      href="https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.4/dist/yoya.ui.css"
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
      } from 'https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.4/dist/yoya.ui.full.min.js';

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

The example uses all three layers at once: native elements (`p`), official components
(`vCard` / `vButton`) and a state handle (`ref`). The version in the URLs is the latest release as of
writing.

**Behind a CDN that is slow in China?** All three prefixes have identical paths: replace the domain
and keep the rest, and swap `<version>` for a released version number.

| CDN       | Prefix                                                            | Notes                   |
| --------- | ----------------------------------------------------------------- | ----------------------- |
| jsdmirror | `https://cdn.jsdmirror.com/npm/@yoyaflow/yoya-ui@<version>/dist/` | China (jsDelivr mirror) |
| Zstatic   | `https://s4.zstatic.net/npm/@yoyaflow/yoya-ui@<version>/dist/`    | China                   |
| jsDelivr  | `https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@<version>/dist/`  | Global                  |

Prefix plus file name is the full URL: `yoya.ui.full.min.js`, `yoya.ui.css`, `yoya.core.js`, …

## Four levels of progressive adoption

1. **A script tag.** The quick start above: CDN, real page, zero tooling.
2. **Progressive enhancement.** `bindTo()` mounts one interactive block into an existing page — a
   static HTML file, a PHP / JSP page, or a Vue / React app. Add a block, keep the rest as it is.
3. **npm and modules.** `npm install @yoyaflow/yoya-ui` (pulls in `@yoyaflow/yoya-core`), or
   `npm install @yoyaflow/yoya-core` when you only want the engine primitives. Then import per entry:

   ```js
   import { div, svg, vNode } from '@yoyaflow/yoya-core'; // engine, HTML/SVG, signals
   import { createI18n, initYoyaTheme } from '@yoyaflow/yoya-core/tools'; // i18n / theme / a11y / authoring
   import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // official components
   import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts extension (bring echarts)
   import { vThree } from '@yoyaflow/yoya-ui/three'; // Three.js extension (bring three)
   import { renderPage, hydrateOrMount } from '@yoyaflow/yoya-ui/router'; // router + SSR
   import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-core/api'; // request helpers
   import '@yoyaflow/yoya-ui/ui.css'; // component skin and theme variables
   ```

   > If you want build-time compilation, install it then:
   > `npm i -D @yoyaflow/yoya-compiler @babel/parser unplugin magic-string`. See the
   > [compiler guide](docs/compiler.md).

4. **A full application: SPA or SSR.** A single-page app needs no extra layer: the built-in router
   (`history` / `hash` modes, params, guards, 404, `vLink`, `vRouterViews`) plus the component
   categories and `ref` state are enough, still without a build step. For server rendering, reuse the
   same page factory:

   ```bash
   npm install -g create-yoya-ui
   create-yoya-ui my-app --template admin   # SPA shell (admin / basic) or SSR (ssr)
   ```

   On the server, `renderPage()` renders that factory and the browser takes over with
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
| Extensions             | `vEchart`, `vThree` entries; any DOM-mountable library plugs in through the same lifecycle                                       |
| DevTools (beta)        | Separate `devtools` entry for signal writes, region rebuilds, hydration mismatches                                               |
| Compile path (beta)    | Optional build-time compiler: constant-structure list and table rows become a static fragment; see the compiler guide            |

State needs only `ref` and `computed`; there is no deep proxy and no proxy store. Details per
feature: [docs/highlights.md](docs/highlights.md).

### Compile path (beta, optional)

When the same structure is created over and over (list rows, tree nodes, table cells), a build-time
step can compile the row factory into a module that clones a static fragment and writes only the live
values, saving the per-row node objects and binding registrations. The compiler is not part of the
runtime: installing and running it changes no existing code.

```bash
npm i -D @yoyaflow/yoya-compiler @babel/parser unplugin magic-string
```

Command-line usage, the build-plugin wiring, the shapes it can compile, the fallback rules and the
runtime hooks: [docs/compiler.md](docs/compiler.md).

## Everything is real DOM, so third-party libraries just plug in

The view tree is the DOM tree. A library that mounts into an element — charts, editors,
spreadsheets, maps — plugs in through the same lifecycle (a `vNode` closure: `whenMount(host)` to
initialise, option updates forwarded, `whenDestroy` to dispose) and then composes with `child()`
like a built-in. `vEchart` is the official adapter:

- the adapter is one thin component — `vEchart` only bridges the lifecycle and ships no echarts code;
- you hand over the library instance (`chart.echartsLib(echarts)`); options are forwarded as-is, with no
  reactive wrapper, and the dependency is never re-packaged;
- `registerChildFactories` exposes your component as a parent shortcut (`page.vEchart(…)`);
- browser-only widgets wrap in `vClientOnly()` so SSR emits a placeholder.

Live demos: `npm run examples:html` (component catalog plus Quill, AG Grid Community, Leaflet,
CodeMirror 6, Toast UI Viewer, and a `vThree` demo). The extension pattern and the
cross-library comparison: [docs/interop.md](docs/interop.md).

## Engineering quality you can check

Star counts only measure attention; everything below can be checked in the repository:

| Item                 | Current value                                                                                                  | How to verify                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Runtime dependencies | **0**                                                                                                          | `package.json` has no `dependencies` block                                           |
| Test suite           | 1000+ cases (DOM, state, router, i18n, access, SSR/hydration)                                                  | `npm test`                                                                           |
| Type declarations    | Root / core / api / ui / router / extension entries, checked by consumer type tests                            | `npm run typecheck`                                                                  |
| SSR determinism      | Render / hydrate / mount covered, no DOM on the server                                                         | `packages/yoya-ui/src/testing/integration/*.ssr.test.js`, [docs/ssr.md](docs/ssr.md) |
| Dist verification    | entries match dist, one copy of core, `.full` self-contained, size tables match the artifacts                  | `npm run build && npm run verify:dist`                                               |
| Package boundaries   | core depends on no component package; yoya-ui takes core as a peer; the compiler branches on no component name | `npm run verify:packages`                                                            |
| Browser baseline     | Chrome/Edge ≥ 123 · Firefox ≥ 120 · Safari/iOS ≥ 17.5, with a degradation floor                                | `browserslist`, [docs/browser-support.md](docs/browser-support.md)                   |
| Component spec       | Component shapes, value positions and lifecycle written down                                                   | [docs/component-authoring.md](docs/component-authoring.md)                           |

This is an early project: not many people know about it yet, no legacy baggage, and priorities can
still be influenced. If you are evaluating it, look at the repository itself: tests, spec documents,
and an API aligned with Web standards. The limitations we accept are written up in
[docs/why-yoya-ui.md](docs/why-yoya-ui.md).

## Benchmark against other frameworks

Below are timings for the nine standard operations and memory use, measured with the official
[js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) runner in a **local test
environment**, not on the official site:

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
npm run build        # packages/*/dist, the example build and the size table
npm run verify:dist  # entries match dist, one copy of core, .full self-contained, README size table
```

The repo is a **five-package monorepo** (`packages/*`): `yoya-core` holds the engine and the
foundations (nodes, signals, SSR primitives, HTML/SVG factories, i18n, theme, access control, the
component-authoring spec); `yoya-ui` holds components and page features (components, layout, router,
theme, extensions); `yoya-compiler` is the optional build-time compiler; `contract` holds
cross-package tests; `create-yoya-ui` is the scaffold. Published packages ship two layers:

- **common entries**: `dist/yoya.ui.js`, `dist/yoya.ui-router.full.js` and their `.min` variants.
  Incremental entries are one-line re-exports that share core through the peer dependency;
  `yoya.core.js`, `yoya.api.js` and the three `.full` bundles are **self-contained** (core inlined
  into a single file).
- **module directories**: `dist/core/**`, `dist/actions/**`, … (preserveModules), used for the
  library-internal `/internal/*` deep imports.

Non-`.full` entries share exactly one core (a second copy breaks identity checks such as
`instanceof`); a `.full` bundle is a self-contained single file and **must not be mixed with the
`@yoyaflow/yoya-core` package**. The reason is in [docs/ssr.md](docs/ssr.md).

Since 0.7.2 the entries are split by purpose: the main entry is the rendering primitives plus the
whole element table (nodes, HTML and **SVG factories + icon set**, signals, `keyed`, `vText`, `slot`);
`/tools` carries a11y, i18n, theme and the component-authoring spec, `/dev` carries DevTools, `/svg`
is an explicit alias for the element table, and `/ssr` is the complete server entry (core + html +
layout + router/SSR). Modules under `dist/**` are reachable through `./internal/*`; the older
`@yoyaflow/yoya-core/devtools` and `@yoyaflow/yoya-ui/devtools` paths still resolve.

The table below lists each entry's min+gzip size (its transitive closure: the dist import graph
bundled again and compressed). The core row is self-contained; each yoya-ui row measures only what it
adds _on top of_ core, so the real download is core + that row.

<!-- bundle-sizes:start -->

| 入口                                 | 内容                                                                                | min+gzip |
| ------------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| `@yoyaflow/yoya-core`                | 节点 / 信号 / HTML·SVG 原语 + i18n·access·context·a11y·theme 原语（自包含）         | 26.5 KB  |
| `@yoyaflow/yoya-core/api`            | 请求辅助：RequestBase / Result / configureRequest                                   | 0.6 KB   |
| `@yoyaflow/yoya-core/tools`          | a11y / i18n / theme / 组件写作规范（core 自包含）                                   | 22.8 KB  |
| `@yoyaflow/yoya-ui`                  | 全部组件 + layout + router / SSR（core 由 peer 提供）                               | 80.4 KB  |
| `@yoyaflow/yoya-ui/ui`               | 全部组件 + layout + theme（不含 router / SSR）                                      | 72.9 KB  |
| `@yoyaflow/yoya-ui/router`           | router + SSR 原语（renderToString / renderPage / hydrate / hydrateOrMount / mount） | 9.0 KB   |
| `@yoyaflow/yoya-ui/ssr`              | 服务端完整入口：core 原语 + html + layout + router / SSR（core 由 peer 提供）       | 15.2 KB  |
| `@yoyaflow/yoya-ui/svg`              | SVG 工厂 + 图标集（转发到 core 主入口，同一份实现）                                 | 0.1 KB   |
| `@yoyaflow/yoya-ui/tools`            | a11y / i18n / theme / 组件写作规范（转发到 core，peer 提供）                        | 0.1 KB   |
| `@yoyaflow/yoya-ui/dev`              | devtools（转发到 core，peer 提供）                                                  | 0.1 KB   |
| `@yoyaflow/yoya-ui/actions`          | button / buttons / float-button / 菜单                                              | 9.5 KB   |
| `@yoyaflow/yoya-ui/navigation`       | menu / sidebar / anchor / breadcrumb / steps / tabs                                 | 12.8 KB  |
| `@yoyaflow/yoya-ui/feedback`         | dialog / tooltip / toast / vConfirm                                                 | 12.6 KB  |
| `@yoyaflow/yoya-ui/form`             | input / select / radio / upload / 控件族                                            | 22.9 KB  |
| `@yoyaflow/yoya-ui/data-display`     | table / tree / badge / progress / carousel / 看板族                                 | 28.9 KB  |
| `@yoyaflow/yoya-ui/async`            | vDynamicLoader / lazy-image                                                         | 4.2 KB   |
| `@yoyaflow/yoya-ui/echart`           | vEchart（ECharts 适配器，自备 echarts）                                             | 3.3 KB   |
| `@yoyaflow/yoya-ui/three`            | vThree（Three.js 适配器，自备 three）                                               | 3.8 KB   |
| `@yoyaflow/yoya-ui/compiler-runtime` | 编译路径的运行期钩子（主入口不含）                                                  | 0.1 KB   |

<!-- bundle-sizes:end -->

Component skin: `yoya.ui.css` 126.1 KB raw / 22.1 KB gzip (the core layer has no skin).

> A `.full` bundle such as `yoya.ui.full.min.js` is a **self-contained single file** (core inlined) —
> the CDN path used by the quick start above. Never mix it with the `@yoyaflow/yoya-core` package: a
> second copy of core breaks identity checks such as `instanceof` (see the notes in
> [docs/ssr.md](docs/ssr.md)). The incremental entries (`yoya.ui.js`, `yoya.actions.js`, …) are
> one-line re-exports that take core as a **peer dependency**, so importing those straight from a CDN
> URL needs an import map.

## Documentation and versioning

- [Documentation index](docs/index.md) · [Why yoya-ui](docs/why-yoya-ui.md) · [Feature highlights](docs/highlights.md)
- [Install and imports](docs/install.md) (entries, CDN, import maps)
- [AI coding-agent guide](docs/agents.md) · [Codex skill](skills/yoya-ui/README.md)
- [SSR guide](docs/ssr.md) · [Request helpers](docs/api.md) · [Theme spec](docs/theme.md) · [Access control](docs/access-control.md) · [DevTools](docs/devtools.md)
- [Browser baseline and degradation](docs/browser-support.md)
- [Component authoring](docs/component-authoring.md) · [Third-party interop](docs/interop.md)
  (cross-library comparison: [component-comparison.zh-CN.md](docs/component-comparison.zh-CN.md), Chinese)
- [Performance benchmark](docs/performance.md) (official js-framework-benchmark, numbers generated and checked at build time)
- [Roadmap](ROADMAP.zh-CN.md) (Chinese)

Migration guides are written for **major** versions only, so there is no 0.4 → 0.5 guide: before 1.0
the API is still settling, and the commit history plus the roadmap are the record. The API is built
on Web standards, so stability comes from the platform itself: **after 1.0 there is no further major
version** — releases are numbered `1.<year>.<patch>` (`1.2026.0`, `1.2026.1`, …) and the core API is
frozen.

## Development

```bash
npm install
npm test              # Vitest suite
npm run lint          # ESLint
npm run typecheck     # declarations + consumer type tests
npm run build         # package output, example build and size table
npm run verify:dist   # entries match dist, SSR smoke, size budgets, README size table
npm run examples:html # example site (http://localhost:5173)
```

```text
packages/
  yoya-core/      engine and foundations: nodes, signals, SSR, i18n, theme, access, HTML/SVG, authoring spec
  yoya-ui/        components and page features: layout / actions / navigation / feedback / form /
                  data-display / async / i18n / theme / router / chart / three + skin + types
  yoya-compiler/  build-time compiler (optional tool; bin: yoya-compiler)
  contract/       cross-package tests and repo-wide checks (not published)
  create-yoya-ui/ scaffold (templates pin the current version)
examples/         example site (SSR demos and copy-paste guides)
scripts/          build, size report, package-boundary and artifact checks
docs/             public docs (SSR, theme, access control, devtools, authoring, interop, …)
benchmark/        benchmark and size data sources
skills/           Codex skill (kept in sync with the docs)
```

## License

MIT
