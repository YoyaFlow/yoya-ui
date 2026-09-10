# yoya-ui DevTools

> Status: released. DevTools are off by default and are not part of the production main entry; import them from the separate subpath and enable them explicitly when debugging. See the reference panel in the examples site under "Guides -> DevTools".

## Separate entry

```js
import {
  disableDevtools,
  enableDevtools,
  getDevtoolsDom,
  getDevtoolsScope,
  getDevtoolsSnapshot,
  isDevtoolsEnabled,
  subscribeDevtools
} from '@yoyaflow/yoya-ui/devtools';
```

The main entries (`@yoyaflow/yoya-ui`, `@yoyaflow/yoya-ui/core`) do not export these symbols. DevTools runtime logic only loads with the separate subpath; the main package render path keeps only a disabled-by-default bridge guard, so rendering is unaffected when devtools is not imported.

## Quick start

```js
enableDevtools();

const stop = subscribeDevtools((event) => {
  console.log(event.seq, event.type, event.nodeId);
});

const snapshot = getDevtoolsSnapshot(pageRoot);
const element = getDevtoolsDom(snapshot.id); // locate the real DOM

stop();
disableDevtools();
```

## View tree snapshot

`getDevtoolsSnapshot(root)` returns a plain-data snapshot that can be drawn as a view tree matching the page:

- `kind`: `element` / `text` / `component` / `view` / `root`;
- `id`: stable node id, unchanged across snapshots of the same node;
- `tagName` / `attrs` / `text`: element tag, attributes (including mirrored `class`), and text;
- `children`: recursive child snapshots; multi-root fragments are fully represented under component boundaries.

`getDevtoolsDom(id)` returns the rendered real DOM (element or text node) by id, or `null` when not rendered or already destroyed.

## Event stream

`subscribeDevtools(listener)` returns an unsubscribe function; listener errors do not interrupt rendering. Every event carries `seq` (monotonic) and `nodeId`:

| type      | meaning                       | extra fields                    |
| --------- | ----------------------------- | ------------------------------- |
| `commit`  | element first render          | `kind: 'mount'`                 |
| `destroy` | node destroyed                | —                               |
| `attr`    | attribute/class changed       | `name`, `previous`, `next`      |
| `style`   | inline style changed          | `name`, `previous`, `next`      |
| `child`   | child added/removed/reordered | `added`, `removed`, `reordered` |
| `text`    | text changed                  | `from`, `to`                    |
| `state`   | `vStateNode` state changed    | `changed`, `state`, `handling`  |
| `region`  | rebuildable region handled    | `action`, `trigger`             |

`state` events describe the path the change took: `update` (handled by the update callback), `bindings` (function-value bindings written back), `rebuild` (view root rebuilt), or `pending` (component not mounted).

`region` events describe how a marked region was handled: `action` is `rebuild`
(the subtree was rebuilt) or `flush` (only bound values were written back and the
structure stayed as-is); `trigger` is `manual` (an explicit `rerun()`) or `state`
(driven by a state change).

## Scope details

`getDevtoolsScope(id)` returns node details:

- `access`: the resource code declared by the node and the effective `permissionState` (`active` / `readonly` / `hidden`);
- `context`: the Context layers visible when the node was built while devtools was enabled;
- `i18n`: the instance language and key of translated text nodes.

Nodes built while devtools is disabled do not capture Context, and behavior and memory are unaffected.

## SSR and production notes

- DevTools are for browser development only; `toHTML`/hydrate output is unrelated to devtools, and toggling it does not affect SSR determinism.
- Do not call `enableDevtools()` in production or in server processes. Production code should only import from the separate subpath on demand and leave devtools off.
- Node ids and events exist only within a devtools session; they are not written to HTML and are not shared across requests.

## Boundaries

The first release does not include time travel, cross-session persistence, or React DevTools-level UI. Those capabilities build on the subscribable event stream and snapshots for extensions and the community.
