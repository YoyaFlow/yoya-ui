# The compile path: build-time compiler and compiler-runtime

yoya-ui runs without a build step: the DSL, components and SSR all work at runtime. The **compile
path** is an optional accelerator — at build time it reads structurally constant repeated units
(table rows, tree nodes, menu items, virtual-scroll rows) and compiles them into a "static fragment

- position-addressed writes", so the runtime only clones the fragment, subscribes to live values and
  reconciles by minimal moves.

Two red lines shape it:

- **Fragments are never hand-written**: the framework's own factories produce the static fragment and
  `toHTML()` serializes it; the compiler only decides which values are static.
- **Anything it does not understand falls back**: `if` / `for` / spreads / component calls /
  factories outside the whitelist all record a bail and send the **whole shape** back to the generic
  path — no guessing, no half-written fragments.

## 1. When it pays off

The real win is in **repeated units**: the same structure built many times, where each row saves node
objects, binding registration and attribute reconciliation.

| Scenario                                 | Win    | Notes                                     |
| ---------------------------------------- | ------ | ----------------------------------------- |
| Long list rows (1k–10k)                  | Large  | Saves on every create / replace / append  |
| Tree nodes, menu items, table cells      | Medium | Constant structure, many repetitions      |
| Skeleton structure (built once)          | Small  | Folding something built once saves little |
| Structure that follows data (v-if style) | None   | Bails and uses the generic path           |

## 2. Two channels

The artifact's shape follows `mode`:

| Channel             | What a row is    | Generated factory returns | Node tree                                                                                                              |
| ------------------- | ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `element` (default) | A native element | `{ el, destroy() }`       | No node objects (pair it with your own list reconciler such as `createElementList`)                                    |
| `node`              | A `ViewNode`     | The node itself           | **Only live nodes and their ancestors**: static subtrees exist only in the fragment, so `children()` does not see them |

Which one:

- If a row is "DOM + live values", use `element` (biggest win: create 1k −57%, 10k −55% measured);
- If you need node semantics (`getChild()` handles, regions, row-level `keyed`, components as rows),
  use `node`; it is faithful by default (live nodes plus their ancestors), and `--thin` wraps only
  nodes that carry live content directly.

**The DOM is the byte-identical part**: both channels attach the whole fragment, so `outerHTML`
matches the generic path byte for byte. In the `node` channel `toHTML()` only serializes the node
tree it holds, so it is "thinner" than the generic path.

## 3. What compiles / what falls back

Compiles (constant structure, classifiable values):

| Source                                                          | Result                                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `line.attr('name', 'literal')`                                  | Baked into the fragment (static)                                                                                     |
| `line.attr('name', row.value)`                                  | Dynamic attribute write + live subscription                                                                          |
| `td({ attrs: { id: row.id } })`                                 | Dynamic option value (same path as a hand-written `attr`)                                                            |
| `line.className('a b')`                                         | Baked into the fragment                                                                                              |
| `line.toggleClass('on', expr)`                                  | Class binding (`bindClass`)                                                                                          |
| `line.style('color', 'red')`                                    | Baked into the fragment                                                                                              |
| `line.style('color', row.tone)`                                 | Dynamic style write (`node` channel: `node.style`)                                                                   |
| Form C skeleton (`super('tag')` + straight-line `this.*` calls) | Compiles to a skeleton fragment; constructor params are content positions (usages with content fall back at runtime) |
| `cell.child('text')`                                            | Baked into the fragment                                                                                              |
| `cell.child(String(row.id))`                                    | Positional text write                                                                                                |
| `cell.child(vText(handle))`                                     | Text binding (handle / zero-arg reader / plain value)                                                                |
| `line.on('click', handler)`                                     | Plain `addEventListener`                                                                                             |
| `cell.span(...)` / `cell.td(...)`                               | Recursively compiled child elements (whitelist)                                                                      |

**Build-time constant folding**: a static value is not limited to a literal. Three shapes that
"compute to the same value at build time" also fold — a module-level `const X = 'literal'`
(including template concatenation), the library constant `componentClass`, and the library theme
helpers `themeValue()` / `themeBorder()` (their arguments must be static too). Folding calls the
**same implementation**, it does not copy the formula; and only these names imported from
`components/shared.js` fold — a local function of the same name, or an imported name shadowed by a
parameter, is left alone (it bails as before), because guessing a value is exactly how an unknown
value would end up baked into a static fragment.

A static attribute value is handed to the framework's `attr` semantics **unchanged**: `null` /
`undefined` / `false` remove the attribute and `true` writes it as its own name (`data-x="data-x"`).
The compiler does not `String()` it or substitute an empty string, which would desynchronise the
fragment from the generic path.

Falls back (records the reason, the whole shape uses the generic path):

| Construct                                                        | Reason                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `if` / `for` / `while` statements                                | Structure is no longer constant                                                                                                                                                            |
| `...spread` arguments                                            | Arity is unknown at build time                                                                                                                                                             |
| `child(vCard(...))` and other component calls                    | A component is another compilation unit (see `docs/component-authoring.md`); this round does not guess                                                                                     |
| `child(() => …)`                                                 | Component slot / deferred content                                                                                                                                                          |
| Factories outside the whitelist (`vNode`, third-party factories) | Not an element factory; compiling it as an element would be a silent semantic bug                                                                                                          |
| Dynamic attribute names, multi-argument `attr`                   | Cannot be classified                                                                                                                                                                       |
| A computed whole class name (`class: row.tone`)                  | Class order / de-duplication are semantics: use `toggleClass(name, value)` for state classes                                                                                               |
| A dynamic style value in the `element` channel                   | Static styles stay in the fragment while dynamic ones can only go through CSSOM, which serializes differently from `toHTML()`; use a literal / `toggleClass`, or this row's `node` channel |
| An array or object in a text position (`child([a, b])`)          | The generic path flattens arrays into several children and throws on objects, so neither is a piece of text; the runtime throws too instead of writing `String(x)`                         |
| A boolean literal in a text position (`child(false)`)            | The generic path throws a TypeError from `child()`, so compiling `"false"` would be a silent miscompile                                                                                    |
| Live text inside a static subtree                                | No live ancestor to carry the binding (`node` channel)                                                                                                                                     |

The element whitelist is **derived from the factories the core actually registers** (`htmls` +
`svgs`): add a tag to the core and the whitelist follows; components are never mistaken for elements.

The table above comes from `--report`: in this repo `src` is 427 files / 2 candidates / 1 compiled;
the three benchmark row directories (`yoya-ui-core` / `-keyset` / `-runtime`) have 1 candidate each,
100% compiled. The last two rows (dynamic styles, computed whole class names) hit **zero** rows in
the current corpora — they cover "value comes from data" in application code: what cannot be
classified falls back rather than being compiled into a static fragment. The in-repo numbers are
watched by the coverage baseline in §4.1 (a fallback fails the build).

## 4. Usage

### 4.1 Command line

```bash
# Compile one shape (writes src/generated/row.js)
node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js \
  --file src/rows/row.js --fn buildRow --mode element \
  --core ./vendor/yoya-ui/yoya.core.min.js \
  --runtime ../../vendor/yoya-ui/yoya.compiler-runtime.min.js \
  --out src/generated/row.js

# Coverage scan: see which shapes compile and where they get stuck
node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --report src --json
```

That is how the coverage baseline is wired in this repo: `npm run build` ends with
`scripts/compiler-coverage.mjs`, which prints the candidate / compiled / bail histogram for `src` and
`src/examples` into the build log and then compares it against
`scripts/compiler-coverage.baseline.json`. The gate is **per file**: new candidates and newly
compilable shapes are never blocked (coverage may only grow), while a file that compiled when the
baseline was taken must not fall back — the bail reason is printed with it. When a shape changes on
purpose, refresh with `npm run report:compile:write` and say why in the commit message.

Exit codes: `0` success, `1` usage error, `2` **shape fell back to the generic path** (not an
error, but build scripts should be able to tell — if you gate on "this shape must compile", fail
on `2`).

### 4.2 Programmatic API

```js
import { compileFile, reportCoverage } from '@yoyaflow/yoya-ui/compiler';
import * as core from '@yoyaflow/yoya-ui/core';

const result = compileFile({
  file: 'src/rows/row.js',
  fn: 'buildRow',
  mode: 'element',
  out: 'src/generated/row.js',
  core,
  runtime: '@yoyaflow/yoya-ui/compiler-runtime'
});

if (!result.compiled) {
  console.log('this shape uses the generic path:', result.bails);
}
```

`result.plan` is the fragment plus its manifest (`html` / `liveNodes` / `slots` / source), and
`result.scope` lists the symbols the generated module expects from its caller.

Coverage can be measured programmatically too: `reportCoverage({ root, core })` scans a directory,
`coverageBaselineOf(reports)` turns the result into a committed, diffable baseline, and
`compareCoverageBaseline(baseline, reports)` calls only "compiled in the baseline, falls back now" a
regression while listing newly compilable files — the repo's own gate (§4.1) is their caller.

### 4.3 The generated module and the scope contract

```js
// Generated by @yoyaflow/yoya-ui/compiler from the source AST — do not edit.
import { bindClass, bindText, cloneFragment, pushOff, setAttr } from 'yoya-ui/compiler-runtime';

export const plan = { version: 1, mode: 'element', source: { file, fn }, html, liveNodes, slots };

export function createRowFactory(scope) {
  const { computed, removeRow, selectedId } = scope;
  return function buildRow(row) {
    const el = cloneFragment(plan.html);
    const offs = [];
    // …positional live writes / event wiring…
    return {
      el,
      destroy() {
        /* idempotent unsubscribe */
      }
    };
  };
}
```

Callers pass the symbols listed in `plan.scope` on a scope object (your handles and functions; the
`node` channel also needs the element factories). `destroy()` is idempotent — calling it twice never
unsubscribes twice.

## 5. Runtime hooks (`yoya-ui/compiler-runtime`)

| Hook                                   | Purpose                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `cloneFragment(html)`                  | One `<template>` per shape, `cloneNode(true)` per instance                          |
| `adopt(node, el, texts)` / `bindChild` | `node` channel: attach the fragment to the node and activate bindings               |
| `bindText` / `bindClass` / `setAttr`   | `element` channel: subscribe and write in place; plain values write once            |
| `pushOff(offs, off)`                   | Collect unsubscribe functions (keeps generated code one statement per line)         |
| `createElementList(container, keyOf)`  | Element-row reconciliation: reuse / rebuild in place / remove / minimal moves (LIS) |

`setAttr` shares one implementation with the core `applyAttribute` (`null` / `undefined` / `false`
remove the attribute, boolean attributes are written as their own name), so there is never a second
set of attribute rules.

A one-shot text write (`bindText` / `bindChild` with a non-handle value) throws on nodes, arrays and
objects: the generic path treats them as text, as several children and as an error respectively, so
writing `String(x)` would be silent semantic drift.

## 6. Contract and boundaries

- **Equivalence gate**: compiled output and the generic path produce byte-identical DOM, and live
  values, events and destroy behave identically (the cases ship with the repo — run them when you
  touch the compiler).
- **Any bail falls back wholesale**: losing one node from the fragment would be a silent semantic
  bug, so there is no partial compilation.
- **Zero cost on the main entry**: the hooks live in a dedicated subpath; if you never import it
  there is no compile path and no extra bytes. `yoya.compiler` (build time) runs on Node only —
  browser artifacts never contain the compiler.
- **SSR / hydrate**: fragments share their source with `renderToString()` (attributes and styles are
  sorted by name, see [`ssr.md`](ssr.md) §8.1); the server never needs the compiler, and the node
  channel adopts existing DOM the same way hydrate does.
- **No build environment**: skip the compiler and today's generic path runs, with unchanged
  behaviour and size.
- **Regions / row-level `keyed` / component slots**: dynamic structure, always bails to avoid
  semantic drift.
- **Coverage baseline gate**: the `src` / `src/examples` baselines go into the build log and are
  enforced per file (see §4.1).

## 7. Component-level fragment linking (tier 1: leaf components)

Components can be compile units too: a component's **view expression** is compiled into
"fragment + positional writes" and registered in the component registry, while call sites only
**link** — `cell.child(StatusDot(row.dot))` becomes "take fragment + instantiate" when the registry
has it, and keeps today's runtime construction when it does not (dynamic lookups, cross-package,
unregistered).

```js
import { buildComponentRegistry } from '@yoyaflow/yoya-ui/compiler';

buildComponentRegistry({
  entries: [
    { file: 'src/components/status-dot.js', export: 'StatusDot' },
    { file: 'src/components/status-tag.js', export: 'StatusTag' }
  ],
  dir: 'src/generated/components',
  core
});
```

The artifacts are ordinary committable files: one instantiation module per component
(`bind(root, values)` plus a generic-path `render(...)` fallback), a registry module
(`components[<key>]`), and a **pure-data** registry JSON (key = module path#export, carrying `hash`,
the fragment ops and the fragment HTML). Caller compilation takes `components: <registry data>` and
the generated module imports only the registry module.

What tier 1 compiles (leaf only, constant structure):

| Shape              | Source                              | Notes                                                                                                  |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A thin factory     | `return span((dot) => …)`           | The view expression is carried over verbatim                                                           |
| B object component | `return { render() { return …; } }` | Only a single `render` member (components that must keep their object / commands are not compiled yet) |
| vNode              | `return vNode(() => …)`             | setup only returns the view, never touches the api (commands as above)                                 |

Not compiled (so call sites keep using the generic path): container components that take children
(next tier, together with ticket 42's slots), components with state or command methods, structural
branching, components using module-private helpers (non-import bindings), cross-package components.

A component compile unit carries the original module's `import` declarations and module-level `const`
declarations into the synthetic source: build-time constant folding (module literals,
`componentClass`, `themeValue` / `themeBorder` — see §3) reads them, otherwise only hard-coded
literals inside a component could ever compile. Functions and classes outside the view are not
analysed.

**Two layers of fallback**: a build-time miss means the call site is not linked at all; a runtime
`hash` mismatch (registry and caller from different builds) or a failed shape check rebuilds that
subtree from the original component module, so "fragment does not match the data" can never happen
silently. `hash` is the content hash of the component function source.

Known reporting difference: the generic path's DOM attribute order follows the builder's **call
order**, while the compiled path uses `toHTML()`'s **canonical order** (attributes sorted by name,
[`ssr.md`](ssr.md) §8.1). Same semantics, possibly different `outerHTML`; the compiled path is byte-identical to the
framework's canonical serialization, and the ordering difference is recorded in ticket 41.

### 7.1 Form C skeletons (tier 1: usages without content)

Class-node components (form C) can become compile units without touching their source: a factory written as
`return createComponentFactory(VCard, …)` resolves to "the compile unit is `VCard`'s constructor", and the
constructor is read exactly like a setup callback — `super('<literal tag>')` picks the tag, then only
**straight-line node calls starting from `this`** are allowed (`className` / `attr` / `style` / `styles` /
`child` / `on` / `toggleClass`…), with values that are literals or foldable (`themeValue` and friends).

A constructor parameter appearing in `applyComponentSetup(this, setup)` (or `this.child(setup)`) is recorded
as a **content position**:

- the artifact only covers usages **without content** — `bind` carries a content guard and returns `null`
  as soon as the caller passes content, so the call site falls back to the generic path (content is never
  silently dropped, see §7's two fallback layers);
- class **fields**, non-straight-line statements (`if` / assignments / module-private helper calls),
  dynamic values and events all bail: they reference instance state (`this._x`) and the artifact has no `this`.

Measured in this repo: `vCard` / `vCardHeader` / `vCardBody` / `vCardFooter` / `vThead` / `vTbody` /
`vTfoot` skeletons compile, and their fragments are **byte-identical** to `new VCard().toHTML()`; `vTh` /
`vTd` (module-private `applyTableCellStyles`), `vTr`, `vMenuDivider` / `vSymbolButton` fall back with a
recorded reason.

## 8. Related documents

- [`component-authoring.md`](component-authoring.md): the three component shapes and third-party contracts;
- [`ssr.md`](ssr.md): serialization rules, hydrate and adopting existing DOM;
- [`performance.md`](performance.md): official benchmark numbers and tier conclusions;
- [`agents.md`](agents.md): reading order and ground rules for AI assistants.
