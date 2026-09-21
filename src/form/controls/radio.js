import { HtmlElementNode } from '../../html/index.js';
import {
  createComponentFactory,
  replaceChildren,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { VBooleanControl } from './shared.js';

export class VRadio extends VBooleanControl {
  constructor(setup = null) {
    super('radio');
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
  return new HtmlElementNode('span').className('yoya-vradio-dot').styles({
    background: themeValue('color-primary', '#2563eb'),
    borderRadius: '999px',
    height: '8px',
    width: '8px'
  });
}

export function vRadio(first = null, second = null, third = null) {
  return createComponentFactory(VRadio, first, second, third, arguments);
}

export { registerRadio, unregisterRadio, createRadioDot };
