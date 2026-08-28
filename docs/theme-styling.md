# yoya-ui 主题样式规范

> 本文档描述 yoya-ui 的主题、样式与定制契约，是组件样式开发的基准。
> 配套文档：[组件开发规格](component-development-spec.md)、[组件库开发规范（第三方开发者指南）](component-library-authoring.md)。

## 1. 设计定位

- **CSS 文件为主**：组件样式集中在 `yoya.ui.css`，按原生 HTML 开发方式书写；行内样式仅保留实例级参数。
- **小核心 = 标准**：核心只定义节点生命周期、属性快照、组件包装与状态机制，样式与主题全部由 token 与 CSS 契约承载。
- **每个预定义元素有自己的 className**：类名即"预设皮肤"的挂载点，用户可用 `replaceClassName` 剥离预设并用自己的 CSS 接管。
- **换肤是三维正交矩阵**：品牌主题（`data-yoya-theme`）× 明暗模式（`data-yoya-mode`）× 密度（`data-yoya-density`）。

## 2. 换肤维度

换肤不仅仅是颜色。yoya-ui 的 token 体系覆盖以下维度：

| 维度     | token 组                                                                                                  | 说明                                           |
| -------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 颜色     | `--yoya-color-*`、`--yoya-raw-*`                                                                          | 语义色 + 品牌色板派生（见 §3）                 |
| 间距     | `--yoya-space-{1..8}`                                                                                     | 4/8/12/16/24/32/48/64，紧凑模式整体收紧        |
| 字体排印 | `--yoya-font-family`、`--yoya-font-size-{xs,sm,base,lg,xl}`、`--yoya-font-weight-*`、`--yoya-line-height` | 字号比例尺、字重、行高                         |
| 控件尺寸 | `--yoya-control-height-{sm,md,lg}`                                                                        | 28/34/40 → 30/34/38 默认（按钮等）             |
| 圆角     | `--yoya-radius-{sm,md,lg}`                                                                                | 4/6/8                                          |
| 阴影     | `--yoya-shadow-{sm,md,lg}`                                                                                | 明暗双值（`light-dark`）                       |
| 动效     | `--yoya-motion-{fast,base,slow}`、`--yoya-ease-{in,out,in-out}`                                           | 时长 + 缓动；`prefers-reduced-motion` 全局降级 |
| 层级     | `--yoya-z-{dropdown,popover,overlay,toast}`                                                               | 浮层体系中 z-index 的唯一来源                  |
| 边框     | `--yoya-border-width`、`--yoya-border-width-strong`                                                       | 1px / 2px                                      |

## 3. token 体系

三层 token + 一个正交维度：

```
L1 原始色板 raw      @property 注册，仅品牌色（primary/success/danger/warning/info），供派生计算
L2 语义 token       组件与用户只消费这一层：颜色/文字/间距/尺寸/形状/阴影/动效/层级/边框
L3 组件级 token     默认派生自语义层，组件特殊值再扩展（预留）
正交维度            [data-yoya-density='compact'] 覆盖 space / control-height
```

- 原始色板通过 `@property` 注册为 `<color>` 并带 `inherits: true`，是 `color-mix()` 派生计算的输入。
- 品牌族变体（`hover`/`active`/`deep`/`subtle`/`active-subtle`/`border`/`ring`）由 `--yoya-raw-<brand>` 用 `color-mix()` 派生；**换肤只需覆盖一个 raw token，整个品牌族自动跟随**。

```css
@property --yoya-raw-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #2563eb;
}
--yoya-color-primary: light-dark(
  var(--yoya-raw-primary),
  color-mix(in srgb, var(--yoya-raw-primary), white 16%)
);
--yoya-color-primary-hover: light-dark(
  color-mix(in srgb, var(--yoya-raw-primary), black 12%),
  color-mix(in srgb, var(--yoya-raw-primary), white 28%)
);
--yoya-color-primary-ring: color-mix(in srgb, var(--yoya-raw-primary) 30%, transparent);
```

- 中性色（背景/文字/边框/代码）与阴影使用 `light-dark(浅色值, 深色值)` 单定义，一份文件同时表达两种模式。

## 4. 明暗模式（一套 CSS 文件支持两种模式）

模式由 `color-scheme` 驱动，`light-dark()` 依据元素的 `color-scheme` 自动取浅/深值：

```css
:root {
  color-scheme: light;
}
[data-yoya-mode='light'] {
  color-scheme: light;
}
[data-yoya-mode='dark'] {
  color-scheme: dark;
}
[data-yoya-mode='system'] {
  color-scheme: light dark;
}
```

- 默认（无属性）为浅色，与历史行为一致；`dark` 强制深色；`system` 跟随操作系统。
- 不依赖 `prefers-color-scheme` 媒体查询复制 token，不存在重复的暗色定义块。
- 品牌主题 `[data-yoya-theme]` 只覆盖 raw token，浅/深自动派生跟随。

## 5. 密度模式

`[data-yoya-density='compact']` 覆盖空间与控件尺寸 token，与品牌主题、明暗模式自由组合：

```css
[data-yoya-density='compact'] {
  --yoya-space-3: 10px;
  --yoya-control-height-md: 30px;
  /* … */
}
```

组件只有消费 space / control token（而不是硬编码 px）才会响应密度切换。

## 6. 定制阶梯

| 层级 | 定制口                    | 手段                                                                     |
| ---- | ------------------------- | ------------------------------------------------------------------------ |
| L0   | token 覆盖（全局/作用域） | 重定义 `--yoya-*`，或在任意容器上局部重定义实现局部换肤                  |
| L0.5 | 剥离预设皮肤              | `replaceClassName(old, next, tolerate)` + 用户自己的 CSS 文件            |
| L2   | 微调覆盖                  | 库规则在 `@layer yoya` 内且基础规则用 `:where()`，未分层用户规则天然优先 |
| L3   | 实例级                    | 行内 `styles()` / `style()`                                              |
| L4   | 业务钩子                  | `className('my-x')` 追加自定义类                                         |
| L5   | 组件 API                  | `type/size/disabled/…`，禁止用 CSS 硬改组件变体                          |
| L6   | 完全替换                  | 按标准自建/包装组件                                                      |

### replaceClassName

`ElementNode.replaceClassName(old, next, tolerate = false)`：

- `old` 存在：移除 `old`，加入 `next`（支持空格分隔多个类），DOM 即时同步；
- `old` 不存在：`tolerate = false`（默认）为无操作；`tolerate = true` 直接添加 `next`；
- `old === next`：无操作；返回 `this` 支持链式。

```js
vCard((card) => card.replaceClassName('yoya-vcard', 'acme-card'));
```

预设样式全部从根类作用域书写（无孤儿部件选择器），因此替换根类后整棵子树与预设样式脱钩。

## 7. className 契约

- 共享标记：所有组件根节点带 `yoya-component`。
- 组件与部件类：`yoya-v<name>`、`yoya-v<name>-<part>`、`yoya-v<name>--<modifier>`。
- 共享/工具类：`yoya-<feature>-<part>`（如 `yoya-icon`、`yoya-control-clear`）。
- 状态一律 kebab-case 的 `data-*` 属性，类名不承载状态。
- 动态类名仅允许 `yoya-v${name}-<part>` 与 `yoya-${kind}` 两种模板形态。
- 由 `src/className-contract.test.js` 与 `src/preset-scope.test.js` 自动校验。

### 主题切换 JS API（可选）

纯 CSS 已支持模式切换；需要编程控制、持久化或在 system 模式下感知系统偏好时，使用核心导出的轻量 API（零依赖）：

```js
import {
  setYoyaMode,
  getYoyaMode,
  resolveYoyaMode,
  setYoyaTheme,
  getYoyaTheme,
  initYoyaTheme
} from 'yoya-ui/core';

setYoyaMode('dark'); // data-yoya-mode="dark"
setYoyaMode('system', { persist: true }); // 持久化，下次 initYoyaTheme() 自动恢复
resolveYoyaMode(); // 'light' | 'dark'（system 时按系统偏好解析）
setYoyaTheme('violet'); // data-yoya-theme="violet"
initYoyaTheme({ persist: true }); // 恢复上次选择的 mode / theme
```

## 8. 层叠与覆盖保障

- 组件规则统一放在 `@layer yoya` 内，未分层（用户）规则天然优先，无需 `!important`。
- 基础根规则使用 `:where()` 降特异度。
- token 与模式/密度块留在层外（`@layer yoya;` 之前），保证用户 token 覆盖优先。

## 9. SSR 与集成

- 行内样式输出 `var(--yoya-*, fallback)`，可随 `toHTML()` 序列化，浏览器端解析；消费端 token 名保持不变。
- 使用方需链接 `yoya.ui.css` 作为皮肤契约；不引入 CSS 运行时注入。

## 10. 契约测试

- `src/css-contract.test.js`：组件 class / 状态钩子的静态 CSS 规则覆盖。
- `src/className-contract.test.js`：类名命名族、动态模板、`data-*` kebab 校验。
- `src/preset-scope.test.js`：预设规则根类作用域（无孤儿选择器）。
- `src/cascade-layer.test.js`：`@layer yoya` 层结构。
- `src/theme-tokens.test.js`：raw 色板、变体派生、单定义、模式/密度开关、token 名稳定。
