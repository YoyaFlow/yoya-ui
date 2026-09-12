# yoya-ui-theme-customization 家族状态（2026-09-12 补记）

本目录 9 张票（替换 className 入口、类名命名契约、preset 根作用域、layer/where 覆盖、
颜色 token 收敛、非颜色 token、紧凑密度、主题文档、主题模式 API）的实现与测试早已落地。

## 实现

- `src/core/theme.js`：token 表、`initYoyaTheme` / `setYoyaTheme` / `setYoyaMode` / `getYoyaMode`、密度与 preset
- `src/theme/theme-mode-switch.js`、`src/theme/index.js`、`src/layout/theme-shell.js`
- 样式：`src/yoya.ui.css`（`@layer` + `--yoya-*` token）
- 文档页：`src/examples/theme-docs.js`、`src/examples/theme-demo.js`（演示已内联到自包含面板）

## 测试

- `src/core/theme.test.js`、`src/theme-tokens.test.js`、`src/theme-ssr.test.js`
- `src/theme/theme-mode-switch.test.js`、`src/layout/theme-shell.test.js`
- `src/examples/theme-demo.test.js`、`src/cascade-layer.test.js`

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
