# vnode 迁移交接（2026-09-24 · 0.7.0）

> 面向下一个接手的人 / 会话。本文件是**版本化**的交接面（`.scratch/vnode-convergence/issues/` 里的票
> 15 / 16 / 17 / 19 / 20 / 21 是细账，按项目约定 git-ignored，只存在于工作区）。先读本文件，
> 再按需翻票。

## 0. 当前状态

| 项       | 值                                                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 分支     | `release/0.7.0`（从 `feat/vnode-convergence` 的 `65500fe` 开出）                                                                                                        |
| 最新提交 | `b58bb0e`（0.7.0 快照：本会话的迁移 + 并行会话的编译 / 文档 / 主题批次）                                                                                                |
| 存档标签 | `vnode-migration-20260924` → `65500fe`（只含本会话的迁移，不含并行会话在飞改动）                                                                                        |
| 工作区   | 干净（`git status` 为空；`dist/` / `node_modules/` / `.scratch/` 已忽略）                                                                                               |
| 细账票   | `.scratch/vnode-convergence/issues/15`（方案 + 逐刀台账 §11.6）、`16`（降级 / 口径台账，已到第 120 条）、`17`（现场）、`19`（写法规则 R1–R12）、`20` / `21`（编译器侧） |
| 审计脚本 | `.scratch/audit-node-classes.mjs`（含 `HtmlElementNode` 子类的文件）、`audit-leftovers.mjs`、`audit-static-styles.mjs`、`audit-props-defs.mjs`                          |
| WIP 补丁 | `.scratch/menu-container-wip.patch` / `.scratch/menu-container-wip2.patch`（菜单容器那一刀，未落地）                                                                    |

## 1. 这一版定了什么口径（下一刀直接照用）

1. **组件只有两种形态**：A 薄工厂（无行为，直接返回 ViewNode）/ B `vNode((api) => 视图)`（有状态、命令、
   钩子）。对象组件（`{ render() }`）与 class 组件（`class XxxNode extends HtmlElementNode` 当组件）
   都已退场——**组件一律不继承 `HtmlElementNode`**（那是基础元素的语义，节点类型只归引擎）。
2. **组件代码不碰 DOM**：不许写 `_el`，不许用 `renderDom()`。要碰 DOM 只有三条口子：
   `focus()` / `owns(target)` / `prop(name[, value])`（引擎新增的元素级操作 API，组件自有同名命令可遮蔽它）；
   **挂载期**需要真元素（观察器、`showModal`、渲染器宿主、焦点陷阱）用 `whenMount(host)` 的 `host.element()`。
3. **写法规格照 `VBadge`**（`src/data-display/badge.js`）：props 在参数表解构 + `...rest` 摊进根元素工厂；
   状态用 `asSignal` / `ref`，归一放**读时** `computed`；静态样式进 `yoya.ui.css`（`[vn~='VXxx'] …`）；
   几何走 CSS 变量；列表用 `ref` + `keyed`；命令只写状态、不搬结构。逐条判据见票 19。
4. **容器组件的两层分工照 `VTable`**（`src/data-display/table.js`）：结构层（视图根 / 段命令 / 行通道）
   与数据层（`vTableWrapper` 那类外壳）分开——要"细粒度结构操作"给结构层命令，要"数据驱动"给外壳。
5. **容器的容器态下推照 `VSteps`**（`src/navigation/steps.js`）：`track(context)` 把容器句柄交给单元，
   单元自己派生（不遍历结构、不写别人的 DOM）。
6. **属性化已收口**：`yoya-v*` / `yoya-component` 类名清零；皮肤只从 `[vn~='VXxx']` 起头；
   门禁 `src/attribute-migration-baseline.test.js` 改成"必须保持空"，`src/preset-scope.test.js` 守身份作用域。
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
  `vMenuItem` / `vMenuGroup` / `vSubMenu` / `vMenuDivider` 四条细粒度追加命令 + `units()` / `sidebarHidden()` /
  `sidebarCollapsed()`）、`vMenuWrapper`（数据驱动外壳：`items` + `active` + `onSelect`，`keyed` 对账）、
  `MenuNode.items(builder)` 行通道。
- **宿主机**：`VEChart`（`whenMount(host)` + `host.element()` 初始化适配器、`whenDestroy` dispose）、
  `VThree`（同款；渲染循环 / 像素比 / 尺寸量测；手动渲染一帧仍走 `renderFrame()`）。
- **树**：`VTreeCheckbox` 薄组件（`indeterminate` 这个 DOM property 走 `whenMount` + `prop` 补设）。
- **引擎**：`ElementNode.focus()` / `owns(target)` / `prop(name[, value])` + 可遮蔽清单（`src/core/node.js`；
  用例 `src/core/element-ops.test.js`）；`delegateNodeCommands` / `whenMount` / `whenDestroy` / `track` 是族内标准协议。

## 3. 还没做的（按建议顺序）

### 3.1 菜单容器三个类 → 闭包（**唯一还没收的组件族**）

- 目标：`MenuNode` / `SubMenuNode` / `SidebarNode` 收成闭包；单元从**自己的视图树子节点**递归展开
  （不再 `querySelectorAll`）；容器自持细粒度追加命令；朝向三条属性走绑定；命中判定用
  `view.owns(target)` + `item.owns(target)`；通知走 `track(context)`（不再派发 `yoya:menuitem-statechange`）。
- 现场：`.scratch/menu-container-wip2.patch`（已写完并 lint 干净，但**5 条用例未过**，票 16 第 120 条有逐条诊断）。
  未过的两类：① **项账递归链**（菜单 → 分组 → 子菜单触发器 → 面板内层菜单）——给已渲染分组追加项、
  带禁用项的垂直漫游，`tabIndex` 仍为 `0`，说明有项没被收进漫游；② **命中判定**——左右键横向漫游、
  嵌套菜单独立漫游焦点落到相邻项；另有 1 条金标（菜单那条 DOM 变了：`data-orientation` 只在菜单 / 分组 /
  分割线上、`tabindex` 改由绑定给）。
- 依赖改动的调用点（同刀一起改）：`src/actions/dropdown-menu.js`、`src/actions/context-menu.js` 的内层菜单
  `new MenuNode()` → `VMenu()`；`SubMenuNode` 的内层菜单与 `this._menu._syncTabStops(item)` → `tabStop(item)`；
  侧栏的 `instanceof MenuNode` → 身份判定、`whenUnitsChange` 替代 DOM 事件。

### 3.2 `layout/theme-shell.js`（**先拍板再动**）

- 问题：虚拟模式要在 `renderDom` 时决定"要不要自己这层 DOM"，而 `.virtual()` 允许**构建之后**再调用；
  要收成闭包就得把模式改成**构建期选项**（如 `vThemeShell(body, { virtual: true })`），属公开 API 变更。
- 另外该文件**正被并行会话改动**（票 01 / D11 的背景合成 + `yoya.ui.css` 的 `@supports` 兜底层），
  动之前先 `git status` 看清归属。

### 3.3 `_el` / `renderDom()` 存量清扫 + 门禁（票 16 第 115 条清单）

- 换法：`focus` → `node.focus()`（`button` / `field` / 菜单族 / 下拉菜单）；`owns` → `node.owns(target)`
  （下拉 / tooltip / 右键菜单"点外面关掉"、菜单命中判定、侧栏走查）；`prop` → 布尔控件 `indeterminate`、
  `input` / `select` / `textarea` / 布尔控件的 hydration 回读、`upload` / `avatar-upload` 的 `files`；
  **挂载期**（观察器 / `showModal` / three·echart 宿主 / 焦点陷阱）→ `whenMount(host).element()`。
- 扫完把 `src/render-dom-baseline.test.js` 扩成 **"`_el` + `renderDom()` 双禁令 + 允许清单（只留引擎自身）"**。

### 3.4 判定为"不是组件、保留"的

- 引擎基底与引擎内部：`src/html/index.js`（`HtmlElementNode` 本身）、`src/svg/index.js`（`SvgElementNode`）、
  `src/core/ssr.js`（`PageDocumentNode` / `PageBodyNode`）。
- 引擎级自定义节点种类：`data-display/tree.js` 的 `SerializedIconNode`（自绘 `renderDom` / `toHTML`）。
- 编译夹具：`src/compiler/fixtures/*`（形态 C 的"读不懂构造体"标本，必须保持类）。
- 演示与文档示例：`src/examples/component-definition-docs.js` 与 `src/examples/demos/*-glue.js`（并行会话在改）。

## 4. 开工流程（每刀照抄）

1. 改实现 → 2. 修 / 补该组件的契约用例（`src/css-contract.test.js` 补选择器组）→ 3. 刷新迁移金标
   （`$env:UPDATE_MIGRATION_GOLDEN='1'; npx vitest run src/migration-equivalence.test.js`，跑完清环境变量）→
2. 下调基线（`UPDATE_ATTR_BASELINE=1` / `UPDATE_VIEW_BINDING_BASELINE=1`，只能减）→
3. 六道门禁：`npx eslint .` / `npx prettier --check .` / `npx tsc -p tsconfig.json` /
   `npx vitest run --exclude "src/examples/**"` / `npm run build`（编译覆盖度无回退）/ `npm run verify:dist` →
4. **按显式文件清单** `git add`（**绝不 `git add -A`**）→ 7. 中文提交信息写清"影响面"→ 8. 更新票 15 / 16 / 17。

## 5. 协作纪律（本仓库有并行会话）

- 并行会话常在改：`docs/compiler*`、`docs/theme*`、`docs/highlights*`、`docs/browser-support*`、
  `skills/yoya-ui/**`、`benchmark/**`、`package.json`、`eslint.config.js`、`src/compiler/**`、
  **`src/examples/**`**、以及近期的 `src/layout/theme-shell.*` + `src/yoya.ui.css`。
- 提交一律按显式清单；跑门禁时若 `src/examples/**` 或 `verify:dist` 报错，先看 `git status` 与失败原因判断归属，
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
