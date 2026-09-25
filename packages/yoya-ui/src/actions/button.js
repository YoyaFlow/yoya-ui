import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { ViewNode, vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { button as buttonFactory, span } from '@yoyaflow/yoya-core/html';
import { createComponentShortcut, resolveTextValue } from '../components/shared.js';

/**
 * 复合按钮（票 15 §4；2026-09-23 按组件写法重写，参考实现 `VBadge` / `VAnchorItem`）。
 *
 * - **结构**：`button[VButton](type, data-variant, data-size, data-interaction) >
 *   span[VButtonSpinner] + span[VButtonLabel]`；两个部件盒常驻（构造期节点字段退场），
 *   **标签盒同时是匿名占位**（`vn_slot: ''`）——位置参数 / `child()` 的内容落进标签盒；
 * - **状态 → 视图全是读值绑定**：`variant` / `size` / `disabled` / `loading` / `formType` 写句柄，
 *   属性与加载文案都由 `computed` 派生；交互态（hover / press / focus）由元素事件写状态、派生
 *   `data-interaction`（优先级 disabled > active > focus > hover，与迁移前 `_interactionState()` 同口径）；
 * - 命令只收文本（节点标签走 props / 位置参数，与 `VAnchorItem.title` 同口径）；静态样式在
 *   `yoya.ui.css`（R5，选择器 `[vn~='VButton*']`），JS 不写任何行内样式；
 * - 单选联动（`VButtons`）走**容器态句柄下推**：按钮 `track(context)` 拿到
 *   `{ baseVariant, selected, selectable }` 后自己派生 `data-selected` / `aria-pressed` / 生效 variant——
 *   容器不遍历结构、不替按钮写状态。
 */

const DEFAULT_VARIANT = 'secondary';
const DEFAULT_SIZE = 'medium';
const FORM_TYPES = new Set(['button', 'submit', 'reset']);

const textOf = (value) => resolveTextValue(value);

/** 按钮 props：`label` / `text` / `children` 三键同义（节点在构建期落位到标签盒）。 */
export function VButton({
  children: labelOption,
  disabled,
  formType,
  label,
  loading,
  size,
  text,
  type,
  value,
  variant,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // 标签：节点在构建期落位；文本 / 句柄是活值
  const initialLabel = label ?? text ?? labelOption ?? null;
  const labelNode = initialLabel instanceof ViewNode ? initialLabel : null;
  const labelState = asSignal(labelNode === null ? initialLabel : null);
  const labelText = computed(() => textOf(labelState.value));

  // 其余 props 全是数据：句柄原样收下，归一（默认值 / 布尔 / 白名单）放在读时的派生上
  const variantState = asSignal(variant ?? type ?? null);
  const sizeState = asSignal(size ?? null);
  const disabledState = asSignal(disabled);
  const loadingState = asSignal(loading);
  const formTypeState = asSignal(formType ?? 'button');
  const valueState = asSignal(value ?? null);

  /** 容器（`VButtons`）给的联动上下文；脱离容器时下面各派生回落到自己的状态。 */
  const context = ref(null);

  const variantValue = computed(() => variantState.value || DEFAULT_VARIANT);
  const sizeValue = computed(() => sizeState.value || context.value?.size?.value || DEFAULT_SIZE);
  const disabledValue = computed(
    () => Boolean(disabledState.value) || Boolean(context.value?.disabled?.value)
  );
  const loadingValue = computed(() => Boolean(loadingState.value));
  const formTypeValue = computed(() =>
    FORM_TYPES.has(formTypeState.value) ? formTypeState.value : 'button'
  );
  const loadingText = computed(() => (loadingValue.value ? '...' : ''));
  const valueText = computed(() => {
    const explicit = valueState.value;
    return explicit === null || explicit === undefined ? null : textOf(explicit);
  });

  /** 交互态三个位（元素事件只写这三份状态，`data-interaction` 由它们派生）。 */
  const hovered = ref(false);
  const focused = ref(false);
  const pressed = ref(false);
  const interactionAttr = computed(() => {
    if (disabledValue.value) {
      return 'disabled';
    }

    if (pressed.value) {
      return 'active';
    }

    if (focused.value) {
      return 'focus';
    }

    return hovered.value ? 'hover' : null;
  });

  const ownValue = computed(() => valueText.value ?? labelText.value);
  const selected = computed(() => {
    const group = context.value;
    return Boolean(group?.selectable?.value) && ownValue.value === group.selected.value;
  });
  const effectiveVariant = computed(() => {
    if (selected.value) {
      return 'primary';
    }

    return variantState.value || context.value?.baseVariant?.value || DEFAULT_VARIANT;
  });
  const selectedAttr = computed(() => (selected.value ? 'true' : null));

  return vNode((api) => {
    api.label = (next) => {
      if (next === undefined) {
        return labelText.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vButton.label(node)：标签命令只收文本，节点标签请在构建期用 props.label（或位置参数）给。'
        );
      }

      labelState.value = next ?? null;
      return api;
    };

    api.content = (next) => api.label(next);
    api.text = (next) => api.label(next);

    /** 变体：`type` / `variant` 两键同义。 */
    api.type = (next) => {
      if (next === undefined) {
        return variantValue.value;
      }

      variantState.value = next ?? null;
      return api;
    };

    api.variant = (next) => api.type(next);

    api.formType = (next) => {
      if (next === undefined) {
        return formTypeValue.value;
      }

      formTypeState.value = next ?? null;
      return api;
    };

    api.size = (next) => {
      if (next === undefined) {
        return sizeValue.value;
      }

      sizeState.value = next ?? null;
      return api;
    };

    /** 禁用 / 加载：与迁移前同口径——**写方法**（无参不是读），读态走 `isDisabled()` / `isLoading()`。 */
    api.disabled = (next) => {
      const nextDisabled = Boolean(next);
      disabledState.value = nextDisabled;

      if (nextDisabled) {
        hovered.value = false;
        pressed.value = false;
      }

      return api;
    };

    api.isDisabled = () => disabledValue.value;

    api.loading = (next) => {
      loadingState.value = Boolean(next);
      return api;
    };

    api.isLoading = () => loadingValue.value;

    /** 单选联动的值（`VButtons` 用；不填时按标签文本比对）。 */
    api.value = (next) => {
      if (next === undefined) {
        return valueText.value;
      }

      valueState.value = next ?? null;
      return api;
    };

    /** 派生的比对值：显式 value 优先，否则标签文本（容器与探针用同一个口径）。 */
    api.valueText = () => ownValue.value;

    /** 容器给的联动上下文（与 `VStep.track` 同口径的内部协议）。 */
    api.track = (next) => {
      context.value = next ?? null;
      return api;
    };

    /** 字符串 / 数字 = 标签（与迁移前 `_setupButton` 的兜底分支同口径）。 */
    api.setupString = (value) => api.label(value);

    return buttonFactory(
      {
        ...elementConfig,
        attrs: {
          ...restAttrs,
          'aria-busy': computed(() => (loadingValue.value ? 'true' : null)),
          'aria-pressed': selectedAttr,
          disabled: computed(() => (disabledValue.value ? true : null)),
          type: formTypeValue
        },
        'data-interaction': interactionAttr,
        'data-loading': computed(() => (loadingValue.value ? 'true' : null)),
        'data-selected': selectedAttr,
        'data-size': sizeValue,
        'data-value': valueText,
        'data-variant': effectiveVariant,
        vn: 'VButton'
      },
      (root) => {
        root.on('mouseenter', () => {
          if (!disabledValue.value) {
            hovered.value = true;
          }
        });
        root.on('mouseleave', () => {
          hovered.value = false;
          pressed.value = false;
        });
        root.on('mousedown', (event) => {
          if (!disabledValue.value && event.button === 0) {
            pressed.value = true;
          }
        });
        root.on('mouseup', () => {
          pressed.value = false;
        });
        root.on('focus', () => {
          if (!disabledValue.value) {
            focused.value = true;
          }
        });
        root.on('blur', () => {
          focused.value = false;
          pressed.value = false;
        });
        root.on('keydown', (event) => {
          if (!disabledValue.value && ['Enter', ' ', 'Spacebar'].includes(event.key)) {
            pressed.value = true;
          }
        });
        root.on('keyup', (event) => {
          if (['Enter', ' ', 'Spacebar'].includes(event.key)) {
            pressed.value = false;
          }
        });

        root.child(
          // 加载指示：内容 / 显隐都是状态（CSS 里已有 `[data-loading='true']` 规则）
          span({ attrs: { 'aria-hidden': 'true' }, vn: 'VButtonSpinner' }, (box) =>
            box.child(vText(loadingText))
          ),

          // 标签盒：props / 命令的文本与节点标签落在这里
          span({ vn: 'VButtonLabel' }, (box) => {
            if (labelNode !== null) {
              box.child(labelNode);
            }

            box.child(vText(labelText));
          })
        );
      }
    );
  });
}

export const vButton = createComponentShortcut(VButton, { props: true });
