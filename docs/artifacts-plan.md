# 产物方案（发布面重排）

> 状态：**待评审**。本方案不改任何运行期语义，只重排「发什么、用什么名字发、谁在哪个口径用」。
> 数据来源：`npm pack --dry-run --json` 实测（2026-09-25，0.7.0 + 导入泄漏修复之后）。

## 0. 一句话结论

三条铁律：**打包器口径零内联**、**自包含只属于 CDN 口径**、**一份实现只发一份物理拷贝**。

按此重排，`@yoyaflow/yoya-ui` 的发布体从 **189 文件 / 6.85 MB** 降到 **≈ 3.1 MB（−55%）**，
tarball 从 1956 kB 降到约 1 MB 量级；更重要的是「同一份 core 被复制 9 次（8 个 CDN 变体 +
注册表运行期产物）」这类事故失去土壤
（0.7.0 的双份运行期、`dist/node_modules` 都是同一个病根：**产物面没有单一真源**）。

## 1. 现状盘点

| 包                        | 文件 |    unpacked | tarball | 结论                                                        |
| ------------------------- | ---: | ----------: | ------: | ----------------------------------------------------------- |
| `@yoyaflow/yoya-core`     |   48 |      425 kB |  124 kB | 干净（本轮已清 vitest 泄漏），只需 barrel 纯化              |
| `@yoyaflow/yoya-ui`       |  189 | **7012 kB** | 1956 kB | **重排重点**：51% 是 core 副本，16% 是同一份 echarts 发两份 |
| `@yoyaflow/yoya-compiler` |   27 |      226 kB |   68 kB | 干净（本轮已清 dist/node_modules）                          |
| `create-yoya-ui`          |   90 |      149 kB |   41 kB | 模板资产，另行盘点版本钉法                                  |

`@yoyaflow/yoya-ui` 的 7012 kB 拆开看：

| 类别                         | 文件 |        体积 | 说明                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ---: | ----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 自包含 CDN 产物（core 内联） |   10 | **3349 kB** | `yoya.ui-router.full.js` 931、`yoya.ui.full.js` 865.5、`yoya.ui-router.full.min.js` 377、`yoya.ui.full.min.js` 352、`yoya.router.full.js` 323.5、`yoya.core.js` 255.5、`yoya.router.full.min.js` 133、`yoya.core.min.js` 107.8、`yoya.api.js` 2.5、`yoya.api.min.js` 1.2（api 那对只内联 core 的 request / result 两个模块） |
| echarts（同一份发两处）      |    2 | **2184 kB** | `dist/echarts.min.js` 与 `dist/chart/echarts.min.js` 各 1091.7 kB                                                                                                                                                                                                                                                            |
| 模块镜像 / 常规入口          |  112 |      779 kB | `dist/<domain>/*.js`、`dist/index.js`、`dist/ui.js` …                                                                                                                                                                                                                                                                        |
| 兼容壳（`yoya.*` 一行转发）  |   33 |       ~3 kB | 每个 0.1 kB，壳本身没问题                                                                                                                                                                                                                                                                                                    |
| 注册表                       |    2 |      181 kB | `.json` 数据 117 kB + `.js` 运行期 64.4 kB（**本轮修复**：原来是 268.8 kB，内联了 core 的 18 个模块）                                                                                                                                                                                                                        |
| types                        |   31 |      179 kB | 见 §2/P8                                                                                                                                                                                                                                                                                                                     |
| 皮肤 / 法律                  |    2 |      128 kB | `yoya.ui.css` 126.1 + README/LICENSE                                                                                                                                                                                                                                                                                         |

## 2. 问题清单

| #   | 现象                                                                                                                                     | 代价                                                                    | 风险                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P1  | **根入口是自包含产物**：`main` / `module` / `exports["."]` 都指向 `dist/yoya.ui-router.full.js`（931 kB，core 内联）                     | 打包器用户 `import '@yoyaflow/yoya-ui'` 直接内联整份 core               | 与 peer 口径的 core 形成**双实例**（单例禁忌）；tree-shaking 失效 |
| P2  | 自包含产物 9 个，同一份 core 复制 9 次                                                                                                   | 3614 kB = 包体 51%                                                      | 每加一个 CDN 变体就多一份；合并两变体即双实例                     |
| P3  | echarts 同一份 1091.7 kB 发两份                                                                                                          | 1092 kB = 16%                                                           | 使用者无法判断该引哪个路径                                        |
| P4  | 注册表两份：`.json` 数据 117 kB + `.js` 运行期 269 kB（且 `.js` 里又内联一份 core）                                                      | 386 kB                                                                  | 数据与运行期产物可能漂移                                          |
| P5  | barrel `core/index.js` 顶层有副作用（i18n 短路安装 / theme / access / svg 注册）                                                         | 打包器无法摇掉未用的 i18n + svg ≈ **8.8 kB（−11%）**                    | 也无法声明 `sideEffects`，压缩器只能保守保留                      |
| P6  | `./internal/*` 通配暴露全部内部模块                                                                                                      | 死模块（`core/skeleton-plan.js` 11.7 kB，只有自己的测试引用）也能被消费 | 内部结构一旦成为事实 API 就无法重构                               |
| P7  | 每条入口两套名字（`ui.js` 与 `yoya.ui.js` 壳），没有「哪套是正式」的文档口径                                                             | 使用者选择成本                                                          | 新旧并行的窗口没有终点                                            |
| P8  | types 与 exports 不齐：`./core`、`./api`、`./devtools` 指向**不存在**的 `types/yoya.{core,api,devtools}.d.ts`；`types/css.d.ts` 无人引用 | TS 用户这三个入口拿不到类型                                             | 类型面漂移没有任何门禁                                            |
| P9  | 没有发布预算门禁（文件数 / 体积 / 依赖副本）                                                                                             | 一次构建就能把包体翻倍                                                  | 0.7.0 的 `dist/node_modules`（0.54 MB）就是这么发出去的           |

## 3. 目标方案

### 3.1 三条铁律

1. **打包器口径零内联**：`exports` 的 `import` 条件里，任何入口都不得包含 core 的代码副本——
   只允许裸包名 `@yoyaflow/yoya-core`（peer）或同包内相对引用。
2. **自包含只属于 CDN 口径**：core 内联的单文件只在 `dist/cdn/**` 下产出，名字里带 `cdn`，
   且**不被 `exports` 的打包器条件引用**。
3. **一份实现只发一份**：同一份内容不得在包里出现两次（不同压缩级别也算两份）；
   注册表、echarts、core 都各只有一处真源。

### 3.2 产物矩阵（目标）

| 口径           | 落点                                                                                               | 内容                             | 消费者                        | 现状对比                                  |
| -------------- | -------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------- | ----------------------------------------- |
| 打包器增量     | `dist/<domain>/*.js`、`dist/index.js`、`dist/ui.js` …                                              | ESM、core 走 peer、可 tree-shake | Vite/rollup/webpack 用户      | 基本不变；`index.js` 与 `./core` 需要改薄 |
| 构建期         | `dist/compiler*.js`（壳）→ `@yoyaflow/yoya-compiler`                                               | 转发                             | 用编译器的人                  | 不变                                      |
| 数据           | `dist/compiled-registry.json`                                                                      | 纯形状数据                       | 工具 / 排查                   | 保留为唯一真源                            |
| 运行期注册表   | `dist/compiled-registry.js`                                                                        | 由 `.json` 派生、引裸 core       | 编译过的应用                  | 由「内联 core + 自带数据」改为薄壳        |
| **CDN 自包含** | `dist/cdn/yoya.core.min.js`、`dist/cdn/yoya.ui.full.min.js`、`dist/cdn/yoya.ui-router.full.min.js` | 单文件、core 内联、min           | `<script type="module">` 用户 | 9 份 → 3 份（837 kB vs 3614 kB）          |
| 兼容壳         | `dist/yoya.*.js`（含 `.min`）                                                                      | 一行 `export * from …`           | 旧链接 / 旧文档               | 保留，但**明确指向**上表某一格            |

### 3.3 各包保留 / 改造 / 删除

**`@yoyaflow/yoya-core`**（基本达标）

| 动作 | 对象                                                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 保留 | 模块镜像 + `index.js` / `api.js` / `html` / `svg` / `ssr` / `devtools` / `compiler-runtime`                                                     |
| 改造 | `exports["./internal/*"]` 通配 → **白名单**（只列文档承诺的深引用）；`i18n` / `theme` / `access` 的顶层安装改为显式入口（P5）；补 `sideEffects` |
| 删除 | 死模块出包：`core/skeleton-plan.js`（迁到 `src/testing/` 或删）、`core/signals/conformance.js`（**本轮已迁**）                                  |

**`@yoyaflow/yoya-ui`**（重排主力）

| 动作 | 对象                                                                                                           | 备注                                        |
| ---- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 保留 | `dist/<domain>/*.js` 镜像、`dist/<domain>.js` 增量入口、`yoya.ui.css`、`chart/echarts.min.js`、`types/**`      |                                             |
| 改造 | `exports["."]` / `main` / `module` → **薄入口** `dist/index.js`（component + router，core 走 peer）            | 直接消掉 P1                                 |
| 改造 | `exports["./core"]` → 转发 `@yoyaflow/yoya-core`；`./api` 同                                                   | 打包器不再内联；JFB 条目侧的 alias 可以撤掉 |
| 新增 | `dist/cdn/`：3 个 CDN 产物 + `exports["./cdn/*"]` 显式键                                                       | P2                                          |
| 改造 | `dist/yoya.*.js`（33 个壳）分类定向：增量类 → `./<domain>.js`；自包含类 → `./cdn/*.min.js`                     | P7                                          |
| 删除 | `dist/echarts.min.js`（只留 `chart/` 一份）                                                                    | P3                                          |
| 删除 | `dist/yoya.compiled-registry.js` 的 core 内联（改薄）                                                          | P4                                          |
| 补   | `types/yoya.core.d.ts`（或改为指向 core 包的类型）、`yoya.api.d.ts`、`yoya.devtools.d.ts`；删 `types/css.d.ts` | P8                                          |

**`@yoyaflow/yoya-compiler`**：只补 `unplugin` / `magic-string` 的 peer 声明与 external（**本轮已做**），
并把 `internal/*` 收成白名单。

**`create-yoya-ui`**：模板里钉的 `@yoyaflow/*` 版本必须与发布同步（已有对齐提交，建议加门禁）。

### 3.4 体积账（估算）

| 项                                            |                   现在 |                     目标 |     差额 |
| --------------------------------------------- | ---------------------: | -----------------------: | -------: |
| 自包含 CDN 产物                               |        3345 kB（8 份） |       837 kB（3 份 min） | −2509 kB |
| echarts                                       |                2184 kB |                  1092 kB | −1092 kB |
| 注册表                                        |                 386 kB |                  ~120 kB |  −266 kB |
| 其余（镜像 / 入口 / 壳 / types / css / 法律） |               ~1089 kB |                 ~1092 kB |       ~0 |
| **合计**                                      | **7012 kB（6.85 MB）** | **≈ 3140 kB（3.07 MB）** | **−55%** |

（`@yoyaflow/yoya-core` 另可再省 12 kB：`skeleton-plan.js` 移出 dist。）

### 3.5 `.full` 本身不是问题，**入口指向**才是（实测）

用 esbuild 打三个最小应用（同一台机器、同一份已发布的 0.7.0）：

| 探针 | 写法                                                                                         |     产物 | bundle 内 core 份数 |
| ---- | -------------------------------------------------------------------------------------------- | -------: | ------------------: |
| A    | `import { vCard } from '@yoyaflow/yoya-ui/ui'` + `import { div } from '@yoyaflow/yoya-core'` | 354.2 kB |                   1 |
| B    | `import { vCard, div } from '@yoyaflow/yoya-ui'`（根 → `yoya.ui-router.full.js`）            | 361.0 kB |     1（内联的那份） |
| C    | 根 + `@yoyaflow/yoya-core`（真实应用写法）                                                   | 435.2 kB |               **2** |

结论：

1. **包里放着 `.full` 不影响打包器的产物**——打包器只跟随 import 图，没人 import 就不进 bundle；
   它的代价只是包体/安装体积（8 份 3345 kB）。
2. **入口指向 `.full` 才影响打包**：今天 `main` / `module` / `exports["."]` 全指向它，于是
   ① 任何 `import '@yoyaflow/yoya-ui'` 都内联整份 core；② 忽略 `exports` 的老工具（webpack 4 / Metro /
   老 Jest）走 `main`/`module`，同样内联；③ 一旦应用再按 peer 口径 import core（正常写法），
   一个 bundle 里就有**两份 core**（探针 C：435.2 kB，两份 = 两份信号实例，即文档里的「双副本失配」）。
3. 探针 A 的 354 kB 说明另一件事：`./ui` barrel 把整库都导出、包又没有 `sideEffects` 声明，
   压缩器只能保守保留（P5 的另一个收益面，需单独量化）。

因此方案对 `.full` 的处理是**保留但降级**：只作为 `dist/cdn/**` 的 CDN 产物存在，
`exports` 的 `import` 条件与 `main`/`module` 一律不再指向它们，并加门禁（§5 第 3 条）。

选项：只留 2 个 CDN 产物（core + 全家桶）可再省 352 kB（≈2.7 MB）；若保留非 min 的调试版
（3 份，约 2.05 MB）则回到 ≈5.1 MB——**建议不保留**，调试用打包器增量入口 + sourcemap。

tarball 估算：1956 kB → 约 1 MB（压缩对重复代码更敏感，实际降幅应大于 55%，P2 落地后用
`npm pack --dry-run` 实测复核）。

## 4. 迁移分期

| 期                           | 内容                                                                                                                               | 验收                                                                                                           | 风险                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **P0（已完成）**             | 清导入泄漏（core 的 vitest、compiler 的 unplugin/magic-string）+ 两条门禁（发布源码第三方 import / dist 无依赖副本）               | `verify:packages`、`verify:dist` 全绿；core 0.96→0.42 MB，compiler 0.40→0.22 MB                                | 无（已消除）                                                           |
| **P1（已完成，待发布生效）** | 入口薄化：ui 的 `.` / `./core` / `./api` 与 `main` / `module` 改指薄入口；补 3 个缺失类型入口                                      | bundler 侧导入 ui 不再内联 core（§4.5 实测）；benchmark 条目撤掉 `yoya-share-core` alias 后数据不变（±0.1 kB） | 低：`.full` 语义从「根入口」退到「CDN 专属」，需要文档与 examples 同步 |
| **P2**                       | CDN 收敛：只在 `dist/cdn/` 产 3 个 min 产物；旧 `.full` 名转壳；echarts 只留一份                                                   | `npm pack` 文件数 / 体积达到 §3.4；CDN 冒烟（jsDelivr 路径可加载）                                             | 中等：老 CDN 链接要靠壳保活                                            |
| **P3（已完成）**             | 注册表引裸 core（external 判断漏了裸包名，core 的 18 个 dist 模块曾被内联）                                                        | 注册表 268.8 → 64.4 kB；`verify:dist` [1b] 入口零内联检查通过                                                  | 低                                                                     |
| **P4（进行中）**             | barrel 纯化：i18n + a11y → `/tools`，devtools → `/dev`（**已完成**，见 §4.6）；余下 `sideEffects` + `internal` 白名单 + 死模块出包 | 打包体积 −6.7 kB（实测 78.6 → 71.9 kB）；余下项目做完可达 ≈−8.8 kB                                             | 中等：i18n 短路安装要改成显式入口（行为变化需写进 changelog）          |
| **P5**                       | 兼容壳清理（0.9）                                                                                                                  | 33 个 `yoya.*` 壳删除，保留一张「旧名 → 新名」映射表                                                           | 低（一个 minor 的 deprecation 窗口）                                   |

## 5. 门禁

已有（本轮）：

1. `verify:packages` [6]：发布源码不得 import 测试框架；第三方 import 必须在 `dependencies` / `peerDependencies`。
2. `verify:dist` [2]：任何包的 `dist` 不得出现 `node_modules`，也不得有 import 指进 `node_modules/`。
3. `verify:dist` [1b]：30 个入口（`main` / `module` / `exports.*.import`）不得内联**另一个包**，
   且每个 `exports` 子路径的 `types` 必须存在（P8 的 3 个缺口已补齐）。

建议新增：

4. **零内联（CDN 例外）**：除 `dist/cdn/**` 与既有 `dist/yoya.*.full*.js` 外，任何产物不得出现 core 内联标记（构建期在 bundle 里打 marker，或按
   `ElementNode` 等指纹计数）。
5. **一份实现一份拷贝**：同名内容的文件哈希在包内去重（echarts / 注册表 / core）。
6. **发布预算**：`npm pack --dry-run --json` 的 `entryCount` / `unpackedSize` 不超过阈值（写进 `verify:dist`）。

### 4.5 本轮实测（2026-09-25）

| 项                                                    |               改前（npm 0.7.0） |           改后（本地构建） |
| ----------------------------------------------------- | ------------------------------: | -------------------------: |
| `import { vCard } from '@yoyaflow/yoya-ui'`（根入口） |      361.0 kB / core ×1（内联） | 375.7 kB / core ×1（peer） |
| 根入口 + `@yoyaflow/yoya-core`（真实应用写法）        |          **435.2 kB / core ×2** |     **375.7 kB / core ×1** |
| `import … from '@yoyaflow/yoya-ui/core'` 单入口       |   内联自包含（约 78.6 kB 量级） |          73.9 kB / core ×1 |
| 运行期注册表                                          | 268.8 kB（内联 core 18 个模块） |       64.4 kB（引裸 core） |
| `@yoyaflow/yoya-ui` 包体                              |              7012 kB / 189 文件 |     **6808 kB / 194 文件** |

同一轮验证：`npm test` 225 文件 / 1766 用例、`verify:packages`、`verify:dist`、`lint`、`typecheck`、`prettier` 全绿；
**已发布的 10 个自包含 CDN 文件与 33 个兼容壳一个未动**（P2 的收敛与旧名转壳留给版本窗口）。

### 4.6 入口面拆分（P4 主体，2026-09-25）

做法（每条都为了「用不到的子系统不进 bundle」）：

- core 主入口（`src/core/index.js`）不再 re-export i18n / a11y / theme / 组件作者助手，`src/index.js`
  也不再 re-export svg。新入口：`./tools`（a11y + i18n + **theme** + **component-authoring**）、
  `./dev`（devtools）；svg 走既有的 `./svg`（工厂 + 图标集）。**`vText` 与 `slot` 仍在 core**：
  `slot.js` 只被 `node.js` 内部使用，`vText` 是元素/节点通道的基础原语。
- ui 侧：根入口（`ui-router.js` / `ui-full.js` / 仓内 `index.js`）保持**全量面**（core + svg + tools +
  组件 + router），组件库用户照旧一个入口拿全；新增 `./svg` 子入口与 `yoya.svg.js` 转发壳。
- `./internal/*` 通配 → **白名单**（15 条 core / svg 内部路径 + `internal/types/*`）；
  `skeleton-plan.js` 迁出生产图（`src/testing/`，只有自己的测试引用）。
- 编译器跟着入口面走：`static-values.js` 改从 `/tools` 取 `themeValue` / `themeBorder`（并把
  `@yoyaflow/yoya-core/tools` 纳入可折叠来源）；产物发射按名字分流——HTML 工厂来自 core 主入口、
  SVG 工厂来自 `/svg`（新增 `svgSpecifier` 选项，默认 `@yoyaflow/yoya-core/svg`）；注册表的图标 scope
  也改指 `/svg`。
- ui 侧新增 `src/tools.js` / `src/dev.js`（转发 core），并在构建的 legacy 列表里产出
  `dist/yoya.tools.js` / `dist/yoya.dev.js`（+ `.min.js`）转发壳；老 `./devtools` 路径保留。
- 类型面同步拆分：`types/tools.d.ts`（a11y + i18n 声明从 `types/core.d.ts` 迁出）、`types/dev.d.ts`；
  `core.d.ts` / `ssr.d.ts` / ui 的 `i18n.d.ts` 改为从 tools 取 `I18n` 类型；tsconfig 加
  `yoya-ui/tools` / `yoya-ui/dev` 的 paths。
- 消费点同步：core 侧 4 个测试、ui 侧 4 个测试、2 个 examples、`consumer.test-d.ts`。

实测（同一份 benchmark runtime 条目源码，esbuild minify；用 junction 把 `@yoyaflow/*` 指到本地包）：

| 探针                                       | 已发布 0.7.1 | 本地（P4 主体完成） |              差 |
| ------------------------------------------ | -----------: | ------------------: | --------------: |
| benchmark runtime 条目（`…/yoya-ui/core`） |      78.6 kB |         **69.8 kB** | −8.8 kB（−11%） |
| 同上，只 import `@yoyaflow/yoya-ui/core`   |      73.9 kB |         **65.1 kB** |         −8.8 kB |
| `41 体积未压缩` 预期                       |      80.6 kB |        **≈71.8 kB** |         −8.8 kB |

**`sideEffects` 的实测与结论**：临时把 `"sideEffects": false` 加到 core / ui 后，_根入口_（全量面）
的产物从 **375.7 kB → 65.0 kB（−83%）**——组件库未用部分终于能摇掉；但条目（`/core` 面）**一个字节没变**
（69.8 kB，说明 P4 之后主入口已经没有可摇的副作用）。因为 ui / core 的 dist 里仍有顶层注册
（`registerChildFactories(...)` 等），贸然声明 `false` 会让压缩器把注册一起删——**先做「注册惰性化」
审计再声明**，登记为独立跟进项（不在本轮）。
验证：`npm test` 225 文件 / 1766 用例、`verify:packages`、`verify:dist`、`lint`、`typecheck`、
`prettier` 全绿。

**兼容性**：这是**入口面变更**——`import { createI18n } from '@yoyaflow/yoya-core'` 不再有效，
改用 `@yoyaflow/yoya-core/tools`（或 `@yoyaflow/yoya-ui/tools`），同一条路径也承接 theme 与
组件作者助手（`createComponentShortcut` / `themeValue` / `themeBorder` …）；svg 工厂与图标集走
`@yoyaflow/yoya-core/svg`（或 `@yoyaflow/yoya-ui/svg`）；devtools 走 `/dev`（老 `/devtools` 保留）。
**ui 包根入口不受影响**（全量面），examples / 模板照旧。自包含 CDN 产物（`yoya.core.js` /
`yoya.ui.full*.js` 等）**路径与格式不变，但内容随之变化**——建议随 **0.8.0** 发布。

## 6. 影响面

- **benchmark（js-framework-benchmark 仓库）**：P1 落地后 `keyed/yoya-ui-*` 两套条目可以撤掉
  `yoya-share-core` alias（口径回到「业务源码零改动」）；`41 体积` 预计变化在 ±0.1 kB 量级，
  但**需要重跑一轮**并把数据重新导入 yoya-ui 的 `benchmark/results.json`。
- **examples**：仓库内 4 处 CDN 引用（`yoya.ui.full.min.js` / `yoya.ui.js` / `yoya.core.min.js` /
  `yoya.ui.css`，部分还钉在 0.6.6）要按 §3.2 的矩阵改到新路径，并统一版本钉法。
- **docs**：`docs/packages.md`（发布面表）、`README` 的「发布面」小节、`benchmark/README.md`
  的复跑口径都要跟着改；`docs/src-layout-migration-plan.md` 里「旧发布面」的表述需要标注为历史。

## 7. 需要拍板的决策

1. **CDN 产物留几个**：2 个（core + ui-router）还是 3 个（core + ui + ui-router）？——建议 3 个，
   因为现有 examples 就在用 `yoya.ui.full.min.js`。
2. **是否保留非 min 的 CDN 产物**（+2.05 MB）？——建议不保留。
3. **barrel 副作用怎么改**：i18n 短路安装 / theme 初始化改成显式 `installXxx()` 入口
   （换来 −8.8 kB 与 `sideEffects` 声明），还是保持现状？
4. **`./internal/*` 白名单列哪些**：编译器运行期钩子入口是公开承诺，其余内部模块建议不承诺。
5. **兼容壳的移除版本**：0.9 还是 1.0？
