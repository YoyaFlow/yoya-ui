import { vNode } from '../../core/v-node.js';
import {
  createComponentShortcut,
  delegateCommands,
  delegateNodeCommands,
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { BOOLEAN_CONTROL_COMMANDS, VBooleanControl } from './shared.js';

class CheckboxNode extends VBooleanControl {
  constructor(setup = null) {
    super('checkbox');
    // 身份：根 + 部件（基类只造结构，身份归组件自己写）
    this.setup({ vn: 'VCheckbox' });
    this._input.setup({ vn: 'VCheckboxInput' });
    this._visualBox.setup({ vn: 'VCheckboxVisual' });
    this._contentBox.setup({ vn: 'VCheckboxContent' });
    this._labelBox.setup({ vn: 'VCheckboxLabel' });
    this._descriptionBox.setup({ vn: 'VCheckboxDescription' });
    this._visualBox.styles({
      alignItems: 'center',
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border-strong', '#cbd5e1'),
      borderRadius: '4px',
      boxSizing: 'border-box',
      color: themeValue('color-text-inverse', '#ffffff'),
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
      background: enabled
        ? themeValue('color-primary', '#2563eb')
        : themeValue('color-surface', '#ffffff'),
      borderColor: enabled
        ? themeValue('color-primary', '#2563eb')
        : themeValue('color-border-strong', '#cbd5e1'),
      color: enabled ? themeValue('color-text-inverse', '#ffffff') : 'transparent'
    });
    replaceChildren(this._visualBox, enabled ? normalizeChildren('✓') : []);
  }
}

/**
 * 复选框（形态 B）：视图根是节点类型 `CheckboxNode`（元素机制住在节点上），命令挂到 `api`。
 * 定义收 props、快捷方法 `vCheckbox` 负责调用方参数的 setup 分派。
 */
export function VCheckbox(props = {}) {
  return vNode((api) => {
    const root = new CheckboxNode(props);

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

export const vCheckbox = createComponentShortcut(VCheckbox, { props: true });
