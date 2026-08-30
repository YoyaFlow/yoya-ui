# 流光按钮 vGlowButton（特效组件/按钮）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「特效组件/按钮」演示条目，提供带流光扫过、悬停加速、按压光影反馈与点击光波涟漪的 vGlowButton 组件（含实时演示与源码面板）。所有特效始终附着在按钮本体上：常驻流光默认自动循环，点击后按钮自身的按压/光波变化同样属于本体特效；不产生任何脱离按钮的外部特效。

**Architecture:** VGlowButton 继承 VButton 复用全部按钮语义（label/variant/size/disabled/loading/事件），流光与光影完全由 CSS 在 `@layer yoya` 内实现，通过 `data-glow-*` 属性驱动，JS 只负责配置属性与点击涟漪。流光附着在按钮表面；点击后按钮本体的变化（按压位移、内阴影、点击光波涟漪）属于按钮自身特效，不产生与按钮无关的外部效果。演示页沿用 button-group-docs 模式：核心示例函数与页面壳分离，源码面板复用 ComponentSource。这是「特效组件」系列的第一个落地组件，后续组件（磁吸、粒子、液态等）另行规划。

**Tech Stack:** 原生 JS（ViewNode DSL）、CSS `@layer` + CSS 变量 + `@keyframes`、Vitest + jsdom、Vite examples。

## Global Constraints

- 组件类 PascalCase（`VGlowButton`），工厂 `vGlowButton`，CSS 类 `yoya-vglow-button`，满足 className 命名契约（`^yoya-v[a-z0-9]+(-{1,2}[a-z0-9]+)*$`）。
- 形态 C 类节点组件：VGlowButton 继承 VButton（HtmlElementNode 子类），必须导出成对 vXxx 工厂。
- 演示组件与页面壳分离：示例函数只包含流光按钮内容与操作，Card/说明文字属于页面壳，不进入源码面板。
- 源码面板复用 `ComponentSource`，imports 只列核心示例实际使用的符号（方法调用如 `body.hstack()` 不列入）。
- 单行 ≤ 100 字符；一行内点式链调用 ≤ 3（`src/examples/demos/*.js` 由 demo-readability.test.js 自动检查，docs 页保持同一约束）。
- 新 CSS 一律放在 `src/yoya.ui.css` 的 `@layer yoya { ... }` 内；keyframes 使用 `yoya-` 前缀。
- 测试缝选公共 API：从 `../index.js` 导入组件，断言 DOM 输出、data 属性与事件，不测私有字段。
- 优先复用 `--yoya-color-*` 主题变量；流光白带使用 rgba 半透明白，不做额外硬编码色。
- `prefers-reduced-motion` 已有全局降级规则，流光动画不需要重复处理。
- 特效始终附着在按钮自身：默认 `data-glow-play="auto"` 常驻自动循环；`hover` 仅控制流光显示时机，`off` 关闭；点击后按钮本体的按压反馈与光波涟漪（`data-glow-ripple="on"`）属于按钮自身特效；不产生任何脱离按钮的外部特效（页面级动画、弹层、全局反馈等）。

---

## File Structure

| 文件 | 动作 | 职责 |
| --- | --- | --- |
| `src/effects/glow-button.js` | 新建 | VGlowButton 类与 vGlowButton 工厂（继承 VButton + glow 配置 API） |
| `src/effects/index.js` | 新建 | effects 域入口，registerChildFactories 注册 vGlowButton |
| `src/effects/glow-button.test.js` | 新建 | 组件单元测试（公共 API 层） |
| `src/className-contract.test.js` | 修改 | libraryDirs 加入 `src/effects`，让新域受命名契约约束 |
| `src/index.js` | 修改 | 追加 `export * from './effects/index.js';` |
| `src/yoya.ui.js` | 修改 | 追加 `export * from './effects/index.js';` |
| `src/components/index.js` | 修改 | 追加 `export * from '../effects/index.js';` |
| `src/yoya.ui.css` | 修改 | `@layer yoya` 内新增流光样式与 keyframes |
| `src/css-contract.test.js` | 修改 | 新增 effects 选择器契约批次与测试 |
| `src/examples/effects-docs.js` | 新建 | GlowButtonDocumentationPage 演示页（5 个演示） |
| `src/examples/index.router.js` | 修改 | 新增「特效组件」分类与 `effects:0` 路由 loader |
| `src/examples/demo-styles.js` | 修改 | 新增 effectsExtraRules 并合入 demoRules |
| `src/examples/index.router.test.js` | 修改 | 菜单数量断言更新 + 特效组件路由测试 |
| `docs/components.md` | 修改 | 新增「特效组件」清单 |

---

### Task 1: VGlowButton 组件与 effects 域入口

**Files:**
- Create: `src/effects/glow-button.js`
- Create: `src/effects/index.js`
- Test: `src/effects/glow-button.test.js`
- Modify: `src/index.js`（末尾追加一行）
- Modify: `src/yoya.ui.js`（末尾追加一行）
- Modify: `src/components/index.js`（末尾追加一行）
- Modify: `src/className-contract.test.js`（libraryDirs 数组追加 `'src/effects'`）

**Interfaces:**
- Consumes: `VButton` from `../actions/button.js`；`componentClass` from `../components/shared.js`；`registerChildFactories` from `../core/node.js`；`HtmlElementNode` from `../html/index.js`。
- Produces:
  - `class VGlowButton extends VButton`，构造签名 `(setup = null, options = null, callback = null)`。
  - `function vGlowButton(setup = null, options = null, callback = null) -> VGlowButton`。
  - 实例方法：`glow(options?)`（无参返回 `{ play, speed, direction, strength, ripple }`；对象参数批量配置）、`play(value?)`、`speed(value?)`、`direction(value?)`、`strength(value?)`、`ripple(value?)`（无参为 getter，返回字符串）。
  - DOM 契约：`BUTTON` 元素，class 含 `yoya-component yoya-vbutton yoya-vglow-button`；默认 data 属性 `data-glow-play="auto"`、`data-glow-speed="normal"`、`data-glow-direction="ltr"`、`data-glow-strength="strong"`、`data-glow-ripple="on"`；点击时在按钮内部追加 `.yoya-vglow-button-ripple` 光波节点，动画结束自动移除（涟漪属于按钮自身特效）。

- [ ] **Step 1: 写失败测试**

创建 `src/effects/glow-button.test.js`，内容如下：

```js
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HtmlElementNode, div, vGlowButton } from '../index.js';

describe('vGlowButton', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a button with the vButton and glow class hooks', () => {
    const button = vGlowButton('立即部署');
    const element = button.renderDom();

    expect(button).toBeInstanceOf(HtmlElementNode);
    expect(element.tagName).toBe('BUTTON');
    expect(element.classList.contains('yoya-vbutton')).toBe(true);
    expect(element.classList.contains('yoya-vglow-button')).toBe(true);
    expect(element.querySelector('.yoya-vbutton-label').textContent).toBe('立即部署');
  });

  it('defaults to auto loop, normal speed, ltr direction, strong strength and ripple on', () => {
    const element = vGlowButton('部署').renderDom();

    expect(element.dataset.glowPlay).toBe('auto');
    expect(element.dataset.glowSpeed).toBe('normal');
    expect(element.dataset.glowDirection).toBe('ltr');
    expect(element.dataset.glowStrength).toBe('strong');
    expect(element.dataset.glowRipple).toBe('on');
  });

  it('configures glow options and keeps inherited button states', () => {
    const button = vGlowButton('部署').glow({
      direction: 'rtl',
      play: 'hover',
      ripple: 'off',
      speed: 'fast',
      strength: 'soft'
    });
    button.variant('danger').size('small').disabled(true);

    const element = button.renderDom();

    expect(button.glow()).toEqual({
      direction: 'rtl',
      play: 'hover',
      ripple: 'off',
      speed: 'fast',
      strength: 'soft'
    });
    expect(element.dataset.variant).toBe('danger');
    expect(element.dataset.size).toBe('small');
    expect(element.getAttribute('disabled')).not.toBeNull();
  });

  it('supports object creation with glow options and click handlers', () => {
    const click = vi.fn();
    const button = vGlowButton({
      label: '发布',
      play: 'off',
      speed: 'slow'
    });
    button.on('click', click);

    const element = button.renderDom();
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.dataset.glowPlay).toBe('off');
    expect(element.dataset.glowSpeed).toBe('slow');
    expect(element.dataset.glowDirection).toBe('ltr');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('spawns a click ripple inside the button and removes it after the animation', () => {
    const button = vGlowButton('部署');
    const element = button.renderDom();

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const ripple = element.querySelector('.yoya-vglow-button-ripple');
    expect(ripple).not.toBeNull();
    expect(ripple.getAttribute('aria-hidden')).toBe('true');

    ripple.dispatchEvent(new Event('animationend'));
    expect(element.querySelector('.yoya-vglow-button-ripple')).toBeNull();
  });

  it('skips the click ripple when ripple is off', () => {
    const button = vGlowButton('部署').glow({ ripple: 'off' });
    const element = button.renderDom();

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.querySelector('.yoya-vglow-button-ripple')).toBeNull();
  });

  it('registers vGlowButton as a child shortcut on containers', () => {
    const root = div((body) => {
      body.vGlowButton('快捷创建');
    });
    const element = root.renderDom();

    expect(element.querySelector('.yoya-vglow-button .yoya-vbutton-label').textContent).toBe(
      '快捷创建'
    );
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run src/effects/glow-button.test.js`
Expected: FAIL，报错为 `[vGlowButton] is not exported from .../src/index.js`（或 `Cannot find module`）。

- [ ] **Step 3: 最小实现**

创建 `src/effects/glow-button.js`：

```js
import { VButton } from '../actions/button.js';
import { componentClass } from '../components/shared.js';
import { HtmlElementNode } from '../html/index.js';

const GLOW_DEFAULTS = {
  direction: 'ltr',
  play: 'auto',
  ripple: 'on',
  speed: 'normal',
  strength: 'strong'
};

const GLOW_OPTIONS = {
  direction: new Set(['ltr', 'rtl']),
  play: new Set(['auto', 'hover', 'off']),
  ripple: new Set(['on', 'off']),
  speed: new Set(['slow', 'normal', 'fast']),
  strength: new Set(['soft', 'strong'])
};

/**
 * vGlowButton 流光按钮：在 vButton 语义上叠加流光扫过、光影反馈与点击光波涟漪。
 */
export class VGlowButton extends VButton {
  constructor(setup = null, options = null, callback = null) {
    super(setup, options, callback);
    this.className(componentClass, 'yoya-vglow-button');

    Object.entries(GLOW_DEFAULTS).forEach(([key, value]) => {
      if (this.attr(`data-glow-${key}`) === undefined) {
        this.attr(`data-glow-${key}`, value);
      }
    });

    this._bindRipple();
  }

  glow(options) {
    if (options === undefined) {
      return {
        direction: this.direction(),
        play: this.play(),
        ripple: this.ripple(),
        speed: this.speed(),
        strength: this.strength()
      };
    }

    if (options && typeof options === 'object') {
      const { direction, play, ripple, speed, strength } = options;
      if (play !== undefined) {
        this.play(play);
      }
      if (ripple !== undefined) {
        this.ripple(ripple);
      }
      if (speed !== undefined) {
        this.speed(speed);
      }
      if (direction !== undefined) {
        this.direction(direction);
      }
      if (strength !== undefined) {
        this.strength(strength);
      }
    }

    return this;
  }

  play(value) {
    if (value === undefined) {
      return this.attr('data-glow-play');
    }
    return this.attr('data-glow-play', GLOW_OPTIONS.play.has(value) ? value : 'auto');
  }

  speed(value) {
    if (value === undefined) {
      return this.attr('data-glow-speed');
    }
    return this.attr('data-glow-speed', GLOW_OPTIONS.speed.has(value) ? value : 'normal');
  }

  direction(value) {
    if (value === undefined) {
      return this.attr('data-glow-direction');
    }
    return this.attr('data-glow-direction', GLOW_OPTIONS.direction.has(value) ? value : 'ltr');
  }

  strength(value) {
    if (value === undefined) {
      return this.attr('data-glow-strength');
    }
    return this.attr('data-glow-strength', GLOW_OPTIONS.strength.has(value) ? value : 'strong');
  }

  ripple(value) {
    if (value === undefined) {
      return this.attr('data-glow-ripple');
    }
    return this.attr('data-glow-ripple', GLOW_OPTIONS.ripple.has(value) ? value : 'on');
  }

  _bindRipple() {
    this.on('click', (event) => {
      if (this.attr('data-glow-ripple') === 'off' || this.getBooleanState('disabled')) {
        return;
      }

      const rect = this._el?.getBoundingClientRect?.();
      const size = Math.max(rect?.width || 120, rect?.height || 40);
      const x = event.clientX || 0;
      const y = event.clientY || 0;
      const centered = x === 0 && y === 0;
      const offset = `${size / 2}px`;
      const left = centered ? `calc(50% - ${offset})` : `${x - (rect?.left || 0) - size / 2}px`;
      const top = centered ? `calc(50% - ${offset})` : `${y - (rect?.top || 0) - size / 2}px`;
      const ripple = new HtmlElementNode('span')
        .className('yoya-vglow-button-ripple')
        .attr('aria-hidden', 'true')
        .style({
          height: `${size}px`,
          left,
          top,
          width: `${size}px`
        });

      ripple.on('animationend', () => {
        const index = this._children.indexOf(ripple);
        if (index >= 0) {
          this._children.splice(index, 1);
        }
        ripple.destroy();
      });

      this.child(ripple);
    });
  }
}

export function vGlowButton(setup = null, options = null, callback = null) {
  return new VGlowButton(setup, options, callback);
}
```

创建 `src/effects/index.js`：

```js
import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VGlowButton, vGlowButton } from './glow-button.js';

const effectsFactories = {
  vGlowButton
};

registerChildFactories(HtmlElementNode, effectsFactories);

export { VGlowButton, vGlowButton };
```

`src/index.js` 末尾追加：

```js
export * from './effects/index.js';
```

`src/yoya.ui.js` 末尾追加：

```js
export * from './effects/index.js';
```

`src/components/index.js` 末尾追加：

```js
export * from '../effects/index.js';
```

`src/className-contract.test.js` 的 `libraryDirs` 数组追加 `'src/effects'`：

```js
  'src/async',
  'src/i18n',
  'src/router',
  'src/theme',
  'src/components',
  'src/effects'
];
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run src/effects/glow-button.test.js`
Expected: PASS，`Test Files  1 passed | Tests  7 passed`。

- [ ] **Step 5: 提交**

```bash
git add src/effects/glow-button.js src/effects/index.js src/effects/glow-button.test.js src/index.js src/yoya.ui.js src/components/index.js src/className-contract.test.js
git commit -m "feat(effects): 新增流光按钮 vGlowButton 组件与 effects 域入口"
```

---

### Task 2: 流光与光影 CSS

**Files:**
- Modify: `src/yoya.ui.css`（`@layer yoya` 内、`.yoya-vbutton[disabled]` 规则块之后插入）
- Test: `src/css-contract.test.js`

**Interfaces:**
- Consumes: `data-glow-play` / `data-glow-speed` / `data-glow-direction` / `data-glow-strength` / `data-glow-ripple`，class `yoya-vglow-button`，以及 vButton 已提供的 `yoya-vbutton-label`、`yoya-vbutton-spinner`、`[disabled]`、`[data-interaction='disabled']`。
- Produces: CSS 规则与 keyframes `yoya-glow-button-sweep`、`yoya-glow-button-sweep-rtl`、`yoya-glow-button-ripple`；流光带通过 `::before` 呈现，label/spinner 位于其上（z-index），hover 时流光加速，disabled 时流光暂停并隐藏；点击光波 `.yoya-vglow-button-ripple` 在按钮内部扩散并淡出（按钮自身特效）。

- [ ] **Step 1: 写失败的选择器契约测试**

`src/css-contract.test.js` 中，在 `carouselSelectors` 之后追加：

```js
const effectsSelectors = [
  '.yoya-vglow-button',
  '.yoya-vglow-button .yoya-vbutton-label',
  '.yoya-vglow-button .yoya-vbutton-spinner',
  '.yoya-vglow-button::before',
  ".yoya-vglow-button[data-glow-play='hover']",
  ".yoya-vglow-button[data-glow-play='hover']:hover::before",
  ".yoya-vglow-button[data-glow-speed='slow']",
  ".yoya-vglow-button[data-glow-speed='fast']",
  ".yoya-vglow-button[data-glow-direction='rtl']",
  ".yoya-vglow-button[data-glow-strength='soft']",
  '.yoya-vglow-button[disabled]::before',
  '.yoya-vglow-button .yoya-vglow-button-ripple',
  '@keyframes yoya-glow-button-sweep',
  '@keyframes yoya-glow-button-ripple'
];
```

在 `describe('CSS style contract', ...)` 内、最后一个测试之前追加：

```js
  it('covers the effects glow button selectors', () => {
    effectsSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run src/css-contract.test.js`
Expected: FAIL，报 `missing CSS rule for .yoya-vglow-button`。

- [ ] **Step 3: 实现 CSS**

在 `src/yoya.ui.css` 的 `@layer yoya` 内，`.yoya-vbutton[disabled],\n  .yoya-vbutton[data-interaction='disabled'] { ... }` 规则块之后插入：

```css
  :where(.yoya-vglow-button) {
    --yoya-glow-alpha: 0.4;
    --yoya-glow-duration: 2.8s;
    isolation: isolate;
    overflow: hidden;
    position: relative;
  }

  .yoya-vglow-button .yoya-vbutton-label,
  .yoya-vglow-button .yoya-vbutton-spinner {
    position: relative;
    z-index: 1;
  }

  .yoya-vglow-button::before {
    animation: yoya-glow-button-sweep var(--yoya-glow-duration) ease-in-out infinite;
    background: linear-gradient(
      105deg,
      transparent 0%,
      rgba(255, 255, 255, var(--yoya-glow-alpha)) 50%,
      transparent 100%
    );
    bottom: 0;
    content: '';
    left: -45%;
    pointer-events: none;
    position: absolute;
    top: 0;
    transform: translate3d(0, 0, 0) skewX(-14deg);
    width: 40%;
    z-index: 0;
  }

  .yoya-vglow-button[data-glow-play='hover']::before,
  .yoya-vglow-button[data-glow-play='off']::before,
  .yoya-vglow-button[disabled]::before,
  .yoya-vglow-button[data-interaction='disabled']::before {
    animation-play-state: paused;
    opacity: 0;
  }

  .yoya-vglow-button[data-glow-play='hover']:hover::before,
  .yoya-vglow-button[data-glow-play='hover']:focus-visible::before {
    animation-play-state: running;
    opacity: 1;
  }

  .yoya-vglow-button[data-glow-speed='slow'] {
    --yoya-glow-duration: 4.2s;
  }

  .yoya-vglow-button[data-glow-speed='fast'] {
    --yoya-glow-duration: 1.5s;
  }

  .yoya-vglow-button[data-glow-strength='soft'] {
    --yoya-glow-alpha: 0.22;
  }

  .yoya-vglow-button:hover::before {
    animation-duration: calc(var(--yoya-glow-duration) * 0.6);
  }

  .yoya-vglow-button[data-glow-direction='rtl']::before {
    animation-name: yoya-glow-button-sweep-rtl;
  }

  @keyframes yoya-glow-button-sweep {
    0%,
    45% {
      transform: translate3d(0, 0, 0) skewX(-14deg);
    }
    100% {
      transform: translate3d(420%, 0, 0) skewX(-14deg);
    }
  }

  @keyframes yoya-glow-button-sweep-rtl {
    0%,
    45% {
      transform: translate3d(420%, 0, 0) skewX(-14deg);
    }
    100% {
      transform: translate3d(0, 0, 0) skewX(-14deg);
    }
  }

  .yoya-vglow-button .yoya-vglow-button-ripple {
    animation: yoya-glow-button-ripple 520ms ease-out forwards;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.55) 0%, transparent 65%);
    border-radius: 50%;
    pointer-events: none;
    position: absolute;
    transform: scale(0);
    z-index: 0;
  }

  @keyframes yoya-glow-button-ripple {
    0% {
      opacity: 0.9;
      transform: scale(0);
    }
    100% {
      opacity: 0;
      transform: scale(1);
    }
  }
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run src/css-contract.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/yoya.ui.css src/css-contract.test.js
git commit -m "feat(effects): vGlowButton 流光扫过与光影反馈 CSS"
```

---

### Task 3: 「特效组件/按钮」演示页与菜单

**Files:**
- Create: `src/examples/effects-docs.js`
- Modify: `src/examples/index.router.js`
- Modify: `src/examples/demo-styles.js`
- Test: `src/examples/index.router.test.js`
- Docs: `docs/components.md`

**Interfaces:**
- Consumes: `vGlowButton`（Task 1）、CSS class `yoya-vglow-button`（Task 2）、`ComponentSource`、`applyDemoStyles`、`docsRouteLoaders` 机制。
- Produces: `GlowButtonDocumentationPage()`（route key `effects:0`，页面 data 钩子 `data-glow-button-docs`）；菜单分类 `{ id: 'effects', title: '特效组件' }`，条目 `{ label: '按钮', details: 'vGlowButton' }`，路径 `/components/effects/0`。

- [ ] **Step 1: 写失败的菜单/路由测试**

`src/examples/index.router.test.js`：

1) 概览测试（约第 131–134 行）三个数量断言改为：

```js
    expect(document.querySelectorAll('[data-overview-category]')).toHaveLength(12);
```

```js
    expect(document.querySelectorAll('[data-components-menu] .yoya-vmenu-group')).toHaveLength(12);
```

```js
    expect(document.querySelectorAll('[data-components-menu] .yoya-vmenu-item')).toHaveLength(69);
```

2) 顶栏导航测试（约第 163 行）改为：

```js
    expect(navItems).toHaveLength(13);
```

3) 在文件末尾追加新的路由测试：

```js
  it('opens the glow button demo under the effects category', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/effects/0');

    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const page = document.querySelector('[data-glow-button-docs]');
    expect(page).not.toBeNull();
    expect(page.querySelectorAll('.yoya-vglow-button').length).toBeGreaterThan(0);
    const glowButton = page.querySelector('.yoya-vglow-button');
    expect(glowButton.classList.contains('yoya-vbutton')).toBe(true);
    expect(glowButton.dataset.glowPlay).toBe('auto');
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run src/examples/index.router.test.js`
Expected: FAIL，数量断言不匹配（11 → 12 等），以及 `data-glow-button-docs` 为 null。

- [ ] **Step 3: 实现演示页与菜单**

创建 `src/examples/effects-docs.js`：

```js
import { div, hstack, section, vCard, vGlowButton, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心组件：只包含流光按钮内容，不包含 Card。
function GlowButtonBasicExample() {
  const output = vText('等待点击');
  const button = vGlowButton('立即部署').variant('primary');

  button.on('click', () => {
    output.textContent('已启动部署');
  });

  return {
    render() {
      return div((body) => {
        body.hstack({ gap: '14px' }, (row) => {
          row.style('alignItems', 'center');
          row.child(button);
          row.span((el) => el.attr('data-glow-button-output', 'true').child(output));
        });
      });
    }
  };
}

function GlowButtonSpeedDirectionExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    row.child(vGlowButton('慢速 · 从左到右').glow({ speed: 'slow', direction: 'ltr' }));
    row.child(vGlowButton('快速 · 从右到左').glow({ speed: 'fast', direction: 'rtl' }));
  });
}

function GlowButtonHoverExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    row.child(vGlowButton('悬停触发流光').glow({ play: 'hover' }));
    row.child(vGlowButton('关闭流光').glow({ play: 'off' }));
  });
}

function GlowButtonVariantsExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    ['primary', 'secondary', 'danger', 'ghost'].forEach((variant) => {
      row.child(vGlowButton(variant).variant(variant));
    });
  });
}

function GlowButtonStatesExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    row.child(vGlowButton('执行中').variant('primary').loading(true));
    row.child(vGlowButton('不可用').disabled(true));
  });
}

// 页面壳：负责 Card 和说明文字，不进入演示源码面板。
function GlowButtonBasicDemo() {
  const content = GlowButtonBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础流光');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('流光带自动扫过按钮表面，是按钮自带的常驻特效；点击时按钮表面泛起一圈光波涟漪，只产生按钮自身的变化。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonSpeedDirectionDemo() {
  const content = GlowButtonSpeedDirectionExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('速度与方向');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('speed 控制流光快慢，direction 控制扫过方向。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonHoverDemo() {
  const content = GlowButtonHoverExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('悬停触发');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('play 为 hover 时只有悬停或键盘聚焦才显示流光，off 则完全关闭。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonVariantsDemo() {
  const content = GlowButtonVariantsExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('变体');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('沿用 vButton 的 primary / secondary / danger / ghost 语义。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonStatesDemo() {
  const content = GlowButtonStatesExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('状态');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('loading 与 disabled 状态下流光暂停隐藏，按压反馈由 vButton 保留。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const glowButtonDemos = [
  {
    id: 'basic',
    title: '基础流光',
    component: GlowButtonBasicDemo,
    sourceComponent: GlowButtonBasicExample,
    imports: ['div', 'vGlowButton', 'vText'],
    sourceTitle: '基础流光源码'
  },
  {
    id: 'speed-direction',
    title: '速度与方向',
    component: GlowButtonSpeedDirectionDemo,
    sourceComponent: GlowButtonSpeedDirectionExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '速度与方向源码'
  },
  {
    id: 'hover',
    title: '悬停触发',
    component: GlowButtonHoverDemo,
    sourceComponent: GlowButtonHoverExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '悬停触发源码'
  },
  {
    id: 'variants',
    title: '变体',
    component: GlowButtonVariantsDemo,
    sourceComponent: GlowButtonVariantsExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '变体源码'
  },
  {
    id: 'states',
    title: '状态',
    component: GlowButtonStatesDemo,
    sourceComponent: GlowButtonStatesExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '状态源码'
  }
];

function GlowButtonDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-glow-button-demo');
        example.attr('data-glow-button-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-glow-button-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function GlowButtonDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-glow-button-docs');
        page.attr('data-component-route-item', 'effects:0');
        page.attr('data-glow-button-docs', 'true');
        page.h1('vGlowButton 流光按钮');
        page.p('在 vButton 语义上叠加流光扫过、悬停加速、按压光影反馈与点击光波涟漪。');

        page.section((usage) => {
          usage.className('components-glow-button-usage');
          usage.attr('data-glow-button-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要吸引注意力的主操作入口（部署、发布、购买）。');
            list.li('希望按钮带光影质感，同时保留标准按钮交互语义时。');
          });
        });

        page.section((api) => {
          api.className('components-glow-button-api');
          api.attr('data-glow-button-api', 'true');
          api.h2('常用 API');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              [
                [
                  "vGlowButton('部署').variant('primary')",
                  '创建流光按钮，继承 vButton 全部能力。',
                  "vGlowButton('立即部署')"
                ],
                [
                  'button.glow({ play, speed, direction, strength, ripple })',
                  '批量配置流光与点击涟漪参数。',
                  "button.glow({ speed: 'fast', direction: 'rtl' })"
                ],
                [
                  "button.play('auto' | 'hover' | 'off')",
                  '流光自身运行方式：常驻自动循环、仅悬停/聚焦显示、关闭。',
                  "button.play('hover')"
                ],
                [
                  "button.speed('slow' | 'normal' | 'fast')",
                  '流光速度。',
                  "button.speed('fast')"
                ],
                [
                  "button.direction('ltr' | 'rtl')",
                  '流光扫过方向。',
                  "button.direction('rtl')"
                ],
                [
                  "button.strength('soft' | 'strong')",
                  '流光亮度。',
                  "button.strength('soft')"
                ],
                [
                  "button.ripple('on' | 'off')",
                  '点击光波涟漪开关（默认开启，涟漪只在按钮内部扩散，属于按钮自身特效）。',
                  "button.ripple('off')"
                ],
                [
                  'button.variant() / size() / disabled() / loading()',
                  '外观与状态，继承自 vButton。',
                  "button.variant('danger').size('small')"
                ]
              ].forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.className('components-glow-button-examples');
          examples.h2('代码演示');
          glowButtonDemos.forEach((demo) => {
            examples.child(GlowButtonDemoSection(demo));
          });
        });
      });
    }
  };
}
```

`src/examples/index.router.js`：

1) 在 `general` 分类块之后插入新分类：

```js
  {
    id: 'effects',
    title: '特效组件',
    items: [{ label: '按钮', details: 'vGlowButton' }]
  },
```

2) 在 `docsRouteLoaders` 中追加：

```js
  'effects:0': () => import('./effects-docs.js').then((m) => m.GlowButtonDocumentationPage()),
```

`src/examples/demo-styles.js`：

1) 在 `floatButtonExtraRules` 之后追加：

```js
const effectsExtraRules = [
  ['.components-glow-button-docs', { display: 'grid', gap: '20px' }],
  [
    '.components-glow-button-docs h1',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1.45rem' }
  ],
  [
    '.components-glow-button-docs > p',
    { color: 'var(--yoya-color-text-muted, #5a6575)', margin: '0' }
  ],
  [
    '.components-glow-button-demo',
    {
      display: 'grid',
      gap: '12px',
      minWidth: '0',
      padding: '20px 0 0'
    }
  ],
  [
    '.components-glow-button-demo h3',
    { color: 'var(--yoya-color-text, #172033)', fontSize: '1rem', margin: '0' }
  ],
  [
    '.components-glow-button-demo-live',
    {
      minWidth: '0',
      padding: '16px'
    }
  ],
  ['.components-glow-button-demo .yoya-vcard', { margin: '0' }],
  ['.components-glow-button-demo-live .yoya-vcard-body', { width: '100%' }]
];
```

2) `demoRules` 数组在 `...floatButtonExtraRules,` 之后追加 `...effectsExtraRules,`。

`docs/components.md`：在「### 通用」小节之后插入：

```md
### 特效组件

1. 流光按钮 vGlowButton
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run src/examples/index.router.test.js`
Expected: PASS。

- [ ] **Step 5: 全量验证**

Run: `npm test`
Expected: 全部通过，无失败。

Run: `npm run lint`
Expected: 无错误。

Run: `npx prettier --check src/examples/effects-docs.js src/effects/glow-button.js src/effects/index.js src/effects/glow-button.test.js`
Expected: 全部通过；如报告格式差异，运行 `npx prettier --write` 后重新检查。

- [ ] **Step 6: 提交**

```bash
git add src/examples/effects-docs.js src/examples/index.router.js src/examples/demo-styles.js src/examples/index.router.test.js docs/components.md
git commit -m "feat(examples): 演示站点新增特效组件/按钮流光按钮页面"
```

---

## Self-Review

**Spec coverage:** 特效组件分类 ✓（Task 3 菜单）；按钮条目 ✓（Task 3 路由）；流光特效按钮 ✓（Task 1 组件 + Task 2 CSS + Task 3 演示）；特效属于按钮本体 ✓（常驻流光默认自动循环；点击后按钮自身的按压位移、内阴影与光波涟漪均附着在按钮上，不产生任何脱离按钮的外部特效）。后续特效组件（磁吸、粒子、液态等）属于新子系统，按写作计划规范应在后续单独规划，不并入本计划。

**Placeholder scan:** 所有步骤均含完整代码与精确命令，无 TBD/TODO/“后续处理”式占位。

**Type consistency:** Task 1 定义的 `glow/play/speed/direction/strength/ripple` 签名与 Task 2 的 data 属性（含 `data-glow-ripple`）、Task 3 的 API 表和演示调用一致；类名 `VGlowButton`、工厂 `vGlowButton`、页面导出 `GlowButtonDocumentationPage`、路由 key `effects:0` 在三个任务间一致。

---

## 后续扩展（非本计划范围）

「特效组件」系列后续可规划：磁吸按钮 vMagneticButton（指针引力）、粒子爆发 vParticleButton（点击粒子物理）、液态按钮 vLiquidButton（形变流体）、重力悬浮 vFloatingOrb（浮动物理）等，每个组件独立成计划，复用 `src/effects` 域入口与「特效组件」菜单分类。

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-30-glow-button-effects.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
