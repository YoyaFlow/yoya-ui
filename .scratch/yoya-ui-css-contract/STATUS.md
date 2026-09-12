# yoya-ui-css-contract 家族状态（2026-09-12 补记）

本目录 8 张票（CSS 契约、共享 actions、导航、表单、数据展示、反馈、布局与异步路由、
契约收尾）的实现与测试早已落地：类名按 `yoya-v*` 契约命名，覆盖层（layer）与级联顺序由测试锁定。

## 实现与测试

- `src/css-contract.test.js`：样式资产与契约总表
- `src/cascade-layer.test.js`：`@layer` 顺序与覆盖规则
- `src/className-contract.test.js`：组件类名前缀契约
- 覆盖资产：`src/yoya.ui.css`、各模块 `src/yoya.*.js` 入口

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
