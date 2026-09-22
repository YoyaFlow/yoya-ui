import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { vText } from '../core/index.js';
import { div, span } from '../html/index.js';
import { createComponentShortcut, themeValue } from '../components/shared.js';
import { vSparkline } from './sparkline.js';

/** 值位置上的活文本：`null` / `undefined` 统一成空串（句柄走的是文本通道，会 `String(...)`）。 */
const asText = (handle) => computed(() => handle.value ?? '');

/**
 * 趋势卡（形态 B）：标题 + 数值 + 单位 + 涨跌 + 迷你走势。
 *
 * 照 `AGENTS.md`「Component Writing Rules」写：一个函数 / 一棵树（R1 / R2）、props 参数表解构 +
 * `...rest` 摊进根元素（R3）、属性与样式进工厂参数（R4）、静态样式在 `yoya.ui.css`（R5）、
 * 读句柄的派生用 `computed`（R6）、命令只改数据（R8 / R9）。
 *
 * 两个地方值得注意：
 * - **涨跌颜色**是状态（`up`）驱动的 → `computed` + 行内 `color`（不是静态样式）；
 * - **内嵌的迷你走势组件**是"组件里的组件"，不是部件（R12）：`data()` / `tone()` 两个命令要转发
 *   给它 —— 转发写在**它旁边**（不需要提前声明空句柄），它的配置（含高度）进它自己的工厂参数。
 */
export function VTrendCard({ data, delta, title, tone, unit, up = true, value, ...rest } = {}) {
  const titleValue = asSignal(title);
  const valueValue = asSignal(value);
  const unitValue = asSignal(unit);
  const deltaValue = asSignal(delta);
  // 归一化的 props 也要保活：**状态**是"句柄原样 / 普通值包 ref"，**读**时才归一 ——
  // 直接在构建期 `Boolean(up)` 会把传进来的句柄吃成一个常量（静默丢活值）。
  const upState = asSignal(up);
  const upValue = computed(() => Boolean(upState.value));
  const deltaColor = computed(() =>
    upValue.value ? themeValue('color-success', '#16a34a') : themeValue('color-danger', '#dc2626')
  );

  return vNode((api) => {
    api.title = (next) => {
      if (next === undefined) {
        return titleValue.value;
      }

      titleValue.value = next ?? null;
      return api;
    };

    api.value = (next) => {
      if (next === undefined) {
        return valueValue.value;
      }

      valueValue.value = next ?? null;
      return api;
    };

    api.unit = (next) => {
      if (next === undefined) {
        return unitValue.value;
      }

      unitValue.value = next ?? null;
      return api;
    };

    api.delta = (next) => {
      if (next === undefined) {
        return deltaValue.value;
      }

      deltaValue.value = next ?? null;
      return api;
    };

    api.up = (next) => {
      if (next === undefined) {
        return upValue.value;
      }

      upState.value = Boolean(next);
      return api;
    };

    // 结构（R2）：一个 return 装下整棵树；静态样式在 CSS，随状态变的颜色写在参数里
    return div({ ...rest, vn: 'VTrendCard' }, (root) => {
      root.child(
        div({ vn: 'VTrendCardTitle' }, (box) => box.child(vText(asText(titleValue)))),

        div({ vn: 'VTrendCardValue' }, (box) => {
          box.child(
            vText(asText(valueValue)),
            span({ vn: 'VTrendCardUnit' }, (unitBox) => unitBox.child(vText(asText(unitValue))))
          );
        }),

        div({ vn: 'VTrendCardFooter' }, (footer) => {
          // 迷你走势：内嵌组件（不是部件）；配置走它自己的工厂参数，不要链式挂在外面
          const sparkline = vSparkline({ data, style: { height: '26px' }, tone });

          // 它的命令面在这里转发：命令定义在使用它的地方，不需要提前声明空句柄
          api.data = (next) => {
            if (next === undefined) {
              return sparkline.data();
            }

            sparkline.data(next);
            return api;
          };

          api.tone = (next) => {
            if (next === undefined) {
              return sparkline.tone();
            }

            sparkline.tone(next);
            return api;
          };

          footer.child(
            sparkline,
            div({ vn: 'VTrendCardDelta', style: { color: deltaColor } }, (box) =>
              box.child(vText(asText(deltaValue)))
            )
          );
        })
      );
    });
  });
}

export const vTrendCard = createComponentShortcut(VTrendCard, { props: true });
