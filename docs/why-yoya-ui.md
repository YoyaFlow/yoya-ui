# Why yoya-ui: positioning, reasons and trade-offs

[README](../README.md) gives the short version. This document keeps the long form: the nine reasons
this library exists, the positioning behind them, and the trade-offs we accept.

## 1. The nine reasons

| Reason                                  | What it means                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Built for long-term maintenance**     | A stable API on native Web standards: you maintain one codebase, not projects built against several framework major versions, and you never rewrite for a framework's breaking upgrade.                                                                                                     |
| **Free choice of integration**          | Script tag, npm ESM, Vite/webpack, SSR or a scaffolded template all work; capabilities are imported per module, on demand.                                                                                                                                                                  |
| **Declarative, intuitive and flexible** | Plain-JS declarative DSL, setup callbacks and parent shortcuts — no JSX/SFC template layer; the view structure is the code structure.                                                                                                                                                       |
| **One stack across scenarios**          | The same page factory and state logic covers a full SPA, server-side templates and SSR/hydration — one Web-UI development logic across the whole stack.                                                                                                                                     |
| **Plain JS, assets that do not expire** | Highly adaptable plain JS with no virtual DOM or framework runtime: output is real HTML/DOM/JS, so standards-based Web software keeps running as browsers evolve.                                                                                                                           |
| **Lifecycle control**                   | ViewNode is the handle for real DOM, with lifecycle and state management on par with virtual-DOM frameworks; subtree error boundaries (`whenFailed()`) degrade on their own, and very large lists stay smooth thanks to vScroll auto-virtualization, which renders only the visible window. |
| **Inherit the native Web ecosystem**    | Built on browser-standard real-DOM operations: every native-capable Web component and tool library comes in directly through the extension points — most JS libraries already qualify, so ecosystem gaps are not a concern.                                                                 |
| **Drop into existing projects**         | `bindTo()` mounts any local interaction into an existing HTML, Vue, React, htmx, PHP or JSP page for progressive enhancement — no migration required.                                                                                                                                       |
| **AI-friendly by design**               | No framework context or build magic: AI-generated declarative components run directly, so prototyping and batch page generation rarely need rework.                                                                                                                                         |

## 2. Positioning: a declarative extension of native Web, not a walled-garden framework

yoya-ui is a declarative extension of browser-native Web development, and it treats the real DOM as
the **interoperability boundary** with the wider Web ecosystem: views are plain JavaScript functions
that compose into a ViewNode tree, and each ViewNode is the **handle** for the underlying DOM —
element creation, mounting (`bindTo`), update commits (`commit`) and disposal (`destroy`) all flow
through its lifecycle. On top of that, yoya-ui ships a rich set of common components out of the box,
and any library that can mount into a DOM node plugs in on demand — built-ins are a starting point,
not the limit of the platform.

```text
┌──────────────────────────────────────────────────────────────┐
│ Your application: page factories, business components        │
├──────────────────────────────────────────────────────────────┤
│ yoya-ui: declarative composition, router, i18n, theme,       │
│           state, lifecycle (mount / update / destroy / SSR)  │
├──────────────────────────────────────────────────────────────┤
│ Real DOM elements (div(), vCard(), vForm(), ...)             │
│    └─ mount points for independent JS libraries:             │
│       ECharts · Quill · Handsontable · MapLibre · your lib   │
└──────────────────────────────────────────────────────────────┘
```

It is neither an ecosystem-monopoly framework nor a zero-component base: specialist domains such as
rich-text editing, spreadsheets, maps and complex visualization belong to the Web's own professional
ecosystems (Quill, Handsontable, MapLibre, ECharts…), which embed through their native APIs — no
Wrapper, no Adapter — while high-frequency capabilities like forms, tables, navigation, feedback and
dashboard boards are available out of the box. npm, Vite/webpack, TypeScript, CI/CD and SSR remain
first-class: yoya-ui removes the framework runtime, not modern frontend engineering infrastructure.

In one sentence: **yoya-ui extends native Web development declaratively — common components come out
of the box, third-party extensions plug in on demand, and the real DOM composes all of it freely in
one view tree.**

## 3. Why native Web: frameworks expire, standards don't

**The browser is already a good enough runtime.** HTML and CSS are declarative by nature, and the
DOM API is clear and direct; yoya-ui does not stack another virtual DOM, template compiler or
framework scheduler on that native chain.

**Standards are backward-compatible; framework versions fragment.** `document.createElement`
written years ago still runs today, and every browser step forward (new CSS, new Web APIs) benefits
a yoya-ui project directly. That is the root of reasons 1 and 5 above: the stable API sits on Web
standards and is locked down by spec documents and the test suite.

## 4. Evaluating this project: read the repository, not the star count

Star counts measure attention, not correctness. Until this project earns that social signal, the
useful signals are the ones you can verify in the repository:

| Signal               | How to check it                                                        |
| -------------------- | ---------------------------------------------------------------------- |
| Runtime dependencies | `package.json` — no `dependencies` block                               |
| Test suite           | `npm test`                                                             |
| Type declarations    | `npm run typecheck` (declarations plus consumer type tests)            |
| SSR determinism      | `src/*.ssr.test.js`, [ssr.md](ssr.md)                                  |
| Distribution formats | `npm run build` → `dist/`                                              |
| Dist verification    | `npm run build && npm run verify:dist`                                 |
| Contract documents   | [component-authoring.md](component-authoring.md), [theme.md](theme.md) |
| Public roadmap       | [ROADMAP.zh-CN.md](../ROADMAP.zh-CN.md) (Chinese)                      |

The CI badge in the README is live from the GitHub Actions workflow. Coverage is measured by the
coverage job (Vitest v8, LCOV) and uploaded to Codecov; the badge is enabled once that upload is
authorized. The release badge reads the published npm version, so it never goes stale.

```bash
npm install
npm test              # full suite: DOM, state, i18n, router, access, SSR/hydration
npm run typecheck     # type declarations + consumer type tests
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build && npm run verify:dist  # dist: category isolation, SSR smoke, budgets, README size tables
```

## 5. Honest about the cold start — and why that is early-adopter value

yoya-ui has few stars today because it is **early**, not because it is small or unmaintained. We
prefer that trade-off to manufactured hype: the project is spec-driven, test-locked and actively
shipped, and it has no legacy ecosystem to drag forward.

What early adopters get now:

- **A stable conceptual core.** The component shapes, lifecycle and composition model are frozen in
  the component authoring guide rather than drifting release to release.
- **Direct influence.** Early adopters shape priorities while the surface is still small enough to
  steer.

If you are evaluating this project, we ask one thing: evaluate what is in the repository — the tests,
the spec docs, the API alignment with Web standards — not the number next to the star icon.

## Related documents

- [agents.md](agents.md): how AI coding agents should read and generate code for this project.
- [highlights.md](highlights.md): what each capability does, with runnable snippets.
- [interop.md](interop.md): the third-party extension pattern behind the "no wrapper" claim.
