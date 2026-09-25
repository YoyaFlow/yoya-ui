# 官方基准数据（js-framework-benchmark）

`results.json` 是唯一数据源：由 `node scripts/benchmark-report.mjs --import <官方 runner 的 results 目录>`
（加 `--yoya` / `--baseline` 两个必需标签，`--anchor` 可选用于并列上一个发布版本，以及口径参数）
从官方 runner 的结果 JSON 导入。**用 `node` 直接调用脚本，不要走 `npm run`**——npm 会把
`--version` / `--commit` 当成它自己的参数截走。
`docs/performance.md` 与 `docs/performance.zh-CN.md` 的表格块由它生成，
`npm run verify:dist` 会校验两者一致——手工改文档里的数字会被拦下。

复跑步骤（本机口径，见 `docs/performance.md` 的「运行口径」）：

1. 在 js-framework-benchmark 仓库里装上本地构建的 `@yoyaflow/yoya-ui`（`dist` + `types` + package.json），
   跑 `npm run build-prod`，起 `server`（端口 8080）；
2. `cd webdriver-ts && node dist/benchmarkRunner.js --framework keyed/yoya-ui-ast keyed/yoya-ui-runtime
keyed/vanillajs keyed/vue keyed/react-hooks keyed/solid keyed/svelte --runner playwright --headless
--chromeBinary <Chrome for Testing 路径>`：一次调用跑齐全部条目（`--framework` 与 `--benchmark`
   都接受多个值；`41/42/43` 同属一个基准 id `40_sizes`，跑一次给三个数）；
3. 用 `node scripts/benchmark-report.mjs --import` 导入结果（对照条目用可重复的
   `--compare <runner 标签>:<显示名>` 追加，见下），`node scripts/benchmark-report.mjs --write`
   刷新文档表格。

两个 yoya 条目的名字与语义：`keyed/yoya-ui-ast` = 主列（AST 编译版，构建期把行编成片段 + 位置写）、
`keyed/yoya-ui-runtime` = 对照列（同一份实现的运行期版本，不走编译器）。Solid / Svelte 条目需要
先 `npm install && npm run build-prod`（它们不提交 `dist`）。

**两套条目都不改业务源码、也不改构建配置来对齐 core**（0.7.1 起不再需要 alias）：
`@yoyaflow/yoya-ui/core` 本身就是**转发入口**（转发到 `@yoyaflow/yoya-core`），业务代码与编译产物
天然共用同一份运行期实例。历史背景：0.7.0 时 `yoya-ui/core` 还是自包含产物（core 内联），与编译产物
用的模块化 core 是两个模块图，同一个 bundle 里会带**两份运行期**（体积翻倍，且编译出来的行订阅在
第二个信号实例上，删行 / 改文案 / 交换会退到比运行期版更慢）；当时靠条目侧 alias 顶住，现在由包自身
的入口面封住。

跑之前提醒两点：编译器包 0.7.1 起把 `unplugin` / `magic-string` 也列为 **optional peer**，条目里要装
（`npm i -D @yoyaflow/yoya-compiler @babel/parser unplugin magic-string`），否则 `build-prod` 会静默
失败、留下旧产物；Solid / Svelte 条目同样要先 `npm install && npm run build-prod`。

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
对照条目的数据来自同一轮测量，导入时用可重复的 `--compare` 追加（下面就是当前这轮的七条目口径）：

```bash
node scripts/benchmark-report.mjs --import D:\code\yoyaflow\js-framework-benchmark\webdriver-ts\results \
  --yoya yoya-ui-ast-v0.7.3-keyed \
  --baseline vanillajs-keyed \
  --compare "yoya-ui-runtime-v0.7.3-keyed:yoya runtime（无编译）" \
  --compare "vue-v3.5.39-keyed:Vue 3.5.39" \
  --compare "react-hooks-v19.2.0-keyed:React 19.2.0" \
  --compare "solid-v1.9.3-keyed:Solid 1.9.3" \
  --compare "svelte-v5.42.1-keyed:Svelte 5.42.1" \
  --runner playwright --mode headless --browser "Chrome for Testing 152.0.7977.64" \
  --cpu-iterations 15 --commit <提交> --version 0.7.3
```

对照条目的数据落在 `results.json` 的 `compare` 段（提交进仓库），因此报告页在 CI 上照样能校验。

报告页的**领先 / 落后底色**：与每个对照条目逐一比，yoya 更快涂绿、更慢涂红，差值在 ±5% 内不涂色
（同轮噪声）——这是 `scripts/benchmark-report-html.mjs` 生成的一部分，不是手写的样式。
