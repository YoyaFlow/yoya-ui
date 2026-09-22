import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { div } from '../html/index.js';
import { svg } from '../svg/index.js';
import { createComponentShortcut, themeValue } from '../components/shared.js';

const gaugeTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

const GAUGE_CX = 100;
const GAUGE_CY = 100;
const GAUGE_RADIUS = 80;
const GAUGE_TRACK = 'M 20 100 A 80 80 0 0 1 180 100';
const GAUGE_NEEDLE = '96,108 104,108 100,42';

/**
 * 仪表盘（形态 B）：半圆刻度 + 指针，适合负载、使用率等区间指标。
 *
 * - 静态几何（尺寸 / 描边 / 字号 / 文本锚点 / 颜色）在 `yoya.ui.css`（R5）；
 *   随状态变的只有三样：弧线路径、指针角度、数值文本（R6：读句柄 → `computed` → 属性绑定）。
 * - 命令只写状态（R9），归一化（`Number(…) || 默认值`）放在读时；给句柄就是活值。
 */
export function VGauge({ max = 100, tone = 'primary', unit = '', value = 0, ...rest } = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;
  const valueState = asSignal(value);
  const maxState = asSignal(max);
  const unitState = asSignal(unit);
  const toneState = asSignal(tone);

  const valueValue = computed(() => Number(valueState.value) || 0);
  const maxValue = computed(() => Number(maxState.value) || 100);
  const toneValue = computed(() => toneState.value || 'primary');
  const toneColor = computed(() => gaugeTones[toneValue.value] || toneValue.value);
  const percent = computed(() =>
    maxValue.value > 0 ? Math.min(100, Math.max(0, (valueValue.value / maxValue.value) * 100)) : 0
  );
  const arcPath = computed(() => {
    const angle = Math.PI * (1 + percent.value / 100);
    const endX = GAUGE_CX + GAUGE_RADIUS * Math.cos(angle);
    const endY = GAUGE_CY + GAUGE_RADIUS * Math.sin(angle);

    return `M 20 100 A 80 80 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
  });
  const needleRotate = computed(
    () => `rotate(${(-90 + (percent.value / 100) * 180).toFixed(2)} ${GAUGE_CX} ${GAUGE_CY})`
  );
  const valueText = computed(() => `${valueValue.value}${unitState.value ?? ''}`);
  const maxText = computed(() => String(maxValue.value));

  return vNode((api) => {
    api.value = (next) => {
      if (next === undefined) {
        return valueValue.value;
      }

      valueState.value = next;
      return api;
    };

    api.max = (next) => {
      if (next === undefined) {
        return maxValue.value;
      }

      maxState.value = next;
      return api;
    };

    api.unit = (next) => {
      if (next === undefined) {
        return unitState.value;
      }

      unitState.value = next;
      return api;
    };

    api.tone = (next) => {
      if (next === undefined) {
        return toneValue.value;
      }

      toneState.value = next;
      return api;
    };

    // 结构（R2）：一棵树写在 return 里；静态样式在 CSS（R5），随状态变的走绑定（R6）
    return div(
      { ...elementConfig, attrs: restAttrs ?? {}, style: restStyle ?? {}, vn: 'VGauge' },
      (root) => {
        root.child(
          svg(
            { attrs: { preserveAspectRatio: 'none', viewBox: '0 0 200 110' }, vn: 'VGaugeChart' },
            (chart) => {
              chart.path({ attrs: { d: GAUGE_TRACK, fill: 'none' }, vn: 'VGaugeTrack' });
              chart.path({
                attrs: { d: arcPath, fill: 'none' },
                style: { stroke: toneColor },
                vn: 'VGaugeArc'
              });
              chart.polygon({
                attrs: { points: GAUGE_NEEDLE, transform: needleRotate },
                vn: 'VGaugeNeedle'
              });
              chart.circle({ attrs: { cx: GAUGE_CX, cy: GAUGE_CY, r: 8 }, vn: 'VGaugeHub' });
              chart.circle({ attrs: { cx: GAUGE_CX, cy: GAUGE_CY, r: 3.5 }, vn: 'VGaugeHubInner' });
              chart.text({ attrs: { x: GAUGE_CX, y: 72 }, vn: 'VGaugeValue' }, (label) =>
                label.text(valueText)
              );
              chart.text({ attrs: { x: 20, y: 106 }, vn: 'VGaugeMin' }, (label) => label.text('0'));
              chart.text({ attrs: { x: 180, y: 106 }, vn: 'VGaugeMax' }, (label) =>
                label.text(maxText)
              );
            }
          )
        );
      }
    );
  });
}

export const vGauge = createComponentShortcut(VGauge, { props: true });
