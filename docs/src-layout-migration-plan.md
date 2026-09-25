# src 目录重组迁移方案（cut 1 已在目标仓建成并验证）

**状态**：cut 1 完成并全绿，**已按方案 A 搬回主仓**（2026-09-25）。
**配套票**：`.scratch/src-layout/README.md`、`issues/01`–`07`。
**工具**：`.scratch/src-layout/tools/`（`target-migrate.mjs` / `target-cut1-config.mjs` / `check-move.mjs` / `fix-path-drift.mjs`）。

> 本文是**内部过程文档**（和 `docs/handoff-*.md` 同类），写给维护者；用户向文档见 `docs/index.md`
> 列出的那一套。

## 0. 结论

1. 新模式在独立目标仓 `D:\code\yoyaflow\yoya-ui-target` 建成，**全量门禁绿**：
   `lint` / `format:check` / `tsc` / **225 测试文件 · 1766 条** / `build` / `verify:dist` 全通过。
2. **搬迁不改语义**：目标仓与主仓的 82 个 `dist` 产物逐字节对比，**81 个完全相同**；唯一差异是
   `yoya.ui.css` 里两行注释的路径（迁移补刀）。DOM / 迁移金标 / 体积表 / 编译覆盖度基线全部不变。
3. 搬回主仓走**方案 A：主仓开分支 `refactor/src-layout-v2` 整树搬迁**——保留可 bisect 的历史。
   主仓 `release/0.7.0` 不动，随时可丢弃分支回退。执行结果见 §7。
4. 目标仓的价值有二：**先验证**（新模式全量门禁在独立目录跑通，主仓零风险）+ **生成清单**
   （`check-move.mjs` 的文件映射即搬迁清单）。

## 1. 目标与非目标

**目标**：让"库源码 / 入口 / 测试 / 演示站 / 工具链"的边界在目录上一眼可见，并让**测试位置、
类型位置、模块划分**三条规则成文、可门禁。

**非目标（硬约束，任何一刀都不许动）**：

- 公开子入口路径（`@yoyaflow/yoya-ui/core` 等）；
- DOM / `toHTML()` 输出、迁移金标、编译产物的逐字节等价性、`keyed` / 键语义；
- 编译路径的定位与三条隔离约束（见 `AGENTS.md`「编译路径的定位」）。

## 2. 迁移前体检（主仓实测 2026-09-25）

`src/` 共 **538 文件 / 5.2 MB**：18 个域目录 + 根目录 48 文件。

| 位置                                                   | 规模                                                                                      | 问题                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/` 根**测试**                                      | **24 个** `.test.js`                                                                      | 混三类：① SSR/hydrate 跨模块集成（12）；② 口径门禁（10，含基线）；③ 模块内（2）                                                          |
| `src/` 根**入口**                                      | 19 个 `yoya.*.js` façade + `index.js` + `yoya.ui.css`                                     | 入口表在 **5 处**重复（src façade / `scripts/build-entries.mjs` / `package.json exports` / `types/yoya.*.d.ts` / `tsconfig.json paths`） |
| `src/` 根**基线**                                      | `attribute-migration-baseline.json`、`view-binding-baseline.json`、`migration-golden.txt` | 数据与代码混放，被根目录测试用 `import.meta.url` 就近读取                                                                                |
| `packages/yoya-ui/src/examples/`                       | **168 文件 / 1.2 MB（31%）**、31 个测试                                                   | 演示站住在库源码树里                                                                                                                     |
| `packages/yoya-core/src/core/`                         | 100 文件 / **71 测试**                                                                    | 测试与源码同目录（当前事实标准，但规则未成文）                                                                                           |
| `packages/yoya-ui/src/compiler/`                       | 60 文件 / 35 测试                                                                         | 工具链与库源码同级                                                                                                                       |
| `packages/yoya-ui/src/components/`                     | 6 文件                                                                                    | 名字像"组件分类"，实际是**内核共享实现**，与 `actions`/`form` 这类分类同级容易误导                                                       |
| `packages/yoya-ui/src/scaffold/admin-template.test.js` | 1 文件                                                                                    | 测的是**另一个包**（`create-yoya-ui/templates`）的产物                                                                                   |

### 已经漂移的口径（入口表重复的代价）

- `package.json exports` 有 `./ui`、`./compiled-registry`，但 `tsconfig.json paths` 没有；
- `types/{ssr,i18n,layout,theme,effects,svg}.d.ts` 存在，但既没有 `types/yoya.*.d.ts` 别名，也没有导出入口；
- `packages/yoya-ui/src/ssr.js` 是内部 façade（22 处引用），不在 `exports` 里；
- 两个"根入口"并存：`packages/yoya-ui/src/index.js`（14 个域聚合）与 `packages/yoya-ui/src/ui-router.js`（`exports["."]` 指向它的产物）；
- 库内 import 风格混杂：91 处 import `../index.js`，31 处走 `../core/index.js`；
- 文档 / skill 有 **153 处** `packages/yoya-ui/src/<dir>/` 路径引用（19 个文件），路径一动就得同步。

## 3. 目标结构（cut 1 已达成）

```
yoya-ui-target/
  src/                        # 库源码：370 文件（迁移前 538）
    index.js                  # 聚合出口（分层期间由脚本按"已迁域"重生成）
    entries/?                 # cut 2：入口 façade 收口处（cut 1 仍在 src/ 根）
    core/ html/ svg/ router/ compiler/ …   # 域目录保持平铺（票 05 缓）
    yoya.*.js / yoya.ui.css   # 21 个根文件：19 个入口 façade + index.js + 样式
    testing/
      integration/            # 13 个跨模块集成测试（ssr / hydrate / router-ssr / devtools-entry …）
      gates/                  # 10 个口径门禁（css-contract / *-baseline / structure / theme-tokens …）
      baselines/              # 3 份门禁数据（*-baseline.json / migration-golden.txt）
  examples/                   # 168 文件：演示站搬出 src（票 03）
  types/
    entries/                  # 17 个入口别名（票 04）
    *.d.ts                    # 域声明（对外契约，随包发布）
    consumer.test-d.ts        # 消费方类型测试（原 types/tests/consumer.ts）
```

搬了什么（cut 1 = 票 01 + 03 + 04）：

| 规则           | 从                                                                                  | 到                                                                        |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 跨模块集成测试 | `src/<12 个>.test.js`、`packages/yoya-ui/src/devtools-test.js`                      | `packages/yoya-ui/src/testing/integration/**`（`devtools-entry.test.js`） |
| 口径门禁       | `src/<10 个>.test.js`                                                               | `packages/yoya-ui/src/testing/gates/**`                                   |
| 门禁数据       | `packages/yoya-ui/src/*-baseline.json`、`packages/yoya-ui/src/migration-golden.txt` | `packages/yoya-ui/src/testing/baselines/**`                               |
| 模块内测试     | `packages/yoya-ui/src/client-only.test.js`                                          | `packages/yoya-core/src/core/client-only.test.js`（就地）                 |
| 演示站         | `packages/yoya-ui/src/examples/**`                                                  | `examples/**`                                                             |
| 类型           | `types/yoya.*.d.ts`、`types/tests/consumer.ts`                                      | `types/entries/*.d.ts`、`types/consumer.test-d.ts`                        |

## 4. 迁移机制：按依赖闭包分层（不是按目录硬切）

```bash
node .scratch/src-layout/tools/target-migrate.mjs --layer L0 --source <源仓> --target <目标仓>
node .scratch/src-layout/tools/target-cut1-config.mjs    # 路径常量（幂等）
node .scratch/src-layout/tools/check-move.mjs [--verify-hash]
node .scratch/src-layout/tools/fix-path-drift.mjs --target <目标仓> [--check]
```

1. **层 = 一组种子**（域目录 / 测试文件）；计算种子的**相对 import 传递闭包**（跨域也带上，
   `import` 与 `import()` 都算）。
2. 按票 01/03/04 的移动规则把闭包写进目标仓，**同时按新深度重算文件内的相对 import**。
3. **每层后重生成目标仓 `packages/yoya-ui/src/index.js`**：只 `export *` 当前已存在的域 → 中间态自洽，
   能跑"已迁文件自己的测试"（L0 就把 core 套件跑绿：73 文件 / 596 条）。
4. 每层后跑 `lint`（搬迁会改变相对路径长度，可能触发 `max-len 100`）与该层测试。
5. 最后一层做**文件集对比**（`check-move.mjs`）：源仓 ↔ 目标仓，确认不漏文件。

**为什么必须按闭包分层**（实测事实，决定了方案形状）：

- 测试习惯是"**从聚合出口进**"：`packages/yoya-core/src/core/**` 75 个测试里 57 处 import `../index.js`；
- 域依赖有**两个环（SCC）**：`core ⇄ html`（`core/ssr.js` → `HtmlElementNode`）、
  `actions ⇄ navigation`（`context-menu`/`dropdown-menu` → `VMenu`；`menu.js` → `vButton`）；
- 门禁是**整树口径**：5 个门禁扫整棵 `src` + 金标 + 编译覆盖率 → **只有最后一层之后才能全绿**，
  层内只跑"已迁文件自己的测试"。

**非 import 依赖要显式列**：基线 / 金标 / `benchmark/results.json` / 入口 façade /
`create-yoya-ui` / docs（闭包跟不到"运行时读文件"），已写进工具的 `LAYER_EXTRAS`。

### 分层顺序（SCC 为层）

| 层  | 内容                                                                 | 该层验收                                          |
| --- | -------------------------------------------------------------------- | ------------------------------------------------- |
| L0  | `{core, html}` + 闭包                                                | `vitest run`（闭包内测试）+ `tsc` 绿              |
| L1  | `svg`                                                                | 同上                                              |
| L2  | `components/shared` + 最小 `layout` 闭包                             | 同上                                              |
| L3  | `{actions, navigation}`（SCC）                                       | 同上                                              |
| L4  | `{layout, async}`                                                    | 同上                                              |
| L5  | `{feedback, form, data-display, effects, theme, i18n, chart, three}` | 同上                                              |
| L6  | `router`                                                             | 同上                                              |
| L7  | 入口 façade + `types/`（含票 04 的 `types/entries/`）                | `tsc` + 消费方体检                                |
| L8  | `compiler`（含 fixtures）                                            | 编译器套件绿                                      |
| L9  | `packages/yoya-ui/src/testing/**`（票 01）+ 基线                     | **全量 1766 条** + 6 个整树门禁 + 金标            |
| L10 | `examples/`（票 03，搬出 `src`）                                     | 演示 226 条 + `examples` 构建                     |
| L11 | 文档 / skill / CI / 脚本路径常量                                     | `lint` + `format:check` + `build` + `verify:dist` |

## 5. 路径重写：四类 + 两条教训 + 一次补刀

| 类别          | 例子                                                                              | 处理                   |
| ------------- | --------------------------------------------------------------------------------- | ---------------------- |
| import 说明符 | `import x from '../core/node.js'`                                                 | AST 定位后按新位置重算 |
| URL 相对路径  | `new URL('./core/index.js', import.meta.url)`                                     | 字符串字面量解析后重算 |
| 字符串常量    | `'packages/yoya-ui/src/examples'` / `resolve('packages/yoya-ui/src/yoya.ui.css')` | 按搬迁规则替换         |
| HTML 内联脚本 | `<script type="module">import '../yoya.ui.css'`                                   | 该行按新层级重算       |

1. **不能用正则扫全文改 import**：`packages/yoya-ui/src/compiler/*.test.js` 把夹具源码写在字符串里，正则会改坏字符串里的
   `import … from '../yoya.core.js'`（表现：编译器测试 `UNRESOLVED_IMPORT`）。
2. **`.d.ts` 要用 TS 插件解析**：`export declare const …` 用 `jsx` 插件解析失败 → 静默不改
   （表现：`types/entries/*.d.ts` 没改路径，`tsc` 报 TS2307）。

**补刀（`fix-path-drift.mjs`，19 处）**：工具只改代码里的 import 与路径常量，**改不到散文**。
目标仓跑完门禁后仍有旧路径残留，已逐条修：

- `packages/yoya-ui/src/view-binding-baseline.json` → `packages/yoya-ui/src/testing/baselines/view-binding-baseline.json`
  （`AGENTS.md`、`docs/component-authoring{,.zh-CN}.md`）；
- `types/tests/consumer.ts` → `types/consumer.test-d.ts`
  （`AGENTS.md` ×2、`docs/component-authoring{,.zh-CN}.md`、`docs/handoff-*.md`、
  `skills/yoya-ui/references/components.md`、`package.json` 的 `files` 排除项）；
- `packages/yoya-ui/src/*.ssr.test.js` → `packages/yoya-ui/src/testing/integration/*.ssr.test.js`（`README{,.zh-CN}.md`、`docs/why-yoya-ui{,.zh-CN}.md`）；
- `packages/yoya-ui/src/{theme-tokens,preset-scope,attribute-migration-baseline}.test.js` → 加 `packages/yoya-ui/src/testing/gates/` 前缀
  （`packages/yoya-ui/src/yoya.ui.css` 注释 ×2）；
- `README{,.zh-CN}.md` 的目录树块：`examples/` 从 `src/` 里挪到顶层，补 `packages/yoya-ui/src/testing/`。

> 教训：**"路径引用"不只活在 import 里**。下一次重组（cut 2 / cut 3）要么把散文引用写进同一张表，
> 要么在门禁里加一条"仓库内引用的路径必须存在"的检查。

## 6. 验证（cut 1 实测结果）

在目标仓 `npm ci` 后逐条跑：

| 门禁                                            | 结果                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run lint`                                  | ✓                                                                                    |
| `npx prettier --check .`                        | ✓                                                                                    |
| `npm run typecheck`（`tsc -p tsconfig.json`）   | ✓                                                                                    |
| `npm test`（`vitest run`）                      | **225 文件 / 1766 条全绿**                                                           |
| `npm run build`                                 | ✓（编译覆盖度基线按新扫描根 `['src','examples']` 刷新，**无回退**）                  |
| `npm run verify:dist`                           | ✓（隔离 / SSR 冒烟 / 体积预算 / README 体积表 / 基准表全过）                         |
| 产物 vs 主仓                                    | 82 个 `dist` 文件对比：**81 个逐字节相同**；`yoya.ui.css` 只差上述两行注释           |
| `node .scratch/src-layout/tools/check-move.mjs` | 源仓 758 个真实文件 → 命中 752；缺的 5 个是模板 `dist/` 构建残留（未跟踪，有意排除） |

体积表（与主仓同口径，未回退）：`yoya.ui-router.full.min.js` 376.4 KB / 预算 700；
`yoya.ui.css` 126.1 KB / 预算 128（gzip 22.1，因两行注释变长 +0.1）。

## 7. Transplant（方案 A：源码搬回主仓，保历史）

**本次执行结果（2026-09-25）**：

| 项            | 值                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| 分支          | `refactor/src-layout-v2`（未合并；`release/0.7.0` 停在 `1b8df0c`）                                            |
| C1 迁移前基线 | `58e6aca`（cut 1 前的全部未提交改动 + 本方案文档）；tag `backup/pre-src-layout`                               |
| C2 搬迁       | `77fd517`：210 个 rename + 38 M + 3 A/3 D                                                                     |
| 逐文件校验    | 对应目标仓的 **759 个文件 MD5 全部相同**；`dist` 82 个产物逐一相同                                            |
| 门禁          | 搬迁前 / 搬迁后同口径：lint ✓、format:check ✓、tsc ✓、vitest **225 文件 / 1766 条** ✓、build ✓、verify:dist ✓ |

命令序列（可复跑）：

```bash
cd D:\code\yoyaflow\yoya-ui
git switch -c refactor/src-layout-v2          # 带上当前未提交改动
git add -A && git commit -m "chore: 迁移前基线快照"   # C1
git tag backup/pre-src-layout                  # 安全网
node .scratch/src-layout/tools/transplant.mjs  # 按目标仓覆盖 + 删除已迁走路径
git add -A && git commit -m "refactor(src-layout): 按 src-layout 规划重排 src/（纯搬迁）"  # C2
```

`transplant.mjs` 的语义**只有两句**（不需要映射表，因为目标仓的路径就是终态）：

1. 把目标仓的每个源码文件（排除 `node_modules/`、`dist/`、`build/`、`coverage/`、`.git/`）按同路径覆盖写进主仓；
2. 把主仓 `git ls-files` 里**不在目标仓文件集内**的路径删掉（= 已迁走的旧路径）。

之后 `git add -A` 由 rename 检测读出 `R100`，评审看到的是"纯搬迁"。

**为什么不是方案 B（把 `.git` 搬进目标仓）**：B 一次成型、省一道工序，但只有一个巨型提交，
**中间态不可 bisect**，且要靠 rename 检测读 diff；主仓的目录名还会变，外部引用（同级项目、
IDE、脚本里的绝对路径）要跟着改。A 的代价只是"移动在主仓再执行一次"，清单由 `check-move` 提供。

**共同安全网**：主仓备份 `D:\code\yoyaflow\yoya-ui.backup-20260925`（含 `.git` 与全部未提交改动）

- 分支 `refactor/src-layout-v2` + tag `backup/pre-src-layout`。Transplant 通过 CI 后再删目标仓。

## 8. 回滚

| 阶段                 | 回滚动作                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| 目标仓阶段           | 直接删 `yoya-ui-target`（主仓零影响）                                     |
| Transplant A         | 丢弃分支 / `git reset --hard backup/pre-src-layout`；或用备份目录整树回退 |
| Transplant B（未走） | 切回原分支 + `git reset --hard backup/pre-src-layout`                     |

## 9. 后续 cut 与待拍板

- **cut 2**：票 02 入口单一真源（`packages/yoya-ui/src/entries/` + `scripts/entries.mjs` 表 + 别名生成 + 入口门禁），
  顺手修掉 3 处已漂移的入口表。
- **cut 3**：票 05 分层（`dom/`、`ui/` 嵌套，~150 文件路径改动）/ 票 06 core 拆包——
  需先拍板 core 边界（i18n / access / context / theme helper 算 core 还是共享工具）与是否加 workspaces。
- 仍待拍板：M 档位（M0 只修模板漂移 / **M1 加 workspaces 零路径改动** / M2 `packages/*`）、
  模板档（A 清模板 `dist` / B 模板出 `src` / C 独立仓）。

---

# M2：拆成 monorepo（`packages/*`）—— 已在目标仓落地

**状态**：workspace 骨架 + 目录/依赖拆分完成，`lint` / `format:check` / `tsc` /
**225 测试文件 · 1766 条**全绿（与拆包前逐条一致）。构建与体积报表仍是**旧单包口径**，见 §10。

## 10. 包划分与依赖方向

```
packages/yoya-core/        # 慢线；**不依赖任何组件**
  src/{core,html,svg}/**   #   节点 / 信号 / HTML / SVG / SSR 原语 + i18n·access·context·a11y·theme helper
  src/index.js             #   = 原 src/yoya.core.js（core + html + svg）
  src/api.js               #   = 原 src/yoya.api.js
  types/{index,core,html,svg,api,ssr,devtools}.d.ts + types/entries/**
packages/yoya-ui/          # 快线；peerDependencies: { "@yoyaflow/yoya-core": "^0.7.0" }
  src/{layout,actions,navigation,feedback,form,data-display,async,i18n,theme,effects,router,chart,three,compiler}/**
  src/{index,ui,ui-full,router,router-full,ui-router,ssr,actions,…}.js + src/yoya.ui.css
  types/** + types/entries/**
packages/contract/         # 跨包契约：core ⇄ ui 的边界用例 + 全仓门禁（不进包）
  tests/{core,integration,gates,types}/**  baselines/**
packages/create-yoya-ui/   # 脚手架；模板依赖**钉死当前版本**（0.7.0 + core 0.7.0）
```

依赖方向（可门禁）：

- **core → ui：0 处**（源码级）。`references-ui` 检查写进了拆分工具：core 的**源码**若引用组件域直接报错；
- **ui → core**：库内深引用统一走 `@yoyaflow/yoya-ui`/`@yoyaflow/yoya-core` 的 **`/internal/*`**
  子路径（`@yoyaflow/yoya-core/internal/core/node.js`），公开面只有 `.` / `/html` / `/svg` / `/api` /
  `/ssr` / `/devtools`（core）与 `.` / `/ui` / `/router` / `/ssr` / 各分类（ui）；
- **契约包**是唯一同时 import 两个包的地方（`@yoyaflow/yoya-ui` 侧会注册组件快捷方法）。

### 测试归属怎么定的（机械规则，不是拍脑袋）

1. 先按**领域归属**搬（core/html/svg → core，其余 → ui）；
2. core 里的**测试**再按内容改判：引用了具体组件域 → `packages/contract/tests/`；只从聚合出口进、
   且用到的名字**全在 core 的导出集里**（把 core 聚合 import 进来读 key，静态解析抓不到
   `export const { div, … } = createHtmlFactories(…)`）→ 留 core 但说明符改成 `@yoyaflow/yoya-core`；
3. 结果：**core 留 60 个测试文件**（core 面自成一套），**15 个"从聚合出口进、用到组件"的用例 +
   13 个 SSR/hydrate 集成 + 3 条全仓门禁 + 消费方类型测试**进 contract。

> 这条规则就是票 06 硬点 2 说的"验收标准三分"：core 的慢线验收不再需要组件参与。

## 11. 本轮踩到的坑（都已修，工具留在 `.scratch/src-layout/tools/`）

| 坑                                   | 症状                                                                                                              | 处理                                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| jsdom 下全局 `URL` 被替换            | `new URL('../../..', import.meta.url)` 解析到 `http://localhost:3000/@fs/…`                                       | 用例一律用 `node:path` + `node:url` 显式计算仓库根                                                                      |
| Vite 的 `resolve.alias` + 预解析路径 | 子入口解析成 `/packages/...` 或落在目录上                                                                         | 改成 `resolveId` 插件（`scripts/vite-workspace-plugin.mjs`），只认**文件**、按候选顺序探测                              |
| "路径字面量"两义                     | `'packages/yoya-ui/src/rows/item.js'` 是**夹具数据**，`'packages/yoya-ui/src/compiler/runtime.js'` 是**布局引用** | 归一化规则：能解析到真实文件的才改布局，否则还原成 `packages/yoya-ui/src/…`                                             |
| 编译器把包名当语义                   | `isCoreLikeSpecifier` 只认 `@yoyaflow/yoya-ui` → 拆包后夹具全部 bail                                              | 同时认 `@yoyaflow/yoya-core`；注册表 `keyOf` / `scopeEntryOf` / `isExternal` 按**文件所属包**归口（图标集随 core 发布） |
| 注册表包名来自根 `package.json`      | 键变成 `yoya-ui-monorepo/ui`                                                                                      | 读 `packages/yoya-ui/package.json` 的名字，core 面显式写 `@yoyaflow/yoya-core`                                          |
| `.d.ts` 别名目录深度                 | `types-split` 把 entry 别名里的 `'../x.js'` 算成 `'./x.js'`                                                       | `types-entries-repair.mjs` 退一层 / 换跨包 internal 路径                                                                |

## 12. 还没做的（下一步，按优先级）

1. ~~**构建与产物口径**~~ → **已完成**，见 §15。
2. **包各自的 `npm test` / 发布**：现在是根 `vitest run`（可 `--dir packages/<pkg>` 跑子集）；
   `packages/*/package.json` 的 `test` 已经指向根脚本，真要"包内独立跑"，还需要把门禁里的
   `process.cwd()` 依赖彻底去掉（本轮已去掉大部分）。
3. **单例与发布门禁**：`npm pack --dry-run` 断言 core 包里没有组件文件、ui 包里没有 core 源码；
   两包各装一次时 `instanceof` / 身份判定仍成立（`docs/ssr.md` 的"双副本失配"禁忌）。

## 13. 类型层解耦（票 06 硬点 1）—— 已落地

core 的声明**不再 import 任何组件**（`grep '@yoyaflow/yoya-ui' packages/yoya-core/types/**` = 0），
组件域的父快捷方法反过来由组件包**增强**进去：

```ts
// packages/yoya-ui/types/actions.d.ts（组件包侧）
declare module '@yoyaflow/yoya-core/html' {
  interface HtmlElementNode extends ActionsParentShortcuts {}
}

// packages/yoya-ui/types/router.d.ts（返回类型属于本域的那几个方法）
declare module '@yoyaflow/yoya-core' {
  interface ElementNode {
    vRouter(first?: import('@yoyaflow/yoya-core').SetupInput<VRouter> | null, …): VRouter;
    vLink(routerInstance: VRouter, …): import('@yoyaflow/yoya-core').HtmlElementNode;
    …
  }
}
```

12 个组件域各写一条 `HtmlElementNode` 增强；`vDynamicLoader` / `codeBlock` /
`vThemeModeSwitch` / 4 个 router 方法从 core 的 `ElementNode` 搬到各自的域里（core 的声明里不再有
组件句柄这个类型依赖）。这与运行期**同向**：运行期也是"组件包被 import 时
`registerChildFactories(HtmlElementNode, { vXxx })`"。

### 先红后绿的门禁（`npm run typecheck` 里的第二段）

`packages/yoya-core/tsconfig.json` 是一个**只有 core 声明的 program**（没有指向组件包的 paths /
node_modules 兜底）。core 的声明一旦回头引用组件，它立刻红。里面的
`types/core-boundary.test-d.ts` 就是票 06 §二的用例：

```ts
const page: HtmlElementNode = div();
page.className('page'); // core 面：在
// @ts-expect-error 只装 core 时节点上没有组件快捷方法
page.vButton('提交');
// @ts-expect-error 布局快捷方法也属于快线
page.flex({ gap: 8 });
```

只装 core 时 `vButton` **类型报错**（`@ts-expect-error` 正好吃掉它）；加上组件包后同一行通过
（`types/consumer.test-d.ts` 里是正例）。根 program 用 `exclude` 把这份文件排除，避免两套程序互相干扰。

## 14. 包边界门禁（`npm run verify:packages`）

不构建、只看源码与包元数据的四条断言（`scripts/verify-packages.mjs`）：

1. core 源码 0 处引用 `@yoyaflow/yoya-ui`（`Symbol.for('@yoyaflow/yoya-ui/element-factory')`
   这个全局符号键刻意保留，判定前先抹掉）；core 的 `exports` 里没有任何组件子入口；
2. 组件包的 `peerDependencies` 有 `@yoyaflow/yoya-core ^0.7.0`，且**没有**把它列进 `dependencies`；
3. `packages/yoya-core/src` 下不存在任何组件域目录；
4. 库源码里只有**契约层**与**编译器**同时认得两个包名（编译器必须认得，才能把"从哪个入口导的"
   归口到注册表键——它认的是包名，不是组件名）。

## 15. 构建与产物口径（已按拆包后形态重做）

> **2026-09-25 追加决议**：产物命名以**发布路径与旧包一致**为准，见 §16；§15 的"模块镜像"
> 只是内部实现，`dist` 里**对发布可见的文件名**按 §16 收敛。

```bash
npm run build         # 两个包各建一份 dist + 注册表 + 示例站 + 体积表 + 编译覆盖度
npm run verify:dist   # 产物门禁（六条）
npm run report:bundle:write   # 刷新 README 体积表的生成块
```

**产物形态：`preserveModules` 的模块镜像**（`dist` 的结构 = `src` 的结构），不预压缩——
压缩交给使用者的打包器。这么定有三个理由：库内深引用 `@yoyaflow/yoya-core/internal/*` 必须有稳定落点；
**不产生"core 被内联进 ui 产物"的副本**（单例禁忌）；dist 可读、可 diff。

`scripts/build-packages.mjs` 把它落成两件事：

- `packages/yoya-core/dist` —— 34 个模块（core / html / svg / api / ssr / devtools 原语）；
- `packages/yoya-ui/dist` —— 138 个模块 + `yoya.ui.css` + `chart/echarts.min.js` + `compiled-registry.js`；
  ui 侧 `@yoyaflow/yoya-core*` **全部 external**。

`scripts/verify-dist.mjs` 六条：exports↔dist 对应、两包互不内联、ui 只通过裸包名引 core、
**宿主单例冒烟**（两包各装一次，core 原语 + 组件一起渲染成 HTML，且 `componentNameOf(vCard) = 'VCard'`）、
compiler bin 可执行（验 shebang）、README 体积表 + 基准表一致。

体积口径重写（`scripts/bundle-metrics.mjs`）：一行 = 一个公开入口的**传递闭包 min+gzip**
（跟着 dist 的 import 图重打一次并压缩）。core 行自包含；ui 各行把 core 当 external，
量的是"在 core 之上再加多少"。README 的体积表改成**生成块**（`<!-- bundle-sizes:start -->` … `end`），
`report:bundle:write` 刷新数字，`verify:dist` 按同一份口径核对。

> 自包含全量包（`yoya.ui.full.min.js` / `yoya.router.full.min.js` / `yoya.ui-router.full.min.js`）**退场**：
> core 由 peerDependency 提供之后，再发一份内联副本会把"双副本失配"重新引进来。

**（该条已被 §16 推翻：按用户裁决，`.full` 保持全包含。）**

## 16. 发布产物路径兼容（决议：`.full` 保持全包含）

**硬要求**：`@yoyaflow/yoya-ui` 的 tarball **文件路径与 `exports` 子路径必须与 0.7.0 一致**——
`main`/`module` = `./dist/yoya.ui-router.full.js`、`style` = `./dist/yoya.ui.css`、
`types` = `./types/index.d.ts`、`bin` = `./dist/yoya.compiler.js`；18 个子入口一律指向
`./dist/yoya.<name>.js` 与 `./types/yoya.<name>.d.ts`；类型是**扁平** `types/*.d.ts`（不是 `types/entries/`）。

**内容口径（自包含 vs 增量两类）**：

| 产物                                                                                                  | 内容                         | 理由                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| `dist/yoya.core.js`、`yoya.api.js`（+`.min`）                                                         | **内联 core**（自包含）      | core 的门面产物，CDN 直用照旧；`@yoyaflow/yoya-core` 是它的单源                        |
| `dist/yoya.ui.full.js`、`yoya.router.full.js`、`yoya.ui-router.full.js`（+`.min`）                    | **内联 core**（自包含）      | 用户裁决："full 就是用来全包含的"——免构建单文件是它的存在理由                          |
| `dist/yoya.ui.js`、各分类、`router.js`、`compiler-runtime.js`、`echart.js`、`three.js`、`devtools.js` | **core external**（走 peer） | 旧版这层是"增量入口 + 公共 chunk"；拆包后公共 chunk 的角色由 core 包承担，不再复制实现 |
| `dist/yoya.compiled-registry.js` / `.json`                                                            | 保持旧名                     | 注册表由 `scripts/compiler-registry.mjs` 生成                                          |
| `types/*.d.ts`                                                                                        | 扁平                         | 与旧 `exports.types` 一一对应                                                          |

**已知代价（写在明处）**：自包含产物内联 core ⇒ ui 的 tarball 里存在 core 副本；消费者同时用
`.`（或 `/core`）与 `@yoyaflow/yoya-core` 时会双副本——与旧包同类隐患，`docs/ssr.md` 的禁忌照旧适用。

**落地顺序**（一刀落齐，见 §17）。

## 17. 落地清单（发布路径兼容 —— 已完成，见 §20）

## 20. 发布路径兼容 + 运行期钩子进 core（已落地）

**发布面恢复旧形状**（`packages/yoya-ui`）：`main`/`module` = `./dist/yoya.ui-router.full.js`、
`style` = `./dist/yoya.ui.css`、`types` = `./types/index.d.ts`、`bin` = `{ "yoya-compiler": "./dist/yoya.compiler.js" }`；
`exports` 是旧面 17 个子入口（`.` `/core` `/api` `/ui` `/actions` … `/compiler` `/echart` `/three` `/devtools` `/ui.css`），
`types` 指向**扁平**的 `./types/yoya.<entry>.d.ts`；`files` 恢复 `!types/tests` / `!dist/examples` 那套。

**dist 里怎么产出旧命名**（`scripts/build-packages.mjs`；模块镜像保留给 `/internal/*` 深引用）：

- **增量入口**（`yoya.ui.js` / `yoya.actions.js` … 13 个）→ 一行 `export * from './<name>.js'`（core 走 peer，不内联）+ `.min.js`；
- **自包含入口**（`yoya.core.js` / `yoya.api.js` / 三个 `.full`）→ **真捆绑**、core 内联成单文件。打捆**必须走 workspace 解析插件**，否则裸包名会解析到 core 的 dist 镜像 ⇒ 同一份 bundle 里两份 core（`verify:dist` 的 `.full` 冒烟正是抓这个的）；
- 注册表旧名 `yoya.compiled-registry.js` / `.json` / `.min.js`；补位 `dist/yoya.compiler.js`（转发壳）与 `dist/echarts.min.js`；
- 类型扁平化：`types/entries/yoya.*.d.ts` → `types/yoya.*.d.ts`（`entries/` 删除），`tsconfig paths` 随之改扁平。

**运行期钩子进 core**（`packages/yoya-core/src/core/compiler-runtime.js`）：实现搬进 core（依赖只有 core 的
4 个原语模块），新增子入口 `@yoyaflow/yoya-core/compiler-runtime`；ui 的 `compiler-runtime.js` 变**转发壳**、
ui 的 `packages/yoya-ui/src/compiler/` **整目录删除**。于是「只装 core + 只加编译器」的项目也能跑编译产物；
`verify-packages` §5 断言 core 有钩子、钩子不 import ui、ui 侧已无 compiler 目录。

**`verify:dist` 的单例口径**：跨包冒烟走 **`/ui`（增量）+ core**（全应用一份 core）；`.full` 另有一条
"自己单独能跑"的冒烟——两条都过，才说明"`.full` 自包含、但不与 core 包混用"这条口径成立。

> **2026-09-25 追加**：编译器先独立成包了（§18），发布路径兼容那一刀仍然待做（§17 六步不变）。

## 18. 编译器独立成包（`packages/yoya-compiler/`，已落地）

判据（见本轮讨论）：**"知道形状"的可以独立，"知道本库有哪些组件 / 在哪个入口"的必须留在库里。**

| 去处                               | 内容                                                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **新包 `packages/yoya-compiler/`** | `analyze` / `discover` / `emit` / `compile` / `cli` / `plugin` / `component-key` / `registry`（通用构建器）/ `report` + 全部测试与夹具；`bin: yoya-compiler`     |
| **留在 ui**                        | `packages/yoya-ui/src/compiler/runtime.js`（编译产物的**运行期**钩子，出去会让运行期被迫装编译器）+ `compiled-registry` 数据（库内组件注册表）                   |
| **留在库侧脚本**                   | `CATEGORY_ENTRIES` / `scopeEntryOf` / `packageOfFile`（"哪个文件属于哪个子入口"）——继续在根 `scripts/compiler-registry.mjs` 里，通过参数注入编译器包的通用构建器 |

依赖面（写进 `package.json`，由门禁守）：

- 编译器包的 **peer**：`@yoyaflow/yoya-core`（必需）、`@babel/parser`（可选）、`@yoyaflow/yoya-ui`（可选，只为注册表数据）；
- 编译器包 **没有 dependencies**；
- ui 把 `@yoyaflow/yoya-compiler` 声明成**可选 peer**，`packages/yoya-ui/src/compiler.js` 变成**转发壳**（老子路径 `@yoyaflow/yoya-ui/compiler` 照旧可用，`node dist/yoya.compiler.js …` 会转发到新包的 bin）；
- 根 `scripts/*` 直接引用**源码**（`../packages/yoya-compiler/src/…`），注册表生成不依赖"先构建过编译器包"。

收益与代价：

- ui 的运行期产物从 **138 → 114** 个模块（引擎已不在里面）；编译器有自己的构建/测试/发布节奏；
- **代价（已知债）**：`static-values.js` 仍 import ui 的 `components/shared.js`（组件作者助手的两个主题助手）——这是编译器包目前唯一一条 ui 依赖，下一刀（作者助手进 core）消掉；老项目的 `@yoyaflow/yoya-ui/compiler` 用法现在需要额外装 `@yoyaflow/yoya-compiler`（可选 peer 声明 + README 说明）。

新增门禁：

- `verify:packages` §5：编译器包源码不 import 任何组件域、没有 dependencies、ui 只剩 `compiler/runtime.js`、ui 对编译器包是可选 peer；
- `verify:dist`：编译器包也做 exports↔dist 校验；ui 的 dist 里不得出现编译器引擎文件（`analyze/emit/plugin/registry/discover`）。

## 19. 组件作者助手进 core（已落地）

判据：**第三方组件作者只装 core 时必须能写出一个合法组件**。于是把 `components/shared.js` 一分为二：

| 去处                                                                | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **进 core**（`packages/yoya-core/src/core/component-authoring.js`） | 16 个契约助手：`createComponentShortcut` / `createComponentFactory` / `normalizeComponentArguments` / `applyComponentArguments` / `applyComponentSetup` / `booleanMethod` / `delegateCommands` / `delegateChildFactories` / `delegateNodeCommands` / `elementHasIdentity` / `isPlainObject` / `resolveTextValue` / `normalizeChildren` / `themeValue` / `themeBorder`（+ 内部 `runBuilder`，模块级导出、走 `/internal/*`，不进聚合面） |
| **留 ui**（`components/shared.js`）                                 | 13 个**按族的实现细节**：按钮/消息/下拉的样式构造、槽位装配（`setupButtonSlot` / `setupContentSlot`）、列表键、几何助手 + `export * from` core 的契约助手（40 个组件文件的相对 import 零改动）                                                                                                                                                                                                                                         |

口径与证据：

- core 聚合用**显式名单**导出这些助手；`applyElementOptions` 与 `node.js` 的同名导出冲突，聚合里**只保留 node.js 那一个**（旧面不变），契约侧那个包装走 `/internal/...` 深引用；
- 编译器改成从 `@yoyaflow/yoya-core` 取助手；`isStaticLibraryModule` 认三种写法（旧的 `…/components/shared.js`、新的 `…/core/component-authoring.js`、公开的 `@yoyaflow/yoya-core`）⇒ **编译器包对 ui 的依赖归零**（`verify:packages` §5 新增断言）；
- 体积账：core +0.9 KB（29.9 → 30.8 min+gzip）、ui 相应 +1.2，README 体积表已由 `report:bundle:write` 刷新——这是"契约搬到慢线"的合理代价。

**踩坑记录**：拆模块时若把"紧贴导出的 JSDoc"挪到下一个块，会把一个注释块切两半、产出孤儿 `*/` 直接语法错（本次先撞了一次）；正确做法是**块边界只认顶层 `export`，注释不搬**。

1. `packages/yoya-ui/package.json`：`main`/`module`/`style`/`types`/`bin`/`exports`/`files` 原样恢复 0.7.0；
2. `scripts/build-packages.mjs` 的 ui 侧改为**按旧入口表打包**：`yoya.<entry>.js` + `.min.js`、
   公共 chunk、三个 `.full`（内联 core）、`yoya.compiler.js`（node + shebang）、
   `yoya.compiled-registry.js`/`.json`、`echarts.min.js`、`yoya.ui.css`；
3. `yoya.core.js` / `yoya.api.js`：由 `packages/yoya-ui/src/core-shim.js` / `api-shim.js`
   两个源文件承担（自包含打包，内容来自 core）；
4. ui 类型扁平化：`types/entries/yoya.*.d.ts` → `types/yoya.*.d.ts`（内部 `../x.js` → `./x.js`）；
5. `bundle-metrics.mjs` 的入口清单与 README 生成块回到旧文件名（顺带恢复 `yoya.*.min.js` 与
   `.full` 的行），`report:bundle:write` 重刷；
6. `verify-dist.mjs` 的 exports↔dist 检查按恢复后的元数据自动覆盖；跑 build / verify:dist /
   verify:packages / typecheck / 1766 条测试。

`scripts/workspace-links.mjs` 给 `node_modules/@yoyaflow/*` 建幂等链接（正常由 `npm install` 建，
但构建与产物门禁不该依赖一次 install——它们都要按**包名** import）。
