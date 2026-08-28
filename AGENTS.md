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

## Demo Code Readability Rule

- 演示代码要在代码量、总行数和单行长度之间取平衡，优先使用链式调用减少中间变量。
- 一行内的点式链式调用不超过 3 个（`node.attr(...).attr(...)` 算 2 个点式调用）；超过时按组件边界或语义换行。
- 单行代码长度不超过 100 个字符，与 Prettier `printWidth: 100` 一致；由 ESLint `max-len` 检查。
- 单个演示函数建议控制在 60 行以内，但不作为编译检查；超过时优先拆成更小演示。
- 链式调用只合并简单、同层级的设置，不把嵌套 setup、条件分支或长参数塞进同一条链。
- `.on()` 等带回调内容的方法，回调逻辑较大或单行接近 100 字符时，在 `.on()` 前换行，回调内容独立成行。
- 同一节点需要设置多个属性时，优先合并为 `node.attr({ ... })` 对象写法；动态属性、条件赋值或运行时计算值可以继续使用 `attr()`。
- `src/examples/demos/` 已加入 `.prettierignore`，演示代码的换行格式不被 Prettier 自动合并。
- i18n 演示优先使用 `"默认语言内容".s("key", locale?)` 字符串快捷写法；未指定 locale 时使用默认 locale，未注册的语言内容使用默认语言内容。
- `src/examples/demos/*.js` 由 `demo-readability.test.js` 自动检查点式链数量，`npm test` 会拦截违规。
