# 编译路径：构建期编译器与 compiler-runtime

yoya-ui 不需要构建步骤也能跑：DSL、组件、SSR 都在运行期完成。**编译路径**是可选的加速档——
构建期读懂结构恒定的重复单元（表格行、树节点、菜单项、虚拟滚动行），把它们编成
「静态片段 + 位置寻址的写操作」，运行期只克隆片段、订阅活值、按最小搬动对账。

两条红线决定了它的形态：

- **片段不手写**：静态片段由框架自己的工厂 + `toHTML()` 序列化产出，编译器只判断「哪些值算静态」；
- **认不出就回落**：任何它不理解的构造（`if` / `for` / 展开 / 组件调用 / 白名单外的工厂）
  都记录 bail，并让**整个形状**回到通用路径——绝不猜、绝不产出半成品片段。

## 1. 什么时候值得用

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

| 写法                              | 编译结果                                    |
| --------------------------------- | ------------------------------------------- |
| `line.attr('name', 'literal')`    | 写进片段（静态）                            |
| `line.attr('name', row.value)`    | 动态属性写 + 活值订阅                       |
| `line.className('a b')`           | 写进片段                                    |
| `line.toggleClass('on', expr)`    | 类名绑定（`bindClass`）                     |
| `line.style('color', 'red')`      | 写进片段                                    |
| `cell.child('文本')`              | 写进片段                                    |
| `cell.child(String(row.id))`      | 位置写文本                                  |
| `cell.child(vText(handle))`       | 文本绑定（句柄 / 零参 reader / 普通值三态） |
| `line.on('click', handler)`       | 直接 `addEventListener`                     |
| `cell.span(...)` / `cell.td(...)` | 递归编子元素（白名单内）                    |

回落（记录原因，整个形状走通用路径）：

| 构造                                    | 原因                                                               |
| --------------------------------------- | ------------------------------------------------------------------ |
| `if` / `for` / `while` 等语句           | 结构不再恒定                                                       |
| `...spread` 参数                        | 参数个数构建期不可知                                               |
| `child(vCard(...))` 等组件调用          | 组件是另一个编译单元（见 `docs/component-authoring.md`），本轮不猜 |
| `child(() => …)`                        | 组件槽 / 延迟内容                                                  |
| 白名单外的工厂（`vNode` / 第三方工厂）  | 不是元素工厂，编成元素就是静默语义错误                             |
| 动态属性名、非字面量类名、多变参 `attr` | 分类不出来                                                         |
| 静态子树里出现活文本                    | 没有活祖先承载绑定（`node` 通道）                                  |

元素白名单**由核心真正注册的工厂推导**（`htmls` + `svgs`）：核心加了新标签，白名单自动跟上；
组件不会被误当元素。

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

## 7. 相关文档

- [`component-authoring.md`](component-authoring.md)：组件三种形态与第三方组件契约；
- [`ssr.md`](ssr.md)：序列化规范、hydrate 与收养既有 DOM；
- [`performance.md`](performance.md)：官方基准数字与档位结论；
- [`agents.md`](agents.md)：给 AI 助手的阅读顺序与纪律。
