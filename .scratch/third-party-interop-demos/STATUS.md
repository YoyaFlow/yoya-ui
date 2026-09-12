# third-party-interop-demos 家族状态（2026-09-12 补记）

本目录 6 张票（Quill / AG Grid / Leaflet / CodeMirror 6 / Toast UI Markdown Viewer /
互操作概览与政策）的实现与测试早已落地。

## 实现

- 演示与胶水：`src/examples/demos/quill-editor.js`、`ag-grid-glue.js`、`leaflet-map.js`、
  `codemirror-editor.js`、`markdown-viewer.js`（以及 ag-grid 的 finance / hr / inventory / performance 场景）
- 页面与政策：`src/examples/interop-section.js`、`interop-docs.js`、`quill-docs.js`、
  `ag-grid-docs.js`、`leaflet-docs.js`、`codemirror-docs.js`、`markdown-viewer-docs.js`
- 互操作纪律：`vClientOnly` / `HtmlElementNode` 真实 DOM 挂载路径（见 `src/core/ssr.js`、`src/html/*`）

## 测试

- `src/examples/demos/quill-editor.test.js`、`ag-grid-showcase.test.js`、`leaflet-map.test.js`、
  `codemirror-editor.test.js`、`markdown-viewer.test.js`
- `src/examples/third-party-routes.test.js`（路由、菜单与依赖注入契约）

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
