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

| 类别       | API                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 节点类     | `ViewNode`、`ElementNode`、`HtmlElementNode`、`SvgElementNode`、`ComponentNode`、`TextNode`（`VTextNode`）                                     |
| 工厂与组合 | `vText`、`createElementFactory`、`registerChildFactories`、`applyElementOptions`、`normalizeChild`、`normalizeSetupArguments`、`resolveTarget` |
| 状态       | `vStateNode`                                                                                                                                   |
| 国际化     | `createI18n`、`I18nTextNode`、`i18nText`、`installI18nStringShortcut`                                                                          |

## 3. 三种组件形态

新组件应从下列三种形态中选择，避免在模板之外另起结构。

### 形态 A：薄工厂（无内部状态、纯配置化组合）

```js
import { vBadge } from 'yoya-ui/ui';

export function ServiceTag(options) {
  return vBadge(options);
}
```

### 形态 B：对象组件（常规独立组件，默认形态）

```js
import { vRate } from 'yoya-ui/ui';

export function RateCard() {
  const state = { value: 0 };

  return {
    render() {
      return vRate((rate) => {
        rate.value(state.value);
      });
    },
    value(next) {
      state.value = next;
      return this;
    }
  };
}
```

### 形态 C：类节点组件（父子嵌套、操作子实例或重写生命周期）

类节点组件必须同时导出成对 `vXxx` 工厂，并使用 `createElementFactory`：

```js
import { HtmlElementNode, createElementFactory } from 'yoya-ui/core';

export class VStatusDot extends HtmlElementNode {
  // 嵌套关系与细粒度操作
}

export function vStatusDot(first = null, second = null, third = null) {
  return createElementFactory('span', VStatusDot)(first, second, third);
}
```

> 注：标准工具包 `createComponentFactory` / `applyComponentArguments` / `themeValue` 目前位于库内 `src/components/shared.js`，后续将由公开入口导出；在此之前可按上述写法基于 `core` 公共 API 实现。

## 4. 命名与样式约定

- 基础 HTML 元素保持原生标签名：`button()`、`div()`、`input()`。
- 复合组件工厂统一 `v` 前缀（PascalCase）：`vButton`、`vCard`、`vStatusBadge`。
- **类名契约**（内置组件，由 `className-contract.test.js` 自动校验）：
  - 共享标记：所有组件根节点带 `yoya-component`。
  - 组件与部件类：`yoya-v<name>`（根，如 `yoya-vcard`）、`yoya-v<name>-<part>`（部件，如 `yoya-vcard-header`）、`yoya-v<name>--<modifier>`（修饰符，如 `yoya-vcarousel-arrow--prev`）。
  - 共享/工具类：`yoya-<feature>-<part>`（如 `yoya-layout`、`yoya-icon`、`yoya-control-clear`），仅用于不属于单一组件的能力。
  - 状态一律使用 kebab-case 的 `data-*` 属性（`data-variant`、`data-open`），类名不承载状态。
  - 动态类名仅允许 `yoya-v${name}-<part>` 与 `yoya-${kind}` 两种模板形态。
  - 组件预设规则必须从根类作用域书写（禁止孤儿部件选择器），保证替换根类后整棵子树与预设样式脱钩。
- 第三方组件建议使用自己的类名前缀（如 `acme-status-badge`），避免与内置样式冲突。
- 颜色、间距等样式优先使用主题变量 `var(--yoya-<token>, fallback)`，主题根为 `:root, [data-yoya-theme]`（见 `yoya.ui.css`）。

## 4.1 样式定制与主题

- 组件预设样式必须从根类作用域书写（`.yoya-v<name> ...`），并让用户可以通过 `replaceClassName('yoya-v<name>', 'my-class')` 剥离预设、用自定义 CSS 接管。
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

yoya-ui 没有自动响应式系统，状态变化后由组件自己决定就地更新哪些 DOM：

- 节点级：`registerStateAttrs` + `registerStateHandler` + `setState` / `getState`。
- 组件级：`vStateNode({ state, render, update })`；`update` 做局部 patch，返回 `true` 时全量重建。
- 区域级：`rebuildable(谓词?)` 把节点声明为「可重建区域」，`rerun()` 重新执行它自己的 setup。
- 组件可暴露状态 API（如 `value(next)`、`disabled(next)`），保持链式调用。

### 6.1 可重建区域

当一块内容需要「结构随数据变化」，而组件级状态容器又太重时，把它标记成区域：

```js
const data = { rows: [] };

const body = div((ele) => {
  ele.rebuildable(() => !isComposing); // 可选：时机谓词，为假时只刷值不重建
  ele.attr('data-count', () => String(data.rows.length)); // 零参闭包：从外部取值
  data.rows.forEach((row) => ele.addChild(row.id, div(row.name)));
});

body.rerun(); // 清空子节点 → 重跑 setup → 落地 DOM
```

契约与边界：

- 区域内容由它自己的 setup 产出；重跑会**清空子节点并重新执行 setup**，因此区域内不保留 DOM 身份——焦点、选区、内部滚动位置、挂在元素上的第三方实例都会重建。区域外的兄弟节点与其 DOM 不受影响。
- 谓词只表达「这次要不要花重建」：为假时只写回绑定值并记为待重建（`regionPending()`），结构保持原样。**数据条件请写进 setup**（区域在数据驱动下自会重建），不要当成内容开关。
- 区域内可以正常使用函数值绑定：重跑时旧绑定作废、新绑定立即生效，不会重复写回。带参形式 `(data) => value` 需要先声明数据来源 `dataSource(() => data)`；在 `vStateNode` 内部的区域默认继承宿主状态，无需声明。
- 声明顺序：先 `rebuildable()`，再写值函数与其它登记。
- 区域 setup 里**不要放一次性副作用**（第三方实例创建、请求、埋点）。状态处理器与 `bindDocumentEvent` / `bindWindowEvent` 由引擎在重跑前重置；定时器请用 `registerRegionCleanup(fn)` 登记，否则会随重跑叠加。
- 区域归属于最近的状态组件：`vStateNode` 内部的区域由该组件的状态变化自动触发；嵌套的状态组件自成边界，其内部区域由它自己管理。
- 绑定的数据来源是显式的：零参闭包从外部取值；带参值函数的数据来自 `dataSource()` 或宿主状态（系统按形参个数判断，`(s = {}) => …` 这类默认参数/剩余参数会被当作零参）。
- 需要保留焦点或第三方实例时，把该部分留在区域之外，或只用函数值绑定——它们是原地更新，不重建 DOM。

## 7. 组合、事件与生命周期

- `child(...)` 接受 `ViewNode`、组件对象（自动包装为 `ComponentNode` 并缓存其 `render()` 结果）或字符串/数字。
- `on(eventName, handler, options)` 绑定真实 DOM 事件，`destroy()` 时自动清理。
- 组件对象只要提供 `render()`（返回 `ViewNode`）即可被 `child()` 使用；类组件遵循 `renderDom` / `bindTo` / `destroy` 生命周期。

## 8. 注册父节点快捷方法

通过 `registerChildFactories` 将工厂注册到目标节点类，页面内即可使用 `page.vButton(...)` 写法；默认不覆盖既有方法：

```js
import { ViewNode, registerChildFactories } from 'yoya-ui/core';
import { vStatusBadge } from './status-badge.js';

registerChildFactories(ViewNode, { vStatusBadge });
```

## 9. 打包与发布建议

- 以独立 npm 包发布，将 `yoya-ui/core`（或 `yoya-ui/ui`）声明为 `peerDependencies`。
- 只导出公共工厂函数与必要类，按需提供 `.d.ts` 类型声明。
- 在包文档中声明组件清单与 `v` 前缀命名，避免与内置组件重名。

## 10. 测试建议

- 使用 Vitest + jsdom，从公共 API 断言：渲染 DOM、`toHTML()` 输出、事件触发、状态变化。
- 不测试私有字段与内部缓存；必要时用浏览器演示验证浮层定位等真实交互。
