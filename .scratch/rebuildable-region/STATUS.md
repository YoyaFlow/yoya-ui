# rebuildable-region 家族状态（2026-09-12 补记）

本目录 14 张票（区域声明与重跑、环境注入、绑定、自动触发、数据源、SSR 首屏、
可观测性、keyed 复用、setup/reset、组件子树、绑定源统一、flushAll 等）的实现与测试早已落地，
`design.md` 的核心语义与 API 形态（`rebuildable()` / `rebuild()` / `flush()`）就是当前实现。

## 实现

- `src/core/node.js`：区域构建栈、依赖捕获、`rebuildable()` / `rebuild()` / `flush()` / `flushAll()`、区域环境
- `src/core/signals/deps.js`：依赖收集（由区域与信号共享）
- `src/core/signals/*`：区域写入事件与 devtools 上报

## 测试

- `src/core/region.test.js`、`region-flush.test.js`、`region-environment.test.js`、
  `region-bindings.test.js`、`region-scope.test.js`、`region-ssr.test.js`、`region-devtools.test.js`、
  `region-contract.test.js`、`region-registrations.test.js`、`region-component-child.test.js`
- `src/core/signal-region.test.js`、`src/form/autocomplete-region.test.js`
- 示例演示：`src/examples/demos/region.js` + `region.test.js`

## 口径说明

- `design.md` 里「入口命名 / 区域发现机制待定」的待定项，最终以 `rebuildable(predicate)` +
  `rebuild({ trigger })` 落地；票 14 的状态 API 部分随 `state-to-ref/09` 一并移除。

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
