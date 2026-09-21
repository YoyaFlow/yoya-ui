import { createComponentFactory, isPlainObject } from '../../components/shared.js';
import { VInput } from './input.js';

export class VTimer extends VInput {
  constructor(setup = null) {
    super(null);
    this.className('yoya-vtimer');
    this._clearButton.className('yoya-vtimer-clear');
    this._addRootClass('yoya-vtimer-wrap');
    this.mode('date');
    this._setupTimer(setup);
  }

  mode(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    const supportedModes = new Set(['date', 'datetime-local', 'time']);
    this.attr('type', supportedModes.has(value) ? value : 'date');
    return this;
  }

  type(value) {
    return value === undefined ? this.mode() : this.mode(value);
  }

  _setupTimer(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { mode, type, ...inputSetup } = setup;

      this._setupInput(inputSetup);
      if (mode !== undefined) {
        this.mode(mode);
      } else if (type !== undefined) {
        this.mode(type);
      }
      return;
    }

    this.value(setup);
  }
}

export function vTimer(first = null, second = null, third = null) {
  return createComponentFactory(VTimer, first, second, third, arguments);
}
