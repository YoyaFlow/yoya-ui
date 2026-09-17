# yoya-ui Documentation

This documentation set is for yoya-ui users and component-ecosystem authors. It explains what yoya-ui is, how to use it, and how to extend it. Internal development processes, roadmaps, and task specs do not live in this directory.

## File and content planning

- English documentation uses default `*.md` files.
- Chinese documentation uses the `*.zh-CN.md` suffix, matching the repository root convention (`README.zh-CN.md`).
- Chinese is the source of truth; English files are translations that stay in sync.
- Each document covers one topic and links to related documents instead of duplicating the same spec.

## Document set

| File                                                                           | Content                                                      | Source / status               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------- |
| [`index.md`](index.md)                                                         | Documentation navigation and planning (this page)            | New                           |
| [`why-yoya-ui.md`](why-yoya-ui.md)                                             | Positioning, the nine reasons, trade-offs, how to evaluate   | Moved from `README.md`        |
| [`highlights.md`](highlights.md)                                               | Feature highlights: DSL, i18n, access, SSR, forms            | Rebuilt from `index.zh-CN.md` |
| [`access-control.md`](access-control.md)                                       | Access control guide                                         | Rebuilt                       |
| [`api.md`](api.md)                                                             | Request commands, transport registration, and Result mapping | New                           |
| [`ssr.md`](ssr.md)                                                             | Server-side rendering integration guide                      | Rebuilt                       |
| [`theme.md`](theme.md)                                                         | Theme and styling spec                                       | Rebuilt                       |
| [`devtools.md`](devtools.md)                                                   | DevTools guide                                               | Rebuilt                       |
| [`component-authoring.md`](component-authoring.md)                             | Component library authoring guide (third-party authors)      | Rebuilt                       |
| [`interop.md`](interop.md)                                                     | Third-party interop: hand over a real DOM element            | Moved from `README.md`        |
| [`agents.md`](agents.md)                                                       | Reading guide for AI coding agents and evaluators            | Moved from `README.md`        |
| [`component-comparison.zh-CN.md`](component-comparison.zh-CN.md)               | Cross-library comparison (Chinese)                           | New                           |
| [`feedback/security-review-feedback.md`](feedback/security-review-feedback.md) | Answers to a security review: what holds, what does not      | New                           |

## Suggested reading path

1. Start with the repository root `README.md` for positioning, target users and the quick start.
2. Read `why-yoya-ui.md` for the long-form positioning and `highlights.md` for the feature overview.
   The component catalog is maintained in the examples site rather than a separate document.
3. Pick the guide that matches your task: `access-control.md`, `ssr.md`, `theme.md`, or `devtools.md`.
4. Read `component-authoring.md` when you want to build components for the ecosystem, and `interop.md`
   when you are plugging an existing library in.
5. Read `agents.md` before generating or evaluating code for this repository with an AI assistant.
6. Read `feedback/security-review-feedback.md` before acting on a security review of this library.
