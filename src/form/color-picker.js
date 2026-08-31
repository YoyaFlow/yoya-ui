import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories, vText } from '../core/node.js';
import {
  applyComponentArguments,
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';

const DEFAULT_PALETTE = [
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#334155',
  '#0f172a',
  '#fee2e2',
  '#fed7aa',
  '#fef3c7',
  '#dcfce7',
  '#ccfbf1',
  '#cffafe',
  '#dbeafe',
  '#e0e7ff',
  '#f3e8ff',
  '#fce7f3',
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#2dd4bf',
  '#22d3ee',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#f472b6',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#b91c1c',
  '#b45309',
  '#a16207',
  '#15803d',
  '#0f766e',
  '#0891b2',
  '#1d4ed8',
  '#4338ca',
  '#7e22ce',
  '#be185d'
];

/**
 * vColorPicker 是带自定义弹窗的颜色选择器：触发器打开弹窗，
 * 弹窗内包含已选颜色（右键清除）、预设色板、透明度调节与已选颜色效果预览。
 */
export class VColorPicker extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vcolor-picker');
    this.styles({ position: 'relative' });

    this._value = null;
    this._alpha = 100;
    this._presetColors = DEFAULT_PALETTE.slice();
    this._changeHandlers = [];
    this._open = false;
    this._outsideListener = null;
    this._repositionListener = null;

    this._buildStructure();
    this._setupColorPicker(setup);
    applyComponentArguments(this, options, callback);
  }

  _buildStructure() {
    this._triggerPreview = new HtmlElementNode('span')
      .className('yoya-vcolor-picker-trigger-preview')
      .attr('data-vcolor-trigger-preview', 'true')
      .styles({
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '4px',
        boxSizing: 'border-box',
        display: 'inline-block',
        height: '16px',
        width: '16px'
      });

    this._triggerTextNode = vText('');
    this._triggerText = new HtmlElementNode('span')
      .className('yoya-vcolor-picker-trigger-text')
      .attr('data-vcolor-trigger-text', 'true')
      .child(this._triggerTextNode);

    this._trigger = new HtmlElementNode('button')
      .className('yoya-vcolor-picker-trigger')
      .attr({
        'aria-expanded': 'false',
        'aria-haspopup': 'true',
        'data-vcolor-trigger': 'true',
        title: '选择颜色',
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        color: 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        gap: '8px',
        padding: '5px 10px'
      })
      .child(this._triggerPreview, this._triggerText)
      .on('click', () => this.toggle());

    this._selected = new HtmlElementNode('div')
      .className('yoya-vcolor-picker-selected')
      .attr('data-vcolor-selected', 'true')
      .styles({
        alignItems: 'center',
        background: 'var(--yoya-color-surface-hover, #f3f3f3)',
        borderRadius: '6px',
        display: 'flex',
        gap: '8px',
        justifyContent: 'space-between',
        padding: '6px 8px'
      });

    this._selectedPreview = new HtmlElementNode('span')
      .className('yoya-vcolor-picker-selected-preview')
      .attr('data-vcolor-selected-preview', 'true')
      .styles({
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '4px',
        boxSizing: 'border-box',
        display: 'inline-block',
        height: '18px',
        width: '18px'
      });

    this._selectedTextNode = vText('');
    this._selectedText = new HtmlElementNode('span')
      .className('yoya-vcolor-picker-selected-text')
      .attr('data-vcolor-selected-text', 'true')
      .child(this._selectedTextNode);

    this._clearSelectedButton = new HtmlElementNode('button')
      .className('yoya-vcolor-picker-clear-selected')
      .attr({
        'aria-label': '清除已选颜色',
        'data-vcolor-clear-selected': 'true',
        title: '清除已选颜色',
        type: 'button'
      })
      .styles({
        background: 'transparent',
        border: '0',
        color: themeValue('color-text-muted', '#64748b'),
        cursor: 'pointer',
        fontSize: '12px',
        padding: '0'
      })
      .text('清除')
      .on('click', () => this.clearValue());

    this._selected.child(this._selectedPreview, this._selectedText, this._clearSelectedButton);

    this._paletteBox = new HtmlElementNode('div')
      .className('yoya-vcolor-picker-palette')
      .attr('data-vcolor-palette', 'true')
      .styles({
        display: 'grid',
        gap: '5px',
        gridTemplateColumns: 'repeat(8, 18px)'
      });

    this._alphaTextNode = vText('100%');
    this._alphaInput = new HtmlElementNode('input')
      .attr({
        'data-vcolor-alpha': 'true',
        max: '100',
        min: '0',
        type: 'range',
        value: '100'
      })
      .styles({
        direction: 'rtl',
        height: '84px',
        margin: '0',
        writingMode: 'vertical-lr'
      })
      .on('input', (event) => this.alpha(Number(event.target.value)));

    this._alphaText = new HtmlElementNode('span')
      .className('yoya-vcolor-picker-alpha-text')
      .attr('data-vcolor-alpha-text', 'true')
      .styles({
        color: themeValue('color-text-muted', '#64748b'),
        fontSize: '12px',
        minWidth: '34px',
        textAlign: 'right'
      })
      .child(this._alphaTextNode);

    this._effectFill = new HtmlElementNode('div').attr('data-vcolor-effect-fill', 'true').styles({
      borderRadius: '5px',
      height: '100%',
      width: '100%'
    });

    this._effectBox = new HtmlElementNode('div')
      .className('yoya-vcolor-picker-effect')
      .attr('data-vcolor-effect', 'true')
      .styles({
        backgroundImage: 'conic-gradient(#d3d3d3 25%, #ffffff 0 50%, #d3d3d3 0 75%, #ffffff 0)',
        backgroundSize: '12px 12px',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        height: '28px',
        width: '28px'
      })
      .child(this._effectFill);

    this._sidePanel = new HtmlElementNode('div')
      .className('yoya-vcolor-picker-side')
      .styles({
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '28px'
      })
      .child(this._effectBox, this._alphaInput, this._alphaText);

    this._panel = new HtmlElementNode('div')
      .className('yoya-vcolor-picker-popup')
      .attr('data-vcolor-popup', 'true')
      .styles({
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '8px',
        boxShadow: 'var(--yoya-shadow-md, 0 8px 18px rgba(15, 23, 42, 0.1))',
        boxSizing: 'border-box',
        display: 'none',
        left: '0',
        minWidth: '250px',
        padding: '10px',
        position: 'absolute',
        top: 'calc(100% + 6px)',
        zIndex: '110'
      })
      .child(
        this._selected,
        new HtmlElementNode('div')
          .styles({
            display: 'flex',
            gap: '12px',
            marginTop: '10px'
          })
          .child(this._paletteBox, this._sidePanel)
      );

    this.child(this._trigger, this._panel);
    this._renderPalette();
    this._sync();
  }

  /** 读写当前颜色（#rgb / #rrggbb）；null 表示未选择。 */
  value(next) {
    if (next === undefined) {
      return this._value;
    }

    if (next === null) {
      return this.clearValue();
    }

    const normalized = normalizeColor(next);
    if (!normalized) {
      return this;
    }

    this._value = normalized;
    this._sync();
    this._notifyChange();
    return this;
  }

  /** 读写透明度（0-100）。 */
  alpha(next) {
    if (next === undefined) {
      return this._alpha;
    }

    const value = Number(next);
    this._alpha = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 100;
    this._sync();
    this._notifyChange();
    return this;
  }

  /** 返回带透明度的 rgba() 颜色串；未选择颜色时返回 null。 */
  rgba() {
    if (!this._value) {
      return null;
    }

    const hex = this._value.slice(1);
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    const alpha = Math.round((this._alpha / 100) * 1000) / 1000;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  /** 清除已选颜色。 */
  clearValue() {
    this._value = null;
    this._sync();
    this._notifyChange();
    return this;
  }

  /** 打开/关闭弹窗。 */
  open(value = true) {
    this._open = Boolean(value);
    this._trigger.attr('aria-expanded', this._open ? 'true' : 'false');
    if (this._open) {
      this._panel.style('display', null);
      this._positionPanel();
    } else {
      this._panel.style('display', 'none');
    }
    this._bindOutsideClose(this._open);
    this._bindReposition(this._open);
    return this;
  }

  close() {
    return this.open(false);
  }

  toggle() {
    return this.open(!this._open);
  }

  /** 读写预设色板。 */
  palette(next) {
    if (next === undefined) {
      return [...this._presetColors];
    }

    this._presetColors = normalizeFavorites(next);
    this._renderPalette();
    return this;
  }

  /** 注册颜色变化回调（color, alpha, picker）。 */
  change(handler) {
    if (handler === undefined) {
      return this._changeHandlers.slice();
    }

    this._changeHandlers = [handler];
    return this;
  }

  /** change 的别名。 */
  onChange(handler) {
    return this.change(handler);
  }

  renderDom() {
    const element = super.renderDom();
    if (this._open) {
      this._positionPanel();
    }
    return element;
  }

  destroy() {
    this._bindOutsideClose(false);
    this._bindReposition(false);
    return super.destroy();
  }

  _bindOutsideClose(enabled) {
    if (enabled && !this._outsideListener) {
      this._outsideListener = (event) => {
        if (!this._el || !this._el.contains(event.target)) {
          this.close();
        }
      };
      document.addEventListener('mousedown', this._outsideListener);
      return;
    }

    if (!enabled && this._outsideListener) {
      document.removeEventListener('mousedown', this._outsideListener);
      this._outsideListener = null;
    }
  }

  _bindReposition(enabled) {
    if (enabled && !this._repositionListener) {
      this._repositionListener = () => this._positionPanel();
      window.addEventListener('scroll', this._repositionListener, true);
      window.addEventListener('resize', this._repositionListener);
      return;
    }

    if (!enabled && this._repositionListener) {
      window.removeEventListener('scroll', this._repositionListener, true);
      window.removeEventListener('resize', this._repositionListener);
      this._repositionListener = null;
    }
  }

  /** 弹窗以 fixed 定位在触发器下方，避免被父容器 overflow 裁剪。 */
  _positionPanel() {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !this._el ||
      !this._trigger._el
    ) {
      return;
    }

    const rect = this._trigger._el.getBoundingClientRect();
    const panel = this._panel._el;
    if (!panel) {
      return;
    }

    const panelWidth = panel.offsetWidth || 250;
    const panelHeight = panel.offsetHeight || 280;
    const margin = 8;
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - panelWidth - margin);
    }
    let top = rect.bottom + 6;
    if (top + panelHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - panelHeight - 6);
    }

    this._panel.styles({
      left: `${left}px`,
      position: 'fixed',
      top: `${top}px`
    });
  }

  _sync() {
    const color = this._value;
    const rgba = this.rgba();
    const label = color ? `${color} ${this._alpha}%` : '选择颜色';
    this._triggerPreview.style('background', rgba || 'transparent');
    this._triggerTextNode.textContent(label);
    this._selectedPreview.style('background', rgba || 'transparent');
    this._selectedTextNode.textContent(color ? label : '未选择');
    this._alphaInput.attr('value', String(this._alpha));
    this._alphaTextNode.textContent(`${this._alpha}%`);
    this._effectFill.style('background', rgba || 'transparent');
    return this;
  }

  _notifyChange() {
    this._changeHandlers.forEach((handler) => handler(this._value, this._alpha, this));
  }

  _renderPalette() {
    replaceChildren(
      this._paletteBox,
      this._presetColors.map((color) => this._createSwatch(color))
    );
    return this;
  }

  _createSwatch(color) {
    return new HtmlElementNode('button')
      .className('yoya-vcolor-picker-swatch')
      .attr({
        'aria-label': `选择颜色 ${color}`,
        'data-vcolor-swatch': color,
        title: color,
        type: 'button'
      })
      .styles({
        background: color,
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '4px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        height: '18px',
        padding: '0',
        width: '18px'
      })
      .on('click', () => this.value(color));
  }

  _setupColorPicker(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { alpha, change, color, onChange, open, palette, value, ...elementConfig } = setup;
      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (palette !== undefined) {
        this.palette(palette);
      }
      if (value !== undefined) {
        this.value(value);
      } else if (color !== undefined) {
        this.value(color);
      }
      if (alpha !== undefined) {
        this.alpha(alpha);
      }
      if (change !== undefined) {
        this.change(change);
      } else if (onChange !== undefined) {
        this.onChange(onChange);
      }
      if (open !== undefined) {
        this.open(open);
      }
      return;
    }

    this.value(setup);
  }
}

export function vColorPicker(first = null, second = null, third = null) {
  return createComponentFactory(VColorPicker, first, second, third);
}

registerChildFactories(HtmlElementNode, { vColorPicker });

function normalizeColor(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  const short = /^#([0-9a-f]{3})$/i.exec(text);
  if (short) {
    return `#${short[1]
      .split('')
      .map((char) => char + char)
      .join('')
      .toLowerCase()}`;
  }

  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : null;
}

function normalizeFavorites(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((color) => normalizeColor(color)).filter((color) => color !== null);
}
