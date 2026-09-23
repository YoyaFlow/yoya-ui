import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { div, span } from '../html/index.js';
import { createComponentShortcut } from '../components/shared.js';

/**
 * 骨架屏（票 15 §4；2026-09-23 由"类当组件"（形态 C）重写成 **B 形态 vNode**）。
 *
 * - **结构**：`div[VSkeleton] > span[VSkeletonBar | VSkeletonAvatar | VSkeletonBlock]…`——
 *   占位块是**按 variant / rows 派生的数据**，用 `keyed` 对账（`variant` / `rows` / `barHeight`
 *   变化只增删差分块，不是"清空整棵子树重建"）；
 * - **状态 → 视图全是读值绑定**：`data-variant` / `data-active` / `data-motion` / `aria-hidden`
 *   与三个 CSS 变量（`--yoya-skeleton-gap` / `-bar-height` / `-avatar-size`）都由 `computed` 派生，
 *   命令只写状态；`active: false` 时占位块集合为空（引擎把差的块销毁），与迁移前"销毁占位、
 *   留下真实内容"同口径；
 * - 静态样式 / 闪烁动画 / `prefers-reduced-motion` 兜底都在 `yoya.ui.css`（R5），
 *   JS 只写状态与变量；props 进参数表，句柄 props 是活值。
 */

const SKELETON_VARIANTS = new Set(['paragraph', 'avatar', 'block']);

export function VSkeleton({
  active = true,
  avatarSize = 40,
  barHeight = 20,
  gap = 10,
  motion = 'auto',
  rows = 3,
  variant = 'paragraph',
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // props 全是数据：句柄原样收下，归一（白名单 / 正整数 / 非负）放在读时的 `computed`
  const variantState = asSignal(variant);
  const rowsState = asSignal(rows);
  const barHeightState = asSignal(barHeight);
  const gapState = asSignal(gap);
  const avatarSizeState = asSignal(avatarSize);
  const activeState = asSignal(active);
  const motionState = asSignal(motion);

  const variantValue = computed(() =>
    SKELETON_VARIANTS.has(variantState.value) ? variantState.value : 'paragraph'
  );
  const rowsValue = computed(() => {
    const parsed = Math.floor(Number(rowsState.value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
  });
  const barHeightValue = computed(() => {
    const parsed = Number(barHeightState.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  });
  const gapValue = computed(() => {
    const parsed = Number(gapState.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
  });
  const avatarSizeValue = computed(() => {
    const parsed = Number(avatarSizeState.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
  });
  const activeValue = computed(() => Boolean(activeState.value));
  const motionValue = computed(() => (motionState.value === 'always' ? 'always' : 'auto'));

  /** 占位块：按 variant / rows 派生（段落 = rows 行，最后一行 60% 宽）；`active: false` 时为空表。 */
  const placeholders = computed(() => {
    if (!activeValue.value) {
      return [];
    }

    if (variantValue.value === 'avatar') {
      return [{ key: 'avatar', kind: 'avatar' }];
    }

    if (variantValue.value === 'block') {
      return [{ key: 'block', kind: 'block' }];
    }

    return Array.from({ length: rowsValue.value }, (_, index) => ({
      index,
      key: `bar-${index}`,
      kind: 'bar'
    }));
  });

  /** 一块占位：身份按 kind 给，几何（宽 / 高）走 CSS 变量。 */
  const renderPlaceholder = (row) => {
    if (row.kind === 'avatar') {
      return span({ vn: 'VSkeletonAvatar' });
    }

    if (row.kind === 'block') {
      return span({ vn: 'VSkeletonBlock' });
    }

    return span({
      style: {
        '--yoya-skeleton-bar-width': computed(() =>
          row.index === rowsValue.value - 1 ? '60%' : '100%'
        )
      },
      vn: 'VSkeletonBar'
    });
  };

  return vNode((api) => {
    api.variant = (value) => {
      if (value === undefined) {
        return variantValue.value;
      }

      variantState.value = value;
      return api;
    };

    api.rows = (value) => {
      if (value === undefined) {
        return rowsValue.value;
      }

      rowsState.value = value;
      return api;
    };

    api.barHeight = (value) => {
      if (value === undefined) {
        return barHeightValue.value;
      }

      barHeightState.value = value;
      return api;
    };

    api.gap = (value) => {
      if (value === undefined) {
        return gapValue.value;
      }

      gapState.value = value;
      return api;
    };

    api.avatarSize = (value) => {
      if (value === undefined) {
        return avatarSizeValue.value;
      }

      avatarSizeState.value = value;
      return api;
    };

    api.active = (value) => {
      if (value === undefined) {
        return activeValue.value;
      }

      activeState.value = value;
      return api;
    };

    api.motion = (value) => {
      if (value === undefined) {
        return motionValue.value;
      }

      motionState.value = value;
      return api;
    };

    return div(
      {
        ...elementConfig,
        attrs: {
          ...restAttrs,
          'aria-hidden': computed(() => (activeValue.value ? 'true' : null))
        },
        'data-active': computed(() => (activeValue.value ? 'true' : 'false')),
        'data-motion': motionValue,
        'data-variant': variantValue,
        style: {
          '--yoya-skeleton-avatar-size': computed(() => `${avatarSizeValue.value}px`),
          '--yoya-skeleton-bar-height': computed(() => `${barHeightValue.value}px`),
          '--yoya-skeleton-gap': computed(() => `${gapValue.value}px`)
        },
        vn: 'VSkeleton'
      },
      (root) => root.keyed(placeholders, (row) => row.key, renderPlaceholder)
    );
  });
}

export const vSkeleton = createComponentShortcut(VSkeleton, { props: true });
