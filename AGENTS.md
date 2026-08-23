# Project Agent Instructions

## Codebase Knowledge Graph

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
Always prefer MCP graph tools over grep, glob, or file search for code discovery:

1. `search_graph` for functions, classes, routes, and variables.
2. `trace_path` for callers, callees, and data flow.
3. `get_code_snippet` for specific functions or classes.
4. `query_graph` for complex graph queries.
5. `get_architecture` for project-level structure.

Fall back to text search for string literals, configuration, non-code files, or when the graph is stale or insufficient.

## Component Encapsulation Convention

All reusable components and every component demo must use the object component pattern:

```js
function ComponentName(options) {
  return {
    render() {
      return viewNode;
    }
  };
}
```

- Component names use PascalCase and describe the UI unit, for example `ServiceTableCard`.
- `render()` must return a `ViewNode` (including compound nodes such as `vCard(...)`).
- The returned object may expose additional public commands or state methods alongside `render()`.
- Demo source code must show the complete object component wrapper; do not show a component that directly returns `ViewNode` or a bare `() => ViewNode` factory.
- Demo source panels must reuse `ComponentSource` from `examples/components/component-source.js`; do not maintain duplicate source strings or reimplement the source panel.
- Page composition should pass the component object to `child(...)`, which resolves and caches its `render()` result.
- Low-level element and `v*` factories remain valid inside `render()`; this rule governs reusable component boundaries and demo code.
