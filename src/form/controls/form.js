import { vNode } from '../../core/v-node.js';
import { form } from '../../html/index.js';
import {
  applyComponentSetup,
  createComponentShortcut,
  isPlainObject
} from '../../components/shared.js';
import { applyFormValues, collectFormValues, validateFormControls } from './form-values.js';

/**
 * 表单容器（形态 B）：值收集 / 回填 / 校验都转给 `form-values`，自己只当容器与身份。
 *
 * - 身份写在结构里（`vn: 'VForm'`），不再有类名与 `defineComponentIdentity`（票 15 §4）；
 * - 收集 / 校验遍历的是自己的子树（`collectFormValues` / `validateFormControls` 按能力判定，
 *   不按组件身份），所以形状换成 vNode 不影响采集链；
 * - `reset()` / `submit()` 是用户交互命令：未落地（没建 DOM）时无事可做，读 `_el` 判定
 *   （与 VTableWrapper 的首屏口径一致，不为判定提前建 DOM）。
 */
export function VForm() {
  return vNode((api, self) => {
    const node = form({
      style: { display: 'grid', gap: '16px', minWidth: '0' },
      vn: 'VForm'
    });

    api.values = (value) => {
      if (value === undefined) {
        const result = {};
        collectFormValues(self.node(), result);
        return result;
      }

      if (isPlainObject(value)) {
        applyFormValues(self.node(), value);
      }

      return api;
    };

    api.value = (value) => api.values(value);

    api.validate = () => {
      const values = api.values();
      return validateFormControls(self.node(), values);
    };

    api.reset = () => {
      node.invoke('reset');
      return api;
    };

    api.submit = () => {
      // 优先原生 `requestSubmit`（校验 + submit 事件）；退化环境派发一个 submit 事件
      if (typeof node.prop('requestSubmit') === 'function') {
        node.invoke('requestSubmit');
      } else {
        node.emit('submit', null, { cancelable: true });
      }

      return api;
    };

    /** props：`children` 走投递、`values` 回填，其余键按元素 options 写（与旧 `_setupForm` 同口径）。 */
    api.setupObject = (setup) => {
      const { children, values, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (children !== undefined) {
        applyComponentSetup(node, children);
      }

      if (values !== undefined) {
        api.values(values);
      }

      return api;
    };

    return node;
  });
}

export const vForm = createComponentShortcut(VForm);
