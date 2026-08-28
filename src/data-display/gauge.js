import { HtmlElementNode } from '../html/index.js';
import { SvgElementNode } from '../svg/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  themeValue
} from '../components/shared.js';

const gaugeTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

/**
 * 仪表盘：半圆刻度 + 指针，适合负载、使用率等区间指标。
 */
export class VGauge extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._value = 0;
    this._max = 100;
    this._unit = '';
    this._tone = 'primary';
    this._size = 220;

    this._svg = new SvgElementNode('svg');
    this._track = new SvgElementNode('path');
    this._arc = new SvgElementNode('path');
    this._needle = new SvgElementNode('polygon');
    this._hub = new SvgElementNode('circle');
    this._hubInner = new SvgElementNode('circle');
    this._valueText = new SvgElementNode('text');
    this._minText = new SvgElementNode('text');
    this._maxText = new SvgElementNode('text');

    this.className(componentClass, 'yoya-vgauge');
    this.styles({ boxSizing: 'border-box', position: 'relative' });
    this.child(
      this._svg.child(
        this._track,
        this._arc,
        this._needle,
        this._hub,
        this._hubInner,
        this._valueText,
        this._minText,
        this._maxText
      )
    );
    this._render();
    applyComponentSetup(this, setup);
    this._render();
  }

  value(value) {
    if (value === undefined) return this._value;
    this._value = Number(value) || 0;
    this._render();
    return this;
  }

  max(value) {
    if (value === undefined) return this._max;
    this._max = Number(value) || 100;
    this._render();
    return this;
  }

  unit(value) {
    if (value === undefined) return this._unit;
    this._unit = value;
    this._render();
    return this;
  }

  tone(value) {
    if (value === undefined) return this._tone;
    this._tone = value;
    this._render();
    return this;
  }

  _render() {
    const cx = 100;
    const cy = 100;
    const radius = 80;
    const pct = this._max > 0 ? Math.min(100, Math.max(0, (this._value / this._max) * 100)) : 0;
    const angle = Math.PI * (1 + pct / 100);
    const endX = cx + radius * Math.cos(angle);
    const endY = cy + radius * Math.sin(angle);
    const rotate = -90 + (pct / 100) * 180;

    this.style('width', `${this._size}px`);
    this.style('height', `${Math.round(this._size / 2)}px`);
    this._svg
      .attr({ preserveAspectRatio: 'none', viewBox: '0 0 200 110' })
      .styles({ display: 'block', height: '100%', width: '100%' });

    this._track
      .attr({
        d: 'M 20 100 A 80 80 0 0 1 180 100',
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-width': 12
      })
      .style('stroke', themeValue('color-border-faint', '#e5e7eb'));
    this._arc
      .attr({
        d: `M 20 100 A 80 80 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-width': 12
      })
      .style('stroke', gaugeTones[this._tone] || this._tone);
    this._needle
      .attr({
        points: `${cx - 4},${cy + 8} ${cx + 4},${cy + 8} ${cx},42`,
        transform: `rotate(${rotate.toFixed(2)} ${cx} ${cy})`
      })
      .styles({
        fill: themeValue('color-text', '#24292f'),
        stroke: themeValue('color-text', '#24292f'),
        strokeLinejoin: 'round',
        strokeWidth: '1'
      });
    this._hub.attr({ cx, cy, r: 8 }).style('fill', themeValue('color-text', '#24292f'));
    this._hubInner.attr({ cx, cy, r: 3.5 }).style('fill', themeValue('color-surface', '#ffffff'));
    this._valueText
      .attr({ 'text-anchor': 'middle', x: cx, y: 72 })
      .styles({
        fill: themeValue('color-text', '#24292f'),
        fontSize: '20px',
        fontWeight: '700'
      })
      .clearChildren()
      .text(`${this._value}${this._unit}`);
    this._minText
      .attr({ 'text-anchor': 'start', x: 20, y: 106 })
      .styles({
        fill: themeValue('color-text-secondary', '#64748b'),
        fontSize: '10px'
      })
      .clearChildren()
      .text('0');
    this._maxText
      .attr({ 'text-anchor': 'end', x: 180, y: 106 })
      .styles({
        fill: themeValue('color-text-secondary', '#64748b'),
        fontSize: '10px'
      })
      .clearChildren()
      .text(String(this._max));
  }
}

export function vGauge(first = null, second = null, third = null) {
  return createComponentFactory(VGauge, first, second, third);
}
