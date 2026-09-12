# yoya-ui-devtools 家族状态（2026-09-12 补记）

本目录 7 张票（运行时契约、视图树快照、更新 diff 事件、状态可观测、作用域可观测、
参考面板、文档与示例）的实现与测试早已落地。

## 实现

- `src/core/devtools.js`：快照 / 事件流运行时（默认关闭、零开销）
- `src/yoya.devtools.js`：独立子路径入口
- `src/core/signals/devtools-write.test.js` 覆盖的写入事件通道
- 示例与文档：`src/examples/devtools-docs.js`、`src/examples/demos/devtools-inspector.js`、`devtools-inspector.css`

## 测试

- `src/core/devtools.test.js`、`src/yoya.devtools.test.js`、`src/core/region-devtools.test.js`
- `src/examples/devtools-docs.test.js`、`src/examples/demos/devtools-inspector.test.js`

## 口径说明

- 票面里的「状态可观测」在 `state-to-ref/07`（commit `e063291`）后统一改为**信号写入事件**，
  不再有节点级 state 快照。

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
