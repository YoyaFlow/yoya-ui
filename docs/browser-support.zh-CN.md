# yoya-ui 浏览器基线与降级口径

> 本文写清 yoya-ui 支持到哪一档浏览器、低于这一档会发生什么、以及**要支持更老的浏览器时怎么自己接**。
> 相关文档：[主题规范](theme.zh-CN.md) · [组件创作指南](component-authoring.zh-CN.md) · [文档索引](index.zh-CN.md)。

## 1. 基线

| 引擎                | 最低版本 | 约发布时间 |
| ------------------- | -------- | ---------- |
| Chrome / Edge       | **123**  | 2024-03    |
| Firefox             | **120**  | 2023-11    |
| Safari / iOS Safari | **17.5** | 2024-05    |

机器可读的同一组下限写在包元数据的 `browserslist` 字段里，消费方的构建工具（自动前缀、目标降级）可以直接读它对齐。

**「支持」的口径**：在这一档以上，主题色、预设皮肤与全部组件行为按设计工作，`npm test` 里定义的可观察行为一致。
低于这一档**不是「报错」，而是降级**——见 §3、§4。

## 2. 这条线由什么决定

它由**主题色层依赖的两个 CSS 颜色函数**决定，而不是由 JS 决定：

| 特性              | Chrome/Edge | Firefox | Safari/iOS | 说明                                  |
| ----------------- | ----------- | ------- | ---------- | ------------------------------------- |
| `light-dark()`    | 123         | 120     | 17.5       | **硬线**：整套主题色由它驱动          |
| `color-mix()`     | 111         | 113     | 16.2       | 品牌色派生（hover / subtle / ring）   |
| `@layer`          | 99          | 97      | 15.4       | 预设皮肤整块放在一个 cascade layer 里 |
| `@property`       | 85          | 128     | 16.4       | 原始品牌色注册（缺了仍会继承）        |
| `scrollbar-width` | 121         | 64      | 18.2       | 少数区域隐藏滚动条                    |

**JS 侧不是约束**：产物保留 `?.` / `??` / `??=` / `Array.prototype.at` 等写法，最低要求约在 Safari 15.4 / Firefox 79 / Chrome 80 一档，明显低于 CSS 硬线；
可选浏览器 API（`IntersectionObserver` / `ResizeObserver` / `dialog.showModal` / `element.animate` / `navigator.clipboard`）都带能力检测与退化分支。
发行形态是**原生 ES Module**（无 UMD / IIFE / legacy 产物、不带 polyfill）：不支持原生模块的浏览器（如 IE11）不在支持范围内。

**这条线不等于「Safari 的问题」**：三个引擎都有窗口——Chrome/Edge 111–122、Firefox 113–119、Safari/iOS 16.2–17.4 都会遇到同一件事（有 `color-mix()`、没有 `light-dark()`）。
Safari 只是因为更新被系统版本锁住，**受害人群最大、持续时间最长**，所以在报告里总是它先暴露出来。

## 3. 低于基线会发生什么（降级台账）

| 能力 / 特性                       | 缺它的引擎                                       | 后果                                     | 现状                                 |
| --------------------------------- | ------------------------------------------------ | ---------------------------------------- | ------------------------------------ |
| `light-dark()`                    | Chrome/Edge <123、Firefox <120、Safari/iOS <17.5 | 整套颜色 token 在替换时非法 → 主题色全丢 | **已兜底**：纯值 token 层（见 §4）   |
| `color-mix()`（颜色 token）       | Chrome/Edge <111、Firefox <113、Safari/iOS <16.2 | 品牌派生色失效                           | **已兜底**（同一层）                 |
| `color-mix()`（主题壳背景透明度） | 同上                                             | `backgroundOpacity()` 失效               | **已兜底**：退回不透明基色，背景不丢 |
| `@layer`                          | Chrome/Edge <99、Firefox <97、Safari/iOS <15.4   | 预设皮肤**整块**不生效（组件变成无样式） | 不兜底：这一档低于其它所有线         |
| `@property`                       | Firefox <128                                     | 原始品牌色未注册（值仍正常继承）         | 不兜底（软降级）                     |
| `scrollbar-width`                 | Safari/iOS <18.2                                 | 个别滚动区域露出滚动条                   | 不兜底（纯外观）                     |
| 虚拟模式下的外壳透明度            | 与 `color-mix()` 同档                            | 透明度失效，该处背景退成透明             | **未兜底**（见 §4 末条）             |
| 原生 ES Module                    | IE11 等                                          | 无法加载库                               | 明确不支持                           |

除上表之外，预设皮肤用到的其它特性（`clamp()` / `dvh` / `:focus-visible` / `overscroll-behavior` / `accent-color` / `color-scheme`）要求都更低，
所以在「支持 `@layer`、不支持 `light-dark()`」这一档里，界面是**完整的、只是配色回到纯值兜底**。

## 4. 兜底是怎么做的

- **颜色 token 兜底层**：预设皮肤里用
  `@supports not ((color: light-dark(…)) and (color: color-mix(…)))` 包住一份**纯值** token 表，
  键集与主层里依赖这两个函数的 token **逐个相等**——新增 token 忘了补兜底，`packages/yoya-ui/src/testing/gates/theme-tokens.test.js` 会当场红。
  块内三个模式块：浅色、`[data-yoya-mode='dark']`、以及 `system` 的夜间（`@media (prefers-color-scheme: dark)`）。
- **不要把 `var(--token, 兜底)` 当成降级手段**：CSS 变量的 fallback **只在变量未被定义时**生效。
  这里的 token 是被定义了的（只是值在替换时才非法），所以那些 fallback 一次都不会被采用——库内 JS 侧有 140 多处行内样式、
  CSS 侧有 370 多处取值是这个写法，它们的正确性**依赖 token 层本身有兜底**。
- **品牌色覆写在低基线浏览器里不生效**：兜底层是打包时按**默认调色板**烘焙出来的纯值。
  之所以不跟随 `--yoya-raw-*` 覆写：跟随会让基色跟着改、派生色留在默认品牌，得到「红按钮 + 蓝 hover」这种视觉断裂；
  烘焙默认调色板至少是自洽的。需要品牌色的老浏览器场景见 §5。
- **分层现状（记录，不是改动）**：预设皮肤整块放在 `@layer yoya` 里，所以消费方样式不必打特异性战争（§3 的 `@layer` 悬崖也由此而来）。
  但 **`prefers-reduced-motion` 的两个块与 `split-panel` 的规则刻意留在 layer 之外**——它们必须能压过 layer 内的规则；
  改动皮肤时不要顺手把它们挪进 layer。

## 5. 要支持更老的浏览器怎么办

库的兜底层已经是安全网（背景、文字、边框、品牌色在基线以下仍然可读）。要做得比它更好，只需要**在库的样式表之后**补一份自己的纯值层——
后引入的同名声明按源码顺序生效，你不必把 100 多个 token 写全，只写你要改的那些：

```html
<link rel="stylesheet" href="…/@yoyaflow/yoya-ui/dist/yoya.ui.css" />
<link rel="stylesheet" href="./my-legacy-tokens.css" />
```

```css
/* my-legacy-tokens.css —— 给低基线浏览器一份按自己品牌调好的纯值层 */
@supports not ((color: light-dark(#000, #fff)) and (color: color-mix(in srgb, #fff, #000))) {
  :root {
    --yoya-color-bg: #f9f9f9;
    --yoya-color-surface: #ffffff;
    --yoya-color-text: #0d0d0d;
    --yoya-color-border: #e5e5e5;
    --yoya-color-primary: #b3261e; /* 自己的品牌色 */
    --yoya-color-primary-hover: #93180f; /* 派生色要一起给，否则会落回库的默认品牌 */
    /* 其余 token 交给库的兜底层 */
  }

  [data-yoya-mode='dark'] {
    --yoya-color-bg: #171717;
    --yoya-color-surface: #212121;
    --yoya-color-text: #ececec;
    --yoya-color-border: #3c3c3c;
    --yoya-color-primary: #d9645c;
  }
}
```

两条经验：**派生色要和基色一起给**（只改 `--yoya-raw-*` 在基线以下不起作用）；**配色自洽比凑齐更重要**（少几个 token 只是少了点层次，给错值会看起来是坏的）。

## 6. 怎么自己检查

在浏览器控制台跑一句能力探测，就知道当前浏览器走的是主层还是兜底层：

```js
CSS.supports('color', 'light-dark(#000, #fff)') &&
  CSS.supports('color', 'color-mix(in srgb, red, blue)');
// true = 主层；false = 兜底层（主题仍然可读，只是配色走纯值）
```

看观感就直接打开 `dist/examples/` 里的演示页，切换 `data-yoya-mode` 的 light / dark / system：三个模式都不该出现「背景透明、文字变默认黑」。

仓库侧，这条线由三处守着：`package.json` 的 `browserslist`（声明）、`packages/yoya-ui/src/testing/gates/theme-tokens.test.js`（兜底层键集与纯值不变量）、
`packages/yoya-ui/src/testing/gates/css-contract.test.js`（主题壳的合成规则与它的兜底规则）。

## 7. 基线怎么往上抬

抬基线是一次**有意的收紧**，按同一个顺序走三步：改这里的最低版本与 `browserslist` → 调整兜底层的 `@supports` 条件与键集 → 更新契约用例。
反过来，想**扩大**支持范围（往低走）就要同时给出兜底，否则会把「静默失效」重新引入。

## 8. 证据与验证记录（归档）

**版本号的来源**：`@mdn/browser-compat-data` 8.1.2（2026-09-24 取数），关键项与 `caniuse-lite` 交叉核对过；
表里的数字是**该特性首次可用**的版本（不含前缀、不靠 flag）。引擎窗口（§2 末）也是同一次审计的产物。

**用量口径**（同一份源码实测）：主层里依赖 `light-dark()` / `color-mix()` 的颜色 token 共 **69 个**（兜底层逐一对齐，由契约用例强制）；
预设皮肤里 `var(--yoya-color-*)` 取值 **378 处**；JS 侧行内 `var(--yoya-token, 兜底)` 写法 **142 处**（helper 调用 173 处）。

**真机验证记录**（无头 Edge 152，逐 token 读**计算样式**、颜色经 canvas 归一后比对；2026-09-24）：

| 检查         | 方法                                                                  | 结果                                 |
| ------------ | --------------------------------------------------------------------- | ------------------------------------ |
| 主层无回归   | 改动前的样式表 vs 改动后，浅色 / 深色逐 token                         | 69/69、69/69 一致                    |
| 兜底层等价   | 反向强开 `@supports not (…)` 让兜底层生效，再与主层逐 token           | 全部一致（1 处 `.5` 边界取整差 ±1）  |
| 主题壳透明度 | 真实组件渲染后读计算背景：半透明 / 100% / 自定义基色 / 深色跟随 token | 四条正确；强制兜底四条退成不透明基色 |

复跑的最小做法就是 §6：一句能力探测判断当前浏览器走哪条分支，再打开 `dist/examples/` 的演示页切一遍 light / dark / system。
仓库侧的不变量由三处守着（`browserslist`、`packages/yoya-ui/src/testing/gates/theme-tokens.test.js`、`packages/yoya-ui/src/testing/gates/css-contract.test.js`），其中
`css-contract` 里那条「每条 `scrollbar-width: none` 都要有 `::-webkit-scrollbar` 配对」就是这次收尾补上的。
