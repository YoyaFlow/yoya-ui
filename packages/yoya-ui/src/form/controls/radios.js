import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { ViewNode, hasComponentIdentity } from '@yoyaflow/yoya-core/internal/core/node.js';
import { HtmlElementNode, div } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  createListItemKey,
  isPlainObject,
  resolveTextValue
} from '../../components/shared.js';
import { VRadio, vRadio } from './radio.js';

/**
 * 单选组（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * - **一个组件函数 = 一个边界**（R1）：状态与命令都在闭包里，视图由最后那个 `return` 一次写清（R2），
 *   根上只留读值绑定（R4），静态样式全在 `yoya.ui.css`（R5）；
 * - **props 都是数据**（R3 / R9）：`name` / `required` / `disabled` 走 `asSignal`（给句柄就是活值），
 *   归一放在**读时**的 `computed` 上——构建期 `Boolean(…)` 会把传进来的句柄吃成常量；
 * - **项是数据源**（R7）：一份 `ref([])`（项句柄）+ **`keyed` 对账**，`options(…)` 与位置参数都只写这份数据，
 *   增删改排序交给引擎（不再 `replaceChildren` 整批重建）；
 * - **选中态归项自己**（`VRadio.checked` 是项的内部状态）：组只做互斥与读写——命令遍历的是
 *   **自己造出来的那些项**（不是遍历结构找节点），与迁移前 `_items` 的口径逐字一致；
 * - **禁用组的观感归 CSS**（`[vn~='VRadios'][aria-disabled='true']`），JS 不写行内 `opacity`；
 * - 元素配置键（`attrs` / `style` / `on…`）走 `...rest` 摊进根元素工厂，"建好再 setup" 落视图根
 *   （组件节点 `setupObject` 的默认回落就是视图根，不另写一层）。
 */
export function VRadios({
  change,
  children: childOptions,
  disabled,
  name,
  options,
  required,
  value,
  ...rest
} = {}) {
  // props 全是数据：句柄原样收下，归一放在读时的派生上（R9）
  const nameState = asSignal(name ?? '');
  const requiredState = asSignal(required);
  const disabledState = asSignal(disabled);
  const changeState = ref(typeof change === 'function' ? change : null);

  const nameText = computed(() =>
    nameState.value === null || nameState.value === undefined
      ? ''
      : resolveTextValue(nameState.value)
  );
  const requiredValue = computed(() => Boolean(requiredState.value));
  const disabledValue = computed(() => Boolean(disabledState.value));

  /** 项的数据源（R7：结构交给 `keyed` 对账）+ 一份原始选项快照（`options()` 读回同一份）。 */
  const itemNodes = ref([]);
  const optionEntries = ref([]);
  const keyOfItem = createListItemKey('radios-item');

  return vNode((api, self) => {
    /** 建一份项：已经是单选组件就原样复用，否则按选项归一建一份；接上互斥与回调。 */
    const createItem = (entry, index) => {
      const item = createRadioGroupItem(entry, index);

      item.on('change', () => handleItemChange(item));
      // 组名是容器态：建项时推一次（迁移前 `_renderOptions` 的同口径）
      if (nameText.value) {
        item.name(nameText.value);
      }

      return item;
    };

    const handleItemChange = (item) => {
      if (!item.checked()) {
        return;
      }

      itemNodes.value.forEach((other) => {
        if (other !== item) {
          other.checked(false);
        }
      });

      if (typeof changeState.value === 'function') {
        // 句柄交给使用方的是**组件节点**（与迁移前 `_handleOf` 同口径）
        changeState.value(item.optionValue(), self.node());
      }
    };

    api.name = (next) => {
      if (next === undefined) {
        return nameText.value;
      }

      nameState.value = next;
      itemNodes.value.forEach((item) => item.name(nameText.value));
      return api;
    };

    api.required = (next) => {
      if (next === undefined) {
        return requiredValue.value;
      }

      requiredState.value = next;
      return api;
    };

    api.disabled = (next) => {
      if (next === undefined) {
        return disabledValue.value;
      }

      disabledState.value = next;
      itemNodes.value.forEach((item) => item.disabled(disabledValue.value));
      return api;
    };

    // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
    api.isDisabled = () => disabledValue.value;

    api.change = (handler) => {
      if (handler === undefined) {
        return changeState.value;
      }

      changeState.value = typeof handler === 'function' ? handler : null;
      return api;
    };

    api.options = (next) => {
      if (next === undefined) {
        return optionEntries.value.slice();
      }

      optionEntries.value = Array.isArray(next) ? next.slice() : [];
      itemNodes.value = optionEntries.value.map(createItem);
      return api;
    };

    api.value = (next) => {
      if (next === undefined) {
        const selected = itemNodes.value.find((item) => item.checked());
        return selected ? selected.optionValue() : null;
      }

      const target = next === null || next === undefined ? null : String(resolveTextValue(next));

      itemNodes.value.forEach((item) => {
        item.checked(String(item.optionValue()) === target);
      });

      return api;
    };

    api.checkedValue = (next) => api.value(next);
    api.clear = () => api.value(null);

    /** 位置参数：字符串 / 数字 = 一个选项（迁移前 `_setupRadios` 的兜底分支同口径）。 */
    api.setupString = (text) => {
      api.options([text]);
      return api;
    };

    if (change !== undefined) {
      api.change(change);
    }

    const initialOptions = options ?? childOptions;

    if (initialOptions !== undefined) {
      api.options(initialOptions);
    }

    if (required !== undefined) {
      api.required(required);
    }

    if (disabled !== undefined) {
      api.disabled(disabled);
    }

    if (value !== undefined) {
      api.value(value);
    }

    // 结构（R2）：整棵树写在 return 里；属性是读值绑定（R4），静态样式在 yoya.ui.css（R5）
    return div(
      {
        ...rest,
        'aria-disabled': computed(() => (disabledValue.value ? 'true' : null)),
        'data-name': computed(() => nameText.value || null),
        'data-required': computed(() => (requiredValue.value ? 'true' : null)),
        vn: 'VRadios'
      },
      (root) => root.keyed(itemNodes, keyOfItem, (item) => item)
    );
  });
}

export const vRadios = createComponentShortcut(VRadios, { props: true });

function createRadioGroupItem(option, index) {
  if (hasComponentIdentity(option, 'VRadio')) {
    return option;
  }

  if (option instanceof ViewNode && !(option instanceof HtmlElementNode)) {
    return vRadio(option);
  }

  const normalized = normalizeRadioGroupOption(option, index);

  return VRadio({
    checked: normalized.checked,
    description: normalized.description,
    disabled: normalized.disabled,
    label: normalized.label,
    optionValue: normalized.value,
    required: normalized.required
  });
}

function normalizeRadioGroupOption(option, index) {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
    const text = resolveTextValue(option);
    return {
      label: text,
      value: text
    };
  }

  if (Array.isArray(option) && option.length > 0) {
    const [value, label = value] = option;
    return {
      label: label ?? value ?? '',
      value: resolveTextValue(value)
    };
  }

  if (hasComponentIdentity(option, 'VRadio')) {
    return {
      checked: option.checked(),
      description: option.description(),
      disabled: option.disabled(),
      label: option.label(),
      required: option.required(),
      value: option.optionValue()
    };
  }

  if (option instanceof ViewNode) {
    const text = option.textContent();
    return {
      label: option,
      value: text
    };
  }

  if (isPlainObject(option)) {
    const value =
      option.value ?? option.key ?? option.id ?? option.label ?? option.text ?? `option-${index}`;
    const label = option.label ?? option.text ?? option.content ?? option.title ?? value;

    return {
      checked: Boolean(option.checked),
      description: option.description,
      disabled: Boolean(option.disabled),
      label,
      required: Boolean(option.required),
      value: resolveTextValue(value)
    };
  }

  const text = resolveTextValue(option);
  return {
    label: text,
    value: text
  };
}

export { createRadioGroupItem, normalizeRadioGroupOption };
