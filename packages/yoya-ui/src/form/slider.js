import { registerChildFactories, vText } from '@yoyaflow/yoya-core/internal/core/node.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { HtmlElementNode, div, input as inputTag, span } from '@yoyaflow/yoya-core/html';
import { createComponentShortcut, isPlainObject, themeValue } from '../components/shared.js';

/**
 * 滑动条（形态 B，票 15 §4）：视图根是外壳 `div` + 原生 range 输入 + 数值标签。
 *
 * - 身份写在结构里：根 `vn: 'VSlider'`、内层 `vn: 'VSliderInput'`、数值标签 `vn: 'VSliderValue'`；
 *   `data-vslider-input` / `data-vslider-value` 这两个既有角色标记一并保留（角色标记不是身份）；
 * - 状态与命令收进 `vNode` 闭包；`change` 回调的第二参交给使用方的是**组件句柄**（`self.node()`，
 *   与旧外壳的 `_componentHandle` 同一口径）；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupSlider` 同口径）。
 */
export function VSlider() {
  return vNode((api, self) => {
    const state = {
      changeHandlers: [],
      disabled: false,
      max: 100,
      min: 0,
      required: false,
      showValue: true,
      step: 1,
      value: 0,
      vertical: false
    };

    const input = inputTag({ vn: 'VSliderInput' })
      .attr({
        'data-vslider-input': 'true',
        max: '100',
        min: '0',
        step: '1',
        type: 'range',
        value: '0'
      })
      .styles({ flex: '1 1 auto', minWidth: '0' });
    const valueText = vText('0');
    const valueLabel = span({ vn: 'VSliderValue' })
      .attr('data-vslider-value', 'true')
      .styles({
        color: themeValue('color-text-muted', '#64748b'),
        fontVariantNumeric: 'tabular-nums',
        minWidth: '36px',
        textAlign: 'right'
      })
      .child(valueText);
    const node = div({ vn: 'VSlider' }).styles({
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      gap: '10px',
      minWidth: '0',
      width: '100%'
    });

    node.child(input, valueLabel);

    const sync = () => {
      input.attr('value', String(state.value));
      valueText.textContent(String(state.value));
    };

    const setValue = (next, emit) => {
      const value = Number(next);

      state.value = Number.isFinite(value)
        ? clampNumber(value, state.min, state.max, state.step)
        : state.min;
      sync();

      if (emit) {
        state.changeHandlers.forEach((handler) => handler(state.value, self.node()));
      }
    };

    input.on('input', (event) => api.value(Number(event.target.value)));

    /** 读写当前数值（自动收敛到 min/max/step 范围内）。 */
    api.value = (next) => {
      if (next === undefined) {
        return state.value;
      }

      setValue(next, true);
      return api;
    };

    api.min = (next) => {
      if (next === undefined) {
        return state.min;
      }

      state.min = Number(next) || 0;
      input.attr('min', String(state.min));
      setValue(state.value, false);
      return api;
    };

    api.max = (next) => {
      if (next === undefined) {
        return state.max;
      }

      state.max = Number(next) || 0;
      input.attr('max', String(state.max));
      setValue(state.value, false);
      return api;
    };

    api.step = (next) => {
      if (next === undefined) {
        return state.step;
      }

      state.step = Number(next) || 1;
      input.attr('step', String(state.step));
      setValue(state.value, false);
      return api;
    };

    /** 是否显示当前数值。 */
    api.showValue = (next) => {
      if (next === undefined) {
        return state.showValue;
      }

      state.showValue = Boolean(next);
      valueLabel.style('display', state.showValue ? null : 'none');
      return api;
    };

    /** 切换为竖向排列（writing-mode 方案，值从下往上增长）。 */
    api.vertical = (next) => {
      if (next === undefined) {
        return state.vertical;
      }

      state.vertical = Boolean(next);
      node.attr('data-vertical', state.vertical ? 'true' : null);
      node.styles({
        flexDirection: state.vertical ? 'column' : 'row',
        height: state.vertical ? '180px' : null,
        width: state.vertical ? null : '100%'
      });
      input.styles({
        direction: state.vertical ? 'rtl' : null,
        height: state.vertical ? '100%' : null,
        minHeight: state.vertical ? '0' : null,
        minWidth: state.vertical ? null : '0',
        writingMode: state.vertical ? 'vertical-lr' : null
      });
      valueLabel.styles({
        minWidth: state.vertical ? null : '36px',
        textAlign: state.vertical ? 'center' : 'right'
      });
      return api;
    };

    api.disabled = (next) => {
      if (next === undefined) {
        return state.disabled;
      }

      state.disabled = Boolean(next);
      node.attr('data-disabled', state.disabled ? 'true' : null);
      input.attr('disabled', state.disabled ? true : null);
      return api;
    };

    api.required = (next) => {
      if (next === undefined) {
        return state.required;
      }

      state.required = Boolean(next);
      node.attr('data-required', state.required ? 'true' : null);
      input.attr('required', state.required ? true : null);
      return api;
    };

    // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
    api.isDisabled = () => state.disabled;

    api.name = (value) => {
      if (value === undefined) {
        return node.attr('data-name') || '';
      }

      node.attr('data-name', value ? String(value) : null);
      input.attr('name', value ? String(value) : null);
      return api;
    };

    /** 注册数值变化回调（后一次注册替换前一次，与旧方法面一致）。 */
    api.change = (handler) => {
      if (handler === undefined) {
        return state.changeHandlers.slice();
      }

      state.changeHandlers = [handler];
      return api;
    };

    api.onChange = (handler) => api.change(handler);

    /** 字符串 / 数字 = 初始数值（旧 `_setupSlider` 的兜底分支）。 */
    api.setupString = (next) => api.value(next);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupSlider` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const {
        change,
        disabled,
        max,
        min,
        name,
        onChange,
        required,
        showValue,
        step,
        value,
        vertical,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (min !== undefined) {
        api.min(min);
      }
      if (max !== undefined) {
        api.max(max);
      }
      if (step !== undefined) {
        api.step(step);
      }
      if (value !== undefined) {
        api.value(value);
      }
      if (showValue !== undefined) {
        api.showValue(showValue);
      }
      if (vertical !== undefined) {
        api.vertical(vertical);
      }
      if (disabled !== undefined) {
        api.disabled(disabled);
      }
      if (name !== undefined) {
        api.name(name);
      }
      if (required !== undefined) {
        api.required(required);
      }
      if (change !== undefined) {
        api.change(change);
      } else if (onChange !== undefined) {
        api.onChange(onChange);
      }

      return api;
    };

    sync();
    return node;
  });
}

export const vSlider = createComponentShortcut(VSlider);

registerChildFactories(HtmlElementNode, { vSlider });

function clampNumber(value, min, max, step) {
  const next = Math.min(Math.max(value, min), max);
  return step > 0 ? Math.round(next / step) * step : next;
}
