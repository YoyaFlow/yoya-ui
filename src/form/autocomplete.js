import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories } from '../core/node.js';
import { bindDocumentEvent, bindWindowEvent } from '../core/document-events.js';
import {
  applyComponentArguments,
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';

/**
 * vAutocomplete 是自动完成输入：输入时从 source（数组或函数）过滤建议，
 * 支持键盘上下/回车选择与鼠标点选。
 */
export class VAutocomplete extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vautocomplete');
    this.styles({ position: 'relative', width: '100%' });

    this._value = '';
    this._source = [];
    this._limit = 8;
    this._placeholder = '输入以搜索';
    this._changeHandlers = [];
    this._open = false;
    this._highlight = -1;
    this._suggestions = [];
    this._optionNodes = [];
    this._outsideListener = null;
    this._repositionListener = null;

    this._input = new HtmlElementNode('input')
      .className('yoya-vautocomplete-input')
      .attr({
        autocomplete: 'off',
        'data-vautocomplete-input': 'true',
        placeholder: this._placeholder,
        type: 'text'
      })
      .styles({
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: 'inherit',
        font: 'inherit',
        minHeight: 'var(--yoya-control-height-md, 34px)',
        outline: 'none',
        padding: '0 10px',
        width: '100%'
      })
      .on('input', (event) => this._handleInput(event.target.value))
      .on('keydown', (event) => this._handleKeydown(event))
      .on('focus', () => this._openSuggestions())
      .on('click', () => this._openSuggestions());

    this._list = new HtmlElementNode('div')
      .className('yoya-vautocomplete-list')
      .attr('data-vautocomplete-list', 'true')
      .styles({
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '8px',
        boxShadow: 'var(--yoya-shadow-md, 0 8px 18px rgba(15, 23, 42, 0.1))',
        boxSizing: 'border-box',
        display: 'none',
        maxHeight: '240px',
        overflow: 'auto',
        padding: '4px',
        position: 'fixed',
        zIndex: '110'
      });

    this.child(this._input, this._list);
    this._setupAutocomplete(setup);
    applyComponentArguments(this, options, callback);
  }

  /** 读写当前输入值。 */
  value(next) {
    if (next === undefined) {
      return this._value;
    }
    this._value = String(next ?? '');
    this._input.attr('value', this._value);
    this._changeHandlers.forEach((handler) => handler(this._value, this));
    return this;
  }

  /** 设置建议来源：选项数组或返回建议的同步函数。 */
  source(next) {
    if (next === undefined) {
      return this._source;
    }
    this._source = next;
    return this;
  }

  options(next) {
    return this.source(next);
  }

  /** 建议列表最多显示的条数。 */
  limit(next) {
    if (next === undefined) {
      return this._limit;
    }
    this._limit = Math.max(1, Number(next) || 8);
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

  placeholder(value) {
    if (value === undefined) {
      return this._placeholder;
    }
    this._placeholder = String(value);
    this._input.attr('placeholder', this._placeholder);
    return this;
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

  close() {
    this._open = false;
    this._list.style('display', 'none');
    this._bindOutsideClose(false);
    this._bindReposition(false);
    return this;
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  renderDom() {
    const element = super.renderDom();
    if (this._open) {
      this._positionList();
    }
    return element;
  }

  _collectValue() {
    return this._value;
  }

  _resolveSuggestions(query) {
    const source = this._source;
    if (typeof source === 'function') {
      return Promise.resolve(source(query)).then((items) => normalizeSuggestions(items));
    }
    return Promise.resolve(normalizeSuggestions(source)).then((items) =>
      query
        ? items.filter((item) => item.label.toLowerCase().includes(String(query).toLowerCase()))
        : items
    );
  }

  _handleInput(query) {
    this.value(query);
    this._openSuggestions();
  }

  _openSuggestions() {
    if (this.getBooleanState('disabled')) {
      return;
    }

    void this._resolveSuggestions(this._value).then((items) => {
      this._suggestions = items.slice(0, this._limit);
      this._highlight = this._suggestions.length > 0 ? 0 : -1;
      this._renderList();
      this._open = this._suggestions.length > 0;
      this._list.style('display', this._open ? null : 'none');
      if (this._open) {
        this._bindOutsideClose(true);
        this._bindReposition(true);
        this._positionList();
      }
    });
  }

  _handleKeydown(event) {
    if (!this._open || this._suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this._highlight = (this._highlight + 1) % this._suggestions.length;
      this._setHighlight(this._highlight);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this._highlight = (this._highlight - 1 + this._suggestions.length) % this._suggestions.length;
      this._setHighlight(this._highlight);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this._suggestions[this._highlight];
      if (item) {
        this._select(item);
      }
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  _select(item) {
    this.value(item.value);
    this.close();
  }

  _renderList() {
    this._optionNodes = [];
    replaceChildren(
      this._list,
      this._suggestions.map((item, index) => {
        const option = new HtmlElementNode('div')
          .className('yoya-vautocomplete-option')
          .attr({ 'data-vautocomplete-option': item.value, role: 'option' })
          .styles({
            borderRadius: '4px',
            boxSizing: 'border-box',
            cursor: 'pointer',
            overflow: 'hidden',
            padding: '5px 8px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          })
          .on('mousedown', (event) => {
            event.preventDefault();
            this._select(item);
          })
          .on('mouseenter', () => this._setHighlight(index))
          .text(item.label);
        this._optionNodes.push(option);
        return option;
      })
    );
    this._setHighlight(this._highlight);
    return this;
  }

  /** 只更新高亮样式，不重建下拉列表（避免悬停时销毁正在点击的节点）。 */
  _setHighlight(index) {
    this._highlight = index;
    (this._optionNodes || []).forEach((option, optionIndex) => {
      option.styles(
        optionIndex === index
          ? { background: themeValue('color-primary-subtle', '#eff6ff') }
          : { background: null }
      );
    });
    return this;
  }

  _bindOutsideClose(enabled) {
    if (enabled && !this._outsideUnbind) {
      this._outsideListener = (event) => {
        if (!this._el || !this._el.contains(event.target)) {
          this.close();
        }
      };
      this._outsideUnbind = bindDocumentEvent('mousedown', this._outsideListener);
      return;
    }

    if (!enabled && this._outsideUnbind) {
      this._outsideUnbind();
      this._outsideListener = null;
      this._outsideUnbind = null;
    }
  }

  _bindReposition(enabled) {
    if (enabled && !this._repositionUnbind) {
      this._repositionListener = () => this._positionList();
      const unbindScroll = bindWindowEvent('scroll', this._repositionListener, true);
      const unbindResize = bindWindowEvent('resize', this._repositionListener);
      this._repositionUnbind = () => {
        unbindScroll();
        unbindResize();
      };
      return;
    }

    if (!enabled && this._repositionUnbind) {
      this._repositionUnbind();
      this._repositionListener = null;
      this._repositionUnbind = null;
    }
  }

  /** 根据输入框坐标定位下拉列表（fixed 定位，脱离容器裁剪）。 */
  _positionList() {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !this._input._el ||
      !this._list._el
    ) {
      return;
    }

    const rect = this._input._el.getBoundingClientRect();
    const panel = this._list._el;
    const panelHeight = panel.offsetHeight || 240;
    const margin = 8;
    let top = rect.bottom + 6;
    if (top + panelHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - panelHeight - 6);
    }

    this._list.styles({
      left: `${rect.left}px`,
      top: `${top}px`,
      width: `${Math.max(rect.width, 180)}px`
    });
  }

  _setupAutocomplete(setup) {
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
        limit,
        name,
        onChange,
        options,
        placeholder,
        required,
        source,
        value,
        ...elementConfig
      } = setup;
      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (source !== undefined) {
        this.source(source);
      } else if (options !== undefined) {
        this.options(options);
      }
      if (limit !== undefined) {
        this.limit(limit);
      }
      if (value !== undefined) {
        this.value(value);
      }
      if (placeholder !== undefined) {
        this.placeholder(placeholder);
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

export function vAutocomplete(first = null, second = null, third = null) {
  return createComponentFactory(VAutocomplete, first, second, third);
}

registerChildFactories(HtmlElementNode, { vAutocomplete });

function normalizeSuggestions(source) {
  return (Array.isArray(source) ? source : []).map((entry) => {
    if (typeof entry === 'string' || typeof entry === 'number') {
      return { label: String(entry), value: String(entry) };
    }
    return {
      label: String(entry.label ?? entry.value ?? ''),
      value: entry.value ?? entry.label ?? ''
    };
  });
}
