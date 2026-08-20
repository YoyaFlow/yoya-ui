# responsiveGrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a responsive grid Layout DSL factory that supports minimum column width, gaps, optional viewport breakpoints, parent shortcuts, and deterministic server-rendered styles.

**Architecture:** `responsiveGrid()` reuses the existing layout node creation path and applies a CSS `auto-fit/minmax` template when no breakpoint is active. Breakpoints are normalized to sorted `{ minWidth, columns }` entries; in a browser an opt-in `refresh()` chooses the matching column count from `window.innerWidth`, while SSR keeps the auto-fit template and serializes the same base styles. The node exposes `refresh()` and cleans its resize listener through `destroy()`.

**Tech Stack:** Vanilla JavaScript, ViewNode/Layout DSL, Vitest + jsdom, Vite.

## Global Constraints

- Preserve existing Layout DSL behavior and parent shortcut registration.
- Keep `toHTML()` deterministic and free of browser-only assumptions.
- Use TDD and preserve unrelated dirty-worktree changes.
- Add a broad-category layout demo; use the existing demo conventions when adding source panels.

### Task 1: Factory, options, breakpoints, and SSR

**Files:** `src/layout/index.js`, `src/layout/layout.test.js`

- [ ] Add failing tests for `minColumnWidth`, `gap`, child composition, `auto-fit/minmax` SSR styles, numeric/string breakpoint normalization, and `responsiveGrid` parent shortcut.
- [ ] Implement `responsiveGrid(setup)` through the existing layout setup path and register it with `HtmlElementNode`.
- [ ] Verify focused layout tests pass.

### Task 2: Browser resize behavior and cleanup

**Files:** `src/layout/index.js`, `src/layout/layout.test.js`

- [ ] Add a failing jsdom test with a controlled `window.innerWidth` and resize listener; assert breakpoint selection and listener removal on `destroy()`.
- [ ] Implement `refresh()` and one resize listener per node; preserve auto-fit when no breakpoint matches.
- [ ] Verify all layout tests pass.

### Task 3: Layout demonstration and documentation

**Files:** `examples/layout/layout-demo.js`, `examples/layout/layout-demo.test.js` (if present), `examples/layout/README.md`

- [ ] Add a responsive-grid section with cards, minimum width, gap, and a resize status indicator.
- [ ] Add tests for rendered grid, source behavior where applicable, and documentation.
- [ ] Run full tests, lint, format, build, independent review, and commit selectively.
