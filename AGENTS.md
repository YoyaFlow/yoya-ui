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

## Component Definition Patterns

组件定义支持多种形态，按场景选用；新组件应从下列三种形态中选择，避免在模板之外另起结构。

### A. 薄工厂：函数直接返回 ViewNode

适用：无内部状态、纯配置化组合，代码量最小。

```js
function ServiceTag(options) {
  return vBadge(options);
}
```

### B. 对象组件：返回 { render(), ... }

适用：常规独立组件（默认形态）。render() 返回 ViewNode（包括 vCard(...) 这类复合节点），状态保存在闭包或返回对象上，可暴露命令/状态方法。

```js
function RateCard() {
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

### C. 类节点组件：class VXxx extends HtmlElementNode

适用：VTable↔VTr 这类父子嵌套关系、需要操作子实例或重写节点生命周期（renderDom/destroy/child）的细粒度场景；必须同时导出成对 vXxx 工厂，并在分类 index.js 通过 registerChildFactories 注册进嵌套 DSL。

```js
export class VTr extends HtmlElementNode {
  // 嵌套关系与细粒度操作
}
export function vTr(first = null, second = null, third = null) {
  return createComponentFactory(VTr, first, second, third);
}
```

- 组件名 PascalCase 并描述 UI 单元，例如 ServiceTableCard、VButton；形态 C 使用 VXxx 类 + vXxx 工厂、yoya-vxxx CSS 类。
- CustomNode 统一基类为未实现特性（planned），暂不提供；当前形态 C 使用 HtmlElementNode / ViewNode / SvgElementNode 作为基类，业务用户可在业务代码中用形态 C 自定义类组件。
- 库内参考实现：
  - 形态 A：layout 的 flex/stack/grid/container/spacer/divider、vDynamicLoader；
  - 形态 B：VPagination（render() + update/change 等状态 API）；
  - 形态 C：VButton/VCard/VTable/VTr/VTabs 等组件库主体。
- child(...) 接受 ViewNode、组件对象（自动包装为 ComponentNode 并缓存其 render() 结果）或字符串/数字；三种形态均可作为子节点传入页面组合。
- 低层元素与 v* 工厂在 render() 内继续有效；本规则约束可复用组件边界。

### Demo 演示组件

- 演示代码（examples/demos）以形态 B 为主，通过完整组件包装展示状态操作空间；确需演示形态 A/C 时允许直接书写对应形态。
- 演示源码面板复用 ComponentSource（src/examples/component-source.js），不维护重复源码字符串或重新实现源码面板。

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
