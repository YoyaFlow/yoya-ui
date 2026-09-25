# 编译路径（Beta）

把**重复单元**（表格行、列表项、树节点）在构建期编成「静态片段 + 位置寻址的写操作」：运行期只克隆片段、
订阅活值、按 key 最小搬动。收益来自重复次数——同一份结构建 1000 行时省下的是每行的节点对象、绑定登记
与属性对账。

## 1. 怎么接：业务源码零改动

编译是**构建期的一次变换**，业务代码里不出现编译产物：

插件用 [unplugin](https://unplugin.unjs.io/) 写一遍，Vite / Rollup / Webpack / esbuild / Rspack /
Rolldown / Farm 各自取入口——只在自己已有的构建配置里加一行，**不需要额外脚本**：

```js
// vite.config.js（rollup / webpack / esbuild 同理：yoyaCompile.rollup / .webpack / .esbuild）
import { defineConfig } from 'vite';
import * as core from '@yoyaflow/yoya-ui/core';
import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';

export default defineConfig({
  plugins: [yoyaCompile.vite({ core })] // 默认：按组件边界自动发现（顶层返回 UI 视图的工厂）
});
```

**编译单元 = yoya-ui 自己的组件边界**，不需要「花名册」：凡是被打包器交给插件的模块（`node_modules`
一律跳过），顶层**返回 UI 视图的工厂函数**就是编译单元——大驼峰（`Card` / `StatusPill`）＝组件，
小驼峰里也是工厂函数的（`Row` / `vBadge` 这类薄工厂、快捷工厂）同样算；返回的不是视图（助手、
命令、数据处理）原样保留。函数体可以**先声明再 return 视图**（`const liveDemo = Demo(props)` 这类
组件实例变量就是主流写法）。通道（`element` / `node`）**按用法定**：只有"所有引用都在 `keyed` 的
行工厂槽位上"才走 `element`（最快），其它情况（`const chip = Card(…)` / `child(Card(…))` /
当值传给别的函数）走 `node`——element 产物是 `{ el, destroy }`，当值用就不再是 ViewNode 了。
显式 `units: [{ file, component, mode, thin }]` 只作为**内部特殊函数的逃生口**（给了列表就只认列表）。

插件改写时会产出 **hires sourcemap**（`transform` 返回 `{ code, map }`，产物模块也带 map）——
线上报错的栈仍然落在业务源码的正确行列上，不需要额外配置。

业务侧就是普通 DSL：`Row` 是**具名函数**（形参形状不限：解构 / 默认值 / rest / 多参都照编），
列表照旧走 `keyed`：

```js
function Row(item) {
  return tr((line) => {
    line.td((cell) => cell.className('col-md-1').child(String(item.data.id)));
    line.td((cell) => cell.className('col-md-4').a((link) => link.child(vText(item.data.label))));
    line.toggleClass('danger', item.api.selected);
    line.on('click', () => item.api.selectRow());
  });
}

tbody((body) => body.keyed(rows, Row)); // 两条通道都这么写
```

插件只做两件事：把 `Row` 改名为 `RowSource`（真源留在文件里供编译器读），并在文件末尾追加
同名函数转调编译产物；产物进虚拟模块，不落盘。**认不准就不动**：找不到目标函数、同一文件里同名声明
≥2 处、形状编不了 → 源码原样交给打包器走通用路径。（返回对象的组件形状 `{ render() { … } }`
0.7 起已整体退场，编译器也不再有这条形状分支。）

## 2. 两条通道

| 通道              | 行是什么                 | 挂进列表                                                     |
| ----------------- | ------------------------ | ------------------------------------------------------------ |
| `element`（默认） | 原生元素 `{el, destroy}` | `body.keyed(rows, Row)`（运行期按产出自选）                  |
| `node`            | `ViewNode`               | 同上；需要节点语义（`getChild()` / 区域 / 行内 `keyed`）时用 |

`element` 收益最大；`node` 换节点语义，加 `--thin` 只给直接带活内容的节点建包装对象。两条通道的产物与
通用路径的 DOM **逐字节一致**（等价性用例在仓库里）。

## 3. 契约与边界

- **整形状回落**：编不了就整体走通用路径，绝不产半成品；`--report` 能看到回落原因与直方图。
- **产物不是业务接口**：`plan.scope` 只列**应用符号**（句柄 / 命令），元素工厂由产物自己 import；
  业务代码不 import 生成物。
- **形参形状**：产物逐字复刻源码的参数表——解构（含嵌套）/ 默认值 / rest / 多参都照编。形参绑定的
  名字一律算已绑定名，不会进 scope（`function Card({ tone })` 里的 `tone` 不是作用域依赖）；参数
  默认值与计算键里的自由标识符照旧进 scope，它们要在产物里求值。
- **`data-row-key`**：element 通道的列表默认**不写**行上的键镜像属性（与参考实现逐字节一致）；
  要按 key 定位行时用 `createElementList(container, keyOf, { keyAttribute: 'data-row-key' })`。
- **SSR**：element 行只有 DOM、不进视图树，`toHTML()` 对这类列表硬报错；服务端请让同一份源码走通用路径
  （不挂编译器）。
- **产物确定性**：`plan.source.file` 是相对标签，不嵌机器绝对路径——同一份源码在哪儿编都一样。
- **主入口零成本**：不引 `yoya-ui/compiler-runtime` 就没有编译路径，也没有体积。
- **库内组件开箱链接**：包内自带预构建注册表（`yoya-ui/compiled-registry`），插件默认加载它——
  `child(vCard(…))` / `child(ArrowDownOutlined())` 不用你自己建注册表就能走片段链接；想让插件别用它
  （或换一份自己的）写 `yoyaCompile.vite({ core, registry: false })` / `registry: '你的注册表模块'`。
- **工具里没有业务代码**：编译器 / 插件 / CLI 不内置任何业务函数名、组件名或结构常量；出现的名字只来自
  构建期读到的你的模块（`plan.source`）。工具自带的夹具是中性形状，且不随包发布。
- **`child(<表达式>)` 的运行期值**：值到运行期才知道是什么，`node` 通道交给核心 `child()` 自己分派
  （字符串 / 数字 / 句柄 / 节点 / 组件对象 / 数组都按通用路径同一份语义落地）；`element` 通道只有
  文本语义（数组摊平成多段文本），传节点 / 组件时**运行期响亮报错**——这类单元请让打包器按节点语义
  编（组件单元默认就是 `node` 通道）。
- **相邻文本位置**：同一父元素下两段**相邻**的文本位置（例如 `child('a'); child(props.x)` 之间没有
  元素）整体回落通用路径——片段是序列化后再解析的，相邻文本会被解析器合并，位置表就不准了。
  这不是错误，只是这些形状暂时不走编译路径（根因解法见票 13）。

命令行的最小用法（不用打包器插件时）：

```bash
npx yoya-compiler --file src/Row.js --component Row --mode element --out src/generated/row.js
```

完整契约（能编什么 / 什么时候回落 / 组件级片段链接 / 覆盖率基线 / 运行期钩子清单）见仓库文档
`docs/compiler.zh-CN.md`（**不随 npm 包发布**，包里只有 `dist/` 与 `types/`）。
