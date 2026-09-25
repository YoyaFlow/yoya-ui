# yoya-ui 主题样式规范

> 本文档描述 yoya-ui 的主题、样式与定制契约，是组件样式开发的基准。
> 配套文档：[组件开发指南](component-authoring.zh-CN.md)、[文档首页](index.zh-CN.md)。

## 1. 设计定位

- **CSS 文件为主**：组件样式集中在 `yoya.ui.css`，按原生 HTML 开发方式书写；行内样式仅保留实例级参数。
- **小核心 = 标准**：核心只定义节点生命周期、属性快照、组件包装与状态机制，样式与主题全部由 token 与 CSS 契约承载。
- **每个预定义组件带自己的身份属性**：预设皮肤挂在 `[vn="VXxx"]` 上（这就是挂载点），用户通过**换掉身份**或**为同一作用域写自己的规则**来接管（见 §6 / §7）。
- **换肤是三维正交矩阵**：品牌主题（`data-yoya-theme`）× 明暗模式（`data-yoya-mode`）× 密度（`data-yoya-density`）。

## 2. 换肤维度

换肤不仅仅是颜色。yoya-ui 的 token 体系覆盖以下维度：

| 维度     | token 组                                                                                                  | 说明                                           |
| -------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 颜色     | `--yoya-color-*`、`--yoya-raw-*`                                                                          | 语义色 + 品牌色板派生（见 §3）                 |
| 间距     | `--yoya-space-{1..8}`                                                                                     | 4/8/12/16/24/32/48/64，紧凑模式整体收紧        |
| 字体排印 | `--yoya-font-family`、`--yoya-font-size-{xs,sm,base,lg,xl}`、`--yoya-font-weight-*`、`--yoya-line-height` | 字号比例尺、字重、行高                         |
| 控件尺寸 | `--yoya-control-height-{sm,md,lg}`                                                                        | 30/34/38 默认；compact 26/30/34                |
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
- 页面级模式/密度切换需将 `data-yoya-mode` / `data-yoya-density` 设置在 `documentElement`（token 在 `:root` 解析后继承）；局部容器上的属性只改变该容器自身的 `color-scheme`，不会为该容器重新着色。

## 5. 密度模式

`[data-yoya-density='compact']` 覆盖空间与控件尺寸 token，与品牌主题、明暗模式自由组合：

```css
[data-yoya-density='compact'] {
  --yoya-space-3: 10px;
  --yoya-control-height-md: 30px;
  /* … */
}
```

组件只有消费 space / control token（而不是硬编码 px）才会响应密度切换。vButton 尺寸与 vTable 单元格/表头间距已迁移为 token 消费（间距归一化到 4px 刻度）。

## 5.1 页面壳 vBody

`vBody` 是页面级主题化的接入点：出厂即消费主题 token（背景 `--yoya-color-bg`、文字 `--yoya-color-text`、`--yoya-font-family`、`--yoya-font-size`、`--yoya-line-height`），明暗/品牌/密度切换时页面壳自动跟随，无需页面自行定义 body 级样式。 区域级"面"由提供它的组件自己负责——`vCard` 是样板：背景（`--yoya-color-surface`）、边框（`--yoya-color-border`）与圆角写在皮肤的 `[vn~='VCard']` 规则里，单个实例通过该组件的 API 或行内 `styles()` 调整。想要同样观感的普通盒子，就为自己的身份写一条面规则（或用实例样式），不需要再去拿一个专门的"外壳容器"。

```js
import { vBody } from '@yoyaflow/yoya-ui/ui';
vBody({ children: [...], maxWidth: 1120 }).bindTo('#app');
```

## 6. 定制阶梯

| 层级 | 定制口             | 手段                                                                     |
| ---- | ------------------ | ------------------------------------------------------------------------ |
| L0   | token 覆盖（全局） | 重定义 `--yoya-*` 实现整站换肤                                           |
| L1   | 作用域 token 覆盖  | 在任意容器上局部重定义 `--yoya-*` 实现局部换肤                           |
| L2   | 剥离预设皮肤       | 为身份作用域（`[vn="VXxx"] …`）写自己的规则，或换掉身份写自己的          |
| L3   | 微调覆盖           | 库规则在 `@layer yoya` 内且基础规则用 `:where()`，未分层用户规则天然优先 |
| L4   | 实例级             | 行内 `styles()` / `style()`                                              |
| L5   | 业务钩子           | `className('my-x')` 追加自定义类                                         |
| L6   | 组件 API           | `type/size/disabled/…`，禁止用 CSS 硬改组件变体                          |
| L7   | 完全替换           | 按标准自建/包装组件                                                      |

### replaceClassName（普通类名工具）

`ElementNode.replaceClassName(old, next, tolerate = false)`：

- `old` 存在：移除 `old`，加入 `next`（支持空格分隔多个类），DOM 即时同步；
- `old` 不存在：`tolerate = false`（默认）为无操作；`tolerate = true` 直接添加 `next`；
- `old === next`：无操作；返回 `this` 支持链式。

```js
vCard((card) => card.replaceClassName('card-plain', 'card-raised'));
```

组件身份不再挂在类名上（见 §7），所以它现在只是一个管理**用户自己类名**的普通工具——不再有"剥离预设"的作用。要接管某个组件的预设皮肤，就给它的身份作用域写自己的规则（`[vn="VXxx"] …`），或在自己的组件上写自己的身份；`replaceClassName` 是否继续留在公开 API 里仍是待定项（票 15 §3-Q8）。

## 7. 身份与类名契约

- **身份 = 视图根上的 `vn` 属性**：`vn="VCard"`。包装型共用同一根时写多个名字、空格分隔（`vn="VTimer VInput"`），任一名字命中即命中。
- **部件**用同一套写法带自己的名字（`vn="VCardHeader"`）；调用方投递的内容用 `vn_slot` 声明落位（写法见组件开发指南）。
- **预设规则一律从身份作用域起头**：`yoya.ui.css` 里的选择器都是 `[vn~="VXxx"] …`（无孤儿部件选择器），所以换掉身份就一次性把整棵子树从预设样式里摘出来——状态钩子同样失效（`[vn~="VTabs"] [vn~="VTabTrigger"][data-active]` 不再命中）。
- **类名不是身份**：旧的 `yoya-component` / `yoya-v*` 两族已随票 15 波 6 全部退场，共享基规则只认 `[vn]`；跨组件能力类保留：`yoya-<feature>`（`yoya-icon`、`yoya-layout`、`yoya-control-clear`）。
- 状态一律 kebab-case 的 `data-*` 属性，类名不承载状态。
- 由 `src/testing/gates/attribute-migration-baseline.test.js`（类名存量已清零、只减不增）与 `src/testing/gates/preset-scope.test.js`（皮肤里每条规则都从库内真实声明的身份起头）把关，`src/testing/gates/css-contract.test.js` 逐条守具体规则。

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
} from '@yoyaflow/yoya-ui/core';

setYoyaMode('dark'); // data-yoya-mode="dark"
setYoyaMode('system', { persist: true }); // 持久化，下次 initYoyaTheme() 自动恢复
resolveYoyaMode(); // 'light' | 'dark'（system 时按系统偏好解析）
setYoyaTheme('violet'); // data-yoya-theme="violet"
initYoyaTheme({ persist: true }); // 恢复上次选择的 mode / theme
```

### 预置切换按钮（vThemeModeSwitch）

不想手写切换按钮时，直接用组件库预置的 `vThemeModeSwitch`：默认提供「浅色 / 深色 / 跟随系统」三个圆形图标按钮，点击后写入 `data-yoya-mode`，默认持久化，刷新后由 `initYoyaTheme()` 恢复上次选择。

```js
import { initYoyaTheme, vCard, vThemeModeSwitch } from '@yoyaflow/yoya-ui';

initYoyaTheme({ persist: true }); // 应用启动时恢复上次保存的模式

vCard((card) => {
  card.vCardHeader('主题模式');
  card.vCardBody((body) => {
    body.child(vThemeModeSwitch()); // 浅色 / 深色 / 跟随系统，默认持久化
  });
});
```

需要限制或定制模式时，可传 options 或链式配置：

```js
vThemeModeSwitch({ modes: ['light', 'dark'], persist: false }); // 只留浅色/深色，不持久化

// 等价链式写法
vThemeModeSwitch((sw) => {
  sw.modes(['light', 'dark']);
  sw.persist(false);
});
```

- `modes([...])`：可用模式，默认 `['light', 'dark', 'system']`；字符串会映射内置标签与图标，也支持传入 `{ mode, label, icon }` 自定义。
- `persist(true | false)`：是否写入 localStorage，默认 `true`。
- 每个按钮带 `aria-label` / `title` 与当前激活态，键盘可操作；完整交互演示见示例站主题页（`examples/theme-demo.js`）。

## 8. 层叠与覆盖保障

- 组件规则统一放在 `@layer yoya` 内，未分层（用户）规则天然优先，无需 `!important`。
- 基础根规则使用 `:where()` 降特异度。
- 例外：`@media (prefers-reduced-motion: reduce)` 全局降级出于无障碍目的使用 `!important`，是唯一不受"用户规则优先"约束的库规则。
- token 与模式/密度块留在层外（`@layer yoya;` 之前），保证用户 token 覆盖优先。

## 9. SSR 与集成

- 行内样式输出 `var(--yoya-*, fallback)`，可随 `toHTML()` 序列化，浏览器端解析；消费端 token 名保持不变。
- 使用方需链接 `yoya.ui.css` 作为皮肤契约；不引入 CSS 运行时注入。

## 10. 契约测试

- `src/testing/gates/css-contract.test.js`：组件身份（`[vn~="VXxx"] …`）/ 状态钩子的静态 CSS 规则覆盖。
- `src/testing/gates/attribute-migration-baseline.test.js`：类名存量恒为 0、只减不增（`yoya-component` / `yoya-v*`）。
- `src/testing/gates/className-contract.test.js`：类名字面量只能落在保留下来的族（能力类 `yoya-<feature>`）、动态模板、`data-*` kebab 校验。
- `src/testing/gates/preset-scope.test.js`：预设规则必须从库内真实声明的身份起头（无孤儿选择器）。
- `src/testing/gates/cascade-layer.test.js`：`@layer yoya` 层结构。
- `src/testing/gates/theme-tokens.test.js`：raw 色板、变体派生、单定义、模式/密度开关、token 名稳定。
