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

## 报告页（`benchmark/report.html`）

`benchmark/report.html` 是**生成物**，数据源同样是 `benchmark/results.json`——页面里的数字全部由它渲染，
不许手抄；`npm run verify:dist` 会逐字节校验，手改即失败。命令：

```bash
npm run report:bench:html        # 打印当前数据源摘要
npm run report:bench:html:write  # 重新生成 benchmark/report.html
npm run report:bench:html:check  # 校验页面与数据源一致（verify:dist 调用）
```

本地想额外并列别的条目（例如 Vue / React）时，用官方 runner 的结果目录追加对照列；
这些列来自**各自那一轮**，页面里会标注只作参考、不可与本轮数字混比：

```bash
node scripts/benchmark-report-html.mjs --write \
  --results-dir D:\code\yoyaflow\js-framework-benchmark\webdriver-ts\results \
  --include vue-v3.5.39-keyed --include react-hooks-v19.2.0-keyed
```

注意：提交进仓库的 `benchmark/report.html` 只含 `results.json` 的三列（锚点 / 本次 / 原生），
这样 `--check` 在 CI 上不依赖本机路径；追加对照列的版本是本地用法。
