# yoya-ui Theme and Styling Spec

> This document describes yoya-ui's theme, styling, and customization contract. It is the baseline for component style development.
> Related documents: [Component Authoring Guide](component-authoring.md), [Documentation index](index.md).

## 1. Design positioning

- **CSS file first**: component styles live in `yoya.ui.css` and follow native HTML authoring; inline styles are only for instance-level parameters.
- **Small core = standard**: the core defines node lifecycle, attribute snapshots, component wrapping, and state. Styling and theming are carried by tokens and the CSS contract.
- **Every predefined element has its own className**: the class name is the mount point of the "preset skin". Users can use `replaceClassName` to detach the preset and take over with their own CSS.
- **Theming is a three-dimensional orthogonal matrix**: brand theme (`data-yoya-theme`) × light/dark mode (`data-yoya-mode`) × density (`data-yoya-density`).

## 2. Theming dimensions

Theming is more than color. The token system covers:

| Dimension    | Token group                                                                                               | Notes                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Color        | `--yoya-color-*`, `--yoya-raw-*`                                                                          | semantic colors + brand palette derivation (see §3)              |
| Spacing      | `--yoya-space-{1..8}`                                                                                     | 4/8/12/16/24/32/48/64; compact mode tightens globally            |
| Typography   | `--yoya-font-family`, `--yoya-font-size-{xs,sm,base,lg,xl}`, `--yoya-font-weight-*`, `--yoya-line-height` | type scale, weights, line height                                 |
| Control size | `--yoya-control-height-{sm,md,lg}`                                                                        | 30/34/38 by default; compact 26/30/34                            |
| Radius       | `--yoya-radius-{sm,md,lg}`                                                                                | 4/6/8                                                            |
| Shadow       | `--yoya-shadow-{sm,md,lg}`                                                                                | dual light/dark values (`light-dark`)                            |
| Motion       | `--yoya-motion-{fast,base,slow}`, `--yoya-ease-{in,out,in-out}`                                           | duration + easing; global reduction for `prefers-reduced-motion` |
| Elevation    | `--yoya-z-{dropdown,popover,overlay,toast}`                                                               | the single source for overlay z-index                            |
| Border       | `--yoya-border-width`, `--yoya-border-width-strong`                                                       | 1px / 2px                                                        |

## 3. Token system

Three token layers plus one orthogonal dimension:

```text
L1 raw palette       @property-registered, only brand colors (primary/success/danger/warning/info), input for derivation
L2 semantic tokens   components and users consume only this layer: color/text/spacing/size/shape/shadow/motion/elevation/border
L3 component tokens  derived from semantic tokens by default; component-specific values extend later (reserved)
orthogonal dimension [data-yoya-density='compact'] overrides space / control-height
```

- The raw palette is registered via `@property` as `<color>` with `inherits: true`; it is the input for `color-mix()` derivation.
- Brand variants (`hover`/`active`/`deep`/`subtle`/`active-subtle`/`border`/`ring`) are derived from `--yoya-raw-<brand>` with `color-mix()`; **overriding one raw token restyles the whole brand family automatically**.

```css
@property --yoya-raw-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #2563eb;
}
--yoya-color-primary: light-dark(
  var(--yoya-raw-primary),
  color-mix(in srgb, var(--yoya-raw-primary), white 16%)
);
--yoya-color-primary-hover: light-dark(
  color-mix(in srgb, var(--yoya-raw-primary), black 12%),
  color-mix(in srgb, var(--yoya-raw-primary), white 28%)
);
--yoya-color-primary-ring: color-mix(in srgb, var(--yoya-raw-primary) 30%, transparent);
```

- Neutrals (background/text/border/code) and shadows use `light-dark(light, dark)` single definitions, so one file expresses both modes.

## 4. Light/dark modes (one CSS file supports both)

Mode is driven by `color-scheme`; `light-dark()` picks light/dark values automatically based on the element's `color-scheme`:

```css
:root {
  color-scheme: light;
}
[data-yoya-mode='light'] {
  color-scheme: light;
}
[data-yoya-mode='dark'] {
  color-scheme: dark;
}
[data-yoya-mode='system'] {
  color-scheme: light dark;
}
```

- The default (no attribute) is light, matching historical behavior; `dark` forces dark; `system` follows the OS.
- Tokens are not duplicated via `prefers-color-scheme` media queries; there are no repeated dark definition blocks.
- A brand theme `[data-yoya-theme]` only overrides raw tokens; light/dark derivation follows automatically.
- Page-level mode/density switches must set `data-yoya-mode` / `data-yoya-density` on `documentElement` (tokens resolve on `:root` and inherit). Attributes on a local container only change that container's `color-scheme`; they do not recolor the container.

## 5. Density mode

`[data-yoya-density='compact']` overrides spacing and control-size tokens and composes freely with brand theme and light/dark mode:

```css
[data-yoya-density='compact'] {
  --yoya-space-3: 10px;
  --yoya-control-height-md: 30px;
  /* ... */
}
```

Components only respond to density when they consume space/control tokens rather than hardcoding px. vButton sizes and vTable cell/header spacing already consume tokens (spacing normalized to a 4px scale).

## 5.1 Page shell vBody

`vBody` is the page-level theming entry: it consumes theme tokens out of the box (background `--yoya-color-bg`, text `--yoya-color-text`, `--yoya-font-family`, `--yoya-font-size`, `--yoya-line-height`) and follows light/dark, brand, and density switches automatically. Region-level containers use `vThemeShell`, which provides a themed background (`--yoya-color-surface`), border (`--yoya-color-border`), radius (`--yoya-radius-md`), and text color (`--yoya-color-text`), tunable per instance via `.background()` / `.backgroundOpacity(alpha)` / `.radius()` / `.border()` / `.borderColor()` / `.scrollable()`.

```js
import { vBody } from '@yoyaflow/yoya-ui/ui';
vBody({ children: [...], maxWidth: 1120 }).bindTo('#app');
```

## 6. Customization ladder

| Level | Customization point     | How                                                                                            |
| ----- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| L0    | token override (global) | redefine `--yoya-*` for site-wide theming                                                      |
| L1    | scoped token override   | redefine `--yoya-*` on any container for local theming                                         |
| L2    | detach preset skin      | `replaceClassName(old, next, tolerate)` + your own CSS file                                    |
| L3    | fine override           | library rules live in `@layer yoya` and base rules use `:where()`, so unlayered user rules win |
| L4    | instance level          | inline `styles()` / `style()`                                                                  |
| L5    | business hook           | `className('my-x')` to append custom classes                                                   |
| L6    | component API           | `type/size/disabled/...`; do not hard-change component variants with CSS                       |
| L7    | full replacement        | build or wrap your own component to the standard                                               |

### replaceClassName

`ElementNode.replaceClassName(old, next, tolerate = false)`:

- If `old` exists: remove `old` and add `next` (space-separated multiple classes are supported); DOM syncs immediately.
- If `old` does not exist: `tolerate = false` (default) is a no-op; `tolerate = true` adds `next`.
- If `old === next`: no-op; returns `this` for chaining.

```js
vCard((card) => card.replaceClassName('yoya-vcard', 'acme-card'));
```

Preset styles are all written from the root class scope (no orphan part selectors), so replacing the root class detaches the subtree from preset styles. Root-class state selectors such as `.yoya-vtabs .yoya-vtab-trigger[data-active]` stop applying too; state-hook styles need to be taken over by your CSS as well.

## 7. className contract

- Shared marker: every component root carries `yoya-component`.
- Component and part classes: `yoya-v<name>`, `yoya-v<name>-<part>`, `yoya-v<name>--<modifier>`.
- Shared/utility classes: `yoya-<feature>-<part>` (e.g. `yoya-icon`, `yoya-control-clear`).
- State always uses kebab-case `data-*` attributes; class names do not carry state.
- Dynamic class names only use the templates `yoya-v${name}-<part>` and `yoya-${kind}`.
- Enforced by `src/className-contract.test.js` and `src/preset-scope.test.js`.

### Theme switch JS API (optional)

Pure CSS already supports mode switching. When you need programmatic control, persistence, or system-preference resolution, use the lightweight core API (zero dependencies):

```js
import {
  setYoyaMode,
  getYoyaMode,
  resolveYoyaMode,
  setYoyaTheme,
  getYoyaTheme,
  initYoyaTheme
} from '@yoyaflow/yoya-ui/core';

setYoyaMode('dark'); // data-yoya-mode="dark"
setYoyaMode('system', { persist: true }); // persisted; restored by initYoyaTheme() next time
resolveYoyaMode(); // 'light' | 'dark' (resolves system preference when in system mode)
setYoyaTheme('violet'); // data-yoya-theme="violet"
initYoyaTheme({ persist: true }); // restore the last selected mode / theme
```

### Preset switch component (vThemeModeSwitch)

When you do not want to hand-write a switch, use the built-in `vThemeModeSwitch`: three circular icon buttons for light / dark / system by default. Clicking writes `data-yoya-mode` and persists by default; `initYoyaTheme()` restores the last selection after refresh.

```js
import { initYoyaTheme, vCard, vThemeModeSwitch } from '@yoyaflow/yoya-ui';

initYoyaTheme({ persist: true }); // restore at app startup

vCard((card) => {
  card.vCardHeader('Theme mode');
  card.vCardBody((body) => {
    body.child(vThemeModeSwitch()); // light / dark / system, persisted by default
  });
});
```

Limit or customize modes with options or chaining:

```js
vThemeModeSwitch({ modes: ['light', 'dark'], persist: false }); // light/dark only, no persistence

// equivalent chainable form
vThemeModeSwitch((sw) => {
  sw.modes(['light', 'dark']);
  sw.persist(false);
});
```

- `modes([...])`: available modes, default `['light', 'dark', 'system']`; strings map to built-in labels/icons, or pass `{ mode, label, icon }` for custom entries.
- `persist(true | false)`: write to localStorage, default `true`.
- Each button carries `aria-label` / `title` and an active state and is keyboard operable; see the examples site theme page for the full interactive demo.

## 8. Cascade and override guarantees

- Component rules live inside `@layer yoya`; unlayered (user) rules win without `!important`.
- Base root rules use `:where()` to lower specificity.
- Exception: the `@media (prefers-reduced-motion: reduce)` global reduction uses `!important` for accessibility and is the only library rule not bound by "user rules win".
- Tokens and mode/density blocks stay outside the layer (before `@layer yoya;`) so user token overrides win.

## 9. SSR and integration

- Inline styles output `var(--yoya-*, fallback)` and serialize with `toHTML()`; the browser resolves them. Consuming token names stay stable.
- Consumers must link `yoya.ui.css` as the skin contract; no CSS runtime injection is used.

## 10. Contract tests

- `src/css-contract.test.js`: static CSS rule coverage for component class/state hooks.
- `src/className-contract.test.js`: class naming families, dynamic templates, and kebab-case `data-*` validation.
- `src/preset-scope.test.js`: preset rules scoped to root classes (no orphan selectors).
- `src/cascade-layer.test.js`: `@layer yoya` structure.
- `src/theme-tokens.test.js`: raw palette, variant derivation, single definitions, mode/density switches, and stable token names.
