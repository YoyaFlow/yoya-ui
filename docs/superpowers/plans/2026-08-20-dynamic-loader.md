# Dynamic Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lifecycle-safe `vDynamicLoader` component with state views, retry, shared module caching, preload, and cache clearing.

**Architecture:** A focused `src/dynamic-loader.js` module owns a shared promise cache and an `ElementNode` host. The host exposes `load()`, `retry()`, `preload()`, `clearCache()`, `state()`, `value()`, and `error()`; asynchronous completions are guarded by a request generation so destroyed or superseded instances never update DOM.

**Tech Stack:** Vanilla JavaScript, ViewNode/ElementNode DSL, native Promise, Vitest + jsdom, shared ComponentSource demos.

## Global Constraints

- States are `pending`, `loading`, `loaded`, and `error`, each with configurable content.
- Cache rejected loads only until rejection handling, so retry can invoke the loader again.
- Destroyed nodes and superseded requests must ignore late results.
- Demo components use the standard object-component `render()` pattern and generated source.
- Preserve unrelated dirty worktree changes and selectively commit only task files.

### Task 1: State machine and lifecycle safety

**Files:** Create `src/dynamic-loader.js`, `src/dynamic-loader.test.js`; modify `src/index.js`.

- [ ] Write RED tests for pending/loading/loaded/error views, state callback, retry, and late completion after destroy.
- [ ] Run the focused test and confirm missing public exports.
- [ ] Implement the minimal host state machine and parent shortcut.
- [ ] Re-run focused tests to GREEN.

### Task 2: Shared cache controls

**Files:** Modify `src/dynamic-loader.js`, `src/dynamic-loader.test.js`.

- [ ] Write RED tests for shared cache reuse, preload, per-key clearing, and full clearing.
- [ ] Implement `preloadDynamicModule()` and `clearDynamicModuleCache()` plus instance helpers.
- [ ] Re-run focused tests to GREEN.

### Task 3: Categorized demo and completion

**Files:** Create `examples/components/demos/async-dynamic.js`; modify component demo registry/tests/README/index styles as needed.

- [ ] Write RED demo tests for the category, states, retry interaction, and generated function source.
- [ ] Implement the standard object-component demo and register the category.
- [ ] Run focused/full tests, task Prettier, ESLint, build, independent review, and selective commit.
