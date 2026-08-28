import { ElementNode, registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { applyComponentSetup, createComponentFactory, themeValue } from '../components/shared.js';

/**
 * VThemeShell 是主题化的通用容器：默认提供背景、边框、圆角与文字色
 * （全部由 --yoya-* token 驱动，跟随明暗/品牌/密度模式），并支持
 * 滚动条与背景透明度控制。其他容器类组件可基于它收敛外观定义。
 */
export class VThemeShell extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-layout', 'yoya-vtheme-shell');
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

  background(value) {
    if (value === undefined) {
      return this._styles.background;
    }
    if (value === null) {
      return this;
    }
    this._styles.background = String(value);
    if (this._el) {
      this._el.style.background = String(value);
    }
    return this;
  }

  /**
   * 背景透明度（0-1）：在现有背景上按百分比混入透明。
   */
  backgroundOpacity(alpha) {
    const current = this.background() || themeValue('color-surface', '#ffffff');
    const pct = Math.max(0, Math.min(1, Number(alpha) || 0));
    return this.background(`color-mix(in srgb, ${current} ${Math.round(pct * 100)}%, transparent)`);
  }

  radius(value) {
    if (value === undefined) {
      return this._styles.borderRadius;
    }
    return this.styles({ borderRadius: value === null ? undefined : String(value) });
  }

  border(value) {
    if (value === undefined) {
      return this._styles.border;
    }
    return this.styles({ border: value === null ? undefined : String(value) });
  }

  borderColor(value) {
    if (value === undefined) {
      return this._styles.borderColor;
    }
    return this.styles({ borderColor: value === null ? undefined : String(value) });
  }

  scrollable(next = true) {
    return this.styles({ overflow: next ? 'auto' : 'visible' });
  }
}

export function vThemeShell(first = null, second = null, third = null) {
  return createComponentFactory(VThemeShell, first, second, third);
}

registerChildFactories(ElementNode, { vThemeShell });
