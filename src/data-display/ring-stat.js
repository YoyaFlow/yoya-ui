import { HtmlElementNode } from '../html/index.js';
import { SvgElementNode } from '../svg/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  themeValue
} from '../components/shared.js';
import { vText } from '../core/index.js';

const ringTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

/**
 * 环形统计：圆环进度 + 中心数值/标签，适合占比类指标。
 */
export class VRingStat extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._percent = 0;
    this._size = 120;
    this._strokeWidth = 10;
    this._tone = 'primary';
    this._valueExplicit = false;
    this._valueNode = vText('');
    this._labelNode = vText('');

    this._svg = new SvgElementNode('svg');
    this._circle = new SvgElementNode('circle');
    this._track = new SvgElementNode('circle');
    const center = new HtmlElementNode('div').className('yoya-vring-stat-center').styles({
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      inset: '0',
      justifyContent: 'center',
      position: 'absolute'
    });
    const valueBox = new HtmlElementNode('div')
      .className('yoya-vring-stat-value')
      .styles({ fontSize: '22px', fontWeight: '700', lineHeight: '1.2' })
      .child(this._valueNode);
    const labelBox = new HtmlElementNode('div')
      .className('yoya-vring-stat-label')
      .styles({
        color: themeValue('color-text-secondary', '#64748b'),
        fontSize: '12px',
        lineHeight: '1.4',
        marginTop: '2px'
      })
      .child(this._labelNode);
    center.child(valueBox, labelBox);

    this.className(componentClass, 'yoya-vring-stat');
    this.styles({ boxSizing: 'border-box', position: 'relative' });
    this._svg.child(this._track, this._circle);
    this.child(this._svg, center);
    this._applyTone();
    this._render();
    applyComponentSetup(this, setup);
    this._render();
  }

  percent(value) {
    if (value === undefined) return this._percent;
    this._percent = Math.min(100, Math.max(0, Number(value) || 0));
    this._render();
    return this;
  }

  value(value) {
    if (value === undefined) return this._valueNode.textContent();
    this._valueExplicit = true;
    this._valueNode.textContent(value);
    return this;
  }

  label(value) {
    if (value === undefined) return this._labelNode.textContent();
    this._labelNode.textContent(value);
    return this;
  }

  size(value) {
    if (value === undefined) return this._size;
    this._size = Number(value) || 120;
    this._render();
    return this;
  }

  strokeWidth(value) {
    if (value === undefined) return this._strokeWidth;
    this._strokeWidth = Number(value) || 10;
    this._render();
    return this;
  }

  tone(value) {
    if (value === undefined) return this._tone;
    this._tone = value;
    this._applyTone();
    return this;
  }

  _applyTone() {
    const color = ringTones[this._tone] || this._tone;
    this._circle.style('stroke', color);
  }

  _render() {
    const size = this._size;
    const radius = size / 2 - this._strokeWidth / 2 - 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    this.style('width', `${size}px`);
    this.style('height', `${size}px`);
    if (!this._valueExplicit) {
      this._valueNode.textContent(`${Math.round(this._percent)}%`);
    }

    this._svg
      .attr({ viewBox: `0 0 ${size} ${size}` })
      .styles({ display: 'block', height: `${size}px`, width: `${size}px` });
    this._track
      .attr({
        cx: center,
        cy: center,
        fill: 'none',
        r: radius,
        'stroke-width': this._strokeWidth
      })
      .style('stroke', themeValue('color-border-faint', '#e5e7eb'));
    this._circle
      .attr({
        cx: center,
        cy: center,
        fill: 'none',
        r: radius,
        'stroke-dasharray': String(circumference),
        'stroke-dashoffset': String(circumference * (1 - this._percent / 100)),
        'stroke-linecap': 'round',
        'stroke-width': this._strokeWidth,
        transform: `rotate(-90 ${center} ${center})`
      })
      .style('stroke', ringTones[this._tone] || this._tone);
  }
}

export function vRingStat(first = null, second = null, third = null) {
  return createComponentFactory(VRingStat, first, second, third);
}
