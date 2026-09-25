# Installation and Imports

This page covers three things: how to get yoya-ui into a project, which **export** (public entry) to import
from for each capability, and the boundaries of each route (scaffold / bundler / CDN). For the reasoning
behind the entry surface see [packages.md](packages.md); for the artifact inventory and naming rules see
[artifacts-plan.md](artifacts-plan.md).

Current version: `@yoyaflow/yoya-core` / `@yoyaflow/yoya-ui` / `@yoyaflow/yoya-compiler` are all **0.7.3**
(Node `^20.19.0 || ^22.13.0 || >=24.0.0`; browser baseline: [browser-support.md](browser-support.md)).

## 1. Three ways in

| Route         | Fits                                                            | Command / entry                                                                     |
| ------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Scaffold      | New project, want the full project pattern right away           | `npm create yoya-ui@latest my-app` (templates: `basic` / `admin` / `ssr`)           |
| npm modules   | Existing bundler setup (Vite / Rollup / Webpack / Rspack)       | `npm i @yoyaflow/yoya-ui` (components) or `npm i @yoyaflow/yoya-core` (engine only) |
| CDN, no build | Static pages, a block inside a legacy system, AI-generated code | Self-contained single files: `dist/yoya.core.min.js`, `dist/yoya.ui.full.min.js`, … |

```bash
# Scaffold: three templates, dependencies pinned to the current release
npm create yoya-ui@latest my-app
create-yoya-ui my-app --template admin   # admin | basic | ssr

# npm: the component package brings core in as a peer dependency (one shared core instance)
npm install @yoyaflow/yoya-ui

# Engine only (writing your own component library, minimal pages)
npm install @yoyaflow/yoya-core
```

There is no runtime CSS injection — link the component skin once:

```js
import '@yoyaflow/yoya-ui/ui.css';
```

## 2. `@yoyaflow/yoya-core`: engine and element surface

The main entry ships only what rendering needs: nodes and primitives, element factories (HTML + SVG + icon
set), signals, and the access / context primitives. Auxiliary capabilities (i18n / theme / a11y / component
authoring) live in `/tools`, so they never enter a bundle that does not use them.

| Import path                            | Contents                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@yoyaflow/yoya-core`                  | Main entry: `ViewNode` / `ElementNode` / `HtmlElementNode` / `SvgElementNode` / `vNode` / `vText` / `slot`, HTML and SVG factories + icon set, signals `ref` / `computed` / `batch` / `isSignal` / `installSignals`, access and context (`createAccess` / `installAccess` / `withContext` / `inject` / `provide`), document and window events (`bindDocumentEvent` / `bindWindowEvent`) |
| `@yoyaflow/yoya-core/html`             | HTML factories (same implementation as the main entry)                                                                                                                                                                                                                                                                                                                                  |
| `@yoyaflow/yoya-core/svg`              | SVG factories and icon set (same implementation as the main entry)                                                                                                                                                                                                                                                                                                                      |
| `@yoyaflow/yoya-core/tools`            | a11y (`announce` / `createFocusTrap` / `getFocusableElements` / `moveByKey`), i18n (`createI18n` / `i18nText` / `installI18nStringShortcut` …), theme (`initYoyaTheme` / `setYoyaMode` / `setYoyaTheme` / `resolveYoyaMode` …), component authoring (`applyElementOptions` / `componentNameOf` / `themeValue` / `runBuilder` …)                                                         |
| `@yoyaflow/yoya-core/dev`              | DevTools: `enableDevtools` / `disableDevtools` / `subscribeDevtools` / `getDevtoolsSnapshot` …; the old `/devtools` path still resolves                                                                                                                                                                                                                                                 |
| `@yoyaflow/yoya-core/api`              | Transport helpers: `RequestBase` / `Result` / `configureRequest`                                                                                                                                                                                                                                                                                                                        |
| `@yoyaflow/yoya-core/ssr`              | SSR primitives: `renderToString` / `hydrate` / `mount` / `renderPage` / `hydrateOrMount` / `parseState` / `serializeState` / `resolveLocale`                                                                                                                                                                                                                                            |
| `@yoyaflow/yoya-core/compiler-runtime` | Runtime hooks for compiled artifacts (pulled in by the artifacts themselves)                                                                                                                                                                                                                                                                                                            |
| `@yoyaflow/yoya-core/internal/*`       | Deep-import allowlist for the library itself (`internal/core/node.js`, `internal/svg/icons.js`, …); **application code should use the public entries above**                                                                                                                                                                                                                            |

```js
// Main entry: page primitives, element factories, signals, access
import { body, div, svg, ref, computed, vNode, vText, createAccess } from '@yoyaflow/yoya-core';

// Auxiliary capabilities, imported where used
import { createI18n } from '@yoyaflow/yoya-core/tools'; // i18n
import { initYoyaTheme, setYoyaMode } from '@yoyaflow/yoya-core/tools'; // theme
import { announce, createFocusTrap } from '@yoyaflow/yoya-core/tools'; // a11y
import { applyElementOptions } from '@yoyaflow/yoya-core/tools'; // authoring contract (same binding as main)
import { RequestBase, Result } from '@yoyaflow/yoya-core/api'; // transport
import { renderToString, hydrate, mount } from '@yoyaflow/yoya-core/ssr'; // SSR primitives
import { enableDevtools } from '@yoyaflow/yoya-core/dev'; // DevTools
```

> Since 0.7.2 symbols such as `createI18n` / `initYoyaTheme` / `announce` are **not** on the main entry —
> import them from `/tools`. Asking the `@yoyaflow/yoya-core` main entry for `createI18n` fails with
> "does not provide an export named".

## 3. `@yoyaflow/yoya-ui`: components, router and extensions

| Import path                                                               | Contents                                                                                                 |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@yoyaflow/yoya-ui`                                                       | Root entry = the full face: core + tools + all components + layout + theme + router/SSR (tree-shaken)    |
| `@yoyaflow/yoya-ui/core`                                                  | Forwards to `@yoyaflow/yoya-core` (**same instance**, so `instanceof` keeps working)                     |
| `@yoyaflow/yoya-ui/ui`                                                    | Components + layout + theme (no router / SSR)                                                            |
| `@yoyaflow/yoya-ui/router`                                                | Router + SSR: `createRouter` / `Router` / `renderPage` / `hydrateOrMount` / `renderToString` / `mount` … |
| `@yoyaflow/yoya-ui/{actions,navigation,feedback,form,data-display,async}` | Component category entries (same components as `/ui`, sliced differently)                                |
| `@yoyaflow/yoya-ui/tools`                                                 | Forwards to `@yoyaflow/yoya-core/tools` (i18n / theme / a11y / authoring)                                |
| `@yoyaflow/yoya-ui/svg`                                                   | SVG element surface (same implementation as core)                                                        |
| `@yoyaflow/yoya-ui/dev`                                                   | DevTools (forwards to core); the old `/devtools` path still resolves                                     |
| `@yoyaflow/yoya-ui/api`                                                   | = `@yoyaflow/yoya-core/api`                                                                              |
| `@yoyaflow/yoya-ui/echart`                                                | `vEchart` (bring your own `echarts`; pass it with `chart.echartsLib(echarts)`)                           |
| `@yoyaflow/yoya-ui/three`                                                 | `vThree` (bring your own `three`)                                                                        |
| `@yoyaflow/yoya-ui/compiler`                                              | Forwards to `@yoyaflow/yoya-compiler`                                                                    |
| `@yoyaflow/yoya-ui/compiler-runtime` / `/compiled-registry`               | Compile runtime hooks and prebuilt registry data                                                         |
| `@yoyaflow/yoya-ui/ui.css`                                                | Component skin and theme variables (no runtime injection — always link it)                               |

```js
// Simplest: pull everything from the root entry (bundlers tree-shake it)
import {
  div,
  ref,
  vText,
  vButton,
  vCard,
  vForm,
  vTable,
  createRouter,
  renderPage
} from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

// Thinner: engine / components / router imported separately
import { div, ref, vText } from '@yoyaflow/yoya-core';
import { vButton, vCard } from '@yoyaflow/yoya-ui/ui';
import { createRouter, renderPage } from '@yoyaflow/yoya-ui/router';

// Extensions and tools
import { vEchart } from '@yoyaflow/yoya-ui/echart';
import { createI18n, initYoyaTheme } from '@yoyaflow/yoya-ui/tools';
import { enableDevtools } from '@yoyaflow/yoya-ui/dev';
```

## 4. `@yoyaflow/yoya-compiler`: optional compile path

At build time, repeated units (table rows, list items, tree nodes) become "a static fragment plus positional
writes". It is a separate package, also reachable through `@yoyaflow/yoya-ui/compiler`; the runtime hooks are
pulled in from core by the generated artifacts.

```js
import { yoyaCompile } from '@yoyaflow/yoya-compiler'; // unplugin plugin: .vite() / .rollup() / .esbuild() …
import { compileFile, reportCoverage } from '@yoyaflow/yoya-compiler'; // programmatic API
```

```bash
npm i -D @yoyaflow/yoya-compiler @babel/parser
```

Details: [compiler.md](compiler.md).

## 5. CDN: self-contained files and import maps

What works directly on a CDN are the **self-contained single files** (core inlined, one `<script type="module">`
is enough). The incremental entries (`dist/yoya.ui.js`, `dist/actions/*.js`, …) are one-line re-exports that
take core as a peer dependency, so importing them straight from a URL fails on the bare specifier — use them
with an `importmap`.

| File                              | Contents                                | Size (min) |
| --------------------------------- | --------------------------------------- | ---------- |
| `dist/yoya.core.min.js`           | core main entry (SVG factories + icons) | ≈95 kB     |
| `dist/yoya.ui.full.min.js`        | core + all components + layout + theme  | ≈349 kB    |
| `dist/yoya.ui-router.full.min.js` | the above + router / SSR                | ≈377 kB    |
| `dist/yoya.router.full.min.js`    | core + router / SSR                     | ≈128 kB    |

```html
<!-- Self-contained: no build step, ready to run -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/yoya.ui.css"
/>
<script type="module">
  import {
    div,
    svg,
    ref,
    vText
  } from 'https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/yoya.core.min.js';
</script>
```

```html
<!-- Want package-style imports (including component subpaths)? Add an import map -->
<script type="importmap">
  {
    "imports": {
      "@yoyaflow/yoya-ui": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.3/dist/ui.js",
      "@yoyaflow/yoya-core": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-core@0.7.3/dist/index.js"
    }
  }
</script>
```

All three CDN prefixes use identical paths, only the domain differs: `cdn.jsdelivr.net` (global),
`cdn.jsdmirror.com` (China), `s4.zstatic.net` (China).

> **Do not mix** a self-contained file (`yoya.core.min.js`, `*.full.min.js`) with the `@yoyaflow/yoya-core`
> package, and do not load two self-contained files: two copies of core break `instanceof` / identity checks.

## 6. Styling and types

- **Styles**: `@yoyaflow/yoya-ui/ui.css` (bundler) or `dist/yoya.ui.css` (CDN) — the same file. Theme tokens
  and the class-name contract live in [theme.md](theme.md).
- **Types**: every entry has matching declarations (`types/*.d.ts`) shipped with the package; bundlers and
  editors pick them up automatically, CDN users do not need them.
- **What ships**: the npm packages contain `dist/`, `types/` and license files only — **no `docs/`, no
  sources**; TypeScript should read the declarations inside the package.

## 7. Common errors

| Symptom                                                                   | Cause                                                                                | Fix                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `does not provide an export named 'createI18n'` (from a root/core entry)  | Since 0.7.2 i18n / theme / a11y live in `/tools`                                     | Import from `@yoyaflow/yoya-core/tools` (or `@yoyaflow/yoya-ui/tools`) |
| `Failed to resolve module specifier "@yoyaflow/yoya-core"` in the console | Imported an **incremental entry** from a CDN URL                                     | Use a self-contained file, or add an `importmap`                       |
| `Failed to resolve module specifier "@yoyaflow/yoya-ui/ssr"`              | `/ssr` is not a public entry                                                         | Use `@yoyaflow/yoya-ui/router` or `@yoyaflow/yoya-core/ssr`            |
| `[NAMESPACE_CONFLICT]` warning / a symbol refuses to import               | A barrel re-exported two implementations of one name (0.7.2's `applyElementOptions`) | Upgrade to 0.7.4+; one name across entries must be one binding         |
| `instanceof` checks fail, signal writes never reach the DOM               | Two copies of core (`*.full` plus the core package)                                  | Pick one; non-`.full` entries share a single peer core                 |

## 8. Related documents

- Package layout and boundaries: [packages.md](packages.md) (Chinese)
- Publish-face plan and naming: [artifacts-plan.md](artifacts-plan.md) (Chinese)
- First page and common API: [README.md](../README.md)
- SSR: [ssr.md](ssr.md) · Theme: [theme.md](theme.md) · Compile path: [compiler.md](compiler.md)
- Component authors: [component-authoring.md](component-authoring.md) · Third-party interop: [interop.md](interop.md)
