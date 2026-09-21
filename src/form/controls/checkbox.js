import {
  createComponentFactory,
  normalizeChildren,
  replaceChildren,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { VBooleanControl } from './shared.js';

export class VCheckbox extends VBooleanControl {
  constructor(setup = null) {
    super('checkbox');
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
  return createComponentFactory(VCheckbox, first, second, third, arguments);
}
