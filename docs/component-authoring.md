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

| Category                  | API                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Node classes              | `ViewNode`, `ElementNode`, `HtmlElementNode`, `SvgElementNode`, `ComponentNode`, `TextNode` (`VTextNode`)                                      |
| Factories and composition | `vText`, `createElementFactory`, `registerChildFactories`, `applyElementOptions`, `normalizeChild`, `normalizeSetupArguments`, `resolveTarget` |
| Signals                   | `ref`, `computed`, `batch`, `isSignal`, `SignalHandle`, `installSignals` (handles go straight into value positions)                            |
| i18n                      | `createI18n`, `I18nTextNode`, `i18nText`, `installI18nStringShortcut`                                                                          |

## 3. The three component shapes

Choose one of these shapes for a new component; do not introduce a structure outside the templates.

### Shape A: thin factory (no internal state, purely configured composition)

Use it whenever the component has no extra behaviour to define — **demo code follows the same rule**: when a demo only shows structure or interaction and exposes no command methods, return the ViewNode directly instead of wrapping it in `render()` just for uniformity.

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

### Shape B: object component (regular standalone component, the default)

```js
import { vRate } from '@yoyaflow/yoya-ui/ui';

export function RateCard() {
  const state = { value: 0 };

  return {
    render() {
      return vRate((rate) => {
        rate.value(state.value);
      });
    },
    value(next) {
      state.value = next;
      return this;
    }
  };
}
```

### Shape B shortcut factory: `vNode((api) => view)`

Use `vNode` when a component needs outward command methods — defining it gives you the node:

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
- `return api` inside a command is the same as returning the node; a component's own error boundary goes to `api.whenFailed = (error, info) => fallback` (same as `node.whenFailed(fn)`), and other node capabilities (`mountable()` / `rebuildable()`) chain on the returned node.
- Existing shapes A/B/C and `child(componentObject)` keep working; presentation-only components stay on shape A.

### Shape C: class node component (parent/child nesting, child instance control, or lifecycle overrides)

Class node components must export a paired `vXxx` factory and use `createElementFactory`:

```js
import { HtmlElementNode, createElementFactory } from '@yoyaflow/yoya-ui/core';

export class VStatusDot extends HtmlElementNode {
  // nested relationships and fine-grained operations
}

export function vStatusDot(first = null, second = null, third = null) {
  return createElementFactory('span', VStatusDot)(first, second, third);
}
```

> Note: the standard helpers `createComponentFactory` / `applyComponentArguments` / `themeValue` currently live in the library's `src/components/shared.js`; they will be exported from a public entry later. Until then, implement against the `core` public API as shown above.

## 4. Naming and style conventions

- Keep native names for basic HTML elements: `button()`, `div()`, `input()`.
- Compound component factories use the `v` prefix with PascalCase names: `vButton`, `vCard`, `vStatusBadge`.
- **Class name contract** (built-in components, enforced by `className-contract.test.js`):
  - Shared marker: every component root carries `yoya-component`.
  - Component and part classes: `yoya-v<name>` (root, e.g. `yoya-vcard`), `yoya-v<name>-<part>` (part, e.g. `yoya-vcard-header`), `yoya-v<name>--<modifier>` (modifier, e.g. `yoya-vcarousel-arrow--prev`).
  - Shared/utility classes: `yoya-<feature>-<part>` (e.g. `yoya-layout`, `yoya-icon`, `yoya-control-clear`) only for capabilities that do not belong to one component.
  - State always uses kebab-case `data-*` attributes (`data-variant`, `data-open`); class names do not carry state.
  - Dynamic class names only use two templates: `yoya-v${name}-<part>` and `yoya-${kind}`.
  - Preset rules must be scoped from the root class (no orphan part selectors), so replacing the root class detaches the whole subtree from preset styles.
- Third-party components should use their own class prefix (e.g. `acme-status-badge`) to avoid conflicts with built-in styles.
- Prefer theme variables for colors and spacing: `var(--yoya-<token>, fallback)`. The theme root is `:root, [data-yoya-theme]` (see `yoya.ui.css`).

## 4.1 Style customization and theming

- Preset styles must be written from the root class scope (`.yoya-v<name> ...`) so users can call `replaceClassName('yoya-v<name>', 'my-class')` to strip presets and take over with custom CSS.
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

- Values: `const count = ref(0)`; the handle can be passed to `attr` / `style` / `vText` / component props. Writing `.value` (or `handle.update(fn)`) updates the binding in place without rebuilding DOM or losing focus. Derived values use `computed(fn)` (read-only, lazy, cached).
- **This is the only reactive model**: there is no deep proxy — `obj.field = x` does not notify (replacing the whole object does). To make a field update, make that field a handle; for list row models see the skill's state-module section (hot fields as handles plus `apply()` merging by key).
- Structure: `rebuildable(predicate?)` marks a node as a rebuildable region; signals read inside become its dependencies and drive predicate-gated rebuilds. Call `rebuild()` to force one.
- Text: pass a handle for state-driven text — `vText(count)`, `child(count)` and `div(count)` (a handle in the factory's setup position, equivalent to `div((el) => el.child(count))`) are equivalent; only wrap in `computed(fn)` when the value is derived. When you need imperative in-place replacement, keep a `vText()` handle and call `textContent(next)` (replaces, idempotent). **The node-level `text()` was removed**: append with `child(content)` (repeated appends stack), and "set the label" with a `vText()` handle plus `textContent(next)`. Component-level `text()` (`vBadge` / `vProgress` / `vMenu`, …) and SVG's `<text>` `text()` are separate APIs and still work.
- Expose methods, not handles: keep internal state in `ref`, and expose chainable methods such as `value(next)` / `disabled(next)` instead of handing the signal object to callers.

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
- Region content is produced by its own setup. A rebuild **clears the children and re-runs that setup**, so DOM identity inside the region is not preserved: focus, selection, inner scroll position and third-party instances attached to elements are rebuilt. Siblings outside the region keep their DOM.
- The predicate only answers "should this rebuild be paid for this time". When it returns false, bound values are written back and the rebuild is recorded as pending (`rebuildPending()`); structure stays untouched. Put data conditions inside the setup, not in the predicate.
- Value bindings accept exactly two sources: a **signal handle** (recommended) or a **zero-argument closure** `() => value` (a reader). Both run through the same binding pipeline: the closure is evaluated once at build time, and **any signal it reads becomes a dependency**, so writing that signal re-evaluates it; when it reads plain variables, call `flush()` yourself to re-evaluate. The parameterized form `(s) => value` was removed together with node-level state: it throws when registered and the types reject it. A region rebuild releases the previous bindings and the new ones take effect immediately.
- **Component props take literals and signal handles only** (`vInput({ value: name })`): props are configuration slots where functions carry other meanings (`onChange` / `render`), so a zero-argument closure throws when the component is built instead of being silently stringified. For text, wrap readers in `vText(fn)` — `child(fn)` is a component render slot.
- Declaration order: call `rebuildable()` first, then write value functions and other registrations.
- Do **not** put one-off side effects (third-party instance creation, requests, analytics) in a region setup. `bindDocumentEvent` / `bindWindowEvent` are reset across rebuilds by the engine; timers must be registered through `registerRegionCleanup(fn)`. To bind explicitly to a node, use the node methods `ele.bindWindowEvent(type, handler)` / `ele.bindDocumentEvent(...)` / `ele.bindAnimationFrame(cb)` / `ele.bindAnimationFrameLoop(cb)` — destroy() unbinds or stops the frames automatically (`stopAnimationFrameLoop()` stops a loop early); the standalone functions keep their original manual-unbind usage.
- Every region subscribes to its own dependencies: a signal read inside it triggers a rebuild (reported by devtools as `trigger: 'signal'`); nested regions subscribe independently.
- **List coordination**: `node.keyed(rows, keyFn, build, options?)` drives items from a signal — rows whose key and reference are unchanged keep their nodes, changed rows rebuild in place, and reorders move nodes with identity preserved. A fourth argument declares the **row-level update protocol**: `equals(prevRow, nextRow)` returning true counts as unchanged (the node is reused), otherwise `update(node, prevRow, nextRow)` rewrites that row in place (node identity preserved), and only when neither is given is the row replaced. `equals` wins when both are supplied. Use the `insertBefore(key, child, beforeKey)` / `insertAfter(key, child, afterKey)` / `moveBefore(key, beforeKey)` / `moveAfter(key, afterKey)` / `replaceChild(key, child)` primitives for custom strategies.
- **Conditional attachment**: `panel.mountable(cond)` is the single public entry — the condition accepts a ref/computed handle, a boolean or a zero-argument closure, and **defaults to always attached (`true`) when omitted**; it rests inertly on the child, and the parent adopts it at tree entry. Calling `mountable()` again on an attached node replaces the condition immediately (closure changes refresh via the **parent** `flush()`). False detaches the child element from the document while keeping the child ViewNode and its state alive; true reattaches it at its child slot, and SSR omits it while the condition is false. `node.isMounted()` reports the latest committed state of its own mount condition; "is the element in the document right now" is `node._el?.isConnected`. Together with `display` toggling (invisible but present) and `rebuildable()` (destroy and rebuild) it forms the third tier: absent but alive. The binding is registered on the parent while the condition lives in the child's own value unit (no parent pointer); the `div({ mountable: cond })` config form shares the same adoption path.
- Every region subscribes to its own dependencies: a signal read inside it triggers a rebuild (reported by devtools as `trigger: 'signal'`); nested regions subscribe independently. Writing several signals inside `batch()` rebuilds a multi-source region once, synchronously at the end of the batch; use `rebuildScheduled()` to check whether a signal-triggered rebuild is queued. Writes outside a batch still rebuild synchronously, and a dependency that changes again during a rebuild re-runs it afterwards instead of being dropped.

- To keep focus or third-party instances, leave that part outside the region or use value bindings, which update in place without rebuilding DOM.
- **Error boundary**: `node.whenFailed(handler)` declares a subtree boundary — returning a node replaces the subtree with a fallback, returning nothing only reports and keeps the current state; component objects may define a `whenFailed(error, info)` member next to `render()`, which ComponentNode mounts automatically. Captures are never silent: console.error always fires and a devtools 'error' event is emitted when enabled. The error walks up the parent chain to the nearest boundary at failure time, so it is independent of declaration order, nesting depth, runtime insertion and subtree moves; that boundary owns the capture and never forwards it further, and a throwing handler propagates outward. When nothing is returned during a render / build phase, the failing child is marked and skipped on later attempts (no repeated failures or logs); re-attaching it or rebuilding its region clears the mark so it gets one more chance. Without a boundary, errors propagate unchanged (fail fast). Degrading a region node runs as one region build, so it never trips the region guard.

## 7. Composition, events, and lifecycle

- `child(...)` accepts `ViewNode`s, component objects (wrapped in `ComponentNode` automatically with their `render()` cached), or strings/numbers.
- `on(eventName, handler, options)` binds real DOM events and cleans them up automatically in `destroy()`.
- A component object only needs a `render()` returning a `ViewNode` to be used by `child()`; class components follow the `renderDom` / `bindTo` / `destroy` lifecycle.

### 7.1 Lifecycle

1. **Declare (build time)**: a factory call creates the node; `attr` / `style` / `on` / `child` inside `setup` only write snapshots and never touch the DOM. Component objects are wrapped in a `ComponentNode` that resolves and caches `render()` on first render. Build-time scopes (`access`, `context`, `i18n`) are captured here.
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
- Blocks use the same shapes as exported components (shape A returning a ViewNode, or shape B returning `{ render() }`). Avoid anonymous fragments and positional names such as `renderTop` / `BlockA`; two or three levels are usually enough.

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
