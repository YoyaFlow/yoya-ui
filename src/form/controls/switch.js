import { createComponentShell } from '../../components/component-shell.js';
import { defineComponentIdentity } from '../../core/node.js';
import { HtmlElementNode } from '../../html/index.js';
import { themeBorder, themeValue } from '../../components/shared.js';
import { VBooleanControl } from './shared.js';

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

export function vSwitch(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VSwitch',
    createNode: (setup) => new SwitchNode(setup),
    commands: [
      'label',
      'text',
      'content',
      'description',
      'isDisabled',
      'value',
      'optionValue',
      // 布尔控件的选中态：构造函数里以实例方法挂上（shared.js 的 booleanMethod）
      'checked',
      // 构造函数里用 booleanMethod 挂的开关方法
      'disabled',
      'required',
      'indeterminate'
    ],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VSwitch = vSwitch;
defineComponentIdentity(VSwitch, 'VSwitch');
