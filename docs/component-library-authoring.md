# 组件库开发规范（第三方开发者指南）

> 适用对象：希望基于 yoya-ui 标准开发自有组件库的团队或个人。
> 相关文档：[组件开发规格](component-development-spec.md)、[项目 README](../README.md)。

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
- CSS 类名：内置组件使用 `yoya-<kebab-case>`；第三方组件建议使用自己的前缀（如 `acme-status-badge`），避免与内置样式冲突。
- 颜色、间距等样式优先使用主题变量 `var(--yoya-<token>, fallback)`，主题根为 `:root, [data-yoya-theme]`（见 `yoya.ui.css`）。

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
- 组件可暴露状态 API（如 `value(next)`、`disabled(next)`），保持链式调用。

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
