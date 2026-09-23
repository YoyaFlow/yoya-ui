import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { button, span } from '../html/index.js';
import { createComponentShortcut, normalizeChildren } from '../components/shared.js';

const positionPresets = new Set(['bottom-left', 'bottom-right', 'top-left', 'top-right']);

/**
 * vFloatButton 悬浮按钮：圆形操作入口，支持图标、扩展标签和固定定位。
 */
/**
 * 悬浮按钮（形态 B）：圆形操作入口，支持图标、扩展标签和固定定位。
 *
 * - 静态样式（形状 / 尺寸档 / 变体配色 / 固定定位四档 / 禁用态）全在 `yoya.ui.css`（R5）：
 *   JS 只写 `data-*` 状态与两个内容位；
 * - 图标位 / 标签位是**内容通道**（`rebuildable()` 区域 + `icon()` / `label()` 整体替换）；
 *   "有没有内容"看两个来源（内容框实况 + 写入标记），不缓存结构（R6 / 47 条）。
 */
export function VFloatButton({
  children,
  disabled = false,
  fixed,
  icon,
  label,
  position,
  size = 'medium',
  text,
  variant = 'primary',
  ...rest
} = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;
  const variantState = asSignal(variant);
  const sizeState = asSignal(size);
  const disabledState = asSignal(disabled);
  const fixedState = asSignal(Boolean(fixed));
  const positionState = asSignal(positionPresets.has(position) ? position : null);
  // 内容写入标记：命令写完内容后让"有没有内容"的绑定重新求值（结构读不能进 computed）
  const iconVersion = ref(0);
  const labelVersion = ref(0);
  let iconValue = icon;
  let labelValue = label ?? text ?? children;

  const variantValue = computed(() => variantState.value || 'primary');
  const sizeValue = computed(() => sizeState.value || 'medium');
  const disabledValue = computed(() => Boolean(disabledState.value));
  const fixedValue = computed(() => Boolean(fixedState.value));
  const positionValue = computed(() => positionState.value);
  // 固定定位只在「固定 + 有档位」时生效（CSS 按 data-fixed / data-position 命中）
  const fixedKey = computed(() =>
    fixedValue.value && positionValue.value ? positionValue.value : null
  );

  const iconBox = span({ vn: 'VFloatButtonIcon' }, (box) => {
    box.rebuildable();
    box.child(normalizeChildren(iconValue));
  });
  const labelBox = span({ vn: 'VFloatButtonLabel' }, (box) => {
    box.rebuildable();
    box.child(normalizeChildren(labelValue));
  });

  const hasIcon = () => {
    iconVersion.value;
    return iconBox.children().length > 0 || iconBox.textContent() !== '';
  };
  const hasLabel = () => {
    labelVersion.value;
    return labelBox.children().length > 0 || labelBox.textContent() !== '';
  };

  return vNode((api) => {
    api.icon = (content) => {
      iconValue = content;
      iconBox.rebuild();
      iconVersion.value += 1;
      return api;
    };

    api.label = (content) => {
      labelValue = content;
      labelBox.rebuild();
      labelVersion.value += 1;
      return api;
    };

    api.content = (content) => api.label(content);
    api.text = (content) => api.label(content);

    // 位置参数里的字符串 / 数字：迁移前走 `_setupFloatButton(setup)` 的兜底分支 = 标签
    // （组件化后位置参数回落到"视图根的 setup 分派"，不回构造函数，所以要显式补这一条）
    api.setupString = (value) => api.label(value);

    api.variant = (next) => {
      if (next === undefined) {
        return variantValue.value;
      }

      variantState.value = next;
      return api;
    };

    api.type = (next) => (next === undefined ? variantValue.value : api.variant(next));

    api.size = (next) => {
      if (next === undefined) {
        return sizeValue.value;
      }

      sizeState.value = next;
      return api;
    };

    api.disabled = (next) => {
      if (next === undefined) {
        return disabledValue.value;
      }

      disabledState.value = next;
      return api;
    };

    /** `fixed()` 无参 = 打开（迁移前的默认参数口径）。 */
    api.fixed = (next = true) => {
      fixedState.value = next;
      return api;
    };

    api.position = (next) => {
      if (next === undefined) {
        return positionValue.value;
      }

      positionState.value = positionPresets.has(next) ? next : null;
      return api;
    };

    return button(
      {
        ...elementConfig,
        attrs: { type: 'button', ...restAttrs },
        'aria-disabled': computed(() => (disabledValue.value ? 'true' : null)),
        'data-fixed': computed(() => (fixedValue.value ? 'true' : null)),
        'data-icon': () => (hasIcon() ? 'true' : null),
        'data-label': () => (hasLabel() ? 'true' : null),
        'data-position': fixedKey,
        'data-size': sizeValue,
        'data-variant': variantValue,
        disabled: computed(() => (disabledValue.value ? true : null)),
        style: restStyle ?? {},
        vn: 'VFloatButton'
      },
      (root) => root.child(iconBox, labelBox)
    );
  });
}

export const vFloatButton = createComponentShortcut(VFloatButton, { props: true });
