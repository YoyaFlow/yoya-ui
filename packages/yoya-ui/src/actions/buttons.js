import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { hasComponentIdentity } from '@yoyaflow/yoya-core/internal/core/node.js';
import { div } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  createListItemKey,
  isPlainObject,
  resolveTextValue
} from '../components/shared.js';
import { vButton } from './button.js';

/**
 * 按钮组（票 15 §4；2026-09-23 按容器写法重写，参考实现 `VTable` / `VSteps`）。
 *
 * - **结构**：`div[VButtons](role=group, data-joined) > [vn~='VButton']…`——按钮由一份 `ref([])` + **`keyed` 对账**
 *   渲染（`options` / `vButton(...)` 都只写那份数据，增删改排序交给引擎）；
 * - **容器态走句柄下推**：组持有 `variant`（基准变体）/ `size` / `selectable` / `selected` / `disabled` 几个句柄，
 *   按钮 `track(context)` 后自己派生 `data-selected` / `aria-pressed` / 生效 variant——容器**不遍历每一项**、
 *   也不替按钮写状态（与 `VSteps` / `VTabs` 同口径）；
 * - **R5**：容器的 `display / gap / flex-wrap / vertical-align` 与"拼接模式"（`gap: 0` / 首尾圆角 / 中间直角 /
 *   `-1px` 叠边 / 选中项 `z-index`）全在 `yoya.ui.css` 的 `[vn~='VButtons'][data-joined='true']` 规则里，
 *   JS 不写行内样式；
 * - props 进参数表（`function VButtons({ ... })`），`...rest` 照 JSX 摊进根元素工厂；匿名 `child(button)` 渲染
 *   但不进按钮账（与 16 号第 7 条同口径：一个容器只走一条投递通道）。
 */

const DEFAULT_VARIANT = 'secondary';
const DEFAULT_SIZE = 'medium';

const asList = (value) =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/** 按钮组 props：`options` / `children` 都是按钮数据（字符串 / 按钮句柄 / 选项对象）。 */
export function VButtons({
  change,
  children: childOptions,
  disabled,
  joined,
  options,
  selectable,
  size,
  value,
  variant,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // props 全是数据：句柄原样收下，归一放在读时的派生上
  const variantState = asSignal(variant ?? null);
  const sizeState = asSignal(size ?? null);
  const selectableState = asSignal(selectable);
  const selectedState = asSignal(value ?? null);
  const joinedState = asSignal(joined);
  const disabledState = asSignal(disabled);
  const changeState = ref(null);

  const variantValue = computed(() => variantState.value || DEFAULT_VARIANT);
  const sizeValue = computed(() => sizeState.value || DEFAULT_SIZE);
  const selectedValue = computed(() =>
    selectedState.value === undefined ? null : selectedState.value
  );
  const joinedAttr = computed(() => (joinedState.value ? 'true' : null));

  /** 按钮：一份数据源（结构由 keyed 对账；`options()` 读回同一份）。 */
  const buttonNodes = ref([]);
  const keyOfButton = createListItemKey('button-group-item');

  return vNode((api, self) => {
    /**
     * 容器态句柄：按钮 `track(context)` 拿到它们，自己派生选中态 / 生效变体 / 尺寸 / 禁用
     * （容器不遍历每一项，也不替按钮写状态）。
     */
    const context = {
      baseVariant: variantValue,
      disabled: disabledState,
      selectable: selectableState,
      selected: selectedValue,
      size: sizeValue
    };

    /** 建 / 复用一份按钮，并把容器态句柄交给它、接上单选点击。 */
    const wireButton = (node) => {
      const button = normalizeButton(node);

      if (buttonNodes.value.includes(button)) {
        return button;
      }

      button.track?.(context);
      button.on?.('click', () => {
        if (!selectableState.value) {
          return;
        }

        const next = button.valueText?.() ?? button.label?.();

        if (next === selectedValue.value) {
          return;
        }

        api.value(next);

        if (typeof changeState.value === 'function') {
          // 句柄交给使用方的是**组件节点**（与迁移前 `_componentHandle` 同口径）
          changeState.value(next, self.node());
        }
      });

      return button;
    };

    /** 追加一份按钮：只写数据，结构交给 keyed 对账；返回按钮句柄（与迁移前 `container.vButton(…)` 一致）。 */
    const appendButton = (entry) => {
      const button = createButton(entry);

      if (!buttonNodes.value.includes(button)) {
        buttonNodes.value = [...buttonNodes.value, button];
      }

      return button;
    };

    /** 选项对象 → props（`value` / `variant` / `size` 是按钮自己的显式值，压过组里的基准）。 */
    const createButton = (entry) => {
      if (isButton(entry)) {
        return wireButton(entry);
      }

      if (typeof entry === 'string' || typeof entry === 'number') {
        return wireButton(vButton(entry));
      }

      if (isPlainObject(entry)) {
        const {
          children,
          disabled: entryDisabled,
          label,
          size: entrySize,
          text,
          value: entryValue,
          variant: entryVariant,
          ...elementConfig
        } = entry;

        return wireButton(
          vButton({
            ...elementConfig,
            children: label ?? text ?? children,
            disabled: entryDisabled,
            size: entrySize,
            value: entryValue === undefined ? undefined : resolveTextValue(entryValue),
            variant: entryVariant
          })
        );
      }

      return wireButton(vButton(entry));
    };

    api.vButton = (setup) => appendButton(setup);

    api.options = (items) => {
      if (items === undefined) {
        return buttonNodes.value.slice();
      }

      buttonNodes.value = asList(items).map(createButton);
      return api;
    };

    api.variant = (next) => {
      if (next === undefined) {
        return variantValue.value;
      }

      variantState.value = next || null;
      return api;
    };

    api.size = (next) => {
      if (next === undefined) {
        return sizeValue.value;
      }

      sizeState.value = next || null;
      return api;
    };

    /** 单选：`true` 写入（与迁移前同口径：无参 = 打开）。 */
    api.selectable = (next = true) => {
      selectableState.value = Boolean(next);
      return api;
    };

    api.value = (next) => {
      if (next === undefined) {
        return selectedValue.value;
      }

      selectedState.value = next;
      return api;
    };

    api.change = (handler) => {
      if (handler === undefined) {
        return changeState.value;
      }

      changeState.value = typeof handler === 'function' ? handler : null;
      return api;
    };

    /** 拼接模式：`true` 写入（与迁移前同口径）；几何全在 CSS 规则里（R5）。 */
    api.joined = (next = true) => {
      joinedState.value = Boolean(next);
      return api;
    };

    /** 整组禁用：写组状态，按钮自己派生（不遍历每一项）。 */
    api.disabled = (next) => {
      disabledState.value = Boolean(next);
      return api;
    };

    api.setupString = (value) => {
      api.options([value]);
      return api;
    };

    if (change !== undefined) {
      api.change(change);
    }

    const initialOptions = options ?? childOptions;

    if (initialOptions !== undefined) {
      api.options(initialOptions);
    }

    return div(
      {
        ...elementConfig,
        attrs: { ...restAttrs, role: 'group' },
        'data-joined': joinedAttr,
        vn: 'VButtons'
      },
      (root) => root.keyed(buttonNodes, keyOfButton, (node) => node)
    );
  });
}

export const vButtons = createComponentShortcut(VButtons, { props: true });

/** 按钮判定走身份事实（多值身份也算：`VGlowButton VButton`）。 */
function isButton(value) {
  return Boolean(value) && hasComponentIdentity(value, 'VButton');
}

/** 按钮归一：已经是按钮组件就原样用，其余按按钮的分派建一份。 */
function normalizeButton(value) {
  return isButton(value) ? value : vButton(value);
}
