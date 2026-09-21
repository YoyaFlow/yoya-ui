import { HtmlElementNode } from '../../html/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  isPlainObject
} from '../../components/shared.js';
import { applyFormValues, collectFormValues, validateFormControls } from './form-values.js';

export class VForm extends HtmlElementNode {
  constructor(setup = null) {
    super('form', null);

    this.className(componentClass, 'yoya-vform');
    this.styles({
      display: 'grid',
      gap: '16px',
      minWidth: '0'
    });

    this._setupForm(setup);
  }

  values(value) {
    if (value === undefined) {
      const result = {};
      collectFormValues(this, result);
      return result;
    }

    if (isPlainObject(value)) {
      applyFormValues(this, value);
    }

    return this;
  }

  value(value) {
    return this.values(value);
  }

  validate() {
    const values = this.values();
    return validateFormControls(this, values);
  }

  reset() {
    if (this._el?.reset) {
      this._el.reset();
    }

    return this;
  }

  submit() {
    if (this._el?.requestSubmit) {
      this._el.requestSubmit();
    } else if (this._el?.dispatchEvent) {
      this._el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    return this;
  }

  _setupForm(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, values, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (children !== undefined) {
        applyComponentSetup(this, children);
      }

      if (values !== undefined) {
        this.values(values);
      }

      return;
    }

    this.child(setup);
  }
}

export function vForm(first = null, second = null, third = null) {
  return createComponentFactory(VForm, first, second, third, arguments);
}
