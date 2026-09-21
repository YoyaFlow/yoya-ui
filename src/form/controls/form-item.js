import { createComponentShell } from '../../components/component-shell.js';
import { defineComponentIdentity } from '../../core/node.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  componentClass,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot,
  themeValue
} from '../../components/shared.js';
import { isEmptyFormValue } from './shared.js';
import { applyControlValue, findFieldControl, readControlValue } from './form-values.js';

class FormItemNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._identity = 'VFormItem';
    this._collectValue = null;
    this._fallbackMessage = '校验未通过';
    this._hintVisible = false;
    this._name = '';
    this._required = false;
    this._requiredIndicatorContent = null;
    this._requiredMessage = '该项为必填';
    this._validators = [];
    this._labelBox = new HtmlElementNode('label').className('yoya-vform-item-label');
    this._requiredIndicator = new HtmlElementNode('span')
      .className('yoya-vform-item-required-indicator')
      .style('display', 'none');
    this._labelRow = new HtmlElementNode('div').className('yoya-vform-item-label-row');
    this._editorBox = new HtmlElementNode('div').className('yoya-vform-item-editor');
    this._hintBox = new HtmlElementNode('div')
      .className('yoya-vform-item-hint')
      .style('display', 'none');
    this._errorBox = new HtmlElementNode('div')
      .className('yoya-vform-item-error')
      .style('display', 'none');

    this.className(componentClass, 'yoya-vform-item');
    this.styles({
      display: 'grid',
      gap: '6px',
      minWidth: '0'
    });
    this._labelBox.styles({
      color: themeValue('color-text-strong', '#111827'),
      fontWeight: '700',
      lineHeight: '1.35'
    });
    this._requiredIndicator.styles({
      color: themeValue('color-danger', '#dc2626'),
      fontWeight: '700',
      lineHeight: '1.35'
    });
    this._labelRow.styles({
      alignItems: 'center',
      display: 'flex',
      gap: '4px',
      minWidth: '0'
    });
    this._editorBox.styles({ minWidth: '0' });
    this._hintBox.styles({
      color: themeValue('color-text-muted', '#64748b'),
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._errorBox.styles({
      color: themeValue('color-text-danger', '#b91c1c'),
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._labelRow.child(this._requiredIndicator, this._labelBox);
    this.child(this._labelRow, this._editorBox, this._hintBox, this._errorBox);
    this._editorBox.collectValue = (callback) => {
      if (callback === undefined) {
        return this._collectValue;
      }

      this._collectValue = typeof callback === 'function' ? callback : null;
      this._editorBox._collectValue = this._collectValue;
      return this._editorBox;
    };
    this._editorBox.on('input', () => this.error(''));
    this._editorBox.on('change', () => this.error(''));
    this._setupFormItem(setup);
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    return this;
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
    this._hintVisible = hasContent;
    this._hintBox.style('display', this._hintVisible ? null : 'none');
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
    this._hintBox.style('display', hasContent ? 'none' : this._hintVisible ? null : 'none');
    replaceChildren(this._errorBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  control(setup) {
    if (setup === undefined) {
      return this._editorBox;
    }

    setupContentSlot(this._editorBox, setup);
    return this;
  }

  editor(setup) {
    return this.control(setup);
  }

  required(value = true, messageOrOptions) {
    if (value === undefined) {
      return this._required;
    }

    let indicator = null;
    if (typeof value === 'string') {
      this._required = true;
      this._requiredMessage = value;
      if (isPlainObject(messageOrOptions)) {
        indicator = messageOrOptions.indicator ?? null;
      } else if (messageOrOptions !== undefined) {
        indicator = messageOrOptions;
      }
    } else if (isPlainObject(value)) {
      this._required = true;
      if (value.message !== undefined) {
        this._requiredMessage = resolveTextValue(value.message);
      }
      indicator = value.indicator ?? null;
    } else {
      this._required = Boolean(value);
      if (isPlainObject(messageOrOptions)) {
        if (messageOrOptions.message !== undefined) {
          this._requiredMessage = resolveTextValue(messageOrOptions.message);
        }
        indicator = messageOrOptions.indicator ?? null;
      } else if (messageOrOptions !== undefined) {
        indicator = messageOrOptions;
      }
    }
    this._requiredIndicatorContent = indicator ?? null;
    this._syncRequiredIndicator();
    this.attr('data-required', this._required ? 'true' : null);
    return this;
  }

  _syncRequiredIndicator() {
    const hasIndicator =
      this._requiredIndicatorContent !== null &&
      this._requiredIndicatorContent !== undefined &&
      this._requiredIndicatorContent !== '';
    this._requiredIndicator.style('display', hasIndicator ? null : 'none');
    replaceChildren(
      this._requiredIndicator,
      hasIndicator ? normalizeChildren(this._requiredIndicatorContent) : []
    );
    return this;
  }

  validate(callback) {
    if (callback === undefined) {
      return this._validators.slice();
    }

    if (typeof callback === 'function') {
      this._validators.push(callback);
    }
    return this;
  }

  rules(callbacks) {
    if (Array.isArray(callbacks)) {
      callbacks.forEach((callback) => this.validate(callback));
    }
    return this;
  }

  value(value) {
    if (value === undefined) {
      return readControlValue(this._editorBox);
    }

    applyControlValue(this._editorBox, value);
    return this;
  }

  _validate(formValues) {
    const control = findFieldControl(this._editorBox);
    const value = this.value();

    if (this._required && isEmptyFormValue(value, control)) {
      this.error(this._requiredMessage);
      return false;
    }

    for (const validator of this._validators) {
      // 句柄交给使用方的是**组件节点**（外壳记在 `_componentHandle` 上），不是内部节点类型
      const result = validator(value, formValues, this._componentHandle ?? this);
      if (typeof result === 'string' && result) {
        this.error(result);
        return false;
      }
      if (result === false) {
        this.error(this._fallbackMessage);
        return false;
      }
    }

    this.error('');
    return true;
  }

  _setupFormItem(setup) {
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
        editor,
        error,
        hint,
        label,
        name,
        required,
        rules,
        validate,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (name !== undefined) {
        this.name(name);
      }

      if (label !== undefined) {
        this.label(label);
      }

      if (hint !== undefined) {
        this.hint(hint);
      }

      if (editor !== undefined) {
        this.editor(editor);
      } else if (control !== undefined) {
        this.control(control);
      } else if (children !== undefined) {
        this.editor(children);
      }

      if (required !== undefined) {
        this.required(required);
      }

      if (validate !== undefined) {
        this.validate(validate);
      }

      if (rules !== undefined) {
        this.rules(rules);
      }

      if (value !== undefined) {
        this.value(value);
      }

      if (error !== undefined) {
        this.error(error);
      }

      return;
    }

    this.label(setup);
  }
}

export function vFormItem(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VFormItem',
    createNode: (setup) => new FormItemNode(setup),
    commands: [
      'label',
      'hint',
      'error',
      'control',
      'editor',
      'required',
      'validate',
      'rules',
      'value'
    ],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VFormItem = vFormItem;
defineComponentIdentity(VFormItem, 'VFormItem');
