import { createComponentShell } from '../../components/component-shell.js';
import { defineComponentIdentity } from '../../core/node.js';
import {
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { VBooleanControl } from './shared.js';

class CheckboxNode extends VBooleanControl {
  constructor(setup = null) {
    super('checkbox');
    this._identity = 'VCheckbox';
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

export function vCheckbox(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VCheckbox',
    createNode: (setup) => new CheckboxNode(setup),
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

export const VCheckbox = vCheckbox;
defineComponentIdentity(VCheckbox, 'VCheckbox');
