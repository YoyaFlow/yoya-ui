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

## Declarative-First Component Rule

组件定义和演示代码优先使用声明式写法：

```js
function ServiceDetailCard() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('服务详情');
        card.vCardBody((body) => {
          body.vDetail((detail) => {
            detail.vDetailItem('服务名称', 'api-gateway');
            detail.vDetailItem('状态', '运行中');
          });
        });
      });
    }
  };
}
```

- 定义组件时优先使用 setup callback、父节点快捷方法和链式方法组合结构。
- 演示代码同样以声明式写法为主，参数对象只作为 API 说明保留。
- 每个组件或演示集最多保留一个完整的参数对象案例，其余示例使用声明式写法。

## Demo Code Chaining Rule

- 演示代码尽可能使用链式调用，减少中间变量和代码量。
- 能用 `node.vX(...).vY(...)` 连续调用的场景，不拆成多行独立语句。
- 链过长时按组件边界换行，保持可读性。
