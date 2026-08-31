import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentArguments,
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeValue
} from '../components/shared.js';

/**
 * vSymbolButton 是只显示符号/图标的轻量按钮：无边框、无轮廓、
 * 透明背景，hover 时给出细微底色。适合工具栏、源码/复制等场景。
 */
export class VSymbolButton extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('button', null);
    this.className(componentClass, 'yoya-vsymbol-button');
    this.attr('type', 'button');
    this.styles({
      alignItems: 'center',
      background: 'transparent',
      border: '0',
      borderRadius: '6px',
      boxShadow: 'none',
      boxSizing: 'border-box',
      color: 'inherit',
      cursor: 'pointer',
      display: 'inline-flex',
      flexShrink: '0',
      justifyContent: 'center',
      lineHeight: '1',
      margin: '0',
      outline: 'none',
      padding: '4px'
    });
    this.on('mouseenter', () => {
      this.style('background', themeValue('color-surface-hover', 'rgba(15, 23, 42, 0.06)'));
    });
    this.on('mouseleave', () => {
      this.style('background', null);
    });
    this._setupSymbolButton(setup);
    applyComponentArguments(this, options, callback);
  }

  /** 设置按钮内显示的符号/图标内容。 */
  icon(content) {
    replaceChildren(this, normalizeChildren(content));
    return this;
  }

  /** 读写无障碍标签。 */
  ariaLabel(value) {
    return value === undefined ? this.attr('aria-label') : this.attr('aria-label', value);
  }

  _setupSymbolButton(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { ariaLabel, icon, title, ...elementConfig } = setup;
      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (ariaLabel !== undefined) {
        this.ariaLabel(ariaLabel);
      }
      if (title !== undefined) {
        this.attr('title', title);
      }
      if (icon !== undefined) {
        this.icon(icon);
      }
      return;
    }

    this.icon(setup);
  }
}

export function vSymbolButton(first = null, second = null, third = null) {
  return createComponentFactory(VSymbolButton, first, second, third);
}
