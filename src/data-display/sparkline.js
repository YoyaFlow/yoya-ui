import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { svg } from '../svg/index.js';
import { createComponentShortcut, themeValue } from '../components/shared.js';

const sparklineTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 30;
const SPARK_PAD = 2;

/**
 * 迷你走势（形态 B）：无坐标轴的轻量折线 / 面积图，适合嵌入卡片。
 *
 * - 视图根的 `display` / `height` / `width` 与两条路径的静态描边样式在 `yoya.ui.css`（R5）；
 * - 数据 → 折线点位 / 面积路径是纯派生（`computed`），tone 颜色与线宽是状态绑定的内联样式；
 * - 命令只写状态（R9）：`strokeWidth()` 只在**调用过**时才写内联线宽（与迁移前一致）。
 */
export function VSparkline({ data, fill = false, strokeWidth, tone = 'primary', ...rest } = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;
  const dataState = asSignal(data);
  const fillState = asSignal(fill);
  const strokeState = asSignal(strokeWidth);
  const toneState = asSignal(tone);

  const fillValue = computed(() => Boolean(fillState.value));
  const toneValue = computed(() => toneState.value || 'primary');
  const toneColor = computed(() => sparklineTones[toneValue.value] || toneValue.value);
  const strokeValue = computed(() => Number(strokeState.value) || 2);
  // 迁移前口径：`strokeWidth()` 没调用过就不写内联线宽（SVG 默认 1）
  const strokeText = computed(() => (strokeState.value == null ? null : String(strokeValue.value)));

  const geometry = computed(() => {
    const values = (Array.isArray(dataState.value) ? dataState.value : []).filter((item) =>
      Number.isFinite(item)
    );

    if (values.length === 0) {
      return { area: '', points: [] };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? (SPARK_WIDTH - SPARK_PAD * 2) / (values.length - 1) : 0;
    const points = values.map((item, index) => {
      const x = SPARK_PAD + index * step;
      const y = SPARK_HEIGHT - SPARK_PAD - ((item - min) / range) * (SPARK_HEIGHT - SPARK_PAD * 2);

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const endX = points[points.length - 1].split(',')[0];
    const baselineY = String(SPARK_HEIGHT - SPARK_PAD);
    const area = `M ${points[0]} L ${points.slice(1).join(' L ')} L ${endX} ${baselineY} L ${SPARK_PAD} ${baselineY} Z`;

    return { area, points };
  });
  const pointsText = computed(() => geometry.value.points.join(' '));
  const areaPath = computed(() => (fillValue.value ? geometry.value.area : ''));
  const areaDisplay = computed(() =>
    fillValue.value && geometry.value.points.length > 0 ? 'block' : 'none'
  );

  return vNode((api) => {
    api.data = (next) => {
      if (next === undefined) {
        return dataState.value;
      }

      dataState.value = Array.isArray(next) ? next.slice() : [];
      return api;
    };

    api.fill = (next) => {
      if (next === undefined) {
        return fillValue.value;
      }

      fillState.value = next;
      return api;
    };

    api.strokeWidth = (next) => {
      if (next === undefined) {
        return strokeValue.value;
      }

      strokeState.value = next;
      return api;
    };

    api.tone = (next) => {
      if (next === undefined) {
        return toneValue.value;
      }

      toneState.value = next;
      return api;
    };

    // 结构（R2）：视图根就是 `<svg>`；静态样式在 CSS（R5），随状态变的走绑定（R6）
    return svg(
      {
        ...elementConfig,
        attrs: { preserveAspectRatio: 'none', viewBox: '0 0 100 30', ...restAttrs },
        style: { ...restStyle },
        vn: 'VSparkline'
      },
      (root) => {
        // 子工厂自己把子节点挂到根上（返回值是父节点，别再 `root.child(…)` 包一层）
        root.path({
          attrs: { d: areaPath },
          style: { display: areaDisplay, fill: toneColor },
          vn: 'VSparklineArea'
        });
        root.polyline({
          attrs: { points: pointsText },
          style: { stroke: toneColor, strokeWidth: strokeText },
          vn: 'VSparklineLine'
        });
      }
    );
  });
}

export const vSparkline = createComponentShortcut(VSparkline, { props: true });
