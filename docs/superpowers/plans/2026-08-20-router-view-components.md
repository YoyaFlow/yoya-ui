# Router Link and View Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `vLink` and `vRouterView` components that drive and display the existing hash Router through the ViewNode DSL.

**Architecture:** Keep route matching, guards, query parsing, hash navigation, and history handling inside the existing `Router`. Add a single explicit outlet seam and route-change subscription API; `vRouterView` attaches an `ElementNode` to that seam, while `vLink` builds a hash href, delegates navigation to `Router.navigate()`, and derives active state from Router notifications.

**Tech Stack:** Vanilla JavaScript, ViewNode/ElementNode DSL, hash Router, Vitest + jsdom, shared `ComponentSource` demos.

## Global Constraints

- Do not duplicate Router matching or query parsing logic.
- Preserve the existing `router()` outlet behavior when no `vRouterView` is attached.
- Demo functions use `function ComponentName() { return { render() { return viewNode; } }; }`.
- Demo source is generated from the component function by shared `ComponentSource`.
- Preserve unrelated dirty worktree changes; selectively stage only this task.

---

### Task 1: Router outlet and change seam

**Files:**

- Modify: `src/router.js`
- Test: `src/router.test.js`

**Interfaces:**

- Consumes: existing `Router.navigate(path, options)`, `Router.refresh()`, and route resolution.
- Produces: `Router.outlet(node)`, `Router.subscribe(listener)`, and backward-compatible rendering.

- [ ] **Step 1: Write failing tests** for an external outlet, current route state notifications, 404 rendering, and hashchange refresh.
- [ ] **Step 2: Run `npx vitest run src/router.test.js`** and confirm failure because the outlet/subscription APIs do not exist.
- [ ] **Step 3: Implement the minimal seam** by storing an optional outlet, rendering resolved views into it, and notifying subscribers after state updates.
- [ ] **Step 4: Re-run `npx vitest run src/router.test.js`** and confirm the focused tests pass.

### Task 2: `vLink` and `vRouterView` public components

**Files:**

- Modify: `src/router.js`
- Test: `src/router.test.js`

**Interfaces:**

- Produces: `vLink(router, setup)` and `vRouterView(router, setup)` public factories and parent shortcuts.
- `vLink` setup supports `to`, `params`, `query`, `label`, `replace`, and `exact`.

- [ ] **Step 1: Write failing tests** that expect stable hooks, encoded params/query hrefs, delegated click navigation, active state updates, modified-click preservation, parent shortcuts, and cleanup.
- [ ] **Step 2: Run the focused router test** and confirm failure because both factories are missing.
- [ ] **Step 3: Implement minimal components** using `ElementNode`, shared Router normalization helpers, subscription cleanup, and `registerChildFactories`.
- [ ] **Step 4: Re-run the focused router test** and confirm all router tests pass.

### Task 3: Categorized generated-source demo

**Files:**

- Create: `examples/components/demos/routing.js`
- Modify: `examples/components/components-demo.js`
- Modify: `examples/components/components-demo.test.js`
- Modify: `examples/components/index.html`
- Modify: `examples/components/README.md`

**Interfaces:**

- Produces: a broad `routing` demo category containing `RouterNavigationCard`.

- [ ] **Step 1: Write failing demo tests** for category counts, rendered link/view hooks, params/query/404 interaction, active state, and generated source.
- [ ] **Step 2: Run `npx vitest run examples/components/components-demo.test.js`** and confirm failure because the category is absent.
- [ ] **Step 3: Add `RouterNavigationCard`** in the required object-component form and register its category with `ComponentSource` imports.
- [ ] **Step 4: Run focused router and component-demo tests**, format only task files, then run the full test suite, ESLint, build, independent review, and a selective commit.
