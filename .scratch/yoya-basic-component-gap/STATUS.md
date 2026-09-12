# yoya-basic-component-gap 家族状态（2026-09-12 补记）

本目录 16 张票（vTimer / vTimerRange / 菜单结构 / vSubMenu / vSidebar / responsiveGrid /
vBody / router view 组件 / 声明式 router / dynamic-loader / code-block / message-manager /
vChart / vPagination / 主题 token 与采纳）的实现与测试早已落地。

## 实现

- 表单：`src/form/controls.js`（vTimer、vTimerRange）
- 导航：`src/navigation/*`（菜单结构、vSubMenu、vSidebar）
- 布局：`src/layout/*`（vBody、responsiveGrid 等）
- 路由：`src/router/*`（vRouter / vRouterView / vRouterViews / 声明式路由）
- 其余：`src/async/dynamic-loader.js`、`src/data-display/code-block.js`、`src/data-display/pagination.js`、
  `src/data-display/chart.js`、`src/feedback/message-manager.js`、`src/core/theme.js`

## 测试

- `src/components/components.test.js`（vTimer / vTimerRange / vSubMenu / vSidebar 用例）
- `src/layout/theme-shell.test.js`（vBody）、`src/router-*.test.js`、`src/router-views*.test.js`
- `src/async/dynamic-loader.test.js`、`src/data-display/code-block.test.js`、
  `src/data-display/pagination.test.js`、`src/data-display/chart.test.js`、
  `src/feedback/message-manager.test.js`、`src/chart/echart.test.js`
- `src/theme-tokens.test.js`、`src/examples/demos/pagination.test.js`

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
