# Access Control

yoya-ui has read/write access built into the base node layer. **Components only declare bare resource codes**; the read/write level is decided entirely by what the user holds. The render pipeline hides, disables, or enables nodes automatically, and SSR (`toHTML`) behaves the same as real DOM rendering (`renderDom`).

> Frontend access is an experience layer (show/hide, read-only, disabled). Real security enforcement must happen on the backend. Nodes without an `access` declaration are always allowed (fail-open), so existing code is unaffected.

## What the user holds (authorization side)

The permission strings a user holds decide the level. **A bare code means read + write by default**, matching mainstream permission frameworks:

| User holds             | Meaning                                  |
| ---------------------- | ---------------------------------------- |
| `system:member` (bare) | **read + write** (full by default)       |
| `r.system:member`      | **read-only** (can see, cannot change)   |
| `w.system:member`      | **read + write** (explicit, equals bare) |

Decision rules:

```text
canRead(code)  = holds bare code | r.code | w.code
canWrite(code) = holds bare code          | w.code
super_admin (roles hit superAdmins)       -> allow everything
```

## What components declare (resource side)

Components declare only a **bare resource code**, never a prefix:

```js
vInput({ name: 'name', access: 'system:member' }); // bare code only
button('Delete').access('system:member:remove');
```

The engine decides based on what the user holds:

- No read permission -> not rendered (also not output by SSR).
- Read without write (user holds only `r.`) -> shown and read-only/disabled for interactive controls.
- Write (user holds the bare code or `w.`) -> fully editable and actionable.

## Effect comparison

| User holds             | Component declares | Result                              |
| ---------------------- | ------------------ | ----------------------------------- |
| none                   | `system:member`    | not rendered (not in SSR output)    |
| `r.system:member`      | `system:member`    | shown; interactive control disabled |
| `system:member` (bare) | `system:member`    | editable and actionable             |
| `w.system:member`      | `system:member`    | editable and actionable             |

## Scope: block-level read-only and nearest override

Permission scope propagates **top-down** during rendering: declare `access` on a container (`vForm` / card), and elements inside that do not declare their own scope inherit it.

```js
vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name' })); // no write permission -> disabled
  form.child(vInput({ name: 'email' })); // same scope, read-only together
});
```

**Nearest override:** once a child declares its own `access`, that declaration wins over the ancestor scope; with multiple levels, the declaration closest to the operation point applies.

```js
vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name' })); // inherits form scope (read-only)
  form.child(button('Export').access('system:export')); // nearest: judged by its own code
});
```

> An ancestor scope that cannot be read hides the whole block and its subtree is not rendered. Nearest override mainly affects "visible but read-only" decisions.

## Usage examples

**SPA (single user):** call `installAccess(...)` once at login; later nodes do not need any wrapping scope.

```js
import { createAccess, installAccess, vForm, vInput, button } from '@yoyaflow/yoya-ui';

installAccess(createAccess({ permissions: ['system:member', 'w.system:member:remove'] }));

vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name', value: 'Ada' }));
  form.child(vInput({ name: 'email' }));
});
manualBtns.child(button('Delete').access('system:member:remove'));
```

**SSR (per request):** pass `access` to the entry; the entry applies it as the render scope internally, so you do not write `withAccess` by hand.

```js
import { renderToString } from '@yoyaflow/yoya-ui/router';

renderToString(page, {
  state,
  access: createAccess({ permissions, roles })
});
```

## The three default switches (executed uniformly by the render pipeline)

| Situation                                    | Result                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| No `access` declared                         | allowed; behavior identical to before                                            |
| Bare code declared, no read permission       | not rendered (frontend and SSR output both omit it)                              |
| Bare code declared, read but no write (`r.`) | shown; interactive controls disabled (`disabled` / `readonly` / `aria-disabled`) |
| Bare code declared, write held (bare / `w.`) | shown and fully editable                                                         |

The write gate **inherits downward** from the declaring node: when a container's resource is denied write, its inner form controls and buttons are disabled too (compound controls such as `vInput` also disable their inner `input`).

## Component integration points (for component authors)

Every component can override two standard hooks on `ViewNode`:

- `_permissionState()`: returns `'active' | 'readonly' | 'hidden'`. The base implementation is normally sufficient.
- `_applyAccessState(state)`: applies "read-only / disabled" in the component's own semantics. `vInput` / `vButton` override it to call their own `disabled()`, keeping styling and interaction state correct; native elements fall back to `disabled` / `readonly` / `aria-disabled` in the base class.

## SSR, per-request isolation, and globals

- **SPA:** `installAccess(access)` sets the global context once; nodes render directly against it.
- **SSR:** `renderToString / renderPage / mount / hydrate / hydrateOrMount` accept `options.access`; the entry renders within the request scope (same shape as i18n) and never shares state across requests.
- Nodes built inside `withAccess(access, build)` capture that permission context and render against it later, so you can build "allowed / not allowed" instances side by side without interference.
- `withAccess` remains for wrapper layers and advanced framework embedding; normal usage does not need it.

## API

```js
createAccess({ permissions?, roles?, superAdmins? })  // per-request context
  .canRead(spec) / .canWrite(spec) / .has(spec) / .isSuper()
  .setPermissions(next) / .subscribe(listener)

installAccess(access)       // SPA: set the global context once
withAccess(access, build)   // scoped build (advanced / wrapper layers)
currentAccess()             // read current context (scope first, then global)

renderToString(page, { access })   // SSR entry auto-scopes options.access
parseAccessSpec(spec)               // components pass bare codes; parses the resource code
stripAccessCode(spec)               // strips r./w. prefix, returns the resource code

node.access(code)           // declare a bare resource code (object config accepts an access key)
```
