# ViewNode Event Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ViewNode events a single-slot registry per (node, event): repeated `.on()` overwrites the previous handler, and real DOM listeners are thin adapters that call the current ViewNode handler, so setup re-runs can never double-bind.

**Architecture:** `ViewNode._events` changes from `Map<event, handler[]>` to `Map<event, { handler, options }>`. Each mounted node keeps at most one thin DOM adapter per event type; the adapter reads the current descriptor at dispatch time. Replacing a handler therefore never touches the DOM listener unless `options` change; `destroy()` removes adapters through the existing `_cleanup` list. SSR paths do not touch DOM and keep working unchanged.

**Tech Stack:** Vanilla JavaScript, Vitest, jsdom, Vite.

## Global Constraints

- Keep all public API names (`on`, `off`, setup callback style) unchanged except the documented overwrite semantics.
- A node may still listen to many different event types; only the same (node, event) pair is single-slot.
- `destroy()` must remove DOM adapters; repeated `destroy()` stays idempotent.
- SSR (`renderToString`, `toHTML`) must not create DOM listeners.
- Every task ends with focused tests green, then a commit.

---

### Task 1: Single-Slot Event Registry

**Files:**

- Modify: `src/core/node.js` (ViewNode constructor, `on`, `off`, `_applyBindingsToElement`)
- Test: `src/core/event-registry.test.js` (create)

**Interfaces:**

- Consumes: existing `ViewNode._el`, `ViewNode._cleanup`, `document.addEventListener` semantics.
- Produces:
  - `ViewNode.on(eventName, handler, options?)` — replaces the previous handler for `eventName` on this node.
  - `ViewNode.off(eventName)` — removes the handler and its DOM adapter.
  - Internal `ViewNode._bindDomAdapter(eventName)` — ensures exactly one thin DOM listener exists for `eventName`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it, vi } from 'vitest';
import { div } from '../index.js';

describe('ViewNode event registry', () => {
  it('lets the latest on() call win for the same event', () => {
    const node = div();
    const first = vi.fn();
    const second = vi.fn();

    node.on('click', first);
    node.on('click', second);

    const element = node.renderDom();
    element.dispatchEvent(new Event('click', { bubbles: true }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps handlers for different events independent', () => {
    const node = div();
    const click = vi.fn();
    const input = vi.fn();
    node.on('click', click);
    node.on('input', input);

    const element = node.renderDom();
    element.dispatchEvent(new Event('click', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(input).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/event-registry.test.js`

Expected: FAIL — both `first` and `second` are currently registered, so `first` is called.

- [ ] **Step 3: Implement the registry**

In `src/core/node.js`:

```js
// constructor: add this._domAdapters
this._events = new Map();
this._domAdapters = new Map();

/**
 * 注册事件。同一节点同一事件只保留最新 handler；
 * 真实 DOM 上每个事件最多挂一个转发 adapter。
 */
on(eventName, handler, options) {
  if (typeof handler !== 'function') {
    throw new TypeError('ViewNode event handler must be a function');
  }

  const previous = this._events.get(eventName);
  this._events.set(eventName, { handler, options });

  if (this._el) {
    this._bindDomAdapter(eventName, previous?.options, options);
  }

  return this;
}

off(eventName) {
  this._events.delete(eventName);
  const entry = this._domAdapters.get(eventName);
  if (entry) {
    entry.cleanup();
    this._removeCleanup(entry.cleanup);
    this._domAdapters.delete(eventName);
  }
  return this;
}

_bindDomAdapter(eventName, previousOptions, nextOptions) {
  const existing = this._domAdapters.get(eventName);
  if (existing) {
    if (sameEventListenerOptions(previousOptions, nextOptions)) {
      return;
    }
    existing.cleanup();
    this._removeCleanup(existing.cleanup);
    this._domAdapters.delete(eventName);
  }

  const adapter = (event) => {
    const current = this._events.get(eventName);
    if (!current || typeof current.handler !== 'function') {
      return;
    }
    current.handler.call(this, event);
    if (current.options?.once) {
      this.off(eventName);
    }
  };
  const cleanup = () => {
    if (this._el) {
      this._el.removeEventListener(eventName, adapter, nextOptions);
    }
  };

  this._el.addEventListener(eventName, adapter, nextOptions);
  this._domAdapters.set(eventName, { cleanup });
  this._cleanup.push(cleanup);
}

_removeCleanup(cleanup) {
  const index = this._cleanup.indexOf(cleanup);
  if (index !== -1) {
    this._cleanup.splice(index, 1);
  }
}

function sameEventListenerOptions(a, b) {
  if (a === b) {
    return true;
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  return (
    Boolean(a.capture) === Boolean(b.capture) &&
    Boolean(a.once) === Boolean(b.once) &&
    Boolean(a.passive) === Boolean(b.passive)
  );
}
```

Replace the old `_applyBindingsToElement` event loop:

```js
this._events.forEach((descriptor, eventName) => {
  this._bindDomAdapter(eventName, undefined, descriptor.options);
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/event-registry.test.js`

Expected: PASS.

- [ ] **Step 5: Run lint and commit**

Run: `npx eslint src/core/node.js src/core/event-registry.test.js`

Commit:

```bash
git add src/core/node.js src/core/event-registry.test.js
git commit -m "feat(core): single-slot ViewNode event registry with overwrite semantics"
```

### Task 2: Mounted-Node Adapter Lifecycle

**Files:**

- Modify: `src/core/node.js` (already edited in Task 1, add `.once` coverage if needed)
- Test: `src/core/event-registry.test.js`

**Interfaces:**

- Consumes: `ViewNode._domAdapters`, `ViewNode._cleanup` from Task 1.
- Produces: verified behavior for events registered after mount, option replacement, `.once`, and destroy cleanup.

- [ ] **Step 1: Write the failing tests**

```js
it('binds events registered after the node is mounted without duplicates', () => {
  const node = div();
  const element = node.renderDom();
  const first = vi.fn();
  const second = vi.fn();

  node.on('click', first);
  node.on('click', second);
  element.dispatchEvent(new Event('click', { bubbles: true }));

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

it('rebinds the adapter when listener options change', () => {
  const node = div();
  const element = node.renderDom();
  const handler = vi.fn();

  node.on('click', handler, { once: true });
  element.dispatchEvent(new Event('click', { bubbles: true }));
  expect(handler).toHaveBeenCalledTimes(1);

  node.on('click', handler, undefined);
  element.dispatchEvent(new Event('click', { bubbles: true }));
  expect(handler).toHaveBeenCalledTimes(2);
});

it('supports once semantics and removes the adapter after firing', () => {
  const node = div();
  const element = node.renderDom();
  const handler = vi.fn();

  node.on('click', handler, { once: true });
  element.dispatchEvent(new Event('click', { bubbles: true }));
  element.dispatchEvent(new Event('click', { bubbles: true }));

  expect(handler).toHaveBeenCalledTimes(1);
});

it('removes the DOM adapter on destroy', () => {
  const node = div();
  const element = node.renderDom();
  const handler = vi.fn();
  node.on('click', handler);

  node.destroy();
  element.dispatchEvent(new Event('click', { bubbles: true }));

  expect(handler).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/core/event-registry.test.js`

Expected: FAIL where the current Task 1 code still binds every registered handler directly.

- [ ] **Step 3: Finish adapter behavior**

Make sure the Task 1 implementation already satisfies these tests. If `.once` does not remove the adapter, adjust `off()`/adapter handling until the following invariant holds: firing a `.once` handler removes both the registry entry and the DOM adapter.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/core/event-registry.test.js src/core/node.test.js src/components/components.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/node.js src/core/event-registry.test.js
git commit -m "feat(core): manage mounted event adapters with overwrite and cleanup"
```

### Task 3: Compatibility Audit and Migration

**Files:**

- Audit: all `.js` files under `src` except `*.min.js` and `examples/**`
- Test: existing full suite

- [ ] **Step 1: Find same-node same-event duplicates**

Run:

```bash
rg -n "\.on\(\s*['\"]" src -g '*.js' -g '!*.min.js' -g '!examples/**' | Select-Object -First 200
```

Manually inspect any node that calls `.on('sameEvent', ...)` twice in the same construction path.

- [ ] **Step 2: Resolve each duplicate**

For each found duplicate, decide:

- If the second call intentionally replaced the first, keep it and delete the first.
- If both handlers must fire, merge them into one handler or split the work into two event types.
- If the node is re-created on every render (normal factory path), no migration is needed.

Record decisions in the commit message.

- [ ] **Step 3: Run the full suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Run lint and formatting checks**

Run: `npx eslint src` then `npx prettier --check src/core/node.js src/core/event-registry.test.js`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(core): migrate event usages to single-slot overwrite semantics"
```

### Task 4: Document the Event Contract

**Files:**

- Modify: `src/core/node.js` (JSDoc above `on`)
- Modify: `docs/component-development-spec.md`

- [ ] **Step 1: Update JSDoc**

```js
/**
 * 注册事件。同一节点对同一事件只保留最新 handler：
 * 重复调用 on() 覆盖上一次，不会产生重复 DOM 监听。
 * options 变化时才会重建 DOM adapter。
 */
```

- [ ] **Step 2: Add spec section**

Append to `docs/component-development-spec.md`:

```markdown
## 事件注册契约

- ViewNode 是事件注册表：每个 (节点, 事件) 只保留一个 handler。
- 重复 `.on(event, handler)` 覆盖上一次 handler。
- 真实 DOM 只挂转发 adapter；handler 变化不重建 DOM listener，options 变化时重建。
- 组件销毁时 adapter 随 `_cleanup` 移除。
- setup 重跑时对同一节点重复 `.on` 是安全的：覆盖而不是叠加。
```

- [ ] **Step 3: Run lint**

Run: `npx eslint src/core/node.js`

- [ ] **Step 4: Commit**

```bash
git add src/core/node.js docs/component-development-spec.md
git commit -m "docs(core): document single-slot event overwrite contract"
```

### Task 5: Verify Against Future rebuildable Re-runs

**Files:**

- Test: `src/core/event-registry.test.js`

- [ ] **Step 1: Write the re-run simulation test**

```js
it('does not double-bind when a setup-style callback re-registers handlers', () => {
  const node = div();
  const element = node.renderDom();
  const first = vi.fn();
  const second = vi.fn();

  // 模拟 setup 重跑：同一节点同一事件再次 on
  node.on('click', first);
  node.on('click', second);

  element.dispatchEvent(new Event('click', { bubbles: true }));
  element.dispatchEvent(new Event('click', { bubbles: true }));

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/core/event-registry.test.js`

Expected: PASS.

- [ ] **Step 3: Run the full suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/event-registry.test.js
git commit -m "test(core): event overwrite stays safe under repeated setup"
```

## Self-Review

- Spec coverage: overwrite semantics (Task 1), DOM adapter (Task 2), compatibility (Task 3), documentation (Task 4), re-run safety (Task 5).
- Placeholder scan: every code step contains concrete code or an exact audit command.
- Type consistency: `_events` descriptors use `{ handler, options }`; `_domAdapters` uses `{ cleanup }`; `_bindDomAdapter(eventName, previousOptions, nextOptions)` signature is used identically in `on()` and `_applyBindingsToElement()`.
