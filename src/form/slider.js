import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories, vText } from '../core/node.js';
import {
  applyComponentArguments,
  componentClass,
  createComponentFactory,
  isPlainObject,
  themeValue
} from '../components/shared.js';

/**
 * vSlider 是滑动条输入控件：min/max/step 约束取值，支持数值显示、
 * 禁用状态与 change 回调，可放入 vFormItem 参与表单收集。
 */
export class VSlider extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vslider');
    this.styles({
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      gap: '10px',
      minWidth: '0',
      width: '100%'
    });

    this._min = 0;
    this._max = 100;
    this._step = 1;
    this._value = 0;
    this._showValue = true;
    this._vertical = false;
    this._changeHandlers = [];

    this._input = new HtmlElementNode('input')
      .className('yoya-vslider-input')
      .attr({
        'data-vslider-input': 'true',
        max: '100',
        min: '0',
        step: '1',
        type: 'range',
        value: '0'
      })
      .styles({ flex: '1 1 auto', minWidth: '0' })
      .on('input', (event) => this.value(Number(event.target.value)));

    this._valueText = vText('0');
    this._valueLabel = new HtmlElementNode('span')
      .className('yoya-vslider-value')
      .attr('data-vslider-value', 'true')
      .styles({
        color: themeValue('color-text-muted', '#64748b'),
        fontVariantNumeric: 'tabular-nums',
        minWidth: '36px',
        textAlign: 'right'
      })
      .child(this._valueText);

    this.child(this._input, this._valueLabel);
    this._sync();
    this._setupSlider(setup);
    applyComponentArguments(this, options, callback);
  }

  /** 读写当前数值（自动收敛到 min/max/step 范围内）。 */
  value(next) {
    if (next === undefined) {
      return this._value;
    }

    this._setValue(next, true);
    return this;
  }

  min(next) {
    if (next === undefined) {
      return this._min;
    }
    this._min = Number(next) || 0;
    this._input.attr('min', String(this._min));
    this._setValue(this._value, false);
    return this;
  }

  max(next) {
    if (next === undefined) {
      return this._max;
    }
    this._max = Number(next) || 0;
    this._input.attr('max', String(this._max));
    this._setValue(this._value, false);
    return this;
  }

  step(next) {
    if (next === undefined) {
      return this._step;
    }
    this._step = Number(next) || 1;
    this._input.attr('step', String(this._step));
    this._setValue(this._value, false);
    return this;
  }

  /** 是否显示当前数值。 */
  showValue(next) {
    if (next === undefined) {
      return this._showValue;
    }
    this._showValue = Boolean(next);
    this._valueLabel.style('display', this._showValue ? null : 'none');
    return this;
  }

  /** 切换为竖向排列（writing-mode 方案，值从下往上增长）。 */
  vertical(next) {
    if (next === undefined) {
      return this._vertical;
    }

    this._vertical = Boolean(next);
    this.attr('data-vertical', this._vertical ? 'true' : null);
    this.styles({
      flexDirection: this._vertical ? 'column' : 'row',
      height: this._vertical ? '180px' : null,
      width: this._vertical ? null : '100%'
    });
    this._input.styles({
      direction: this._vertical ? 'rtl' : null,
      height: this._vertical ? '100%' : null,
      minHeight: this._vertical ? '0' : null,
      minWidth: this._vertical ? null : '0',
      writingMode: this._vertical ? 'vertical-lr' : null
    });
    this._valueLabel.styles({
      minWidth: this._vertical ? null : '36px',
      textAlign: this._vertical ? 'center' : 'right'
    });
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const disabled = Boolean(value);
    this.setState('disabled', disabled);
    this.attr('data-disabled', disabled ? 'true' : null);
    this._input.attr('disabled', disabled ? true : null);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this.attr('data-name') || '';
    }
    this.attr('data-name', value ? String(value) : null);
    this._input.attr('name', value ? String(value) : null);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }
    this.setState('required', Boolean(value));
    this.attr('data-required', value ? 'true' : null);
    this._input.attr('required', value ? true : null);
    return this;
  }

  /** 注册数值变化回调。 */
  change(handler) {
    if (handler === undefined) {
      return this._changeHandlers.slice();
    }
    this._changeHandlers = [handler];
    return this;
  }

  onChange(handler) {
    return this.change(handler);
  }

  /** 供 vFormItem 读取值。 */
  _collectValue() {
    return this._value;
  }

  _sync() {
    this._input.attr('value', String(this._value));
    this._valueText.textContent(String(this._value));
    return this;
  }

  _setValue(next, emit) {
    const value = Number(next);
    this._value = Number.isFinite(value)
      ? clampNumber(value, this._min, this._max, this._step)
      : this._min;
    this._sync();
    if (emit) {
      this._changeHandlers.forEach((handler) => handler(this._value, this));
    }
    return this;
  }

  _setupSlider(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
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
        this.setup(elementConfig);
      }
      if (min !== undefined) {
        this.min(min);
      }
      if (max !== undefined) {
        this.max(max);
      }
      if (step !== undefined) {
        this.step(step);
      }
      if (value !== undefined) {
        this.value(value);
      }
      if (showValue !== undefined) {
        this.showValue(showValue);
      }
      if (vertical !== undefined) {
        this.vertical(vertical);
      }
      if (disabled !== undefined) {
        this.disabled(disabled);
      }
      if (name !== undefined) {
        this.name(name);
      }
      if (required !== undefined) {
        this.required(required);
      }
      if (change !== undefined) {
        this.change(change);
      } else if (onChange !== undefined) {
        this.onChange(onChange);
      }
      return;
    }

    this.value(setup);
  }
}

export function vSlider(first = null, second = null, third = null) {
  return createComponentFactory(VSlider, first, second, third);
}

registerChildFactories(HtmlElementNode, { vSlider });

function clampNumber(value, min, max, step) {
  const next = Math.min(Math.max(value, min), max);
  return step > 0 ? Math.round(next / step) * step : next;
}
