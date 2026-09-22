import { vNode } from '../../core/v-node.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  createComponentShortcut,
  delegateCommands,
  delegateNodeCommands,
  replaceChildren,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { BOOLEAN_CONTROL_COMMANDS, VBooleanControl } from './shared.js';

class RadioNode extends VBooleanControl {
  constructor(setup = null) {
    super('radio');
    // 身份：根 + 部件（基类只造结构，身份归组件自己写）
    this.setup({ vn: 'VRadio' });
    this._input.setup({ vn: 'VRadioInput' });
    this._visualBox.setup({ vn: 'VRadioVisual' });
    this._contentBox.setup({ vn: 'VRadioContent' });
    this._labelBox.setup({ vn: 'VRadioLabel' });
    this._descriptionBox.setup({ vn: 'VRadioDescription' });
    this._input.attr('type', 'radio');
    this._visualBox.styles({
      alignItems: 'center',
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border-strong', '#cbd5e1'),
      borderRadius: '999px',
      boxSizing: 'border-box',
      display: 'inline-flex',
      height: '16px',
      justifyContent: 'center',
      lineHeight: '1',
      transition: 'background 120ms ease, border-color 120ms ease',
      width: '16px'
    });
    this._syncVisual(false);
    // checked 在基类是实例属性（booleanMethod），互斥逻辑包一层而不是原型重写
    const baseChecked = this.checked;
    this.checked = (value) => {
      if (value !== undefined && value && this.name()) {
        const group = radioGroups.get(this.name());
        group?.forEach((other) => {
          if (other !== this && other.checked()) {
            other.checked(false);
          }
        });
      }

      return baseChecked(value);
    };
    this._setupBoolean(setup);
    registerRadio(this);
  }

  name(value) {
    if (value === undefined) {
      return super.name();
    }

    unregisterRadio(this);
    const result = super.name(value);
    registerRadio(this);
    return result;
  }

  destroy() {
    unregisterRadio(this);
    return super.destroy();
  }

  _syncVisual(enabled) {
    this._visualBox.styles({
      borderColor: enabled
        ? themeValue('color-primary', '#2563eb')
        : themeValue('color-border-strong', '#cbd5e1')
    });
    replaceChildren(this._visualBox, enabled ? [createRadioDot()] : []);
  }
}

export const radioGroups = new Map();

function registerRadio(radio) {
  const name = radio.name();
  if (!name) {
    return;
  }

  let group = radioGroups.get(name);
  if (!group) {
    group = new Set();
    radioGroups.set(name, group);
  }
  group.add(radio);
}

function unregisterRadio(radio) {
  const name = radio.name();
  if (!name) {
    return;
  }

  const group = radioGroups.get(name);
  group?.delete(radio);
  if (group && group.size === 0) {
    radioGroups.delete(name);
  }
}

function createRadioDot() {
  return new HtmlElementNode('span').setup({ vn: 'VRadioDot' }).styles({
    background: themeValue('color-primary', '#2563eb'),
    borderRadius: '999px',
    height: '8px',
    width: '8px'
  });
}

/**
 * 单选框（形态 B）：视图根是节点类型 `RadioNode`（元素机制住在节点上），命令挂到 `api`。
 */
export function VRadio(props = {}) {
  return vNode((api) => {
    const root = new RadioNode(props);

    delegateCommands(api, root, BOOLEAN_CONTROL_COMMANDS);
    delegateNodeCommands(api, root);

    /** 位置参数：字符串 / 数字 / 节点 / 数组 = 标签（迁移前 `_setupBoolean` 的兜底分支同口径）。 */
    api.setupString = (value) => {
      root.label(value);
      return api;
    };

    return root;
  });
}

export const vRadio = createComponentShortcut(VRadio, { props: true });

export { registerRadio, unregisterRadio, createRadioDot };
