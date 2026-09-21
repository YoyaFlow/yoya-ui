import { HtmlElementNode } from '../html/index.js';
import { defineComponentIdentity, registerChildFactories } from '../core/node.js';
import { createComponentShell } from '../components/component-shell.js';
import {
  booleanMethod,
  componentClass,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';

/**
 * vTagsInput 是标签输入控件：回车/逗号添加标签，退格删除，
 * 标签可点 × 移除，值以字符串数组收集。
 */
class TagsInputNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._identity = 'VTagsInput';
    this.className(componentClass, 'yoya-vtags-input');
    this.styles({
      alignItems: 'center',
      background: 'var(--yoya-color-surface, #ffffff)',
      border: '1px solid var(--yoya-color-border, #d8dee8)',
      borderRadius: '6px',
      boxSizing: 'border-box',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      minHeight: 'var(--yoya-control-height-md, 34px)',
      padding: '4px 8px',
      width: '100%'
    });

    this._value = [];
    this._placeholder = '输入后回车添加';
    this._changeHandlers = [];

    this._chips = new HtmlElementNode('div')
      .className('yoya-vtags-input-chips')
      .attr('data-vtags-chips', 'true')
      .styles({ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '6px' });

    this._input = new HtmlElementNode('input')
      .className('yoya-vtags-input-field')
      .attr({
        'data-vtags-input': 'true',
        placeholder: this._placeholder,
        type: 'text'
      })
      .styles({
        background: 'transparent',
        border: '0',
        boxSizing: 'border-box',
        flex: '1 1 120px',
        font: 'inherit',
        minWidth: '80px',
        outline: 'none',
        padding: '2px 0'
      })
      .on('keydown', (event) => this._handleKeydown(event));

    this.child(this._chips, this._input);
    this._renderChips();

    // 内部状态用 ref 持有、对外只暴露方法（票 01 约定，见 booleanMethod）
    this.disabled = booleanMethod(this, 'disabled', false, (enabled) => {
      this.attr('data-disabled', enabled ? 'true' : null);
      this._input.attr('disabled', enabled ? true : null);
    });
    this.required = booleanMethod(this, 'required', false, (enabled) => {
      this.attr('data-required', enabled ? 'true' : null);
    });

    this._setupTagsInput(setup);
  }

  /** 读写标签数组。 */
  value(next) {
    if (next === undefined) {
      return [...this._value];
    }

    this._value = (Array.isArray(next) ? next : []).map((item) => String(item)).filter(Boolean);
    this._renderChips();
    this._notifyChange();
    return this;
  }

  // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
  isDisabled() {
    return this._disabled.value;
  }

  name(value) {
    if (value === undefined) {
      return this.attr('data-name') || '';
    }
    this.attr('data-name', value ? String(value) : null);
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

  _collectValue() {
    return [...this._value];
  }

  /** 句柄交给使用方的是**组件节点**（外壳记在 `_componentHandle` 上），不是内部节点类型 */
  _notifyChange() {
    this._changeHandlers.forEach((handler) =>
      handler([...this._value], this._componentHandle ?? this)
    );
  }

  _addTag(raw) {
    const tag = String(raw).trim();
    if (!tag || this._value.includes(tag)) {
      return;
    }
    this._value.push(tag);
    this._renderChips();
    this._notifyChange();
  }

  _removeTag(index) {
    if (index < 0 || index >= this._value.length) {
      return;
    }
    this._value.splice(index, 1);
    this._renderChips();
    this._notifyChange();
  }

  _handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this._addTag(this._currentInputValue());
      this._input.attr('value', '');
      return;
    }

    if (event.key === 'Backspace' && !this._currentInputValue() && this._value.length > 0) {
      this._removeTag(this._value.length - 1);
    }
  }

  _currentInputValue() {
    return this._input._el?.value ?? this._input.attr('value') ?? '';
  }

  _renderChips() {
    replaceChildren(
      this._chips,
      this._value.map((tag, index) =>
        new HtmlElementNode('span')
          .className('yoya-vtags-input-tag')
          .attr('data-vtags-tag', tag)
          .styles({
            alignItems: 'center',
            background: themeValue('color-surface-muted', '#f1f5f9'),
            border: '1px solid var(--yoya-color-border-faint, #efefef)',
            borderRadius: '4px',
            boxSizing: 'border-box',
            display: 'inline-flex',
            fontSize: '13px',
            gap: '4px',
            padding: '1px 6px'
          })
          .child(
            new HtmlElementNode('span').child(tag),
            new HtmlElementNode('button')
              .attr({
                'aria-label': `移除 ${tag}`,
                'data-vtags-remove': 'true',
                title: '移除',
                type: 'button'
              })
              .styles({
                background: 'transparent',
                border: '0',
                color: themeValue('color-text-muted', '#64748b'),
                cursor: 'pointer',
                fontSize: '12px',
                lineHeight: '1',
                padding: '0'
              })
              .child('×')
              .on('click', () => this._removeTag(index))
          )
      )
    );
  }

  _setupTagsInput(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { change, disabled, name, onChange, placeholder, required, value, ...elementConfig } =
        setup;
      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
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

    this.value(setup);
  }
}

export function vTagsInput(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VTagsInput',
    createNode: (setup) => new TagsInputNode(setup),
    commands: [
      'value',
      'isDisabled',
      'name',
      'placeholder',
      'change',
      'onChange',
      // 构造函数里用 booleanMethod 挂的开关方法
      'disabled',
      'required'
    ],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VTagsInput = vTagsInput;
defineComponentIdentity(VTagsInput, 'VTagsInput');

registerChildFactories(HtmlElementNode, { vTagsInput });
