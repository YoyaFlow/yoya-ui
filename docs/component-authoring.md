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
| State                     | `vStateNode`                                                                                                                                   |
| i18n                      | `createI18n`, `I18nTextNode`, `i18nText`, `installI18nStringShortcut`                                                                          |

## 3. The three component shapes

Choose one of these shapes for a new component; do not introduce a structure outside the templates.

### Shape A: thin factory (no internal state, purely configured composition)

```js
import { vBadge } from 'yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

### Shape B: object component (regular standalone component, the default)

```js
import { vRate } from 'yoya-ui/ui';

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

### Shape C: class node component (parent/child nesting, child instance control, or lifecycle overrides)

Class node components must export a paired `vXxx` factory and use `createElementFactory`:

```js
import { HtmlElementNode, createElementFactory } from 'yoya-ui/core';

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

yoya-ui has no automatic reactivity system. After state changes, the component decides which DOM to update in place:

- Node level: `registerStateAttrs` + `registerStateHandler` + `setState` / `getState`.
- Component level: `vStateNode({ state, render, update })`; `update` performs local patches and returns `true` to rebuild fully.
- Components can expose state APIs (e.g. `value(next)`, `disabled(next)`) and stay chainable.

## 7. Composition, events, and lifecycle

- `child(...)` accepts `ViewNode`s, component objects (wrapped in `ComponentNode` automatically with their `render()` cached), or strings/numbers.
- `on(eventName, handler, options)` binds real DOM events and cleans them up automatically in `destroy()`.
- A component object only needs a `render()` returning a `ViewNode` to be used by `child()`; class components follow the `renderDom` / `bindTo` / `destroy` lifecycle.

## 8. Registering parent shortcuts

Use `registerChildFactories` to register factories on a target node class, enabling `page.vButton(...)` syntax in pages. Existing methods are not overridden by default:

```js
import { ViewNode, registerChildFactories } from 'yoya-ui/core';
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
