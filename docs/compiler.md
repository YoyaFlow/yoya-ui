# The compile path: build-time compiler and compiler-runtime

yoya-ui runs without a build step: the DSL, components and SSR all work at runtime. The **compile
path** is an optional accelerator — at build time it reads structurally constant repeated units
(table rows, tree nodes, menu items, virtual-scroll rows) and compiles them into a "static fragment

- position-addressed writes", so the runtime only clones the fragment, subscribes to live values and
  reconciles by minimal moves.

> **Status: beta.** Flags (`--mode` / `--thin` / `--report` / `--registry` / `--fragments`) and artifact
> shapes may still change in a minor release; not using the compiler is unaffected.

Two red lines shape it:

- **Fragments are never hand-written**: the framework's own factories produce the static fragment and
  `toHTML()` serializes it; the compiler only decides which values are static.
- **Anything it does not understand falls back**: `if` / `for` / spreads / component calls /
  factories outside the whitelist all record a bail and send the **whole shape** back to the generic
  path — no guessing, no half-written fragments.

## 1. When it pays off

**Positioning**: the compile path serves **benchmarks and visibility**, not the main path — it does not
change how the library is used, and it may not add runtime complexity. Every API is defined by its
"no compiler" usage and the compile path only _consumes_ those semantics; performance and size
trade-offs stay on the compile side (the compiler itself, the `compiler-runtime` subpath, the generated
modules), so the main entry's download path is untouched.

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
| `element` (default) | A native element | `{ el, destroy() }`       | No node objects; `keyed()` accepts these rows directly (the runtime picks the reconciler from the row product)         |
| `node`              | A `ViewNode`     | The node itself           | **Only live nodes and their ancestors**: static subtrees exist only in the fragment, so `children()` does not see them |

Which one:

- If a row is "DOM + live values", use `element` (biggest win: create 1k −57%, 10k −55% measured);
- If you need node semantics (`getChild()` handles, regions, row-level `keyed`, components as rows),
  use `node`; it is faithful by default (live nodes plus their ancestors), and `--thin` wraps only
  nodes that carry live content directly.

**The DOM is the byte-identical part**: both channels attach the whole fragment, so `outerHTML`
matches the generic path byte for byte. In the `node` channel `toHTML()` only serializes the node
tree it holds, so it is "thinner" than the generic path.

### 2.1 Wiring a list: one business snippet for both channels

`keyed()` picks its reconciler from what the row factory returns: a `ViewNode` goes through the node
tree, a `{ el, destroy }` element row is reconciled directly on the DOM (reuse per key, rebuild in
place when the data reference changes, destroy on departure, minimal moves). Business code does not
change per channel:

```js
tbody((body) => {
  body.attr('id', 'tbody');
  body.keyed(rows, buildRow); // same line for element and node rows
});
```

Mixing node rows and element rows inside one list throws (no half-in-tree, half-DOM lists). Element
rows are DOM-only and never enter the node tree, so `toHTML()` fails loudly for containers holding
them (keep the server on the generic path for that source).

### 2.2 Zero source changes: the build-time plugin

The compiler is written once with [unplugin](https://unplugin.unjs.io/) and exposes every bundler entry
(`yoyaCompile.vite(...)` / `.rollup(...)` / `.webpack(...)` / `.esbuild(...)` / `.rspack(...)` /
`.rolldown(...)` / `.farm(...)`), so it is one line in the build config you already have:

```js
// vite.config.js
import * as core from '@yoyaflow/yoya-ui/core';
import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';

export default defineConfig({
  plugins: [yoyaCompile.vite({ core })] // module-level buildRow is compiled by convention
});
```

The default rule needs **no roster**: any module handed to the plugin (with `node_modules` skipped)
whose top level declares a function named `rowName` (default `buildRow`) becomes a compile unit — set
`rowName` once if yours is named differently. Use the explicit `rows: [{ file, fn, mode, thin }]` list
only for several units per file, per-unit modes, or narrow file scoping (when given, the roster is the
only thing consulted).

The plugin renames the source function to `buildRowSource` (kept as the compiler's single source of
truth), appends a same-name wrapper that delegates to the compiled factory, and keeps the artifact in
a virtual module — nothing is written next to your source, and business code imports no generated
file. Targets are located by **AST symbol identity** (a top-level function declaration); anything
unclear is left untouched: missing target, two same-name declarations, a parameter that is not a
single identifier, or an unbuildable shape all fall back to the generic path.

The rewrite goes through `magic-string` and returns a **hires source map** (`transform` resolves
`{ code, map }`, the virtual artifact carries a map as well), so stack traces keep pointing at the
right line and column in your source.

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

The compiler ships inside `@yoyaflow/yoya-ui` (the `yoya-compiler` bin plus the `yoya-ui/compiler` subpath),
so there is no extra library to install — but it keeps its build-time dependency `@babel/parser` external
(browser artifacts never contain it) and that dependency is an **optional peer** that npm will not install
for you:

```bash
npm i -D @yoyaflow/yoya-ui @babel/parser   # "Cannot find package '@babel/parser'" means this line is missing
```

**No configuration needed**: `--core` defaults to the core that ships with the package and `--runtime`
defaults to `./compiler-runtime.js` (point it at `@yoyaflow/yoya-ui/compiler-runtime` when a bundler
resolves imports).

```bash
# Compile one shape (writes src/generated/row.js)
npx yoya-compiler \
  --file src/rows/row.js --fn buildRow --mode element \
  --core ./vendor/yoya-ui/yoya.core.min.js \
  --runtime ../../vendor/yoya-ui/yoya.compiler-runtime.min.js \
  --out src/generated/row.js

# Coverage scan: see which shapes compile and where they get stuck
npx yoya-compiler --report src --json
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
- **Target function parameters**: exactly one identifier. Destructuring / defaults / rest / extra
  parameters bail the whole shape — otherwise `data` / `api` would be collected as free identifiers
  into `scope`, the artifact would ignore its own argument and read `undefined` at runtime.
- **The artifact is not a business interface**: `plan.scope` lists app symbols only (handles /
  commands); element factories are imported by the artifact itself, and business code imports no
  generated file (the build-time plugin does the wiring).
- **`data-row-key`**: element-channel lists do not write the key mirror attribute by default; opt in
  with `createElementList(container, keyOf, { keyAttribute: 'data-row-key' })` when you need to
  locate rows by key.
- **Deterministic artifacts**: `plan.source.file` is a relative label (absolute paths are folded to
  the working directory, files outside it keep their basename), so the same source compiles to
  byte-identical output anywhere.
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

- **statically readable content is inlined at build time**: literal text, a builder callback
  (`vCard((card) => card.span('text'))`) and whitelisted element factories (`vCard(span('x'))`) land
  _in place_ in the caller's fragment at the content position, with dynamic values written positionally;
  the generated code passes `bindComponent(…, { contentInlined: true })` to tell the artifact that both
  the content and the shape live in the caller's fragment;
- **anything else is simply not inlined** (a soft fallback): dynamic values (`vCard(row.title)`), component
  calls and unrecognised shapes are never half-inlined — the content arguments are still passed to
  `bindComponent`, the artifact's content guard refuses them, and the call site rebuilds with the original
  component (content is never silently dropped, see §7's two fallback layers; the generated module's scope
  may therefore still need symbols from the content arguments);
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
