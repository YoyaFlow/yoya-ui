# yoya-ui Documentation

This documentation set is for yoya-ui users and component-ecosystem authors. It explains what yoya-ui is, how to use it, and how to extend it. Internal development processes, roadmaps, and task specs do not live in this directory.

## File and content planning

- English documentation uses default `*.md` files.
- Chinese documentation uses the `*.zh-CN.md` suffix, matching the repository root convention (`README.zh-CN.md`).
- Chinese is the source of truth; English files are translations that stay in sync.
- Each document covers one topic and links to related documents instead of duplicating the same spec.

## Document set

| File                                               | Content                                                 | Source / status                                  |
| -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| [`index.md`](index.md)                             | Documentation navigation and planning (this page)       | New                                              |
| [`highlights.md`](highlights.md)                   | Feature highlights: DSL, i18n, access, SSR, forms       | Rebuilt from `index.zh-CN.md` highlights section |
| [`access-control.md`](access-control.md)           | Access control guide                                    | Rebuilt                                          |
| [`ssr.md`](ssr.md)                                 | Server-side rendering integration guide                 | Rebuilt                                          |
| [`theme.md`](theme.md)                             | Theme and styling spec                                  | Rebuilt                                          |
| [`devtools.md`](devtools.md)                       | DevTools guide                                          | Rebuilt                                          |
| [`component-authoring.md`](component-authoring.md) | Component library authoring guide (third-party authors) | Rebuilt                                          |

## Suggested reading path

1. Start with the repository root `README.md` for positioning and quick start.
2. Read `highlights.md` for a feature overview. The component catalog is maintained in the examples site rather than a separate document.
3. Pick the guide that matches your task: `access-control.md`, `ssr.md`, `theme.md`, or `devtools.md`.
4. Read `component-authoring.md` when you want to build components for the ecosystem.
