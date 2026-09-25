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
| `element`（默认） | 原生元素   | `{ el, destroy() }` | 没有节点对象；`keyed()` 直接吃这种行（运行期按产出自选对账，见下）      |
| `node`            | `ViewNode` | 节点本身            | **只含活结点及其祖先**：静态子树只存在于片段里，`children()` 看不到它们 |

选哪条：

- 只需要「行 = DOM + 活值」，就用 `element`（收益最大，实测 create 1k −57%、10k −55%）；
- 需要节点语义（`getChild()` 取句柄、区域、行内 `keyed`、组件当行），用 `node`；
  `node` 默认保真（活结点及其祖先都建包装对象），加 `--thin` 只建直接带活内容的节点。

**DOM 才是逐字节一致的那一份**：两条通道都把片段完整挂到 DOM 上，与通用路径的 `outerHTML`
逐字节相同；`node` 通道的 `toHTML()` 只序列化它持有的节点树，因此比通用路径「薄」。

### 2.1 接进列表：两条通道同一份业务代码

`keyed()` 按组件的**产物**自选对账路径：`ViewNode` 行走节点树对账，`{ el, destroy }` 行走元素对账
（同 key 复用 / 同 key 换引用原位重建 / 离场销毁 / 最小搬动）。所以业务侧不用为通道改写法：

```js
tbody((body) => {
  body.attr('id', 'tbody');
  body.keyed(rows, Row); // element / node 两条通道都这么写
});
```

同一段列表里混用节点行与元素行会报错（不许一半进树一半不进）。元素行只有 DOM、不进视图树，因此
`toHTML()` 对含元素行的容器**硬报错**（SSR 请让同一份源码走通用路径）。

### 2.2 业务源码零改动：构建期插件

编译器用 [unplugin](https://unplugin.unjs.io/) 写一遍，自动导出 Vite / Rollup / Webpack / esbuild /
Rspack / Rolldown / Farm 各自的入口（`yoyaCompile.vite(...)` / `.rollup(...)` / `.webpack(...)` /
`.esbuild(...)` / `.rspack(...)` / `.rolldown(...)` / `.farm(...)`）——只在自己已有的构建配置里加一行：

```js
// vite.config.js
import * as core from '@yoyaflow/yoya-ui/core';
import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';

export default defineConfig({
  plugins: [yoyaCompile.vite({ core })] // 默认：按组件边界自动发现（顶层返回 UI 视图的工厂）
});
```

**编译单元 = yoya-ui 自己的组件边界**，不需要花名册：被打包器交进来的模块（`node_modules` 跳过）里，
顶层**返回 UI 视图的工厂函数**就是编译单元——大驼峰（`Card` / `StatusPill`）＝组件，小驼峰里也是工厂
函数的（`Row` / `vBadge` 这类薄工厂、快捷工厂）同样算；返回的不是视图（助手、命令、数据处理）
原样保留。通道（`element` / `node`）按**用法**推断：被当组件交给 `keyed` 的走 `element`（最快），
只在 `keyed` 的行工厂槽位上出现的走 `element` 之外，**其余一律 `node`**——组件只要还被当值用
（`const chip = Card(…)` / `child(Card(…))` / 传给别的函数），element 产物就不再是 `ViewNode`，
通用路径会抛错而编译路径必须同口径。`node` 通道在 `child` 与 `keyed` 里都成立。显式
`units: [{ file, component, mode, thin }]` 只作为**内部特殊函数的逃生口**（给了列表就只认列表）。

函数体允许 **`return` 之前有声明 / 表达式语句**（组件体里先把实例存进变量再在 render 里用，
是文档页那批的主流形状）；视图本身仍要是**单一条 return 的工厂调用**，`return` 之前出现控制流 /
多条 return 一律不认（早退会让"那条 return 的视图"变成运行期才知道的事）。

插件把源码里的 `Row` 改名为 `RowSource`（真源留给编译器），并追加同名函数转调编译产物；
产物进虚拟模块，不落盘，业务代码不 import 任何生成物。目标定位按 **AST 符号身份**（模块顶层同名函数
声明），认不准就不动：找不到 / 同名声明 ≥2 处 / 形状编不了 → 源码原样走通用路径。

改写用 `magic-string` 产出 **hires sourcemap**（`transform` 返回 `{ code, map }`，虚拟产物模块同样带 map），
定位链不断：线上报错仍落在业务源码的正确行列上。

## 3. 能编什么 / 什么时候回落

可编（结构恒定 + 值可分类）：

| 写法                                                                                   | 编译结果                                                                                                                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `line.attr('name', 'literal')`                                                         | 写进片段（静态）                                                                                                             |
| `line.attr('name', row.value)`                                                         | 动态属性写 + 活值订阅                                                                                                        |
| `line.attr({ id: 'x', tone: row.tone })`                                               | 对象形式：逐项走 `attr(名字, 值)`（与核心同一条口径、同一顺序）                                                              |
| `root.path({ d: 'M12 5v14' })`                                                         | SVG 子标签工厂（白名单来自 `svgs` 表；节点通道产物 import `svgs` 命名空间，写成 `svgs.path(…)`）                             |
| `line.className(props.tone)`                                                           | **动态类名**：`String(值)` 按空白切分、与已有类名**保序去重**（节点通道复用 `node.className`）                               |
| `line.style({ height: row.h })`                                                        | 对象形式：等价于 `styles(对象)` → 逐项 `style(名, 值)`                                                                       |
| `root.h1(props.heading)`                                                               | **动态实参**：运行期类型分派（复用核心 `applySetupValue`）；`node` 通道全类型，`element` 通道按"位置 = 一段文本"落地         |
| `const body = root.div(…)` 之后 `body.attr(…)`                                         | **节点变量（别名）**：DSL 里链式工厂返回**父节点**，所以别名 = 当前节点；写法照常分析、按源码顺序发射                        |
| `td({ attrs: { id: row.id } })`                                                        | options 里的动态属性值（与手写 `attr` 同路）                                                                                 |
| `line.className('a b')`                                                                | 写进片段                                                                                                                     |
| `line.toggleClass('on', expr)`                                                         | 类名绑定（`bindClass`）                                                                                                      |
| `line.mountable(condition)`                                                            | 条件挂载（`element` 通道走 `mountableAt`，`node` 通道用节点自己的 `mountable`）                                              |
| `list.keyed(rows, keyOf, rowFactory)`                                                  | 组件内部的列表：行工厂是**子单元**，`element` 通道走 `keyedRows`，`node` 通道用节点自己的 `keyed`                            |
| `list.keyed(rows, rowFactory)`（两参）                                                 | 同上；键口径照抄核心：keySet 源用容器的 `keyOf(item.data)`，信号源按**行身份**（对象键 → 不写 `data-row-key`）               |
| `const a = <表达式>;`（根或嵌套 setup）                                                | **逻辑帧**：声明原样搬进产物、按源码顺序执行；值位置引用它不再回落，名字也不进 `scope`                                       |
| `if (…) { <加一个子元素> }`                                                            | **结构锚点**：语句原样搬进产物，那段结构提升成**子单元**，按"片段里它后面的那个兄弟"当边界插回去                             |
| `for (const x of …) { <加一个子元素> }`                                                | 同上（`for…of`：迭代语义照抄语句本身，空列表就是一次都不建）                                                                 |
| `list.forEach((item) => { <加一个子元素> })`                                           | 同上（`forEach` 与控制流同一条路：语句原样，结构按项实例化到锚点）                                                           |
| `[…].forEach(([a, b]) => <加一个子元素>)`                                              | 同上：接收者任意（数组字面量也行），回调的**表达式体**会被包成块体                                                           |
| 锚点里的 `child(<组件>(…))`                                                            | 结构也可以是**组件调用**：条目带 `plan` + `hash`（文件注册表）时按注册表实例化（克隆片段 + 位置写 / 节点渲染）               |
| `line.style('color', 'red')`                                                           | 写进片段                                                                                                                     |
| `line.style('color', row.tone)`                                                        | 动态样式写（`node` 通道：`node.style`）                                                                                      |
| 节点类型骨架（`super('<标签>')` + 直线 `this.*` 调用）                                 | 编成骨架片段；构造参数是内容位置（带内容时运行期回落）                                                                       |
| `cell.child('文本')`                                                                   | 写进片段                                                                                                                     |
| `cell.child(String(row.id))`                                                           | 位置写文本                                                                                                                   |
| `cell.child(vText(handle))`                                                            | 文本绑定（句柄 / 零参 reader / 普通值三态）                                                                                  |
| `line.on('click', handler)`                                                            | 直接 `addEventListener`                                                                                                      |
| `cell.span(...)` / `cell.td(...)`                                                      | 递归编子元素（白名单内）                                                                                                     |
| `const view = <工厂调用>(…); return view;`（函数体 / `vNode` setup / `render()` 都算） | **命名根 / 赋值流**：块在哪儿、叫什么、被赋几次都不参与判定（同名遮蔽除外）；被别处读过只切通道                              |
| `cell.child(<元素工厂>(options, setup))`                                               | 与前缀写法 `cell.span(…)` **同义**：同一套参数分析（options / 回调 / 文本 / 尾部动态实参）                                   |
| 条件 / 循环里的 `child(<值>)`                                                          | 当**洞**：调用原样在产物节点上跑（核心 `child()` 分派），跑完按片段边界摆位；控制流里的**节点句柄名**同时换成产物句柄 `node` |
| `child(vText(x).mountable(cond))`                                                      | **条件挂载**：摆位认挂载态——条件为假的子树不摆进 DOM、已经在里面的摘掉（与 `keyedRows.place()` 同规矩）                      |
| 第三方**基础元素工厂**（自绘标签 / 自有宿主）                                          | 用 `markElementFactory(fn, tag)` 自报身份（符号键、非枚举）；组件不用标记，身份走 `vn`                                       |

**构建期常量折叠**：静态值不只认字面量，还认三类「构建期就能算出同一个值」的形状——同模块的
`const X = '字面量'`（含模板串拼接）、库内常量 `componentClass`、库内主题助手 `themeValue()` /
`themeBorder()`（参数也必须是静态值）。折叠调用的是**同一份实现**，不是抄公式；只有从
`components/shared.js` 导入的这几个名字参与折叠——同名局部函数、被参数遮蔽的导入名一律不折
（照旧 bail），因为"猜一个值"就是把不知道的值编成静态片段。

静态属性的值**原样交给框架的 `attr` 口径**：`null` / `undefined` / `false` 是「移除」、`true`
写成同名（`data-x="data-x"`）——编译器不自己 `String()` / 填空串，否则片段就会与通用路径不一致。

回落（记录原因，整个形状走通用路径）：

| 构造                                       | 原因                                                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `while` / `for(;;)` / `switch` 等语句      | 只认 `if` / `for…of` / `forEach`（见上表）；其它控制语句的迭代次数 / 分支读不出恒定结构                                                                                            |
| 认不准的局部声明                           | `var` / 解构默认值 / 初始化里出现节点对象或元素工厂 / 同名声明多处 / 与模块级绑定同名 / 值位置引用嵌套 setup 的节点参数                                                            |
| **逻辑帧 / 洞 / 控制流里给外层名字赋值**   | 产物拿到的是**值**（`scope` 解构成 `const`）：写要么抛错（`Assignment to constant variable`）、要么写不回外层（命令读到的还是旧值）——`VSymbolButton` 的 `rootNode = root` 就是这条 |
| **视图外那层包装不是 core 的 `vNode`**     | 现在按**名字 + 来源**认 core 的 `vNode`（改名的别名认）；自家 `wrap(…)` / `once(…)` / `memo(…)` 一律回落（"包装回调按形状认"是待办，票 21 §5）                                     |
| `element` 通道里值位置引用**组件体局部量** | 元素通道产物只带值、不带闭包；这类单元要求节点产物，给不了就回落                                                                                                                   |
| 注册表条目里的**组件体局部量**             | 条目模块只能 `import` 原模块、拿不到组件闭包 → 这类组件不进注册表（调用点走通用路径，不产出引用 `undefined` 的条目）                                                               |
| 控制流里认不准的结构                       | 块里的链式语句不是"加一个子元素"（条件写 `body.className(…)`）/ 块里嵌控制流                                                                                                       |
| `...spread` 参数                           | 参数个数构建期不可知                                                                                                                                                               |
| 未链接的组件调用                           | 跨模块 / 编译不了的组件：插件只链**同模块**的组件（见 §7.1），其余照旧走通用路径                                                                                                   |
| `child(() => …)`                           | 组件槽 / 延迟内容                                                                                                                                                                  |
| 白名单外的工厂（`vNode` / 第三方工厂）     | 不是元素工厂，编成元素就是静默语义错误                                                                                                                                             |
| 动态属性名、`attr(名, 值, 选项)` 三参      | 分类不出来（属性名必须是字符串字面量）                                                                                                                                             |
| `className(字面量但不是字符串)`            | 例如 `className(1)`：核心会把数字当成类名文本，这里不猜                                                                                                                            |
| 动态实参**后面还有参数**                   | 运行期追加的子节点会插到后面那些结构之后（顺序保不住）→ 整形状回落                                                                                                                 |
| `element` 通道里的动态样式值               | 静态样式留在片段里、动态值只能走 CSSOM，序列化与 `toHTML()` 不一致；改字面量 / `toggleClass`，或这一行用 `node` 通道                                                               |
| 文本位置收到数组 / 对象（`child([a, b])`） | 通用路径会把数组摊平成多个子节点、对对象直接报错——都不是一段文本；运行期真收到也抛错，不写 `String(x)`                                                                             |
| 文本位置收到布尔字面量（`child(false)`）   | 通用路径在 `child()` 上直接抛 TypeError；编成 `"false"` 就是静默误编                                                                                                               |
| 静态子树里出现活文本                       | 没有活祖先承载绑定（`node` 通道）                                                                                                                                                  |

元素白名单**由核心真正注册的工厂推导**（`htmls` + `svgs`）：核心加了新标签，白名单自动跟上；
组件不会被误当元素。

### 3.1 收益 gate：**深度由收益决定，不由覆盖率决定**

能不能编是**形状**问题，值不值得编是**收益**问题，两者分开看：

- **不挂编译器必须行为一致**：编译路径只消费运行期语义，认不出就回落（契约见 §6）；
- **性能门槛只用真机数字**：同一批形状在 jsdom 里置换**更慢**（1.2–1.6×），真机才是 0.3–0.6×
  —— 所以 jsdom 只留"排序"结论、绝对值作废；
- 收益为正的形状集合由 `npm run report:shapes` 产出（真机无头 Edge / Chromium，结果写进
  `benchmark/shapes.json`；跑之前先做两列 DOM 逐字节比对，不一致直接非零退出）。

当前实测（2026-09-23，i7-14700HX / HeadlessChrome 153）：构建类操作 **0.51–0.57×**、
对账类 **0.90–0.94×**（不退化）；行规模越大越省——每行 4 列 **0.44×** → 8 列 **0.31×** →
16 列 **0.24×** → 32 列 **0.17×**。也就是说**真机上"深度门槛"很低（4 列已经 0.44×），
没有"太小所以别编"的规模线**；小形状只是绝对收益小。

覆盖率数字（`--report`，本机刷新跑 `npm run report:compile`）：库内 `src` 503 文件 /
候选 161 / 可编 **44**；`examples` 136 / 82 / 16。这些数字由 §4.1 的覆盖率基线**逐文件**
盯着（基线里可编、现在回落即失败），但它只是"形状覆盖面"的体检，**不作为收益门槛**。

## 4. 用法

### 4.1 命令行

编译器就在 `@yoyaflow/yoya-ui` 包里（`yoya-compiler` bin + `yoya-ui/compiler` 子路径），**不用额外装库**；
但它把构建期依赖 `@babel/parser` 外置了（浏览器产物不含它），而它是 **optional peer**、不会自动安装，
所以本地要装一次：

```bash
npm i -D @yoyaflow/yoya-ui @babel/parser   # 报 Cannot find package '@babel/parser' 就是漏了这条
```

**不需要配置**：`--core` 默认就是包自带的 core；`--runtime` 默认写 `./compiler-runtime.js`（用打包器时
指到 `@yoyaflow/yoya-ui/compiler-runtime`）。

```bash
# 编译一个形状（落在 src/generated/row.js）
npx yoya-compiler \
  --file src/Row.js --component Row --mode element \
  --core ./vendor/yoya-ui/yoya.core.min.js \
  --runtime ../../vendor/yoya-ui/yoya.compiler-runtime.min.js \
  --out src/generated/row.js

# 覆盖率扫描：看清一个目录里哪些形状能编、卡在哪
node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --report src --json
```

覆盖率基线在仓库里是这样落地的：`npm run build` 末尾跑 `scripts/compiler-coverage.mjs`，把
`src` 与 `examples` 的候选 / 可编 / bail 直方图打进构建日志，再对照
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
  file: 'src/Row.js',
  component: 'Row',
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
  return function Row(row) {
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

| 钩子                                         | 用途                                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| `cloneFragment(html)`                        | 每个形状一份 `<template>`，每实例 `cloneNode(true)`   |
| `adopt(node, el, liveAttrs)` / `bindChild`   | `node` 通道：把片段接进节点对象并激活绑定             |
| `mountRuntimeChildren(node, value, …)`       | `node` 通道：`child(<表达式>)` 交给核心分派，位置后摆 |
| `mountNodeAt(node, container, before)`       | `node` 通道：接管片段之后把节点摆回边界之前           |
| `textAt(anchor)`                             | 片段里的文本位置是注释锚点——写入前换成真文本节点      |
| `bindText` / `bindChildText` / `setAttr`     | 活值订阅后就地写；普通值写一次                        |
| `bindClass` / `addClassText` / `mountableAt` | `element` 通道的类名写与条件在场                      |
| `pushOff(offs, off)`                         | 收集退订函数（生成代码保持一行一句）                  |
| `createElementList(container, keyOf)`        | 元素行对账：复用 / 原位重建 / 摘除 / 最小搬动（LIS）  |

`setAttr` 与核心 `applyAttribute` 是同一份语义（`null` / `undefined` / `false` 移除属性、
布尔属性写成同名），不会出现两套属性规则。

**文本位置在片段里是注释锚点**：片段是"序列化再解析"出来的，而 HTML 解析器会把相邻的两段文本
并成**一个**文本节点——位置表按 `childNodes` 下标寻址，下标随后整体前移（读到 `undefined`，
或把值写进隔壁元素）。所以文本位置采样时写一个哨兵字符、序列化后换成 `<!---->`；
`textAt()` 在写入前把锚点换成真文本节点。相邻文本位置因此和其他形状一样可编
（发射器会校验哨兵数量与位置数一致，不一致就整体回落）。

写进**文本**位置的一次性写（`vText(x)` → `bindText` / `bindChild`；`element` 通道里的
`child(<表达式>)` → `bindChildText`）对节点 / 数组 / 对象直接抛错：通用路径里它们分别是
「建子节点」「摊平成多个子节点」「报错」，静默写 `String(x)` 就是语义漂移。只有 `node` 通道的
`child(<表达式>)` 支持这几种值——它把值交给核心 `child()` 自己分派（不复制第二套表），
产物只负责位置。

## 6. 契约与边界

- **等价性门禁**：编译产物与通用路径的 DOM 逐字节一致、活值 / 事件 / 销毁行为一致
  （用例在仓库里，改编译器就跑）。
- **任何 bail 整体回落**：片段里少一个节点就是静默的语义错误，因此不做「部分编译」。
- **主入口零成本**：钩子在独立子入口，不引它就没有编译路径，也没有体积；
  `yoya.compiler`（构建期）只跑在 Node 上，浏览器产物里没有编译器。
- **SSR / hydrate**：片段与 `renderToString()` 同源（属性、样式按名字排序，见
  [`ssr.md`](ssr.md) §8.1），服务端不需要编译器；`node` 通道接管既有 DOM 的路径与 hydrate 同源。
- **无构建环境**：不跑编译器就是今天的通用路径，行为与体积都不变。
- **目标函数形参**：产物**逐字复刻源码的参数表**——解构（含嵌套）、默认值、rest、多参都照编。
  形参绑定的名字一律算**已绑定名**，不会进 scope（`function Card({ tone })` 里的 `tone` 不是作用域依赖）；
  参数默认值与计算键里的自由标识符照旧进 scope，它们要在产物里求值。
  **例外**：`arguments` / `new.target` 这类既不是合法绑定名、语义又依赖调用形态的写法整形状回落
  （收进 scope 会产出语法错误的产物，绝不放行）。
- **元素工厂按绑定来源确认**：名字命中白名单还不够——本地函数 / 变量 / 形参 / 非库入口的同名导入都不算
  元素工厂（否则 `function span(...)` 会被编成 `<span>`，而通用路径会抛错）。库入口包括
  `@yoyaflow/yoya-ui`、`/core` 子入口，以及仓库内的 `index.js` / `yoya.*.js`。
- **局部声明不进产物**：产物不执行组件函数体，所以函数体里声明的局部名（`const label = …`）**不是**运行期
  作用域依赖；值位置引用了它们就整形状回落（以前会被编成 `const { label } = scope`，运行期读到 undefined）。
- **组件单元的结构入口**：`return <工厂>(…)`、vNode（`return vNode((api) => { …命令…; return <工厂>(…) })`）、
  `vNode((api) => { …命令…; return <工厂>(…) })` 三种都编。插件对后两种做**就地替换**：组件体、命令、状态、
  钩子一行不动，只把视图表达式换成编译产物——所以命令 / `instanceof` / 生命周期天然保留。组件单元的产物要能
  当 `ViewNode` 用，通道固定为 `node`；结构不是单一表达式（多语句 / 分支）时源码原样透传。
- **调用点链接保留组件包装**（票 15）：把被链接组件摊平进调用方片段，只在"它的产物**就是**那段结构"
  （薄工厂）时才成立。子组件的产物是**组件节点**（`vNode` / 形态 B——命令、钩子、身份都挂在包装上）时，
  调用点编成**运行期子节点**：调用表达式原样留在产物里、组件符号走 `scope`
  （`createRowFactory({ Badge })`），于是包装、命令、`whenMount` / `whenDestroy` 都在，
  而子组件自己的视图表达式照旧是编译产物。内联的形参帧先把调用方实参求值到外层临时变量
  （`__yoyaFrameArgs<n>`）再绑形参——帧绑定因此不会遮蔽自己的初始化器（调用双方都叫 `props` 也不会炸）。
- **组件实例（按调用求值的 scope）**：就地替换之后，产物可以引用组件体的局部量
  （`const chip = Chip(props.label); … root.child(chip)`）。这些名字在**替换点**（组件体里）被放进
  `createRowFactory({ … })`，闭包因此可见；一旦 scope 里有这种"每次调用才有的名字"，工厂就**每次调用现建**
  ——模块级缓存（`__yoyaFactory ??=`）会把第一次调用时的实例留给后面每一位调用者。纯静态的组件体也会建
  包装对象（`nodeAlways`），否则 `render()` 返回的就是一个元素。
- **每个编译单元一个 import 绑定名**：产物追加的是
  `import { createRowFactory as __yoyaCreateRowFactory_<n> } from "<虚拟模块>"`。两个单元共用一个名字是 ESM
  的早期错误（`Identifier 'createRowFactory' has already been declared`）——业务模块会被打包器直接拒收，
  不是"少个优化"。
- **产物不是业务接口**：`plan.scope` 只列应用符号（句柄 / 命令），元素工厂由产物自己 import；业务代码
  不 import 生成物（构建期插件负责接线）。
- **`data-row-key`**：业务源码里的 `keyed()` 走核心对账，**节点行**在键是字符串 / 数字时把键镜像成
  `data-row-key`（与通用路径同一条规则）；编译产物里的 `element` 行（`keyedRows`）照同一条规则写，
  所以「挂 / 不挂编译器」的属性集合一致。`createElementList(container, keyOf, { keyAttribute })`
  仍是显式开关（官方基准的 element 行默认不写，与参考实现逐字节一致）。
- **`keyed` 的行工厂是子单元**：`list.keyed(rows, keyOf, (row) => <工厂>(…))` 把行工厂编成独立单元
  （与普通行单元同一套产物），主产物按模块路径 import 它的 `createRowFactory`；行工厂形状认不出
  （多语句 / 第二个形参 / 非单一 `return`）时，**整个形状**回落，绝不半编。
- **节点通道的位置表**：`node` 通道也把 op 引用到的元素 / 文本节点**一次性预解析**成变量
  （顺序：片段 → 位置 → 节点 / 写操作），所以挂载条件摘节点、组件挂载不会让后面的 `childNodes[i]`
  指错元素。
- **节点通道的挂载锚点**：`node.mountable(condition)` 复用节点自己的条件挂载；为了让「离场 → 回场」
  回到原位，带条件的子元素**后面的第一个元素兄弟**会进视图树当锚点（核心按 `_children` 找插入锚点），
  它的父链在 `--thin` 下也保留。
- **逻辑帧（局部声明）**：`const` / `let` 声明原样搬进产物、按源码顺序执行（根 setup 与嵌套 setup 都算）；
  值位置引用它不再算「引用局部变量」，名字也不进 `scope`。认不准就回落：`var`、
  解构默认值、初始化里出现节点对象 / 元素工厂、同名声明多处、**与模块级绑定同名**（分不清读哪一份）、
  **值位置引用嵌套 setup 的节点参数**（节点对象不是一段值）。
  - **运行期子节点（`child(<表达式>)`）**：值到运行期才知道是什么，`node` 通道把它交给核心
    `child()`——字符串 / 数字 / 句柄 / 零参 reader 建文本节点，节点与组件对象进视图树，数组摊平，
    认不出的值沿用核心自己的报错。子节点句柄靠"调用前后切 `_children` 取差集"拿到
    （`child()` 返回的是**父节点**，拿返回值当子节点会把本片段元素变成子节点）；位置在 `adopt()`
    之后按"片段里它后面的那个兄弟"摆回来。`element` 通道没有节点对象：保持文本语义
    （数组摊平成多段文本），收到节点 / 组件时**响亮报错**——这类单元要编 `node` 通道。
    `child([a, b])` 因此从「按设计回落」变成可编。
  - **相邻文本位置可编**（票 13）：片段是序列化后再解析的，HTML 解析器会把相邻两段文本合并成
    **一个**文本节点，位置表随后整体前移（读到过期的 `childNodes[i]`，或把值写进隔壁元素）。
    现在文本位置在片段里是**注释锚点**（`<!---->`，不参与文本合并），写入前由 `textAt()` 换成真文本
    节点；发射器校验"哨兵数量 == 文本位置数"，对不上就整体回落——所以相邻文本位置和其他形状一样可编。
  - **结构锚点（`if` / `for…of`）**：语句**原样**搬进产物，里面的结构语句提升成**子单元**
    （独立产物模块，父产物 import 它的 `createRowFactory`），执行时插到"片段里它后面的那个兄弟"之前
    ——片段里不留占位节点，所以 DOM 字节不变；语句原样执行，所以逻辑帧与位置写**按源码顺序交织**
    （`let n = …; attr(a, n); n = n + 1; attr(b, n)` 两条路径一致）。
    边界：块里的链式语句必须只加一个子元素（`body.className(…)` 这类条件写本轮不编）；
    块里不能再嵌控制流；`node` 通道里锚点子单元会被 `node.child(...)` 收养
    （销毁 / `toHTML()` 都对），位置在接管后按边界摆回来。
- **`node` 通道的闭包嵌套**：节点一旦带逻辑帧 / 锚点，它的**下层节点构建会搬进它的 setup 闭包**
  （闭包套闭包），这样下层闭包能看见这些局部量，可见性与源码一致；没有逻辑帧时产物保持扁平。
- **产物确定性**：`plan.source.file` 写相对标签（绝对路径折算成相对 cwd，项目外只留文件名），
  同一份源码在哪儿编都得到逐字节相同的产物。
- **工具里没有业务代码**：编译器 / 插件 / CLI / 覆盖率脚本不内置任何业务函数名、组件名、表名、选择器或
  结构常量；它们出现的名字只来自构建期读到的业务模块（`plan.source`）。工具自带的夹具只用中性形状，
  而且只存在于测试目录、不随包发布（`files: [dist, types]`）。
- **区域 / 组件槽**：属于动态结构，一律 bail，避免语义漂移（行内 `keyed` 自票 03 起可编，见上）。
- **覆盖率基线门禁**：`src` / `examples` 两条基线进构建日志，逐文件禁回退（见 §4.1）。

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

| 形态                   | 写法                                | 说明                                                            |
| ---------------------- | ----------------------------------- | --------------------------------------------------------------- |
| A 薄工厂               | `return span((dot) => …)`           | 视图表达式原样搬进编译单元                                      |
| vNode                  | `return vNode(() => …)`             | setup 只 return 视图、不碰 api（命令方法同上）                  |
| 对象组件（0.7 起退场） | `return { render() { return …; } }` | 编译器**不再认这条形状**：见到就记一条 bail、整单元回落通用路径 |

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

### 7.1 插件内的同模块链接（不落注册表文件）

用构建期插件时**不需要**上面那份花名册：插件把模块里发现到的组件编成**内存注册表**，
`child(<同模块组件>(…))` 命中就**内联**——子组件的视图片段就地嵌进调用方的片段，子组件的写按
调用点的位置展开，子组件体在**形参帧**里求值（实参先求值到外层临时变量，再
`const [{ label, tone }] = __yoyaFrameArgs<n>;`，逐字复刻子组件的参数表：解构 / 默认值 / rest / 多参都照编）。
**只有产物是裸结构的组件才内联**；产物是组件节点（`vNode` / 形态 B）的调用点编成运行期子节点（见 §6）。

为什么同模块不走注册表 + `bindComponent`：同一次构建、同一个模块里 `hash` 不可能对不上，
回落那半没有用武之地；而注册表条目的 `scope` 是**子组件模块的命名空间**，只有当业务模块把
用到的 import 再导出一次时才拿得到——那等于要业务代码为编译改写法。内联把子组件用到的模块级
名字并进调用方产物自己的 `scope`（`createRowFactory({ … })`），业务模块一行不改，
运行期也**零新增**（不落注册表模块、不 import 业务模块、没有模块环）。

同模块链接的边界（认不出就整形状回落，绝不半编）：

- 被引用组件自己编不了 / 不是编译单元 → 不进注册表，调用点原样保留；
- 被引用组件内部有 `keyed` 行子单元 → 调用点本轮不内联（行子单元要跟着接线，下一步）；
- 跨模块引用（`import { StatusDot } from './status-dot.js'`）走 §7 的注册表 + `bindComponent`：
  插件接一份**预构建注册表**（`buildComponentRegistry` 的纯数据 + 注册表模块路径）就能跨模块 / 跨包链接，
  同模块的条目仍然内联（`yoyaCompile.vite({ core, components, componentsSpecifier })`）；
  没给注册表时跨模块调用点原样保留，走通用路径。

`node` 通道同样吃这套：容器组件（只被 `child(...)` 调用 → node 通道）引用子组件时，子组件的
活结点按位置物化、形参帧挂在节点 setup 闭包里——所以「页面组件 → 若干子组件」整条链都能编。

### 7.2 节点类型骨架可编（第一档：没有内容的用法）

节点类型组件不用改源码也能进编译单元：工厂 `return createComponentFactory(VCard, …)`
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

### 7.3 库内组件不用自己建注册表（票 11）

业务侧**不必**自己跑一遍注册表构建：包内自带一份预构建注册表
（`yoya-ui/compiled-registry`），插件在调用方没传 `components` 时**默认加载**它——
`child(vCard(…))` / `child(ArrowDownOutlined())` 这类库内组件调用开箱即用。

- **形状推导，不写名单**：`scripts/compiler-registry.mjs` 扫 `src`（排除 `examples`、测试与
  `src/compiler`）的顶层导出并**逐个试着编**，编得出来就进注册表；编译器仍然不认识任何组件名；
- **键按包名**：条目键是 `@yoyaflow/yoya-ui#<导出名>`，所以从 `.` / `/ui` / `/data-display` 哪个入口
  import 都命中同一条目（`component-key.js` 的 `packageNameOf`）；
- **两个文件各司其职**：`dist/yoya.compiled-registry.js` 是运行期面（`bind` / `render` / `hash` /
  `plan`），使用者打包时引它；`dist/yoya.compiled-registry.json` 是**构建期面**（`ops` / `factory`），
  只在 Node 里被插件读——所以"把组件片段嵌进调用方"不花使用者的字节；
- **隔离**：注册表只 import 包内入口（`/core`、`/ui`、`/<分类>`、`/compiler-runtime`），不引 `src`、
  也不引构建期编译器；core / UI 入口 / 主入口都**不** import 它——不链接库内组件的项目零成本，
  链接了才拉对应条目（`verify:dist` 把这几条都钉住）；
- **守卫**：预构建条目是按 `@yoyaflow/yoya-ui/core` 编的，调用方换了 `coreSpecifier` 就整体不用
  （两份核心实例会错位，见票 14 的 D3）；注册表模块 / JSON / 条目形状缺一即"不链接"，绝不产半成品。
  `yoyaCompile.vite({ core, registry: false })` 关掉默认加载，`registry: '<specifier>'` 指向自定义注册表。

## 8. 相关文档

- [`component-authoring.md`](component-authoring.md)：组件三种形态与第三方组件契约；
- [`ssr.md`](ssr.md)：序列化规范、hydrate 与收养既有 DOM；
- [`performance.md`](performance.md)：官方基准数字与档位结论；
- [`agents.md`](agents.md)：给 AI 助手的阅读顺序与纪律。
