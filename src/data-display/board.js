import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../components/shared.js';
import { vText } from '../core/index.js';

const boardTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

const toneNames = new Set(Object.keys(boardTones));

/**
 * 数字看板：响应式卡片网格，用于集中展示关键指标。
 */
export class VDigitalBoard extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._columns = null;

    this.className(componentClass, 'yoya-vdigital-board');
    this.styles({
      boxSizing: 'border-box',
      display: 'grid',
      gap: '16px',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
    });
    applyComponentSetup(this, setup);
  }

  columns(value) {
    if (value === undefined) return this._columns;
    this._columns = value;
    const count = Number(value);
    this.style(
      'gridTemplateColumns',
      Number.isFinite(count) && count > 0
        ? `repeat(${count}, minmax(0, 1fr))`
        : 'repeat(auto-fit, minmax(220px, 1fr))'
    );
    return this;
  }
}

/**
 * 看板指标卡片：标签、数值、单位、趋势与主题色。
 */
export class VDigitalBoardItem extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._tone = 'primary';
    this._trendUp = true;

    this._accent = new HtmlElementNode('div').className('yoya-vdigital-board-item-accent');
    this._iconBox = new HtmlElementNode('div').className('yoya-vdigital-board-item-icon');
    this._labelNode = vText('');
    this._valueNode = vText('');
    this._unitNode = vText('');
    this._trendNode = vText('');

    this._accent.styles({
      bottom: '0',
      left: '0',
      position: 'absolute',
      top: '0',
      width: '4px'
    });
    this._iconBox.styles({
      alignItems: 'center',
      display: 'none',
      flexShrink: '0',
      fontSize: '22px',
      height: '28px',
      justifyContent: 'center',
      width: '28px'
    });

    const labelBox = new HtmlElementNode('div')
      .className('yoya-vdigital-board-item-label')
      .styles({
        color: themeValue('color-text-secondary', '#475569'),
        fontSize: '13px',
        lineHeight: '1.4'
      })
      .child(this._labelNode);
    const topRow = new HtmlElementNode('div')
      .className('yoya-vdigital-board-item-top')
      .styles({ alignItems: 'center', display: 'flex', gap: '10px' })
      .child(this._iconBox, labelBox);
    const unitBox = new HtmlElementNode('span')
      .className('yoya-vdigital-board-item-unit')
      .styles({
        color: themeValue('color-text-secondary', '#64748b'),
        fontSize: '13px',
        fontWeight: '400',
        lineHeight: '1'
      })
      .child(this._unitNode);
    const valueBox = new HtmlElementNode('div')
      .className('yoya-vdigital-board-item-value-box')
      .styles({
        alignItems: 'baseline',
        display: 'flex',
        gap: '6px',
        fontSize: '28px',
        fontWeight: '700',
        lineHeight: '1.2',
        marginTop: '6px'
      })
      .child(this._valueNode, unitBox);
    this._trendBox = new HtmlElementNode('div')
      .className('yoya-vdigital-board-item-trend')
      .styles({
        fontSize: '13px',
        lineHeight: '1.4',
        marginTop: '8px'
      })
      .child(this._trendNode);
    this._unitBox = unitBox;

    const body = new HtmlElementNode('div')
      .className('yoya-vdigital-board-item-body')
      .styles({
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '0'
      })
      .child(topRow, valueBox, this._trendBox);

    this.className(componentClass, 'yoya-vdigital-board-item');
    this.styles({
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border', '#e2e8f0'),
      borderRadius: '10px',
      boxSizing: 'border-box',
      display: 'flex',
      minWidth: '0',
      overflow: 'hidden',
      padding: '16px 16px 16px 20px',
      position: 'relative'
    });
    this.child(this._accent, body);
    this._applyTone();
    applyComponentSetup(this, setup);
  }

  label(value) {
    if (value === undefined) return this._labelNode.textContent();
    this._labelNode.textContent(value);
    return this;
  }

  value(value) {
    if (value === undefined) return this._valueNode.textContent();
    this._valueNode.textContent(value);
    return this;
  }

  unit(value) {
    if (value === undefined) return this._unitNode.textContent();
    this._unitNode.textContent(value);
    this._unitBox.style('display', value ? 'inline-block' : 'none');
    return this;
  }

  trend(value) {
    if (value === undefined) return this._trendNode.textContent();
    this._trendNode.textContent(value);
    this._trendBox.style('display', value ? 'block' : 'none');
    this._applyTrendColor();
    return this;
  }

  trendUp(value) {
    if (value === undefined) return this._trendUp;
    this._trendUp = Boolean(value);
    this._applyTrendColor();
    return this;
  }

  tone(value) {
    if (value === undefined) return this._tone;
    this._tone = toneNames.has(value) ? value : 'primary';
    this._applyTone();
    return this;
  }

  icon(content) {
    const visible = content !== null && content !== undefined && content !== '';
    this._iconBox.style('display', visible ? 'flex' : 'none');
    replaceChildren(this._iconBox, visible ? normalizeChildren(content) : []);
    return this;
  }

  _applyTone() {
    const color = boardTones[this._tone];
    this._accent.style('background', color);
    this._iconBox.style('color', color);
    this._applyTrendColor();
  }

  _applyTrendColor() {
    this._trendBox.style(
      'color',
      this._trendUp ? themeValue('color-success', '#16a34a') : themeValue('color-danger', '#dc2626')
    );
  }
}

export function vDigitalBoard(first = null, second = null, third = null) {
  return createComponentFactory(VDigitalBoard, first, second, third);
}

export function vDigitalBoardItem(first = null, second = null, third = null) {
  return createComponentFactory(VDigitalBoardItem, first, second, third);
}
