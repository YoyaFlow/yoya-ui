import { registerChildFactories } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import {
  HtmlElementNode,
  button as buttonTag,
  div,
  input as inputTag,
  span
} from '../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  replaceChildren,
  resolveTextValue,
  themeValue
} from '../components/shared.js';

/**
 * 评分（形态 B，票 15 §4）：视图根是外壳 `div` + 隐藏的原生 range 输入 + 星标组。
 *
 * - 身份写在结构里：根 `vn: 'VRate'`、隐藏输入 `vn: 'VRateInput'`、星标组 `vn: 'VRateStars'`、
 *   单颗星 `vn: 'VRateStar'`（基座 `VRateStarBase` / 填充 `VRateStarFill`）；
 * - 状态与命令收进 `vNode` 闭包，命令写在 api 上，调用方拿组件句柄直接调；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落到根元素（与旧 `_setupRate` 同口径）；
 * - **值语义的能力声明** `isEmptyValue()`：速率为 0 视为空值——跨模块判定走能力约定，
 *   不按组件身份分支（见 `form-values.js` / `controls/shared.js`）。
 */
export function VRate() {
  return vNode((api) => {
    const state = {
      allowClear: true,
      allowHalf: false,
      character: '★',
      count: 5,
      disabled: false,
      error: false,
      focused: false,
      hoverValue: 0,
      name: '',
      readonly: false,
      required: false,
      size: 22,
      value: 0
    };
    let stars = null;

    const input = inputTag({ vn: 'VRateInput' })
      .attr({
        'aria-hidden': 'true',
        max: '5',
        min: '0',
        step: '1',
        tabindex: '-1',
        type: 'range'
      })
      .style('display', 'none');
    const starsBox = div({ vn: 'VRateStars' })
      .attr({ 'aria-label': '评分', role: 'radiogroup', tabindex: '0' })
      .styles({
        alignItems: 'center',
        borderRadius: '8px',
        display: 'inline-flex',
        gap: '2px',
        minWidth: '0',
        outline: 'none',
        padding: '4px',
        transition: 'box-shadow 120ms ease'
      });
    const node = div({ vn: 'VRate' }).styles({
      display: 'inline-grid',
      gap: '6px',
      minWidth: '0'
    });

    node.child(input, starsBox);

    const normalizeValue = (value) => {
      let next = Number(value);
      if (!Number.isFinite(next)) {
        next = 0;
      }

      next = state.allowHalf ? Math.round(next * 2) / 2 : Math.round(next);
      return Math.max(0, Math.min(state.count, next));
    };

    const starFillRatio = (starIndex, displayValue) => {
      if (displayValue >= starIndex) {
        return 1;
      }

      if (state.allowHalf && displayValue === starIndex - 0.5) {
        return 0.5;
      }

      return 0;
    };

    const syncStars = () => {
      if (!stars) {
        return;
      }

      const displayValue = state.hoverValue > 0 ? state.hoverValue : state.value;
      const activeStar =
        state.allowHalf && state.value % 1 !== 0 ? Math.ceil(state.value) : Math.round(state.value);

      stars.forEach((starButton, index) => {
        const starIndex = index + 1;
        const ratio = starFillRatio(starIndex, displayValue);
        const isChecked =
          state.value === starIndex || (state.allowHalf && state.value === starIndex - 0.5);
        const fill = starButton.children()[1];

        starButton.attr('aria-checked', isChecked ? 'true' : 'false');
        starButton.attr('data-filled', ratio > 0 ? 'true' : null);
        starButton.attr('data-half', ratio > 0 && ratio < 1 ? 'true' : null);
        starButton.attr('tabindex', starIndex === activeStar ? '0' : '-1');
        starButton.style(
          'cursor',
          state.disabled ? 'not-allowed' : state.readonly ? 'default' : 'pointer'
        );
        const clipRight = `${Math.round((1 - ratio) * 100)}%`;

        fill.style('clipPath', `inset(0 ${clipRight} 0 0)`);
        fill.style('WebkitClipPath', `inset(0 ${clipRight} 0 0)`);
        fill.style('color', ratio > 0 ? themeValue('color-warning', '#f59e0b') : 'transparent');
      });
    };

    const createStar = (starIndex) => {
      const starButton = buttonTag({ vn: 'VRateStar' })
        .attr({
          'aria-checked': 'false',
          'aria-label': `${starIndex} 分`,
          'data-value': String(starIndex),
          role: 'radio',
          tabindex: '-1',
          type: 'button'
        })
        .styles({
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          boxSizing: 'border-box',
          display: 'inline-flex',
          flex: '0 0 auto',
          fontSize: `${state.size}px`,
          height: `${state.size + 8}px`,
          justifyContent: 'center',
          lineHeight: '1',
          margin: '0',
          padding: '0',
          position: 'relative',
          width: `${state.size + 8}px`
        });
      const base = span({ vn: 'VRateStarBase' })
        .styles({
          alignItems: 'center',
          color: themeValue('color-border-muted', '#94a3b8'),
          display: 'flex',
          inset: '0',
          justifyContent: 'center',
          lineHeight: '1',
          position: 'absolute'
        })
        .child(state.character);
      const fill = span({ vn: 'VRateStarFill' })
        .styles({
          alignItems: 'center',
          clipPath: 'inset(0 100% 0 0)',
          color: themeValue('color-warning', '#f59e0b'),
          display: 'flex',
          inset: '0',
          justifyContent: 'center',
          lineHeight: '1',
          overflow: 'hidden',
          position: 'absolute',
          WebkitClipPath: 'inset(0 100% 0 0)'
        })
        .child(state.character);

      starButton.child(base, fill);
      starButton.on('click', (event) => {
        event.preventDefault();
        selectStar(starIndex, event);
      });
      starButton.on('mouseenter', (event) => setHover(starIndex, event));
      starButton.on('mouseleave', () => setHover(0));
      return starButton;
    };

    const renderStars = () => {
      replaceChildren(starsBox, []);
      stars = [];

      for (let index = 1; index <= state.count; index += 1) {
        const starButton = createStar(index);
        stars.push(starButton);
        starsBox.child(starButton);
      }

      syncStars();
    };

    const syncInput = () => {
      input.attr({
        max: String(state.count),
        min: '0',
        step: state.allowHalf ? '0.5' : '1',
        value: String(state.value)
      });
    };

    const syncState = () => {
      node.attr('data-value', String(state.value));
      node.attr('data-count', String(state.count));
      node.attr('data-allow-half', state.allowHalf ? 'true' : null);
      node.attr('data-allow-clear', state.allowClear ? 'true' : null);
      node.attr('data-disabled', state.disabled ? 'true' : null);
      node.attr('data-readonly', state.readonly ? 'true' : null);
      node.attr('data-error', state.error ? 'true' : null);
      node.attr('data-hover-value', state.hoverValue > 0 ? String(state.hoverValue) : null);
      input.attr('disabled', state.disabled ? true : null);
      starsBox.attr('aria-disabled', state.disabled ? 'true' : null);
      starsBox.attr('aria-invalid', state.error ? 'true' : null);
      starsBox.attr('aria-readonly', state.readonly ? 'true' : null);
      starsBox.attr('tabindex', state.disabled ? '-1' : '0');
      node.style('opacity', state.disabled ? '0.64' : '1');
      starsBox.style(
        'boxShadow',
        state.error
          ? `0 0 0 1px ${themeValue('color-danger-ring', 'rgba(220, 38, 38, 0.2)')}`
          : state.focused
            ? `0 0 0 3px ${themeValue('color-primary-ring', 'rgba(37, 99, 235, 0.22)')}`
            : null
      );

      // 星标状态（指针、aria-checked、填充比例）跟着 disabled / readonly / error 一起走：
      // 挂载后再改状态时旧指针不会留在星标上（迁移期金标对比暴露的既有不一致）。
      if (stars) {
        syncStars();
      }
    };

    const sync = () => {
      syncInput();
      syncState();

      if (!stars || stars.length !== state.count) {
        renderStars();
      }
    };

    const pointerValue = (starIndex, event) => {
      if (!state.allowHalf || !event) {
        return starIndex;
      }

      const rect = event.currentTarget?.getBoundingClientRect?.();
      if (rect?.width && event.offsetX < rect.width / 2) {
        return starIndex - 0.5;
      }

      return starIndex;
    };

    const setValue = (next, emit) => {
      const normalized = normalizeValue(next);
      state.hoverValue = 0;

      if (normalized !== state.value) {
        state.value = normalized;
        sync();
        if (emit) {
          emitChange();
        }
      }
    };

    const setHover = (starIndex, event) => {
      if (state.disabled || state.readonly) {
        return;
      }

      state.hoverValue = starIndex > 0 ? pointerValue(starIndex, event) : 0;
      syncStars();
      node.attr('data-hover-value', state.hoverValue > 0 ? String(state.hoverValue) : null);
    };

    const selectStar = (starIndex, event) => {
      if (state.disabled || state.readonly) {
        return;
      }

      let next = pointerValue(starIndex, event);
      if (state.allowClear && next === state.value) {
        next = 0;
      }
      setValue(next, true);
    };

    const handleKeydown = (event) => {
      if (state.disabled || state.readonly) {
        return;
      }

      const step = state.allowHalf ? 0.5 : 1;
      let next = null;

      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        next = state.value + step;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        next = state.value - step;
      } else if (event.key === 'Home') {
        next = state.allowHalf ? 0.5 : 1;
      } else if (event.key === 'End') {
        next = state.count;
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (state.hoverValue > 0) {
          selectStar(state.hoverValue);
        } else if (state.allowClear && state.value > 0) {
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

    const setFocused = (focused) => {
      state.focused = focused;
      node.attr('data-focused', focused ? 'true' : null);
      syncState();
    };

    const emitChange = () => {
      if (!node._el) {
        return;
      }

      const EventClass = node._el.ownerDocument?.defaultView?.CustomEvent || CustomEvent;

      node._el.dispatchEvent(
        new EventClass('change', {
          bubbles: true,
          detail: state.value
        })
      );
    };

    starsBox.on('keydown', (event) => handleKeydown(event));
    starsBox.on('focusin', () => setFocused(true));
    starsBox.on('focusout', () => setFocused(false));

    api.value = (value) => {
      if (value === undefined) {
        return state.value;
      }

      const next = normalizeValue(value);
      if (next !== state.value) {
        state.value = next;
        sync();
      }
      return api;
    };

    api.count = (value) => {
      if (value === undefined) {
        return state.count;
      }

      const next = Math.max(1, Math.trunc(Number(value)) || 1);
      if (next !== state.count) {
        state.count = next;
        state.value = normalizeValue(state.value);
        sync();
      }
      return api;
    };

    api.max = (value) => api.count(value);

    api.allowHalf = (value) => {
      if (value === undefined) {
        return state.allowHalf;
      }

      const enabled = Boolean(value);
      if (enabled !== state.allowHalf) {
        state.allowHalf = enabled;
        state.value = normalizeValue(state.value);
        sync();
      }
      return api;
    };

    api.allowClear = (value) => {
      if (value === undefined) {
        return state.allowClear;
      }

      state.allowClear = Boolean(value);
      node.attr('data-allow-clear', state.allowClear ? 'true' : null);
      return api;
    };

    api.clearable = (value) => api.allowClear(value);

    api.character = (value) => {
      if (value === undefined) {
        return state.character;
      }

      state.character = resolveTextValue(value) || '★';
      renderStars();
      return api;
    };

    api.size = (value) => {
      if (value === undefined) {
        return state.size;
      }

      state.size = Math.max(12, Number(value) || 22);
      renderStars();
      return api;
    };

    api.name = (value) => {
      if (value === undefined) {
        return state.name;
      }

      state.name = resolveTextValue(value);
      input.attr('name', state.name || null);
      node.attr('data-name', state.name || null);
      return api;
    };

    api.disabled = (value) => {
      if (value === undefined) {
        return state.disabled;
      }

      state.disabled = Boolean(value);
      syncState();
      return api;
    };

    api.readonly = (value) => {
      if (value === undefined) {
        return state.readonly;
      }

      state.readonly = Boolean(value);
      syncState();
      return api;
    };

    api.required = (value) => {
      if (value === undefined) {
        return state.required;
      }

      state.required = Boolean(value);
      input.attr('required', state.required ? true : null);
      node.attr('data-required', state.required ? 'true' : null);
      return api;
    };

    api.error = (value) => {
      if (value === undefined) {
        return state.error;
      }

      state.error = Boolean(value);
      syncState();
      return api;
    };

    api.clear = () => {
      if (state.value !== 0 && !state.disabled && !state.readonly) {
        setValue(0, true);
      }
      return api;
    };

    /**
     * 值语义的能力声明：速率为 0 即"空值"。
     * 必填校验与表单采集按它判定，跨模块不再看组件身份（票 15 §3-Q1）。
     */
    api.isEmptyValue = (value) => normalizeValue(value) === 0;

    /** 字符串 / 数字 = 初始评分（旧 `_setupRate` 的兜底分支）。 */
    api.setupString = (value) => api.value(value);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupRate` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const {
        allowClear,
        allowHalf,
        character,
        clearable,
        count,
        disabled,
        error,
        max,
        name,
        readonly,
        required,
        size,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (count !== undefined || max !== undefined) {
        api.count(count ?? max);
      }
      if (allowHalf !== undefined) {
        api.allowHalf(allowHalf);
      }
      if (character !== undefined) {
        api.character(character);
      }
      if (size !== undefined) {
        api.size(size);
      }
      if (value !== undefined) {
        api.value(value);
      }
      if (name !== undefined) {
        api.name(name);
      }
      if (required !== undefined) {
        api.required(required);
      }
      if (readonly !== undefined) {
        api.readonly(readonly);
      }
      if (disabled !== undefined) {
        api.disabled(disabled);
      }
      if (error !== undefined) {
        api.error(error);
      }
      if (clearable !== undefined) {
        api.allowClear(clearable);
      } else if (allowClear !== undefined) {
        api.allowClear(allowClear);
      }

      return api;
    };

    sync();
    return node;
  });
}

export const vRate = createComponentShortcut(VRate);

registerChildFactories(HtmlElementNode, { vRate });
