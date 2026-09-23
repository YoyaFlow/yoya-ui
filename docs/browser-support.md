# yoya-ui Browser Baseline and Degradation Contract

> This document states which browsers yoya-ui supports, what happens below that line, and **how to support older
> browsers yourself**. Related documents: [Theme spec](theme.md) · [Component authoring](component-authoring.md) ·
> [Documentation index](index.md).

## 1. The baseline

| Engine              | Minimum version | Released around |
| ------------------- | --------------- | --------------- |
| Chrome / Edge       | **123**         | 2024-03         |
| Firefox             | **120**         | 2023-11         |
| Safari / iOS Safari | **17.5**        | 2024-05         |

The same floor is machine-readable in the package's `browserslist` field, so consumer build tooling (autoprefixing,
target downleveling) can align with it.

**What "supported" means**: at or above this line, theme colors, the preset skin and all component behavior work as
designed, and the observable behavior defined by `npm test` holds. Below the line the library does not throw — it
**degrades**; see §3 and §4.

## 2. What sets this line

It is set by the two CSS color functions the theme color layer depends on, not by JavaScript:

| Feature           | Chrome/Edge | Firefox | Safari/iOS | Why it matters                                     |
| ----------------- | ----------- | ------- | ---------- | -------------------------------------------------- |
| `light-dark()`    | 123         | 120     | 17.5       | **The hard line**: it drives the whole color theme |
| `color-mix()`     | 111         | 113     | 16.2       | Brand derivations (hover / subtle / ring)          |
| `@layer`          | 99          | 97      | 15.4       | The preset skin lives inside one cascade layer     |
| `@property`       | 85          | 128     | 16.4       | Brand-palette registration (values still inherit)  |
| `scrollbar-width` | 121         | 64      | 18.2       | Hiding scrollbars in a few regions                 |

**JavaScript is not the constraint**: the artifacts keep `?.` / `??` / `??=` / `Array.prototype.at`, whose floor is
around Safari 15.4 / Firefox 79 / Chrome 80 — well below the CSS line. Optional browser APIs
(`IntersectionObserver` / `ResizeObserver` / `dialog.showModal` / `element.animate` / `navigator.clipboard`) all carry
capability checks and graceful paths. The distribution format is **native ES Modules** (no UMD / IIFE / legacy bundle,
no polyfills): browsers without native module support (IE11 and friends) are out of scope.

**This is not "a Safari problem"**: every engine has a window — Chrome/Edge 111–122, Firefox 113–119 and Safari/iOS
16.2–17.4 all hit the same thing (they have `color-mix()` but not `light-dark()`). Safari is merely where it shows up
first, because its updates are locked to OS versions: **the largest affected population for the longest time**.

## 3. What happens below the baseline (degradation ledger)

| Capability / feature                     | Engines missing it                               | Consequence                                          | Status                                             |
| ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------- |
| `light-dark()`                           | Chrome/Edge <123, Firefox <120, Safari/iOS <17.5 | Every color token is invalid at substitution time    | **Fallback**: plain-value token layer (§4)         |
| `color-mix()` (color tokens)             | Chrome/Edge <111, Firefox <113, Safari/iOS <16.2 | Brand derivations are lost                           | **Fallback** (same layer)                          |
| `color-mix()` (shell background opacity) | same as above                                    | `backgroundOpacity()` stops working                  | **Fallback**: opaque base color, background kept   |
| `@layer`                                 | Chrome/Edge <99, Firefox <97, Safari/iOS <15.4   | The preset skin is dropped **as a whole** (unstyled) | No fallback: this tier sits below every other line |
| `@property`                              | Firefox <128                                     | Brand palette unregistered (values still inherit)    | No fallback (soft)                                 |
| `scrollbar-width`                        | Safari/iOS <18.2                                 | A couple of regions show scrollbars                  | No fallback (cosmetic)                             |
| Shell opacity in virtual mode            | same tier as `color-mix()`                       | Opacity is lost; that background turns transparent   | **No fallback** (see the last bullet of §4)        |
| Native ES Modules                        | IE11 and friends                                 | The library cannot load                              | Explicitly unsupported                             |

Beyond this table, every other feature the preset skin uses (`clamp()` / `dvh` / `:focus-visible` /
`overscroll-behavior` / `accent-color` / `color-scheme`) has a lower floor — so in the tier that **supports `@layer`
but not `light-dark()`** the interface is complete; only the palette drops back to plain fallback values.

## 4. How the fallback works

- **Color token fallback layer**: the preset skin wraps a **plain-value** token table in
  `@supports not ((color: light-dark(…)) and (color: color-mix(…)))`, with a key set **exactly equal** to the tokens
  whose primary value needs those two functions — forget to cover a new token and `src/theme-tokens.test.js` fails on
  the spot. Inside there are three mode blocks: light, `[data-yoya-mode='dark']`, and `system` at night
  (`@media (prefers-color-scheme: dark)`).
- **Shell background opacity**: `backgroundOpacity()` writes only two pieces of data (`--yoya-shell-bg` base color,
  `--yoya-shell-alpha` percentage); composition happens in `--yoya-shell-composed`, which the skin computes, and where
  `color-mix()` is missing the same variable resolves to the **opaque base color**.
- **Do not treat `var(--token, fallback)` as a degradation strategy**: a CSS variable fallback only applies when the
  variable is **undefined**. Here the token _is_ defined (with a value that is only invalid at substitution time), so
  those fallbacks are never used — the library writes that form in 140+ inline styles in JS and 370+ reads in CSS, and
  their correctness **depends on the token layer having a fallback of its own**.
- **Brand-color overrides do not apply below the baseline**: the fallback layer is baked from the **default palette** at
  build time. Following `--yoya-raw-*` overrides would move the base color while the derived shades stayed on the
  default brand — a "red button with a blue hover" kind of break. Baking the default palette stays at least coherent.
  For branded older-browser support, see §5.
- **Known residual — shell opacity in virtual mode**: `vThemeShell(...).virtual()` projects the shell styles onto its
  single child; the target node has no `VThemeShell` identity, so the skin's composition rule cannot reach it and that
  path still composes in JS. Where `color-mix()` is missing, that background turns transparent (**only the combination
  of virtual mode and `backgroundOpacity()`**).
- **Layering as it stands (recorded, not changed)**: the preset skin sits inside `@layer yoya`, so consumer styles need
  no specificity fight (that is also where the `@layer` cliff in §3 comes from). But the two `prefers-reduced-motion`
  blocks and the `split-panel` rules deliberately stay **outside** the layer — they have to win over rules inside it;
  do not move them in while editing the skin.

## 5. Supporting older browsers yourself

The library's fallback layer is already a safety net (backgrounds, text, borders and brand colors stay readable below
the baseline). To do better, add your own plain-value layer **after** the library stylesheet — later declarations of the
same name win by source order, and you do not need all 100+ tokens, only the ones you want to change:

```html
<link rel="stylesheet" href="…/@yoyaflow/yoya-ui/dist/yoya.ui.css" />
<link rel="stylesheet" href="./my-legacy-tokens.css" />
```

```css
/* my-legacy-tokens.css — a plain-value layer tuned to your own brand, for low-baseline browsers */
@supports not ((color: light-dark(#000, #fff)) and (color: color-mix(in srgb, #fff, #000))) {
  :root {
    --yoya-color-bg: #f9f9f9;
    --yoya-color-surface: #ffffff;
    --yoya-color-text: #0d0d0d;
    --yoya-color-border: #e5e5e5;
    --yoya-color-primary: #b3261e; /* your brand */
    --yoya-color-primary-hover: #93180f; /* give derivations too, or they fall back to the default brand */
    /* everything else can stay on the library's fallback layer */
  }

  [data-yoya-mode='dark'] {
    --yoya-color-bg: #171717;
    --yoya-color-surface: #212121;
    --yoya-color-text: #ececec;
    --yoya-color-border: #3c3c3c;
    --yoya-color-primary: #d9645c;
  }
}
```

Two rules of thumb: **give derivations together with the base color** (overriding only `--yoya-raw-*` does nothing below
the baseline), and **coherence beats completeness** (a few missing tokens only lose some nuance; a wrong value looks
broken).

## 6. Checking it yourself

One capability probe in the browser console tells you whether you are on the primary layer or the fallback:

```js
CSS.supports('color', 'light-dark(#000, #fff)') &&
  CSS.supports('color', 'color-mix(in srgb, red, blue)');
// true = primary layer; false = fallback layer (still readable, just plain values)
```

For the visual check, open a demo page under `dist/examples/` and switch `data-yoya-mode` between light / dark / system:
none of the three should show "transparent backgrounds, default-black text".

In the repository this line is held by three things: `browserslist` in `package.json` (the declaration),
`src/theme-tokens.test.js` (key-set and plain-value invariants of the fallback layer), and `src/css-contract.test.js`
(the shell composition rule and its fallback).

## 7. Raising the baseline

Raising the baseline is a deliberate tightening; it goes in one order: update the minimum versions here and in
`browserslist` → adjust the fallback layer's `@supports` condition and key set → update the contract tests. Going the
other way (widening support downwards) requires shipping a fallback with it, otherwise "silent failure" comes back.

## 8. Evidence and verification record (archived)

**Where the version numbers come from**: `@mdn/browser-compat-data` 8.1.2 (read on 2026-09-24), with the key rows
cross-checked against `caniuse-lite`; each number is the version where the feature **first became available**
(unprefixed, no flag). The engine windows at the end of §2 come from the same audit.

**Usage figures** (measured on the same source tree): **69** color tokens in the primary layer depend on `light-dark()`
or `color-mix()` (the fallback layer matches them one for one, enforced by the contract test); the preset skin reads
`var(--yoya-color-*)` **378** times; JS writes the inline `var(--yoya-token, fallback)` form **142** times (173 helper
calls).

**Real-browser verification record** (headless Edge 152, reading **computed styles** token by token, colors normalized
through a canvas before comparison; 2026-09-24):

| Check                   | Method                                                                                                         | Result                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Primary layer unchanged | Pre-change stylesheet vs post-change, token by token in light / dark                                           | 69/69 and 69/69 identical                                                        |
| Fallback equivalence    | Force the `@supports not (…)` block on, then compare with the primary layer                                    | All identical (one `.5` boundary rounding gap of ±1)                             |
| Shell opacity           | Real component rendered, computed background read: semi-transparent / 100% / custom base / dark follows tokens | All four correct; with the fallback forced, all four become an opaque base color |

The smallest way to re-run this is §6: one capability probe to see which branch you are on, then a demo page under
`dist/examples/` with `data-yoya-mode` cycled through light / dark / system. In the repository the invariants are held by
`browserslist`, `src/theme-tokens.test.js` and `src/css-contract.test.js` — the last of which now also asserts that every
`scrollbar-width: none` has a `::-webkit-scrollbar` counterpart.
