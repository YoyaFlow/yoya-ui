# Security review feedback

This page answers an external AI security review of yoya-ui. Two of its four
findings do not hold for this library, one points in the wrong direction, and
one is real but is not a security matter. The final sections list what the
review did surface and what the library does by default.

The short version: **escaping is the default here, not a task handed to the
caller.** Text, attributes and inline styles are escaped when the node tree is
serialized, and the SSR state script escapes `<` so it cannot break out of its
`<script>` tag.

## Verdicts

| Review claim                                               | Verdict                                          | Evidence                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| i18n `{name}` interpolation can inject markup              | Does not hold for HTML output                    | Interpolation does not escape ([i18n.js](../src/core/i18n.js)), but the result lands in a text node and `VTextNode.toHTML()` escapes it ([node.js](../src/core/node.js)); the DOM path writes `textContent` / `setAttribute`                                                |
| SSR XSS: unfiltered user input, "enable template escaping" | Does not hold, and the advice has no counterpart | There is no template engine. SSR output is built from the node tree: text and attributes are escaped, shell ids/lang go through `escapeHtmlAttribute`, and `serializeState()` does `JSON.stringify(...).replace(/</g, '\\u003c')` ([ssr.js](../src/core/ssr.js))            |
| Bare permission strings are guessable/forgeable            | Wrong direction                                  | Client-side access is presentation only — the project documents this ([access-control.md](access-control.md)). Grants come from the server via `createAccess({ permissions })`; guessing a code does not grant it, and client-side validation cannot stop anyone editing JS |
| `on('click')` has no throttling                            | True, but not a security issue                   | `.on()` forwards native events with one handler per node/event and cleans up on `destroy()`. Throttling is an application policy; enabling it by default would change semantics (click counting, submit buttons)                                                            |

## What the review did surface

1. **`vTree` toggle icons parsed strings as HTML.** `toggleIcon()` accepted
   `ChildInput`, but a string was fed to `template.innerHTML`, so
   `toggleIcon('<b>▸</b>')` produced real markup while the type said "child
   text". Strings are now rendered as text (matching `ChildInput`); pass a node
   when you want custom markup. Covered by a test in
   [tree.test.js](../src/data-display/tree.test.js).
2. **A demo built row markup with `innerHTML`.** The AG Grid HR demo assembled
   `<b>${row.name}</b>` strings; it now creates elements and assigns
   `textContent`, so the pattern cannot be copied into code that renders real
   data.

## Escaping map

| Position                    | What happens                                                                    |
| --------------------------- | ------------------------------------------------------------------------------- |
| Text (including i18n)       | `VTextNode.toHTML()` → `escapeHtml`; DOM path writes a real text node           |
| Attributes                  | DOM path uses `setAttribute`; serialization escapes the value                   |
| Inline styles               | Escaped during serialization                                                    |
| SSR shell (`id`, `lang`, …) | `escapeHtmlAttribute`                                                           |
| Serialized request state    | `JSON.stringify(...).replace(/</g, '\\u003c')`, so `</script>` cannot break out |

Raw HTML is only what you bring in yourself: `innerHTML` in your own code and
third-party rich-text editors (Quill and friends) whose content is HTML by
design. yoya-ui does not hand user data to those channels.

## Access control policy

Client-side `access` declarations decide **what the UI shows and whether a
control is editable**. They are not an authorization boundary: the server must
check every request that matters. A node without a declaration is always
allowed (fail-open), so nothing changes until you opt in.
