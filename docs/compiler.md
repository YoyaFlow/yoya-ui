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

`keyed()` picks its reconciler from what the component returns: a `ViewNode` goes through the node
tree, a `{ el, destroy }` element row is reconciled directly on the DOM (reuse per key, rebuild in
place when the data reference changes, destroy on departure, minimal moves). Business code does not
change per channel:

```js
tbody((body) => {
  body.attr('id', 'tbody');
  body.keyed(rows, Row); // same line for element and node rows
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
  plugins: [yoyaCompile.vite({ core })] // compile units = component boundary (view-returning factories)
});
```

The compile unit is **yoya-ui's own component boundary**, so no roster is needed: inside any module
handed to the plugin (`node_modules` skipped), a top-level factory that returns a UI view is a compile
unit — PascalCase components (`Card`, `StatusPill`) and camelCase shortcut factories (`Row`,
`vBadge`) alike; helpers, commands and data helpers are left alone. The channel is inferred from
**usage**: a factory becomes an `element` unit (fastest) only when every reference to it is the row
factory slot of a `keyed(...)` call; anything else — `const chip = Card(…)`, `child(Card(…))`, passing
it to another function — becomes a `node` unit, because an `element` product is `{ el, destroy }` and
stops being a `ViewNode` the moment it is used as a value (the generic path would throw, and the
compiled path has to match). A ViewNode works in both `child` and `keyed`. The explicit
`units: [{ file, component, mode, thin }]` list stays as an escape hatch for internal special functions (when
given, only the roster is consulted).

A component body may carry **declarations / expression statements before the `return`** — storing a
component instance in a variable and using it inside `render()` is the mainstream shape on doc pages.
The view itself must still be a single `return <factory>(…)`; control flow or several returns before
it are left alone (an early return makes "the view" a runtime decision).

The plugin renames the source function to `RowSource` (kept as the compiler's single source of
truth), appends a same-name wrapper that delegates to the compiled factory, and keeps the artifact in
a virtual module — nothing is written next to your source, and business code imports no generated
file. Targets are located by **AST symbol identity** (a top-level function declaration); anything
unclear is left untouched: missing target, two same-name declarations, or an unbuildable shape all
fall back to the generic path.

The rewrite goes through `magic-string` and returns a **hires source map** (`transform` resolves
`{ code, map }`, the virtual artifact carries a map as well), so stack traces keep pointing at the
right line and column in your source.

## 3. What compiles / what falls back

Compiles (constant structure, classifiable values):

| Source                                                          | Result                                                                                                                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line.attr('name', 'literal')`                                  | Baked into the fragment (static)                                                                                                                                                              |
| `line.attr('name', row.value)`                                  | Dynamic attribute write + live subscription                                                                                                                                                   |
| `line.attr({ id: 'x', tone: row.tone })`                        | Object form: every entry goes through `attr(name, value)` (same semantics and order as the core)                                                                                              |
| `root.path({ d: 'M12 5v14' })`                                  | SVG child factories (the whitelist comes from the `svgs` table; node-channel artifacts import the `svgs` namespace and emit `svgs.path(…)`)                                                   |
| `line.className(props.tone)`                                    | **Dynamic class name**: `String(value)` split on whitespace, merged with existing names in order and de-duplicated (the node channel reuses `node.className`)                                 |
| `line.style({ height: row.h })`                                 | Object form: equivalent to `styles(object)` → each entry goes through `style(name, value)`                                                                                                    |
| `root.h1(props.heading)`                                        | **Dynamic argument**: runtime type dispatch (reuses the core's `applySetupValue`); the `node` channel covers every shape, the `element` channel lands it as "position = a piece of text"      |
| `const body = root.div(…)` then `body.attr(…)`                  | **Node variable (alias)**: chained child factories return the **parent** node in this DSL, so the alias _is_ the current node; the chain is analysed as usual and emitted in source order     |
| `td({ attrs: { id: row.id } })`                                 | Dynamic option value (same path as a hand-written `attr`)                                                                                                                                     |
| `line.className('a b')`                                         | Baked into the fragment                                                                                                                                                                       |
| `line.toggleClass('on', expr)`                                  | Class binding (`bindClass`)                                                                                                                                                                   |
| `line.mountable(condition)`                                     | Conditional mount (`element` goes through `mountableAt`, `node` reuses the node's own `mountable`)                                                                                            |
| `list.keyed(rows, keyOf, rowFactory)`                           | A list inside a component: the row factory is a **sub-unit** — `element` goes through `keyedRows`, `node` reuses the node's own `keyed`                                                       |
| `list.keyed(rows, rowFactory)` (two arguments)                  | Same; the key rule is copied from the core: keySet sources use the container's `keyOf(item.data)`, signal sources use row identity (object keys → no `data-row-key`)                          |
| `const a = <expr>;` in the root setup                           | **Logic frame**: the declaration is copied into the artifact and runs in source order; value positions may reference it and its name never enters `scope`                                     |
| `if (…) { <one child element> }` in the root setup              | **Structure anchor**: the statement is copied into the artifact, that structure is lifted into a **sub-unit** and inserted before "the sibling that follows it in the fragment"               |
| `for (const x of …) { <one child element> }` in the root setup  | Same (`for…of`: the iteration semantics come from the statement itself; an empty list builds nothing)                                                                                         |
| `list.forEach((item) => { <one child element> })`               | Same mechanism as control flow: the statement runs verbatim and the structure is instantiated per item at the anchor                                                                          |
| `[…].forEach(([a, b]) => <one child element>)`                  | Same: any receiver (array literals included) and an **expression-bodied** callback is wrapped into a block body                                                                               |
| `child(<Component>(…))` inside an anchor                        | The structure may also be a **component call**: with an entry carrying `plan` + `hash` (a file registry) it instantiates from the registry (fragment clone + positional writes / node render) |
| `line.style('color', 'red')`                                    | Baked into the fragment                                                                                                                                                                       |
| `line.style('color', row.tone)`                                 | Dynamic style write (`node` channel: `node.style`)                                                                                                                                            |
| Form C skeleton (`super('tag')` + straight-line `this.*` calls) | Compiles to a skeleton fragment; constructor params are content positions (usages with content fall back at runtime)                                                                          |
| `cell.child('text')`                                            | Baked into the fragment                                                                                                                                                                       |
| `cell.child(String(row.id))`                                    | Positional text write                                                                                                                                                                         |
| `cell.child(vText(handle))`                                     | Text binding (handle / zero-arg reader / plain value)                                                                                                                                         |
| `line.on('click', handler)`                                     | Plain `addEventListener`                                                                                                                                                                      |
| `cell.span(...)` / `cell.td(...)`                               | Recursively compiled child elements (whitelist)                                                                                                                                               |

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

| Construct                                                        | Reason                                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `if` / `for` / `while` statements                                | Structure is no longer constant                                                                                                                                                                                                      |
| Local declarations that cannot be read                           | `var` / destructuring defaults / an initialiser touching a node object or an element factory / the same name declared twice / the same name as a module-level binding / a value position referencing a nested setup's node parameter |
| Control flow whose structure cannot be read                      | a statement in the block that is not "add one child element" (a conditional `body.className(…)`) / control flow nested inside the block                                                                                              |
| `...spread` arguments                                            | Arity is unknown at build time                                                                                                                                                                                                       |
| Unlinked component calls                                         | Cross-module / uncompilable components: the plugin only links **same-module** components (see §7.1), everything else keeps the generic path                                                                                          |
| `child(() => …)`                                                 | Component slot / deferred content                                                                                                                                                                                                    |
| Factories outside the whitelist (`vNode`, third-party factories) | Not an element factory; compiling it as an element would be a silent semantic bug                                                                                                                                                    |
| Dynamic attribute names, three-argument `attr`                   | Cannot be classified (the attribute name must be a string literal)                                                                                                                                                                   |
| `className(<literal that is not a string>)`                      | e.g. `className(1)`: the core would treat the number as class text, so this does not guess                                                                                                                                           |
| A dynamic argument **followed by more arguments**                | Runtime-appended children would land after that later structure (order cannot be preserved) → whole shape falls back                                                                                                                 |
| A dynamic style value in the `element` channel                   | Static styles stay in the fragment while dynamic ones can only go through CSSOM, which serializes differently from `toHTML()`; use a literal / `toggleClass`, or this row's `node` channel                                           |
| An array or object in a text position (`child([a, b])`)          | The generic path flattens arrays into several children and throws on objects, so neither is a piece of text; the runtime throws too instead of writing `String(x)`                                                                   |
| A boolean literal in a text position (`child(false)`)            | The generic path throws a TypeError from `child()`, so compiling `"false"` would be a silent miscompile                                                                                                                              |
| Live text inside a static subtree                                | No live ancestor to carry the binding (`node` channel)                                                                                                                                                                               |

The element whitelist is **derived from the factories the core actually registers** (`htmls` +
`svgs`): add a tag to the core and the whitelist follows; components are never mistaken for elements.

The table above comes from `--report` (run `npm run report:compile` to refresh): in this repo `src`
is 449 files / 61 candidates / 10 compiled, `src/examples` 135 / 50 / 0. What is left in the corpora
is one shape: **"the call chain does not start from the setup parameter"** — keeping a node in a
variable (`const body = root.div(…)` followed by `body.attr(…)`) or assigning first and attaching
later (`child(v)`); that is the "node variables + source-offset step table" work item. A dynamic
style value in the `element` channel still hits **zero** rows — it covers "value comes from data" in
application code: what cannot be classified falls back rather than being compiled into a static
fragment. The in-repo numbers are watched per file by the coverage baseline in §4.1 (a file that
compiled in the baseline and falls back now fails the build).

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
  --file src/Row.js --component Row --mode element \
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
  file: 'src/Row.js',
  component: 'Row',
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
  return function Row(row) {
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

| Hook                                         | Purpose                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `cloneFragment(html)`                        | One `<template>` per shape, `cloneNode(true)` per instance                          |
| `adopt(node, el, liveAttrs)` / `bindChild`   | `node` channel: attach the fragment to the node and activate bindings               |
| `mountRuntimeChildren(node, value, …)`       | `node` channel: `child(<expr>)` — dispatch through the core `child()`, place later  |
| `mountNodeAt(node, container, before)`       | `node` channel: restore a position once the fragment has been adopted               |
| `textAt(anchor)`                             | Text positions are comment anchors in the fragment — swap one for a real text node  |
| `bindText` / `bindChildText` / `setAttr`     | Subscribe and write in place; plain values write once                               |
| `bindClass` / `addClassText` / `mountableAt` | `element` channel: class writes and conditional presence                            |
| `pushOff(offs, off)`                         | Collect unsubscribe functions (keeps generated code one statement per line)         |
| `createElementList(container, keyOf)`        | Element-row reconciliation: reuse / rebuild in place / remove / minimal moves (LIS) |

`setAttr` shares one implementation with the core `applyAttribute` (`null` / `undefined` / `false`
remove the attribute, boolean attributes are written as their own name), so there is never a second
set of attribute rules.

**Text positions are comment anchors.** A fragment is produced by serializing the shape and parsing it
back, and the HTML parser merges two adjacent text nodes into one — with `childNodes[i]` addressing that
shifted every later position (reading `undefined`, or writing into the neighbouring element). A text
position is therefore sampled as a sentinel character and replaced by `<!---->`; `textAt()` swaps the
anchor for a real text node when a value is written. Adjacent text positions compile like any other
shape (the emitter counts the sentinels and falls back when the count does not match).

A one-shot write into a **text** position (`vText(x)` → `bindText` / `bindChild`, or `child(<expr>)`
in the `element` channel → `bindChildText`) throws on nodes, arrays and objects: the generic path
would build a child node, flatten them into several children or raise an error respectively, so
writing `String(x)` would be silent semantic drift. `child(<expr>)` in the `node` channel is the one
shape that does support all of them: the value is handed to the core `child()` itself (no second
dispatch table), and only the position comes from the artifact.

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
- **Target function parameters**: the artifact reproduces the source parameter list verbatim —
  destructuring (nested included), defaults, rest and extra parameters all compile. Names bound by
  the parameters are never collected into `scope` (`tone` in `function Card({ tone })` is not a
  scope dependency); free identifiers inside parameter defaults and computed keys still go into
  `scope`, because the artifact evaluates them. **Exception**: `arguments` / `new.target`-style
  names are neither valid binding names nor reproducible (their meaning depends on the call shape),
  so those shapes fall back wholesale instead of emitting a syntactically broken artifact.
- **Element factories are confirmed by binding source**: matching the whitelist by name is not enough —
  a local function / variable / parameter, or a same-named import from outside the library entry, is not an
  element factory (otherwise `function span(...)` would be compiled into `<span>` while the generic path
  throws). Library entries include `@yoyaflow/yoya-ui`, the `/core` subpath, and the repo's
  `index.js` / `yoya.*.js`.
- **Local declarations never enter the artifact**: the product does not execute the component body, so names
  declared inside it (`const label = …`) are not runtime scope dependencies; a value position referencing one
  falls the whole shape back (previously it compiled to `const { label } = scope` and read `undefined`).
- **Structure entry of a component unit**: `return <factory>(…)`, component objects
  (`{ render() { return <factory>(…) } }` — retired, compat only), and `vNode((api) => { …commands…; return <factory>(…) })`
  all compile. For the latter two the plugin **replaces the view expression in place**: the component body,
  commands, state and hooks stay verbatim, so commands, `instanceof` and lifecycle semantics survive
  untouched. Component units must produce a `ViewNode`, so their channel is fixed to `node`; a structure that
  is not a single expression (multi-statement / branches) leaves the source untouched.
- **Call-site linking keeps component wrappers** (ticket 15): flattening a linked component into the
  caller's fragment is only sound when the callee's product **is** that structure (a thin factory). When
  the callee produces a component node (`vNode` / shape B — the product carries commands, hooks and
  identity), the call site compiles to a **runtime child** instead: the call expression stays verbatim in
  the artifact and the component symbol travels through `scope` (`createRowFactory({ Badge })`), so the
  wrapper, its commands and `whenMount` / `whenDestroy` survive while the callee's own view still compiles.
  Inline frames evaluate the caller's arguments into a hoisted temp (`__yoyaFrameArgs<n>`) before binding
  the callee's parameters, so a parameter name shared with the caller cannot shadow its own initialiser.
- **Component instances (per-call scope)**: with the in-place replacement a unit may reference locals of the
  component body (`const chip = Chip(props.label); … root.child(chip)`). Those names travel into
  `createRowFactory({ … })` **at the replacement site** (inside the body, so closure capture works), and when
  the scope holds such a per-call name the factory is **created on every call** — the module-level cache
  (`__yoyaFactory ??= …`) would otherwise hand the first call's instance to every later call. A static
  component body still compiles to a `ViewNode` (`nodeAlways`), otherwise `render()` would return an element.
- **One import binding per unit**: every compiled unit appends its own
  `import { createRowFactory as __yoyaCreateRowFactory_<n> } from "<virtual module>"`. Reusing a single name
  for two units is an ESM early error (`Identifier 'createRowFactory' has already been declared`) — the
  business module would be rejected by the bundler instead of merely losing an optimization.
- **The artifact is not a business interface**: `plan.scope` lists app symbols only (handles /
  commands); element factories are imported by the artifact itself, and business code imports no
  generated file (the build-time plugin does the wiring).
- **`data-row-key`**: business `keyed()` runs on the core reconciler, and **node rows** mirror the key
  into `data-row-key` when the key is a string or number; compiled `element` rows (`keyedRows`) follow
  the same rule, so the attribute set is identical with and without the compiler.
  `createElementList(container, keyOf, { keyAttribute })` stays an explicit opt-in (the official
  benchmark's element rows write no mirror so they stay byte-identical to the reference implementation).
- **`keyed` row factories are sub-units**: `list.keyed(rows, keyOf, (row) => <factory>(…))` compiles the
  row factory as its own unit (same artifact shape as an ordinary row unit) and the main artifact imports
  its `createRowFactory` by module path; when the row factory cannot be read (extra statements, a second
  parameter, no single `return`) the **whole shape** falls back instead of half-compiling.
- **Node channel position table**: the `node` channel pre-resolves every element / text position into a
  variable before running any op (fragment → positions → nodes / writes), so a conditional mount
  removing a node or a mounted component cannot shift the later `childNodes[i]` references.
- **Node channel mount anchors**: `node.mountable(condition)` reuses the node's own conditional mount, and
  the **first element sibling after** a conditional child is materialised into the view tree as the anchor
  (the core resolves the insertion anchor from `_children`); its ancestor chain survives `--thin` too.
- **Logic frames (local declarations)**: `const` / `let` declarations (in the root setup or a nested one) are
  copied into the artifact and run in source order; value positions may reference them, and their names never
  enter `scope`. Anything unreadable falls back: `var`, destructuring defaults, an initialiser touching a node
  object / element factory, the same name declared twice, a name that also has a **module-level binding**, and
  a value position referencing a **nested setup's node parameter** (a node object is not a value).
- **Runtime children (`child(<expression>)`)**: the value is only known at runtime, so the `node` channel hands
  it to the core `child()` — strings / numbers / handles / readers build text nodes, nodes and component
  objects enter the view tree, arrays are flattened, anything else raises the core's own error. The child
  handles come from slicing `_children` around the call (`child()` returns the **parent**, so using its return
  value would nest the fragment element into itself) and their position is restored after `adopt()` against
  "the sibling following it in the fragment". The `element` channel has no node objects: it keeps the text
  semantics (arrays flatten into several text nodes) and throws loudly for nodes / components — compile the
  unit with `mode: 'node'` for those. `child([a, b])` therefore compiles (it used to bail as a text-position
  array).
- **Adjacent text positions compile** (ticket 13): the fragment is serialized and re-parsed, and the HTML
  parser merges two adjacent text nodes into one — with `childNodes[i]` addressing that used to shift every
  later position (a stale index, or a write landing in the neighbouring element). Text positions are now
  comment anchors (`<!---->`), which do not participate in that merge, and `textAt()` turns an anchor into a
  real text node when the value is written; the emitter checks that the anchor count matches the number of
  text positions and falls back wholesale when it does not.
- **`node` channel closure nesting**: once a node carries logic frames / anchors, its **descendant nodes are
  built inside its setup closure** (closures nest), so the lower closures can see those locals — the same
  visibility the source has. Without logic frames the artifact stays flat.
- **Structure anchors (`if` / `for…of`)**: the statement itself is copied into the artifact and the structure
  inside it is lifted into a **sub-unit** (its own artifact module, imported by the parent as
  `createRowFactory`) that is inserted before "the sibling following it in the fragment" — no placeholder
  node in the fragment, so DOM bytes stay identical; because the statement runs verbatim, logic frames and
  positional writes interleave in source order (`let n = …; attr(a, n); n = n + 1; attr(b, n)` matches the
  generic path). Boundaries: a block statement may only "add one child element" (conditional
  `body.className(…)` is not compiled yet), no control flow nested inside the block, and in the `node`
  channel the anchor sub-unit is adopted by `node.child(...)` (so `destroy()` / `toHTML()` see it) with its
  position restored after adoption. Control flow in a **nested** setup compiles the same way.
- **Deterministic artifacts**: `plan.source.file` is a relative label (absolute paths are folded to
  the working directory, files outside it keep their basename), so the same source compiles to
  byte-identical output anywhere.
- **No business code inside the tool**: the compiler, plugin, CLI and coverage script hardcode no
  business function names, component names, table names, selectors or structure constants; any name
  they carry comes from the module they read at build time (`plan.source`). The tool's own fixtures
  use neutral shapes and live in the test tree only (never published — `files: [dist, types]`).
- **Regions / component slots**: dynamic structure, always bails to avoid semantic drift (row-level
  `keyed` compiles since ticket 03, see above).
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

| Shape                                   | Source                              | Notes                                                                                                  |
| --------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A thin factory                          | `return span((dot) => …)`           | The view expression is carried over verbatim                                                           |
| Object component (retired, compat only) | `return { render() { return …; } }` | Only a single `render` member (components that must keep their object / commands are not compiled yet) |
| vNode                                   | `return vNode(() => …)`             | setup only returns the view, never touches the api (commands as above)                                 |

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

### 7.1 Same-module linking inside the plugin (no registry file)

With the build-time plugin you do **not** need the roster above: the plugin compiles the components it
discovers in a module into an **in-memory registry**, and `child(<same-module component>(…))` is
**inlined** — the child's view fragment is embedded into the caller's fragment, the child's writes are
expanded at the call site's positions, and the child body is evaluated inside a **parameter frame**
(`const [{ label, tone }] = [<caller arguments>];`, reproducing the child's parameter list verbatim:
destructuring, defaults, rest and extra parameters all compile).

Why same-module linking does not go through registry + `bindComponent`: within one build and one module
the `hash` can never disagree, so the runtime fallback has nothing to do — and a registry entry's
`scope` is the _child module's namespace_, which only works when the business module re-exports the
imports it uses. That would mean asking business code to change for the compiler. Inlining merges the
child's module-level names into the caller artifact's own `scope` (`createRowFactory({ … })`), leaves the
business module untouched, and adds **zero runtime** (no registry module, no import back into the
business module, no module cycle).

Boundaries (an unrecognised shape falls back wholesale, never half-compiles):

- the referenced component cannot compile / is not a compile unit → it never enters the registry and the
  call site stays verbatim;
- the referenced component contains `keyed` row sub-units → the call site is not inlined this round (the
  row sub-units need wiring too, next step);
- cross-module references (`import { StatusDot } from './status-dot.js'`) go through §7's registry +
  `bindComponent`: pass the plugin a **prebuilt registry** (the pure data from `buildComponentRegistry`
  plus the module specifier of the generated registry module) via
  `yoyaCompile.vite({ core, components, componentsSpecifier })`. Same-module entries are still inlined;
  without a registry, cross-module call sites stay verbatim and use the generic path.

The `node` channel gets the same treatment: a container component (only called through `child(...)` →
node channel) that references child components materialises their live nodes by position with the
parameter frame living inside the node setup closure — so a whole "page component → several child
components" chain compiles.

### 7.3 Library components link without a project registry (ticket 11)

Business code does not have to build a registry of **library** components itself: the package ships a
prebuilt one at `yoya-ui/compiled-registry`, and the plugin loads it by default whenever the project did
not pass its own `components`. `child(vCard(…))` / `child(ArrowDownOutlined())` therefore link out of the
box.

- **Shape-derived, no roster**: `scripts/compiler-registry.mjs` scans `src` (excluding `src/examples`,
  tests and the compiler) and _tries to compile_ every top-level export — whatever compiles becomes an
  entry. The compiler still knows no component names.
- **Package-level keys**: an entry is keyed `@yoyaflow/yoya-ui#<export>`, so importing it from `.`, `/ui`
  or `/data-display` hits the same entry (see `packageNameOf` in `component-key.js`).
- **Two files, two jobs**: `dist/yoya.compiled-registry.js` carries the runtime side (`bind` / `render` /
  `hash` / `plan`) and is what user bundles import; `dist/yoya.compiled-registry.json` carries the
  **build-time** side (`ops` / `factory`) and is read by the plugin from Node, so embedding a component's
  fragment into the caller never costs bundle bytes.
- **Isolation**: the registry imports only package entries (`/core`, `/ui`, `/<category>`,
  `/compiler-runtime`) — never `src`, never the build-time compiler. Core, the UI entry and the main entry
  do **not** import the registry, so projects that never link a library component pay nothing; a build that
  does link one pulls just that entry plus the component it falls back to. `verify:dist` asserts all of it.
- **Guards**: the prebuilt entries were compiled against `@yoyaflow/yoya-ui/core`; when a project
  configures a different `coreSpecifier` the plugin skips the packaged registry (two core instances would
  misbehave — see ticket 14's D3). A missing registry, a missing JSON or a missing entry shape means "no
  linking", never a half-built product. `yoyaCompile.vite({ core, registry: false })` turns the default
  loading off entirely, and `registry: '<specifier>'` points at a custom one.

### 7.2 Form C skeletons (tier 1: usages without content)

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
