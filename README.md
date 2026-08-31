# yoya-ui

> **English** | [简体中文](./README.zh-CN.md)

> Browser-native UI library with declarative HTML authoring — no virtual DOM, no JSX/SFC, no build chain.

yoya-ui builds views directly on the real DOM: declarative HTML authoring, a component library, router, i18n, theming and state out of the box, with server-side rendering (SSR) and pure client rendering switchable from the same code.

## Features

- **Low-barrier declarative authoring**: describe UI with native elements; only HTML and plain JS are required, with no framework-specific concepts
- **Backend/full-stack friendly**: built for backend and full-stack developers to quickly build admin and management interfaces without frontend framework experience
- **Microservice-cohesive delivery**: ship UI together with the backend service, suitable for atomic per-service deployment
- **AI-friendly**: declarative structure plus zero build chain means AI-generated component code runs directly
- **Ready-to-use component library**: forms, navigation, feedback, data display, layout, charts and more for high-frequency scenarios
- **Built-in router / i18n / theme / state**: everything a SPA needs, no extra selection required
- **Server-side rendering**: one codebase, two modes — full-site SSR and island-style client enhancement both work
- **Small core, zero dependencies, easy to extend**: follows standard component patterns; third-party components compose seamlessly with built-ins; import per module fits any project
- **Maintenance-friendly**: the core stays stable, so long-lived projects don't fear version churn or rewrites

## Installation

```bash
npm install @yoyaflow/yoya-ui
```

## Quick Start

```js
import { div, vButton, toast } from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

div((page) => {
  page.vButton('Start task', (button) => {
    button.variant('primary');
    button.on('click', () => toast.success('Task started'));
  });
}).bindTo('#app');
```

The page only needs a `<div id="app"></div>` loaded with a module script.

## Server-Side Rendering (SSR)

The same page factory switches between server rendering and client rendering:

```js
// Server
import { renderToString } from '@yoyaflow/yoya-ui/ssr';
const { html, state } = renderToString(createPage, { state: { path: '/home' } });

// Client
import { hydrate, mount, parseState } from '@yoyaflow/yoya-ui/ssr';
const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');
if (app.firstElementChild) {
  hydrate(createPage, app, data); // Server HTML exists: adopt DOM, bind events
} else {
  mount(createPage, app, data); // Empty shell: full client render
}
```

Key points:

- `vClientOnly(loader)`: non-SSR modules (e.g. ECharts) emit a placeholder on the server and load on the client after hydration
- `Router.renderPath(path)`: renders the matching route for a request path (params / guards / 404)
- Per-request i18n instance, render-context id allocator, auto-destroy after render — the server stays stateless
- `maxNodes` falls back to client rendering automatically when exceeded

Full integration guide: [docs/ssr.md](docs/ssr.md) (Chinese); runnable example:

```bash
npm run build
node src/examples/ssr/server-http.mjs
```

## Import per Module

```js
import { div, svg, createI18n } from '@yoyaflow/yoya-ui/core'; // core HTML/SVG/state
import { vButton, vCard, vForm, vTable } from '@yoyaflow/yoya-ui/ui'; // official component library
import { vEchart } from '@yoyaflow/yoya-ui/echart'; // ECharts component (bring your own echarts)
import { renderToString, hydrate } from '@yoyaflow/yoya-ui/ssr'; // server-side rendering
import '@yoyaflow/yoya-ui/ui.css'; // default styles and theme variables
```

## TypeScript Support

The source stays plain JavaScript (zero build, runs directly); full TypeScript experience comes from the type declarations shipped with the package. The `types/` directory covers all four entry points (root / `core` / `echart` / `ssr`) and includes node classes, factory signatures, component state APIs and parent shortcut methods (e.g. `page.vButton(...)`).

TypeScript projects get hints and type checking with no extra configuration:

```ts
import { div, vButton, vCard, vTable, toast } from '@yoyaflow/yoya-ui';
import { createI18n } from '@yoyaflow/yoya-ui/core';
import { renderToString } from '@yoyaflow/yoya-ui/ssr';
import '@yoyaflow/yoya-ui/ui.css';

div((page) => {
  page.className('app');
  page.vButton('Start task', (button) => {
    button.variant('primary');
    button.on('click', () => toast.success('Task started'));
  });
  page.vCard((card) => {
    card.vCardBody((body) => {
      body.vTable((table) => {
        table.columns([{ key: 'name', title: 'Name', dataIndex: 'name' }]);
        table.rows([{ name: 'api-gateway' }]);
      });
    });
  });
});
```

Type declaration quality is maintained in-repo:

```bash
npm run typecheck    # validates declaration files and consumer type tests
npm run test:types   # same as typecheck
```

## Core Capabilities

| Category   | Content                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| HTML       | Full WHATWG element factories with `HtmlElementNode` nested shortcuts                                                        |
| SVG        | `svg()` namespace entry and built-in icons (`SearchOutlined`, etc.)                                                          |
| Layout     | `flex` / `grid` / `stack` / `container` / `vRow` / `vCol` / `vContainer` / `mobileLayout` / `themeShell`                     |
| Actions    | `vButton` / `vButtons` / `vFloatButton` / `vDropdownMenu` / `vContextMenu`                                                   |
| Navigation | `vMenu` / `vBreadcrumb` / `vSteps` / `vTabs` / `vAnchor` / `vNavbar` / Router / `vLink`                                      |
| Feedback   | `vDialog` / `vTooltip` / `vMessage` / `vMessageManager` / `toast`                                                            |
| Forms      | `vForm` / `vInput` / `vSelect` / `vCheckbox` / `vRadio` / `vSwitch` / `vRate` / `vTimer` / `vUpload`                         |
| Data       | `vCard` / `vTable` / `vTree` / `vPagination` / `vProgress` / `vScroll` / `vCarousel` / `vTimeline` / `vDetail` / board series |
| Charts     | `vEchart` (ECharts-based, import on demand)                                                                                  |
| Async      | `vDynamicLoader`                                                                                                             |
| State      | `vStateNode` / `@preact/signals-core` extension                                                                              |
| i18n/Theme | `createI18n` / `withI18nStringShortcut` / theme tokens and light/dark modes                                                  |

Full component demos live in the example site (`npm run examples:html`, then open `http://localhost:5173/#/components`).

## Build Output

```bash
npm run build
```

`dist/` contains:

- `yoya.core.js` / `yoya.ui.js` — core and component library ESM entries
- `yoya.echart.js` — ECharts component entry (does not bundle echarts itself)
- `yoya.ssr.js` — server rendering entry (`renderToString` / `hydrate` / `mount`)
- `echarts.min.js` — ECharts core (load globally via `<script>`)
- `yoya.ui.css` — default styles and theme variables
- `yoya-ui.umd.js` — UMD build (`window.YoyaUI`)

## Development

```bash
npm install
npm test              # vitest full suite
npm run lint          # eslint
npm run build         # full build
npm run examples:html # example site (localhost:5173)
npm run format        # prettier
```

## Project Structure

```text
src/
  core/        ViewNode/ElementNode core, state, i18n, theme, id allocator, SSR helpers
  html/ svg/   HTML/SVG element factories
  layout/      layout factories
  actions/ navigation/ feedback/ form/ data-display/ async/ chart/ effects/
               official component categories
  components/  component aggregation and shared logic
  examples/    example site (SSR demos and copy-paste guides)
  index.js     dev aggregate entry
  yoya.core.js / yoya.ui.js / yoya.echart.js / yoya.ssr.js / yoya.ui.css
scripts/
  build-entries.mjs        ESM entry build
  copy-example-modules.mjs example asset copy
vite.config.js / vite.umd.config.js / vite.examples.config.js
```

## Documentation

- [Server-Side Rendering Guide](docs/ssr.md) (Chinese)
- [Component Development Spec](docs/component-development-spec.md) (Chinese)
- [Component Library Authoring Guide](docs/component-library-authoring.md) (Chinese)
- [Theme Styling Spec](docs/theme-styling.md) (Chinese)
- [Component Catalog](docs/components.md) (Chinese)
- [Core Implementation Summary](docs/yoya-basic-core-summary.md) (Chinese)

## License

MIT
