import { defineComponentIdentity, VTextNode } from '../../core/node.js';
import { createComponentShell } from '../../components/component-shell.js';
import { allocateId } from '../../core/id.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  componentClass,
  isPlainObject,
  resolveTextValue,
  themeValue
} from '../../components/shared.js';
import { vTimer } from './timer.js';

/** 时间范围输入框的节点类型（不导出）；公开组件 `vTimerRange` 是 vNode 外壳。 */
class TimerRangeNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._identity = 'VTimerRange';
    const errorId = allocateId('yoya-vtimer-range-error');
    this._name = '';
    this._startTimer = vTimer()
      .className('yoya-vtimer-range-start')
      .attr('aria-label', '开始值')
      .attr('aria-describedby', errorId);
    this._endTimer = vTimer()
      .className('yoya-vtimer-range-end')
      .attr('aria-label', '结束值')
      .attr('aria-describedby', errorId);
    this._errorText = new VTextNode('');
    this._errorMessage = new HtmlElementNode('span')
      .className('yoya-vtimer-range-error')
      .id(errorId)
      .attr('aria-live', 'polite')
      .style('color', themeValue('color-danger', '#dc2626'))
      .style('fontSize', '0.875rem')
      .style('gridColumn', '1 / -1')
      .child(this._errorText);

    this.className(componentClass, 'yoya-vtimer-range').attr('role', 'group');
    this.styles({
      alignItems: 'center',
      display: 'grid',
      gap: '8px',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)'
    });
    this._startTimer.on('change', (event) => this._handleTimerChange(event));
    this._endTimer.on('change', (event) => this._handleTimerChange(event));
    this.child(this._startTimer, this._endTimer, this._errorMessage);
    this._setupTimerRange(setup);
  }

  mode(value) {
    if (value === undefined) {
      return this._startTimer.mode();
    }

    this._startTimer.mode(value);
    this._endTimer.mode(value);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    this._startTimer.attr('name', this._name ? `${this._name}Start` : null);
    this._endTimer.attr('name', this._name ? `${this._name}End` : null);
    return this;
  }

  start(value) {
    if (value === undefined) {
      return this._startTimer.value();
    }

    this._startTimer.value(value);
    this._validate();
    return this;
  }

  end(value) {
    if (value === undefined) {
      return this._endTimer.value();
    }

    this._endTimer.value(value);
    this._validate();
    return this;
  }

  value(value) {
    if (value === undefined) {
      return { start: this.start(), end: this.end() };
    }

    const [start, end] = Array.isArray(value) ? value : [value?.start ?? '', value?.end ?? ''];
    this.start(start);
    this.end(end);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this._startTimer.disabled();
    }

    this._startTimer.disabled(value);
    this._endTimer.disabled(value);
    return this;
  }

  readonly(value) {
    if (value === undefined) {
      return this._startTimer.readonly();
    }

    this._startTimer.readonly(value);
    this._endTimer.readonly(value);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this._startTimer.required();
    }

    this._startTimer.required(value);
    this._endTimer.required(value);
    return this;
  }

  _setupTimerRange(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { disabled, end, mode, name, readonly, required, start, value, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (mode !== undefined) this.mode(mode);
      if (name !== undefined) this.name(name);
      if (value !== undefined) this.value(value);
      else this.value({ start, end });
      if (required !== undefined) this.required(required);
      if (readonly !== undefined) this.readonly(readonly);
      if (disabled !== undefined) this.disabled(disabled);
      return;
    }

    this.value(setup);
  }

  _handleTimerChange(event) {
    event.stopPropagation();
    this._validate();

    if (this._el) {
      const CustomEventClass = this._el.ownerDocument.defaultView.CustomEvent;
      this._el.dispatchEvent(
        new CustomEventClass('change', {
          bubbles: true,
          detail: this.value()
        })
      );
    }
  }

  hydrateSnapshot() {
    this._startTimer.hydrateSnapshot?.();
    this._endTimer.hydrateSnapshot?.();
    this._validate();
    return this;
  }

  _validate() {
    const { start, end } = this.value();
    const invalid = Boolean(start && end && end < start);

    this.attr('data-error', invalid ? 'true' : null);
    this.attr('data-invalid', invalid ? 'true' : null);
    this.attr('aria-invalid', invalid ? 'true' : null);
    this._startTimer.error(invalid);
    this._endTimer.error(invalid);
    this._startTimer.attr('aria-invalid', invalid ? 'true' : null);
    this._endTimer.attr('aria-invalid', invalid ? 'true' : null);
    this._errorText.textContent(invalid ? '结束值不能早于开始值' : '');
    return !invalid;
  }
}

export function vTimerRange(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VTimerRange',
    createNode: (setup) => new TimerRangeNode(setup),
    commands: ['mode', 'start', 'end', 'value', 'disabled', 'readonly', 'required'],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VTimerRange = vTimerRange;
defineComponentIdentity(VTimerRange, 'VTimerRange');
