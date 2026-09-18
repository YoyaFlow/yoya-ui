# 官方基准数据（js-framework-benchmark）

`results.json` 是唯一数据源：由 `npm run report:bench:import -- <官方 runner 的 results 目录>`（再加
`--yoya` / `--anchor` / `--baseline` 三个标签与口径参数）
从官方 runner 的结果 JSON 导入（三个标签：本版本 / 上一发布版本 / 原生基线）。
`docs/performance.md` 与 `docs/performance.zh-CN.md` 的表格块由它生成，
`npm run verify:dist` 会校验两者一致——手工改文档里的数字会被拦下。

复跑步骤（本机口径，见 `docs/performance.md` 的「运行口径」）：

1. 在 js-framework-benchmark 仓库里装上本地构建的 `@yoyaflow/yoya-ui`（`dist` + `types` + package.json），
   跑 `npm run build-prod`，起 `server`（端口 8080）；
2. `cd webdriver-ts && node dist/benchmarkRunner.js --framework keyed/yoya-ui-core --runner playwright
--headless --chromeBinary <Chrome for Testing 路径>`（原生基线把 framework 换成 `keyed/vanillajs`）；
3. 用 `npm run report:bench:import` 导入结果，`npm run report:bench:write` 刷新文档表格。
