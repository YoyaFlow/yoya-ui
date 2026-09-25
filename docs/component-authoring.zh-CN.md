# 组件库开发规范（第三方开发者指南）

> 适用对象：希望基于 yoya-ui 标准开发自有组件库的团队或个人。
> 相关文档：[主题样式规范](theme.zh-CN.md)、[项目 README](../README.md)。

## 1. 定位：小核心 = 标准，组件 = 可插拔生态

yoya-ui 的核心是一个小而稳定的“组件标准”，而不是庞大运行时：

- **核心只有约 1,000 行**，提供节点生命周期（`renderDom` / `bindTo` / `destroy`）、属性快照模型、组件包装（`ComponentNode`）和状态机制，以及 HTML/SVG 元素工厂。
- **自带组件与快捷组件是标准的第一方实现**：`vButton`、`vCard`、`vTable`、`vForm` 等组件库，以及 `toast`、`vText`、布局工厂等快捷组件，都是按本规范开发的，也是最好的参考实现。
- **标准对外开放**：你可以按本规范开发自己的组件库，与内置组件在同一视图树中互操作（嵌套 `child()`、父节点快捷方法、i18n 文本等）。

## 2. 标准契约：`yoya-ui/core` 公共 API

组件开发者只需要依赖 `yoya-ui/core`（零第三方依赖、体积最小）：

| 类别         | API                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 节点类       | `ViewNode`、`ElementNode`、`HtmlElementNode`、`SvgElementNode`、`ComponentNode`、`TextNode`（`VTextNode`）                                            |
| 工厂与组合   | `vText`、`createElementFactory`、`registerChildFactories`、`applyElementOptions`、`normalizeChild`、`normalizeSetupArguments`、`resolveTarget`        |
| 节点内部集合 | `nodeChildren`、`appendNodeChild`、`EMPTY_CHILDREN`、`elementStyles`、`elementAttrs`、`elementClassNames`、`elementHasClass`（节点类型专用，见 §7.3） |
| 组件身份     | 视图根上的 `vn: 'VCard'`、`componentNameOf`、`hasComponentIdentity`（两种形态同一条判定；跨模块识别走能力约定，见 §7.3）                              |
| 信号         | `ref`、`computed`、`batch`、`isSignal`、`SignalHandle`、`installSignals`（值位置直接传句柄）                                                          |
| 国际化       | `createI18n`、`I18nTextNode`、`i18nText`、`installI18nStringShortcut`                                                                                 |

## 3. 两种组件形态

**组件只有两种形态**（2026-09-21 收敛）：**形态 A 薄工厂**（没有行为）与**形态 B `vNode`**（有行为）。
对象组件（`return { render(), … }`）**已退场**——0.7 起运行期直接拒收（`child(对象)` / 页面对象 /
`vClientOnly(() => 对象)` / 路由页面对象都报错），迁移就是照 A / B 重写（见 §7.4）；
`class Xxx extends HtmlElementNode` **不是组件形态**——它是引擎的**节点类型扩展**（组件的视图根 / 自定义元素种类），见 §7.3。

### 形态 A：薄工厂（没有行为）

确定这个组件没有额外行为要定义（无内部状态、无对外命令方法、无生命周期诉求）时就用它——
**演示代码同样按此判据**：只演示结构与交互、没有对外命令方法时，函数直接返回 ViewNode，不要为了统一而包一层。

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

形态 A 有两种都合法的落地方式，但要显式选：

- **转发型**（上面的 `ServiceTag(options)`）：定义本身就是调用点写法——参数确实是组件自己的 props、
  没有"调用方 setup 分派"要兑现时用它；
- **定义 + 快捷成对**（`VXxx` / `vXxx`）：`VXxx()` 只建结构（自己的 props），
  `export const vXxx = createComponentShortcut(VXxx)` 负责"建 + 应用调用方 setup 分派"——与所有形态 B
  组件同一套机制。**不要写 `const vXxx = VXxx` 别名**：那样定义被迫兼管调用方参数。
  参考实现：`VSlot` / `vSlot`。

### 形态 B：`vNode((api) => 视图)`（有行为就用它）

状态放闭包，命令与钩子写在 `api` 上，视图由 setup 返回 —— 定义即得到组件节点：

```js
import { computed, ref, vNode, vstack, vText } from '@yoyaflow/yoya-ui';

export function CounterCard() {
  const count = ref(0);

  return vNode((api) => {
    api.bump = () => {
      count.value += 1;
      return api; // 等价于返回节点
    };

    return vstack((stack) => {
      stack.output((out) => out.child(vText(computed(() => `计数 ${count.value}`))));
      stack.vButton('+1', (button) => button.on('click', () => api.bump()));
    });
  });
}
```

- 返回的是组件节点（`ComponentNode extends ViewNode`）：当根挂载、当子节点、进 keyed 列表都用节点语义；不产生占位元素，setup 返回数组即多根 fragment。
- `api` 只收命令函数；工厂把命令挂到节点本身，撞上节点已有成员（`child` / `destroy` / `mountable` …）或 `render` / `_*` 直接抛错，不静默覆盖。
- **第二个参数 `self`** 是组件自己的句柄（与钩子收到的 `host` 同族）：`self.node()` 给出**组件节点本身**，
  命令要往组件里加内容就写 `self.node().child(part)`。节点要等 setup 返回后才建，所以在 setup 里提前读它会**直接报错**
  （时机不对就说时机不对，不给 `null`）。句柄放在 setup 签名而不是 `api` 上：api 的键归组件自己的命令所有
  （VTree 就有 `api.node`），内部句柄占 api 的名会和真实命令撞。
- 命令里 `return api` 等于 `return 节点`；自带错误边界写 `api.whenFailed = (error, info) => 降级节点`（等价 `node.whenFailed(fn)`），其余节点级能力（`mountable()` / `rebuildable()`）链在返回的节点上。
- **状态与命令写 `api`，不写 `this`**（`api` 在 setup 的词法作用域里）；生命周期钩子 `api.whenMount` / `api.whenDestroy`，错误边界 `api.whenFailed`。
- 身份：写在结构的视图根上（`vn: 'VXxx'`，见 §7.3），模块底没有注册行。`defineComponentIdentity` 与
  `member instanceof VXxx` **都已退场**（票 15 波 6）；识别成员用 `componentNameOf` / `hasComponentIdentity`，
  或走能力约定。

### 组件定义 vs 快捷方法

- **`VXxx` 是组件定义函数**（PascalCase，名字 = 身份 = 导出名）：描述结构 / 状态 / 命令 / 身份。
  它的参数是**组件自己的东西**（props / 无参），**不负责调用方的 setup 语义**。
- **`vXxx` 是快捷方法**（小写）：建组件，再把调用方参数按 setup 分派落到组件上。
  `page.vXxx(…)` 是同一个方法的父节点形态（由 `registerChildFactories` 注册）；调用点写 `vXxx`，`VXxx` 只负责定义。
- **setup 分派有三个可覆盖入口**：`setupFunction`（函数 = 构建回调）、`setupString`（字符串 / 数字）、`setupObject`（对象）。
  组件在 `api` 上定义它们就用自己的；**没定义就回落到根元素的同名实现**
  （`setupFunction` 的回落是组件节点自己的构建帧——回调句柄必须等于工厂返回值）。
  其余分派固定：节点 / 句柄 = 子节点、数组 = 子节点列表。
- 与元素侧对称：`createElementFactory('div', Node)` = 元素种类 + setup 分派；组件侧的对应物就是
  "**定义函数 + 快捷方法**"这一对（`VXxx` / `vXxx`）。

### 节点类型扩展（引擎内部，不是第三种组件形态）

`class XxxNode extends HtmlElementNode` 仍然存在，但它是**组件的视图根 / 自定义元素种类**：
元素机制（`renderDom` / `toHTML` / `child` 语义 / DOM 测量 / 事件绑定 / 生命周期）必须住在节点上。
库内组件都是这个结构——对外只有一个句柄（vNode 组件节点），节点类型不进包入口，第三方不需要继承。
字段访问规则见 §7.3。

> 注：标准工具包 `createComponentFactory` / `applyComponentArguments` / `themeValue` 目前位于库内 `src/components/shared.js`，后续将由公开入口导出；在此之前可按上述写法基于 `core` 公共 API 实现。

## 4. 命名与样式约定

- 基础 HTML 元素保持原生标签名：`button()`、`div()`、`input()`。
- 复合组件工厂统一 `v` 前缀（PascalCase）：`vButton`、`vCard`、`vStatusBadge`。
- **属性契约**（属性化迁移，票 15；门禁 `src/attribute-migration-baseline.test.js` 只减不增）：
  - **身份**：组件视图根写 `vn: 'VXxx'`（值 = 导出名），内部块各写自己的 `vn: 'VXxxPart'`；
    包装型共用同一根时写多值（`vn: 'VTimer VInput'`，空格分隔，任一名字命中即命中）。
    身份既是**对象事实**（判定读它），也**落到真 DOM**（`vn="VXxx"`，GenUI 扫描与 CSS 作用域读它）。
  - **部件（part）**：结构侧 `vSlot('name')` 零布局占位、内容侧 `vn_slot: 'name'` 标记，`child()` 进组件自动落位。
  - **公开槽位**：`slot: 't-head'`（结构侧声明 + 内容侧信封），信封本身不进 DOM。`slot` 与 `vn_slot` 是两个名空间。
  - 状态一律使用 kebab-case 的 `data-*` 属性（`data-variant`、`data-open`），属性不承载身份之外的语义。
  - **类名已退场**：`yoya-component` 与 `yoya-v*`（组件 + 部件）随票 15 波 6 全部删除——新规则一律从
    `[vn="VXxx"]` 起头；跨组件能力类 `yoya-<feature>`（`yoya-layout`、`yoya-icon`、`yoya-control-clear`）保留。
  - 组件预设规则必须从身份作用域书写（`[vn="VXxx"] …`，禁止孤儿部件选择器），保证换掉身份后整棵子树与预设样式脱钩。
- 第三方组件建议使用自己的身份名与类名前缀（如 `acme-status-badge`），避免与内置样式冲突。
- 颜色、间距等样式优先使用主题变量 `var(--yoya-<token>, fallback)`，主题根为 `:root, [data-yoya-theme]`（见 `yoya.ui.css`）。

## 4.1 样式定制与主题

- 组件预设样式必须从身份作用域书写（`[vn="VXxx"] ...`），并让用户可以通过**换掉身份**（不写该 `vn` / 写自己的身份）或在自定义 CSS 层覆盖来接管样式；`replaceClassName` 作为通用类名工具的去留见票 15 §3-Q8。
- 实例级定制应通过组件 API 或行内 `styles()` 提供；全局定制通过覆盖 `--yoya-*` token 或多个维度开关实现。
- 库组件自身运行在 `@layer yoya` 内且基础规则低特异度，用户规则天然优先；第三方组件建议遵循相同约定。
- 主题变量体系、换肤维度、明暗/密度模式与定制阶梯详见 [主题样式规范](theme.zh-CN.md)。

## 5. 文本与 i18n 契约

组件的文案输入应统一兼容以下四种写法（由 `vText` / `child()` 自动归一）：

- 原始字符串：`vButton('保存')`
- `VTextNode`：`vButton(vText('保存'))`
- `I18nTextNode`：语言切换时原地更新，不重建视图树
- 字符串快捷方式：`'保存'.s('common.save')`（需先 `installI18nStringShortcut()`）

## 6. 状态与更新

yoya-ui 的状态由内置 Signals 驱动：组件用 `ref` 持有状态、值位置直接传句柄，写入后绑定原地更新；结构变化由 `rebuildable()` 区域读取信号驱动。节点级 `state()` / `setState()` / `getXState()` 与 `vStateNode` 已在 0.5 移除。

- 值：`const count = ref(0)`，句柄可直接传给 `attr` / `style` / `vText` / 组件 props；写入 `.value` 或 `handle.update(fn)` 后绑定原地更新，不重建 DOM、不丢焦点。派生值用 `computed(fn)`（只读、惰性、带缓存）；依赖订阅跟着观察者走——没人观察时不订阅依赖（内置引擎的原生派生；写入后下次读取惰性重算），观察者清零即退订，行内派生不会在行销毁后继续占着内存。
- **只有这一种反应式模型**：库不提供深层代理——`obj.field = x` 不会通知（对象整体替换才会）。字段要跟着更新，就把该字段本身做成句柄；列表行模型的做法见 skill 的「状态模块」一节（热字段句柄 + 按 key `apply()` 合并）。
- 结构：`rebuildable(谓词?)` 把节点声明为「可重建区域」，区域内读到的信号成为依赖，信号变化时按谓词重建；需要强制重建时手动 `rebuild()`。
- 文案：状态驱动的文案传句柄——`vText(count)`、`child(count)`、元素工厂 setup 位置的 `div(count)` 三种写法等价（`div(count)` 等价 `div((el) => el.child(count))`），只有值本身是派生结果时才套 `computed(fn)`；需要命令式原地替换时，持有 `vText()` 句柄用 `textContent(next)`（替换、幂等）。**节点级 `text()` 已移除**：追加文本用 `child(content)`，反复追加会堆叠，要"设置文案"就用 `vText()` 句柄的 `textContent(next)`；组件自己的 `text()`（`vBadge` / `vProgress` / `vMenu` 等）与 SVG `<text>` 的 `text()` 是另一套 API，照旧可用。
- 对外只暴露方法：组件内部用 `ref` 持有状态，对外给 `value(next)` / `disabled(next)` 这类链式方法，不把内部信号对象交给使用者。

#### 6.0 写法对照：集中快照（历史）与读值绑定（目标）

0.6 → 0.7 的属性化迁移是**等价迁移**：老组件里的"状态 + `_syncXxx()` 集中写快照"原样搬了过来，为的是让金标（`src/migration-equivalence.test.js`）逐字节证明"只换了类名 / 身份"。**新代码不要照抄这个形状**——状态 → 视图请走读值绑定：

```js
// 历史形状（迁移期存量，只减不增）：状态在闭包里，视图映射集中在一个函数里，命令同步调它
const state = { count: null };
const badgeBox = span({ vn: 'VBadgeCount' }).styles({ …静态… });
const syncBadge = () => {
  badgeBox.style('display', state.count === null ? 'none' : 'inline-flex');
  badgeBox.attr('aria-label', state.count === null ? null : String(state.count));
};
api.count = (value) => (value === undefined ? state.count : ((state.count = value), syncBadge(), api));

// 目标形状：状态放 ref，映射写在结构里（读值绑定），命令只改状态
const count = ref(null);
const visible = computed(() => count.value !== null);
const node = span({ vn: 'VBadge' }, (root) =>
  root
    .span({ vn: 'VBadgeContent', vn_slot: '' })
    .span({ vn: 'VBadgeCount', style: { …静态… } })
      .style('display', () => (visible.value ? 'inline-flex' : 'none'))
      .attr('aria-label', () => (visible.value ? String(count.value) : null))
      .child(vText(() => (visible.value ? String(count.value) : '')))
);
api.count = (value) => (value === undefined ? count.value : ((count.value = value), api));
```

三条硬规则：

1. **值位置白名单**：`attr` / `style` / `styles` / `toggleClass` / `vText` / `mountable` 接受句柄或零参闭包；`child()` **不是**值位置——文本要写 `child(vText(() => …))`。
   **纯读优先直接传句柄**（`attr('data-status', status)`、`style('width', view.width)`）：句柄与闭包走同一条绑定管线；只有需要映射 / 组合时才写闭包，或先把派生命名成 `computed` 再传句柄。
2. **"只在调用过才写"的属性**用 `xxxSet` 标记 + 读值绑定（保持"没碰过就不写 DOM 属性"的逐字节语义）。
3. **不许写完再集中刷**：没有 `flush()` 之外的批量写、没有 `markDirty()` + rAF 这种延迟刷；命令改完当拍 DOM 就是对的。

**一条容易踩的边界（引擎契约，`src/core/binding-landing.test.js` 有用例）**：绑定**构建期只求值一次**，**落地时才订阅**依赖——也就是"构建之后、落地之前"的写入不会自动进首屏，而**组件 props 正好落在这个窗口里**（props 在 build 之后才应用）。所以走读值绑定的组件要在写状态的收口处自己补一下：**值**调视图根 `node.flush()`（幂等，值没变不写 DOM）；**结构优先不重建**——条件显隐用 `mountable()`、列表用 `keyed()`、换内容用 `replaceChildren()`，`rebuildable()` 只留给"整块结构确实必须重建"（见 §6.1）。落地之后订阅接管，命令写状态就不必再手动收口。同一个区域节点上的绑定在区域重建时会被归到该轮区域名单一起释放，所以**别把绑定注册在区域节点自己身上**——放在它的父/兄弟节点，或让区域 builder 重新登记。

**组件怎么写（2026-09-22 定）**：组件一律用**有名函数声明**定义，**一个业务组件函数 = 一个组件边界**（`function VXxx() { return vNode((api) => …) }`），而且**整棵树就写在最后那个 `return` 里**——不为"看起来整齐"把每块再拆成函数（拆了之后读结构要来回跳）。只有某块**自己要复用、或自带行为（状态 / 命令）**时才提成有名函数（A 形态薄工厂 / B 形态 vNode）。结构**默认用 setupFunction 嵌套**书写：`工厂(options, (box) => { box.style(绑定); box.child(…); })`——静态部分在工厂参数里、绑定与子节点在回调里，不要写成 `span({…}).style(…)` 这种挂在工厂调用之外的链式结构。

**props / 属性 / 样式**：

- **参数表里解构、`rest` 照 JSX 摊开**：`function VXxx({ count, ...rest } = {})`，结构里写 `工厂({ ...rest, vn: 'VXxx' }, …)` —— `class` / `attrs` / `style` / `onXxx` 由引擎的键分类表（`src/core/setup-keys.js`）处理，不用手拆、也不用第二处转投。
- **属性 / 样式用 JSON 一次写清**：`node.attr({ … })` / `node.style({ … })`（值位置照旧能放句柄与零参闭包）。
- **静态样式放 `src/yoya.ui.css`**（`[vn~='VXxx'] …`；状态相关的几何写成 `[data-*]` 规则），组件 JS 里只留随状态变的绑定。
- **内容与文本也是数据**：props 给普通值就是快照、给句柄就是活值（统一用核心助手 `asSignal(value)` 归一化）；字符串 / 句柄放值位置（`child(值)`），**节点内容在构建期落位**（运行期换节点 = 重建组件）。命令只写数据 —— 不接部件句柄、不写 `replaceChildren`。
- **"有没有内容"按数据写属性**（`data-standalone` 这类），CSS 用它开关几何；**不要用 `:has(> … > *)`** 判内容 —— 它只匹配元素子节点，纯文本内容命不中。

参考实现：`src/data-display/badge.js` 与 `src/yoya.ui.css` 的 VBadge 段。

**规则速查（从 VBadge 这一刀总结；全文见 `AGENTS.md` 的 Component Writing Rules）**：R1 一个业务组件函数 = 一个边界 · R2 整棵树写在最后那个 `return` 里（不往外面提中间节点变量，也不为整齐拆函数，除非要复用或自带行为）· R3 props 在参数表里解构、`...rest` 摊进根元素工厂 · R4 属性 / 样式尽量写进工厂参数（`attrs` / `style` / 顶层 `data-*`）· R5 静态样式进 `yoya.ui.css`，JS 只留随状态变的绑定 · R6 读句柄的派生用 `computed`、读结构的用零参闭包 · R7 条件用 `mountable()` / `cond ? null : node`，列表用 `keyed()`，别靠重建 · R8 构建之后落位的写入要收口 · R9 能靠句柄 props 表达就不新增命令 · R10 可配置几何走 CSS 变量 · R11 对外有 ≥2 个"调用方可投递的插入点"才用 `vSlot` 部件形态（`VCardHeader` 那种），只有 1 个内容位就把位置写死（VBadge）· R12 部件身份是调用方的书写面，组件自己算出来的内部块（`VBadgeCount`）不是投递 API。逐组件选择（内容通道、是否保留命令、`:has()`）同节列出，不要照抄。

**props 走调用、嵌套走 `.setup()`（2026-09-22 定）**：业务组件函数自己收 props——`function VBadge(props = {})`；快捷方法用 `createComponentShortcut(VBadge, { props: true })` 把调用里的**第一个普通对象**当 props 交给定义函数，其余位置参数照旧按 setup 分派。父组件里要继续嵌套，可以走位置参数，也可以在定义函数返回的节点上继续：

```js
function ServiceBadge() {
  return VBadge({ count: 5 }).setup((badge) => {
    badge.child('订单'); // 内容继续嵌套
    badge.text('待处理');
  });
}
```

props 在构建期读到，状态一次初始化到位（绑定首评即终值）。**构建之后**才落位的东西——位置参数、`.setup()` 回调、以及"建好还没落地就用命令配置"——都掉在上面那条「构建 → 落地」窗口里：引擎在**组件构建帧末**收口一次，组件自己的命令要自收口（`if (!self.node()._el) self.node().flush()`）。还有一个推论：读**结构**的绑定（"这个组件有没有内容"）要写零参闭包，**别预存 `computed`**——`computed` 只在响应式输入变化时失效重算，读结构会缓存住旧值，闭包每次收口都会重新读。

门禁：`src/view-binding-baseline.test.js` + `src/view-binding-baseline.json` 冻结"集中快照函数"存量（**只减不增**，新文件一个都不许有）。迁移一刀之后跑 `UPDATE_VIEW_BINDING_BASELINE=1 npx vitest run src/view-binding-baseline.test.js` 下调基线。较真的理由不止可读性：指令式写快照**编译路径吃不到**，只要不是"静态结构 + 活值 + 条件/列表"，编译器就整块回落通用路径。

### 6.1 可重建区域

当一块内容需要「结构随数据变化」，而组件级状态容器又太重时，把它标记成区域：

```js
const rows = ref([]);
const editing = ref(false);

const body = div((ele) => {
  ele.rebuildable(() => !editing.value); // 可选：时机谓词，为假时只刷值不重建
  ele.attr(
    'data-count',
    computed(() => rows.value.length)
  );
  rows.value.forEach((row) => ele.addChild(row.id, div(row.name)));
});

rows.value = [...rows.value, { id: 'r1', name: '第一行' }]; // 写入即重建
body.rebuild(); // 需要强制重建结构时手动调
body.flush(); // 只求值写回绑定，不重建结构（幂等）
```

契约与边界：

- **值用 `flush()`，结构用 `rebuild()`**：`rebuild()` 清空子节点并重跑 setup（会连带刷新本轮新登记的绑定）；`flush()` 只把已登记的绑定求值写回，不重建、不触发谓词、值没变就不写 DOM。一次变化里既有增删又有值变化时，只调 `rebuild()` 即可，不要叠加 `flush()`。
- **区域节点先建一次**：内容由区域自己的 builder 产出，所以它可以在 `render()` 之外创建并直接持有引用（`const list = ul((box) => { box.rebuildable(); … })` → `list.rebuild()`），不需要在 render 里用 `let region = null` 回填；区域外的状态行、工具节点同理。**但要在组件 / 页面工厂内部创建**（每实例、每请求一份），不要提到模块级——服务端复用同一棵树会在并发请求间串数据。`rebuild()` / `flush()` 只在客户端交互期调用，SSR 首屏只做构建（绑定在构建期写回）。
- **区域必须在自己的 setup builder 内声明**：`rebuildable()` 只在 builder 运行期间有效；非区域节点的构建闭包在构建返回处即释放（行的常驻内存主要省在这里），builder 已返回的节点不能再补声明区域，直接抛错并说明原因。区域节点保留自己的 builder，所以之后仍可再调一次 `rebuildable(谓词)` 替换谓词。
- 区域内容由它自己的 setup 产出；重跑会**清空子节点并重新执行 setup**，因此区域内不保留 DOM 身份——焦点、选区、内部滚动位置、挂在元素上的第三方实例都会重建。区域外的兄弟节点与其 DOM 不受影响。
- 谓词只表达「这次要不要花重建」：为假时只写回绑定值并记为待重建（`rebuildPending()`），结构保持原样。**数据条件请写进 setup**（区域在数据驱动下自会重建），不要当成内容开关。
- 值绑定只接受两种来源：**signal 句柄**（推荐）与**零参闭包** `() => value`（reader）。两者走同一条绑定管线：闭包在构建期求值一次，**读到的信号即成为它的依赖**，写入就重算；读的是普通变量时，需要重新求值自己调 `flush()`。带参形式 `(s) => value` 已随节点级状态一起移除，登记时会直接抛错，类型上也不接受。区域重跑时旧绑定作废、新绑定立即生效，不会重复写回。
- **组件 props 只接受字面值与句柄**（`vInput({ value: name })`）：props 是配置位，函数另有语义（`onChange` / `render`），传零参闭包会在组件构造时显式抛错，而不是静默串成源码文本。文本位置用闭包要写 `vText(fn)`——`child(fn)` 是组件渲染槽。
- 声明顺序：先 `rebuildable()`，再写值函数与其它登记。
- 区域 setup 里**不要放一次性副作用**（第三方实例创建、请求、埋点）。`bindDocumentEvent` / `bindWindowEvent` 由引擎在重跑前重置；定时器请用 `registerRegionCleanup(fn)` 登记，否则会随重跑叠加。显式归属节点时用节点方法：`ele.bindWindowEvent(type, handler)` / `ele.bindDocumentEvent(...)` / `ele.bindAnimationFrame(cb)` / `ele.bindAnimationFrameLoop(cb)`，`destroy()` 自动卸载或停帧（循环另可用 `stopAnimationFrameLoop()` 提前停）；独立函数的原有用法（自行保存 unbind）保持不变。
- **列表协调**：`node.keyed(rows, keyFn, build, options?)` 用信号驱动子项——同 key 且行引用未变时复用节点，行引用变化原位换新，顺序变化保身份移动（只搬真的换位的行，交换两行不会重排整张表；多根组件的行整组一起搬）；行内字段用信号可在不重建的前提下原地刷值。第四参数声明**行级更新协议**：`equals(prevRow, nextRow)` 为真视为未变（节点复用），否则 `update(node, prevRow, nextRow)` 原地改写该行（节点身份保留），两者都没有才原位换新；`equals` 与 `update` 同时给出时 `equals` 优先。自定义策略用 `insertBefore(key, child, beforeKey)` / `insertAfter(key, child, afterKey)` / `moveBefore(key, beforeKey)` / `moveAfter(key, afterKey)` / `replaceChild(key, child)` 原语。
- **条件挂载**：`panel.mountable(cond)` 是唯一公共入口——条件接受 ref/computed 句柄、布尔或零参闭包，**省略参数即默认常挂 `true`**；惰性存在子节点上，入树时父节点收养建绑定（`keyed()` 的行节点同一条路径），**入树后随时再调 `mountable()` 即可替换条件并立即生效**（闭包变化后用**父节点** `flush()` 重求值）。为假时子元素脱离文档但 ViewNode 与状态保留，为真时按子节点槽位回归；SSR 条件假输出空串。`node.isMounted()` 查询自身挂载条件的最近提交状态；「元素此刻是否在文档里」查 `node._el?.isConnected`。它与 `display` 显隐（看不见但在）、`rebuildable()`（销毁重建）构成三档：**不在但活着**。挂载绑定登记在父节点，条件存在子节点自己的值单元里（无需父指针）；`div({ mountable: cond })` 配置形态走同一条收养路径。
- 区域自己订阅依赖：区域内读到的信号变化即触发重建（devtools 里记为 `trigger: 'signal'`）；嵌套区域各订阅各的，不会互相代管。`batch()` 内写入多个信号时，依赖多个源的区域只在批次结束时同步重建一次；用 `rebuildScheduled()` 查询是否有已排队的信号触发重建。批次外的写入仍同步立即重建；重建期间依赖再次变化会在本次重建后补跑，而不是丢弃。

- 需要保留焦点或第三方实例时，把该部分留在区域之外，或只用值绑定——它们是原地更新，不重建 DOM。
- **keyed 段内的事件委托**：在 `keyed()` 的行构建函数里（含其子树）注册的 `click` / `input` 这类冒泡标准事件，
  不再逐行挂 DOM 监听器，而是登记成段根上的一个监听器统一派发——10k 行从 2 万个监听器降到每段一个。
  `.on()` 的用法与可观察行为不变（`this`、`event.target`、`event.currentTarget`、`stopPropagation()`
  语义一致，后者同时截断原生冒泡）；以下情况自动回落逐元素绑定：传了 `once` / `capture` / `passive: true`、
  事件不冒泡（`focus` / `mouseenter` 等）、自定义事件、非元素节点，以及挂载之后才补的 `.on()`。
  两条细微差异：`currentTarget` 由引擎逐事件伪造（值一致，但它是事件对象上的自有属性）；第三方直接挂在
  「行根到段根之间」元素上的监听器，相对顺序可能与逐元素绑定时不同。
- **错误边界**：`node.whenFailed(handler)` 声明子树边界——handler 返回节点则替换子树降级、返回空仅上报并保持现状；vNode 组件可写 `api.whenFailed = (error, info) => 降级节点`，`ComponentNode` 自动挂载。捕获永不静默：`console.error` 必发，devtools 开启时追加 `error` 事件。错误在出错时**沿父链上溯**找最近的边界，由它独占捕获、捕获后不再向外，因此与声明顺序、嵌套深度、运行时插入、子树搬家都无关；handler 自身抛错则向外抛出。render / build 阶段返回空时，失败子节点会被标记并跳过后续重试（避免反复失败与重复记录），重新挂载或区域重建会清掉标记、允许再试一次。无边界时错误原样传播（fail fast）。区域节点上的降级替换按一次区域构建执行，不会撞区域守卫。

### 6.2 大列表里的选中态：别用共享句柄逐行派生

长列表（1k 行以上）里，"哪一行被选中"如果用**共享句柄 + 每行派生**表达：

```js
const selectedId = ref(null);
// 每一行
line.toggleClass(
  'danger',
  computed(() => selectedId.value === row.id)
);
```

切换选中时会**唤醒全部行**——每行都订阅了同一个信号，框架看到的是"N 个派生都读了这个信号"，
它无法知道只有两行真的变了。实测（`npm run perf:selection`，1000 行）：

| 写法                         | 每次切换的派生求值 | 切换耗时（写入本身） |
| ---------------------------- | ------------------ | -------------------- |
| 共享句柄逐行派生（上面这种） | **1000 次**        | 0.47 ms              |
| 每行派生读行自己的句柄       | 2 次               | 0.014 ms             |
| 行自己持 `ref` 布尔（推荐）  | **0 次**           | 0.015 ms             |

代价随行数线性放大：10k 行时第一种写法每次切换要跑 10000 次派生（1.5 ms）。
内存上第一种写法每行多持一个派生对象与一条订阅，约多 0.2 KB/行（1000 行约 0.2 MB）。

推荐的写法是把选中态放在**行自己身上**，切换时只写两行：

```js
const row = { id, label: ref(labelOf(id)), selected: ref(false) };
// 每一行
line.toggleClass('danger', row.selected);
// 切换：只写两行
const select = (next) => {
  const list = rows.peek();
  const previous = list.find((item) => item.selected.value);
  if (previous) previous.selected.value = false;
  next.selected.value = true;
};
```

- 两种写法都是声明式，差别只在"状态存在共享句柄里还是存在行里"；后者是 O(1)。
- 代价是成对写入要自己维护（键盘导航、全选、数据刷新都要走同一个入口）。需要多选集合 / 过滤 /
  悬浮 + 选中组合时，自己维护一个 `Map<id, 行>` 索引即可，不需要框架新 API。
- 行数不大（几十~几百）、或本来就是"每次全量刷新"的列表，继续用共享句柄派生更简洁，不必改。

### 6.4 按键容器：`keySet`（`ref([])` 的替代品）

列表经常要当 map 用：按 key 取/改/删一行、给每行挂一点状态（选中 / 展开 / dirty / loading）、
主从联动、键盘导航。这些都能自己用 `Map` 拼，但"数据换了状态还在不在"要靠人手守。`keySet` 把这件事
收成一个容器：**元素是 `KeyItem`，`data` 与 `api` 在同一个对象里**，排序 / 插入 / 移动 / 整表替换
作用在元素上，两者不可能脱钩。

```js
const list = keySet(
  rows,
  (row) => row.id,
  (item) => {
    item.api.selected = ref(false);
    item.api.select = () => {
      item.api.selected.value = true;
    };
  }
);

tbody((body) => {
  body.keyed(list, (item) =>
    // 行就是元素；第二参数仍是下标
    tr((line) => {
      line.attr('data-row-id', String(item.data.id));
      line.toggleClass('danger', item.api.selected);
      line.on('click', item.api.select);
    })
  );
});
```

- `item.data` 是应用那一行数据；`item.api` 是应用给这一行定义的状态与命令，第三个参数每个新 key 只跑一次。
- **同 key 同 api**：重排、移动、重新赋值同一批行，元素与 api 都原样续用；`item.data` 换成新引用时
  该行原位换新（要"内容等价就复用 / 原地更新"，照旧传 `keyed` 的 `equals` / `update`，收的是行数据）。
- key 变了 = 旧 key 离场（元素丢弃、`item.api.dispose?.()` 被调用）+ 新 key 入场（新元素、新 api）。
  键的身份永远是 `keyOf(item.data)`，容器不缓存 key。
- 数据操作触发一次 keyed 对账；写 `item.api` 上的信号**不碰数据数组、不触发对账**——这就是 §6.2
  那张表里"行自己持 ref"的 O(1) 唤醒，只是状态由容器按 key 保管。

| 用途          | API                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 刷新触发      | `list.value = datas` / `list.replaceAll(datas)`；`list.batch(() => …)` 把多步合成一次对账                                                                |
| 按 key 增删改 | `add(data)` / `insertBefore(data, beforeKey?)` / `insertAfter(data, afterKey?)` / `replace(key, data)` / `merge(key, patch)` / `remove(key)` / `clear()` |
| 排序与移动    | `sort((itemA, itemB) => …)`（稳定排序，比较器拿元素）/ `moveBefore(key, targetKey?)` / `moveAfter(key, targetKey?)`                                      |
| 读            | `item(key)`（元素）/ `get(key)`（数据）/ `has(key)` / `indexOf(key)` / `keys()` / `items()` / `values()` / `size` / `keyOf(data)`                        |
| 作数据句柄    | `value` / `peek()` / `subscribe()`；写句柄 = 换数据，读句柄给**元素表**（`KeyItem[]`）                                                                   |

细则：目标 key 不存在时**写操作抛错**、读操作返回 `undefined` / `false`；`moveBefore(k, k)` /
`moveAfter(k, k)` 是 no-op（`moveBefore(key)` 落到末尾、`moveAfter(key)` 落到开头）；同一份数据里
出现重复 key 直接报错；`merge` 只接受对象行。`keySet` 是可选 API——小列表、每次全量刷新的列表，
继续用 §6.2 的 `ref` + 派生写法更直接。

## 7. 组合、事件与生命周期

- `child(...)` 接受 `ViewNode`、vNode 组件（自动包装为 `ComponentNode`）或字符串/数字。
- `on(eventName, handler, options)` 绑定真实 DOM 事件，`destroy()` 时自动清理。
- vNode 组件可直接传给 `child()`；节点类型（视图根）遵循 `renderDom` / `bindTo` / `destroy` 生命周期。

### 7.1 生命周期

1. **声明（构建期）**：工厂调用建节点，`setup` 里的 `attr` / `style` / `on` / `child` 只写快照，不创建 DOM；vNode 组件被包成 `ComponentNode`，首次渲染才解析并缓存视图；`access` / `context` / `i18n` 三类构建期作用域在此捕获。
2. **挂载**：`renderDom()` 创建或复用真实 DOM、绑定事件适配器、递归子节点并应用属性快照；`bindTo(target)` 等于 `renderDom` + append；`commit()` 落地权限态与待移除子节点。
3. **更新（状态变化）**：按代价从低到高——函数值绑定只写回（DOM 不重建）→ `update()` 局部 patch → 区域 `rebuild()`（清空子节点 + 重跑 setup）→ 组件 `rebuild()`（销毁旧根重新 render）。
4. **销毁**：解除事件适配器与 cleanup、递归销毁子节点、清空 keyed 子节点注册表、从 DOM 摘除；重复 `destroy()` 幂等。

SSR 额外走一条线：`toHTML()` 输出 HTML（DOM-free）→ `hydrate()` 收养既有 DOM（`adoptElement` + `bindElement`，不重建元素）→ `hydrateSnapshot()` 回读表单等真实值；前提是 `render()` / `toHTML()` 保持确定性，两端产出同一棵树。

### 7.2 复杂组件分块

复杂组件需要分块定义结构时，文件内部的每一块也按**函数组件**组织：同一文件内声明、PascalCase 命名并描述 UI 单元、输入显式、产出 ViewNode。整棵树看上去应当是一层层组件拼起来的，而不是一段过程式布局代码。

```js
function MemberSummary({ stats }) {
  return p((line) => line.child(vText(() => `共 ${stats().total} 人`))); // 值变化走绑定
}

function MemberRows({ rows, onSelect }) {
  return ul((list) => {
    list.rebuildable(); // 结构随筛选变化：区域负责重建
    rows().forEach((row) => list.addChild(row.id, MemberRow({ row, onSelect })));
  });
}

export function MemberPanel({ state, onFilter, onSelect }) {
  return div((panel) => {
    panel.child(MemberSummary({ stats: () => ({ total: state.members.length }) }));
    panel.child(MemberFilter({ onInput: onFilter }));
    panel.child(MemberRows({ rows: () => state.members, onSelect }));
  });
}
```

- **活数据用 getter 传**（`rows: () => state.members`）：数组/对象引用在状态更新后会变陈旧，尤其配合区域重跑时 builder 读到的仍是旧值；回写一律走回调。
- **上游用 `ref` 时直接传句柄**（`rows: itemsRef`）：块内用值绑定或区域读句柄即可，不需要 getter；getter 留给非信号来源（请求结果、外部对象）。
- **块内的更新分工**：值变化用函数值绑定，结构变化用区域（块在自己那层声明 `rebuildable()`，并在 builder 里重新调用 getter）。
- 块组件用与导出组件同一套形态（无行为用形态 A 直接返回 ViewNode，有行为用形态 B `vNode((api) => 视图)`）；不要用匿名箭头片段或 `renderTop` / `BlockA` 这类位置式命名；深度 2–3 层通常足够。

### 7.3 节点类型扩展的字段访问（0.6.3 起）

`_children` / `_classText` / `_styles` / `_attrs` 这些下划线字段是**实现细节**（内存优化会改它们的表示），
第三方或库外的**节点类型扩展**（自定义元素种类 / 组件的视图根）不要直接读写；0.6.3 起改用下面这组 helper，
语义与旧字段一一对应：

| 旧写法                                                      | 新写法                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| `node._children.push(child)` / `this._children.splice(...)` | `appendNodeChild(node, child)`、`nodeChildren(node)`     |
| 比对空列表                                                  | `EMPTY_CHILDREN`（共享的**冻结**数组哨兵，就地写会抛错） |
| `node._classes` / `node._attrs.class`                       | `elementClassNames(node)`、`elementHasClass(node, name)` |
| `node._styles.background = …`                               | `elementStyles(node).background = …`                     |
| `node._attrs['data-x'] = …`                                 | `elementAttrs(node)['data-x'] = …`                       |

注意三点：空子节点列表是共享哨兵，`nodeChildren()` 首次写入时才换成真数组（所以别缓存它、也别写哨兵）；
类名的真身是文本（`_classText`，`_classes` 这个 Set 已不存在）；`_styles` / `_attrs` 按需创建，
没写过样式或属性的元素上它们是 `undefined`，helper 会替你建好。追加子节点请走 `child()` / `addChild()`，
helper 只用于"必须在自己的渲染路径里直接改节点名单"的节点类型扩展场景。

## 7.1 槽位：内容往哪里去

组件结构里给某个元素打上 `slot` 标记，它就是这个组件的**槽位**；`child()` 进来的、带同名标记的元素是
"信封"——它的子节点、类名与同名属性合并进槽位元素，**信封本身不进 DOM**（与 HTML 的 `<slot>` fallback 一致）。
不带标记的内容按**普通元素**语义落在组件根元素内部。

```js
// 组件作者：结构里声明槽位（元素自己的内容就是默认内容）
function Panel() {
  return vNode(() =>
    div((root) => {
      root.span({ slot: 't-head' }, '默认标题');
      root.div('body');
    })
  );
}

// 消费者：两种内容都能进
panel.child(span({ slot: 't-head' }, '来自用户的标题')); // 进槽位，默认内容被替换
panel.child(p('普通内容')); // 未标记 → 追加到组件根元素末尾
```

规则：

- **就近作用域**：标记只在**直接父组件**里解析，不冒泡、不穿透；嵌套组件里的同名槽互不影响；
- **一个槽一份内容**：同名槽第二次投递 → 报错；同一个组件里同名槽声明两次 → 报错；
- **找不到槽位**：不 mount + 开发期提示（HTML 语义：没有位置就不渲染）；
- **多根组件**没有单一容器：未标记内容 → 报错，请声明命名槽；
- **匿名槽位（未标记的 `child(...)`）就是"组件根内部"这个默认位置**：组件内部把内容转投到内层容器
  （锚点转进内层 `<ul>`、表格行转进 `<tbody>`）时，匿名内容走的仍是这条 `child()` 转发路径——
  迁移到 vNode 外壳后必须保持同一条落位路径，不得静默丢弃或改落到包装层；
- 槽位不产生额外 DOM；`slot` 只是**标记**，不是 `<slot>` 元素（`slot()` 是 HTML 原生标签工厂，与组件槽位无关）。

### 何时用槽、何时直接 `child`

| 场景                             | 写法                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| 组件只有一个放内容的地方         | `child(...)`（不带标记，进根元素）                                                         |
| 组件有多个插入点（头 / 体 / 尾） | 结构里给每个位置打 `slot` 标记，内容带同名标记                                             |
| 内容要落在组件内部的指定位置     | 槽位                                                                                       |
| 内容只是追加到组件末尾           | 不带标记的 `child(...)`                                                                    |
| 独立创建、之后挂到某个组件的槽里 | 工厂产出就带标记（`span({ slot: 't-head' }, …)` 或自己的工厂封装），再 `panel.child(head)` |

### 部件（part）：组件自己拥有的位置（`VSlot` + `vn_slot`）

槽位是**公开**通道：位置由使用方命名、内容由使用方投递。位置归**组件自己**所有时（卡片头 / 体 / 尾这类），
用**部件**：结构声明位置，内容自带"我属于哪个位置"的标记，投递就是普通的 `child()`——**没有插入辅助函数**。

```js
// 组件作者：位置由结构决定，与调用顺序无关
export function VCardHeader() {
  return div({ vn: 'VCardHeader', vn_slot: 'header' }); // 标记 = 这份内容落哪里
}

export function VCard() {
  return vNode((api, self) => {
    api.vCardHeader = (setup) => self.node().child(vCardHeader(setup));

    return div({ vn: 'VCard' }, (root) => root.child(vSlot('header')));
  });
}

// 使用方：part 命令（语法糖）或直接 child() 带标记的节点 —— 同一条路径
vCard((card) => card.vCardHeader('标题'));
vCard((card) => card.child(vCardHeader('标题')));
```

- `vSlot('name')` 是**零布局占位**（`display: contents`），part 保留自己的元素、类名与样式；
  投递时 part 自己的标记只是路由指令，落位后会被摘掉（DOM 里只留占位的标记）。裸值走标准
  `setupString` 入口——这个位置"裸值怎么解释"就由它决定；`vSlot({ name, … })` 只额外收 `name`，
  其余键照旧走 options 分派（`class` / `style` / `attrs` / 属性 / 事件）。占位名是构建期事实，不是活值；
- 标记是 `vn_slot` 而**不是** `slot`：部件与公开槽位两个名空间，互不干扰；一个占位一份内容（重复投递即替换）；
- part 命令只是 `self.node().child(part)` 的语法糖——标记找不到对应占位时，内容按普通未标记内容处理（追加进组件根，不丢弃）。

## 7.2 组件级钩子：`whenMount` / `whenDestroy`

与 `whenFailed` 同族的**协议成员**：属性持函数，声明在 vNode 的 api 上。

```js
const chart = vNode((api) => {
  api.whenMount = function (host) {
    // 元素已经落地，可以测量 / 初始化第三方
    api.instance = createChart(host.element());
  };
  api.whenDestroy = function () {
    api.instance?.dispose(); // 子树销毁之前，自己的 DOM 与子节点还读得到
  };
  return div({ class: 'chart' }); // 结构保持纯声明
});
```

规则：

- **vNode 里写 `api`，不写 `this`**：api 就是组件实例，且命令与钩子都在它的词法作用域里
  （`api.instance = …` / 读回 `api.instance`）。`this` 恰好也是同一个对象（引擎以 api 调用命令与钩子），
  但命令一旦写成箭头函数（`() => this`）就不是组件了——只留一种拼写，不留绑定陷阱。
  （已退场的）对象组件是镜像关系：方法写在对象字面量里，`this` 就是组件对象；
- **两个钩子都收到宿主上下文对象**，元素从它上面读：`host.element()` 是单根组件的根元素
  （还没落地的节点、以及没有"那一个元素"的多根组件都给 `null`）。它是**现取**而不是快照，
  同一个上下文对象交给两个钩子，以后加成员不改签名。需要真实元素就在这里拿
  ——不要在闭包变量里抓节点句柄，也不要让结构表达式承担写回，结构才是编译器读得懂的形状；
- **实例状态挂在组件实例上**（vNode 是 api），与用它的命令放在一起：
  上面的 `api.instance` 在同组件的任何命令与钩子里都读得到；
- **时机**：`whenMount` 在节点真正落到 DOM 时触发；一趟落地（`bindTo` / `mount` / `hydrate`）会**收集**
  这趟里的钩子、在**收口时**统一触发——所以钩子跑起来时 `host.element()` 已经挂在树上（不是游离子树），
  要测量的库可以直接用。落地之后才发生的插入（挂载后 `child()`、`mountable()` 转真、`keyed` 插行、
  区域重建）在元素接上之后立刻触发。触发顺序就是落地顺序（子组件先于父组件）。
  `mountable(false)` 期间不触发，条件转真、真正落地时才触发；`whenDestroy` 在**子树销毁之前**触发且幂等；
- **不能写进 options 对象**：`div({ whenMount: fn })` 直接报错 —— `onXxx` 才是事件简写（`{ onClick: fn }`），
  `whenMount` / `whenDestroy` / `whenFailed` 放错位置会报错，不会被静默绑成事件；
- **`this`** 在 vNode 里是 api（照旧写 `api`，不写 `this`）；
- **内存**：没有钩子的组件零额外字段；框架不 `bind()`、不用数组收集，销毁后释放引用；
- **不做 `onUpdate`**：库里"更新"有区域重建 / keyed 换 key / 组件主动换根三种不同场景，没有单一语义。

## 7.3 组件身份：`vn`

组件的**视图根元素**上写 `vn: 'VCard'`（值 = 导出名），这个成员就是"一个 VCard"。两种形态写法完全一样：

```js
function ServiceTag() {
  // 形态 A：薄工厂，成员就是元素节点
  return span({ vn: 'ServiceTag' }, 'tag');
}

function RateCard() {
  // 形态 B（vNode）：成员是组件节点
  return vNode(() => div({ vn: 'RateCard' }, 'rate'));
}

function Chart() {
  // 同上（vNode）
  return vNode(() => div({ vn: 'Chart' }, 'chart'));
}
```

判定走核心导出的**身份读取**，与形态无关（`instanceof VXxx` 不再是承诺的用法）：

```js
import { componentNameOf, hasComponentIdentity } from '@yoyaflow/yoya-ui/core';

page.children().filter((child) => hasComponentIdentity(child, 'ServiceTag')); // 元素节点：读自己
page.children().filter((child) => hasComponentIdentity(child, 'RateCard')); // 组件节点：展开到视图根
page.children().map((child) => componentNameOf(child)); // 多值原样返回（'VTimer VInput'）
```

规则：

- **一条判定**：成员是元素节点就看它自己，是组件节点就展开到它的视图根（多根任一命中）。
  **身份是对象事实 + 真 DOM 属性**：`vn` 写进节点的身份字段（判定读它），同时落成真属性
  `vn="VCard"`（GenUI 扫描 / CSS 作用域读它）；判定跟着客户端那棵树的**对象**走，
  `adopt` / `hydrate` / 克隆片段一样认，不需要回读 DOM；
- **多值**：包装型组件共用根时写 `vn: 'VCard UserCard'`，两个身份都命中（空格分隔）；
- **类名不参与判定**：身份只认 `vn`；预设样式也从 `[vn="VXxx"]` 作用域书写，手搓同名类名不会误判；
- **`instanceof VXxx` 不再承诺**：`defineComponentIdentity` 已在票 15 波 6 退场，跨模块识别改**能力约定**
  （控件 = 有 `value()` / `_collectValue()`）或
  `hasComponentIdentity`；模块内判定自己的子实例时用模块内标记（不导出类型）；
- **裸组件对象不算**：`RateCard()` 返回的对象还没进树；判定针对 `children()` 里的成员；
- **代价**：每个组件根多一个 `vn` 属性（属性化迁移接受的字节）；改名等于改身份语义（判定与 CSS 认的都是名字）。

## 7.4 迁移提示（这批改动带来的行为变化）

- **options 里与子工厂同名的键按属性写**：`div({ slot: 't-head' })` / `div({ title: 't' })` 现在是**属性**；
  以前会创建 `<slot>` / `<title>` 子元素（静默错误）。要建子元素请用链式写法 `root.title(...)`。
- **setup 参数数量不定、严格按出现顺序**：函数 = 构建回调、字符串/数字 = 文本、节点/句柄 = 子节点、
  数组 = 子节点列表、对象 = options、同类实例 = 复用。`div(null, { children: 'x' })`、`div(cb, 't')`
  这类以前被静默丢弃的参数现在生效。
- **组件的内容侧**：`component.child(x)` 现在渲染在**组件根元素内部**（以前既不进 DOM、也不出现在
  `children()` 里）；多根组件带内容会报错。
- **`whenMount` 待评估**：它可能是多余的（很多场景可用 `requestAnimationFrame` 或首次交互惰性初始化替代），
  `whenDestroy` 是必需的清理钩子。
- **对象组件协议退场（类型面，0.7.0）**：`{ render() }` 不再是子节点 / 页面工厂的合法形状
  （`ChildInput` / `KeyedRowProduct` / `PageFactory` / `mount` / `hydrate` / `renderToString` 都不收），
  `ComponentLike` 降级成 `@deprecated` 的"只给老代码点名"类型。组件只有 A / B 两种写法。
- **对象组件协议退场（运行期，0.7.0 · 票 07）**：运行期**不再接受**对象组件——
  `child({ render() { … } })`、`renderToString / mount / hydrate(页面对象)`、`vClientOnly(() => ({ render() { … } }))`、
  路由页面对象、编译器形态 B 分支全部退场（弃用提示随之删除）。迁移就是照 A / B 两种写法重写；
  另外两条实测教训：**页面壳要缓存"工厂"而不是节点**（节点只能挂一处，缓存节点会让第二次进页面空白），
  以及**组件上的读值属性（`get x()`）改成读值命令**（`api.x = () => …`，调用点写 `x()`）。
- **组件定义函数不再有构造签名**：`new VXxx()` 与 `instanceof VXxx` 都不是承诺用法
  （身份判定走 `componentNameOf` / `hasComponentIdentity`），写下去类型就会红。

## 7.5 类型配套：直接参数、句柄与身份（0.7.0 起）

`types/*.d.ts` 随包发布，是**对外契约**，必须与运行期同口径。每个组件按同一个形状写：

```ts
// 1) 句柄：自己的命令面 + 引擎委托的元素面 / 子工厂（ComponentNode 已写清"句柄面 = 元素面"）
export interface VStatusTag extends ComponentNode {
  status(): string;
  status(value: string): VStatusTag;
}
// 2) props：`VStatusTag({ … })` 的**直接参数**，逐键写值类型；末尾留索引签名给元素级透传
export interface StatusTagOptions {
  status?: string | null;
  children?: ChildInput;
  [key: string]: unknown;
}
// 3) 定义函数收 props；快捷方法按 setup 分派调用方参数
export const VStatusTag: { (props?: StatusTagOptions): VStatusTag };
export const vStatusTag: ElementFactory<VStatusTag> & {
  (
    first?: StatusTagOptions | SetupInput<VStatusTag> | null,
    callback?: SetupCallback<VStatusTag>
  ): VStatusTag;
};
```

四条口径：

1. **定义函数收 props，快捷方法管分派**——与运行期 `VXxx` / `vXxx` 这一对一致。`VStatusTag({ status: 'ok' })`
   逐键检查；`vStatusTag(…)` 的首参是 `StatusTagOptions ∪ SetupInput`（对象 = props、文本 = 内容、
   函数 = 构建回调、元素选项 = 透传），因此**抓不住"props 取值写错"**。要逐键检查就用定义函数，
   或先把字面量写成 `const props: StatusTagOptions = { … }` 再传。
   **运行期定义函数没有 props 参数的组件，类型上也写 `(): VXxx`**：定义函数忽略的实参运行期会被
   静默丢掉（`VCard({ class })` 不写类名），声明里就不能承诺它；可派发键写进快捷方法首参的
   `XxxOptions`（`vCard({ class })` 由节点 setupObject 分派）。
2. **props 接口带 `[key: string]: unknown`**：`...rest` 按键分类透传到视图根，所以 `class` / `style` /
   `onXxx` / `data-*` / `attrs` 照旧可用；代价是"拼错的键"也不会报错——**结构键除外**，
   容器组件在运行期直接报错（`assertVTableStructure`），类型上也不收。
3. **不给构造签名、也没有组件对象协议**：`instanceof VXxx` 不是承诺的用法（身份走
   `componentNameOf` / `hasComponentIdentity`），声明里不写 `new (…)`；`{ render() }` 这条联合分支
   同样已从类型退场。`ViewNode` / `ElementNode` / `ComponentNode` / `VTextNode` / `VTreeNode` /
   `VMessageManager` / `VRouter` 这类引擎基底与真类仍然是 `class`。
4. **接口合并只在同一模块生效**：给一个组件补类型就改它自己那份 `.d.ts`，不要在别的文件里
   "再声明一个同名接口"——那样会静默合并，且分不清属于谁。

**给一个新组件补直参类型的步骤**：

1. 读运行期定义，把参数表里解构出来的 props 逐条抄成 `XxxOptions`：值位置写
   `SignalHandle<T>` / `ChildInput`，命令面的读写签名照抄句柄；
2. `class VXxx` 改成 `interface VXxx extends ComponentNode`（保留方法签名）；
3. 加 `const VXxx: { (props?: XxxOptions): VXxx }`，并给 `vXxx` 首参补上 `XxxOptions`；
4. 在 `types/tests/consumer.ts` 补一条正例 + 一条 `@ts-expect-error` 负例；
5. `npm run typecheck` 绿。

## 8. 注册父节点快捷方法

通过 `registerChildFactories` 将工厂注册到目标节点类，页面内即可使用 `page.vButton(...)` 写法；默认不覆盖既有方法：

```js
import { ViewNode, registerChildFactories } from '@yoyaflow/yoya-ui/core';
import { vStatusBadge } from './status-badge.js';

registerChildFactories(ViewNode, { vStatusBadge });
```

自定义的**基础元素工厂**（自绘标签 / 自有宿主元素）用 `markElementFactory` 自报身份，
这样编译器不必维护第二份名字表就能认出它是元素工厂（组件**不需要**标记：身份走 `vn` + 导出名）：

```js
import { markElementFactory } from '@yoyaflow/yoya-ui/core';

export const myWidget = markElementFactory(function myWidget(setup) {
  return div({ class: 'my-widget' }, setup);
}, 'my-widget');
```

标记是**符号键 + 非枚举**（`Symbol.for('@yoyaflow/yoya-ui/element-factory')`），不污染名字空间、
不进 `for…in`/spread；读它用 `isElementFactory(fn)` / `elementFactoryTagOf(fn)`。

## 9. 打包与发布建议

- 以独立 npm 包发布，将 `yoya-ui/core`（或 `yoya-ui/ui`）声明为 `peerDependencies`。
- 只导出公共工厂函数与必要类，按需提供 `.d.ts` 类型声明。
- 在包文档中声明组件清单与 `v` 前缀命名，避免与内置组件重名。

## 10. 测试建议

- 使用 Vitest + jsdom，从公共 API 断言：渲染 DOM、`toHTML()` 输出、事件触发、状态变化。
- 不测试私有字段与内部缓存；必要时用浏览器演示验证浮层定位等真实交互。
