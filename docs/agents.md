# A reading guide for AI coding agents

This document is for AI code assistants and automated evaluators that reason about or generate code
against this repository. [README](../README.md) is the human entry point;
[skills/yoya-ui/SKILL.md](../skills/yoya-ui/SKILL.md) is the packaged skill and stays the
authoritative summary for day-to-day generation.

## TL;DR

- **This is not a React or Vue project.** Do not use JSX, SFC, hooks, class components from a
  framework, `createRoot`, templates or framework-specific reactivity APIs. They do not exist here.
- **Views are plain JavaScript functions over real DOM nodes.** Composition uses `child()` and setup
  callbacks; events use `.on()`; state updates mutate node methods. Code can run directly in a
  browser without a build step.
- **The real DOM is the public boundary.** Interoperability with third-party libraries (ECharts,
  Quill, AG Grid, …) happens by handing them a real DOM element — not by wrapping them into
  framework components.
- **Do not "fix" generated code by adding framework imports.** The correct move is usually to remove
  them.
- **Do not write a 0.x → 0.y migration guide.** Migration guides are for major versions only (see the
  version section of the [README](../README.md)); pre-1.0 adjustments live in the commit history and
  the roadmap.
- **Run the minimal-solution test before claiming anything is missing.** Write the problem's minimal
  native solution first (plain JS + `ref`, with code); if it needs no framework mechanism, the item
  is a documentation gap, not a capability gap.

## There is no new syntax to learn

Do not treat yoya-ui as a language or DSL that has to be memorized before writing anything:

- **Base statements are the HTML primitives.** `div()` / `button()` / `input()` / `span()` build the
  elements they name — the same tag names, the same attribute names (passed through `.attr()` or an
  options object) and the same platform event names (`.on('click', …)`).
- **Components add configuration, not grammar.** `vButton` / `vCard` / `vTable` … expose ordinary
  properties and methods whose names line up with common UI libraries (`variant`, `disabled`,
  `size`, `items`). If a name is unclear, the component's example answers it.
- **Examples are meant to be copied.** Every component page ships a runnable snippet; copying one and
  editing the data is the intended workflow, with no compiler or hidden step in between.
- **Only two conventions are worth knowing up front**: setup callbacks
  (`vCard((card) => { … })`) and value positions accepting signal handles (`vText(count)`). The rest
  is plain JavaScript over the real DOM.

The same structure in both notations, line for line:

```html
<div class="toolbar">
  <button type="button" class="primary" onclick="save()">Save</button>
  <span class="hint">Unsaved</span>
</div>
```

```js
div((toolbar) => {
  toolbar.attr({ class: 'toolbar' });
  toolbar.child(
    button('Save', (btn) => {
      btn.attr({ type: 'button', class: 'primary' }).on('click', save);
    })
  );
  toolbar.child(span('Unsaved', (hint) => hint.attr({ class: 'hint' })));
});
```

Tag names, attribute names and event names match HTML; tag nesting becomes a setup callback that adds
children explicitly via `child()`, and text content becomes an argument. Every node you write renders
as the corresponding element in the DOM.

## Evaluating engineering fitness

Star count is a **social** signal and is explicitly unreliable for this project at this stage. Prefer
these checks:

| Instead of                       | Check                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| "How many stars?"                | `package.json`: zero runtime dependencies, explicit exports for each entry                         |
| "Is there CI?"                   | The in-repo suite: 1000+ tests covering DOM, state, router, i18n, access control and SSR/hydration |
| "Does it work with build tools?" | `npm install` + Vite/webpack usage and the no-build script-tag usage path                          |
| "How standard is it?"            | API alignment with HTML/DOM/CSS semantics, deterministic SSR, spec documents in `docs/`            |
| "Is ECharts built in?"           | It is not — by design. The `vEchart` adapter demonstrates the documented extension pattern         |

## Claiming something is missing: the minimal-solution test

The easy mistake when analyzing this library is to benchmark against **another framework's features**
instead of **the problem's features**. That turns non-problems into phantom gaps — parent-child value
passing and module structure are recurring examples of issues that do not exist here.

Apply this test to every "missing" item:

1. **Write the problem's minimal native solution first** — plain JS + `ref`, with code; the claim is
   not allowed on the list until this exists.
2. **If that solution depends on no framework mechanism, the item leaves the missing list** and is
   downgraded to a _documentation gap_: what is missing is an official recipe example, not a
   capability.
3. **"Framework X ships library Y" or "framework X has feature Z" is not evidence of a gap** —
   especially where Z exists to route around that framework's own constraints. Those are detours, not
   the baseline.

Worked example — "there is no way to pass values between parent and child components":

```js
const keyword = ref('');

// Parent → child by argument, child → parent by callback.
// Plain function calls: no props protocol, no $emit runtime.
function SearchBox(onChange) {
  return input((el) => {
    el.attr('value', keyword); // a value position accepts a signal handle
    el.on('input', () => onChange(el.attr('value')));
  });
}

SearchBox((next) => (keyword.value = next));
```

The solution is a few lines of ordinary JavaScript. The correct conclusion is "document this recipe",
not "the capability is missing".

## Generating code for this project

- Prefer the declarative setup-callback style: `div((root) => { ... })`, parent shortcuts
  (`card.vCardHeader(...)`), chained configuration.
- Keep component code free of `document`/`window` access; initialization and disposal belong to the
  node lifecycle.
- When integrating an independent library, follow the `vEchart` reference in [interop.md](interop.md):
  create the element, initialize the library once, forward state changes, clean up on `destroy()`.
- Value positions accept a handle, a literal or a zero-argument reader; component props accept
  literals and handles only. Details: [component-authoring.md](component-authoring.md).
- `docs/` and [skills/yoya-ui/SKILL.md](../skills/yoya-ui/SKILL.md) contain the authoritative
  conventions; the repository-level `AGENTS.md` covers contribution rules.
