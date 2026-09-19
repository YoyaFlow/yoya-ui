# 编译路径：构建期编译器与 compiler-runtime

yoya-ui 不需要构建步骤也能跑：DSL、组件、SSR 都在运行期完成。**编译路径**是可选的加速档——
构建期读懂结构恒定的重复单元（表格行、树节点、菜单项、虚拟滚动行），把它们编成
「静态片段 + 位置寻址的写操作」，运行期只克隆片段、订阅活值、按最小搬动对账。

> **状态：Beta**。参数（`--mode` / `--thin` / `--report` / `--registry` / `--fragments`）与产物格式
> 仍可能在小版本内调整；不跑编译器的用法完全不受影响。

两条红线决定了它的形态：

- **片段不手写**：静态片段由框架自己的工厂 + `toHTML()` 序列化产出，编译器只判断「哪些值算静态」；
- **认不出就回落**：任何它不理解的构造（`if` / `for` / 展开 / 组件调用 / 白名单外的工厂）
  都记录 bail，并让**整个形状**回到通用路径——绝不猜、绝不产出半成品片段。

## 1. 什么时候值得用

**定位**：编译路径服务的是**基准与曝光**（打榜），不是主战场——它不改变主路径的形态，也不允许给运行期
加复杂度。所有 API 以"不跑编译器时的用法"为准，编译只是**消费**这套语义；性能与体积的取舍只作用在
编译侧（编译器自身、`compiler-runtime` 子入口、生成的模块），主入口的下载路径不受影响。

真实收益在**重复单元**：同一个结构被建很多次时，省下的是每行的节点对象、绑定登记与属性对账。

| 场景                          | 收益 | 说明                                |
| ----------------------------- | ---- | ----------------------------------- |
| 长列表行（1k~10k）            | 大   | 每次 create / replace / append 都省 |
| 树节点、菜单项、表格单元格    | 中   | 结构恒定、重复次数多                |
| 骨架结构（只建一次）          | 小   | 建一次的东西折叠了也省不下来        |
| 结构随数据变化（v-if 式分支） | 无   | 直接 bail，走通用路径               |

## 2. 两条通道

编译产物的形态由 `mode` 决定：

| 通道              | 行是什么   | 生成代码返回        | 节点树                                                                  |
| ----------------- | ---------- | ------------------- | ----------------------------------------------------------------------- |
| `element`（默认） | 原生元素   | `{ el, destroy() }` | 没有节点对象（要配 `createElementList` 之类的自己的列表对账）           |
| `node`            | `ViewNode` | 节点本身            | **只含活结点及其祖先**：静态子树只存在于片段里，`children()` 看不到它们 |

选哪条：

- 只需要「行 = DOM + 活值」，就用 `element`（收益最大，实测 create 1k −57%、10k −55%）；
- 需要节点语义（`getChild()` 取句柄、区域、行内 `keyed`、组件当行），用 `node`；
  `node` 默认保真（活结点及其祖先都建包装对象），加 `--thin` 只建直接带活内容的节点。

**DOM 才是逐字节一致的那一份**：两条通道都把片段完整挂到 DOM 上，与通用路径的 `outerHTML`
逐字节相同；`node` 通道的 `toHTML()` 只序列化它持有的节点树，因此比通用路径「薄」。

## 3. 能编什么 / 什么时候回落

可编（结构恒定 + 值可分类）：

| 写法                                                  | 编译结果                                               |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `line.attr('name', 'literal')`                        | 写进片段（静态）                                       |
| `line.attr('name', row.value)`                        | 动态属性写 + 活值订阅                                  |
| `td({ attrs: { id: row.id } })`                       | options 里的动态属性值（与手写 `attr` 同路）           |
| `line.className('a b')`                               | 写进片段                                               |
| `line.toggleClass('on', expr)`                        | 类名绑定（`bindClass`）                                |
| `line.style('color', 'red')`                          | 写进片段                                               |
| `line.style('color', row.tone)`                       | 动态样式写（`node` 通道：`node.style`）                |
| 形态 C 骨架（`super('<标签>')` + 直线 `this.*` 调用） | 编成骨架片段；构造参数是内容位置（带内容时运行期回落） |
| `cell.child('文本')`                                  | 写进片段                                               |
| `cell.child(String(row.id))`                          | 位置写文本                                             |
| `cell.child(vText(handle))`                           | 文本绑定（句柄 / 零参 reader / 普通值三态）            |
| `line.on('click', handler)`                           | 直接 `addEventListener`                                |
| `cell.span(...)` / `cell.td(...)`                     | 递归编子元素（白名单内）                               |

**构建期常量折叠**：静态值不只认字面量，还认三类「构建期就能算出同一个值」的形状——同模块的
`const X = '字面量'`（含模板串拼接）、库内常量 `componentClass`、库内主题助手 `themeValue()` /
`themeBorder()`（参数也必须是静态值）。折叠调用的是**同一份实现**，不是抄公式；只有从
`components/shared.js` 导入的这几个名字参与折叠——同名局部函数、被参数遮蔽的导入名一律不折
（照旧 bail），因为"猜一个值"就是把不知道的值编成静态片段。

静态属性的值**原样交给框架的 `attr` 口径**：`null` / `undefined` / `false` 是「移除」、`true`
写成同名（`data-x="data-x"`）——编译器不自己 `String()` / 填空串，否则片段就会与通用路径不一致。

回落（记录原因，整个形状走通用路径）：

| 构造                                       | 原因                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `if` / `for` / `while` 等语句              | 结构不再恒定                                                                                                         |
| `...spread` 参数                           | 参数个数构建期不可知                                                                                                 |
| `child(vCard(...))` 等组件调用             | 组件是另一个编译单元（见 `docs/component-authoring.md`），本轮不猜                                                   |
| `child(() => …)`                           | 组件槽 / 延迟内容                                                                                                    |
| 白名单外的工厂（`vNode` / 第三方工厂）     | 不是元素工厂，编成元素就是静默语义错误                                                                               |
| 动态属性名、多变参 `attr`                  | 分类不出来                                                                                                           |
| 整体类名由数据计算（`class: row.tone`）    | 类名顺序 / 去重都是语义：状态类用 `toggleClass(name, 值)`                                                            |
| `element` 通道里的动态样式值               | 静态样式留在片段里、动态值只能走 CSSOM，序列化与 `toHTML()` 不一致；改字面量 / `toggleClass`，或这一行用 `node` 通道 |
| 文本位置收到数组 / 对象（`child([a, b])`） | 通用路径会把数组摊平成多个子节点、对对象直接报错——都不是一段文本；运行期真收到也抛错，不写 `String(x)`               |
| 文本位置收到布尔字面量（`child(false)`）   | 通用路径在 `child()` 上直接抛 TypeError；编成 `"false"` 就是静默误编                                                 |
| 静态子树里出现活文本                       | 没有活祖先承载绑定（`node` 通道）                                                                                    |

元素白名单**由核心真正注册的工厂推导**（`htmls` + `svgs`）：核心加了新标签，白名单自动跟上；
组件不会被误当元素。

上表的数据来源是 `--report`：库内 `src` 427 文件 / 候选 2 / 可编 1；三个基准行目录
（`yoya-ui-core` / `-keyset` / `-runtime`）候选各 1、可编 100%。最后两条（动态样式、整体
动态类名）在现有语料里 **0 命中**——它们兜的是业务侧「值来自数据」的写法：分类不出来就回落，
绝不把不知道的值编成静态片段。库内那两条数字由 §4.1 的覆盖率基线持续看着（回落即失败）。

## 4. 用法

### 4.1 命令行

```bash
# 编译一个形状（落在 src/generated/row.js）
node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js \
  --file src/rows/row.js --fn buildRow --mode element \
  --core ./vendor/yoya-ui/yoya.core.min.js \
  --runtime ../../vendor/yoya-ui/yoya.compiler-runtime.min.js \
  --out src/generated/row.js

# 覆盖率扫描：看清一个目录里哪些形状能编、卡在哪
node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --report src --json
```

覆盖率基线在仓库里是这样落地的：`npm run build` 末尾跑 `scripts/compiler-coverage.mjs`，把
`src` 与 `src/examples` 的候选 / 可编 / bail 直方图打进构建日志，再对照
`scripts/compiler-coverage.baseline.json` **禁回退**——口径是逐文件的「可编」集合：新增候选、
新增可编形状都不拦（覆盖率只许涨），基线里编得出来的文件一旦回落就失败（回落原因一起打出来）；
形状是有意改的，就 `npm run report:compile:write` 刷新基线，并在提交信息里写清为什么。

退出码：`0` 成功、`1` 用法错误、`2` **形状回落通用路径**（不是错误，但构建脚本要能分辨——
如果你在按「这个形状必须可编」发版，就该在 `2` 上失败）。

### 4.2 程序化 API

```js
import { compileFile, reportCoverage } from '@yoyaflow/yoya-ui/compiler';
import * as core from '@yoyaflow/yoya-ui/core';

const result = compileFile({
  file: 'src/rows/row.js',
  fn: 'buildRow',
  mode: 'element',
  out: 'src/generated/row.js',
  core,
  runtime: '@yoyaflow/yoya-ui/compiler-runtime'
});

if (!result.compiled) {
  console.log('这个形状走通用路径：', result.bails);
}
```

`result.plan` 是片段与清单（`html` / `liveNodes` / `slots` / 来源），`result.scope` 是生成模块
要求调用方提供的符号。

覆盖率体检也能程序化：`reportCoverage({ root, core })` 扫一个目录，`coverageBaselineOf(reports)`
把结果变成可提交、可 diff 的基线，`compareCoverageBaseline(baseline, reports)` 只把「基线里可编、
现在回落」判成回退，并列出新增可编——仓库自己的门禁（§4.1）就是这两个函数的调用者。

### 4.3 生成的模块与 scope 契约

```js
// 由 @yoyaflow/yoya-ui/compiler 从源码 AST 生成 —— 请勿手改。
import { bindClass, bindText, cloneFragment, pushOff, setAttr } from 'yoya-ui/compiler-runtime';

export const plan = { version: 1, mode: 'element', source: { file, fn }, html, liveNodes, slots };

export function createRowFactory(scope) {
  const { computed, removeRow, selectedId } = scope;
  return function buildRow(row) {
    const el = cloneFragment(plan.html);
    const offs = [];
    // …按位置写活值 / 绑事件…
    return {
      el,
      destroy() {
        /* 幂等退订 */
      }
    };
  };
}
```

调用方把 `plan.scope` 列出的符号装进 scope 对象传进去即可（应用里的句柄、函数，
`node` 通道还要元素工厂）；`destroy()` 幂等，重复调用不会重复退订。

## 5. 运行期钩子（`yoya-ui/compiler-runtime`）

| 钩子                                   | 用途                                                 |
| -------------------------------------- | ---------------------------------------------------- |
| `cloneFragment(html)`                  | 每个形状一份 `<template>`，每实例 `cloneNode(true)`  |
| `adopt(node, el, texts)` / `bindChild` | `node` 通道：把片段接进节点对象并激活绑定            |
| `bindText` / `bindClass` / `setAttr`   | `element` 通道：活值订阅后就地写；普通值写一次       |
| `pushOff(offs, off)`                   | 收集退订函数（生成代码保持一行一句）                 |
| `createElementList(container, keyOf)`  | 元素行对账：复用 / 原位重建 / 摘除 / 最小搬动（LIS） |

`setAttr` 与核心 `applyAttribute` 是同一份语义（`null` / `undefined` / `false` 移除属性、
布尔属性写成同名），不会出现两套属性规则。

文本位置的**一次性写**（`bindText` / `bindChild` 的非句柄分支）对节点 / 数组 / 对象直接抛错：
通用路径里它们分别是「文本」「多个子节点」「报错」，静默写 `String(x)` 就是语义漂移。

## 6. 契约与边界

- **等价性门禁**：编译产物与通用路径的 DOM 逐字节一致、活值 / 事件 / 销毁行为一致
  （用例在仓库里，改编译器就跑）。
- **任何 bail 整体回落**：片段里少一个节点就是静默的语义错误，因此不做「部分编译」。
- **主入口零成本**：钩子在独立子入口，不引它就没有编译路径，也没有体积；
  `yoya.compiler`（构建期）只跑在 Node 上，浏览器产物里没有编译器。
- **SSR / hydrate**：片段与 `renderToString()` 同源（属性、样式按名字排序，见
  [`ssr.md`](ssr.md) §8.1），服务端不需要编译器；`node` 通道接管既有 DOM 的路径与 hydrate 同源。
- **无构建环境**：不跑编译器就是今天的通用路径，行为与体积都不变。
- **区域 / 行内 `keyed` / 组件槽**：属于动态结构，一律 bail，避免语义漂移。
- **覆盖率基线门禁**：`src` / `src/examples` 两条基线进构建日志，逐文件禁回退（见 §4.1）。

## 7. 组件级片段链接（第一档：叶子组件）

组件也可以当编译单元：把组件的**视图表达式**编成「片段 + 位置写」，登记进组件注册表；
调用点只做**链接**——`cell.child(StatusDot(row.dot))` 命中注册表就生成「取片段 + 实例化」，
未命中（动态取、跨包、未登记）照旧走今天的运行时构造。

```js
import { buildComponentRegistry } from '@yoyaflow/yoya-ui/compiler';

buildComponentRegistry({
  entries: [
    { file: 'src/components/status-dot.js', export: 'StatusDot' },
    { file: 'src/components/status-tag.js', export: 'StatusTag' }
  ],
  dir: 'src/generated/components',
  core
});
```

产物都是可提交、可缓存的普通文件：每个组件一个实例化模块（`bind(root, values)` + 通用路径回落的
`render(...)`）、一个注册表模块（`components[<键>]`）、一份**纯数据**注册表 JSON
（键 = 模块路径#导出名，含 `hash` / 片段 ops / 片段 HTML）。调用方编译时传
`components: <注册表数据>`，生成的代码只 import 注册表模块。

第一档能编什么（都是**叶子**、结构恒定）：

| 形态       | 写法                                | 说明                                                          |
| ---------- | ----------------------------------- | ------------------------------------------------------------- |
| A 薄工厂   | `return span((dot) => …)`           | 视图表达式原样搬进编译单元                                    |
| B 对象组件 | `return { render() { return …; } }` | 只允许 `render` 一个成员（要保留组件对象 / 命令方法的暂不编） |
| vNode      | `return vNode(() => …)`             | setup 只 return 视图、不碰 api（命令方法同上）                |

不编的（调用点因此照旧走通用路径）：收 children 的容器组件（下一档，与票 42 的槽一起做）、
带状态 / 命令方法的组件、结构分支、用模块私有辅助（非 import 绑定）的组件、跨包组件。

组件编译单元会把原模块的 `import` 与模块级 `const` 一并搬进合成源码：静态值折叠
（同模块字面量常量、`componentClass`、`themeValue` / `themeBorder`，见 §3）要读它们，
否则组件里只剩写死的字面量能编。视图之外的函数 / 类不参与分析。

**回落是两层的**：构建期未命中 → 调用点根本不链接；运行期 `hash` 对不上（注册表与调用方不是
同一次构建）或形状校验不通过 → 用组件原模块重建这一棵 DOM 替换占位子树，
「片段与数据不符」不会静默发生。`hash` = 组件函数源码的内容哈希。

一个已知口径差异：通用路径的 DOM 属性顺序跟随 builder 的**调用顺序**，编译路径是 `toHTML()`
的**规范顺序**（属性按名字排序，见 [`ssr.md`](ssr.md) §8.1）；两者语义相同、`outerHTML` 可能不同——
编译路径与框架的规范序列化逐字节一致，顺序差异记在票 41。

### 7.1 形态 C 的骨架可编（第一档：没有内容的用法）

类节点组件（形态 C）不用改源码也能进编译单元：工厂 `return createComponentFactory(VCard, …)`
这类写法被解析成"编译单元 = `VCard` 的构造体"，构造体按 setup 回调那一套读——`super('<字面量标签>')`
定标签，之后必须是**从 `this` 出发的直线节点调用**（`className` / `attr` / `style` / `styles` /
`child` / `on` / `toggleClass`…），值要么字面量、要么可折叠（`themeValue` 这类主题助手）。

构造参数出现在 `applyComponentSetup(this, setup)`（或 `this.child(setup)`）的位置时记为**内容位置**：

- **内容能全量静态读懂就构建期内联**：字面量文本、构建回调（`vCard((card) => card.span('正文'))`）、
  白名单元素工厂（`vCard(span('x'))`）都在调用点的片段里**就地**落在内容位置，动态值按位置写；
  生成代码用 `bindComponent(…, { contentInlined: true })` 告诉构件"内容与形状都在调用方片段里"；
- **读不懂就不内联**（软回落）：动态值（`vCard(row.title)`）、组件调用、认不出的写法一律不半内联——
  内容实参照旧传给 `bindComponent`，构件的内容守卫拒收，调用方用原组件重建（内容不会被静默丢掉，
  见 §7 的两层回落；所以生成模块的 scope 里可能仍需要内容实参里的符号）；
- 类里的**字段声明**、非直线语句（`if` / 赋值 / 模块私有助手调用）、动态值与事件一律 bail：
  它们要引用实例状态（`this._x`），而构件里没有 `this`。

落地样本（本仓库实测）：`vCard` / `vCardHeader` / `vCardBody` / `vCardFooter` / `vThead` / `vTbody` /
`vTfoot` 骨架可编，片段与 `new VCard().toHTML()` **逐字节一致**；`vTh` / `vTd`（走模块私有助手
`applyTableCellStyles`）、`vTr`、`vMenuDivider` / `vSymbolButton`（私有 `_xxx` 调用）回落并给出原因。

## 8. 相关文档

- [`component-authoring.md`](component-authoring.md)：组件三种形态与第三方组件契约；
- [`ssr.md`](ssr.md)：序列化规范、hydrate 与收养既有 DOM；
- [`performance.md`](performance.md)：官方基准数字与档位结论；
- [`agents.md`](agents.md)：给 AI 助手的阅读顺序与纪律。
