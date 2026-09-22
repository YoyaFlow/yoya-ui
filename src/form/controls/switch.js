import { vNode } from '../../core/v-node.js';
import { HtmlElementNode } from '../../html/index.js';
import {
  createComponentShortcut,
  delegateCommands,
  delegateNodeCommands,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { BOOLEAN_CONTROL_COMMANDS, VBooleanControl } from './shared.js';

class SwitchNode extends VBooleanControl {
  constructor(setup = null) {
    super('switch');
    // 身份：根 + 部件（基类只造结构，身份归组件自己写）
    this.setup({ vn: 'VSwitch' });
    this._input.setup({ vn: 'VSwitchInput' });
    this._visualBox.setup({ vn: 'VSwitchVisual' });
    this._contentBox.setup({ vn: 'VSwitchContent' });
    this._labelBox.setup({ vn: 'VSwitchLabel' });
    this._descriptionBox.setup({ vn: 'VSwitchDescription' });
    this._thumbBox = new HtmlElementNode('span').setup({ vn: 'VSwitchThumb' });
    this._visualBox.styles({
      background: themeValue('color-border-strong', '#cbd5e1'),
      border: themeBorder('color-border-strong', '#cbd5e1'),
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
      background: themeValue('color-surface', '#ffffff'),
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
      background: enabled
        ? themeValue('color-primary', '#2563eb')
        : themeValue('color-border-strong', '#cbd5e1'),
      borderColor: enabled
        ? themeValue('color-primary', '#2563eb')
        : themeValue('color-border-strong', '#cbd5e1')
    });
    this._thumbBox.style('transform', enabled ? 'translateX(18px)' : 'translateX(0)');
  }
}

/**
 * 开关（形态 B）：视图根是节点类型 `SwitchNode`（元素机制住在节点上），命令挂到 `api`。
 */
export function VSwitch(props = {}) {
  return vNode((api) => {
    const root = new SwitchNode(props);

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

export const vSwitch = createComponentShortcut(VSwitch, { props: true });
