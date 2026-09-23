import { ElementNode, registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { vNode } from '../core/v-node.js';
import {
  applyComponentSetup,
  createComponentShortcut,
  delegateNodeCommands,
  themeValue
} from '../components/shared.js';

/**
 * 背景的「基色 + 不透明度」两段数据：命令只写数据，**合成交给预设皮肤**
 * （票 01 / D11）——`--yoya-shell-composed` 由皮肤算出来，主层用 `color-mix()`，
 * 不认它的浏览器由兜底规则退回不透明基色。
 */
const SHELL_BG = '--yoya-shell-bg';
const SHELL_ALPHA = '--yoya-shell-alpha';
const SHELL_COMPOSED = '--yoya-shell-composed';

/**
 * VThemeShell 是主题化的通用容器：默认提供背景、边框、圆角与文字色
 * （全部由 --yoya-* token 驱动，跟随明暗/品牌/密度模式），并支持
 * 滚动条与背景透明度控制。其他容器类组件可基于它收敛外观定义。
 */
class ThemeShellNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VThemeShell' });
    this._identity = 'VThemeShell';
    this.styles({
      background: themeValue('color-surface', '#ffffff'),
      border: `1px solid ${themeValue('color-border', '#d8dee8')}`,
      borderRadius: themeValue('radius-md', '6px'),
      boxSizing: 'border-box',
      color: themeValue('color-text', '#172033'),
      minWidth: '0'
    });

    applyComponentSetup(this, setup);
  }

  _requireSingleShellChild() {
    const children = this.children();
    if (children.length !== 1) {
      throw new TypeError('vThemeShell virtual mode requires exactly one child');
    }
    return children[0];
  }

  _virtualTarget() {
    const child = this._requireSingleShellChild();
    return typeof child._resolve === 'function' ? child._resolve() : child;
  }

  _syncShellStyles(target) {
    if (!target || typeof target.styles !== 'function') {
      return;
    }
    target.styles({
      background: this._projectedBackground(),
      border: this._styles?.border,
      borderColor: this._styles?.borderColor,
      borderRadius: this._styles?.borderRadius,
      boxSizing: this._styles?.boxSizing,
      color: this._styles?.color,
      minWidth: this._styles?.minWidth,
      overflow: this._styles?.overflow
    });
  }

  /**
   * 投影给虚拟节点的背景：目标不是 `VThemeShell`（没有身份给皮肤挂组合规则），
   * 所以这条路径仍在 JS 侧组合——与改动前逐字节一致。
   */
  _projectedBackground() {
    const base = this._styles?.[SHELL_BG];
    if (base === undefined) {
      return this._styles?.background;
    }
    const alpha = this._styles?.[SHELL_ALPHA] ?? '100%';
    return `color-mix(in srgb, ${base} ${alpha}, transparent)`;
  }

  /**
   * 虚拟节点模式：自身不创建 DOM，把外壳样式应用到唯一子节点。
   * 需在渲染前开启，且容器内只有一个子节点。
   */
  virtual(next = true) {
    this._virtualMode = Boolean(next);
    return this;
  }

  renderDom() {
    if (this._deleted) {
      return null;
    }
    if (this._virtualMode) {
      const child = this._requireSingleShellChild();
      const target = this._virtualTarget();
      this._syncShellStyles(target);
      return child.renderDom();
    }
    return super.renderDom();
  }

  toHTML() {
    if (this._deleted) {
      return '';
    }
    if (this._virtualMode) {
      return this._requireSingleShellChild().toHTML();
    }
    return super.toHTML();
  }

  background(value) {
    if (value === undefined) {
      return this._styles?.background;
    }
    if (value === null) {
      return this;
    }
    // 显式设了基色，之前记下的透明度数据就作废（否则再调 backgroundOpacity() 会拿旧基色）。
    this.style(SHELL_BG, null);
    this.style(SHELL_ALPHA, null);
    return this.style('background', String(value));
  }

  /**
   * 背景透明度（0-1）：在现有背景上按百分比混入透明。
   *
   * 只写两段数据（基色 + 百分比），不拼颜色字符串：合成由预设皮肤完成，
   * 于是低基线浏览器里的背景仍然正确（只丢了透明度），而不是整块透明。
   */
  backgroundOpacity(alpha) {
    const pct = Math.max(0, Math.min(1, Number(alpha) || 0));
    const base =
      this._styles?.[SHELL_BG] ??
      this._styles?.background ??
      themeValue('color-surface', '#ffffff');

    this.style(SHELL_BG, base);
    this.style(SHELL_ALPHA, `${Math.round(pct * 100)}%`);
    return this.style('background', `var(${SHELL_COMPOSED}, ${base})`);
  }

  radius(value) {
    if (value === undefined) {
      return this._styles?.borderRadius;
    }
    return this.styles({ borderRadius: value === null ? undefined : String(value) });
  }

  border(value) {
    if (value === undefined) {
      return this._styles?.border;
    }
    return this.styles({ border: value === null ? undefined : String(value) });
  }

  borderColor(value) {
    if (value === undefined) {
      return this._styles?.borderColor;
    }
    return this.styles({ borderColor: value === null ? undefined : String(value) });
  }

  scrollable(next = true) {
    return this.styles({ overflow: next ? 'auto' : 'visible' });
  }
}

/**
 * 主题化通用容器（形态 B）：视图根是**节点类型扩展** `ThemeShellNode`（虚拟节点模式要覆盖
 * `renderDom` / `toHTML`，元素机制归它）；组件 api 用 `delegateNodeCommands` 把节点类型上的
 * 公开方法（`virtual` / `background` / `radius` / `scrollable`… 以及元素 DSL）整体补齐——
 * 于是 `vThemeShell((shell) => shell.p('文本'))` 这类写法照旧。
 */
export function VThemeShell(props = {}) {
  return vNode((api) => {
    const node = new ThemeShellNode(props);
    delegateNodeCommands(api, node);
    return node;
  });
}

export const vThemeShell = createComponentShortcut(VThemeShell, { props: true });

registerChildFactories(ElementNode, { vThemeShell });
