import { asSignal, computed, ref } from '../core/signals/handle.js';
import { registerChildFactories } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import { vText } from '../core/index.js';
import { HtmlElementNode, button, div, input as inputTag, span } from '../html/index.js';
import { createComponentShortcut, resolveTextValue } from '../components/shared.js';

/**
 * 评分（形态 B，票 15 §4；2026-09-23 按「组件写法」口径重写 + R5）：
 *
 * - 结构一次写清：`div[VRate] > input[VRateInput] + div[VRateStars](> button[VRateStar](> base + fill))`；
 * - **星标列表按 `count` 用 `keyed` 对账**：`count / character / size` 变化只增删星标 / 改文本 / 改变量，
 *   不再 `replaceChildren` 整段重建（旧 `renderStars()` 退场）；
 * - **状态 → 视图全是读值绑定**：每颗星自己派生 `aria-checked` / `data-filled` / `data-half` / `tabindex`，
 *   填充比例只写 `--yoya-rate-fill` 变量（CSS 负责 `clip-path`）——`syncStars` / `syncState` / `syncInput` /
 *   `sync()` 四个集中快照全退场；
 * - **静态样式全在 `yoya.ui.css`**（R5，原来 5 块行内样式 + 状态几何）：星标几何走
 *   `--yoya-rate-size`，禁用态 / 只读态的光标、错误 / 聚焦的描边、空 / 满的颜色都走 `[data-*]` 规则；
 * - props 进参数表（`api.setupObject` 退场）；**值语义的能力声明** `isEmptyValue()` 保留
 *   （速率为 0 = 空值，跨模块走能力约定，不按组件身份分支，见 16 号清单第 32 条）。
 */

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

export function VRate({
  allowClear = true,
  allowHalf = false,
  character = '★',
  clearable,
  count = 5,
  disabled = false,
  error = false,
  max,
  name = '',
  readonly = false,
  required = false,
  size = 22,
  value = 0,
  ...rest
} = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;

  // 状态：句柄原样收下（props 给句柄就是活值），归一全部放在读时的派生上
  const valueState = asSignal(value);
  const countState = asSignal(count ?? max);
  const allowHalfState = asSignal(allowHalf);
  const allowClearState = asSignal(clearable ?? allowClear);
  const characterState = asSignal(character);
  const sizeState = asSignal(size);
  const nameState = asSignal(name);
  const disabledState = asSignal(disabled);
  const readonlyState = asSignal(readonly);
  const requiredState = asSignal(required);
  const errorState = asSignal(error);
  const hoverState = ref(0);
  const focusedState = ref(false);

  const countValue = computed(() => Math.max(1, Math.trunc(Number(countState.value)) || 1));
  const countText = computed(() => String(countValue.value));
  const allowHalfValue = computed(() => Boolean(allowHalfState.value));
  const allowClearValue = computed(() => Boolean(allowClearState.value));
  const disabledValue = computed(() => Boolean(disabledState.value));
  const readonlyValue = computed(() => Boolean(readonlyState.value));
  const requiredValue = computed(() => Boolean(requiredState.value));
  const errorValue = computed(() => Boolean(errorState.value));
  const focusedValue = computed(() => Boolean(focusedState.value));
  const characterText = computed(() => textOf(characterState.value) || '★');
  const sizeValue = computed(() => Math.max(12, Number(sizeState.value) || 22));
  const sizeText = computed(() => `${sizeValue.value}px`);
  const nameValue = computed(() => textOf(nameState.value) || null);
  const hoverValue = computed(() => Number(hoverState.value) || 0);

  /** 合法值：读数时归一（`allowHalf` / `count` 变化后值自己跟着走，命令不必再改值）。 */
  const normalizeValue = (input) => {
    let next = Number(input);

    if (!Number.isFinite(next)) {
      next = 0;
    }

    next = allowHalfValue.value ? Math.round(next * 2) / 2 : Math.round(next);
    return Math.max(0, Math.min(countValue.value, next));
  };

  const valueValue = computed(() => normalizeValue(valueState.value));
  const valueText = computed(() => String(valueValue.value));
  /** 展示值：悬停优先（指针预览），否则就是当前值。 */
  const displayValue = computed(() => (hoverValue.value > 0 ? hoverValue.value : valueValue.value));
  const activeStar = computed(() =>
    allowHalfValue.value && valueValue.value % 1 !== 0
      ? Math.ceil(valueValue.value)
      : Math.round(valueValue.value)
  );
  const hoverText = computed(() => (hoverValue.value > 0 ? String(hoverValue.value) : null));
  const stepText = computed(() => (allowHalfValue.value ? '0.5' : '1'));
  /** 星标列表：`count` 的派生（`keyed` 只增删差分，不整段重建）。 */
  const starIndices = computed(() =>
    Array.from({ length: countValue.value }, (_, index) => index + 1)
  );

  const starFillRatio = (starIndex, display) => {
    if (display >= starIndex) {
      return 1;
    }

    if (allowHalfValue.value && display === starIndex - 0.5) {
      return 0.5;
    }

    return 0;
  };

  const isChecked = (starIndex) =>
    valueValue.value === starIndex ||
    (allowHalfValue.value && valueValue.value === starIndex - 0.5);

  return vNode((api) => {
    const pointerValue = (starIndex, event) => {
      if (!allowHalfValue.value || !event) {
        return starIndex;
      }

      const rect = event.currentTarget?.getBoundingClientRect?.();

      if (rect?.width && event.offsetX < rect.width / 2) {
        return starIndex - 0.5;
      }

      return starIndex;
    };

    const emitChange = () => {
      view.emit('change', valueValue.value);
    };

    const setValue = (next, emit) => {
      const before = valueValue.value;
      hoverState.value = 0;
      valueState.value = next;

      if (emit && valueValue.value !== before) {
        emitChange();
      }

      return api;
    };

    const setHover = (starIndex, event) => {
      if (disabledValue.value || readonlyValue.value) {
        return;
      }

      hoverState.value = starIndex > 0 ? pointerValue(starIndex, event) : 0;
    };

    const selectStar = (starIndex, event) => {
      if (disabledValue.value || readonlyValue.value) {
        return;
      }

      let next = pointerValue(starIndex, event);

      if (allowClearValue.value && next === valueValue.value) {
        next = 0;
      }

      setValue(next, true);
    };

    const handleKeydown = (event) => {
      if (disabledValue.value || readonlyValue.value) {
        return;
      }

      const step = allowHalfValue.value ? 0.5 : 1;
      let next = null;

      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        next = valueValue.value + step;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        next = valueValue.value - step;
      } else if (event.key === 'Home') {
        next = allowHalfValue.value ? 0.5 : 1;
      } else if (event.key === 'End') {
        next = countValue.value;
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (hoverValue.value > 0) {
          selectStar(hoverValue.value);
        } else if (allowClearValue.value && valueValue.value > 0) {
          setValue(0, true);
        }

        event.preventDefault();
        return;
      }

      if (next === null) {
        return;
      }

      event.preventDefault();
      setValue(next, true);
    };

    /** 单颗星：自己派生填充比例与可聚焦性（星标由 `keyed` 按 count 对账，不重建）。 */
    const createStar = (starIndex) => {
      const ratio = computed(() => starFillRatio(starIndex, displayValue.value));

      return button(
        {
          attrs: {
            'aria-checked': computed(() => (isChecked(starIndex) ? 'true' : 'false')),
            'aria-label': `${starIndex} 分`,
            role: 'radio',
            tabindex: computed(() => (starIndex === activeStar.value ? '0' : '-1'))
          },
          'data-filled': computed(() => (ratio.value > 0 ? 'true' : null)),
          'data-half': computed(() => (ratio.value > 0 && ratio.value < 1 ? 'true' : null)),
          'data-value': String(starIndex),
          type: 'button',
          vn: 'VRateStar'
        },
        (star) => {
          star.on('click', (event) => {
            event.preventDefault();
            selectStar(starIndex, event);
          });
          star.on('mouseenter', (event) => setHover(starIndex, event));
          star.on('mouseleave', () => setHover(0));

          star.child(
            span({ vn: 'VRateStarBase' }, (box) => box.child(vText(characterText))),
            span(
              {
                style: {
                  '--yoya-rate-fill': computed(() => `${Math.round((1 - ratio.value) * 100)}%`)
                },
                vn: 'VRateStarFill'
              },
              (box) => box.child(vText(characterText))
            )
          );
        }
      );
    };

    const input = inputTag({
      attrs: {
        'aria-hidden': 'true',
        disabled: computed(() => (disabledValue.value ? true : null)),
        max: countText,
        min: '0',
        name: nameValue,
        required: computed(() => (requiredValue.value ? true : null)),
        step: stepText,
        tabindex: '-1',
        type: 'range',
        value: valueText
      },
      vn: 'VRateInput'
    });

    const starsBox = div(
      {
        attrs: {
          'aria-disabled': computed(() => (disabledValue.value ? 'true' : null)),
          'aria-invalid': computed(() => (errorValue.value ? 'true' : null)),
          'aria-label': '评分',
          'aria-readonly': computed(() => (readonlyValue.value ? 'true' : null)),
          role: 'radiogroup',
          tabindex: computed(() => (disabledValue.value ? '-1' : '0'))
        },
        vn: 'VRateStars'
      },
      (box) => {
        box.on('keydown', handleKeydown);
        box.on('focusin', () => {
          focusedState.value = true;
        });
        box.on('focusout', () => {
          focusedState.value = false;
        });
        box.keyed(
          starIndices,
          (starIndex) => starIndex,
          (starIndex) => createStar(starIndex)
        );
      }
    );

    api.value = (next) => {
      if (next === undefined) {
        return valueValue.value;
      }

      valueState.value = next;
      return api;
    };

    api.count = (next) => {
      if (next === undefined) {
        return countValue.value;
      }

      countState.value = next;
      return api;
    };

    api.max = (next) => api.count(next);

    api.allowHalf = (next) => {
      if (next === undefined) {
        return allowHalfValue.value;
      }

      allowHalfState.value = next;
      return api;
    };

    api.allowClear = (next) => {
      if (next === undefined) {
        return allowClearValue.value;
      }

      allowClearState.value = next;
      return api;
    };

    api.clearable = (next) => api.allowClear(next);

    api.character = (next) => {
      if (next === undefined) {
        return characterText.value;
      }

      characterState.value = next;
      return api;
    };

    api.size = (next) => {
      if (next === undefined) {
        return sizeValue.value;
      }

      sizeState.value = next;
      return api;
    };

    api.name = (next) => {
      if (next === undefined) {
        return nameValue.value;
      }

      nameState.value = next;
      return api;
    };

    api.disabled = (next) => {
      if (next === undefined) {
        return disabledValue.value;
      }

      disabledState.value = next;
      return api;
    };

    api.readonly = (next) => {
      if (next === undefined) {
        return readonlyValue.value;
      }

      readonlyState.value = next;
      return api;
    };

    api.required = (next) => {
      if (next === undefined) {
        return requiredValue.value;
      }

      requiredState.value = next;
      return api;
    };

    api.error = (next) => {
      if (next === undefined) {
        return errorValue.value;
      }

      errorState.value = next;
      return api;
    };

    api.clear = () => {
      if (valueValue.value !== 0 && !disabledValue.value && !readonlyValue.value) {
        setValue(0, true);
      }

      return api;
    };

    /**
     * 值语义的能力声明：速率为 0 即"空值"。
     * 必填校验与表单采集按它判定，跨模块不再看组件身份（票 15 §3-Q1 / 16 号第 32 条）。
     */
    api.isEmptyValue = (input) => normalizeValue(input) === 0;

    /** 字符串 / 数字 = 初始评分（旧 `_setupRate` 的兜底分支）。 */
    api.setupString = (next) => api.value(next);

    // 结构（R2）：一棵树写在 return 里；静态样式在 CSS（R5），随状态变的只写变量 / 绑定（R6 / R10）
    const view = div(
      {
        ...elementConfig,
        attrs: restAttrs,
        'data-allow-clear': computed(() => (allowClearValue.value ? 'true' : null)),
        'data-allow-half': computed(() => (allowHalfValue.value ? 'true' : null)),
        'data-count': countText,
        'data-disabled': computed(() => (disabledValue.value ? 'true' : null)),
        'data-error': computed(() => (errorValue.value ? 'true' : null)),
        'data-focused': computed(() => (focusedValue.value ? 'true' : null)),
        'data-hover-value': hoverText,
        'data-name': nameValue,
        'data-readonly': computed(() => (readonlyValue.value ? 'true' : null)),
        'data-required': computed(() => (requiredValue.value ? 'true' : null)),
        'data-value': valueText,
        style: { ...restStyle, '--yoya-rate-size': sizeText },
        vn: 'VRate'
      },
      (root) => root.child(input, starsBox)
    );

    return view;
  });
}

export const vRate = createComponentShortcut(VRate, { props: true });

registerChildFactories(HtmlElementNode, { vRate });
