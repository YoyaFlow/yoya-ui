import { vNode } from '../../core/v-node.js';
import { div, label as labelElement, span } from '../../html/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot
} from '../../components/shared.js';
import { isEmptyFormValue } from './shared.js';
import { applyControlValue, findFieldControl, readControlValue } from './form-values.js';

/**
 * 表单项：名称 / 标签 / 必填标记 + 编辑面 + 提示 / 错误（形态 B）。
 *
 * - 状态（名称、必填、校验器、取值回调）与命令都在闭包里，身份写在结构里。
 * - 各块的静态样式在 `yoya.ui.css`（R5）；显隐是状态，走根上的 `data-required` /
 *   `data-indicator`（必填标记）/ `data-hint` / `data-error` 属性规则，JS 只写状态。
 * - 编辑面自己带 `collectValue(callback)` 与 `_collectValue` 能力：非标准组件靠它参与表单取值
 *   （`findFieldControl` / `readControlValue` 只认能力，不认组件身份）。
 * - `_validate(formValues)` 是 form 族内的校验协议（`form-values.js` 调它，见 16 号清单）。
 */
export function VFormItem() {
  return vNode((api, self) => {
    const state = {
      collectValue: null,
      fallbackMessage: '校验未通过',
      name: '',
      required: false,
      requiredIndicatorContent: null,
      requiredMessage: '该项为必填',
      validators: []
    };

    // 静态样式全在 `yoya.ui.css`（R5）：JS 里只有状态属性与内容
    const labelBox = labelElement({ vn: 'VFormItemLabel' });
    const requiredIndicator = span({ vn: 'VFormItemRequiredIndicator' });
    const labelRow = div({ vn: 'VFormItemLabelRow' });
    const editorBox = div({ vn: 'VFormItemEditor' });
    const hintBox = div({ vn: 'VFormItemHint' });
    const errorBox = div({ vn: 'VFormItemError' });

    const node = div({ vn: 'VFormItem' }, (root) =>
      root.child(labelRow.child(requiredIndicator, labelBox), editorBox, hintBox, errorBox)
    );

    // 编辑面即「值载体」：非标准组件通过 collectValue 注册取值函数，表单按能力读它
    editorBox.collectValue = (callback) => {
      if (callback === undefined) {
        return state.collectValue;
      }

      state.collectValue = typeof callback === 'function' ? callback : null;
      editorBox._collectValue = state.collectValue;
      return editorBox;
    };
    editorBox.on('input', () => api.error(''));
    editorBox.on('change', () => api.error(''));

    const syncRequiredIndicator = () => {
      const content = state.requiredIndicatorContent;
      const hasIndicator = content !== null && content !== undefined && content !== '';

      // 显隐归 CSS（`[data-indicator='true']` 规则）
      node.attr('data-indicator', hasIndicator ? 'true' : null);
      replaceChildren(requiredIndicator, hasIndicator ? normalizeChildren(content) : []);
      return api;
    };

    api.name = (value) => {
      if (value === undefined) {
        return state.name;
      }

      state.name = resolveTextValue(value);
      return api;
    };

    api.label = (value) => {
      if (value === undefined) {
        return labelBox.textContent();
      }

      replaceChildren(labelBox, normalizeChildren(value));
      return api;
    };

    api.hint = (value) => {
      if (value === undefined) {
        return hintBox.textContent();
      }

      const hasContent = value !== null && value !== undefined && value !== '';

      node.attr('data-hint', hasContent ? 'true' : null);
      replaceChildren(hintBox, hasContent ? normalizeChildren(value) : []);
      return api;
    };

    api.error = (value) => {
      if (value === undefined) {
        return errorBox.textContent();
      }

      const hasContent = value !== null && value !== undefined && value !== '';

      // 报错与提示互斥：两个状态都在根上，CSS 规则决定谁显示
      node.attr('data-error', hasContent ? 'true' : null);
      replaceChildren(errorBox, hasContent ? normalizeChildren(value) : []);
      return api;
    };

    api.control = (setup) => {
      if (setup === undefined) {
        return editorBox;
      }

      setupContentSlot(editorBox, setup);
      return api;
    };

    api.editor = (setup) => api.control(setup);

    api.required = (value = true, messageOrOptions) => {
      if (value === undefined) {
        return state.required;
      }

      let indicator = null;

      if (typeof value === 'string') {
        state.required = true;
        state.requiredMessage = value;
        if (isPlainObject(messageOrOptions)) {
          indicator = messageOrOptions.indicator ?? null;
        } else if (messageOrOptions !== undefined) {
          indicator = messageOrOptions;
        }
      } else if (isPlainObject(value)) {
        state.required = true;
        if (value.message !== undefined) {
          state.requiredMessage = resolveTextValue(value.message);
        }
        indicator = value.indicator ?? null;
      } else {
        state.required = Boolean(value);
        if (isPlainObject(messageOrOptions)) {
          if (messageOrOptions.message !== undefined) {
            state.requiredMessage = resolveTextValue(messageOrOptions.message);
          }
          indicator = messageOrOptions.indicator ?? null;
        } else if (messageOrOptions !== undefined) {
          indicator = messageOrOptions;
        }
      }

      state.requiredIndicatorContent = indicator ?? null;
      syncRequiredIndicator();
      node.attr('data-required', state.required ? 'true' : null);
      return api;
    };

    api.validate = (callback) => {
      if (callback === undefined) {
        return state.validators.slice();
      }

      if (typeof callback === 'function') {
        state.validators.push(callback);
      }
      return api;
    };

    api.rules = (callbacks) => {
      if (Array.isArray(callbacks)) {
        callbacks.forEach((callback) => api.validate(callback));
      }
      return api;
    };

    api.value = (value) => {
      if (value === undefined) {
        return readControlValue(editorBox);
      }

      applyControlValue(editorBox, value);
      return api;
    };

    /**
     * 族内校验入口：容器（vForm）逐项调，判定必填 / 跑校验器并写错误，返回是否通过。
     * 它是**命令**（写在 api 上）——调用方拿着组件句柄直接调，不需要先解包到视图根。
     */
    api.check = (formValues) => {
      const control = findFieldControl(editorBox);
      const value = api.value();

      if (state.required && isEmptyFormValue(value, control)) {
        api.error(state.requiredMessage);
        return false;
      }

      for (const validator of state.validators) {
        const result = validator(value, formValues, self.node());

        if (typeof result === 'string' && result) {
          api.error(result);
          return false;
        }
        if (result === false) {
          api.error(state.fallbackMessage);
          return false;
        }
      }

      api.error('');
      return true;
    };

    /** props：本组件的键走命令，其余键按元素 options 写（与旧 `_setupFormItem` 同口径）。 */
    api.setupObject = (setup) => {
      const {
        children,
        control,
        editor,
        error,
        hint,
        label,
        name,
        required,
        rules,
        validate,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (name !== undefined) {
        api.name(name);
      }

      if (label !== undefined) {
        api.label(label);
      }

      if (hint !== undefined) {
        api.hint(hint);
      }

      if (editor !== undefined) {
        api.editor(editor);
      } else if (control !== undefined) {
        api.control(control);
      } else if (children !== undefined) {
        api.editor(children);
      }

      if (required !== undefined) {
        api.required(required);
      }

      if (validate !== undefined) {
        api.validate(validate);
      }

      if (rules !== undefined) {
        api.rules(rules);
      }

      if (value !== undefined) {
        api.value(value);
      }

      if (error !== undefined) {
        api.error(error);
      }

      return api;
    };

    /** 字符串 / 数字 = 标签（旧 `_setupFormItem` 的兜底分支）。 */
    api.setupString = (value) => api.label(value);

    return node;
  });
}

export const vFormItem = createComponentShortcut(VFormItem);
