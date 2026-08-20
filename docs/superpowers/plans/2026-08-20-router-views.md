# vRouterViews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an IDE-style `vRouterViews` outlet with a title bar above the matched route content.

**Architecture:** Reuse the existing `Router` outlet and subscription seams. `vRouterViews` owns a titled wrapper and an inner content outlet; route metadata supplies the title, while an optional title resolver can customize it. No route matching or rendering logic is duplicated.

**Tech Stack:** JavaScript ES modules, ViewNode/ElementNode DSL, hash Router, Vitest/jsdom, ComponentSource demos.

## Global Constraints

- Preserve `vRouterView` behavior and existing router APIs.
- Keep demo components in the standard object-component form.
- Generate displayed demo source from the component function.
- Preserve unrelated dirty worktree changes and selectively stage task files.

---

### Task 1: Titled router outlet

**Files:** `src/router.js`, `src/router.test.js`, `src/index.js`

- [x] Add RED tests for route titles, content switching, resolver support, parent shortcut, and subscription cleanup.
- [x] Implement `vRouterViews(router, setup)` with `.yoya-vrouter-views`, `.yoya-vrouter-views-title`, and `.yoya-vrouter-views-content` hooks.
- [x] Add route `title` metadata support without changing existing route matching.
- [x] Run focused router tests.

### Task 2: Categorized editor-style demo

**Files:** `examples/components/demos/routing.js`, `examples/components/components-demo.test.js`, `examples/components/README.md`

- [x] Add `RouterViewsEditorCard` with titled `overview.js` and `settings.js` views.
- [x] Register the demo in the routing category and generate source via `ComponentSource`.
- [x] Update category counts and shifted source indices.
- [x] Run focused demo tests.

### Task 3: Verification and commit

- [ ] Run full tests, lint, Prettier, and build.
- [ ] Request read-only code review.
- [ ] Selectively stage and commit the task files.
