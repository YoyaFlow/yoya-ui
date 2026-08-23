# Three-Argument Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give yoya-ui factories a consistent optional three-argument setup shape while preserving each component's existing semantic arguments.

**Architecture:** Add shared argument normalization and element-option application helpers in `src/components/shared.js`. Each public factory will explicitly map its meaningful first argument, optional `{ attrs, style }` options, and final setup callback; special signatures such as router factories and `vDetailItem(label, value)` remain unchanged. Tests cover omitted arguments, positional semantics, option application, callback order, and legacy one-argument forms.

**Tech Stack:** Vanilla JavaScript, Vitest, jsdom, Vite.

## Global Constraints

- Keep reusable component boundaries in the object component pattern.
- Preserve existing one-argument setup APIs and component-specific option objects.
- Do not modify `examples_bak`; it is only a discarded reference copy.
- The second setup argument uses `{ attrs: {}, style: {} }` for element-level customization.
- The final setup callback receives the initialized component instance after positional values and element options are applied.

### Task 1: Shared Setup Contract

**Files:**

- Modify: `src/components/shared.js`
- Test: `src/components/components.test.js`

- [x] Write failing tests for normalizing omitted first/second arguments, applying `attrs/style`, and invoking the final callback after options.
- [x] Run the focused tests and confirm they fail because no shared helper exists.
- [x] Add `normalizeSetupArguments`, `applyElementOptions`, and `applyComponentArguments` helpers without changing component-specific behavior.
- [x] Run the focused tests and confirm they pass.

### Task 2: Form Controls

**Files:**

- Modify: `src/form/controls.js`
- Test: `src/components/components.test.js`

- [x] Add failing tests for `vInput('placeholder', options, setup)`, `vInput(options, setup)`, and legacy object setup.
- [x] Implement the positional mapping for input-like controls, preserving `vTimer` and range-specific values.
- [x] Extend the same mapping to textarea, select, checkbox, switch, checkbox group, field, form, and timer range where their first argument has a clear semantic meaning.
- [x] Run form component tests.

### Task 3: Layout and Surface Components

**Files:**

- Modify: `src/layout/index.js`, `src/data-display/surface.js`, `src/data-display/detail.js`
- Test: `src/components/components.test.js`

- [x] Add failing tests for layout factories accepting options and a final callback without requiring a first content argument.
- [x] Implement layout argument normalization so existing layout option objects remain valid and callbacks run last.
- [x] Extend the same options/callback handling to cards, card sections, details, tables, code, pagination, and charts while retaining their current config semantics.
- [x] Run layout and data-display tests.

### Task 4: Navigation, Feedback, Async, and Action Factories

**Files:**

- Modify: `src/actions/*.js`, `src/navigation/menu.js`, `src/feedback/*.js`, `src/async/dynamic-loader.js`
- Test: relevant existing test files and `src/components/components.test.js`

- [x] Add representative failing tests for menu, message, dropdown, and dynamic-loader options/callbacks.
- [x] Migrate each factory with a component-specific positional mapping; preserve router-specific signatures and existing child setup APIs.
- [x] Run all affected tests and ensure omitted arguments do not shift semantic parameters incorrectly.

### Task 5: Examples and Documentation

**Files:**

- Modify: `README.md`
- Test: `src/components/components.test.js`, `src/router/router.test.js`

- [x] Add examples showing `vInput('请输入', options, setup)` and a layout using options plus callback.
- [x] Update documentation to state that omitted positions use `null` or can be omitted according to the component signature.
- [x] Run the examples tests, full test suite, lint, formatting, and build.
