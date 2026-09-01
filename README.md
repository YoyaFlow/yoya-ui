# yoya-ui

> **English** | [简体中文](./README.zh-CN.md)

> Browser-native UI library with declarative HTML authoring — no virtual DOM, no JSX/SFC, no build step required.

yoya-ui is a web foundation library — a new form of business UI construction. Views are built directly on the real DOM: declarative HTML authoring, router, i18n, theming, state and server-side rendering (SSR) out of the box, with pure client rendering switchable from the same code. Bundled UI components exist for out-of-the-box convenience; they are not the boundary of the library — native elements and third-party components compose the same way.

## Hello World — the same demo, a different stack

No framework runtime, no virtual DOM, no JSX build step: views are real DOM nodes described in plain JS, and i18n is a string shortcut.

```js
// HelloWorldExample — declarative UI + state + events
import { div, vButton, vText } from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

function HelloWorldExample() {
  const message = vText('Hello, yoya-ui!');
  return div((root) => {
    root.vButton('Say hello', (button) => {
      button.variant('primary');
      button.on('click', () => message.textContent('你好，yoya-ui！'));
    });
    root.p(message);
  });
}

HelloWorldExample().bindTo('#app');
```

```js
// HelloWorldExampleI18n — same code, language switches reactively
import { createI18n, installI18nStringShortcut, div, vButton } from '@yoyaflow/yoya-ui';

const i18n = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': { hello: '你好，yoya-ui！', toggle: '切换语言' },
    en: { hello: 'Hello, yoya-ui!', toggle: 'Switch language' }
  }
});
installI18nStringShortcut(i18n);

function HelloWorldExampleI18n() {
  return div((root) => {
    root.p('你好，yoya-ui！'.s('hello'));
    root.vButton('切换语言'.s('toggle'), (button) => {
      button.on('click', () =>
        i18n.setLanguage(i18n.getLanguage() === 'zh-CN' ? 'en' : 'zh-CN')
      );
    });
  });
}

HelloWorldExampleI18n().bindTo('#app');
```

## Features

- **Low-barrier declarative authoring**: build UI with declarative structured JS elements — view and logic live in the same language, eliminating the friction between HTML markup and complex manipulation logic; only HTML and plain JS are required, with no framework-specific concepts
- **General-purpose UI foundation**: a general-purpose library for every web developer — the same declarative codebase builds admin consoles, dashboards, tools and content pages, and backend or full-stack developers can get started more easily than with React/Vue
- **Flexible delivery**: embed in server-rendered templates, ship together with backend services for atomic per-service deployment, or run as a standalone SPA — same code, no changes
- **Build-tool optional**: use the shipped files directly in a plain page (no Vite/bundler needed), or install via npm and bundle with Vite/webpack — both are first-class
- **AI-friendly**: declarative structure means AI-generated component code runs directly, with or without a build step
- **Ready-to-use component library**: forms, navigation, feedback, data display, layout, charts and more for high-frequency scenarios — convenience on top of the foundation, not its boundary
- **Built-in router / i18n / theme / state**: everything a SPA needs, no extra selection required
- **Server-side rendering**: one codebase, two modes — full-site SSR and island-style client enhancement both work
- **Small core, zero dependencies, easy to extend**: follows standard component patterns; third-party components compose seamlessly with built-ins; import per module fits any project
- **Maintenance-friendly**: the core stays stable, so long-lived projects don't fear version churn or rewrites
- **Frontend-fatigue friendly**: for developers tired of endless new concepts, new frameworks and breaking version upgrades — plain HTML and JS syntax, and a stable core that don't churn

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

## Codex Skill

Use yoya-ui inside Codex: install the [yoya-ui skill](skills/yoya-ui/README.md) (Chinese) to give Codex guidance on the component DSL, page composition, forms, theming, SSR/hydrate and i18n.

## License

MIT
