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
3. 用 `npm run report:bench:import` 导入结果（对照条目用可重复的
   `--compare <runner 标签>:<显示名>` 追加，见下），`npm run report:bench:write` 刷新文档表格。

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

页面渲染多少栏由 `results.json` 决定：没有 `compare` 段时是四栏里的前两栏加锚点与原生，
有 `compare` 段时按「锚点 / yoya 本次 / 原生 / 对照 1 / 对照 2…」渲染（与官网结果表同形），
**每个非原生条目的单元格分两层：上值下归一系数（÷ 原生）**，与官网结果表的读法一致。
对照条目的数据来自同一轮测量，导入时用可重复的 `--compare` 追加：

```bash
node scripts/benchmark-report.mjs --import <results 目录> \
  --yoya yoya-ui-core-v0.6.3-perf-local-keyed --anchor yoya-ui-core-v0.6.2-keyed \
  --baseline vanillajs-keyed \
  --compare "vue-v3.5.39-keyed:Vue 3.5.39" \
  --compare "react-hooks-v19.2.0-keyed:React 19.2.0" \
  --runner playwright --mode headless --browser "Chrome for Testing 152.0.7977.64" \
  --cpu-iterations 15 --commit <提交> --version 0.6.3-perf --anchor-version 0.6.2
```

对照条目的数据落在 `results.json` 的 `compare` 段（提交进仓库），因此报告页在 CI 上照样能校验。
