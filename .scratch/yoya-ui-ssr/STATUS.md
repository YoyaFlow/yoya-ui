# yoya-ui-ssr 家族状态（2026-09-12 补记）

本目录 9 张票（renderToString、确定性 id、生命周期清理、hydrate、表单 hydrate 值、
router 服务端解析、按请求 i18n / theme、浏览器组件占位、SSR 示例文档）的实现与测试早已落地。

## 实现

- `src/core/ssr.js`：`renderToString` / `hydrate` / `hydrateOrMount` / `mount`、id 分配器、结构错位告警
- `src/yoya.ssr.js`：SSR 子路径入口
- 示例与文档：`src/examples/ssr/page.js`（`createSsrPage`）、`src/examples/ssr/{server.mjs,server-http.mjs,guide-snippets.js}`、
  `src/examples/ssr-docs.js`、`src/examples/ssr-demo-page.js`
- 0.5 变更：`renderPage` 不再自动输出客户端入口脚本（commit `9ef1875`、`edab7b8`），文档与 skill 已同步

## 测试

- `src/ssr.test.js`、`ssr.mount.test.js`、`ssr-render-page.test.js`、`ssr-components.test.js`
- `src/router-ssr.test.js`、`router-ssr.hydrate.test.js`、`src/i18n-ssr.test.js`
- `src/browser-ssr.test.js`、`browser-ssr.hydrate.test.js`、`src/theme-ssr.test.js`、`src/core/region-ssr.test.js`
- `src/data-display/tree.ssr.test.js`、`src/examples/ssr-docs.test.js`、`src/examples/ssr/ssr-page.test.js`

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
