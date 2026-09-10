# 基于 yoya-ui/core 开发第三方组件

`yoya-ui/core` 是零第三方依赖的组件标准，适合团队基于它开发自有组件库，与内置组件在同一视图树互操作。

## 公共 API

| 类别       | API                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 节点类     | `ViewNode`、`ElementNode`、`HtmlElementNode`、`SvgElementNode`、`ComponentNode`、`VTextNode`                                                   |
| 工厂与组合 | `vText`、`createElementFactory`、`registerChildFactories`、`applyElementOptions`、`normalizeChild`、`normalizeSetupArguments`、`resolveTarget` |
| 状态       | `vStateNode`                                                                                                                                   |
| 国际化     | `createI18n`、`I18nTextNode`、`i18nText`、`installI18nStringShortcut`                                                                          |

## vText 文本节点

`vText(content)` 创建动态文本节点，渲染为真实 Text 节点；`textContent(value)` 读写并原地更新 DOM，`toHTML()` 输出自动转义。它接受任意子节点位置，与字符串、i18n 文本节点自动归一。

```js
import { vText } from '@yoyaflow/yoya-ui/core';

const title = vText('默认标题');
title.textContent('新标题'); // 原地更新，无需重建视图
```

## 三种组件形态

**形态 A：薄工厂**（无内部状态、纯配置组合）

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

**形态 B：对象组件**（常规默认形态，返回 `{ render() }`）

```js
import { vRate } from '@yoyaflow/yoya-ui/ui';

export function RateCard() {
  const state = { value: 0 };
  return {
    render() {
      return vRate((rate) => rate.value(state.value));
    },
    value(next) {
      state.value = next;
      return this;
    }
  };
}
```

**形态 C：类节点组件**（父子嵌套或重写生命周期，需导出成对 `vXxx` 工厂）

```js
import { HtmlElementNode, createElementFactory } from '@yoyaflow/yoya-ui/core';

export class VStatusDot extends HtmlElementNode {
  // 细粒度生命周期与子实例操作
}

export function vStatusDot(first = null, second = null, third = null) {
  return createElementFactory('span', VStatusDot)(first, second, third);
}
```

## 文件内分块：结构块也用函数组件

复杂组件的结构不要在一个 render 里用条件分支和匿名片段堆出来：把每一块抽成**同一文件内的函数组件**，在 render 里组合。整棵树看上去应当是一层层组件拼起来的，而不是一段过程式布局代码。

```js
// 块组件：PascalCase 命名并描述 UI 单元；输入显式，产出 ViewNode
function FilterBar({ keyword, onInput }) {
  return div((bar) => {
    bar.className('acme-member-filter');
    bar.vInput((input) => {
      input.value(keyword);
      input.on('input', (event) => onInput(event.target.value));
    });
  });
}

function MemberRow({ row }) {
  return vTr((tr) => {
    tr.td(row.name);
    tr.td(row.role);
  });
}

export function MemberTable({ state, onFilter }) {
  return vTable((table) => {
    table.child(FilterBar({ keyword: state.keyword, onInput: onFilter }));
    table.vTbody((body) => {
      if (state.rows.length === 0) {
        body.vTr((tr) => tr.td('暂无数据'));
        return;
      }

      state.rows.forEach((row) => body.addChild(row.id, MemberRow({ row })));
    });
  });
}
```

- 块组件用与导出组件同一套形态（形态 A 直接返回 ViewNode，或形态 B 返回 `{ render() }`），只是作用域留在文件内；不要用匿名箭头函数或 `renderTop` / `BlockA` 这类位置式命名。
- 输入走参数（`MemberRow({ row })`），需要回写时把回调一起传进去；不要在块组件里隐式读取外层状态——这样它才能独立阅读、单独替换，必要时直接提升为可复用组件。
- 一个块只负责自己那块的 DOM；跨块共享的状态、格式化与样式 token 放在模块级 helper 或组件入口，别让子块去访问父块内部。
- 深度以读得懂为界：2–3 层通常足够；更深时先问「这一层该不该独立成组件（或拆文件）」。

## 命名与样式约定

- 基础 HTML 元素保持原生标签名；复合组件工厂统一 `v` 前缀（PascalCase）
- 类名：根 `yoya-component yoya-v<name>`，部件 `yoya-v<name>-<part>`，修饰符 `yoya-v<name>--<modifier>`；状态一律 kebab-case `data-*` 属性
- 第三方组件建议用自有类名前缀（如 `acme-status-badge`）避免与内置样式冲突
- 预设样式从根类作用域书写，允许用户 `replaceClassName` 剥离后用自定义 CSS 接管

## 文本与 i18n 契约

文案输入统一兼容四种写法（`child()`/`vText()` 自动归一）：原始字符串、`VTextNode`、`I18nTextNode`（语言切换原地更新）、`'文案'.s('key')`（需 `installI18nStringShortcut()`）。

## 状态与更新

yoya-ui 没有自动响应式系统，状态变化后由组件决定就地更新：

- 节点级：`registerStateAttrs` + `registerStateHandler` + `setState`/`getState`
- 组件级：`vStateNode({ state, render, update })`，`update` 局部 patch，返回 `true` 时全量重建
- 区域级：`rebuildable(谓词?)` 声明可重建区域，`rerun()` 清空子节点并重跑它自己的 setup；
  区域内不保留 DOM 身份（焦点/滚动/第三方实例会重建），区域外不受影响；谓词为假时只刷绑定值并记为待重建；
  带参值函数需 `dataSource(() => data)`（组件内的区域默认继承宿主状态）
- 组件可暴露链式状态 API（`value(next)`、`disabled(next)`）

## 可重建区域（rebuildable / rerun）

一块内容需要「结构随数据变化」、又不值得包一个状态组件时，把它声明成区域：内容由该节点自己的 setup 产出，
重跑就是清空子节点再重跑这份 setup。

```js
const data = { rows: [] };

const body = div((ele) => {
  ele.rebuildable(() => !isBusy); // 可选：时机谓词，为假时只刷值、不重建结构
  ele.dataSource(() => data); // 可选：带参值函数的数据来源
  ele.attr('data-count', (d) => String(d.rows.length));
  data.rows.forEach((row) => ele.addChild(row.id, div(row.name)));
});

body.rerun(); // 重建：清空子节点 → 重跑 setup → 落地 DOM
body.rerun({ force: true }); // 越过谓词强制重建
body.regionPending(); // 是否有被谓词推迟的重建
```

- 区域内不保留 DOM 身份（焦点、选区、内部滚动、第三方实例都会重建），区域外的兄弟节点不受影响；
  要保住焦点就把那块留在区域外，或用函数值绑定。
- 谓词只回答「这次要不要花重建」：为假时只写回函数值绑定并记 `regionPending()`，结构不动；
  数据条件要写进 setup，不要用谓词当内容开关。
- 声明顺序：先 `rebuildable()`，再写值函数与其它登记。
- 区域节点的子节点只能由 builder 产出：在 builder 之外对它 `child()` / `addChild()` 会直接报错。
- 不要在区域 setup 里放一次性副作用（第三方实例、请求、埋点）；状态处理器与
  `bindDocumentEvent` / `bindWindowEvent` 会在重跑时由引擎重置，定时器用 `registerRegionCleanup(fn)` 登记。
- 数据来源显式：零参闭包从外部取值；带参 `(data) => value` 需要 `dataSource()`，
  在 `vStateNode` 内默认继承宿主状态（按形参个数判断，`(s = {}) => …` 视为零参）。
- 触发：区域归属于最近的状态组件，`setState` 时自动按谓词处理；没有状态容器时由调用方 `rerun()` 驱动，
  谓词为假之后可用 `regionPending()` 决定是否补一次重建。
- 嵌套：区域里可以再声明区域（父区域只刷值时，子区域仍会评估自己的谓词）；
  嵌套的状态组件自成边界，其内部区域由它自己管理。

## 组合、事件与生命周期

- `child(...)` 接受 ViewNode、组件对象（自动包 `ComponentNode` 缓存 render 结果）或字符串/数字
- `on(event, handler)` 绑定真实 DOM 事件，`destroy()` 自动清理
- 类组件遵循 `renderDom` / `bindTo` / `destroy` 生命周期

## 注册父节点快捷方法

```js
import { ViewNode, registerChildFactories } from '@yoyaflow/yoya-ui/core';
import { vStatusBadge } from './status-badge.js';

registerChildFactories(ViewNode, { vStatusBadge }); // 页面内 page.vStatusBadge(...)
```

默认不覆盖既有方法。

## 打包与发布建议

- 以独立 npm 包发布，把 `yoya-ui/core`（或 `yoya-ui/ui`）声明为 `peerDependencies`
- 只导出公共工厂与必要类，附 `.d.ts` 类型声明
- 文档声明组件清单与 `v` 前缀命名，避免与内置组件重名
