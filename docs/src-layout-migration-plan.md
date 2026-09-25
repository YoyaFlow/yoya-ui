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

| 位置                                  | 规模                                                                                      | 问题                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/` 根**测试**                     | **24 个** `.test.js`                                                                      | 混三类：① SSR/hydrate 跨模块集成（12）；② 口径门禁（10，含基线）；③ 模块内（2）                                                          |
| `src/` 根**入口**                     | 19 个 `yoya.*.js` façade + `index.js` + `yoya.ui.css`                                     | 入口表在 **5 处**重复（src façade / `scripts/build-entries.mjs` / `package.json exports` / `types/yoya.*.d.ts` / `tsconfig.json paths`） |
| `src/` 根**基线**                     | `attribute-migration-baseline.json`、`view-binding-baseline.json`、`migration-golden.txt` | 数据与代码混放，被根目录测试用 `import.meta.url` 就近读取                                                                                |
| `src/examples/`                       | **168 文件 / 1.2 MB（31%）**、31 个测试                                                   | 演示站住在库源码树里                                                                                                                     |
| `src/core/`                           | 100 文件 / **71 测试**                                                                    | 测试与源码同目录（当前事实标准，但规则未成文）                                                                                           |
| `src/compiler/`                       | 60 文件 / 35 测试                                                                         | 工具链与库源码同级                                                                                                                       |
| `src/components/`                     | 6 文件                                                                                    | 名字像"组件分类"，实际是**内核共享实现**，与 `actions`/`form` 这类分类同级容易误导                                                       |
| `src/scaffold/admin-template.test.js` | 1 文件                                                                                    | 测的是**另一个包**（`create-yoya-ui/templates`）的产物                                                                                   |

### 已经漂移的口径（入口表重复的代价）

- `package.json exports` 有 `./ui`、`./compiled-registry`，但 `tsconfig.json paths` 没有；
- `types/{ssr,i18n,layout,theme,effects,svg}.d.ts` 存在，但既没有 `types/yoya.*.d.ts` 别名，也没有导出入口；
- `src/yoya.ssr.js` 是内部 façade（22 处引用），不在 `exports` 里；
- 两个"根入口"并存：`src/index.js`（14 个域聚合）与 `src/yoya.ui-router.js`（`exports["."]` 指向它的产物）；
- 库内 import 风格混杂：91 处 import `../index.js`，31 处走 `../core/index.js`；
- 文档 / skill 有 **153 处** `src/<dir>/` 路径引用（19 个文件），路径一动就得同步。

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

| 规则           | 从                                                 | 到                                                       |
| -------------- | -------------------------------------------------- | -------------------------------------------------------- |
| 跨模块集成测试 | `src/<12 个>.test.js`、`src/yoya.devtools.test.js` | `src/testing/integration/**`（`devtools-entry.test.js`） |
| 口径门禁       | `src/<10 个>.test.js`                              | `src/testing/gates/**`                                   |
| 门禁数据       | `src/*-baseline.json`、`src/migration-golden.txt`  | `src/testing/baselines/**`                               |
| 模块内测试     | `src/client-only.test.js`                          | `src/core/client-only.test.js`（就地）                   |
| 演示站         | `src/examples/**`                                  | `examples/**`                                            |
| 类型           | `types/yoya.*.d.ts`、`types/tests/consumer.ts`     | `types/entries/*.d.ts`、`types/consumer.test-d.ts`       |

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
3. **每层后重生成目标仓 `src/index.js`**：只 `export *` 当前已存在的域 → 中间态自洽，
   能跑"已迁文件自己的测试"（L0 就把 core 套件跑绿：73 文件 / 596 条）。
4. 每层后跑 `lint`（搬迁会改变相对路径长度，可能触发 `max-len 100`）与该层测试。
5. 最后一层做**文件集对比**（`check-move.mjs`）：源仓 ↔ 目标仓，确认不漏文件。

**为什么必须按闭包分层**（实测事实，决定了方案形状）：

- 测试习惯是"**从聚合出口进**"：`src/core/**` 75 个测试里 57 处 import `../index.js`；
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
| L9  | `src/testing/**`（票 01）+ 基线                                      | **全量 1766 条** + 6 个整树门禁 + 金标            |
| L10 | `examples/`（票 03，搬出 `src`）                                     | 演示 226 条 + `examples` 构建                     |
| L11 | 文档 / skill / CI / 脚本路径常量                                     | `lint` + `format:check` + `build` + `verify:dist` |

## 5. 路径重写：四类 + 两条教训 + 一次补刀

| 类别          | 例子                                            | 处理                   |
| ------------- | ----------------------------------------------- | ---------------------- |
| import 说明符 | `import x from '../core/node.js'`               | AST 定位后按新位置重算 |
| URL 相对路径  | `new URL('./core/index.js', import.meta.url)`   | 字符串字面量解析后重算 |
| 字符串常量    | `'src/examples'` / `resolve('src/yoya.ui.css')` | 按搬迁规则替换         |
| HTML 内联脚本 | `<script type="module">import '../yoya.ui.css'` | 该行按新层级重算       |

1. **不能用正则扫全文改 import**：`src/compiler/*.test.js` 把夹具源码写在字符串里，正则会改坏字符串里的
   `import … from '../yoya.core.js'`（表现：编译器测试 `UNRESOLVED_IMPORT`）。
2. **`.d.ts` 要用 TS 插件解析**：`export declare const …` 用 `jsx` 插件解析失败 → 静默不改
   （表现：`types/entries/*.d.ts` 没改路径，`tsc` 报 TS2307）。

**补刀（`fix-path-drift.mjs`，19 处）**：工具只改代码里的 import 与路径常量，**改不到散文**。
目标仓跑完门禁后仍有旧路径残留，已逐条修：

- `src/view-binding-baseline.json` → `src/testing/baselines/view-binding-baseline.json`
  （`AGENTS.md`、`docs/component-authoring{,.zh-CN}.md`）；
- `types/tests/consumer.ts` → `types/consumer.test-d.ts`
  （`AGENTS.md` ×2、`docs/component-authoring{,.zh-CN}.md`、`docs/handoff-*.md`、
  `skills/yoya-ui/references/components.md`、`package.json` 的 `files` 排除项）；
- `src/*.ssr.test.js` → `src/testing/integration/*.ssr.test.js`（`README{,.zh-CN}.md`、`docs/why-yoya-ui{,.zh-CN}.md`）；
- `src/{theme-tokens,preset-scope,attribute-migration-baseline}.test.js` → 加 `src/testing/gates/` 前缀
  （`src/yoya.ui.css` 注释 ×2）；
- `README{,.zh-CN}.md` 的目录树块：`examples/` 从 `src/` 里挪到顶层，补 `src/testing/`。

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

- **cut 2**：票 02 入口单一真源（`src/entries/` + `scripts/entries.mjs` 表 + 别名生成 + 入口门禁），
  顺手修掉 3 处已漂移的入口表。
- **cut 3**：票 05 分层（`dom/`、`ui/` 嵌套，~150 文件路径改动）/ 票 06 core 拆包——
  需先拍板 core 边界（i18n / access / context / theme helper 算 core 还是共享工具）与是否加 workspaces。
- 仍待拍板：M 档位（M0 只修模板漂移 / **M1 加 workspaces 零路径改动** / M2 `packages/*`）、
  模板档（A 清模板 `dist` / B 模板出 `src` / C 独立仓）。
