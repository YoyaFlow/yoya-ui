import { SvgElementNode } from '../svg/index.js';
import { applyComponentSetup, createComponentFactory, themeValue } from '../components/shared.js';

const sparklineTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

/**
 * 迷你走势：无坐标轴的轻量折线/面积图，适合嵌入卡片。
 */
export class VSparkline extends SvgElementNode {
  constructor(setup = null) {
    super('svg');
    this._values = [];
    this._fill = false;
    this._strokeWidth = 2;
    this._tone = 'primary';

    this.className('yoya-vsparkline');
    this.attr({
      preserveAspectRatio: 'none',
      viewBox: '0 0 100 30'
    });
    this.styles({
      display: 'block',
      height: '32px',
      width: '100%'
    });

    this._area = new SvgElementNode('path').styles({ fillOpacity: '0.14', pointerEvents: 'none' });
    this._line = new SvgElementNode('polyline').styles({
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    });
    this.child(this._area, this._line);
    this._applyTone();
    this._render();
    applyComponentSetup(this, setup);
    this._render();
  }

  data(values) {
    if (values === undefined) return this._values;
    this._values = Array.isArray(values) ? values.slice() : [];
    this._render();
    return this;
  }

  fill(value) {
    if (value === undefined) return this._fill;
    this._fill = Boolean(value);
    this._render();
    return this;
  }

  strokeWidth(value) {
    if (value === undefined) return this._strokeWidth;
    this._strokeWidth = Number(value) || 2;
    this._line.style('strokeWidth', String(this._strokeWidth));
    return this;
  }

  tone(value) {
    if (value === undefined) return this._tone;
    this._tone = value;
    this._applyTone();
    return this;
  }

  _applyTone() {
    const color = sparklineTones[this._tone] || this._tone;
    this._line.style('stroke', color);
    this._area.style('fill', color);
  }

  _render() {
    const values = this._values.filter((value) => Number.isFinite(value));
    const width = 100;
    const height = 30;
    const pad = 2;

    if (values.length === 0) {
      this._line.attr('points', '');
      this._area.attr('d', '');
      this._area.style('display', 'none');
      return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
    const points = values.map((value, index) => {
      const x = pad + index * step;
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    this._line.attr('points', points.join(' '));
    this._area.style('display', this._fill ? 'block' : 'none');
    if (this._fill) {
      const endX = points[points.length - 1].split(',')[0];
      const baselineY = String(height - pad);
      this._area.attr(
        'd',
        `M ${points[0]} L ${points.slice(1).join(' L ')} L ${endX} ${baselineY} L ${pad} ${baselineY} Z`
      );
    } else {
      this._area.attr('d', '');
    }
  }
}

export function vSparkline(first = null, second = null, third = null) {
  return createComponentFactory(VSparkline, first, second, third);
}
