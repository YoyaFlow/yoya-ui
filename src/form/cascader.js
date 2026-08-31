import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories, vText } from '../core/node.js';
import {
  applyComponentArguments,
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';

/**
 * vCascader 是级联选择控件：按层级从 options 树中逐级选择，
 * 选中路径以数组形式取值（value 为各级 value 组成的数组）。
 */
export class VCascader extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vcascader');
    this.styles({ position: 'relative' });

    this._options = [];
    this._value = [];
    this._activePath = [];
    this._placeholder = '请选择';
    this._changeHandlers = [];
    this._open = false;
    this._outsideListener = null;
    this._repositionListener = null;

    this._triggerText = vText(this._placeholder);
    this._trigger = new HtmlElementNode('button')
      .className('yoya-vcascader-trigger')
      .attr({
        'aria-expanded': 'false',
        'aria-haspopup': 'listbox',
        'data-vcascader-trigger': 'true',
        title: '选择',
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        font: 'inherit',
        gap: '8px',
        justifyContent: 'space-between',
        minHeight: 'var(--yoya-control-height-md, 34px)',
        padding: '0 10px',
        width: '100%'
      })
      .child(
        this._triggerText,
        new HtmlElementNode('span')
          .styles({ color: themeValue('color-text-muted', '#64748b'), fontSize: '12px' })
          .text('▾')
      )
      .on('click', () => this.toggle());

    this._columns = new HtmlElementNode('div')
      .className('yoya-vcascader-columns')
      .attr('data-vcascader-columns', 'true')
      .styles({ display: 'flex', minWidth: '0' });

    this._panel = new HtmlElementNode('div')
      .className('yoya-vcascader-panel')
      .attr('data-vcascader-panel', 'true')
      .styles({
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '8px',
        boxShadow: 'var(--yoya-shadow-md, 0 8px 18px rgba(15, 23, 42, 0.1))',
        boxSizing: 'border-box',
        display: 'none',
        left: '0',
        maxHeight: '260px',
        overflow: 'auto',
        padding: '4px',
        position: 'absolute',
        top: 'calc(100% + 6px)',
        width: '100%',
        zIndex: '110'
      })
      .child(this._columns);

    this.child(this._trigger, this._panel);
    this._setupCascader(setup);
    applyComponentArguments(this, options, callback);
  }

  /** 读写级联选项树（{ label, value, children }[]）。 */
  options(next) {
    if (next === undefined) {
      return cloneOptions(this._options);
    }
    this._options = normalizeOptions(next);
    this._syncTrigger();
    if (this._open) {
      this._renderColumns();
    }
    return this;
  }

  /** 读写选中路径（各级 value 组成的数组）。 */
  value(next) {
    if (next === undefined) {
      return [...this._value];
    }

    const values = Array.isArray(next) ? next : next === null || next === undefined ? [] : [next];
    const path = findPathByValues(this._options, values);
    this._value = path.map((option) => option.value);
    this._activePath = path;
    this._syncTrigger();
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }

    const disabled = Boolean(value);
    this.setState('disabled', disabled);
    this.attr('data-disabled', disabled ? 'true' : null);
    this._trigger.attr('disabled', disabled ? true : null);
    return this;
  }

  name(value) {
    if (value === undefined) {
      return this.attr('data-name') || '';
    }
    this.attr('data-name', value ? String(value) : null);
    return this;
  }

  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }
    this.setState('required', Boolean(value));
    this.attr('data-required', value ? 'true' : null);
    return this;
  }

  placeholder(value) {
    if (value === undefined) {
      return this._placeholder;
    }
    this._placeholder = String(value);
    this._syncTrigger();
    return this;
  }

  open(value = true) {
    this._open = Boolean(value);
    this._trigger.attr('aria-expanded', this._open ? 'true' : 'false');
    if (this._open) {
      this._renderColumns();
      this._panel.style('display', null);
      this._positionPanel();
    } else {
      this._panel.style('display', 'none');
    }
    this._bindOutsideClose(this._open);
    this._bindReposition(this._open);
    return this;
  }

  close() {
    return this.open(false);
  }

  toggle() {
    return this.open(!this._open);
  }

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

  renderDom() {
    const element = super.renderDom();
    if (this._open) {
      this._positionPanel();
    }
    return element;
  }

  destroy() {
    this._bindOutsideClose(false);
    this._bindReposition(false);
    return super.destroy();
  }

  _collectValue() {
    return [...this._value];
  }

  _renderColumns() {
    replaceChildren(this._columns, []);
    const levels = [];
    let levelOptions = this._options;

    this._activePath.forEach((active) => {
      levels.push(levelOptions);
      const next = levelOptions.find((option) => option.value === active.value);
      levelOptions = next ? next.children : [];
    });

    if (this._activePath.length === 0 || levelOptions.length > 0) {
      levels.push(levelOptions);
    }

    levels.forEach((options, level) => {
      const active = this._activePath[level] || null;
      const column = new HtmlElementNode('div').className('yoya-vcascader-column').styles({
        borderRight:
          level < levels.length - 1 ? '1px solid var(--yoya-color-border-faint, #efefef)' : '0',
        boxSizing: 'border-box',
        minWidth: '120px',
        padding: '2px'
      });

      options.forEach((option) => {
        const row = new HtmlElementNode('div')
          .className('yoya-vcascader-option')
          .attr({ 'data-vcascader-option': option.value, role: 'option' })
          .styles({
            alignItems: 'center',
            borderRadius: '4px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            display: 'flex',
            gap: '6px',
            justifyContent: 'space-between',
            padding: '4px 8px'
          })
          .on('mouseenter', () => {
            row.styles({ background: themeValue('color-surface-hover', '#f1f5f9') });
          })
          .on('mouseleave', () => {
            row.style('background', null);
          })
          .on('click', () => this._selectOption(level, option));

        const isActive = active !== null && active.value === option.value;
        if (isActive) {
          row.styles({
            background: themeValue('color-primary-subtle', '#eff6ff'),
            color: themeValue('color-primary-hover', '#1d4ed8')
          });
        }

        row.child(
          new HtmlElementNode('span')
            .styles({
              flex: '1 1 auto',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            })
            .text(option.label),
          option.children.length > 0
            ? new HtmlElementNode('span')
                .styles({ color: themeValue('color-text-muted', '#64748b'), fontSize: '12px' })
                .text('›')
            : null
        );
        column.child(row);
      });

      this._columns.child(column);
    });
  }

  _selectOption(level, option) {
    const path = this._activePath.slice(0, level);
    path.push(option);
    this._activePath = path;

    if (option.children.length > 0) {
      this._value = path.map((entry) => entry.value);
      this._syncTrigger();
      this._changeHandlers.forEach((handler) => handler([...this._value], this));
      this._renderColumns();
      return;
    }

    this._value = path.map((entry) => entry.value);
    this._syncTrigger();
    this._changeHandlers.forEach((handler) => handler([...this._value], this));
    this.close();
  }

  _syncTrigger() {
    if (this._value.length === 0) {
      this._triggerText.textContent(this._placeholder);
      return;
    }

    const labels = findPathByValues(this._options, this._value).map((option) => option.label);
    this._triggerText.textContent(labels.length > 0 ? labels.join(' / ') : this._value.join(' / '));
  }

  _bindOutsideClose(enabled) {
    if (enabled && !this._outsideListener) {
      this._outsideListener = (event) => {
        if (!this._el || !this._el.contains(event.target)) {
          this.close();
        }
      };
      document.addEventListener('mousedown', this._outsideListener);
      return;
    }

    if (!enabled && this._outsideListener) {
      document.removeEventListener('mousedown', this._outsideListener);
      this._outsideListener = null;
    }
  }

  _bindReposition(enabled) {
    if (enabled && !this._repositionListener) {
      this._repositionListener = () => this._positionPanel();
      window.addEventListener('scroll', this._repositionListener, true);
      window.addEventListener('resize', this._repositionListener);
      return;
    }

    if (!enabled && this._repositionListener) {
      window.removeEventListener('scroll', this._repositionListener, true);
      window.removeEventListener('resize', this._repositionListener);
      this._repositionListener = null;
    }
  }

  _positionPanel() {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !this._el ||
      !this._trigger._el
    ) {
      return;
    }

    const rect = this._trigger._el.getBoundingClientRect();
    const panel = this._panel._el;
    if (!panel) {
      return;
    }

    const panelHeight = panel.offsetHeight || 240;
    const margin = 8;
    let top = rect.bottom + 6;
    if (top + panelHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - panelHeight - 6);
    }
    this._panel.styles({ left: `${rect.left}px`, position: 'fixed', top: `${top}px` });
  }

  _setupCascader(setup) {
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
        name,
        onChange,
        options,
        placeholder,
        required,
        value,
        ...elementConfig
      } = setup;
      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (options !== undefined) {
        this.options(options);
      }
      if (placeholder !== undefined) {
        this.placeholder(placeholder);
      }
      if (value !== undefined) {
        this.value(value);
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

    this.options(setup);
  }
}

export function vCascader(first = null, second = null, third = null) {
  return createComponentFactory(VCascader, first, second, third);
}

registerChildFactories(HtmlElementNode, { vCascader });

function normalizeOptions(options) {
  return (Array.isArray(options) ? options : []).map((entry) => ({
    children: normalizeOptions(entry.children),
    label: String(entry.label ?? entry.value ?? ''),
    value: entry.value ?? entry.label ?? ''
  }));
}

function cloneOptions(options) {
  return options.map((option) => ({
    children: cloneOptions(option.children),
    label: option.label,
    value: option.value
  }));
}

function findPathByValues(options, values) {
  const path = [];
  let level = options;

  for (const value of values) {
    const option = level.find((entry) => entry.value === value);
    if (!option) {
      break;
    }
    path.push(option);
    level = option.children;
  }

  return path;
}
