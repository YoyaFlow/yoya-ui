import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { div } from '@yoyaflow/yoya-core/html';
import { svg } from '@yoyaflow/yoya-core/svg';
import { createComponentShortcut, themeValue } from '../components/shared.js';

const ringTones = {
  danger: themeValue('color-danger', '#dc2626'),
  neutral: themeValue('color-text-secondary', '#64748b'),
  primary: themeValue('color-primary', '#2563eb'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));

/**
 * 环形统计（形态 B）：圆环进度 + 中心数值 / 标签。
 *
 * 照 `AGENTS.md`「Component Writing Rules」写：一个函数 / 一棵树（R1 / R2）、props 参数表解构 +
 * `...rest` 摊进根元素（R3）、属性与样式进工厂参数（R4）、**静态样式在 `yoya.ui.css`**（R5）、
 * 读句柄的几何派生用 `computed`（R6）、命令只改状态并在未落地时收口（R8 / R9）、
 * 尺寸这类几何走 CSS 变量（R10）。
 *
 * 圆环的几何是 **SVG 属性**（`viewBox` / `r` / `stroke-dasharray` / `transform`），CSS 表达不了，
 * 所以它们留在 JS 的读值绑定里；颜色、字号、定位这些样式在 CSS。
 */
export function VRingStat({
  label,
  percent = 0,
  size = 120,
  strokeWidth = 10,
  tone = 'primary',
  value,
  ...rest
} = {}) {
  // 归一化的 props 也要保活：**状态**是"句柄原样 / 普通值包 ref"，归一放在**读时**的 computed 上
  const percentState = asSignal(percent);
  const sizeState = asSignal(size);
  const strokeState = asSignal(strokeWidth);
  const toneState = asSignal(tone);
  const percentValue = computed(() => clampPercent(percentState.value));
  const sizeValue = computed(() => Number(sizeState.value) || 120);
  const stroke = computed(() => Number(strokeState.value) || 10);
  const toneValue = computed(() => toneState.value || 'primary');
  const explicitValue = ref(value !== undefined);
  const valueContent = asSignal(value);
  const labelContent = asSignal(label);

  // 几何派生（读句柄 → computed）
  const center = computed(() => sizeValue.value / 2);
  const radius = computed(() => sizeValue.value / 2 - stroke.value / 2 - 2);
  const circumference = computed(() => 2 * Math.PI * radius.value);
  const dashOffset = computed(() => circumference.value * (1 - percentValue.value / 100));
  const viewBox = computed(() => `0 0 ${sizeValue.value} ${sizeValue.value}`);
  const rotate = computed(() => `rotate(-90 ${center.value} ${center.value})`);
  const sizeText = computed(() => `${sizeValue.value}px`);
  const toneColor = computed(() => ringTones[toneValue.value] || toneValue.value);
  const valueText = computed(() =>
    explicitValue.value ? String(valueContent.value ?? '') : `${Math.round(percentValue.value)}%`
  );
  const labelText = computed(() => labelContent.value ?? '');

  return vNode((api) => {
    api.percent = (next) => {
      if (next === undefined) {
        return percentValue.value;
      }

      percentState.value = clampPercent(next);
      return api;
    };

    api.value = (next) => {
      if (next === undefined) {
        return valueText.value;
      }

      explicitValue.value = true;
      valueContent.value = next;
      return api;
    };

    api.label = (next) => {
      if (next === undefined) {
        return labelContent.value;
      }

      labelContent.value = next;
      return api;
    };

    api.size = (next) => {
      if (next === undefined) {
        return sizeValue.value;
      }

      sizeState.value = next;
      return api;
    };

    api.strokeWidth = (next) => {
      if (next === undefined) {
        return stroke.value;
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

    // 结构（R2）：一个 return 装下整棵树；样式 / 属性在工厂参数里（R4），子节点在回调里往下嵌
    return div(
      { ...rest, style: { '--yoya-ring-stat-size': sizeText }, vn: 'VRingStat' },
      (root) => {
        root.child(
          svg({ attrs: { viewBox }, vn: 'VRingStatChart' }, (chart) => {
            // 静态描边在 CSS；进度圆环的描边随 tone 走
            chart.circle({
              attrs: {
                cx: center,
                cy: center,
                fill: 'none',
                r: radius,
                'stroke-width': stroke
              },
              vn: 'VRingStatTrack'
            });
            chart.circle({
              attrs: {
                cx: center,
                cy: center,
                fill: 'none',
                r: radius,
                'stroke-dasharray': circumference,
                'stroke-dashoffset': dashOffset,
                'stroke-linecap': 'round',
                'stroke-width': stroke,
                transform: rotate
              },
              style: { stroke: toneColor },
              vn: 'VRingStatCircle'
            });
          }),

          div({ vn: 'VRingStatCenter' }, (centerBox) => {
            centerBox.child(
              div({ vn: 'VRingStatValue' }, (box) =>
                box.child(vText(valueText).mountable(computed(() => valueText.value !== '')))
              ),
              div({ vn: 'VRingStatLabel' }, (box) =>
                box.child(vText(labelText).mountable(computed(() => labelText.value !== '')))
              )
            );
          })
        );
      }
    );
  });
}

export const vRingStat = createComponentShortcut(VRingStat, { props: true });
