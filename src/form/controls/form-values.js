import { VRate } from '../rate.js';
import {
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue
} from '../../components/shared.js';
import { VCheckboxes } from './checkboxes.js';
import { VRadios } from './radios.js';
import { VForm } from './form.js';
import { assignFormValue, isControlDisabled, isControlRequired } from './shared.js';

/**
 * 控件能力判定：暴露 value() / _collectValue() 的节点就是控件——**身份不再参与**（vn 事实只做展示 / 判定用）。
 */
function isControlCapable(node) {
  return (
    Boolean(node) && (typeof node.value === 'function' || typeof node._collectValue === 'function')
  );
}

/** 字段容器能力判定：字段暴露 `control()` + `mode()`——**身份不再参与**（票 15 §4）。 */
function isFieldCapable(node) {
  return Boolean(node) && typeof node.control === 'function' && typeof node.mode === 'function';
}

/** 表单项能力判定：`name()` + `rules()` 是它的专属组合——**身份不再参与**（票 15 §4）。 */
function isFormItemCapable(node) {
  return Boolean(node) && typeof node.name === 'function' && typeof node.rules === 'function';
}

function readControlValue(control) {
  if (!control) {
    return undefined;
  }

  if (typeof control._collectValue === 'function') {
    return control._collectValue();
  }

  // 能力约定：控件暴露 value() 就直接读（组件身份不参与判定）
  if (typeof control.value === 'function') {
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

  // 能力约定：控件暴露 value() 就直接写（组件身份不参与判定）
  if (typeof control.value === 'function') {
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

  if (isFieldCapable(node)) {
    node.children().forEach((child) => collectFormValues(child, result));
    return result;
  }

  if (isFormItemCapable(node)) {
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

  if (isControlCapable(node)) {
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

    if (isFieldCapable(current) || current instanceof VForm) {
      current.children().forEach((child) => visit(child));
      return;
    }

    if (isFormItemCapable(current)) {
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

    if (isFormItemCapable(current)) {
      // 校验是族内协议：项组件在视图根上暴露 `_validate(formValues)`（与 `_collectValue` 同族）
      const unit = viewRootOf(current) ?? current;
      if (!unit._validate(formValues)) {
        valid = false;
      }
      return;
    }

    if (current instanceof VForm || isFieldCapable(current)) {
      current.children().forEach((child) => visit(child));
      return;
    }

    const isControl =
      current instanceof VCheckboxes ||
      current instanceof VRadios ||
      isControlCapable(current) ||
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

  if (isControlCapable(node)) {
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
import { viewRootOf } from '../../core/node.js';
