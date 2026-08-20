# CodeBlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended; not available in this session) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `CodeBlock` and `codeBlock` convenience APIs that reuse `VCode` behavior for documentation, SQL, logs, and long code content.

**Architecture:** Keep the existing `VCode` implementation untouched because that file has unrelated user edits. A focused `src/code-block.js` subclass adds a stable code-block class and public factory, registers the parent shortcut, and delegates all language/content/copy behavior to `VCode`.

**Tech Stack:** Vanilla JavaScript, existing VCode component, ViewNode DSL, Vitest + jsdom, ComponentSource demos.

## Global Constraints

- Reuse `VCode` behavior; do not duplicate copy or internationalization logic.
- Support language, copy, long content, and dynamic text updates.
- Demo components use the standard object-component `render()` pattern and generated source.
- Preserve unrelated dirty worktree changes and selectively commit task files.

### Task 1: Public CodeBlock wrapper

**Files:** Create `src/code-block.js`, `src/code-block.test.js`; modify `src/index.js`.

- [ ] Write RED tests for `CodeBlock`/`codeBlock`, language/content updates, copy behavior, and parent shortcut.
- [ ] Run the focused test and confirm missing exports.
- [ ] Implement the thin VCode subclass/factory and public export.
- [ ] Re-run focused tests to GREEN.

### Task 2: Categorized demo and completion

**Files:** Create `examples/components/demos/code-block.js`; modify component demo registry/tests/README.

- [ ] Write RED tests for a code-block category, language/copy UI, dynamic content, and generated source.
- [ ] Implement the standard object-component demo and register the category.
- [ ] Run focused/full tests, format, ESLint, build, independent review, and selective commit.
