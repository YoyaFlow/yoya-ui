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
import { VCheckbox, vCheckbox } from './checkbox.js';
import { normalizeValueList } from './shared.js';

/**
 * 复选组（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * - **一个组件函数 = 一个边界**（R1）：状态与命令都在闭包里，视图由最后那个 `return` 一次写清（R2），
 *   根上只留读值绑定（R4），静态样式全在 `yoya.ui.css`（R5）；
 * - **props 都是数据**（R3 / R9）：`name` / `required` / `disabled` / `multiple` 走 `asSignal`（给句柄就是活值），
 *   归一放在**读时**的 `computed` 上——构建期 `Boolean(…)` 会把传进来的句柄吃成常量；
 * - **项是数据源**（R7）：一份 `ref([])`（项句柄）+ **`keyed` 对账**，`options(…)` 与位置参数都只写这份数据，
 *   增删改排序交给引擎（不再 `replaceChildren` 整批重建）；
 * - **选中态归项自己**（`VCheckbox.checked` 是项的内部状态）：组只做 `multiple` 约束与读写——命令遍历的是
 *   **自己造出来的那些项**（不是遍历结构找节点），与迁移前 `_items` 的口径逐字一致；
 * - **几何交给 CSS**（R10）：列数是可配置几何，走 `--yoya-checkboxes-columns`（`var(…, 1)` 兜默认单列），
 *   JS 不拼 `grid-template-columns` 字符串；禁用组的观感同样归 CSS
 *   （`[vn~='VCheckboxes'][aria-disabled='true']`），JS 不写行内 `opacity`；
 * - 元素配置键（`attrs` / `style` / `on…`）走 `...rest` 摊进根元素工厂，"建好再 setup" 落视图根
 *   （组件节点 `setupObject` 的默认回落就是视图根，不另写一层）。
 */
export function VCheckboxes({
  children: childOptions,
  columns,
  disabled,
  multiple,
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
  const multipleState = asSignal(multiple);
  const columnsState = asSignal(columns);

  const nameText = computed(() =>
    nameState.value === null || nameState.value === undefined
      ? ''
      : resolveTextValue(nameState.value)
  );
  const requiredValue = computed(() => Boolean(requiredState.value));
  const disabledValue = computed(() => Boolean(disabledState.value));
  // 缺省是"多选"（迁移前 `_multiple = true` 的同口径）
  const multipleValue = computed(() =>
    multipleState.value === undefined ? true : Boolean(multipleState.value)
  );
  const columnsValue = computed(() => {
    const columns = Number(columnsState.value);
    return columns >= 1 ? String(columns) : null;
  });

  /** 项的数据源（R7：结构交给 `keyed` 对账）+ 一份原始选项快照（`options()` 读回同一份）。 */
  const itemNodes = ref([]);
  const optionEntries = ref([]);
  const keyOfItem = createListItemKey('checkboxes-item');

  return vNode((api) => {
    /** 建一份项：已经是复选组件就原样复用，否则按选项归一建一份；组名是容器态，建项时推一次。 */
    const createItem = (entry, index) => {
      const item = createCheckboxGroupItem(entry, index);

      item.on('change', () => handleItemChange(item));

      if (nameText.value) {
        item.attr('data-group-name', nameText.value);
      }

      return item;
    };

    /** `multiple(false)` 的组按单选处理（多选中某一项时把其余项摘掉，与迁移前同口径）。 */
    const handleItemChange = (item) => {
      if (multipleValue.value || !item.checked()) {
        return;
      }

      itemNodes.value.forEach((other) => {
        if (other !== item) {
          other.checked(false);
        }
      });
    };

    api.name = (next) => {
      if (next === undefined) {
        return nameText.value;
      }

      nameState.value = next;
      return api;
    };

    api.required = (next) => {
      if (next === undefined) {
        return requiredValue.value;
      }

      requiredState.value = next;
      return api;
    };

    api.multiple = (next) => {
      if (next === undefined) {
        return multipleValue.value;
      }

      const selected = api.value();
      multipleState.value = next;

      if (!multipleValue.value) {
        // 单选化：多出来的选中项按迁移前的口径收成第一个
        api.value(Array.isArray(selected) ? (selected[0] ?? null) : selected);
      }

      return api;
    };

    api.columns = (next) => {
      if (next === undefined) {
        return columnsValue.value === null ? null : Number(columnsValue.value);
      }

      columnsState.value = next;
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

    api.options = (next) => {
      if (next === undefined) {
        return optionEntries.value.slice();
      }

      optionEntries.value = Array.isArray(next) ? next.slice() : [];
      itemNodes.value = optionEntries.value.map(createItem);
      api.value(api.value());
      return api;
    };

    api.value = (next) => {
      if (next === undefined) {
        const selected = itemNodes.value
          .filter((item) => item.checked())
          .map((item) => item.optionValue());

        return multipleValue.value ? selected : (selected[0] ?? null);
      }

      const values = normalizeValueList(next);
      const selectedValues = multipleValue.value ? values : values.slice(0, 1);

      itemNodes.value.forEach((item) => {
        item.checked(selectedValues.includes(resolveTextValue(item.optionValue())));
      });

      return api;
    };

    api.checkedValues = (next) => api.value(next);
    api.clear = () => api.value(multipleValue.value ? [] : null);

    /** 位置参数：字符串 / 数字 = 一个选项（迁移前 `_setupCheckboxes` 的兜底分支同口径）。 */
    api.setupString = (text) => {
      api.options([text]);
      return api;
    };

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

    // 结构（R2）：整棵树写在 return 里；属性是读值绑定（R4），静态样式 / 几何在 yoya.ui.css（R5 / R10）
    return div(
      {
        ...rest,
        'aria-disabled': computed(() => (disabledValue.value ? 'true' : null)),
        'data-name': computed(() => nameText.value || null),
        'data-required': computed(() => (requiredValue.value ? 'true' : null)),
        style: {
          '--yoya-checkboxes-columns': columnsValue
        },
        vn: 'VCheckboxes'
      },
      (root) => root.keyed(itemNodes, keyOfItem, (item) => item)
    );
  });
}

export const vCheckboxes = createComponentShortcut(VCheckboxes, { props: true });

function createCheckboxGroupItem(option, index) {
  if (hasComponentIdentity(option, 'VCheckbox')) {
    return option;
  }

  if (option instanceof ViewNode && !(option instanceof HtmlElementNode)) {
    return vCheckbox(option);
  }

  const normalized = normalizeCheckboxGroupOption(option, index);

  return VCheckbox({
    checked: normalized.checked,
    description: normalized.description,
    disabled: normalized.disabled,
    label: normalized.label,
    optionValue: normalized.value,
    required: normalized.required
  });
}

function normalizeCheckboxGroupOption(option, index) {
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

  if (hasComponentIdentity(option, 'VCheckbox')) {
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

export { createCheckboxGroupItem, normalizeCheckboxGroupOption };
