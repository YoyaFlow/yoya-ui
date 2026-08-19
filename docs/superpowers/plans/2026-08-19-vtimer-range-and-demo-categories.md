# vTimerRange And Categorized Component Demos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a validated `vTimerRange` compound control and reorganize the component demo into broad category modules with a standalone range demo.

**Architecture:** `VTimerRange` is a compound `HtmlElementNode` that owns two `VTimer` controls and exposes unified start/end/range APIs. Demo modules export object components plus category descriptors; `components-demo.js` remains the page shell that renders categories and reuses `ComponentSource` for every source panel.

**Tech Stack:** Vanilla JavaScript ES modules, Yoya UI `ViewNode` factories, Vitest/jsdom, ESLint, Prettier, Vite.

## Global Constraints

- Every reusable and demo component uses `function ComponentName(options) { return { render() { return viewNode; } }; }`.
- Demo source panels use `ComponentSource`; source strings are generated from component functions and are not duplicated.
- Page composition passes component objects to `child(...)`.
- Preserve unrelated user changes in the dirty worktree.
- Implement behavior test-first and verify each new test fails for the expected missing feature before production edits.

---

### Task 1: Add the vTimerRange public component

**Files:**

- Modify: `src/components/components.test.js`
- Modify: `src/components/index.js`

**Interfaces:**

- Consumes: `VTimer`, `vTimer`, `HtmlElementNode`, `registerChildFactories`.
- Produces: `VTimerRange`, `vTimerRange(setup)`, and `HtmlElementNode#vTimerRange(setup)`.
- Public commands: `mode(value)`, `start(value)`, `end(value)`, `value(value)`, `disabled(value)`, `readonly(value)`, `required(value)`, and `on('change', callback)`.
- Unified value shape: `{ start: string, end: string }`; setter also accepts `[start, end]`.

- [ ] **Step 1: Write failing public API tests**

  Add focused tests that import `VTimerRange` and `vTimerRange`, construct a date range, assert two `.yoya-vtimer` controls, read/write `start()`, `end()`, and `value()`, accept object and array range setters, and verify `root.vTimerRange(...)`.

- [ ] **Step 2: Run the focused test file and verify RED**

  Run: `npm test -- src/components/components.test.js`

  Expected: FAIL because `VTimerRange` and `vTimerRange` are not exported.

- [ ] **Step 3: Implement the minimal compound control**

  Add `VTimerRange extends HtmlElementNode` near `VTimer`. Build two owned timers with start/end classes and names, keep modes and availability state synchronized, return `{ start, end }` from `value()`, and register the factory in `formComponentFactories`.

- [ ] **Step 4: Run the focused test and verify GREEN**

  Run: `npm test -- src/components/components.test.js`

  Expected: PASS.

- [ ] **Step 5: Write failing validation and change-event tests**

  Assert an end value earlier than start sets `data-invalid="true"`, `aria-invalid="true"`, and visible validation text. Assert either child change emits one range-level change whose event detail contains the unified range. Assert disabled, readonly, and required state reaches both child timers.

- [ ] **Step 6: Run the focused test and verify RED**

  Run: `npm test -- src/components/components.test.js`

  Expected: FAIL on missing validation or unified change behavior.

- [ ] **Step 7: Implement validation, events, and state propagation**

  Compare normalized non-empty values lexically for the supported HTML date/time formats, update visible/ARIA invalid state after setters and child changes, and dispatch one bubbling `change` event from the range without recursively duplicating child events.

- [ ] **Step 8: Run focused tests and lint**

  Run: `npm test -- src/components/components.test.js`

  Run: `npm run lint`

  Expected: PASS with no warnings.

### Task 2: Split component demos by broad category and add TimerRangeCard

**Files:**

- Create: `examples/components/demos/actions-feedback.js`
- Create: `examples/components/demos/navigation.js`
- Create: `examples/components/demos/data-display.js`
- Create: `examples/components/demos/forms-datetime.js`
- Modify: `examples/components/components-demo.js`
- Modify: `examples/components/components-demo.test.js`
- Modify: `src/core/node.js`
- Modify: `src/core/node.test.js`
- Modify: `src/core/index.js`

**Interfaces:**

- Each category module exports its semantic card functions and one category descriptor shaped as `{ id, title, description, demos }`.
- Each demo entry provides `{ component, imports, title }`; the shell calls `child(component(context))` and `child(ComponentSource(...))`.
- `forms-datetime` exports `ScheduleTimerCard` and `TimerRangeCard`.
- `child(componentObject)` resolves a component object's `render()` result lazily and caches the resulting `ViewNode`; `commit()` is the semantic DOM synchronization entry point used by demos and tests.

- [ ] **Step 1: Write failing category/demo tests**

  Assert four category headings render, the category modules export object components, `TimerRangeCard` renders a `.yoya-vtimer-range`, and every displayed source block contains the complete `export function ComponentName` object wrapper.

- [ ] **Step 2: Run the demo test and verify RED**

  Run: `npm test -- examples/components/components-demo.test.js`

  Expected: FAIL because category modules/headings and `TimerRangeCard` do not exist.

- [ ] **Step 3: Extract the existing cards without behavior changes**

  Move action/feedback, navigation, data-display, and forms/date-time cards into their owning modules. Keep each component's state and event handlers inside its function body and export the four category descriptors.

- [ ] **Step 4: Reduce components-demo.js to orchestration**

  Import the category descriptors, render category sections and demo grids, pass component objects through `child(...)`, and instantiate `ComponentSource` directly from the function reference and import list.

- [ ] **Step 5: Add TimerRangeCard**

  Render a `vTimerRange` with an initial start/end range, a visible output updated by the unified change event, and a source panel generated by `ComponentSource`.

- [ ] **Step 6: Run demo tests and formatting checks**

  Run: `npm test -- examples/components/components-demo.test.js examples/components/component-source.test.js`

  Run: `npx prettier --check examples/components/components-demo.js examples/components/components-demo.test.js examples/components/demos/*.js`

  Expected: PASS.

### Task 3: Document, verify, review, and commit

**Files:**

- Modify: `examples/components/README.md`
- Modify: `.scratch/yoya-basic-component-gap/issues/02-vtimer-range.md`

**Interfaces:**

- Documents the four demo categories and the `vTimerRange` API/validation behavior.

- [ ] **Step 1: Update documentation and ticket status**

  Add the category file map and a `vTimerRange` usage example. Check the ticket acceptance boxes only after the tests and demo exist.

- [ ] **Step 2: Run all verification**

  Run: `npm run format:check`

  Run: `npm run lint`

  Run: `npm test`

  Run: `npm run build`

  Expected: all commands pass with clean output.

- [ ] **Step 3: Request independent code review**

  Review the exact task diff against this plan. Fix every Critical or Important issue and rerun affected checks.

- [ ] **Step 4: Commit only task-related changes**

  Inspect `git diff --cached --stat` and `git diff --cached --check`, then commit with `feat: add vTimerRange and categorize component demos`.
