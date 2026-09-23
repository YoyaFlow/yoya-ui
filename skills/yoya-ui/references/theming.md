# 主题与样式定制

使用方需引入 `dist/yoya.ui.css`（组件皮肤契约；行内样式输出 `var(--yoya-*, fallback)` 可随 `toHTML()` 序列化，无运行时 CSS 注入）。

## token 维度

| 维度     | token                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| 颜色     | `--yoya-color-*`、`--yoya-raw-*`（语义色 + 品牌 raw 色板）                                                |
| 间距     | `--yoya-space-{1..8}`（4/8/12/16/24/32/48/64）                                                            |
| 字体     | `--yoya-font-family`、`--yoya-font-size-{xs,sm,base,lg,xl}`、`--yoya-font-weight-*`、`--yoya-line-height` |
| 控件尺寸 | `--yoya-control-height-{sm,md,lg}`（默认 30/34/38，compact 26/30/34）                                     |
| 圆角     | `--yoya-radius-{sm,md,lg}`（4/6/8）                                                                       |
| 阴影     | `--yoya-shadow-{sm,md,lg}`（明暗双值）                                                                    |
| 动效     | `--yoya-motion-{fast,base,slow}`、`--yoya-ease-{in,out,in-out}`                                           |
| 层级     | `--yoya-z-{dropdown,popover,overlay,toast}`                                                               |
| 边框     | `--yoya-border-width`、`--yoya-border-width-strong`                                                       |

## 换肤机制

- **三层 token**：L1 raw 色板（仅品牌色，`@property` 注册，供 `color-mix()` 派生）→ L2 语义 token（组件消费层）→ L3 组件级 token。**换肤只需覆盖一个 raw token，整个品牌族自动跟随**
- **明暗**：`data-yoya-mode="light|dark|system"` 切换 `color-scheme`，token 用 `light-dark()` 单定义；页面级模式/密度要设置在 `documentElement` 上
- **密度**：`data-yoya-density="compact"` 覆盖 space/control-height token
- **品牌主题**：`data-yoya-theme="..."` 只覆盖 raw token

## 定制阶梯（按优先级）

| 层级 | 手段                                                                       |
| ---- | -------------------------------------------------------------------------- |
| L0   | 全局覆盖 `--yoya-*` token（整站换肤）                                      |
| L1   | 任意容器局部重定义 `--yoya-*`（局部换肤）                                  |
| L2   | 为身份作用域写自己的规则（`[vn~="VXxx"] …`），或换掉身份让整棵子树脱离预设 |
| L3   | 未分层用户规则天然优先（库规则在 `@layer yoya` 内、基础规则用 `:where()`） |
| L4   | 实例级 `node.styles(...)`                                                  |
| L5   | `className('my-x')` 追加自定义类                                           |
| L6   | 组件 API（`variant`/`size`/`disabled`），不用 CSS 硬改变体                 |

`replaceClassName(old, next, tolerate = false)`：`old` 存在则替换（支持多类空格分隔）；不存在时 `tolerate=true` 才添加。身份不再挂在类名上（见下方「身份契约」），所以它现在只是管理**自有类名**的普通工具，不再"剥离预设"。

## 主题切换 JS API（可选）

```js
import { setYoyaMode, resolveYoyaMode, setYoyaTheme, initYoyaTheme } from '@yoyaflow/yoya-ui/core';

setYoyaMode('dark'); // data-yoya-mode="dark"
setYoyaMode('system', { persist: true });
resolveYoyaMode(); // 'light' | 'dark'
setYoyaTheme('violet'); // data-yoya-theme="violet"
initYoyaTheme({ persist: true }); // 恢复上次 mode/theme
```

## 身份契约

组件身份写在视图根的 `vn` 属性上（`vn="VXxx"`，多值空格分隔），部件的身份同样写在结构里（`vn="VXxxPart"`）；**预设样式一律从身份作用域书写**（`[vn~="VXxx"] …`，无孤儿部件选择器），所以换掉身份就一次性脱钩。旧的 `yoya-component` / `yoya-v*` 类名**已退场**（票 15 波 6 收口，基线清零）；跨组件能力类 `yoya-<feature>`（`yoya-icon`、`yoya-layout`、`yoya-control-clear`）保留。状态一律 kebab-case `data-*` 属性，类名不承载状态。

## 页面壳

`vBody` 是页面级主题化接入点（背景/文字/字体），`vThemeShell` 是区域级容器（surface 背景/边框/圆角），均消费 token，明暗/品牌/密度切换自动跟随。
