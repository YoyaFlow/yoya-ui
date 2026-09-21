import { VRate } from '../rate.js';
import { VSlider } from '../slider.js';
import { VCascader } from '../cascader.js';
import { VTagsInput } from '../tags-input.js';
import { VAutocomplete } from '../autocomplete.js';
import {
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue
} from '../../components/shared.js';
import { VInput } from './input.js';
import { VTextarea } from './textarea.js';
import { VSelect } from './select.js';
import { VCheckbox } from './checkbox.js';
import { VSwitch } from './switch.js';
import { VCheckboxes } from './checkboxes.js';
import { VRadio } from './radio.js';
import { VRadios } from './radios.js';
import { VField } from './field.js';
import { VFormItem } from './form-item.js';
import { VForm } from './form.js';
import { assignFormValue, isControlDisabled, isControlRequired } from './shared.js';

function readControlValue(control) {
  if (!control) {
    return undefined;
  }

  if (typeof control._collectValue === 'function') {
    return control._collectValue();
  }

  if (control instanceof VCheckboxes) {
    return control.value();
  }

  if (control instanceof VRadios) {
    return control.value();
  }

  if (control instanceof VRate) {
    return control.value();
  }

  if (
    control instanceof VSlider ||
    control instanceof VCascader ||
    control instanceof VTagsInput ||
    control instanceof VAutocomplete
  ) {
    return control.value();
  }

  if (control instanceof VCheckbox || control instanceof VSwitch || control instanceof VRadio) {
    return control.value();
  }

  if (control instanceof VInput || control instanceof VSelect || control instanceof VTextarea) {
    return control.value();
  }

  const tagName = typeof control.tagName === 'function' ? control.tagName() : '';

  if (tagName === 'input') {
    const type = resolveTextValue(control.attr('type') || 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      return control._el?.checked ?? Boolean(control.attr('checked'));
    }

    return control._el?.value ?? control.attr('value') ?? '';
  }

  if (tagName === 'select') {
    return control._el?.value ?? control.attr('value') ?? '';
  }

  if (tagName === 'textarea') {
    return control._el?.value ?? control.textContent();
  }

  if (typeof control.value === 'function') {
    try {
      return control.value();
    } catch {
      return undefined;
    }
  }

  if (typeof control.children === 'function') {
    for (const child of control.children()) {
      const value = readControlValue(child);
      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

function applyControlValue(control, value) {
  if (!control) {
    return;
  }

  if (control instanceof VCheckboxes) {
    control.value(value);
    return;
  }

  if (control instanceof VRadios) {
    control.value(value);
    return;
  }

  if (control instanceof VRate) {
    control.value(value);
    return;
  }

  if (
    control instanceof VSlider ||
    control instanceof VCascader ||
    control instanceof VTagsInput ||
    control instanceof VAutocomplete
  ) {
    control.value(value);
    return;
  }

  if (control instanceof VCheckbox || control instanceof VSwitch || control instanceof VRadio) {
    control.value(value);
    return;
  }

  if (control instanceof VInput || control instanceof VSelect || control instanceof VTextarea) {
    control.value(value);
    return;
  }

  const tagName = typeof control.tagName === 'function' ? control.tagName() : '';

  if (tagName === 'textarea') {
    replaceChildren(control, normalizeChildren(resolveTextValue(value)));
    if (control._el) {
      control._el.value = resolveTextValue(value);
    }
    return;
  }

  if (tagName === 'select' || tagName === 'input') {
    const type =
      tagName === 'input' ? resolveTextValue(control.attr('type') || 'text').toLowerCase() : '';
    if (type === 'checkbox' || type === 'radio') {
      control.attr('checked', value ? true : null);
    } else {
      control.attr(
        'value',
        Array.isArray(value) ? resolveTextValue(value[0]) : resolveTextValue(value)
      );
    }
    return;
  }

  if (typeof control.value === 'function') {
    control.value(value);
    return;
  }

  if (typeof control.children === 'function') {
    for (const child of control.children()) {
      if (readControlValue(child) !== undefined || typeof child.value === 'function') {
        applyControlValue(child, value);
        return;
      }
    }
  }
}

function collectFormValues(node, result) {
  if (!node || typeof node !== 'object') {
    return result;
  }

  if (node instanceof VForm) {
    node.children().forEach((child) => collectFormValues(child, result));
    return result;
  }

  if (node instanceof VField) {
    node.children().forEach((child) => collectFormValues(child, result));
    return result;
  }

  if (node instanceof VFormItem) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, node.value());
    }
    return result;
  }

  if (node instanceof VCheckboxes) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, node.value());
    }
    return result;
  }

  if (node instanceof VRadios) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, node.value());
    }
    return result;
  }

  if (
    node instanceof VInput ||
    node instanceof VSelect ||
    node instanceof VTextarea ||
    node instanceof VCheckbox ||
    node instanceof VRadio ||
    node instanceof VSwitch ||
    node instanceof VRate ||
    node instanceof VSlider ||
    node instanceof VCascader ||
    node instanceof VTagsInput ||
    node instanceof VAutocomplete
  ) {
    const name = node.name();
    if (name) {
      assignFormValue(result, name, readControlValue(node));
    }
    return result;
  }

  const tagName = typeof node.tagName === 'function' ? node.tagName() : '';

  if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
    const name = typeof node.name === 'function' ? node.name() : node.attr?.('name');
    if (name) {
      assignFormValue(result, name, readControlValue(node));
    }
    return result;
  }

  if (typeof node.children === 'function') {
    node.children().forEach((child) => collectFormValues(child, result));
  }

  return result;
}

function applyFormValues(node, values) {
  if (!node || typeof node !== 'object' || !isPlainObject(values)) {
    return node;
  }

  function visit(current) {
    if (!current || typeof current !== 'object') {
      return;
    }

    if (current instanceof VField || current instanceof VForm) {
      current.children().forEach((child) => visit(child));
      return;
    }

    if (current instanceof VFormItem) {
      const name = current.name();
      if (name && Object.prototype.hasOwnProperty.call(values, name)) {
        current.value(values[name]);
      }
      return;
    }

    const name = typeof current.name === 'function' ? current.name() : current.attr?.('name');
    if (name && Object.prototype.hasOwnProperty.call(values, name)) {
      applyControlValue(current, values[name]);
      return;
    }

    if (typeof current.children === 'function') {
      current.children().forEach((child) => visit(child));
    }
  }

  visit(node);
  return node;
}

function validateFormControls(node, formValues = {}) {
  let valid = true;

  function visit(current) {
    if (!current) {
      return;
    }

    if (current instanceof VFormItem) {
      if (!current._validate(formValues)) {
        valid = false;
      }
      return;
    }

    if (current instanceof VForm || current instanceof VField) {
      current.children().forEach((child) => visit(child));
      return;
    }

    const isControl =
      current instanceof VCheckboxes ||
      current instanceof VRadios ||
      current instanceof VInput ||
      current instanceof VSelect ||
      current instanceof VTextarea ||
      current instanceof VCheckbox ||
      current instanceof VRadio ||
      current instanceof VSwitch ||
      current instanceof VRate ||
      current instanceof VSlider ||
      current instanceof VCascader ||
      current instanceof VTagsInput ||
      current instanceof VAutocomplete ||
      (typeof current.tagName === 'function' &&
        ['input', 'select', 'textarea'].includes(current.tagName()));

    if (isControl) {
      if (!isControlDisabled(current) && isControlRequired(current)) {
        const value = readControlValue(current);
        if (current instanceof VRate && value === 0) {
          valid = false;
          return;
        }
        if (Array.isArray(value)) {
          valid = value.length > 0;
        } else if (typeof value === 'boolean') {
          valid = value;
        } else {
          valid = value !== null && value !== undefined && String(value).length > 0;
        }
      }

      return;
    }

    if (typeof current.children === 'function') {
      current.children().forEach((child) => visit(child));
    }
  }

  visit(node);
  return valid;
}

function findFieldControl(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (
    node instanceof VInput ||
    node instanceof VSelect ||
    node instanceof VTextarea ||
    node instanceof VCheckboxes ||
    node instanceof VRadios ||
    node instanceof VCheckbox ||
    node instanceof VRadio ||
    node instanceof VSwitch ||
    node instanceof VRate ||
    node instanceof VSlider ||
    node instanceof VCascader ||
    node instanceof VTagsInput ||
    node instanceof VAutocomplete
  ) {
    return node;
  }

  if (typeof node.children !== 'function') {
    return null;
  }

  for (const child of node.children()) {
    const found = findFieldControl(child);
    if (found) {
      return found;
    }
  }

  return null;
}

export {
  readControlValue,
  applyControlValue,
  collectFormValues,
  applyFormValues,
  validateFormControls,
  findFieldControl
};
