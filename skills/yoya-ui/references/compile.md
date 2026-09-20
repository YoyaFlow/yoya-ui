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
命令、数据处理）原样保留。通道（`element` / `node`）**按用法定**：被当组件交给 `keyed` 的走
`element`（最快），只被 `child(...)` 当组件调用的走 `node`（ViewNode 在 `child` 与 `keyed` 里都成立）。
显式 `units: [{ file, component, mode, thin }]` 只作为**内部特殊函数的逃生口**（给了列表就只认列表）。

插件改写时会产出 **hires sourcemap**（`transform` 返回 `{ code, map }`，产物模块也带 map）——
线上报错的栈仍然落在业务源码的正确行列上，不需要额外配置。

业务侧就是普通 DSL：`Row` 是**具名函数**（形参必须是单个标识符），列表照旧走 `keyed`：

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
≥2 处、形参不是单个标识符、形状编不了 → 源码原样交给打包器走通用路径。

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
- **形参形状**：编译目标函数的形参必须是单个标识符；解构 / 默认值 / rest / 多参一律整形状回落
  （不静默把 `data` / `api` 当作用域依赖）。
- **`data-row-key`**：element 通道的列表默认**不写**行上的键镜像属性（与参考实现逐字节一致）；
  要按 key 定位行时用 `createElementList(container, keyOf, { keyAttribute: 'data-row-key' })`。
- **SSR**：element 行只有 DOM、不进视图树，`toHTML()` 对这类列表硬报错；服务端请让同一份源码走通用路径
  （不挂编译器）。
- **产物确定性**：`plan.source.file` 是相对标签，不嵌机器绝对路径——同一份源码在哪儿编都一样。
- **主入口零成本**：不引 `yoya-ui/compiler-runtime` 就没有编译路径，也没有体积。

命令行的最小用法（不用打包器插件时）：

```bash
npx yoya-compiler --file src/Row.js --component Row --mode element --out src/generated/row.js
```

完整契约（能编什么 / 什么时候回落 / 组件级片段链接 / 覆盖率基线 / 运行期钩子清单）见仓库文档
`docs/compiler.zh-CN.md`（**不随 npm 包发布**，包里只有 `dist/` 与 `types/`）。
