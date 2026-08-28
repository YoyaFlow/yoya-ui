import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  themeBorder,
  themeValue
} from '../components/shared.js';
import { vText } from '../core/index.js';
import { vSparkline } from './sparkline.js';

/**
 * 趋势卡：标题 + 数值 + 单位 + 涨跌 + 迷你走势，适合作为看板统计卡。
 */
export class VTrendCard extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._up = true;
    this._titleNode = vText('');
    this._valueNode = vText('');
    this._unitNode = vText('');
    this._deltaNode = vText('');
    this._sparkline = vSparkline();
    this._sparkline.style('height', '26px');

    const label = new HtmlElementNode('div')
      .className('yoya-vtrend-card-title')
      .styles({
        color: themeValue('color-text-secondary', '#475569'),
        fontSize: '13px',
        lineHeight: '1.4',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      })
      .child(this._titleNode);
    const unitBox = new HtmlElementNode('span')
      .className('yoya-vtrend-card-unit')
      .styles({
        color: themeValue('color-text-secondary', '#64748b'),
        fontSize: '13px',
        fontWeight: '400',
        lineHeight: '1'
      })
      .child(this._unitNode);
    const valueBox = new HtmlElementNode('div')
      .className('yoya-vtrend-card-value')
      .styles({
        alignItems: 'baseline',
        display: 'flex',
        gap: '6px',
        fontSize: '26px',
        fontWeight: '700',
        lineHeight: '1.2',
        marginTop: '6px'
      })
      .child(this._valueNode, unitBox);
    this._delta = new HtmlElementNode('div')
      .className('yoya-vtrend-card-delta')
      .styles({
        fontSize: '13px',
        fontWeight: '600',
        lineHeight: '1.4',
        marginLeft: '12px',
        whiteSpace: 'nowrap'
      })
      .child(this._deltaNode);
    const footer = new HtmlElementNode('div')
      .className('yoya-vtrend-card-footer')
      .styles({
        alignItems: 'flex-end',
        display: 'flex',
        marginTop: '8px'
      })
      .child(this._sparkline, this._delta);

    this.className(componentClass, 'yoya-vtrend-card');
    this.styles({
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border', '#e2e8f0'),
      borderRadius: '10px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      minWidth: '0',
      padding: '16px'
    });
    this.child(label, valueBox, footer);
    this._applyDeltaColor();
    applyComponentSetup(this, setup);
  }

  title(value) {
    if (value === undefined) return this._titleNode.textContent();
    this._titleNode.textContent(value);
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
    return this;
  }

  delta(value) {
    if (value === undefined) return this._deltaNode.textContent();
    this._deltaNode.textContent(value);
    return this;
  }

  up(value) {
    if (value === undefined) return this._up;
    this._up = Boolean(value);
    this._applyDeltaColor();
    return this;
  }

  data(values) {
    this._sparkline.data(values);
    return this;
  }

  tone(value) {
    this._sparkline.tone(value);
    return this;
  }

  _applyDeltaColor() {
    this._delta.style(
      'color',
      this._up ? themeValue('color-success', '#16a34a') : themeValue('color-danger', '#dc2626')
    );
  }
}

export function vTrendCard(first = null, second = null, third = null) {
  return createComponentFactory(VTrendCard, first, second, third);
}
