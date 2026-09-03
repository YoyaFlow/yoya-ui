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
- 组件可暴露链式状态 API（`value(next)`、`disabled(next)`）

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
