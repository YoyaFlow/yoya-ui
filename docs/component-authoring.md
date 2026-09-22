# Component Library Authoring Guide

> Audience: teams or individuals who want to build their own component library on top of the yoya-ui standard.
> Related documents: [Theme and Styling Spec](theme.md), [project README](../README.md).

## 1. Positioning: a small core is the standard, components are a pluggable ecosystem

yoya-ui's core is a small, stable "component standard" rather than a large runtime:

- **The core is about 1,000 lines**: it provides node lifecycle (`renderDom` / `bindTo` / `destroy`), an attribute-snapshot model, component wrapping (`ComponentNode`), a state mechanism, and HTML/SVG element factories.
- **Built-in components are first-party implementations of the standard**: `vButton`, `vCard`, `vTable`, `vForm`, plus shortcuts such as `toast`, `vText`, and layout factories are all built to this guide and are the best reference implementations.
- **The standard is open**: you can build your own component library and interoperate with built-ins in the same view tree (nested `child()`, parent shortcuts, i18n text, etc.).

## 2. Standard contract: the `yoya-ui/core` public API

Component developers only need `yoya-ui/core` (zero third-party dependencies, smallest size):

| Category                  | API                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node classes              | `ViewNode`, `ElementNode`, `HtmlElementNode`, `SvgElementNode`, `ComponentNode`, `TextNode` (`VTextNode`)                                                           |
| Factories and composition | `vText`, `createElementFactory`, `registerChildFactories`, `applyElementOptions`, `normalizeChild`, `normalizeSetupArguments`, `resolveTarget`                      |
| Node internals            | `nodeChildren`, `appendNodeChild`, `EMPTY_CHILDREN`, `elementStyles`, `elementAttrs`, `elementClassNames`, `elementHasClass` (class-node components only, see §7.3) |
| Component identity        | `vn: 'VCard'` on the view root, `defineComponentIdentity`, `componentNameOf`, `hasComponentIdentity` (one check for all three shapes, see §7.3)                     |
| Signals                   | `ref`, `computed`, `batch`, `isSignal`, `SignalHandle`, `installSignals` (handles go straight into value positions)                                                 |
| i18n                      | `createI18n`, `I18nTextNode`, `i18nText`, `installI18nStringShortcut`                                                                                               |

## 3. The two component shapes

**A component has exactly two shapes** (converged 2026-09-21): **A, the thin factory** (no behaviour) and
**B, `vNode`** (behaviour). The object component (`return { render(), … }`) is retired (existing code only,
ticket 03), and `class Xxx extends HtmlElementNode` is **not a component shape** — it is the engine's
**node-type extension** (a component's view root / a custom element kind); see §7.3.

### Shape A: thin factory — no behaviour

Use it whenever the component has no extra behaviour to define (no internal state, no outward command methods,
no lifecycle needs) — **demo code follows the same rule**: when a demo only shows structure or interaction and
exposes no command methods, return the ViewNode directly instead of wrapping it just for uniformity.

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

Two flavours are fine for shape A, but pick deliberately:

- **Forwarding definition** (`ServiceTag(options)` above): the definition _is_ what call sites write — use it when
  the parameters really are the component's own and there is no caller-setup dispatch to honour;
- **Paired definition + shortcut** (`VXxx` / `vXxx`): `VXxx()` only builds the structure (its own props), and
  `export const vXxx = createComponentShortcut(VXxx)` owns "build + apply the caller's setup dispatch" —
  the same machinery every shape B component uses. Do **not** alias the definition (`const vXxx = VXxx`): the
  definition would be forced to own the caller's parameters too. `VSlot` / `vSlot` is the reference for this.

### Shape B: `vNode((api) => view)` — use it when there is behaviour

State lives in the closure, commands and hooks are written on `api`, and the setup returns the view — defining
it gives you the component node:

```js
import { computed, ref, vNode, vstack, vText } from '@yoyaflow/yoya-ui';

export function CounterCard() {
  const count = ref(0);

  return vNode((api) => {
    api.bump = () => {
      count.value += 1;
      return api; // same as returning the node
    };

    return vstack((stack) => {
      stack.output((out) => out.child(vText(computed(() => `计数 ${count.value}`))));
      stack.vButton('+1', (button) => button.on('click', () => api.bump()));
    });
  });
}
```

- The result is the component node itself (`ComponentNode extends ViewNode`): mount it as a root, pass it as a child, or key it — no placeholder element, and an array return becomes a multi-root fragment.
- `api` only collects command functions; the factory attaches them to the node, and a name hitting an existing node member (`child` / `destroy` / `mountable` …) or `render` / `_*` throws instead of silently overwriting.
- The **second parameter `self`** is the component's own handle (the same family as the `host` the hooks
  receive): `self.node()` returns the component node itself, which is what a command needs in order to add
  content (`self.node().child(part)`). The node is built after setup returns, so reading it _during_ setup
  throws with a timing error instead of handing out `null`. The handle lives in the setup signature, not on
  `api`: api keys belong to the component's own commands (VTree has `api.node`), so an internal handle there
  would collide with real commands.
- `return api` inside a command is the same as returning the node; a component's own error boundary goes to `api.whenFailed = (error, info) => fallback` (same as `node.whenFailed(fn)`), and other node capabilities (`mountable()` / `rebuildable()`) chain on the returned node.
- **State and commands go on `api`, not `this`** (`api` is in the setup's lexical scope); lifecycle hooks are
  `api.whenMount` / `api.whenDestroy`, the error boundary is `api.whenFailed`.
- Identity: one line at the bottom of the module, `defineComponentIdentity(VXxx, 'VXxx')`; `member instanceof VXxx`
  is the same check for shape A and shape B (an element node reads itself, a component node unfolds to its view root).

### Component definition vs shortcut method

- **`VXxx` is the component definition function** (PascalCase; name = identity = export name): it describes
  structure / state / commands / identity. Its parameters are the **component's own** (props, or none) —
  it does **not** own the caller's setup semantics.
- **`vXxx` is the shortcut method** (lowercase): it builds the component and applies the caller's arguments
  through the setup dispatch. `page.vXxx(…)` is the same method in its parent-node form (registered through
  `registerChildFactories`). Call sites use `vXxx`; `VXxx` only defines.
- **The setup dispatch has three overridable entries**: `setupFunction` (function = builder callback),
  `setupString` (string / number) and `setupObject` (object). When the component defines them on its `api`,
  they win; **otherwise the root element's implementations are used** (for `setupFunction` the fallback is the
  component node's own build frame, because the callback handle must equal the factory's return value).
  The remaining branches are fixed: node / handle = child, array = child list.
- This mirrors the element side: `createElementFactory('div', Node)` = element kind + setup dispatch; the
  component counterpart is the **definition + shortcut** pair (`VXxx` / `vXxx`).

### Node-type extension (engine internals — not a third component shape)

`class XxxNode extends HtmlElementNode` still exists, but it is the **view root of a component / a custom element
kind**: the element machinery (`renderDom` / `toHTML` / `child` semantics / DOM measurement / event binding /
lifecycle) has to live on a node. Every built-in component is built this way — one outward handle (the vNode
component node), with the node type kept out of the package entries. Third parties never subclass for components.
For the field-access rules see §7.3.

## 4. Naming and style conventions

- Keep native names for basic HTML elements: `button()`, `div()`, `input()`.
- Compound component factories use the `v` prefix with PascalCase names: `vButton`, `vCard`, `vStatusBadge`.
- **Attribute contract** (the attribute migration; enforced as a shrink-only baseline by `src/attribute-migration-baseline.test.js`):
  - **Identity**: the component's view root writes `vn: 'VXxx'` (the export name); internal blocks write their
    own `vn: 'VXxxPart'`. A wrapper sharing one root writes several names (`vn: 'VTimer VInput'`, whitespace
    separated — any name matches). Identity is an **object fact** (the check reads it) that also **reaches the
    real DOM** (`vn="VXxx"` — read by the GenUI scan and by CSS scoping).
  - **Parts**: `vSlot('name')` declares the zero-layout position in the structure, `vn_slot: 'name'` marks the
    content, and `child()` into the component projects it into position automatically.
  - **Public slots**: `slot: 't-head'` (declaration on the structure side, envelope on the content side); the
    envelope never enters the DOM. `slot` and `vn_slot` are separate namespaces.
  - State always uses kebab-case `data-*` attributes (`data-variant`, `data-open`).
  - **Class names retire**: `yoya-component` and `yoya-v*` (component and part) are removed; preset rules are
    written as `[vn="VXxx"]`. Cross-component capability classes `yoya-<feature>` (`yoya-layout`, `yoya-icon`,
    `yoya-control-clear`) stay.
  - Preset rules must be scoped from the identity (`[vn="VXxx"] …`, no orphan part selectors), so swapping the
    identity detaches the whole subtree from preset styles.
- Third-party components should use their own identity names and class prefix (e.g. `acme-status-badge`) to avoid conflicts with built-in styles.
- Prefer theme variables for colors and spacing: `var(--yoya-<token>, fallback)`. The theme root is `:root, [data-yoya-theme]` (see `yoya.ui.css`).

## 4.1 Style customization and theming

- Preset styles must be written from the identity scope (`[vn="VXxx"] ...`) so users take over by **swapping the identity** (omit that `vn` / use their own) or overriding rules in their own CSS layer; whether `replaceClassName` stays as a generic class utility is still open (ticket 15 §3-Q8).
- Instance-level customization should go through component APIs or inline `styles()`; global customization happens by overriding `--yoya-*` tokens or the dimensional switches.
- Library components run inside `@layer yoya` with low-specificity base rules, so user rules win naturally; third-party components should follow the same convention.
- See the [Theme and Styling Spec](theme.md) for the token system, theming dimensions, light/dark and density modes, and the customization ladder.

## 5. Text and i18n contract

Component text input should uniformly accept the following four forms (`vText` / `child()` normalize them):

- Raw string: `vButton('Save')`
- `VTextNode`: `vButton(vText('Save'))`
- `I18nTextNode`: updates in place when the language changes, without rebuilding the view tree
- String shortcut: `'Save'.s('common.save')` (after `installI18nStringShortcut()`)

## 6. State and updates

yoya-ui state is driven by the built-in Signals: a component holds state in `ref` and passes the handle straight into value positions, so writes update bindings in place; structural changes are driven by `rebuildable()` regions that read signals. Node-level `state()` / `setState()` / `getXState()` and `vStateNode` were removed in 0.5.

- Values: `const count = ref(0)`; the handle can be passed to `attr` / `style` / `vText` / component props. Writing `.value` (or `handle.update(fn)`) updates the binding in place without rebuilding DOM or losing focus. Derived values use `computed(fn)` (read-only, lazy, cached); dependency subscriptions follow its observers — with the built-in engine's native derivation, an unobserved value subscribes to nothing and recomputes lazily on the next read — so a row-scoped derivation releases them as soon as the row's binding goes away instead of holding the row in memory.
- **This is the only reactive model**: there is no deep proxy — `obj.field = x` does not notify (replacing the whole object does). To make a field update, make that field a handle; for list row models see the skill's state-module section (hot fields as handles plus `apply()` merging by key).
- Structure: `rebuildable(predicate?)` marks a node as a rebuildable region; signals read inside become its dependencies and drive predicate-gated rebuilds. Call `rebuild()` to force one.
- Text: pass a handle for state-driven text — `vText(count)`, `child(count)` and `div(count)` (a handle in the factory's setup position, equivalent to `div((el) => el.child(count))`) are equivalent; only wrap in `computed(fn)` when the value is derived. When you need imperative in-place replacement, keep a `vText()` handle and call `textContent(next)` (replaces, idempotent). **The node-level `text()` was removed**: append with `child(content)` (repeated appends stack), and "set the label" with a `vText()` handle plus `textContent(next)`. Component-level `text()` (`vBadge` / `vProgress` / `vMenu`, …) and SVG's `<text>` `text()` are separate APIs and still work.
- Expose methods, not handles: keep internal state in `ref`, and expose chainable methods such as `value(next)` / `disabled(next)` instead of handing the signal object to callers.

#### 6.0 Two shapes side by side: centralised snapshot (legacy) vs read-value binding (target)

The 0.6 → 0.7 attribute migration was an **equivalence migration**: the old "state + `_syncXxx()` writes snapshots" shape was moved over as-is, so the golden file (`src/migration-equivalence.test.js`) could prove byte for byte that only class names / identity changed. **Do not copy that shape in new code** — state → view goes through read-value bindings:

```js
// legacy shape (migration stock, only-decrease): state in a closure, mapping centralised in one function
const state = { count: null };
const badgeBox = span({ vn: 'VBadgeCount' }).styles({ ...static... });
const syncBadge = () => {
  badgeBox.style('display', state.count === null ? 'none' : 'inline-flex');
  badgeBox.attr('aria-label', state.count === null ? null : String(state.count));
};
api.count = (value) => (value === undefined ? state.count : ((state.count = value), syncBadge(), api));

// target shape: state in a ref, the mapping lives in the structure, commands only change state
const count = ref(null);
const visible = computed(() => count.value !== null);
const node = span({ vn: 'VBadge' }, (root) =>
  root
    .span({ vn: 'VBadgeContent', vn_slot: '' })
    .span({ vn: 'VBadgeCount', style: { ...static... } })
      .style('display', () => (visible.value ? 'inline-flex' : 'none'))
      .attr('aria-label', () => (visible.value ? String(count.value) : null))
      .child(vText(() => (visible.value ? String(count.value) : '')))
);
api.count = (value) => (value === undefined ? count.value : ((count.value = value), api));
```

Three hard rules:

1. **Value positions**: `attr` / `style` / `styles` / `toggleClass` / `vText` / `mountable` take a handle or a zero-argument reader; `child()` is **not** a value position — write text as `child(vText(() => …))`.
   **Prefer passing the handle for a plain read** (`attr('data-status', status)`, `style('width', view.width)`): a handle and a reader run through the same binding pipeline; use a reader only when you need to map/combine (or name the derivation as a `computed` and pass that handle).
2. **"Only written once touched" attributes** use an `xxxSet` flag plus a read-value binding (keeps the byte-for-byte "untouched means no DOM attribute" semantics).
3. **No write-then-flush batch**: nothing beyond `flush()` on a region, no `markDirty()` + rAF deferred writes; after a command runs, the DOM is correct on the same tick.

**A boundary that is easy to hit** (engine contract, covered by `src/core/binding-landing.test.js`): a binding is **evaluated once at build time** and only **subscribes on landing** — so writes made between build and landing do not reach the first paint, and **component props land exactly in that window** (props are applied after the build). Components written with read-value bindings must therefore close the loop where they write state: call `node.flush()` on the view root for **values** (idempotent, no DOM write when unchanged). For **structure, prefer not to rebuild**: `mountable()` for conditional presence, `keyed()` for lists, `replaceChildren()` to swap content — `rebuildable()` is reserved for "the whole block really must be rebuilt" (see §6.1). After landing the subscriptions take over. Note also that bindings registered on a region node itself are released together with that region's run — register them on the parent/sibling instead, or re-register inside the region builder.

**How components and sub-structures are written (settled 2026-09-22)**: components are always defined with a **named function declaration** — **one business component function = one component boundary** (`function VXxx() { return vNode((api) => …) }`); sub-structures are named functions too (no behaviour → shape A thin factory returning the view), and the parent only composes them. Structure is **nested through setupFunction** by default: `span({ vn, style }, (box) => { box.style(binding); box.child(…); })` — statics in the factory options, bindings and children in the callback; do not chain `span({…}).style(…)` outside the factory call. Reference implementation: `src/data-display/badge.js`.

Gate: `src/view-binding-baseline.test.js` + `src/view-binding-baseline.json` freeze the remaining "centralised snapshot functions" (**only-decrease**; new files must have none). After each migration cut run `UPDATE_VIEW_BINDING_BASELINE=1 npx vitest run src/view-binding-baseline.test.js`. The reason is not only readability: imperative snapshot writing **cannot be compiled** — anything that is not "static structure + live values + conditionals/lists" falls back to the general path.

### 6.1 Rebuildable regions

When a block needs "structure follows data" and a stateful component is too heavy, mark it as a region:

```js
const rows = ref([]);
const editing = ref(false);

const body = div((ele) => {
  ele.rebuildable(() => !editing.value); // optional gate: when false, values flush without rebuilding
  ele.attr(
    'data-count',
    computed(() => rows.value.length)
  );
  rows.value.forEach((row) => ele.addChild(row.id, div(row.name)));
});

rows.value = [...rows.value, { id: 'r1', name: 'First row' }]; // a write rebuilds the region
body.rebuild(); // force a structural rebuild when you need one
body.flush(); // writes bound values back only, without rebuilding structure (idempotent)
```

Contract and boundaries:

- **Use `flush()` for values and `rebuild()` for structure**: `rebuild()` clears children and re-runs the setup (it also flushes the bindings registered in that run); `flush()` only evaluates registered bindings and writes them back — no rebuild, no predicate, and no DOM write when a value did not change. When one change involves both, call `rebuild()` alone instead of stacking `flush()`.
- **Create the region node once**: its content is produced by its own builder, so it can be built outside `render()` and held directly (`const list = ul((box) => { box.rebuildable(); … })` then `list.rebuild()`). There is no need to back-fill a `let region = null` from inside render; the same goes for status lines and helper nodes around it. **Build it inside the component or page factory** (one per instance, one per request) rather than at module level — the server reusing one tree leaks state across concurrent requests. Call `rebuild()` / `flush()` only during client-side interaction; the SSR first paint only builds (bindings are written back during the build).
- **Declare the region inside its own setup builder**: `rebuildable()` only takes effect while that builder is running. A non-region node's build closure is released as soon as its build returns (that is where per-row memory goes), so a node whose builder has already returned can no longer be promoted to a region — calling `rebuildable()` on it throws with that explanation. A region keeps its builder, which is why its predicate can still be replaced later with another `rebuildable(predicate)` call.
- Region content is produced by its own setup. A rebuild **clears the children and re-runs that setup**, so DOM identity inside the region is not preserved: focus, selection, inner scroll position and third-party instances attached to elements are rebuilt. Siblings outside the region keep their DOM.
- The predicate only answers "should this rebuild be paid for this time". When it returns false, bound values are written back and the rebuild is recorded as pending (`rebuildPending()`); structure stays untouched. Put data conditions inside the setup, not in the predicate.
- Value bindings accept exactly two sources: a **signal handle** (recommended) or a **zero-argument closure** `() => value` (a reader). Both run through the same binding pipeline: the closure is evaluated once at build time, and **any signal it reads becomes a dependency**, so writing that signal re-evaluates it; when it reads plain variables, call `flush()` yourself to re-evaluate. The parameterized form `(s) => value` was removed together with node-level state: it throws when registered and the types reject it. A region rebuild releases the previous bindings and the new ones take effect immediately.
- **Component props take literals and signal handles only** (`vInput({ value: name })`): props are configuration slots where functions carry other meanings (`onChange` / `render`), so a zero-argument closure throws when the component is built instead of being silently stringified. For text, wrap readers in `vText(fn)` — `child(fn)` is a component render slot.
- Declaration order: call `rebuildable()` first, then write value functions and other registrations.
- Do **not** put one-off side effects (third-party instance creation, requests, analytics) in a region setup. `bindDocumentEvent` / `bindWindowEvent` are reset across rebuilds by the engine; timers must be registered through `registerRegionCleanup(fn)`. To bind explicitly to a node, use the node methods `ele.bindWindowEvent(type, handler)` / `ele.bindDocumentEvent(...)` / `ele.bindAnimationFrame(cb)` / `ele.bindAnimationFrameLoop(cb)` — destroy() unbinds or stops the frames automatically (`stopAnimationFrameLoop()` stops a loop early); the standalone functions keep their original manual-unbind usage.
- Every region subscribes to its own dependencies: a signal read inside it triggers a rebuild (reported by devtools as `trigger: 'signal'`); nested regions subscribe independently.
- **List coordination**: `node.keyed(rows, keyFn, build, options?)` drives items from a signal — rows whose key and reference are unchanged keep their nodes, changed rows rebuild in place, and reorders move only the rows whose position actually changed (swapping two rows never re-inserts the rest of the table, and a multi-root row moves as one group), with identity preserved. A fourth argument declares the **row-level update protocol**: `equals(prevRow, nextRow)` returning true counts as unchanged (the node is reused), otherwise `update(node, prevRow, nextRow)` rewrites that row in place (node identity preserved), and only when neither is given is the row replaced. `equals` wins when both are supplied. Use the `insertBefore(key, child, beforeKey)` / `insertAfter(key, child, afterKey)` / `moveBefore(key, beforeKey)` / `moveAfter(key, afterKey)` / `replaceChild(key, child)` primitives for custom strategies.
- **Conditional attachment**: `panel.mountable(cond)` is the single public entry — the condition accepts a ref/computed handle, a boolean or a zero-argument closure, and **defaults to always attached (`true`) when omitted**; it rests inertly on the child, and the parent adopts it at tree entry (the same path `keyed()` rows take). Calling `mountable()` again on an attached node replaces the condition immediately (closure changes refresh via the **parent** `flush()`). False detaches the child element from the document while keeping the child ViewNode and its state alive; true reattaches it at its child slot, and SSR omits it while the condition is false. `node.isMounted()` reports the latest committed state of its own mount condition; "is the element in the document right now" is `node._el?.isConnected`. Together with `display` toggling (invisible but present) and `rebuildable()` (destroy and rebuild) it forms the third tier: absent but alive. The binding is registered on the parent while the condition lives in the child's own value unit (no parent pointer); the `div({ mountable: cond })` config form shares the same adoption path.
- Every region subscribes to its own dependencies: a signal read inside it triggers a rebuild (reported by devtools as `trigger: 'signal'`); nested regions subscribe independently. Writing several signals inside `batch()` rebuilds a multi-source region once, synchronously at the end of the batch; use `rebuildScheduled()` to check whether a signal-triggered rebuild is queued. Writes outside a batch still rebuild synchronously, and a dependency that changes again during a rebuild re-runs it afterwards instead of being dropped.

- To keep focus or third-party instances, leave that part outside the region or use value bindings, which update in place without rebuilding DOM.
- **Event delegation inside `keyed()` segments**: bubbling standard events registered inside a row builder
  (including its subtree) — `click`, `input`, and friends — no longer attach one DOM listener per row; they
  are collected into a single listener on the segment root (10k rows: 20k listeners → one per segment).
  `.on()` usage and observable behavior are unchanged (`this`, `event.target`, `event.currentTarget` and
  `stopPropagation()` all behave as before, the last one also cutting native bubbling). Binding falls back to
  per-element registration for `once` / `capture` / `passive: true`, non-bubbling events (`focus`,
  `mouseenter`, …), custom events, non-element nodes, and any `.on()` added after mount. Two subtle
  differences: `currentTarget` is emulated per event (same value, but an own property on the event object),
  and listeners third parties attach directly on elements _between_ the row root and the segment root may see
  a different relative order.
- **Error boundary**: `node.whenFailed(handler)` declares a subtree boundary — returning a node replaces the subtree with a fallback, returning nothing only reports and keeps the current state; a vNode component may declare `api.whenFailed = (error, info) => fallback`, which ComponentNode mounts automatically. Captures are never silent: console.error always fires and a devtools 'error' event is emitted when enabled. The error walks up the parent chain to the nearest boundary at failure time, so it is independent of declaration order, nesting depth, runtime insertion and subtree moves; that boundary owns the capture and never forwards it further, and a throwing handler propagates outward. When nothing is returned during a render / build phase, the failing child is marked and skipped on later attempts (no repeated failures or logs); re-attaching it or rebuilding its region clears the mark so it gets one more chance. Without a boundary, errors propagate unchanged (fail fast). Degrading a region node runs as one region build, so it never trips the region guard.

### 6.2 Selection in long lists: do not derive per row from a shared handle

In a long list (1k+ rows), expressing "which row is selected" as **one shared handle plus a per-row
derivative**:

```js
const selectedId = ref(null);
// inside every row
line.toggleClass(
  'danger',
  computed(() => selectedId.value === row.id)
);
```

**wakes up every row** on each selection change — every row subscribes to the same signal, so all the
framework sees is "N derivatives read this signal"; it cannot know that only two rows actually change.
Measured (`npm run perf:selection`, 1000 rows):

| Style                                             | Derivative evaluations per switch | Switch cost (the write itself) |
| ------------------------------------------------- | --------------------------------- | ------------------------------ |
| Shared handle, per-row derivative (above)         | **1000**                          | 0.47 ms                        |
| Per-row derivative over the row's own handle      | 2                                 | 0.014 ms                       |
| The row holds its own `ref` boolean (recommended) | **0**                             | 0.015 ms                       |

The cost scales linearly: at 10k rows the first style runs 10000 derivatives per switch (1.5 ms).
Memory-wise the first style holds one extra derivative object and subscription per row, roughly
0.2 KB per row (about 0.2 MB per 1000 rows).

The recommended shape keeps the selection state **on the row itself** and writes only two rows:

```js
const row = { id, label: ref(labelOf(id)), selected: ref(false) };
// inside every row
line.toggleClass('danger', row.selected);
// switching: write two rows only
const select = (next) => {
  const list = rows.peek();
  const previous = list.find((item) => item.selected.value);
  if (previous) previous.selected.value = false;
  next.selected.value = true;
};
```

- Both styles are declarative; they differ only in whether the state lives on a shared handle or on the
  row. The second is O(1).
- The tradeoff is that paired writes are yours to maintain (keyboard navigation, select-all, data
  refreshes must all go through one entry point). For multi-select sets / filters / hover + selection
  combinations, keep your own `Map<id, row>` index — still no new framework API.
- For short lists (tens to hundreds of rows) or lists that are fully refreshed on every change, the
  shared-handle derivative stays simpler; no need to change it.

### 6.4 Key-addressed container: `keySet` (a `ref([])` replacement)

Lists are often used as maps: fetch/update/remove a row by key, hang per-row state on it (selected /
expanded / dirty / loading), drive master-detail views or keyboard navigation. You can build that with
your own `Map`, but keeping data and state in sync is on you. `keySet` folds it into one container whose
**elements are `KeyItem`s — `data` and `api` live in the same object**, so sorting, inserting, moving and
replacing all act on the element and can never desync the two.

```js
const list = keySet(
  rows,
  (row) => row.id,
  (item) => {
    item.api.selected = ref(false);
    item.api.select = () => {
      item.api.selected.value = true;
    };
  }
);

tbody((body) => {
  body.keyed(list, (item) =>
    // the row *is* the element; second arg is the index
    tr((line) => {
      line.attr('data-row-id', String(item.data.id));
      line.toggleClass('danger', item.api.selected);
      line.on('click', item.api.select);
    })
  );
});
```

- `item.data` is your row; `item.api` is the state and commands you define for it — the third argument
  runs once per new key.
- **Same key, same api**: reordering, moving, or reassigning the same rows keeps element and api; when
  `item.data` is swapped for a new reference the row is rebuilt in place (pass `keyed`'s `equals` /
  `update`, which receive row data, to match or update instead).
- A changed key means the old key left (element dropped, `item.api.dispose?.()` called) and a new key
  entered (new element, new api). Identity is always `keyOf(item.data)`; the container caches no key.
- Data operations run one keyed reconcile; writing a signal on `item.api` touches no data array and
  triggers no reconcile — that is the O(1) wake-up from the table in §6.2, with the state owned by the
  container per key.

| Purpose                    | API                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger a refresh          | `list.value = datas` / `list.replaceAll(datas)`; `list.batch(() => …)` folds several steps into one reconcile                                            |
| Add / change / drop by key | `add(data)` / `insertBefore(data, beforeKey?)` / `insertAfter(data, afterKey?)` / `replace(key, data)` / `merge(key, patch)` / `remove(key)` / `clear()` |
| Sort and move              | `sort((itemA, itemB) => …)` (stable, comparator gets elements) / `moveBefore(key, targetKey?)` / `moveAfter(key, targetKey?)`                            |
| Read                       | `item(key)` (element) / `get(key)` (data) / `has(key)` / `indexOf(key)` / `keys()` / `items()` / `values()` / `size` / `keyOf(data)`                     |
| Use as a data handle       | `value` / `peek()` / `subscribe()`; writing means new data, reading yields the **element table** (`KeyItem[]`)                                           |

Details: write operations throw when the target key is missing while reads return `undefined` / `false`;
`moveBefore(k, k)` / `moveAfter(k, k)` are no-ops (`moveBefore(key)` moves to the end, `moveAfter(key)` to
the start); duplicate keys in one dataset throw; `merge` only accepts object rows. `keySet` is optional —
for short lists, or lists fully refreshed on every change, the `ref` + derivative style in §6.2 stays
simpler.

## 7. Composition, events, and lifecycle

- `child(...)` accepts `ViewNode`s, vNode components (wrapped in `ComponentNode` automatically), or strings/numbers.
- `on(eventName, handler, options)` binds real DOM events and cleans them up automatically in `destroy()`.
- A vNode component can be passed to `child()` as-is; node types (view roots) follow the `renderDom` / `bindTo` / `destroy` lifecycle.

### 7.1 Lifecycle

1. **Declare (build time)**: a factory call creates the node; `attr` / `style` / `on` / `child` inside `setup` only write snapshots and never touch the DOM. vNode components are wrapped in a `ComponentNode` that resolves and caches their view on first render. Build-time scopes (`access`, `context`, `i18n`) are captured here.
2. **Mount**: `renderDom()` creates or reuses real DOM, binds event adapters, recurses into children and applies attribute snapshots; `bindTo(target)` is `renderDom` plus append; `commit()` applies permission state and settles pending child removals.
3. **Update (state change)**: by increasing cost — function-value bindings write values back (no DOM rebuild) → `update()` patches locally → a region `rebuild()` (clear children and re-run its setup) → a component `rebuild()` (destroy the old roots and render again).
4. **Destroy**: remove event adapters and run cleanups, destroy children recursively, clear the keyed-child registry, detach from the DOM; repeated `destroy()` calls are idempotent.

SSR adds one path: `toHTML()` produces HTML (DOM-free) → `hydrate()` adopts the existing DOM (`adoptElement` + `bindElement`, without rebuilding elements) → `hydrateSnapshot()` reads back real values such as form fields. This requires `render()` / `toHTML()` to stay deterministic so both sides produce the same tree.

### 7.2 Splitting complex components into blocks

When a complex component needs to be defined in blocks, each block inside the file is organized as a **function component** too: declared in the same file, PascalCase named after the UI unit, with explicit inputs, returning a ViewNode. The tree should read as components composed of components rather than one procedural layout routine.

```js
function MemberSummary({ stats }) {
  return p((line) => line.child(vText(() => `共 ${stats().total} 人`))); // values: bindings
}

function MemberRows({ rows, onSelect }) {
  return ul((list) => {
    list.rebuildable(); // structure follows filters: a region rebuilds it
    rows().forEach((row) => list.addChild(row.id, MemberRow({ row, onSelect })));
  });
}

export function MemberPanel({ state, onFilter, onSelect }) {
  return div((panel) => {
    panel.child(MemberSummary({ stats: () => ({ total: state.members.length }) }));
    panel.child(MemberFilter({ onInput: onFilter }));
    panel.child(MemberRows({ rows: () => state.members, onSelect }));
  });
}
```

- **Pass live data as getters** (`rows: () => state.members`): array/object references go stale after a state update, and a region rebuild would otherwise re-read old values. Write-backs always go through callbacks.
- **Pass the handle when the source is a `ref`** (`rows: itemsRef`): blocks read it through value bindings or regions, so no getter is needed; keep getters for non-signal sources (request results, external objects).
- **Split updates inside a block**: value changes use function-value bindings; structural changes use a region (the block declares `rebuildable()` on its own layer and calls the getter again).
- Blocks use the same two shapes as exported components (shape A returning a ViewNode, or shape B `vNode((api) => view)`). Avoid anonymous fragments and positional names such as `renderTop` / `BlockA`; two or three levels are usually enough.

### 7.3 Field access in class-node components (0.6.3 onwards)

The underscore fields `_children` / `_classText` / `_styles` / `_attrs` are **implementation details** (memory
work changes how they are represented). Third-party or out-of-tree class-node components must not read or
write them directly; use these helpers, which map one-to-one onto the old fields:

| Before                                                      | After                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `node._children.push(child)` / `this._children.splice(...)` | `appendNodeChild(node, child)`, `nodeChildren(node)`                           |
| Comparing against an empty list                             | `EMPTY_CHILDREN` (a shared **frozen** array sentinel — writing into it throws) |
| `node._classes` / `node._attrs.class`                       | `elementClassNames(node)`, `elementHasClass(node, name)`                       |
| `node._styles.background = …`                               | `elementStyles(node).background = …`                                           |
| `node._attrs['data-x'] = …`                                 | `elementAttrs(node)['data-x'] = …`                                             |

Three things to keep in mind: the empty child list is a shared sentinel, so cache nothing and write nothing
into it (`nodeChildren()` materialises a real array on the first write); class names live as text
(`_classText` — the `_classes` Set no longer exists); `_styles` / `_attrs` are created on demand, so they are
`undefined` on elements that never set a style or attribute and the helpers create them for you. Append
children through `child()` / `addChild()` as usual — these helpers exist for class-node components that must
touch the child list inside their own render path.

## 7.1 Slots: where content goes

Mark an element in a component's own structure with a `slot` attribute and it becomes a **slot** of that
component. An element passed through `child()` that carries the same marker is an "envelope": its children,
class names and same-named attributes merge into the slot element, and **the envelope itself never enters
the DOM** (same fallback semantics as HTML's `<slot>`). Content without a marker follows plain-element
semantics and is appended inside the component's root element.

```js
// Component author: declare the slot in the structure (its own content is the default)
function Panel() {
  return vNode(() =>
    div((root) => {
      root.span({ slot: 't-head' }, 'default title');
      root.div('body');
    })
  );
}

// Consumer: both kinds of content work
panel.child(span({ slot: 't-head' }, 'user title')); // into the slot, replacing the default
panel.child(p('plain content')); // unmarked → appended inside the component root
```

Rules:

- **Nearest scope**: a marker resolves only on the **direct parent component** — no bubbling, no
  percolation; nested components keep their same-named slots independent;
- **One slot accepts one carrier**: a second delivery to the same slot throws; two declarations of the
  same slot in one component throw;
- **No matching slot**: the content is not mounted (+ a development-time hint), matching HTML;
- **Multi-root components** have no single container: unmarked content throws — declare a named slot;
- **The anonymous slot (unmarked `child(...)`) is the "inside the component root" default position**: when a
  component forwards content to an inner container (anchor content into its inner `<ul>`, table rows into
  `<tbody>`), unmarked content still travels that same `child()` path — a migration to a vNode shell must keep
  the same landing path, never silently dropping it or parking it on the wrapper;
- Slots add no extra DOM; `slot` is a **marker**, not a `<slot>` element (`slot()` is the plain HTML tag
  factory and has nothing to do with component slots).

### When to use a slot, when to use `child`

| Situation                                                       | Use                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The component has a single place for content                    | `child(...)` (no marker, lands in the root)                                                   |
| The component has several insertion points (head / body / foot) | Mark each position with `slot`, mark the content the same way                                 |
| Content must land at a specific position inside                 | A slot                                                                                        |
| Content is simply appended at the end                           | `child(...)` without a marker                                                                 |
| Build the content first, attach it later                        | Have the factory produce the marker (`span({ slot: 't-head' }, …)`), then `panel.child(head)` |

### Parts: positions the component owns (`VSlot` + `vn_slot`)

A slot is the **public** channel: the consumer names the position and delivers the content. When the
_component itself_ owns the insertion points — a card header / body / footer — use a **part**: the structure
declares the position, and the content carries a marker saying where it belongs. Delivery is plain
`child()`; **no insert helper**.

```js
// Component author: the position comes from the structure, not from the call order
export function VCardHeader() {
  return div({ vn: 'VCardHeader', vn_slot: 'header' }); // the marker = where this content lands
}

export function VCard() {
  return vNode((api, self) => {
    api.vCardHeader = (setup) => self.node().child(vCardHeader(setup));

    return div({ vn: 'VCard' }, (root) => root.child(vSlot('header')));
  });
}

// Consumer: the part command (sugar) or a marked node through child() — same route
vCard((card) => card.vCardHeader('Title'));
vCard((card) => card.child(vCardHeader('Title')));
```

- `vSlot('name')` renders a **zero-layout placeholder** (`display: contents`), so the part keeps its own
  element, class names and styles; the marker on the delivered content is a routing instruction and is
  dropped once it has landed (the DOM keeps only the placeholder's marker). The bare value goes through the
  standard `setupString` entry — the place where a position decides how to read a naked value — and
  `vSlot({ name, … })` only extracts the name, so every other key keeps the ordinary options dispatch
  (`class` / `style` / `attrs` / attributes / events). Part names are build-time facts, not live values;
- the marker is `vn_slot`, **not** `slot`: parts and public slots are separate namespaces and never
  interfere; one part placeholder holds one piece of content (delivering again replaces it);
- a part command is only sugar for `self.node().child(part)` — if the marker has no matching placeholder, the
  content behaves as ordinary unmarked content (it is appended to the component root, not dropped).

## 7.2 Component hooks: `whenMount` / `whenDestroy`

Protocol members in the same family as `whenFailed`: a property holding a function, declared on a vNode's
api.

```js
const chart = vNode((api) => {
  api.whenMount = function (host) {
    // the element has landed: measure / init third-party code
    api.instance = createChart(host.element());
  };
  api.whenDestroy = function () {
    api.instance?.dispose(); // before the subtree is torn down; your DOM is still readable
  };
  return div({ class: 'chart' }); // structure stays a plain declaration
});
```

Rules:

- **Spell it `api`, not `this`, inside a vNode**: the api object is the component instance, and it is
  already in scope for both commands and hooks, so write `api.instance = …` / `read it back as api.instance`.
  `this` happens to be the same object (the engine calls commands and hooks with the api bound), but it is
  lexically wrong the moment a command is written as an arrow (`() => this` is not the component) — one
  spelling, no binding to remember. The retired object shape was the mirror image: its methods lived in the object literal, so there `this` was the component object;
- **Both hooks receive a host context object**; the element is read through it. `host.element()` is the root
  element of a single-root component — `null` while the node has not landed, and for a multi-root component
  (there is no single element to hand over). It is a **live read, not a snapshot**, and the same context
  object goes to both hooks, so further members can be added later without changing the hook signature.
  Read the element there — do not capture a node handle in a closure variable, and keep the view expression
  free of writes, so the structure stays a declaration the compiler can read;
- **Instance state lives on the component instance** (the vNode `api`), next to the
  commands that use it: `api.instance` above is readable from every command and hook of that component;
- **Timing**: `whenMount` fires when the node really lands in the DOM, and a whole landing pass
  (`bindTo` / `mount` / `hydrate`) collects its hooks and fires them **at the end of the pass** — so by the
  time your hook runs, `host.element()` is already attached (not a detached subtree), which is what measuring
  libraries need. Placements outside a pass (a `child()` added after the mount, `mountable()` turning true,
  a `keyed` row inserted, a region re-rendering) fire right after the element is attached. The firing order
  is the landing order (children before their parent). `mountable(false)` nodes never fire until the
  condition turns true; `whenDestroy` fires **before the subtree is torn down** and is idempotent;
- **Never inside an options object**: `div({ whenMount: fn })` throws — `onXxx` is the event shorthand
  (`{ onClick: fn }`), while `whenMount` / `whenDestroy` / `whenFailed` are protocol members; a misplaced
  hook fails loudly instead of being silently bound as an event;
- **`this`** is the api for a vNode component (write `api`, not `this`);
- **Memory**: components without hooks add no fields; no `bind()`, no arrays, references released on destroy;
- **No `onUpdate`**: "update" means three different things here (region rebuild, keyed key change, a
  component replacing its own root), so there is no single semantic to attach.

## 7.3 Component identity: `vn`

Write `vn: 'VCard'` (the export name) on the component's **view root** and that member _is_ a VCard.
Both shapes are spelled the same way:

```js
function ServiceTag() {
  // shape A: thin factory, the member is the element node
  return span({ vn: 'ServiceTag' }, 'tag');
}

function RateCard() {
  // shape B (vNode): the member is the ComponentNode
  return vNode(() => div({ vn: 'RateCard' }, 'rate'));
}

function Chart() {
  // same shape as above (vNode)
  return vNode(() => div({ vn: 'Chart' }, 'chart'));
}
```

The check goes through the core identity readers, independent of the shape (`instanceof VXxx` is no longer promised):

```js
import { componentNameOf, hasComponentIdentity } from '@yoyaflow/yoya-ui/core';

page.children().filter((child) => hasComponentIdentity(child, 'ServiceTag')); // element node: reads itself
page.children().filter((child) => hasComponentIdentity(child, 'RateCard')); // component node: unwraps to its view root
page.children().map((child) => componentNameOf(child)); // several names come back as written ('VTimer VInput')
```

Rules:

- **One check**: an element member is read directly, a component member is unwrapped to its view root
  (any root of a multi-root view counts). **Identity is an object fact plus a real DOM attribute**: `vn` is
  stored on the node's identity field (the check reads it) and written as the `vn="VCard"` attribute
  (the GenUI scan and CSS scoping read that). The check follows the client tree's **objects**, so cloned
  fragments and `adopt` / `hydrate` nodes answer the same without reading the DOM back;
- **Several names**: a wrapper sharing the root writes `vn: 'VCard UserCard'`; both identities match
  (whitespace separated);
- **Class names are not identity**: identity only reads `vn`, and preset styles are scoped by `[vn="VXxx"]`
  too — a hand-written class name cannot fake it;
- **`instanceof VXxx` is no longer promised**: `defineComponentIdentity` has retired; cross-module
  recognition goes through **capability conventions** (a control has `value()` / `_collectValue()`) or
  `hasComponentIdentity`. A module checking its own sub-instances uses a module-local marker instead of
  exporting the type;
- **Only tree members count**: a factory result is not a member until it is attached (`child()` / `keyed()`);
  the check targets `children()` members;
- **Cost**: one extra `vn` attribute per component root (the byte cost the attribute migration accepts);
  renaming a component changes identity semantics, because both the check and the CSS match the name.

## 7.4 Migration notes (behaviour changes in this batch)

- **Options keys that collide with child factories now write attributes**: `div({ slot: 't-head' })` /
  `div({ title: 't' })` set attributes; they used to create `<slot>` / `<title>` child elements (a silent
  bug). Build child elements with the chained form (`root.title(...)`).
- **Setup arguments are variadic and strictly ordered**: function = builder, string/number = text,
  node/handle = child, array = child list, object = options, same-class instance = reuse. Arguments that
  used to be dropped silently (`div(null, { children: 'x' })`, `div(cb, 't')`) now take effect.
- **Component content side**: `component.child(x)` now renders **inside the component root** (previously it
  neither entered the DOM nor showed up in `children()`); multi-root components reject children.
- **`whenMount` is under review**: it may be unnecessary (a `requestAnimationFrame` or lazy init covers many
  cases); `whenDestroy` stays as the required cleanup hook.

## 8. Registering parent shortcuts

Use `registerChildFactories` to register factories on a target node class, enabling `page.vButton(...)` syntax in pages. Existing methods are not overridden by default:

```js
import { ViewNode, registerChildFactories } from '@yoyaflow/yoya-ui/core';
import { vStatusBadge } from './status-badge.js';

registerChildFactories(ViewNode, { vStatusBadge });
```

## 9. Packaging and publishing suggestions

- Publish as a standalone npm package with `yoya-ui/core` (or `yoya-ui/ui`) in `peerDependencies`.
- Export only public factories and necessary classes; ship `.d.ts` declarations as needed.
- Document the component list and the `v` prefix naming in the package docs to avoid name collisions with built-ins.

## 10. Testing suggestions

- Use Vitest + jsdom and assert from public APIs: rendered DOM, `toHTML()` output, events, and state changes.
- Do not test private fields or internal caches; use browser demos for real interactions such as overlay positioning.
