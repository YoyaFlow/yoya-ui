import { vNode } from '../../core/v-node.js';
import { ViewNode, hasComponentIdentity } from '../../core/node.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  booleanMethod,
  createComponentShortcut,
  delegateCommands,
  delegateNodeCommands,
  isPlainObject,
  replaceChildren,
  resolveTextValue
} from '../../components/shared.js';
import { VRadio, vRadio } from './radio.js';

/** 单选组的命令面（节点类型上的公开方法）。 */
const RADIOS_COMMANDS = [
  'change',
  'checkedValue',
  'clear',
  'disabled',
  'isDisabled',
  'options',
  'required',
  'value'
];

class RadiosNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._identity = 'VRadios';
    this._name = '';
    this._required = false;
    this._changeHandler = null;
    this._items = [];
    this._options = [];

    this.setup({ vn: 'VRadios' });
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

    this._setupRadios(setup);
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    this.attr('data-name', this._name || null);
    this._items.forEach((item) => item.name(this._name));
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

  change(handler) {
    if (handler === undefined) {
      return this._changeHandler;
    }

    this._changeHandler = typeof handler === 'function' ? handler : null;
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
      const selected = this._items.find((item) => item.checked());
      return selected ? selected.optionValue() : null;
    }

    const target = value === null || value === undefined ? null : String(resolveTextValue(value));

    this._items.forEach((item) => {
      item.checked(String(item.optionValue()) === target);
    });

    return this;
  }

  checkedValue(value) {
    return this.value(value);
  }

  clear() {
    return this.value(null);
  }

  _renderOptions() {
    const normalizedItems = this._options.map((option, index) =>
      createRadioGroupItem(option, index)
    );

    this._items = normalizedItems;
    replaceChildren(this, normalizedItems);
    this._items.forEach((item) => {
      item.on('change', () => this._handleItemChange(item));
      if (this._name) {
        item.name(this._name);
      }
    });
    this.value(this.value());
  }

  _handleItemChange(item) {
    if (!item.checked()) {
      return;
    }

    this._items.forEach((otherItem) => {
      if (otherItem !== item) {
        otherItem.checked(false);
      }
    });

    if (typeof this._changeHandler === 'function') {
      // 句柄交给使用方的是**组件节点**（定义函数把取用方法挂成 `_handleOf`），不是内部节点类型
      this._changeHandler(item.optionValue(), this._handleOf?.() ?? this);
    }
  }

  _setupRadios(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, change, disabled, name, options, required, value, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (name !== undefined) {
        this.name(name);
      }

      if (change !== undefined) {
        this.change(change);
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

/**
 * 单选组（形态 B）：视图根是节点类型 `RadiosNode`（元素机制住在节点上），命令挂到 `api`。
 */
export function VRadios(props = {}) {
  return vNode((api, self) => {
    const root = new RadiosNode(props);

    delegateCommands(api, root, RADIOS_COMMANDS);
    delegateNodeCommands(api, root);
    // `change` 回调的第二参 = 组件句柄（句柄要等 setup 返回后才取得到，所以按取用方法挂）
    root._handleOf = () => self.node();

    /** 位置参数：字符串 = 一个选项；数组 = 一组选项（迁移前 `_setupRadios` 的兜底分支同口径）。 */
    api.setupObject = (config) => {
      if (Array.isArray(config)) {
        api.options(config);
        return api;
      }

      root.setup(config);
      return api;
    };
    api.setupString = (value) => {
      api.options([value]);
      return api;
    };

    return root;
  });
}

export const vRadios = createComponentShortcut(VRadios, { props: true });

function createRadioGroupItem(option, index) {
  if (hasComponentIdentity(option, 'VRadio')) {
    return option;
  }

  if (option instanceof ViewNode && !(option instanceof HtmlElementNode)) {
    return vRadio(option);
  }

  const normalized = normalizeRadioGroupOption(option, index);

  return VRadio({
    checked: normalized.checked,
    description: normalized.description,
    disabled: normalized.disabled,
    label: normalized.label,
    optionValue: normalized.value,
    required: normalized.required
  });
}

function normalizeRadioGroupOption(option, index) {
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

  if (hasComponentIdentity(option, 'VRadio')) {
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

export { createRadioGroupItem, normalizeRadioGroupOption };
