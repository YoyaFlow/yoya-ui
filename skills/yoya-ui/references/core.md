# 基于 yoya-ui/core 开发第三方组件

`yoya-ui/core` 是零第三方依赖的组件标准，适合团队基于它开发自有组件库，与内置组件在同一视图树互操作。

## 公共 API

| 类别         | API                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 节点类       | `ViewNode`、`ElementNode`、`HtmlElementNode`、`SvgElementNode`、`ComponentNode`、`VTextNode`                                                     |
| 工厂与组合   | `vText`、`createElementFactory`、`registerChildFactories`、`applyElementOptions`、`normalizeChild`、`normalizeSetupArguments`、`resolveTarget`   |
| 状态         | `ref` / `computed`（Signals）                                                                                                                    |
| 更新与容错   | `keyed()`、`mountable()` / `isMounted()`、`whenFailed()`（ViewNode 方法）                                                                        |
| 节点内部集合 | `nodeChildren`、`appendNodeChild`、`EMPTY_CHILDREN`、`elementStyles`、`elementAttrs`、`elementClassNames`、`elementHasClass`（节点类型扩展专用） |
| 国际化       | `createI18n`、`I18nTextNode`、`i18nText`、`installI18nStringShortcut`                                                                            |

节点类型扩展（`class extends HtmlElementNode`，即组件的视图根 / 自定义元素种类）不要直接读写 `_children` / `_classText` / `_styles` / `_attrs`——它们是实现细节（空子节点列表是共享冻结哨兵，类名真身是文本，属性/样式快照按需创建）。追加子节点走 `child()` / `addChild()`；必须在自己的渲染路径里改名单时用 `nodeChildren()` / `appendNodeChild()`，读类名用 `elementHasClass()` / `elementClassNames()`，改样式/属性用 `elementStyles()` / `elementAttrs()`。

## vText 文本节点

`vText(content)` 创建动态文本节点，渲染为真实 Text 节点；`textContent(value)` 读写并原地更新 DOM，`toHTML()` 输出自动转义。它接受任意子节点位置，与字符串、i18n 文本节点自动归一。

```js
import { vText } from '@yoyaflow/yoya-ui/core';

const title = vText('默认标题');
title.textContent('新标题'); // 原地更新，无需重建视图
```

## SVG 节点与 svgs 工厂

SVG 子标签方法只注册在 `SvgElementNode` 上，HTML 父节点只认识 `svg`，顶层入口也只有 `svg` 一个标签工厂。需要**游离**的内部节点（还没有父节点、先建好再挂或复用）时用 `svgs` 命名空间，不必 `new SvgElementNode(...)`：

```js
import { svg, svgs, vText } from '@yoyaflow/yoya-ui/core';

const marker = svgs.circle((dot) => {
  dot.className('metric-point');
  dot.attr({ cx: 0, cy: 0, r: 4 });
});

const chart = svg((root) => {
  root.attr({ viewBox: '0 0 24 24' });
  root.child(marker); // 游离节点直接挂进树
  root.text((line) => {
    line.attr({ x: 12, y: 22 });
    line.child(vText('OK')); // <text> 里挂动态文本用 vText
  });
});
```

- `svgs` 覆盖 `svg` 与全部 SVG 子标签（`rect` / `circle` / `g` / `path` / `text` / `defs` / `linearGradient` …），键名就是标签名；`yoya-ui` 与 `yoya-ui/core` 都导出。
- 游离节点与父节点内部创建的节点能力完全一致：属性、样式、事件、`rebuildable()`、`child()` 都可用；已有父节点时继续用 `root.g(...)` 这类快捷方法更顺手。
- `text()` 在 SVG 容器上是「创建 `<text>` 子元素」，在 `<text>` / `<tspan>` / `<title>` 等文本宿主内部才表示文本内容：字符串、数字、信号句柄都可以直接写，`line.text(handle)` 与 `child(vText(handle))` 等价（都建立绑定，写入即更新文本）。

## 组件形态：A 与 B

**先定形态再写代码**：确认这个组件**没有额外行为**要定义（没有内部状态、没有对外命令方法、没有生命周期诉求）时，就用**形态 A 薄工厂**——函数直接返回节点，不要为了「以后可能要用」先包成对象组件；**演示代码与业务组件同一条判据**，只演示结构或交互、不需要对外命令方法时同样直接返回节点，不要为了跟对象组件统一而补一层 `render()`。只有真出现下列诉求时才升级，一次只走一步：

| 诉求                                                        | 形态                                        |
| ----------------------------------------------------------- | ------------------------------------------- |
| 纯配置化组合：无内部状态、无对外方法、无生命周期诉求        | A 薄工厂（函数直接返回 ViewNode）           |
| 有内部状态（`ref`）、要对外暴露命令方法、或需要生命周期钩子 | 形态 B：**vNode**（`vNode((api) => 视图)`） |

**组件只有这两种写法**。父子嵌套要操作子实例、要重写渲染 / 生命周期，也写在 vNode 里（命令 + `self.node()` + `whenMount` / `whenDestroy`）；`class Xxx extends HtmlElementNode` **不是组件写法**，它只是引擎内部的**节点类型扩展**（组件的视图根 / 自定义元素种类，见本文件末尾）。

**形态 A：薄工厂**（无内部状态、纯配置组合）

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

**不要写对象组件**（`return { render(), … }`）：**0.7 起运行期直接拒收**——`child(对象)` / 页面对象 /
`vClientOnly(() => 对象)` / 路由页面对象都会报错（同一个对象挂两处还会共用一份状态）。它的等价写法就是下面的 vNode。

**形态 B：`vNode((api) => 视图)`**（定义即节点）

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

- **产物是组件节点本身**（`ComponentNode extends ViewNode`）：当根 `card.bindTo('#app')`、当子节点 `page.child(card)` 都行；不产生占位/包装元素，setup 返回数组即多根 fragment。
- **命令方法收到 `api` 上**，工厂在返回前挂到节点本身；`api` 只收函数（非函数直接报错），**撞上节点已有成员（`child` / `destroy` / `renderDom` / `mountable` …）或 `render` / `_*` 直接抛错**，不静默覆盖。`api.whenFailed = (error, info) => 降级节点` 是例外：它声明组件自带的错误边界（等价 `node.whenFailed(fn)`，与组件对象协议成员同义）。其余节点级能力（`mountable()` / `rebuildable()`）直接链在返回的节点上。
- **只多一个入口，不改旧写法**：形态 A / vNode、函数工厂都照旧；没有对外命令方法的展示组件仍用形态 A。

**节点类型扩展（引擎内部，不是第三种组件写法）**

`class XxxNode extends HtmlElementNode` 仍然存在，但它是组件的**视图根 / 自定义元素种类**：元素机制（`renderDom` / `toHTML` / `child` 语义 / DOM 测量 / 事件绑定 / 生命周期）必须住在节点上。库内组件都是这个结构——对外只有一个句柄（vNode 组件节点），**节点类型不进包入口**，第三方不需要继承它；业务组件也不需要它（有行为就写 vNode 的命令与钩子）。

## 文件内分块：结构块也用函数组件

复杂组件需要分块定义结构时，文件内部的每一块也按函数组件组织：同一文件内声明、PascalCase 命名、输入走参数、产出 ViewNode。

规则、命名与示例见 [references/modules.md](modules.md) 的「组件函数命名与页面组合 → 结构块也用函数组件」。

## 命名与样式约定

- 基础 HTML 元素保持原生标签名；复合组件工厂统一 `v` 前缀（PascalCase）
- 身份：视图根写 `vn="VXxx"`（值 = 导出名），部件写自己的 `vn="VXxxPart"`，包装型共用根时写多值（`vn="VTimer VInput"`，空格分隔）；状态一律 kebab-case `data-*` 属性
- 类名**不再承载身份**：`yoya-component` / `yoya-v*` 两族**已退场**（`[vn]` 接管共享基规则，票 15 波 6 收口、基线清零）；跨组件能力类 `yoya-<feature>`（`yoya-icon`、`yoya-layout`、`yoya-control-clear`）保留
- 第三方组件用自有身份名（如 `acme-status-badge`）与自有类名前缀，避免与内置样式冲突
- 预设样式从身份作用域书写（`[vn~="VXxx"] …`），用户换掉身份或为同一作用域写自己的规则来接管；`replaceClassName` 只是管理自有类名的普通工具，不再"剥离预设"

## 文本与 i18n 契约

文案输入统一兼容四种写法（`child()`/`vText()` 自动归一）：原始字符串、`VTextNode`、`I18nTextNode`（语言切换原地更新）、`'文案'.s('key')`（需 `installI18nStringShortcut()`）。

## 状态与更新

yoya-ui 的状态模型就两条：**动态值**用内置 Signals（`const a = ref(0)`，值位置直接传句柄 `attr(key, a)` / `vText(a)` / `vInput({ value: a })`；派生用 `computed`），写入后绑定原地更新、DOM 不重建；**结构变化**用可重建区域（`rebuildable()` 之后读信号，信号变化自动按谓词重建）。组件可继续暴露链式 API（`value(next)`、`disabled(next)`）。

值位置**不要再包一层**：纯占位写 `vText(a)` / `attr('data-x', a)` / `child(a)` / 元素工厂 setup 位置的 `div(a)`，不要写 `computed(() => a.value)`（白包）或 `String(a.value)` / `a.value`（死快照）；`computed` 只留给拼接、运算、分支、多信号组合，`String()` 只在需要字符串语义（拼接、`'auto' | 'none'`）时用。节点级 `text()` 已移除（组件自己的 `text()` 与 SVG `<text>` 的 `text()` 不受影响）。

结构变化按代价分三档，都写在 setup 期：列表用 `keyed(rows, keyFn, build)`（同 key 且行引用未变复用节点、排序保身份），条件挂载用 `mountable(cond)`（为假脱离文档、为真按槽位回归，状态保留），整片换新用 `rebuildable()` 区域；子树出错用 `whenFailed(handler)` 兜底（返回节点降级替换、返回 null 仅上报）。

Signals 的句柄与绑定、区域依赖捕获与谓词门禁、keyed / mountable / whenFailed 用法、引擎契约与替换、多根 fragment、keyed 子节点与事件单槽的完整约定见 [references/state.md](state.md)。

## 组合、事件与生命周期

- `child(...)` 接受 ViewNode、组件（vNode / 薄工厂的返回值）或字符串/数字（对象组件已退场，传了直接报错）
- `on(event, handler)` 绑定真实 DOM 事件，`destroy()` 自动清理
- 视图根节点（含节点类型扩展）遵循 `renderDom` / `bindTo` / `destroy` 生命周期
- 组件自带降级：vNode 里写 `api.whenFailed = (error, info) => 降级节点`（等价 `node.whenFailed(fn)`），`ComponentNode` 自动挂载子树错误边界（`info.phase` = build / render / event / update）；边界在出错时沿父链上溯解析（就近优先），与声明顺序 / 嵌套深度 / 运行时插入 / 搬家无关

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
