# Migrating from 0.4 to 0.5: node-level state and vStateNode removed

0.5 is a breaking release: **node-level state APIs and `vStateNode` are gone**.
State now uses the built-in Signals (`ref` / `computed`) plus rebuildable regions
driven by signals. Library components and examples were migrated on the same line;
this page is the migration map for consumers.

## Mapping

| 0.4                                                                  | 0.5                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `vStateNode({ state, render, update })`                              | a plain component object (`{ render() }`) plus `ref` / `computed`                      |
| `node.state({ count: 0 })`                                           | `const count = ref(0)` (created inside the component / page factory)                   |
| `component.setState({ n: 1 })`                                       | `n.value = 1`                                                                          |
| `component.setState((s) => ({ n: s.n + 1 }))`                        | `n.update((value) => value + 1)`                                                       |
| `update()` returning `true` to rebuild fully                         | `rebuildable(predicate?)` region that reads signals during its build                   |
| `node.setState('open', true)` + `registerStateHandler('open', …)`    | `const open = ref(false)` passed straight to `attr` / `style` / `toggleClass`          |
| `node.getBooleanState('open')` / `getStringState` / `getNumberState` | read the handle: `open.value`                                                          |
| `(s) => value` parameterized bindings (fed by `state()` / `scope()`) | pass a handle, or a zero-argument closure `() => value` (call `flush()` yourself)      |
| `component.flush()` to sync values manually                          | a signal write updates bindings; only non-signal sources need `flush()` / `flushAll()` |

## Migration steps

1. **Move component state into `ref`**: replace each `state({...})` field with
   `ref(initial)` and turn `setState` call sites into `handle.value = next`
   (or `handle.update(fn)`).
2. **Pass handles into value positions**: `attr` / `style` / `vText` / component
   props all accept handles and update in place. Delete the manual attribute,
   style and text sync code.
3. **Use regions for structure**: mark a block with `rebuildable(predicate?)`
   first, then read signals during its build (declare first, read data second).
   Writing a signal it read rebuilds the subtree, gated by the predicate.
4. **Keep exposing methods**: hold state in `ref` internally and expose chainable
   methods such as `value(next)` / `disabled(next)`; never hand the internal
   signal object to callers.
5. **Drop the old references**: remove calls and type references to
   `vStateNode`, `state()`, `setState()`, `getState()`, `getBooleanState()` /
   `getStringState()` / `getNumberState()`, `registerStateAttrs()` /
   `registerStateHandler()` and `scope()`.

## Example

Before:

```js
const Counter = vStateNode({
  state: () => ({ count: 0 }),
  render(state, component) {
    return div((box) => {
      box.span(`Count: ${state.count}`);
      box.button('+1', (button) => {
        button.on('click', () => component.setState({ count: state.count + 1 }));
      });
    });
  }
});
```

After:

```js
const Counter = {
  render() {
    const count = ref(0);
    return div((box) => {
      box.span((line) => line.child(vText(computed(() => `Count: ${count.value}`))));
      box.button('+1', (button) => {
        button.on('click', () => {
          count.value += 1;
        });
      });
    });
  }
};
```

When structure follows data, read the signal inside a region:

```js
const items = ref([]);

const list = div((box) => {
  box.rebuildable(); // signals read here become dependencies; a write rebuilds
  items.value.forEach((item) => box.addChild(item.id, div(item.name)));
});
```

## Other changes

- **Parameterized value functions are gone**: `(s) => value` only served node-level
  state and now throws when registered (`parameterized value is no longer supported ...`).
  Pass a handle or a zero-argument closure instead.
- **`scope()` is gone**: its only purpose was declaring a source for parameterized
  value functions.
- **`renderPage` no longer emits the client entry**: it used to inject
  `<script type="module" src="/client.js">` before `</body>` (path configurable via
  `{ client }`). It now injects no client script at all — the path, head vs body, and what
  runs before it are your project's decisions. Migration: add it yourself in `page.head(...)`
  with `head.link({ rel: 'modulepreload', href: '/assets/client.js' })` and
  `head.script({ type: 'module', src: '/assets/client.js' })` (`type="module"` implies defer,
  so this is safe in head; never use a plain `<script src>` without `defer`).
  See [`ssr.md`](ssr.md) §2.1.
- **DevTools events**: the `state` event went away with `vStateNode`; use
  `signal-write` (`signalId` / `previous` / `next` / `dependents`). The `region`
  event's `trigger` changed from `state` to `signal`. The `deprecated` event slot
  remains, but no API currently emits it. See [`devtools.md`](devtools.md).
- **What stays**: `rebuildable()` / `rebuild()` / `flush()` / `flushAll()` /
  `rebuildPending()` keep their semantics; `flush()` / `flushAll()` now only serve
  non-signal sources (external objects read through zero-argument closures).
