import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { div } from '../html/index.js';
import { createComponentShortcut } from '../components/shared.js';

/**
 * 瀑布流容器（票 15 §4；2026-09-23 按组件写法重写）。
 *
 * - 身份 = 根上的 `vn: 'VMasonry'`（`yoya-component` / `yoya-vmasonry` 退场）；
 * - **R5**：静态样式（`box-sizing` / `width: 100%`）在 `yoya.ui.css`；列数 / 间距 / 最小列宽走
 *   **CSS 变量绑定**（`--yoya-masonry-columns` / `--yoya-masonry-gap` / `--yoya-masonry-column-width`），
 *   几何映射写在 CSS 规则里（JS 不拼样式字符串）；`data-columns` 与 `data-column-mode` 是状态位；
 * - props 进参数表（`function VMasonry({ columns, gap, minColumnWidth, ...rest })`），句柄 props 是活值，
 *   归一（正整数 / 非负间距 / 正宽度）放在读时的 `computed`。
 */

const DEFAULT_COLUMNS = 3;
const DEFAULT_GAP = 16;

export function VMasonry({
  columns = DEFAULT_COLUMNS,
  gap = DEFAULT_GAP,
  minColumnWidth = null,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  const columnsState = asSignal(columns);
  const gapState = asSignal(gap);
  const minColumnWidthState = asSignal(minColumnWidth);

  const columnsValue = computed(() => {
    const parsed = Math.floor(Number(columnsState.value));
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_COLUMNS;
  });
  const gapValue = computed(() => {
    const parsed = Number(gapState.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_GAP;
  });
  const minColumnWidthValue = computed(() => {
    const parsed = Number(minColumnWidthState.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });
  const responsiveAttr = computed(() => (minColumnWidthValue.value === null ? null : 'responsive'));

  return vNode((api) => {
    api.columns = (value) => {
      if (value === undefined) {
        return columnsValue.value;
      }

      columnsState.value = value;
      return api;
    };

    api.gap = (value) => {
      if (value === undefined) {
        return gapValue.value;
      }

      gapState.value = value;
      return api;
    };

    api.minColumnWidth = (value) => {
      if (value === undefined) {
        return minColumnWidthValue.value;
      }

      minColumnWidthState.value = value;
      return api;
    };

    return div(
      {
        ...elementConfig,
        attrs: { ...restAttrs },
        'data-column-mode': responsiveAttr,
        'data-columns': computed(() => String(columnsValue.value)),
        style: {
          '--yoya-masonry-column-width': computed(() =>
            minColumnWidthValue.value === null ? 'auto' : `${minColumnWidthValue.value}px`
          ),
          '--yoya-masonry-columns': computed(() => String(columnsValue.value)),
          '--yoya-masonry-gap': computed(() => `${gapValue.value}px`)
        },
        vn: 'VMasonry'
      },
      (root) => root
    );
  });
}

export const vMasonry = createComponentShortcut(VMasonry, { props: true });
