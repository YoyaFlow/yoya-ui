# Project Agent Instructions

## Codebase Knowledge Graph

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
Always prefer MCP graph tools over grep, glob, or file search for code discovery:

1. `search_graph` for functions, classes, routes, and variables.
2. `trace_path` for callers, callees, and data flow.
3. `get_code_snippet` for specific functions or classes.
4. `query_graph` for complex graph queries.
5. `get_architecture` for project-level structure.

Fall back to text search for string literals, configuration, non-code files, or when the graph is stale or insufficient.

## Local Work Tickets

Local tickets are the source of truth for pending tracer-bullet work. They live under
`.scratch/<feature-slug>/issues/*.md` (one ticket per file); `.scratch/` is intentionally
git-ignored. When the user asks about “工作票” or remaining tasks, inspect the newest ticket
set by directory modification time before answering.

`.scratch/` 在 2026-09-25 清理过一轮：**已完成的过程类票、探针脚本、一次性 patch、命令输出全部删除**，
目录表与清理口径见 `.scratch/README.md`。仍然保留的入口：

- `.scratch/vnode-convergence/issues/17-handoff.md`：**交接现场**（当前状态、硬口径、每刀执行清单）；
- `.scratch/vnode-convergence/issues/19-component-writing-rules.md`：写法规则 R1–R12 / 四维度判据怎么逐条查；
- `.scratch/vnode-convergence/issues/18`–`24` + `.scratch/compiler-landing/issues/`：还没做完的编译器 / 视图根 / 页面壳 / 自定义节点票；
- `.scratch/component-typing/issues/08-vnode-command-surface-inference.md`：`vNode` 命令面推断（**暂不实现**）；
- `.scratch/negatives/README.md`：已证伪 / 决定不做的结论索引（**非必要不读**，只在索引命中时才点开）。

动组件之前先读 17 + 19；动编译路径先读 `.scratch/vnode-convergence/issues/18` 与 `20`。

## 编译路径的定位（准则，优先级最高）

编译路径的存在意义是**打榜与曝光**：让更多人在基准与对比里看见 yoya-ui。它不是主战场，
也不该改变主路径的形态。由此推出四条硬约束，任何改动都按它们验收：

1. **运行期优先**：所有 API 以"不跑编译器时的使用方式"为准；编译路径只能**消费**运行期语义，
   不能反过来定义 API、约束写法，或要求用户为了编而改代码。**同一份业务源码，不挂编译器必须完整可用、
   语义一致**；任何编译优化都必须有一条"不跑编译器也成立"的等价实现（编译只允许把它变快）。
   **不许把编译需求带进业务代码**（抽文件 / 改名 / 改 import / 换写法）**或项目脚本**（认某一行源码、
   硬编码业务标识符的接线脚本）——要接线就在编译器/插件里做。
2. **不为编译牺牲运行期**：运行期指标（体积 / 内存 / 首屏 / 构建）已经够用，**不接受**为了编译产物
   更好而让运行期变复杂、变大或变慢。运行期侧的新增字段 / 钩子 / 契约，必须先回答
   "不跑编译器的人为什么需要它"。
3. **编译不得引入运行期错误或复杂度**：编译产物与通用路径必须**逐字节等价**；认不出就整体回落，
   绝不产出半成品；编译产物里不允许出现"只有编译路径才成立"的运行时行为。
   等价性的基准是**不挂编译器的通用路径**，不是"某次手工对过的产物"。
4. **编译器只懂形状、不懂组件**：不允许出现针对某个组件名的分支或清单。允许的"库内知识"只有三张
   接口表——元素白名单（由 core 工厂推导）、库内纯值 / 助手（按导入来源识别）、内容助手（同）；
   其它一律靠形状规则读，读不出就回落。表变大必须显式说明"为什么这是接口，不是组件"。
5. **双向隔离**：编译器逻辑不入侵业务代码，**业务代码也不得被搬进编译工具**。工具侧
   （`src/compiler`、`scripts/compiler-*`、插件 / CLI / 覆盖率脚本、`types`）里不允许出现业务侧的
   函数名 / 组件名 / 路径 / 表名 / 选择器 / 结构常量，也不允许把某个应用的实现整份搬来做"真源"或夹具；
   夹具只能用**中性形状**（`Card` / `Item` 这类），而且只存在于测试里、绝不随包发布。
   反向同样成立：业务代码里不得出现编译产物的名字（生成模块、工厂名、scope）——见第 1 条。

反过来，**性能与体积的取舍只作用在编译侧**（编译器自身、`compiler-runtime` 子入口、生成的模块）——
它们不进主入口的下载路径，可以放心为打榜服务。

**验收动作（每次动编译路径都要过一遍）**：

1. 拿掉编译步骤（把构建配置里挂的插件/脚本去掉），业务源码仍然能跑、且行为一致；
2. 运行期基线不回退：`keyed` / `keySet` / 节点构建与销毁 / 主入口体积的既有门禁（五连 + `verify:dist`）全绿，
   新增字段或分支必须回答"不跑编译器的人为什么需要它"；
3. 仓库里搜不到"认某一行源码"的构建脚本，也搜不到业务标识符（表名、命令名、选择器）出现在构建脚本里；
4. 编译产物与通用路径的等价性用例逐条跑过（DOM 逐字节、事件、活值、销毁、键语义）。

## Component Definition Patterns

**组件只有两种形态**（2026-09-21 收敛）：**A 薄工厂**（没有行为）与 **B vNode**（有行为）。
对象组件（`return { render(), … }`）已退场（票 03 阶段 1–3 + 票 07 阶段 4：**运行期直接拒收**，
`child({ render() {} })` / `renderToString({ render() {} })` / `vClientOnly(() => ({ render() {} }))` /
路由页面对象都报错），class 继承节点**不再是组件写法**——
它只作为**引擎内部的节点类型扩展**存在（见文末「节点类型扩展」）。

### A. 薄工厂：函数直接返回 ViewNode

适用：无内部状态、无对外命令方法、无生命周期诉求——只做结构 / 配置组合，代码量最小。
**确定没有额外行为要定义时就用它**（包括演示代码），不要为「以后可能要用」先包一层。

```js
function ServiceTag(options) {
  return vBadge(options);
}
```

### B. vNode：有行为就用它

适用：有内部状态、对外命令方法，或需要 `whenMount` / `whenDestroy` / `whenFailed` 的组件。
定义即得到组件节点（ComponentNode）：状态放在闭包，命令写在 `api` 上，视图由 setup 返回。

```js
function RateCard() {
  const state = { value: 0 };
  return vNode((api) => {
    api.value = (next) => {
      if (next === undefined) {
        return state.value;
      }
      state.value = next;
      return api; // 等价于返回节点：链式两端都通
    };
    return vRate((rate) => rate.value(state.value));
  });
}
```

- **状态与命令写 `api`，不写 `this`**（`api` 在 setup 的词法作用域里；`this` 只在函数表达式下才等于 api）。
- 命令名与节点 API 冲突（`child` / `attr` / `destroy` / `renderDom` …）**直接报错**，不静默覆盖。

### 组件定义 vs 快捷方法（口径）

- **`VXxx` 是组件定义函数**（PascalCase，名字 = 身份 = 导出名）：描述结构 / 状态 / 命令 / 身份。
  它的参数是**组件自己的东西**（props / 无参），**不负责调用方的 setup 语义**。
- **`vXxx` 是快捷方法**（小写）：建组件，再把调用方参数按 setup 分派落到组件上；
  `page.vXxx(…)` 是同一个方法的父节点形态（由 `registerChildFactories` 注册）。
  所以要"直接调用"或"当快捷方法用"的都是 `vXxx`，`VXxx` 只负责定义。
- **setup 分派有三个可覆盖入口**：`setupFunction`（函数 = 构建回调）、`setupString`（字符串 / 数字）、
  `setupObject`（对象）。组件在 `api` 上定义它们就用自己的；**没定义就回落到根元素的同名实现**
  （`setupFunction` 的回落是组件节点自己的构建帧——回调句柄必须等于工厂返回值）。
  其余分派固定：节点 / 句柄 = 子节点、数组 = 子节点列表。
- 与元素侧对称：`createElementFactory('div', Node)` = 元素种类 + setup 分派；
  组件侧的对应物就是"**定义函数 + 快捷方法**"这一对（`VXxx` / `vXxx`）。
- **形态 A 也按这一对写，不要别名**：需要调用方 setup 分派时，定义 `VXxx()` 只建结构，
  快捷名写 `export const vXxx = createComponentShortcut(VXxx)`，**不要写 `const vXxx = VXxx`**
  把定义当成快捷名（那样定义被迫兼管调用方参数）。无分派需求的转发型薄工厂才直接成立一个名字
  （`ServiceTag(options) { return vBadge(options); }`）。参考实现：`VSlot` / `vSlot`。

### 属性契约：`vn` / `vn_slot`（属性化迁移，票 15）

组件身份与部件位置统一走**属性**；`yoya-component` / `yoya-v*` 类名**已退场**（属性化迁移收口，基线清零、只减不增）。
门禁在 `src/attribute-migration-baseline.test.js`；口径细则见 `docs/component-authoring{,.zh-CN}.md` §7.3 与
`.scratch/vnode-convergence/issues/19-component-writing-rules.md`。

1. **身份 = `vn` 对象事实 + 真 DOM 属性**：视图根写 `vn: 'VXxx'`（值 = 导出名；包装型多值空格分隔，
   如 `'VTimer VInput'`）。`defineComponentIdentity`（`Symbol.hasInstance` 注册）与
   `member instanceof VXxx` **都已退场**；判定用 `componentNameOf` / `hasComponentIdentity`。
   模块内的自有子实例判定留在模块内（不导出类型时用模块内标记，如 `_isTreeRow`）。
2. **跨模块识别用能力约定**：控件 = 有 `value()` / `_collectValue()`（`isControlCapable`）、
   可清空 = `clearable()`；**不按组件名分支**。
3. **类名已退场**：`yoya-component` 与 `yoya-v*`（组件 + 部件）都删完了，预设样式选择器只从 `[vn="VXxx"]` 起头；
   跨组件能力类 `yoya-<feature>`（`yoya-icon` / `yoya-layout` / `yoya-control-clear`）保留。
   **JS 与 CSS 必须同一刀**（组件没写 `vn` 就切 CSS = 掉样式），类名只能减不能增。
4. **组件只有两种写法**：A 薄工厂 / B `vNode((api) => 视图)`；`class XxxNode extends HtmlElementNode`
   只作为**节点类型扩展（视图根）**存在于引擎与组件内部，不导出成组件写法。
5. **定义与快捷名分开**：`VXxx` 只负责定义（自己的 props / 结构 / 状态 / 命令），
   `vXxx = createComponentShortcut(VXxx)` 负责"建 + 应用调用方 setup 分派"；不写 `const vXxx = VXxx` 别名。
6. **命令里要碰节点用 `self.node()`**（setup 第二参句柄）；不写 `let root` 捕获、不把句柄塞进 `api`。
7. **匿名槽位 = 未标记的 `child(...)`**：它就是普通元素语义，内容进**组件根内部**。
   节点类型覆盖过 `child()` 的组件（锚点转发进内层 `<ul>`、表格转发进 `tbody`、徽标进内容框）
   迁移后必须保持**同一条落位路径**：匿名内容不得被静默丢弃、不得改落到包装层或组件节点上。
   多根组件不接受未标记内容（直接报错，不静默丢弃）。
8. **部件（part）**：位置由结构里的 `vSlot('name')` 零布局占位声明，内容自带 `vn_slot: 'name'` 标记，
   `child()` 进组件即自动落位（一个占位一份内容，重复投递即替换）；**没有 `vSlotInsert` 这类辅助函数**。
   `vn_slot`（部件）与 `slot`（公开槽位）是两个名空间，永不复用。

CSS 迁移对照（迁移已完成）：`.yoya-component` → `[vn]`、`.yoya-vcard` → `[vn="VCard"]`、
`.yoya-vcard-header` → `[vn="VCardHeader"]`、`.yoya-vcarousel-arrow--prev` → `[vn="VCarouselArrow"][data-dir="prev"]`。
门禁仍在 `src/attribute-migration-baseline.test.js`（空基线，只减不增）：新代码写类名身份会当场红。

### 节点类型扩展（引擎内部，不是第三种组件形态）

`class XxxNode extends HtmlElementNode` 仍然存在，但它是**组件的视图根 / 自定义元素种类**——
元素机制（`renderDom` / `toHTML` / `child` 语义 / DOM 测量 / 事件绑定 / 生命周期）必须住在节点上。
库内组件都是这个结构：对外只有一个句柄（vNode 组件节点），节点类型**不进包入口**，第三方不需要继承。
B 形态里需要元素级行为的组件，视图根就是这样一个节点类型；这不是给业务/第三方的第三种写法。

- 命名：组件名 PascalCase 描述 UI 单元（ServiceTableCard / VButton）；工厂 `vXxx`、身份导出 `VXxx`、
  身份属性 `vn: 'VXxx'`（CSS 类 `yoya-vxxx` 已退场，见上文「属性契约」）。
- 自定义元素种类（第三方要造非 HTML 宿主 / 自绘渲染目标）是引擎扩展点，票集里叫 `CustomNode`（planned）；
  业务组件不需要它 —— 有行为就把行为写成 B 形态的命令与钩子。
- 库内参考实现：
  - 形态 A：layout 的 flex / stack / grid / container / spacer / divider、`vDynamicLoader`；
  - 形态 B：`vInput` / `vBadge` / `vDialog` / `vPagination` / `vTable` —— 组件库主体全部是 vNode。
- `child(...)` 接受 ViewNode、vNode 组件（自动包装为 ComponentNode）或字符串 / 数字；两种形态都能当子节点传入页面组合。
- 低层元素与 `v*` 工厂在组件内部继续有效；本规则约束可复用组件边界。
- 组件身份：视图根结构里写 `vn: 'VXxx'`（值 = 导出名）——身份既是**对象事实**（判定读它），
  也**落到真 DOM**（`vn="VXxx"`，GenUI 扫描与 CSS 作用域读它）。详见 `docs/component-authoring.md` §7.3。
- **新增组件只有两个选择**：没有行为 → A；有行为 → B（`vNode((api) => 视图)`）。
- **setup 参数数量不定、按出现顺序分派**：函数 = 构建回调、字符串/数字 = 文本、节点/句柄 = 子节点、
  数组 = 子节点列表、对象 = options、同类实例 = 复用；`Factory(options, setup)` 与变参都合法。
- **options 里子工厂不参与分派**：与子工厂同名的键按**属性**写（`div({ slot: 't-head' })` 是属性，
  不是创建 `<slot>` 子元素）；组件自有方法照旧调用（`vDialog({ title })` 是 props）；`attrs` / `style`
  是显式通道。键分类的唯一真源是 `src/core/setup-keys.js`。
- **内容与槽位**：未标记的 `child(...)` 进组件根元素内部（普通元素语义）；带 `slot` 标记的内容按
  **就近作用域**进直接父组件的同名槽位，一个槽一份内容，找不到槽位不 mount；多根组件不接受未标记内容。
- **部件（part）**：位置归组件自己的多处插入点（卡片头 / 体 / 尾等）用 `vSlot('name')` 零布局占位声明
  （裸值 = 占位名，走标准 `setupString` 入口；对象形式 `vSlot({ name, … })` 只多收 `name`，其余键照旧走
  options 分派），part 自带 `vn_slot: 'name'` 标记，`child()` 进组件即自动落位（**不要写插入辅助函数**：没有 `vSlotInsert`）；
  命令里写 `self.node().child(part)`——setup 的第二个参数 `self` 是组件自己的句柄（节点在 setup 返回后才建，
  提前读 `self.node()` 直接报错）。`vn_slot` 与公开 `slot` 是两个名空间，互不干扰。
- **组件级钩子**：`whenMount` / `whenDestroy` / `whenFailed`（同族协议成员，属性持函数，写在 vNode 的 `api` 上）；
  写在 options 对象里会报错，不要与 `onXxx` 事件简写混用。

### Demo 演示组件

- 演示代码（examples/demos）同样只有 A / B 两种：**没有额外操作（无对外命令方法、无需持有组件句柄）时用 A 直接返回 ViewNode**；确有状态或命令方法时用 B（`vNode`）展示操作空间。不再书写对象组件（`{ render() }`）与 class 组件。
- **页面壳缓存工厂、不缓存节点**（票 07 迁移踩到的）：A / B 工厂返回的是**节点**，一个节点只能挂一处；
  `const pages = { upload: createPage(definition) }` 这种模块级缓存会让第二次进同一路由拿到**已销毁的实例**
  （表现为"第一次进页面正常、第二次空白"）。要缓存就缓存 `() => createPage(definition)`，用的时候再调用。
- 演示源码面板复用 ComponentSource（src/examples/component-source.js），不维护重复源码字符串或重新实现源码面板。
- 演示组件与页面壳分离：演示组件只包含 vCardBody 内容与操作方法（如 increment()/reset()/setValue()），Card、按钮和说明文字属于页面壳（live demo），不放进演示组件，也不出现在源码面板中。
- 源码面板展示核心组件时，imports 只列核心组件实际使用的符号；页面壳（Card/按钮）用到的符号不列入。
- 「源码演示」细则（单文件内聚 / 初始化与使用分离 / 源码面板自洽 / 注册三步等）见上文「Demo Code Readability Rule」与演示示例约定。

## Declarative-First Component Rule

组件定义和演示代码优先使用声明式写法：

```js
function ServiceDetailCard() {
  return vCard((card) => {
    card.vCardHeader('服务详情');
    card.vCardBody((body) => {
      body.vDetail((detail) => {
        detail.vDetailItem('服务名称', 'api-gateway');
        detail.vDetailItem('状态', '运行中');
      });
    });
  });
}
```

- 定义组件时优先使用 setup callback、父节点快捷方法和链式方法组合结构。
- 演示代码同样以声明式写法为主，参数对象只作为 API 说明保留。
- 每个组件或演示集最多保留一个完整的参数对象案例，其余示例使用声明式写法。

## Component Writing Rules（2026-09-22 定稿，参考实现 VBadge）

从 `VBadge` 这一刀总结出来的**通用写法**。改造其他组件、迁移新文件都按这十条过；
逐组件的选择见下面「不要一刀切」一节，逐条怎么检查见 `.scratch/vnode-convergence/issues/19-component-writing-rules.md`。

```js
export function VXxx({ count = null, ...rest } = {}) {
  // R1 边界 + R3 参数
  const value = ref(count); // R6 状态
  const text = computed(() => String(value.value ?? '')); // R6 读句柄的派生

  return vNode(() =>
    // R2 一棵树
    span({ ...rest, 'data-count': value, vn: 'VXxx' }, (root) => {
      root.child(span({ vn: 'VXxxLabel' }, (label) => label.child(vText(text))));
    })
  );
}
```

- **R1 边界**：一个业务组件函数 = 一个组件边界（`function VXxx(...) {}`）——身份（`vn`）、状态、
  命令、视图都在里面。
- **R2 一棵树**：整棵树写在最后那个 `return` 里，子节点用回调往下嵌；不往 `return` 外面提中间节点
  变量，也不为"看起来整齐"把每块提成函数（要**复用**或**自带行为**才提）。
- **R3 参数**：props 在参数表里解构；`...rest` 照 JSX 摊进根元素工厂（`{ ...rest, vn: 'VXxx' }`），
  `class` / `attrs` / `style` / `onXxx` 交给引擎的键分类表（`src/core/setup-keys.js`）；`vn` 写在最后。
  **`children` 也从 props 里解构出来、由结构落位**（`function VXxx({ children, ...rest })` +
  `node.child(children)`）：它归"内容"，位置由组件自己定，不该混进 `rest` 当值合并
  （编译器两条通道都能按"内容在结构之前"落位，但显式解构最省事、也最不容易误读——见票 18 §2.2）。
- **R4 属性 / 样式**：能进工厂参数就进参数（`attrs` / `style` 对象，或 `data-*` 这类顶层键），
  值位置可以放句柄 / 零参闭包 / `computed`；只有"要拿句柄、要多步"才在回调里写语句。
- **R5 静态样式进 CSS**：静态（颜色 / 尺寸 / 字体 / 布局）写 `[vn~='VXxx'] …`，状态几何写
  `[data-*]` 规则；组件 JS 里只留随状态变的绑定。
- **R6 状态 → 视图**：状态是 `ref`；纯读直接传句柄；读**句柄**的派生用 `computed`；
  **读结构**（`children().length`、DOM）必须零参闭包 —— `computed` 会缓存住旧值。
- **R7 条件与列表**：条件用 `mountable()`（节点在、只是不在 DOM）或 `cond ? null : node`（彻底不在树）；
  列表用 `keyed()`；只有整块结构必须重建才用区域 `rebuild()`。
- **R8 收口（引擎兜，组件不写）**：「构建 → 落地」窗口里的写入由引擎在**落地时对齐一次** ——
  `ReactiveTarget` 在求值时记下写入序号（`deps.js` 的 `currentWriteSerial()`），落地时若该绑定
  读过的**源**在构建之后被写过，就重新求值并提交（那时元素已建，能直接落到 DOM）。
  于是 props 对象分派、位置参数、"建好就配置"、以及**先写句柄 props 再渲染**都进首屏；
  组件里没有任何收口代码，也没有"命令出口 flush"那层。
  **没有源的绑定**（零参闭包，例如读普通对象）不在对齐范围 —— "构建期只求值一次、后续渲染
  不重复求值"的契约照旧（`binding-ownership.test.js`）；这类绑定写完数据要自己 `flush()`，
  结构变化走区域 `rebuild()`。
- **R9 数据驱动优先**：props 给句柄就是活值（核心助手 `asSignal(value)`：句柄原样返回、普通值包
  `ref`，见 `src/core/signals/handle.js`）。**归一化要放在"读"的时候**：`Boolean(prop)` /
  `Number(prop)` / `prop || 默认值` 写在构建期会把传进来的句柄**吃成常量**（静默丢活值）——
  状态存"句柄原样 / 普通值包 `ref`"，映射写成 `computed(() => …)`，命令写这份状态句柄。
  能靠句柄表达的更新就不要新加命令；有命令的组件，命令**只改状态 / 只写数据**，不搬结构
  （不接部件句柄、不写 `replaceChildren`）、不查找节点、不写 `_el` / `_children`。
  **内容与文本也是数据**：字符串 / 句柄放在值位置上（句柄 = 活文本），节点在构建期落位 ——
  别为了"命令换内容"把节点句柄接出来再手动重建。
- **R10 几何交给 CSS**：可配置几何（偏移 / 尺寸）走 CSS 变量 + `var(…, 默认值)`，JS 不拼样式字符串
  （`--x` 自定义属性现在能落 DOM 与 SSR）。

**不要一刀切（逐组件定，写进 16 号清单）**：

- **R11 插入点数量决定形态**：对外有 **≥2 个"调用方可投递的插入点"**（card 的 header / body / footer、
  tabs 的导航 / 面板、table 的表头 / 表体…）→ 每个插入点用 `vSlot('name')` 声明占位、内容自带
  `vn_slot` 落位，部件是**独立单元**（`VCardHeader` = 自己的 `vn` + 自己的样式 + 自己的投递命令），
  位置与调用顺序无关；**只有 1 个内容位**（VBadge）→ 位置由组件自己写死（JSX 的 `{children}`），
  不给部件 API、也不要 `vn_slot` 占位。
  删 `vn_slot` 时必须**同时**把"有没有内容"的判据改成读数据，否则会出现静默错判。
- **R12 部件身份是"调用方的书写面"**：`VCardHeader` 这类部件是给调用方用的（按名投递、写选择器、
  跨模块识别）；组件自己算出来的内部块（`VBadgeCount` / `VBadgeText`）**即使写了 `vn`**（给 CSS、
  调试用）也**不是部件 API** —— 外部不按名往里投内容。判据一句话：**"调用方能不能决定某块内容
  进哪个位置？"** 能 → 部件；内容由 props / 状态算出来 → 内部块。

### 块形态判据：四个维度（2026-09-22 补）

一个块（一段结构）该写成什么样，看四个维度，按下面的顺序定：

| #   | 维度                           | 取值                               | 结果                                                                                                                 |
| --- | ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | **位置归属**                   | 调用方按位置投递（≥2 个插入点）    | **部件**（`vSlot('name')` 占位 + 部件身份 + 投递 API，R11 / R12）                                                    |
|     |                                | 组件自己算 / 只有 1 个内容位       | **内部块**（位置写死；有 `vn` 也只给 CSS / 调试，不承诺投递）                                                        |
| 2   | **有没有自己的行为**           | 有状态 / 命令 / 生命周期钩子       | **形态 B**：`vNode((api) => 视图)` —— 有行为就是组件边界，自己写 `vn`（部件也可以有行为，如 `VTab`：active / panel） |
|     |                                | 无状态、无命令、无钩子             | **形态 A**：薄工厂直接返回视图（或就地内联）                                                                         |
| 3   | **可插拔**（有时有、有时没有） | 组件自己决定有无                   | **条件渲染**：`mountable()`（节点在、只是不在 DOM）或 `cond ? null : node`（彻底不在树）                             |
|     |                                | 调用方决定给不给、给哪个           | **部件占位**（空着是零布局，不占地方）                                                                               |
|     |                                | 总是有                             | 直接写死                                                                                                             |
| 4   | **复杂度**                     | 一行、无独立布局 / 身份            | 就地内联匿名元素（不给名字）                                                                                         |
|     |                                | 多行 / 有自己的布局样式 / 多处引用 | 提成有名结构（否则父函数读不下去）——注意"提名字"≠"拆成组件"                                                          |

要点：

- **维度 1 先定**：只有"调用方要按位置投递"才上部件；否则一律内部块。
- **维度 3 别和部件混**：自动显隐用条件渲染（`mountable` / 三元），**不要为了"有时没有"就上部件** ——
  那会多出占位元素 + `vn_slot` 属性 + 投递通道（VBadge 早先那版就是白背这套）。
- **维度 4 只决定"要不要名字"**，不决定形态：复杂 ≠ 要拆组件（VBadge 的角标 / 文本位不简单，
  但位置归组件、无行为 → 内部块）。

对照例子：`VCard` 的 header / body / footer = 调用方投递 + 无行为 → A 形态部件 + 占位；
`VTab` = 调用方投递 + **有行为**（active / panel）→ B 形态部件；`VBadgeCount` / `VBadgeText` =
位置归组件 + 无行为 + "有时没有" → 内部块 + `mountable()`。

- **命令 vs 纯 props**：库内组件的公开命令（`badge.count()` 这类）暂时保留（示例 / 用例在用）；
  新组件能用句柄 props 表达更新的，优先不加命令。
- **`computed` 读结构**：只有"结构变化由某个 ref 驱动"时才能用 `computed`（例如内容就是 `ref`），
  否则一律闭包。

**VBadge 的特例与两条教训**：

- **"有没有内容 → 角标定位"按数据写属性**：组件算好 `data-standalone`（没有内容才写），CSS 用
  `[vn~='VBadge']:not([data-standalone]) …` 开关几何。**别用 `:has(> [vn~='VBadgeContent'] > *)`** ——
  它只匹配**元素**子节点，纯文本内容（`children: '消息'`）命不中，角标就不会浮起来。
- **节点内容只在构建期落位**：要运行期换的是文本（传句柄 / 走 `text()`）；要换节点就重建组件。
  这样组件里没有部件句柄、也没有 `replaceChildren`。

参考实现：`src/data-display/badge.js` + `src/yoya.ui.css` 的 VBadge 段。

**其余既有口径仍然适用**：

- **结构默认用 setupFunction 嵌套**：`工厂(options, (node) => { node.child(…); })`——静态部分留在
  工厂参数里；不要写 `span({…}).style(…)` 这种挂在工厂调用之外的链式结构。
- **参数从哪进来不改变边界**：基础库组件用 `setupObject` / `setupString`（为了给 `vXxx` 快捷方法
  留分派入口，支持 `card.vCardHeader(…)` 这类嵌套写法），业务侧可以直接 `function XxxName(props)`；
  差别只是参数来源。
- **props 走调用、嵌套走 `.setup()`**：定义函数收 props（`function VXxx(props = {})`），快捷方法写
  `createComponentShortcut(VXxx, { props: true })`（调用里的**第一个普通对象**当 props 交给定义函数，
  其余位置参数照旧按 setup 分派）。父里要继续嵌套就写
  `VXxx(props).setup((host) => host.child(…))`，或走位置参数 `vXxx(props, (host) => …)`。
- **`setupObject` 里"其余键"落视图根**：用 `setupObject` 的组件，非命令键要交给**视图根元素**
  （定义里给根留个名字，`view.setup(elementConfig)`）。**别写 `self.node().setup(elementConfig)`**：
  `self.node()` 是组件节点，它的 `setup()` 会再进一次 `api.setupObject` → 自递归（栈溢出）。
  `self.node()` 的用途只有两个：`child()`（部件投影）与元素级委派（`attr` / `style` / `on` …）。
  回归用例：`src/components/component-props-dispatch.test.js`（10 个组件逐个验非命令键）。
- **构建之后落位的写入要收口**：props 在构建期就读到（绑定首评即终值）；位置参数、`.setup()` 回调、
  以及"建好还没落地就用命令配置"都落在「构建 → 落地」窗口里（那里绑定只求值一次、落地才订阅）。
  引擎在**组件构建帧末**收口一次；组件自己的命令要自收口：
  `if (!self.node()._el) self.node().flush()`（`_el` 只读判定落地，幂等，落地后只剩一次读）。
- **读结构的绑定写零参闭包**（`() => contentBox.children().length > 0`），**不要预存 `computed`**：
  `computed` 只在响应式输入变化时失效重算，读结构会缓存住旧值；闭包每次收口重新读。
- 视图根要留个名字（要返回它、props 里的元素级配置也落在它上面）；命令里碰组件自己用 `self.node()`，
  子部件句柄只在"命令要写它"时才在构建期取。

参考实现：`src/data-display/badge.js`（`VBadge` + `VBadgeContent` / `VBadgeCount` / `VBadgeText`）。

### 容器组件：props 只收数据、结构一次写清、命令写在部件回调里（2026-09-23 定稿，参考实现 `VTable`）

有"结构键"（键名与命令 / 工厂同名，如表格的 `vThead` / `vTbody` / `vTfoot` / `vTr`）的容器组件按这套写：

- **props 只收数据 + 元素选项**：`function VXxx({ 数据键, ...rest })`，`...rest` 照 JSX 摊进根元素工厂。
  **结构键写进 props 直接报错**（守卫见 `src/data-display/table.js` 的 `assertVTableStructure`：不报错就会
  被当成同名 DOM 属性静默写下去），报错消息里指路"结构走命令"。
- **部件常驻、结构一次写清**：容器自己该有的部件（表格的 `caption` / `thead` / `tbody` / `tfoot`）在视图里
  一次写清，不"用过才建"、也不用 `mountable` 表达"有没有"——空部件不渲染内容即可（标题那类靠自己的
  `data-has-text` 规则显隐）。**段 / 行只从命令来**：`vTable((table) => table.vThead(…))` 或运行期
  `table.vThead(…)`；`api.setupString` 这类纯转发命令留在外面。
- **命令写在部件自己的构建回调里**：`vTableCaption((part) => { api.caption = (…) => … part.text(…) })` ——
  回调参数就是那个部件、闭包直接抓它，**外面不留部件变量**；props 的落位写在对应命令旁边。
- **props 键名与同名工厂撞了就是信号**：`vThead: headSetup` 这种解构换绑名说明这个键不该出现在 props 里
  （要么照上面收窄 props，要么把工厂换成别名——前者优先）。
- 实测记录（别再试）：**组件节点上的区域 `rebuildable()` 不会在信号写入时重建**（元素节点会），所以
  "把部件声明存成状态、用区域重建"这条路走不通；`resolveTextValue()` 也不解析信号句柄（别拿它包状态 ref）。

## State → View: Read-Value Bindings First

**新代码（含迁移中的每个文件）状态到视图一律优先走读值绑定**，不要新增"集中快照函数"。

- 状态放 `ref`（`src/core/signals/handle.js`），结构里挂**读值绑定**：
  `attr(name, () => …)` / `style(name, () => …)` / `toggleClass(name, () => …)` /
  `child(vText(() => …))`；命令只改状态，**不搬 DOM**。
- 值位置白名单：`attr` / `style` / `styles` / `toggleClass` / `vText` / `mountable`（函数或句柄 = 活值）。
  `child()` **不是**值位置——文本要写 `child(vText(() => …))`。
- **纯读优先直接传句柄**（`attr('data-status', status)`、`style('width', view.width)`、`vText(name)`）：
  句柄与零参闭包走同一条绑定管线，句柄更直白。只有**需要映射 / 组合**时才写闭包
  （`() => (visible.value ? 'inline-flex' : 'none')`），或先把派生命名成 `computed` 放进 props 对象里再传句柄。
- 例外（票 15 §4）："只在调用过才写"的属性用 `xxxSet` 标记 + 读值绑定，保持逐字节一致。
- 仍然禁止：写完再集中刷（`flush()` / `markDirty()` / rAF 批量写）、构造之后按身份查找再写
  （`querySelector('[vn~=…]')`）、组件里直接操作 `_el` / `_children`。
- **构建 → 落地窗口要自己收口**（引擎契约，`src/core/binding-landing.test.js` 固化成用例）：
  绑定**构建期只求值一次**（`binding-ownership.test.js` 有用例守着"后续渲染不重复求值"），
  **落地时才订阅**依赖；而组件 props 正好落在这个窗口里（props 在 build 之后才应用）。
  所以"props → 命令 → ref"的写法必须由组件自己收口一次：**值** 调视图根的 `node.flush()`
  （幂等，值没变不写 DOM）。**结构优先不重建**：条件显隐用 `mountable()`、列表用 `keyed()`、
  换内容用 `replaceChildren()`；**非必要不用 `rebuild()`**（`rebuildable()` 只留给"整块结构
  确实必须重建"，见上文「状态与列表」）。落地之后订阅接管，命令写状态即可。
- 迁移期存量的历史写法（`syncXxx()` / `_syncXxx()` 把多处 `attr` / `style` / `replaceChildren`
  收在一个函数里、由命令同步调用）**不是错**，但**只减不增**：
  `src/view-binding-baseline.test.js` + `src/view-binding-baseline.json` 冻结存量，
  新文件一个都不许有；迁移一刀之后用 `UPDATE_VIEW_BINDING_BASELINE=1` 下调。
- 为什么较真：集中快照把"状态"和"状态→视图的映射"拆到两处（读代码要跳），而且指令式写快照
  **编译路径吃不到**，只能整体回落通用路径——按仓库「编译路径为打榜曝光服务」的定位，
  模板式写法（结构一次写清 + 活值）才是能给编译器接住的形状。
  `src/view-binding-baseline.test.js` 的文件头与 `docs/component-authoring{,.zh-CN}.md` 有对照样例。

## TypeScript 配套（0.7.0 起，票 `.scratch/component-typing/`）

`types/*.d.ts` 是**随包发布的对外契约**，与运行期同口径：改组件 API 就**同一刀**改类型，
并在类型门禁里补正/负例（`types/tests/consumer.ts`，`npm run typecheck` 跑）。

每个组件的声明按**同一个形状**写（参考实现 `VBadge`，`types/data-display.d.ts`）：

```ts
// 1) 句柄：自己的命令面 + 引擎委托的元素面（ComponentNode 已写清"句柄面 = 元素面"）
export interface VXxx extends ComponentNode { /* … */ }
// 2) props：`VXxx({ … })` 的**直接参数**，逐键写值类型；末尾留 `[key: string]: unknown` 给元素级透传
export interface XxxOptions { /* … */; [key: string]: unknown }
// 3) 定义函数收 props；快捷方法按 setup 分派调用方参数
export const VXxx: { (props?: XxxOptions): VXxx };
export const vXxx: ElementFactory<VXxx> & {
  (first?: XxxOptions | SetupInput<VXxx> | null, callback?: SetupCallback<VXxx>): VXxx;
};
```

- **定义函数收 props、快捷方法管分派**（与运行期 `VXxx` / `vXxx` 这一对一致）：`VXxx({ count: 3 })`
  逐键检查；`vXxx(…)` 首参是 `XxxOptions ∪ SetupInput`（对象 = props、文本 = 内容、函数 = 构建回调、
  元素选项 = 透传），所以**抓不住"props 取值写错"**——要逐键检查就用定义函数，
  或先把字面量写成 `const props: XxxOptions = { … }`。
- **运行期定义函数没有 props 参数的，类型也写 `(): VXxx`**（不是 `(props?: ElementOptions)`）：
  定义函数忽略的实参**运行期会被静默丢掉**（例如 `VCard({ class })`），写出来就是骗人。
  这类组件的可派发键写进快捷方法首参的 `XxxOptions`（`vCard({ class })` 由节点 setupObject 分派）。
- **props 接口带 `[key: string]: unknown`**：`...rest` 按键分类透传到视图根，`class` / `style` /
  `onXxx` / `data-*` / `attrs` 照旧可用；代价是拼错的键不报错（**结构键除外**：容器组件运行期报错，
  类型上也不收——见 `assertVTableStructure`）。
- **不给构造签名**：`instanceof VXxx` 不是承诺用法（身份走 `componentNameOf` / `hasComponentIdentity`），
  声明里不写 `new (…)`；`x instanceof VXxx` 因此收窄不到句柄，写下去就红。**组件对象协议
  （`{ render() }`）也已退场**，类型里不再有这条联合分支。
- **引擎基底 / 节点类型 / 真类仍然是 `class`**：`ViewNode` / `ElementNode` / `ComponentNode` /
  `VTextNode` / `VTreeNode` / `VMessageManager` / `VRouter` 这类保持 `class` 声明；
  只有**组件定义函数**走上面这一对（`interface` + 可调用的 `const`）。
- **接口合并只在同一模块生效**：给一个组件补类型就改它自己那份 `.d.ts`，别在别的文件里"再声明一个同名接口"。
- **新组件必须带类型**：A / B 两种形态都要有 `XxxOptions` + 定义函数签名 + 快捷方法首参，
  并在 `types/tests/consumer.ts` 补一条正例 + 一条 `@ts-expect-error` 负例（取值类型写错）。

## Setup 回调节点命名规则

setup 回调参数是节点（ViewNode / 组件），命名按职责语义化，避免与闭包外层业务数据同名，防止变量遮蔽：

- 回调参数使用能说明“这是哪个节点”的名字，例如 `vFormItem` 用 `itemOfLabel` / `labelField`，`vForm` 用 `form`，`vCardBody` 用 `body`；不要一律叫 `item` / `node`。
- 当业务数据变量与节点常用名相同（如字典值 `item`）时，节点参数必须改名区分，禁止同名遮蔽：

```js
// 反例：item 被 vFormItem 回调参数遮蔽，item?.label 取到的是节点方法
form.vFormItem((item) => {
  item.control((editor) => editor.vInput({ name: 'label', value: item?.label ?? '' }));
});

// 正例：节点参数语义化命名，业务数据 item 保持可访问
form.vFormItem((itemOfLabel) => {
  itemOfLabel.control((editor) => editor.vInput({ name: 'label', value: item?.label ?? '' }));
});
```

- 节点方法与业务字段同名（label / value / status …）时尤其小心：漏掉 `()` 会得到函数对象，可能被宽松地转成源码文本。
- 建议开启 ESLint `no-shadow` 兜底。

## Demo Code Readability Rule

- 演示代码要在代码量、总行数和单行长度之间取平衡，优先使用链式调用减少中间变量。
- 一行内的点式链式调用不超过 3 个（`node.attr(...).attr(...)` 算 2 个点式调用）；超过时按组件边界或语义换行。
- 单行代码长度不超过 100 个字符，与 Prettier `printWidth: 100` 一致；由 ESLint `max-len` 检查。
- 单个演示函数建议控制在 60 行以内，但不作为编译检查；超过时优先拆成更小演示。
- 链式调用只合并简单、同层级的设置，不把嵌套 setup、条件分支或长参数塞进同一条链。
- `.on()` 等带回调内容的方法，回调逻辑较大或单行接近 100 字符时，在 `.on()` 前换行，回调内容独立成行。
- 同一节点需要设置多个属性时，优先合并为 `node.attr({ ... })` 对象写法；动态属性、条件赋值或运行时计算值可以继续使用 `attr()`。
- `src/examples/demos/` 已加入 `.prettierignore`，演示代码的换行格式不被 Prettier 自动合并。
- i18n 演示优先使用 `"默认语言内容".s("key", locale?)` 字符串快捷写法；未指定 locale 时使用默认 locale，未注册的语言内容使用默认语言内容。
- `src/examples/demos/*.js` 由 `demo-readability.test.js` 自动检查点式链数量，`npm test` 会拦截违规。
- 页面壳分层由 `demo-layering.test.js` 自动检查：演示源码禁止出现 `vCard(` / `vCardHeader(` / `vCardBody(` / `vCardFooter(`；存量文件以迁移基线放行，shell token 只减不增，清零后删除白名单条目。

## SSR 开发纪律

- 页面按 `createPage(requestState)` 工厂约定编写，服务端与客户端复用同一份工厂与初始状态；`renderToString`/`hydrate`/`mount` 见 `docs/ssr.md`。
- `render()` 与 `toHTML()` 路径保持 DOM-free 且确定性：不读 `document`/`window`，不用 `Date.now()`/`Math.random()` 影响输出。
- 组件代码（含事件回调）不允许直接操作 `document`；`renderDom()` 内创建元素是节点引擎的唯一职责，组件一律走节点 DSL。
- 需要监听文档级事件（外部点击、拖拽、Esc、滚动等）时，统一使用核心辅助 `bindDocumentEvent`，组件自身不直接 `addEventListener/removeEventListener`。
- `window` 全局监听（scroll / resize / popstate 等）同样收敛到 `bindWindowEvent`。
- 动画帧用节点方法 `bindAnimationFrame(cb)` / `bindAnimationFrameLoop(cb)`（显式归属节点，`destroy()` 自动取消；同节点只保留一条循环），不要自己存 frameId + cancelAnimationFrame。
- 浏览器 API 一律加 `typeof xxx === 'undefined'` 守卫（集中在 `bindDocumentEvent` 等核心位置）。
- 模块级可变状态（注册表、id 计数器）不跨请求共享；id 使用 `allocateId` 渲染上下文分配器。
- 服务端渲染使用每请求 i18n 实例（`createI18n`），`.s()` 快捷方式用 `withI18nStringShortcut` 作用域化。
- 服务端保持无状态：渲染后销毁组件树、输出只依赖请求输入。

## Git 分支管理

- `main` 是唯一长期分支（受保护）：日常改动不直接提交到 main，先开分支、经 PR 审查后合回；发布（release）等经明确确认的直接提交除外。
- 分支命名按 `<type>/<name>`；特性分支固定用 `feat/{feature}`，例如 `feat/demo-source-simplify`、`feat/docs-en`。修复、文档、杂务分别用 `fix/`、`docs/`、`chore/`。
- 新分支一律从最新的 `main` 切出；一个分支只做一个目标，不把无关改动堆在同一分支（例如文档英文化与演示源码调整分开）。
- 提交信息使用 Conventional Commits 风格：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `release`，并带具体 scope 或主题。
- 分支合回 main 前需在本地通过 `npm run lint`、`npm run format:check`、`npm run typecheck`、`npm test`、`npm run build`（与 CI 检查一致）。
- 推送时使用同名远程分支并建立跟踪：`git push -u origin <branch>`；分支合回后删除本地与远程分支，切换前确保工作区干净。
