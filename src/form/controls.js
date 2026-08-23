import { ViewNode, VTextNode, registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VButton } from '../actions/button.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot
} from '../components/shared.js';

let timerRangeSequence = 0;

export class VInput extends HtmlElementNode {
  constructor(setup = null) {
    super('input', null);
    this._value = '';

    this.className(componentClass, 'yoya-vinput');
    this.attr('type', 'text');
    this.styles({
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: '#172033',
      font: 'inherit',
      minHeight: '34px',
      outline: 'none',
      padding: '0 12px',
      width: '100%'
    });

    this._setupInput(setup);
  }

  type(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    this.attr('type', value || 'text');
    return this;
  }

  value(value) {
    if (value === undefined) {
      return this._el?.value ?? this._value ?? this.attr('value') ?? '';
    }

    const next = resolveTextValue(value);
    this._value = next;
    this.attr('value', next);
    return this;
  }

  text(value) {
    return this.value(value);
  }

  content(value) {
    return this.value(value);
  }

  placeholder(value) {
    if (value === undefined) {
      return this.attr('placeholder');
    }

    const next = resolveTextValue(value);
    this.attr('placeholder', next || null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.style('cursor', enabled ? 'not-allowed' : 'text');
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  readonly(value) {
    if (value === undefined) {
      return this.getBooleanState('readonly');
    }

    const enabled = Boolean(value);

    this.setState('readonly', enabled);
    this.attr('readonly', enabled ? true : null);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this.attr('required', enabled ? true : null);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this.getBooleanState('error');
    }

    const enabled = Boolean(value);

    this.setState('error', enabled);
    this.attr('data-error', enabled ? 'true' : null);
    this.style('borderColor', enabled ? '#dc2626' : '#cbd5e1');
    this.style('boxShadow', enabled ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : null);
    return this;
  }

  _setupInput(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        content,
        disabled,
        error,
        placeholder,
        readonly,
        required,
        text,
        type,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (type !== undefined) {
        this.type(type);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }

      if (value !== undefined) {
        this.value(value);
      } else if (text !== undefined) {
        this.value(text);
      } else if (content !== undefined) {
        this.value(content);
      } else if (children !== undefined) {
        this.value(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (readonly !== undefined) {
        this.readonly(readonly);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (error !== undefined) {
        this.error(error);
      }

      return;
    }

    this.placeholder(setup);
  }
}

export class VTimer extends VInput {
  constructor(setup = null) {
    super(null);
    this.className('yoya-vtimer');
    this.mode('date');
    this._setupTimer(setup);
  }

  mode(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    const supportedModes = new Set(['date', 'datetime-local', 'time']);
    this.attr('type', supportedModes.has(value) ? value : 'date');
    return this;
  }

  type(value) {
    return value === undefined ? this.mode() : this.mode(value);
  }

  _setupTimer(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { mode, type, ...inputSetup } = setup;

      this._setupInput(inputSetup);
      if (mode !== undefined) {
        this.mode(mode);
      } else if (type !== undefined) {
        this.mode(type);
      }
      return;
    }

    this.value(setup);
  }
}

export class VTimerRange extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    const errorId = `yoya-vtimer-range-error-${++timerRangeSequence}`;
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
      .style('color', '#dc2626')
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

export class VTextarea extends HtmlElementNode {
  constructor(setup = null) {
    super('textarea', null);
    this._value = '';

    this.className(componentClass, 'yoya-vtextarea');
    this.styles({
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: '#172033',
      font: 'inherit',
      minHeight: '88px',
      outline: 'none',
      padding: '10px 12px',
      resize: 'vertical',
      width: '100%'
    });

    this._setupTextarea(setup);
  }

  value(value) {
    if (value === undefined) {
      return this._el?.value ?? this._value ?? this.textContent();
    }

    const next = resolveTextValue(value);
    this._value = next;
    replaceChildren(this, next ? normalizeChildren(next) : []);

    if (this._el) {
      this._el.value = next;
    }

    return this;
  }

  text(value) {
    return this.value(value);
  }

  content(value) {
    return this.value(value);
  }

  placeholder(value) {
    if (value === undefined) {
      return this.attr('placeholder');
    }

    const next = resolveTextValue(value);
    this.attr('placeholder', next || null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.style('cursor', enabled ? 'not-allowed' : 'text');
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  readonly(value) {
    if (value === undefined) {
      return this.getBooleanState('readonly');
    }

    const enabled = Boolean(value);

    this.setState('readonly', enabled);
    this.attr('readonly', enabled ? true : null);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this.attr('required', enabled ? true : null);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this.getBooleanState('error');
    }

    const enabled = Boolean(value);

    this.setState('error', enabled);
    this.attr('data-error', enabled ? 'true' : null);
    this.style('borderColor', enabled ? '#dc2626' : '#cbd5e1');
    this.style('boxShadow', enabled ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : null);
    return this;
  }

  rows(value) {
    if (value === undefined) {
      return this.attr('rows');
    }

    this.attr('rows', value);
    return this;
  }

  _setupTextarea(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        content,
        disabled,
        error,
        placeholder,
        readonly,
        required,
        rows,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (rows !== undefined) {
        this.rows(rows);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }

      if (value !== undefined) {
        this.value(value);
      } else if (text !== undefined) {
        this.value(text);
      } else if (content !== undefined) {
        this.value(content);
      } else if (children !== undefined) {
        this.value(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (readonly !== undefined) {
        this.readonly(readonly);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (error !== undefined) {
        this.error(error);
      }

      return;
    }

    this.value(setup);
  }
}

export class VSelect extends HtmlElementNode {
  constructor(setup = null) {
    super('select', null);
    this._options = [];
    this._placeholder = '';
    this._value = '';

    this.className(componentClass, 'yoya-vselect');
    this.styles({
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: '#172033',
      cursor: 'pointer',
      font: 'inherit',
      minHeight: '34px',
      outline: 'none',
      padding: '0 32px 0 12px',
      width: '100%'
    });

    this._setupSelect(setup);
  }

  value(value) {
    if (value === undefined) {
      return this._el?.value ?? this._value ?? '';
    }

    this._value = resolveTextValue(value);
    this._renderOptions();
    return this;
  }

  text(value) {
    return this.value(value);
  }

  content(value) {
    return this.value(value);
  }

  placeholder(value) {
    if (value === undefined) {
      return this._placeholder;
    }

    this._placeholder = resolveTextValue(value);
    this._renderOptions();
    return this;
  }

  options(value) {
    if (value === undefined) {
      return this._options.slice();
    }

    this._options = Array.isArray(value) ? value.slice() : [];
    this._renderOptions();
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('disabled', enabled ? true : null);
    this.style('cursor', enabled ? 'not-allowed' : 'pointer');
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this.attr('required', enabled ? true : null);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this.getBooleanState('error');
    }

    const enabled = Boolean(value);

    this.setState('error', enabled);
    this.attr('data-error', enabled ? 'true' : null);
    this.style('borderColor', enabled ? '#dc2626' : '#cbd5e1');
    this.style('boxShadow', enabled ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : null);
    return this;
  }

  clear() {
    return this.value('');
  }

  _renderOptions() {
    const nodes = [];
    const selectedValue = resolveTextValue(this._value);

    if (this._placeholder) {
      const placeholderNode = new HtmlElementNode('option').className('yoya-vselect-option');
      placeholderNode.attr({ disabled: true, value: '' });
      placeholderNode.attr('selected', selectedValue ? null : true);
      placeholderNode.styles({
        color: '#94a3b8'
      });
      replaceChildren(placeholderNode, normalizeChildren(this._placeholder));
      nodes.push(placeholderNode);
    }

    this._options.forEach((option, index) => {
      nodes.push(createSelectOptionNode(option, selectedValue, index));
    });

    replaceChildren(this, nodes);

    if (this._el) {
      this._el.value = selectedValue;
    }
  }

  _setupSelect(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        content,
        disabled,
        error,
        options,
        placeholder,
        required,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }

      if (options !== undefined) {
        this.options(options);
      }

      if (value !== undefined) {
        this.value(value);
      } else if (text !== undefined) {
        this.value(text);
      } else if (content !== undefined) {
        this.value(content);
      } else if (children !== undefined) {
        this.value(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (error !== undefined) {
        this.error(error);
      }

      return;
    }

    this.value(setup);
  }
}

class VBooleanControl extends HtmlElementNode {
  constructor(tagName) {
    super('label', null);
    this._kind = tagName;
    this._optionValue = 'on';
    this._input = new HtmlElementNode('input').className(`yoya-v${tagName}-input`);
    this._visualBox = new HtmlElementNode('span').className(`yoya-v${tagName}-visual`);
    this._contentBox = new HtmlElementNode('span').className(`yoya-v${tagName}-content`);
    this._labelBox = new HtmlElementNode('span').className(`yoya-v${tagName}-label`);
    this._descriptionBox = new HtmlElementNode('span')
      .className(`yoya-v${tagName}-description`)
      .style('display', 'none');

    this.className(componentClass, `yoya-v${tagName}`);
    this.styles({
      alignItems: 'center',
      cursor: 'pointer',
      display: 'inline-grid',
      gap: '10px',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      position: 'relative'
    });
    this._input.attr('type', 'checkbox');
    this._input.styles({
      height: '1px',
      margin: '0',
      opacity: '0',
      pointerEvents: 'none',
      position: 'absolute',
      width: '1px'
    });
    this._contentBox.styles({
      display: 'grid',
      gap: '2px',
      minWidth: '0'
    });
    this._labelBox.styles({
      color: '#172033',
      fontWeight: '600',
      lineHeight: '1.35'
    });
    this._descriptionBox.styles({
      color: '#64748b',
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._contentBox.child(this._labelBox, this._descriptionBox);
    this.child(this._visualBox, this._input, this._contentBox);
    this._input.on('change', (event) => {
      if (this.getBooleanState('disabled')) {
        return;
      }

      this.checked(Boolean(event.target?.checked));
    });
  }

  label(value) {
    if (value === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(value));
    return this;
  }

  text(value) {
    return this.label(value);
  }

  content(value) {
    return this.label(value);
  }

  description(value) {
    if (value === undefined) {
      return this._descriptionBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._descriptionBox.style('display', hasContent ? null : 'none');
    replaceChildren(this._descriptionBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  checked(value) {
    if (value === undefined) {
      return this.getBooleanState('checked');
    }

    const enabled = Boolean(value);

    this.setState('checked', enabled);
    this.attr('data-checked', enabled ? 'true' : null);
    this._input.attr('checked', enabled ? true : null);
    this._syncVisual(enabled);
    return this;
  }

  value(value) {
    if (value === undefined) {
      return this.checked();
    }

    return this.checked(value);
  }

  optionValue(value) {
    if (value === undefined) {
      return this._optionValue;
    }

    this._optionValue = resolveTextValue(value) || 'on';
    this._input.attr('value', this._optionValue);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this._input.name();
    }

    this._input.name(value);
    this.attr('data-name', value ?? null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this._input.attr('disabled', enabled ? true : null);
    this.attr('aria-disabled', enabled ? 'true' : null);
    this.style('opacity', enabled ? '0.64' : '1');
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }

    const enabled = Boolean(value);

    this.setState('required', enabled);
    this._input.attr('required', enabled ? true : null);
    return this;
  }

  indeterminate(value) {
    if (value === undefined) {
      return this.getBooleanState('indeterminate');
    }

    const enabled = Boolean(value);

    this.setState('indeterminate', enabled);
    if (this._input._el) {
      this._input._el.indeterminate = enabled;
    }
    return this;
  }

  _setupBoolean(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        checked,
        children,
        content,
        description,
        disabled,
        label,
        name,
        optionValue,
        required,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.text(text);
      } else if (content !== undefined) {
        this.content(content);
      } else if (children !== undefined) {
        this.label(children);
      }

      if (description !== undefined) {
        this.description(description);
      }

      if (name !== undefined) {
        this.name(name);
      }

      if (optionValue !== undefined) {
        this.optionValue(optionValue);
      } else if (value !== undefined && typeof value !== 'boolean') {
        this.optionValue(value);
      }

      if (checked !== undefined) {
        this.checked(checked);
      } else if (value !== undefined && typeof value === 'boolean') {
        this.checked(value);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      return;
    }

    if (
      setup instanceof ViewNode ||
      Array.isArray(setup) ||
      typeof setup === 'string' ||
      typeof setup === 'number'
    ) {
      this.label(setup);
      return;
    }

    this.label(setup);
  }

  _syncVisual() {}
}

export class VCheckbox extends VBooleanControl {
  constructor(setup = null) {
    super('checkbox');
    this._visualBox.styles({
      alignItems: 'center',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      boxSizing: 'border-box',
      color: '#ffffff',
      display: 'inline-flex',
      height: '16px',
      justifyContent: 'center',
      lineHeight: '1',
      transition: 'background 120ms ease, border-color 120ms ease',
      width: '16px'
    });
    this._syncVisual(false);
    this._setupBoolean(setup);
  }

  _syncVisual(enabled) {
    this._visualBox.styles({
      background: enabled ? '#2563eb' : '#ffffff',
      borderColor: enabled ? '#2563eb' : '#cbd5e1',
      color: enabled ? '#ffffff' : 'transparent'
    });
    replaceChildren(this._visualBox, enabled ? normalizeChildren('✓') : []);
  }
}

export class VSwitch extends VBooleanControl {
  constructor(setup = null) {
    super('switch');
    this._thumbBox = new HtmlElementNode('span').className('yoya-vswitch-thumb');
    this._visualBox.styles({
      background: '#cbd5e1',
      border: '1px solid #cbd5e1',
      borderRadius: '999px',
      boxSizing: 'border-box',
      display: 'inline-flex',
      height: '22px',
      padding: '2px',
      position: 'relative',
      transition: 'background 120ms ease, border-color 120ms ease',
      width: '40px'
    });
    this._thumbBox.styles({
      background: '#ffffff',
      borderRadius: '999px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.18)',
      height: '16px',
      transform: 'translateX(0)',
      transition: 'transform 120ms ease',
      width: '16px'
    });
    this._visualBox.child(this._thumbBox);
    this._syncVisual(false);
    this._setupBoolean(setup);
  }

  _syncVisual(enabled) {
    this._visualBox.styles({
      background: enabled ? '#2563eb' : '#cbd5e1',
      borderColor: enabled ? '#2563eb' : '#cbd5e1'
    });
    this._thumbBox.style('transform', enabled ? 'translateX(18px)' : 'translateX(0)');
  }
}

export class VCheckboxes extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._name = '';
    this._multiple = true;
    this._required = false;
    this._items = [];
    this._options = [];

    this.className(componentClass, 'yoya-vcheckboxes');
    this.styles({
      display: 'grid',
      gap: '8px',
      minWidth: '0'
    });

    this._setupCheckboxes(setup);
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    this.attr('data-name', this._name || null);
    return this;
  }

  multiple(value) {
    if (value === undefined) {
      return this._multiple;
    }

    const selected = this.value();
    this._multiple = Boolean(value);
    if (!this._multiple) {
      if (Array.isArray(selected)) {
        this.value(selected[0] ?? null);
      } else {
        this.value(selected);
      }
    }
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this._required;
    }

    this._required = Boolean(value);
    this.attr('data-required', this._required ? 'true' : null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const enabled = Boolean(value);

    this.setState('disabled', enabled);
    this.attr('aria-disabled', enabled ? 'true' : null);
    this.style('opacity', enabled ? '0.64' : '1');
    this._items.forEach((item) => item.disabled(enabled));
    return this;
  }

  options(value) {
    if (value === undefined) {
      return this._options.slice();
    }

    this._options = Array.isArray(value) ? value.slice() : [];
    this._renderOptions();
    return this;
  }

  value(value) {
    if (value === undefined) {
      const selected = this._items
        .filter((item) => item.checked())
        .map((item) => item.optionValue());

      if (this._multiple) {
        return selected;
      }

      return selected[0] ?? null;
    }

    const values = normalizeValueList(value);
    const selectedValues = this._multiple ? values : values.slice(0, 1);

    this._items.forEach((item) => {
      const itemValue = resolveTextValue(item.optionValue());
      item.checked(selectedValues.includes(itemValue));
    });

    return this;
  }

  checkedValues(value) {
    if (value === undefined) {
      return this.value();
    }

    return this.value(value);
  }

  clear() {
    return this.value(this._multiple ? [] : null);
  }

  _renderOptions() {
    const normalizedItems = this._options.map((option, index) =>
      createCheckboxGroupItem(option, index)
    );

    this._items = normalizedItems;
    replaceChildren(this, normalizedItems);
    this._items.forEach((item) => {
      item.on('change', () => this._handleItemChange(item));
      if (this._name) {
        item.attr('data-group-name', this._name);
      }
    });
    this.value(this.value());
  }

  _handleItemChange(item) {
    if (!this._multiple && item.checked()) {
      this._items.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.checked(false);
        }
      });
    }
  }

  _setupCheckboxes(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, disabled, multiple, name, options, required, value, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (name !== undefined) {
        this.name(name);
      }

      if (multiple !== undefined) {
        this.multiple(multiple);
      }

      if (options !== undefined) {
        this.options(options);
      } else if (children !== undefined) {
        this.options(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (value !== undefined) {
        this.value(value);
      }

      return;
    }

    if (Array.isArray(setup)) {
      this.options(setup);
      return;
    }

    this.options([setup]);
  }
}

export class VField extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._mode = 'view';
    this._control = null;
    this._hovered = false;
    this._headerBox = new HtmlElementNode('div').className('yoya-vfield-header');
    this._displayBox = new HtmlElementNode('div').className('yoya-vfield-display');
    this._editorBox = new HtmlElementNode('div')
      .className('yoya-vfield-editor')
      .style('display', 'none');
    this._labelBox = new HtmlElementNode('div').className('yoya-vfield-label');
    this._hintBox = new HtmlElementNode('div')
      .className('yoya-vfield-hint')
      .style('display', 'none');
    this._errorBox = new HtmlElementNode('div')
      .className('yoya-vfield-error')
      .style('display', 'none');
    this._actionButton = new VButton('✎')
      .className('yoya-vfield-action')
      .size('small')
      .variant('secondary')
      .attr({ tabindex: '-1', 'aria-hidden': 'true' })
      .on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.mode(this._mode === 'edit' ? 'view' : 'edit');
      });

    this.className(componentClass, 'yoya-vfield');
    this.styles({
      display: 'grid',
      gap: '8px',
      minWidth: '0'
    });
    this._headerBox.styles({
      alignItems: 'center',
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between',
      minWidth: '0'
    });
    this._labelBox.styles({
      color: '#111827',
      flex: '1 1 auto',
      fontWeight: '700',
      lineHeight: '1.35'
    });
    this._displayBox.styles({
      border: '1px solid #d8dee8',
      borderRadius: '6px',
      color: '#172033',
      minHeight: '34px',
      padding: '8px 12px'
    });
    this._editorBox.styles({
      minWidth: '0'
    });
    this._hintBox.styles({
      color: '#64748b',
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._errorBox.styles({
      color: '#b91c1c',
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._actionButton.styles({
      flexShrink: '0',
      gap: '0',
      minWidth: '32px',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 120ms ease'
    });
    this._headerBox.child(this._labelBox, this._actionButton);
    this.child(this._headerBox, this._displayBox, this._editorBox, this._hintBox, this._errorBox);
    this.on('mouseenter', () => {
      this._hovered = true;
      this._syncActionButton();
    });
    this.on('mouseleave', () => {
      this._hovered = false;
      this._syncActionButton();
    });
    this._setupField(setup);
    this._syncActionButton();
  }

  label(value) {
    if (value === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(value));
    return this;
  }

  hint(value) {
    if (value === undefined) {
      return this._hintBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._hintBox.style('display', hasContent ? null : 'none');
    replaceChildren(this._hintBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this._errorBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._errorBox.style('display', hasContent ? null : 'none');
    this.attr('data-error', hasContent ? 'true' : null);
    replaceChildren(this._errorBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  display(value) {
    if (value === undefined) {
      return this._displayBox.textContent();
    }

    replaceChildren(this._displayBox, normalizeChildren(value));
    return this;
  }

  control(setup) {
    if (setup === undefined) {
      return this._control ?? findFieldControl(this._editorBox);
    }

    setupContentSlot(this._editorBox, setup);
    this._control = findFieldControl(this._editorBox);

    if (this._mode === 'view') {
      this._syncDisplayFromControl();
    }

    this._syncActionButton();

    return this;
  }

  editor(setup) {
    return this.control(setup);
  }

  value(value) {
    const control = this.control();

    if (value === undefined) {
      return control ? readControlValue(control) : this._displayBox.textContent();
    }

    if (control) {
      applyControlValue(control, value);
    } else {
      this.display(value);
    }

    if (this._mode === 'view') {
      this._syncDisplayFromControl();
    }

    return this;
  }

  mode(value) {
    if (value === undefined) {
      return this._mode;
    }

    this._mode = value === 'edit' ? 'edit' : 'view';
    this.attr('data-mode', this._mode);

    if (this._mode === 'edit') {
      this._displayBox.style('display', 'none');
      this._editorBox.style('display', null);
    } else {
      this._editorBox.style('display', 'none');
      this._displayBox.style('display', null);
      this._syncDisplayFromControl();
    }

    this._syncActionButton();

    return this;
  }

  view() {
    return this.mode('view');
  }

  edit() {
    return this.mode('edit');
  }

  _syncDisplayFromControl() {
    const control = this.control();

    if (!control) {
      return this;
    }

    const value = readControlValue(control);

    replaceChildren(this._displayBox, normalizeChildren(formatDisplayValue(value)));
    return this;
  }

  _syncActionButton() {
    if (!this._actionButton) {
      return this;
    }

    const hasControl = Boolean(this.control());
    const visible = hasControl && (this._hovered || this._mode === 'edit');
    const label = this._mode === 'edit' ? '完成' : '编辑';
    const symbol = this._mode === 'edit' ? '✓' : '✎';

    this._actionButton.label(symbol);
    this._actionButton.attr({
      'aria-hidden': visible ? null : 'true',
      'aria-label': label,
      title: label
    });
    this._actionButton.attr('tabindex', visible ? null : '-1');
    this._actionButton.style('opacity', visible ? '1' : '0');
    this._actionButton.style('pointerEvents', visible ? null : 'none');
    return this;
  }

  _setupField(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        control,
        display,
        editor,
        error,
        hint,
        label,
        mode,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      }

      if (hint !== undefined) {
        this.hint(hint);
      }

      if (display !== undefined) {
        this.display(display);
      }

      if (editor !== undefined) {
        this.editor(editor);
      } else if (control !== undefined) {
        this.control(control);
      } else if (children !== undefined) {
        this.editor(children);
      }

      if (value !== undefined) {
        this.value(value);
      }

      if (error !== undefined) {
        this.error(error);
      }

      if (mode !== undefined) {
        this.mode(mode);
      }

      return;
    }

    this.display(setup);
  }
}

export class VForm extends HtmlElementNode {
  constructor(setup = null) {
    super('form', null);

    this.className(componentClass, 'yoya-vform');
    this.styles({
      display: 'grid',
      gap: '16px',
      minWidth: '0'
    });

    this._setupForm(setup);
  }

  values(value) {
    if (value === undefined) {
      const result = {};
      collectFormValues(this, result);
      return result;
    }

    if (isPlainObject(value)) {
      applyFormValues(this, value);
    }

    return this;
  }

  value(value) {
    return this.values(value);
  }

  validate() {
    return validateFormControls(this);
  }

  reset() {
    if (this._el?.reset) {
      this._el.reset();
    }

    return this;
  }

  submit() {
    if (this._el?.requestSubmit) {
      this._el.requestSubmit();
    } else if (this._el?.dispatchEvent) {
      this._el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    return this;
  }

  _setupForm(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, values, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (children !== undefined) {
        applyComponentSetup(this, children);
      }

      if (values !== undefined) {
        this.values(values);
      }

      return;
    }

    this.child(setup);
  }
}

export function vInput(first = null, second = null, third = null) {
  return createComponentFactory(VInput, first, second, third);
}

export function vTimer(first = null, second = null, third = null) {
  return createComponentFactory(VTimer, first, second, third);
}

export function vTimerRange(first = null, second = null, third = null) {
  return createComponentFactory(VTimerRange, first, second, third);
}

export function vTextarea(first = null, second = null, third = null) {
  return createComponentFactory(VTextarea, first, second, third);
}

export function vSelect(first = null, second = null, third = null) {
  return createComponentFactory(VSelect, first, second, third);
}

export function vCheckbox(first = null, second = null, third = null) {
  return createComponentFactory(VCheckbox, first, second, third);
}

export function vSwitch(first = null, second = null, third = null) {
  return createComponentFactory(VSwitch, first, second, third);
}

export function vCheckboxes(first = null, second = null, third = null) {
  return createComponentFactory(VCheckboxes, first, second, third);
}

export function vField(first = null, second = null, third = null) {
  return createComponentFactory(VField, first, second, third);
}

export function vForm(first = null, second = null, third = null) {
  return createComponentFactory(VForm, first, second, third);
}

const formComponentFactories = {
  vCheckbox,
  vCheckboxes,
  vField,
  vForm,
  vInput,
  vSelect,
  vSwitch,
  vTimer,
  vTimerRange,
  vTextarea
};

registerChildFactories(HtmlElementNode, formComponentFactories);

function formatDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTextValue(item)).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return resolveTextValue(value);
}

function normalizeValueList(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  return Array.isArray(value)
    ? value.map((item) => resolveTextValue(item))
    : [resolveTextValue(value)];
}

function createSelectOptionNode(option, selectedValue, index) {
  if (option instanceof HtmlElementNode && option.tagName?.() === 'option') {
    const node = option;
    node.attr('selected', resolveTextValue(node.attr('value')) === selectedValue ? true : null);
    return node;
  }

  const normalized = normalizeSelectOption(option, index);
  const node = new HtmlElementNode('option').className('yoya-vselect-option');
  const isSelected = normalized.value === selectedValue;

  node.attr('value', normalized.value);
  node.attr('selected', isSelected ? true : null);

  if (normalized.disabled) {
    node.attr('disabled', true);
  }

  if (isSelected) {
    node.styles({
      color: '#172033'
    });
  }

  replaceChildren(node, normalizeChildren(normalized.label));
  return node;
}

function normalizeSelectOption(option, index) {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const text = resolveTextValue(option);
    return {
      label: text,
      value: text
    };
  }

  if (Array.isArray(option) && option.length > 0) {
    const [value, label = value] = option;
    return {
      label: label ?? value ?? '',
      value: resolveTextValue(value)
    };
  }

  if (option instanceof ViewNode) {
    const text = option.textContent();
    return {
      label: option,
      value: text
    };
  }

  if (isPlainObject(option)) {
    const value =
      option.value ??
      option.key ??
      option.id ??
      option.label ??
      option.text ??
      option.title ??
      `option-${index}`;
    const label = option.label ?? option.text ?? option.content ?? option.title ?? value;

    return {
      disabled: Boolean(option.disabled),
      label,
      value: resolveTextValue(value)
    };
  }

  const text = resolveTextValue(option);
  return {
    label: text,
    value: text
  };
}

function createCheckboxGroupItem(option, index) {
  if (option instanceof VCheckbox) {
    return option;
  }

  if (option instanceof ViewNode && !(option instanceof HtmlElementNode)) {
    return vCheckbox(option);
  }

  const normalized = normalizeCheckboxGroupOption(option, index);

  return new VCheckbox({
    checked: normalized.checked,
    description: normalized.description,
    disabled: normalized.disabled,
    label: normalized.label,
    optionValue: normalized.value,
    required: normalized.required
  });
}

function normalizeCheckboxGroupOption(option, index) {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const text = resolveTextValue(option);
    return {
      label: text,
      value: text
    };
  }

  if (Array.isArray(option) && option.length > 0) {
    const [value, label = value] = option;
    return {
      label: label ?? value ?? '',
      value: resolveTextValue(value)
    };
  }

  if (option instanceof VCheckbox) {
    return {
      checked: option.checked(),
      description: option.description(),
      disabled: option.disabled(),
      label: option.label(),
      required: option.required(),
      value: option.optionValue()
    };
  }

  if (option instanceof ViewNode) {
    const text = option.textContent();
    return {
      label: option,
      value: text
    };
  }

  if (isPlainObject(option)) {
    const value =
      option.value ?? option.key ?? option.id ?? option.label ?? option.text ?? `option-${index}`;
    const label = option.label ?? option.text ?? option.content ?? option.title ?? value;

    return {
      checked: Boolean(option.checked),
      description: option.description,
      disabled: Boolean(option.disabled),
      label,
      required: Boolean(option.required),
      value: resolveTextValue(value)
    };
  }

  const text = resolveTextValue(option);
  return {
    label: text,
    value: text
  };
}

function readControlValue(control) {
  if (!control) {
    return undefined;
  }

  if (control instanceof VCheckboxes) {
    return control.value();
  }

  if (control instanceof VCheckbox || control instanceof VSwitch) {
    return control.value();
  }

  if (control instanceof VInput || control instanceof VSelect || control instanceof VTextarea) {
    return control.value();
  }

  const tagName = typeof control.tagName === 'function' ? control.tagName() : '';

  if (tagName === 'input') {
    const type = resolveTextValue(control.attr('type') || 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      return control._el?.checked ?? Boolean(control.attr('checked'));
    }

    return control._el?.value ?? control.attr('value') ?? '';
  }

  if (tagName === 'select') {
    return control._el?.value ?? control.attr('value') ?? '';
  }

  if (tagName === 'textarea') {
    return control._el?.value ?? control.textContent();
  }

  if (typeof control.value === 'function') {
    try {
      return control.value();
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function applyControlValue(control, value) {
  if (!control) {
    return;
  }

  if (control instanceof VCheckboxes) {
    control.value(value);
    return;
  }

  if (control instanceof VCheckbox || control instanceof VSwitch) {
    control.value(value);
    return;
  }

  if (control instanceof VInput || control instanceof VSelect || control instanceof VTextarea) {
    control.value(value);
    return;
  }

  const tagName = typeof control.tagName === 'function' ? control.tagName() : '';

  if (tagName === 'textarea') {
    replaceChildren(control, normalizeChildren(resolveTextValue(value)));
    if (control._el) {
      control._el.value = resolveTextValue(value);
    }
    return;
  }

  if (tagName === 'select' || tagName === 'input') {
    const type =
      tagName === 'input' ? resolveTextValue(control.attr('type') || 'text').toLowerCase() : '';
    if (type === 'checkbox' || type === 'radio') {
      control.attr('checked', value ? true : null);
    } else {
      control.attr(
        'value',
        Array.isArray(value) ? resolveTextValue(value[0]) : resolveTextValue(value)
      );
    }
    return;
  }

  if (typeof control.value === 'function') {
    control.value(value);
  }
}

function collectFormValues(node, result) {
  if (!node || typeof node !== 'object') {
    return result;
  }

  if (node instanceof VForm) {
    node.children().forEach((child) => collectFormValues(child, result));
    return result;
  }

  if (node instanceof VField) {
    node.children().forEach((child) => collectFormValues(child, result));
    return result;
  }

  if (node instanceof VCheckboxes) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, node.value());
    }
    return result;
  }

  if (
    node instanceof VInput ||
    node instanceof VSelect ||
    node instanceof VTextarea ||
    node instanceof VCheckbox ||
    node instanceof VSwitch
  ) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, readControlValue(node));
    }
    return result;
  }

  const tagName = typeof node.tagName === 'function' ? node.tagName() : '';

  if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
    const name = typeof node.name === 'function' ? node.name() : node.attr?.('name');
    if (name) {
      assignFormValue(result, name, readControlValue(node));
    }
    return result;
  }

  if (typeof node.children === 'function') {
    node.children().forEach((child) => collectFormValues(child, result));
  }

  return result;
}

function applyFormValues(node, values) {
  if (!node || typeof node !== 'object' || !isPlainObject(values)) {
    return node;
  }

  function visit(current) {
    if (!current || typeof current !== 'object') {
      return;
    }

    if (current instanceof VField || current instanceof VForm) {
      current.children().forEach((child) => visit(child));
      return;
    }

    const name = typeof current.name === 'function' ? current.name() : current.attr?.('name');
    if (name && Object.prototype.hasOwnProperty.call(values, name)) {
      applyControlValue(current, values[name]);
      return;
    }

    if (typeof current.children === 'function') {
      current.children().forEach((child) => visit(child));
    }
  }

  visit(node);
  return node;
}

function validateFormControls(node) {
  let valid = true;

  function visit(current) {
    if (!current || !valid) {
      return;
    }

    if (current instanceof VForm || current instanceof VField) {
      current.children().forEach((child) => visit(child));
      return;
    }

    const isControl =
      current instanceof VCheckboxes ||
      current instanceof VInput ||
      current instanceof VSelect ||
      current instanceof VTextarea ||
      current instanceof VCheckbox ||
      current instanceof VSwitch ||
      (typeof current.tagName === 'function' &&
        ['input', 'select', 'textarea'].includes(current.tagName()));

    if (isControl) {
      if (!isControlDisabled(current) && isControlRequired(current)) {
        const value = readControlValue(current);
        if (Array.isArray(value)) {
          valid = value.length > 0;
        } else if (typeof value === 'boolean') {
          valid = value;
        } else {
          valid = value !== null && value !== undefined && String(value).length > 0;
        }
      }

      return;
    }

    if (typeof current.children === 'function') {
      current.children().forEach((child) => visit(child));
    }
  }

  visit(node);
  return valid;
}

function isControlRequired(control) {
  if (!control) {
    return false;
  }

  if (typeof control.required === 'function') {
    try {
      return Boolean(control.required());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('required'));
}

function isControlDisabled(control) {
  if (!control) {
    return false;
  }

  if (typeof control.disabled === 'function') {
    try {
      return Boolean(control.disabled());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('disabled'));
}

function findFieldControl(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (
    node instanceof VInput ||
    node instanceof VSelect ||
    node instanceof VTextarea ||
    node instanceof VCheckboxes ||
    node instanceof VCheckbox ||
    node instanceof VSwitch
  ) {
    return node;
  }

  if (typeof node.children !== 'function') {
    return null;
  }

  for (const child of node.children()) {
    const found = findFieldControl(child);
    if (found) {
      return found;
    }
  }

  return null;
}

function assignFormValue(result, name, value) {
  if (Object.prototype.hasOwnProperty.call(result, name)) {
    const existing = result[name];

    if (Array.isArray(existing)) {
      if (Array.isArray(value)) {
        result[name] = existing.concat(value);
      } else {
        existing.push(value);
      }
      return;
    }

    result[name] = Array.isArray(value) ? [existing].concat(value) : [existing, value];
    return;
  }

  result[name] = value;
}
