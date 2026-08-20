# VMessageManager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicitly owned, disposable local message manager that reuses `VMessageContainer`, remains compatible with `toast`, and has a categorized live demo.

**Architecture:** `VMessageManager` is a small focused `ViewNode` wrapper in `src/message-manager.js`. It owns one existing `VMessageContainer`, delegates message behavior to that container, participates in its parent view tree lifecycle, binds to a caller-selected target, and destroys the owned container as a single lifecycle boundary. The components example adds one standard object-component demo to the existing “操作与反馈” category and generates its source through `ComponentSource`.

**Tech Stack:** JavaScript ES modules, existing Yoya UI `ViewNode`/`VMessageContainer`, Vitest with jsdom, Vite examples, ESLint, Prettier.

## Global Constraints

- Every demo uses `function ComponentName() { return { render() { return viewNode; } }; }`.
- Demo source is generated from the component function through `ComponentSource`; do not duplicate source strings.
- Demo files remain grouped by broad component category.
- Preserve unrelated dirty worktree changes and selectively stage only this task's files/hunks.
- Follow RED → GREEN → REFACTOR and run the focused test after each behavior change.

---

### Task 1: Define the local message manager contract

**Files:**

- Create: `src/message-manager.test.js`
- Create: `src/message-manager.js`
- Modify: `src/index.js`

**Interfaces:**

- Consumes: `VMessageContainer`, `vMessageContainer`, and the container methods `bindTo`, `show`, `success`, `error`, `warning`, `info`, `close`, `clear`, `destroy`.
- Produces: `new VMessageManager(setup)`, `vMessageManager(setup)`, and manager methods `container()`, `bindTo(target)`, `show(content, options)`, message type shortcuts, `close(id)`, `clear()`, and `destroy()`.

- [ ] **Step 1: Write the failing public API and lifecycle tests**

```js
import { describe, expect, it, vi } from 'vitest';
import { VMessageManager, toast, vMessageContainer, vMessageManager } from './index.js';

describe('VMessageManager', () => {
  it('binds and manages an independent local container', () => {
    const host = document.createElement('section');
    document.body.append(host);
    const manager = vMessageManager({ placement: 'bottom-left' }).bindTo(host);
    const id = manager.show('局部消息', { duration: 0 });

    expect(manager).toBeInstanceOf(VMessageManager);
    expect(host.querySelector('[data-placement="bottom-left"]')).not.toBeNull();
    expect(host.textContent).toContain('局部消息');
    manager.close(id);
    expect(host.textContent).not.toContain('局部消息');
  });

  it('delegates replacement, type shortcuts, clear, and toast compatibility', () => {
    const manager = vMessageManager().bindTo(document.body);
    manager.show('旧消息', { id: 'save', duration: 0 });
    manager.success('新消息', { id: 'save', duration: 0 });
    manager.error('错误', { duration: 0 });
    manager.warning('警告', { duration: 0 });
    manager.info('提示', { duration: 0 });

    expect(document.querySelectorAll('.yoya-vmessage')).toHaveLength(4);
    expect(document.querySelector('[data-type="success"]').textContent).toContain('新消息');
    manager.clear();
    toast.use(manager.container()).info('兼容消息', { duration: 0 });
    expect(document.body.textContent).toContain('兼容消息');
  });

  it('owns a configured container and destroys messages, timers, events, and DOM', () => {
    vi.useFakeTimers();
    const container = vMessageContainer();
    const close = vi.spyOn(container, 'close');
    const manager = new VMessageManager({ container }).bindTo(document.body);
    manager.show('稍后关闭', { id: 'later', duration: 1000 });

    manager.destroy();
    vi.advanceTimersByTime(1000);

    expect(close).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.yoya-vmessage-container')).toBeNull();
    expect(manager.show('已销毁', { duration: 0 })).toBe(null);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/message-manager.test.js`

Expected: FAIL because `VMessageManager` and `vMessageManager` are not exported.

- [ ] **Step 3: Implement the minimal delegating manager**

```js
import { VMessageContainer, vMessageContainer } from './components/index.js';
import { ViewNode } from './core/index.js';

export class VMessageManager extends ViewNode {
  constructor(setup = null) {
    super();
    const options = setup instanceof VMessageContainer ? { container: setup } : setup || {};
    const { container, ...containerSetup } = options;
    this._container = container || vMessageContainer(containerSetup);
    this._destroyed = false;
  }

  container() {
    return this._container;
  }
  bindTo(target) {
    if (!this._destroyed) this._container.bindTo(target);
    return this;
  }
  renderDom() {
    return this._destroyed ? null : this._container.renderDom();
  }
  toHTML() {
    return this._destroyed ? '' : this._container.toHTML();
  }
  show(content, options = {}) {
    return this._destroyed ? null : this._container.show(content, options);
  }
  success(content, options = {}) {
    return this._showType('success', content, options);
  }
  error(content, options = {}) {
    return this._showType('error', content, options);
  }
  warning(content, options = {}) {
    return this._showType('warning', content, options);
  }
  info(content, options = {}) {
    return this._showType('info', content, options);
  }
  close(id) {
    if (!this._destroyed) this._container.close(id);
    return this;
  }
  clear() {
    if (!this._destroyed) this._container.clear();
    return this;
  }
  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      this._container.destroy();
      super.destroy();
    }
    return this;
  }
  _showType(type, content, options) {
    return this._destroyed ? null : this._container[type](content, options);
  }
}

export function vMessageManager(setup = null) {
  return setup instanceof VMessageManager ? setup : new VMessageManager(setup);
}
```

Export the module from `src/index.js` with `export * from './message-manager.js';`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run src/message-manager.test.js`

Expected: PASS with no warnings.

### Task 2: Add the categorized live demo

**Files:**

- Modify: `examples/components/demos/actions-feedback.js`
- Modify: `examples/components/components-demo.test.js`
- Modify: `examples/components/README.md`

**Interfaces:**

- Consumes: `vCard`, `vMessageManager`, and the existing category/demo renderer.
- Produces: `LocalMessageManagerCard`, the fourth demo in the “操作与反馈” category.

- [ ] **Step 1: Write failing demo assertions**

Update the demo test to import and include `LocalMessageManagerCard`, expect 20 demos, expect “操作与反馈4 个演示”, and verify that the local card renders its own message container, replaces duplicate IDs, clears messages, participates in page destruction, and displays generated source containing `vMessageManager`.

- [ ] **Step 2: Run the demo test and verify RED**

Run: `npx vitest run examples/components/components-demo.test.js`

Expected: FAIL because `LocalMessageManagerCard` and its fourth category entry do not exist.

- [ ] **Step 3: Implement the standard object-component demo**

Add `LocalMessageManagerCard` to `actions-feedback.js`. Its `render()` creates a card, creates one local manager, places the manager itself inside the card body after statically positioning its container, and adds buttons that call `manager.success(..., { id: 'local-status', duration: 0 })`, `manager.warning(...)` with the same ID, and `manager.clear()`. Register it with imports `['vCard', 'vMessageManager']`; do not add any hand-written source string.

- [ ] **Step 4: Update documentation and shifted source indices**

Document `VMessageManager` / `vMessageManager` in the Components README. Update all source block indices after the newly inserted index 3: menu 4, imperative router 8, declarative router 9, dynamic loader 10, body 11, CodeBlock 14, service defaults 16, field mode 17, datetime 18, timer range 19.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npx vitest run src/message-manager.test.js examples/components/components-demo.test.js`

Expected: both files PASS.

### Task 3: Verify, review, and commit

**Files:**

- Verify only the files listed in Tasks 1 and 2 plus this plan.

**Interfaces:**

- Consumes: completed manager and demo.
- Produces: one reviewed commit on the current branch.

- [ ] **Step 1: Run the full verification suite**

Run: `npm test`, `npm run lint`, `npx prettier --check src/message-manager.js src/message-manager.test.js src/index.js examples/components/demos/actions-feedback.js examples/components/components-demo.test.js examples/components/README.md docs/superpowers/plans/2026-08-20-message-manager.md`, and `npm run build`.

Expected: all commands exit 0 with no task-related warnings.

- [ ] **Step 2: Request independent code review**

Ask a reviewer to inspect the task diff against `.scratch/yoya-basic-component-gap/issues/12-message-manager.md`, with special attention to lifecycle ownership, timer/event cleanup, demo conventions, and unrelated dirty changes. Apply only verified findings and rerun affected checks.

- [ ] **Step 3: Selectively stage and inspect**

Stage only `src/message-manager.js`, `src/message-manager.test.js`, the single export hunk in `src/index.js`, the three components-demo files, its README, and this plan. Run `git diff --cached --check` and `git diff --cached --stat`.

- [ ] **Step 4: Commit**

Run: `git commit -m "feat: add local message manager"`

Expected: one commit containing only this ticket's implementation, tests, demo, docs, and plan.
