# 13 — 统一绑定归属与数据来源（scope / state）

**What to build:** 把「绑定归属」与「绑定数据来源」拆成两件事：归属隐式（任意节点都能登记绑定，无需声明），来源显式（只有参数化绑定需要，用 `scope(getter)` 声明或继承宿主）。同时删除 `dataSource()`，让 `rebuildable()` 只表示「结构可重建」。

**Blocked by:** 03 — 绑定归区域（作用域与绑定归属的现状）、12 — 区域发现与绑定释放穿透组件子树（遍历口径）

**Status:** ready-for-agent

**背景（本轮讨论结论）：** 现在「绑定读什么」有三条路（宿主继承 / 区域 `dataSource()` / 零参闭包）+ 一条报错路径，而归属与来源被同一个 scope 对象混在一起，导致两个问题：

- 裸节点写**任何**函数值都抛 `vStateNode binding scope required for function value`，零参闭包也被连坐——可它根本不需要来源；
- 独立子树为了拿到作用域，被迫声明 `rebuildable()`，于是顺带声明了「结构可重建」这一无关语义（区域内 DOM 身份不保，是不该白付的代价）。

**已定决策：**

1. **归属隐式**：任意节点都能登记绑定，无需声明；首屏构建期求值一次，之后由 `flush()` / 宿主 `setState` / 区域重建驱动；释放按子树结构走。
2. **来源显式或继承**：只有参数化绑定 `(s) => …` 需要来源，来源解析顺序为「节点声明的 `scope` / `state` → 捕获的宿主作用域 → 无（报错）」；不合并、不按 key 向上找。
3. **命名定为 `scope(getter)`**（用户已定）。`source` / `stateSource` / `valueSource` 均不采用：`source` 是 HTML `<source>` 标签的快捷方法（`registerChildFactories` 不覆盖同名方法，会直接抢名），`stateSource` 暗示了它只服务 state。
4. **`dataSource()` 删除**（未发布，无存量；可留抛错桩提示改用 `scope()`）。
5. **零参放开、参数化不放**：`(s) => …` 无来源时仍在构建期报错，避免求值期才炸 `Cannot read properties of undefined`。
6. `rebuildable()` 只保留「结构可重建」+ 宿主作用域捕获；无谓词 = 每次 `rebuild()` 都重建（既有契约不变）。

**契约判定表：**

| 场景 | `() => …` 零参 | `(s) => …` 参数化 |
| --- | --- | --- |
| `vStateNode` render 内（任何深度） | ✓ 宿主 `setState` 自动刷 | ✓ `s` = 宿主 state |
| 节点声明 `scope(getter)` 的子树 | ✓ 手动 `flush()` | ✓ `s` = getter 返回值 |
| 区域 / 独立子树，未声明来源 | ✓ | ✗ 构建期报错 |
| 裸节点（无组件、无 scope） | ✓ 手动 `flush()` | ✗ 构建期报错 |

**涉及改动清单：**

**A. 引擎（`src/core/node.js`，全部改动集中在这一个文件）**

- `registerNodeBinding`：无作用域时为零参绑定建隐式归属（`{ bindings: [], hasData: false, getState: () => undefined }` 或直接挂 `owner._bindings`），参数化仍走 `hasData` 门禁；
- `setup()`：首屏求值从「仅 `_rebuildable`」改为覆盖任意节点的绑定；**必须惰性**（按未提交计数跳过无绑定子树），不能每层都刷整棵子树，否则深树是 O(深度 × 绑定数)，SSR 构建成本会被放大；
- 新增 `scope(getter)`：创建/替换节点作用域，`getState = getter`，`hasData = true`；
- 删除 `dataSource(getter)`（`node.js:522`），文案 `declare dataSource(fn) …`（`node.js:129`）改写；
- `rebuildable()`（`node.js:497`）：保留 `enclosingScope` 捕获（区域重跑后内部绑定唯一能拿回宿主作用域的途径），不再负责创建来源；
- `releaseBindings`：允许 `binding.list` 为 null（隐式归属只挂 `owner._bindings`）；
- 错误文案：`vStateNode binding scope required for function value`（`node.js:122`）→ 参数化专属文案（如「parameterized value requires a scope() source or host state」）。

**B. 类型声明**

- `types/core.d.ts:225`：`dataSource` → `scope`；
- `types/tests/consumer.ts:181`：同步改写法。

**C. 测试**

- 新增 `src/core/binding-ownership.test.js`：裸节点零参绑定首屏有值、`flush()` 后更新、值没变不写 DOM、挂进组件后仍靠自身 `flush()`（宿主不接管）、参数化无来源报错（含文案断言）；
- 新增 `src/core/scope.test.js`：`scope` 声明一次覆盖多层多分支子树、`flush()` 一次刷全树、宿主继承在无声明时生效、声明覆盖继承、SSR HTML 含绑定值；
- 改写 `src/core/region-data-source.test.js`（改为 scope 语义，文件名可保留或改 `region-scope.test.js`）；
- 同步 `src/core/node-state.test.js:36`（用到 `dataSource`）；
- 回归面：`region-*.test.js`（10 个）+ `state-node-region.test.js` + `state-binding.test.js` + `devtools.test.js`。

**D. 演示与文档**

- `src/examples/demos/region.js`（演示 3 与对照演示的注释/用法，5 行）、`src/examples/demos/region.test.js`（2 处标题）、`src/examples/component-lifecycle-docs.js`（7 行文案）；
- `src/examples/html-native-docs.js`：API 清单补 `scope(getter)` 行，`setState` 行的说明同步（「不刷绑定」的表述要按本次改动更新）；
- `docs/component-authoring{,.zh-CN}.md`（各 2 行）、`docs/ssr{,.zh-CN}.md` 避免清单新增两条（见下）；
- skill：`references/state.md`（2 行 + 新增「作用域与来源」小节）、`references/core.md`（1 行）、`references/ssr-i18n.md`（+2 条纪律）；仓库版与本机 `~/.codex/skills/yoya-ui` 同步并跑 `quick_validate.py`。

**E. 生产组件与调用点回归**

- 5 个已迁移组件：`vAutocomplete` / `vSteps` / `vBadge` / `vProgress` / `vFloatButton`（用的都是 `rebuildable()` + 零参闭包 + 宿主继承，按「自装优先、否则继承」应零改动，但必须回归）；
- 节点级 `setState` 调用点 19 处（`vButton` / `vMenu` / `vDialog` / `vTooltip` / `vSelect` 等）——若同时做「`setState` 自动刷」需逐个确认；
- 版本：本分支未发布（`0.4.0`），随 0.5.0 一起发，属破坏性变更。

**SSR 影响与要求：**

1. **首屏求值是必需项**：`renderToString` 先建树再 `toHTML()`（`src/core/ssr.js:186`），裸节点的零参绑定若不求值，SSR 输出会缺属性/文本（服务端没有第二次机会）。
2. **绑定函数必须是纯函数**：确定性（禁 `Date.now()` / `Math.random()` / `localStorage` / 读滚动位置）+ DOM-free（禁 `document` / `window`）。服务端求值一次、客户端首屏再求值一次，不一致就是水合错位。
3. **数据必须每请求创建**：零参闭包读模块级可变单例会在并发请求间串数据；本次放开后风险面扩大（以前只有区域/组件内的绑定能在服务端求值）。
4. 服务端**调用** `flush()` / `rebuild()` 仍然禁止；构建期自动求值不算调用。
5. 新增测试：裸节点零参绑定出现在 SSR HTML；SSR 输出与客户端首屏一致。

**待定项（需拍板，不阻塞 A–D 主体）：**

1. `state(...)` 本轮是否做：只留 getter 形态（`state(() => data)`，与 `scope` 的区别是提供写入口）还是也支持对象初值；若做，与 `scope` 在同一节点互斥并抛错（对齐 `vStateNode` 的 builtin 冲突检测）。
2. `getState()` 是否统一为读入口：无参返回 `scope.getState()` 当前值（返回引用，不做拷贝；组件 `component.getState()` 保持浅拷贝契约）。
3. `flushAll()` 本轮是否做：`rebuildable ? rebuild() : flush()`（用户已确认无谓词区域按「允许即重建」处理）。
4. 自持绑定的节点被挂进组件树时，是否把绑定迁移进宿主作用域（建议后置：本轮明确「宿主不接管，自己 `flush()`」）。
5. 零参绑定从未被 flush 的提示方式（devtools 提示或文档警示，不做硬报错）。

**验收：**

- [x] `div((ele) => ele.attr('data-x', () => 'v'))` 构建期不报错，首屏 DOM 与 SSR HTML 都有 `data-x="v"`。
- [x] 上述节点 `flush()` 后重新求值；值未变化时不写 DOM。
- [x] `(s) => …` 在无来源节点构建期报错，文案指向「参数化值需要 scope 或宿主来源」；零参闭包不报错。
- [x] `scope(getter)` 声明一次后，多层多分支子树的参数化绑定全部读到该来源，父级一次 `flush()` 刷完整棵树。
- [x] 组件内不声明任何来源时行为与今天一致（宿主继承），5 个已迁移组件零改动通过回归。
- [x] `dataSource()` 已删除（或抛错提示），全仓文案、类型、示例同步；两份 skill 字节一致且校验通过。
- [x] SSR 三条纪律写入 `docs/ssr*` 与 skill；新增两条 SSR 测试通过。
- [x] `lint` / `format:check` / `typecheck` / `test`（132 文件 973 例）/ `build` / `verify:dist` 全绿。

**实现顺序建议：** ① 隐式归属 + 首屏惰性求值 → ② 参数化门禁与文案 → ③ 新增 `scope()`、`rebuildable()` 解耦 → ④ 删 `dataSource` + 类型 → ⑤ 新增/改写测试 → ⑥ 演示、docs、skill 三方同步 → ⑦ 回归与发布准备。

**实现说明（2026-09-10）：**

- 提交：`8edb7ed`（主体）、`c8fc480`（自查重构）。
- 首屏求值最终实现为两条：**构建期**登记的绑定由构建栈回到最外层时统一刷一次（用构建期绑定序号判断，避免逐层遍历整棵子树）；**构建之外**登记（链式写法 `div().attr(fn)`、挂载后追加）在登记时立即求值一次。自查时先做过「渲染入口惰性求值 + 未求值计数」，因「对重写了 `renderDom()` 的组件不生效」且「释放路径会漏计数」而改为现方案。
- `scope()` 的实现是节点自己的作用域对象（`_ownBindingScope`），来源解析顺序由 `resolveBindingScope()` / `activeDeclaredScope()` 统一处理；区域作用域只是动态读取它（`_regionScope` 的 `get hasData()` / `getState`），因此 `scope()` 与 `rebuildable()` 的调用顺序无关。
- 覆盖范围差一项未做：自持绑定的节点被挂进组件树后由节点自己 `flush()`（宿主不接管），已写进 skill；挂载时迁移作用域留作后置优化。
- 待定项（`state()`、`getState()` 统一读入口、`flushAll()`、devtools 待刷提示）本次未实现，保持票内记录。
