import { ViewNode } from '../../core/node.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  booleanMethod,
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  resolveTextValue
} from '../../components/shared.js';
import { VCheckbox, vCheckbox } from './checkbox.js';
import { normalizeValueList } from './shared.js';

export class VCheckboxes extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._name = '';
    this._multiple = true;
    this._required = false;
    this._items = [];
    this._options = [];

    this._columns = null;
    this.className(componentClass, 'yoya-vcheckboxes');
    this.styles({
      display: 'grid',
      gap: '8px',
      minWidth: '0'
    });

    // 内部状态用 ref 持有、对外只暴露方法（票 01 约定，见 booleanMethod）
    this.disabled = booleanMethod(this, 'disabled', false, (enabled) => {
      this.attr('aria-disabled', enabled ? 'true' : null);
      this.style('opacity', enabled ? '0.64' : '1');
      this._items.forEach((item) => item.disabled(enabled));
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

  // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
  isDisabled() {
    return this._disabled.value;
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

  columns(value) {
    if (value === undefined) {
      return this._columns;
    }
    this._columns = Number(value) >= 1 ? Number(value) : null;
    this.style(
      'gridTemplateColumns',
      this._columns ? 'repeat(' + this._columns + ', minmax(0, 1fr))' : null
    );
    return this;
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
      const {
        children,
        disabled,
        multiple,
        name,
        options,
        required,
        value,
        columns,
        ...elementConfig
      } = setup;

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

      if (columns !== undefined) {
        this.columns(columns);
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

export function vCheckboxes(first = null, second = null, third = null) {
  return createComponentFactory(VCheckboxes, first, second, third, arguments);
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

export { createCheckboxGroupItem, normalizeCheckboxGroupOption };
