import { HtmlElementNode } from '../../html/index.js';
import { createComponentFactory, themeBorder, themeValue } from '../../components/shared.js';
import { VBooleanControl } from './shared.js';

export class VSwitch extends VBooleanControl {
  constructor(setup = null) {
    super('switch');
    this._thumbBox = new HtmlElementNode('span').className('yoya-vswitch-thumb');
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
  return createComponentFactory(VSwitch, first, second, third, arguments);
}
