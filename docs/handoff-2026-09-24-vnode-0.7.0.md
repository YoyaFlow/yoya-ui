# vnode 迁移交接（2026-09-24 · 0.7.0）

> 面向下一个接手的人 / 会话。本文件是**版本化**的交接面（`.scratch/vnode-convergence/issues/` 里的票
> 15 / 16 / 17 / 19 / 20 / 21 是细账，按项目约定 git-ignored，只存在于工作区）。先读本文件，
> 再按需翻票。

## 0. 当前状态

| 项       | 值                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 分支     | `release/0.7.0`（从 `feat/vnode-convergence` 的 `65500fe` 开出）                                                                                                                                                                                                                                                   |
| 最新提交 | `1b8df0c`（本文档）+ **工作区里未提交的菜单族收口那一刀**（`VMenu` / `VSubMenu` / `VSidebar` 收成闭包，见下方「3.1」）                                                                                                                                                                                             |
| 存档标签 | `vnode-migration-20260924` → `65500fe`（只含本会话的迁移，不含并行会话在飞改动）                                                                                                                                                                                                                                   |
| 工作区   | **有未提交的一刀**：`src/navigation/menu.js` / `src/core/node.js` / `src/actions/{dropdown,context}-menu.js` / `types/navigation.d.ts` / `src/testing/baselines/migration-golden.txt` / `src/testing/gates/dom-access-baseline.test.js` / `README*.md`（其余干净；`dist/` / `node_modules/` / `.scratch/` 已忽略） |
| 细账票   | `.scratch/vnode-convergence/issues/17`（现场）、`19`（写法规则 R1–R12）、`18` / `20` / `21`（编译器侧）。**方案与逐刀台账（15 / 16）、审计脚本、WIP 补丁已在 2026-09-25 的 `.scratch` 清理里删除**；目录表见 `.scratch/README.md`，仍然适用的口径都在本文件 + `AGENTS.md` + `docs/component-authoring{,.zh-CN}.md` |

## 1. 这一版定了什么口径（下一刀直接照用）

1. **组件只有两种形态**：A 薄工厂（无行为，直接返回 ViewNode）/ B `vNode((api) => 视图)`（有状态、命令、
   钩子）。对象组件（`{ render() }`）与 class 组件（`class XxxNode extends HtmlElementNode` 当组件）
   都已退场——**组件一律不继承 `HtmlElementNode`**（那是基础元素的语义，节点类型只归引擎）。
2. **组件代码不碰 DOM**：不许写 `_el`，不许用 `renderDom()`。要碰 DOM 只有三条口子：
   `focus()` / `owns(target)` / `prop(name[, value])`，**再加第二批口子**（2026-09-24 存量清扫）：
   `isLanded()`（落地判定）/ `measure()`（量测，`rect` 撞 SVG 的 `rect` 元素工厂所以叫 `measure`）/
   `emit(type[, detail][, options])`（派发事件）/ `invoke(name, …)`（调原生方法：`showModal` / `close` /
   `reset` / `requestSubmit` / `remove`）/ `focusFirst()` / `replaceChildren(…)`（节点方法）/
   `reorderChildren(ordered)`；全部可被组件命令遮蔽。
   **挂载期**需要真元素（观察器、渲染器宿主、焦点陷阱）用 `whenMount(host)` 的 `host.element()`；
   门禁 `src/testing/gates/dom-access-baseline.test.js` 把 `_el` + `renderDom()` 一起冻在零（允许清单只剩三处节点类型扩展）。
3. **写法规格照 `VBadge`**（`src/data-display/badge.js`）：props 在参数表解构 + `...rest` 摊进根元素工厂；
   状态用 `asSignal` / `ref`，归一放**读时** `computed`；静态样式进 `yoya.ui.css`（`[vn~='VXxx'] …`）；
   几何走 CSS 变量；列表用 `ref` + `keyed`；命令只写状态、不搬结构。逐条判据见票 19。
4. **容器组件的两层分工照 `VTable`**（`src/data-display/table.js`）：结构层（视图根 / 段命令 / 行通道）
   与数据层（`vTableWrapper` 那类外壳）分开——要"细粒度结构操作"给结构层命令，要"数据驱动"给外壳。
5. **容器的容器态下推照 `VSteps`**（`src/navigation/steps.js`）：`track(context)` 把容器句柄交给单元，
   单元自己派生（不遍历结构、不写别人的 DOM）。
   **菜单族是例外口径（2026-09-24 菜单容器那一刀）**：协议名写 **`trackState(context)`**——
   单元里 `track` 是 HTML `<track>` 的短名，对没在自己 api 上定义它的单元（分隔线这类薄工厂）
   会落到子工厂上，凭空建一个 `<track>` 元素。另：**"内容区就是组件根元素"的容器，构建回调的帧
   要落在视图根上**（`view.setupFunction(() => builder(self.node()))`，句柄仍是组件节点）——区域
   `rebuildable()` 只由元素节点订阅依赖，声明在组件节点上的区域不随信号重建。
6. **属性化已收口**：`yoya-v*` / `yoya-component` 类名清零；皮肤只从 `[vn~='VXxx']` 起头；
   门禁 `src/testing/gates/attribute-migration-baseline.test.js` 改成"必须保持空"，`src/testing/gates/preset-scope.test.js` 守身份作用域。
   跨组件能力类 `yoya-<feature>`（`yoya-icon` / `yoya-layout` / `yoya-control-clear`）保留。
7. **编译路径的四条硬约束见 `AGENTS.md`**（运行期优先 / 不为编译牺牲运行期 / 不引运行期错误 / 编译器只懂形状），
   验收动作也在那一节。

## 2. 已经收完的（本会话）

- **布尔族**：组 `VCheckboxes` / `VRadios`（`keyed` 项账 + `asSignal` 读时归一 + 列数走 CSS 变量）；
  单件 `VCheckbox` / `VRadio` / `VSwitch`（共用一份闭包工厂 `createBooleanControl` + `applyBooleanControlProps`，
  身份 `vn` 字面量留在各自调用点；`hydrateSnapshot` 挂内层 `<input>`；`VRadio` 的同名互斥走 `track`-式命令）。
- **feedback 族**：`VDialog`（原生 `<dialog>` 的 `showModal` / `close` 走 `whenMount` + `owns`）、
  `VTooltip`（悬停 / 聚焦 / 点击 + 文档级关闭，取用器留给目标区与面板）、
  `VMessage` / `VMessageContainer`（倒计时以"剩余毫秒"为唯一真源、文本与进度条走读值绑定；
  消息账 `ref([])` + `keyed`）。
- **actions 族**：`VDropdownMenu` / `VContextMenu`（闭包 + 文档级监听；内层菜单用公开命令 `enabledItems()`）；
  按钮族、`VSymbolButton`、`VFloatButton` 此前已收。
- **菜单元件**：`VMenuItem`（匿名内容位 = 标签盒 `vn_slot: ''`）、`VMenuGroup`（闭包，自持
  `vMenuItem` / `vMenuGroup` / `vSubMenu` / `vMenuDivider` 四条细粒度追加命令 + `trackState()` /
  `sidebarHidden()` / `sidebarCollapsed()`）、`vMenuWrapper`（数据驱动外壳：`items` + `active` + `onSelect`，
  `keyed` 对账）、`VMenu.items(builder)` 行通道。
- **菜单族收口**（本刀，同批两段）：`MenuNode` / `SubMenuNode` / `SidebarNode` 全部退场，`VMenu` /
  `VSubMenu` / `VSidebar` 都是闭包——朝向走读值绑定；项账按**视图树递归**
  （分组展开、嵌套菜单不展开＝迁移前的就近作用域）；roving 停点是容器状态、经 `item.tabStop(…)` 推给项；
  结构命令 `vMenuItem` / `vMenuGroup` / `vSubMenu` / `vMenuDivider` / `vMenu` / `vSidebar` 收在 api 上；
  命中判定用 `owns(target)`（`renderDom()` 调用点 2 → 0）；内容位 `replaceContent(setup)`（替换语义）+
  `items(builder)` 行通道 + `whenUnitsChange`（侧栏重排，不再派发 DOM 事件）；引擎侧把
  `rebuildable` / `rebuild` 加进可遮蔽清单（容器把区域转发到视图根）；子菜单与侧栏之间走
  `sidebarContext({ onOpenChange })` 上下文推送（不再改写 `open` 方法）；**审计：`navigation/**` 的
  `HtmlElementNode` 子类清零**；迁移金标：容器那一刀只改一处（`toHTML()` 里 `VMenuItem` 多 `tabindex`），
  子菜单 / 侧栏那一刀逐字不变。
- **宿主机**：`VEChart`（`whenMount(host)` + `host.element()` 初始化适配器、`whenDestroy` dispose）、
  `VThree`（同款；渲染循环 / 像素比 / 尺寸量测；手动渲染一帧仍走 `renderFrame()`）。
- **树**：`VTreeCheckbox` 薄组件（`indeterminate` 这个 DOM property 走 `whenMount` + `prop` 补设）。
- **引擎**：`ElementNode.focus()` / `owns(target)` / `prop(name[, value])` + 可遮蔽清单（`src/core/node.js`；
  用例 `src/core/element-ops.test.js`）；本刀再把 `rebuildable` / `rebuild` 加进同一份可遮蔽清单（容器把
  区域转发到自己的视图根）；**存量清扫那一刀**补齐 `isLanded` / `measure` / `emit` / `invoke` / `focusFirst` /
  `replaceChildren` / `reorderChildren`（组件侧 `_el` 105 → 0、`renderDom()` 17 → 0），`createFocusTrap(root)`
  同时收节点或元素；`delegateNodeCommands` / `whenMount` / `whenDestroy` / `track`（菜单族写 `trackState`）
  是族内标准协议。
- **类型线收口（2026-09-25，`.scratch/component-typing/` 票 01–06）**：`types/*.d.ts` 每个组件按同一形状写——
  `interface VXxx extends ComponentNode` + `interface XxxOptions`（定义函数的直接参数，逐键类型，末尾
  `[key: string]: unknown` 保元素级透传）+ `const VXxx: { (props?: XxxOptions): VXxx }`（**不给 `new`**）+
  快捷方法首参 `XxxOptions | SetupInput<VXxx> | null`；`types/consumer.test-d.ts` 逐组件补了正例 + 负例。
  四条口径：**运行期定义函数没有 props 参数时类型也写 `()`**（实参运行期会被静默丢掉）、**构造签名退场**
  （`new VXxx()` / `instanceof VXxx` 收窄不到句柄）、**对象组件协议退场**（`ComponentLike` 降 `@deprecated`，
  不再进 `ChildInput` / `KeyedRowProduct` / `PageFactory` 等联合分支）、**同名命令 vs HTML 子工厂按并集声明**。
  顺带：新增 `PropValue<T>`（句柄 / 零参闭包 = 活值）；`VPagination` / `VTree` / `VLanguageSwitch` 成为主句柄名
  （旧名留 `@deprecated` 别名）；`VSlot` / `vSlot` 与 `vLink(router, { … })` 第一次有类型。
  破坏面写进 `docs/component-authoring{,.zh-CN}.md` §7.4；当时那份 81 句柄的 props 来源清单
  （`.scratch/component-typing/props-inventory.md`）已随 2026-09-25 的清理删除——**真源就是 `types/*.d.ts` 本身**。
- **对象组件运行期退场（2026-09-25，票 07 = 票 03 阶段 4）**：`{ render(), … }` 不再被接受——
  `child(对象)` / `ComponentNode(对象)` / `renderToString|mount|hydrate(页面对象)` / `vClientOnly(() => 对象)` /
  路由页面对象全部抛错（`src/core/node.js` / `v-node.js` / `ssr.js` / `client-only.js` / `router.js` /
  `components/shared.js`），弃用提示模块 `src/core/deprecations.js` 删除；编译器形态 B 分支
  （`analyze` / `registry` / `runtime` / `discover`）退场，认不出整体回落。
  `examples/**` 40 文件 / 74 个形态 B 工厂迁到 **0**（含 4 个单文件 SVG 演示的内联台本），
  `shape-b-baseline.test.js` 基线归零（从"只减不增"变成"必须为空"）。两条迁移经验写进 `AGENTS.md`：
  **页面壳缓存工厂不缓存节点**、**`get x()` 改读值命令 `api.x = () => …`**。
  门禁：全量 **1766 条** / `lint` / `format:check` / `typecheck` / `build`（编译覆盖度无回退）/ `verify:dist` 全绿。

## 3. 还没做的（按建议顺序）

### 3.1 菜单族 → 闭包（**已收完**）

- **已完成（工作区，未提交）**：`MenuNode` / `SubMenuNode` / `SidebarNode` 三个节点类型全部退场，换成
  `VMenu` / `VSubMenu` / `VSidebar` 闭包；调用点 `src/actions/dropdown-menu.js` /
  `src/actions/context-menu.js`、族内内层菜单、侧栏的单元变化监听全部改到位。
  台账见票 16 第 121 / 122 条（含金标那一处有意变更、三条踩坑、README 体积表刷新）。
- **已核对**：当时的审计脚本（含 `HtmlElementNode` 子类的文件）里 `navigation/**` 清零（全库 12 → 11，剩下的是
  引擎基底 / 编译夹具 / 并行会话的 examples；`layout/theme-shell.js` 随后也整体删除，见 3.2）；
  迁移金标逐字不变。
- 上一轮的半成品补丁（已随 `.scratch` 清理删除）当时逐条诊断了两处根因：
  ① 项账只认 `units()` → 分组没这条协议；② `panelOwns` 没实现 → 内外两层都缺"退出这一层"的判定。

### 3.1b `_el` / `renderDom()` 存量清扫（**已收口**，票 16 第 123 条）

- 组件侧 **`_el` 105 → 0、`renderDom()` 17 → 0**；新增元素级口子见 §1 第 2 条；门禁换成
  `src/testing/gates/dom-access-baseline.test.js`（双禁令 + 允许清单）。
- **允许清单里只剩两处，都是节点类型扩展**（不是组件写法）：`feedback/message-manager.js`
  （管理器节点转发 `renderDom` / `toHTML`）、`data-display/tree.js` 的 `SerializedIconNode`（自绘片段）。

### 3.2 `layout/theme-shell.js` —— **已整体删除**（票 16 第 124 条）

- 用户三连问（"有价值么 / vSurface 能替代么 / 本质上需要它么"）后的结论：需要的是**"面"这个外观**
  （皮肤 + token，`vCard` 是样板）与**"把面施加到某个节点"这个动作**，不需要一个带两种模式 + 节点类型的组件。
- 删除范围：组件与用例文件、皮肤里 `[vn~='VThemeShell']` 的 `--yoya-shell-*` 组合块 + `@supports` 兜底、
  类型（`VThemeShell` / `vThemeShell`）、两条金标用例、两条 `css-contract` 断言、`view-binding-baseline` 条目、
  `dom-access-baseline` 允许清单那行（3 → 2）；示例站唯一调用点改成本地实现
  （`vBody({…}).background('var(--yoya-color-surface…)')` + `.style({ border / borderRadius / … })`）。
- 文档同步：`theme*.md`（"区域级容器 = vThemeShell" → "面由提供它的组件负责，`vCard` 是样板"）、
  `browser-support*.md`（两条外壳透明度条目删除）、`component-comparison.zh-CN.md`
  （"主题化容器"行改成 `vCard` + token，并修掉那行里**不存在**的 `vSurface`）。
- 体积：`yoya.ui.js` 下载 98.6 → **97.9 KB**、皮肤 126.6 → **125.9 KB**、
  `yoya.ui-router.full.js` min+gzip 110.0 → **109.3 KB**。
- **口径**：半透明面不再是库能力——想要就调用方自己写 `color-mix()`（`browser-support` 的通用章节仍讲
  token 与 `color-mix()` 的降级）。

### 3.3 `_el` / `renderDom()` 存量清扫 + 门禁（票 16 第 115 条清单）

- 换法：`focus` → `node.focus()`（`button` / `field` / 菜单族 / 下拉菜单）；`owns` → `node.owns(target)`
  （下拉 / tooltip / 右键菜单"点外面关掉"、菜单命中判定、侧栏走查）；`prop` → 布尔控件 `indeterminate`、
  `input` / `select` / `textarea` / 布尔控件的 hydration 回读、`upload` / `avatar-upload` 的 `files`；
  **挂载期**（观察器 / `showModal` / three·echart 宿主 / 焦点陷阱）→ `whenMount(host).element()`。
- ~~扫完把 `src/render-dom-baseline.test.js` 扩成 **"`_el` + `renderDom()` 双禁令 + 允许清单（只留引擎自身）"**~~ → **已收口**（见 §3.1b：门禁是 `src/testing/gates/dom-access-baseline.test.js`）。

### 3.4 判定为"不是组件、保留"的

- 引擎基底与引擎内部：`src/html/index.js`（`HtmlElementNode` 本身）、`src/svg/index.js`（`SvgElementNode`）、
  `src/core/ssr.js`（`PageDocumentNode` / `PageBodyNode`）。
- 引擎级自定义节点种类：`data-display/tree.js` 的 `SerializedIconNode`（自绘 `renderDom` / `toHTML`）。
- 编译夹具：`src/compiler/fixtures/*`（形态 C 的"读不懂构造体"标本，必须保持类）。
- 演示与文档示例：`examples/component-definition-docs.js` 与 `examples/demos/*-glue.js`（并行会话在改）。

## 4. 开工流程（每刀照抄）

1. 改实现 → 2. 修 / 补该组件的契约用例（`src/testing/gates/css-contract.test.js` 补选择器组）→ 3. 刷新迁移金标
   （`$env:UPDATE_MIGRATION_GOLDEN='1'; npx vitest run src/testing/gates/migration-equivalence.test.js`，跑完清环境变量）→
2. 下调基线（`UPDATE_ATTR_BASELINE=1` / `UPDATE_VIEW_BINDING_BASELINE=1`，只能减）→
3. 六道门禁：`npx eslint .` / `npx prettier --check .` / `npx tsc -p tsconfig.json` /
   `npx vitest run --exclude "examples/**"` / `npm run build`（编译覆盖度无回退）/ `npm run verify:dist` →
4. **按显式文件清单** `git add`（**绝不 `git add -A`**）→ 7. 中文提交信息写清"影响面"→ 8. 更新票 15 / 16 / 17。

## 5. 协作纪律（本仓库有并行会话）

- 并行会话常在改：`docs/compiler*`、`docs/theme*`、`docs/highlights*`、`docs/browser-support*`、
  `skills/yoya-ui/**`、`benchmark/**`、`package.json`、`eslint.config.js`、`src/compiler/**`、
  **`examples/**`**、以及近期的 `src/yoya.ui.css`（`theme-shell.*` 已删除）。
- 提交一律按显式清单；跑门禁时若 `examples/**` 或 `verify:dist` 报错，先看 `git status` 与失败原因判断归属，
  别顺手"替他们修"。
- `yoya.ui.css` 有体积门限（当前 116 KB，实测已到 125.8 KB——并行会话那批主题兜底层的收尾项）。
- 误把自己的提交扫进别人文件时：`git reset --soft HEAD~1` + 定向 `git restore --staged` 退回（工作区不动）。

## 6. 参考实现索引

| 要写什么                           | 看哪个文件                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| 组件写法规格（R1–R12）             | `src/data-display/badge.js`（`VBadge`）+ 本文 §1                                   |
| 容器两层分工（结构层 + 数据外壳）  | `src/data-display/table.js`（`VTable` / `VTableWrapper`）                          |
| 容器态下推（`track(context)`）     | `src/navigation/steps.js`（`VSteps` / `VStep`）                                    |
| 共用闭包工厂（一组组件同构）       | `src/form/controls/shared.js`（`createBooleanControl`）                            |
| 宿主机 + 适配器生命周期            | `src/chart/echart.js`（`VEChart`）/ `src/three/three.js`（`VThree`）               |
| 原生 API / 文档级监听 / 取用器     | `src/feedback/dialog.js` / `tooltip.js` / `actions/dropdown-menu.js`               |
| 数据驱动列表（`keyed` + 行键镜像） | `src/actions/buttons.js`（`VButtons`）、`src/navigation/menu.js`（`vMenuWrapper`） |
| 引擎元素级操作口子                 | `src/core/node.js`（`focus` / `owns` / `prop`）+ `src/core/element-ops.test.js`    |
