import { ref } from '../../core/signals/handle.js';
import { HtmlElementNode, input as inputFactory, label, span } from '../../html/index.js';
import {
  delegateNodeCommands,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  themeValue
} from '../../components/shared.js';

/** 清空按钮：身份走 `vn`（各控件一份），能力类 `yoya-control-clear` 保留（跨组件能力类不退场）。 */
function createClearButton(identity, position = {}) {
  return new HtmlElementNode('button')
    .setup({ vn: identity })
    .className('yoya-control-clear')
    .attr({ type: 'button', 'aria-label': '清空', title: '清空' })
    .styles({
      alignItems: 'center',
      background: 'transparent',
      border: 'none',
      borderRadius: '4px',
      boxSizing: 'border-box',
      color: themeValue('color-text-muted', '#64748b'),
      cursor: 'pointer',
      display: 'inline-flex',
      flexShrink: '0',
      fontFamily: 'inherit',
      fontSize: '16px',
      fontWeight: '700',
      height: '18px',
      justifyContent: 'center',
      lineHeight: '1',
      margin: '0',
      padding: '0',
      position: 'absolute',
      width: '18px',
      zIndex: '1',
      ...position
    })
    .child('×');
}

function syncClearButton(control, inputNode, clearButton) {
  const value = inputNode.prop('value') ?? control.value();
  const hasValue = Array.isArray(value)
    ? value.length > 0
    : value !== '' && value !== null && value !== undefined;
  // 能力判定优先：组件暴露 clearable() 就用它（不再依赖内部字段 `_clearable`）
  const clearable =
    typeof control.clearable === 'function' ? control.clearable() : control._clearable;
  const visible = clearable && hasValue && !control.isDisabled() && !control.isReadonly();

  clearButton.style('display', visible ? null : 'none');
}

/**
 * 布尔控件（`VCheckbox` / `VRadio` / `VSwitch`）共用的**结构与命令**（形态 B；R1–R12，参考 `VBadge`）。
 *
 * 三个组件只有"身份 / 输入类型 / 视觉"三处不同——结构、状态、命令、SSR 回读、元素级委派完全一样，
 * 所以都收在这一份工厂里；**身份（`vn`）字面量留在各组件的调用点上**（门禁与可读性都靠它）。
 *
 * - 状态（`checked` / `disabled` / `required` / `indeterminate` / `optionValue` / `name` / 文案）在闭包里，
 *   落点是**内层 `<input>`**（原生语义）与根上的状态位（`data-checked` / `aria-disabled` / `data-name`）；
 * - `indeterminate` 是 DOM property（写不成属性），只在**元素已落地**时补设（与迁移前同口径；
 *   `data-display/tree.js` 的 `TreeCheckboxInput` 为了同一件事保留了节点类型，是另一种解法）；
 * - SSR 回读钩子 `hydrateSnapshot` 挂在**内层 `<input>` 节点**上（渲染路径按节点调用，
 *   与 `input` / `select` / `textarea` 同口径）；
 * - 元素级命令（`attr` / `style` / `on` …）代委托到视图根：组组件就是按 `item.attr(…)` / `item.on(…)`
 *   与项对话的（见 16 号第 106 条）。
 *
 * `config`：`root`（根元素配置，含 `vn`，调用方的 `...rest` 也摊在这里）/ `input`（内层 `<input>` 配置，
 * 含 `vn` 与 `type`）/ `boxes`（`visual` / `content` / `label` / `description` 四块部件配置，各含 `vn`）/
 * `decorateVisual(box)`（视觉盒里的静态件，如开关的滑块）/ `syncVisual(box, enabled)`（勾选态视觉）。
 */
export function createBooleanControl(
  api,
  { boxes, decorateVisual = null, input: inputConfig, root, syncVisual = null }
) {
  const checkedState = ref(false);
  const disabledState = ref(false);
  const indeterminateState = ref(false);
  const requiredState = ref(false);
  const optionValueState = ref('on');

  let descriptionBox = null;
  let inputView = null;
  let labelBox = null;
  let visualBox = null;

  const applyChecked = (enabled) => {
    view.attr('data-checked', enabled ? 'true' : null);
    inputView.attr('checked', enabled ? true : null);
    syncVisual?.(visualBox, enabled);
  };

  const view = label(
    {
      style: {
        alignItems: 'center',
        cursor: 'pointer',
        display: 'inline-grid',
        gap: '10px',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        position: 'relative'
      }
    },
    (rootBox) => {
      // 身份 + 调用方的元素配置（`...rest`）：落在视图根上
      rootBox.setup(root);

      visualBox = span(boxes.visual, (box) => decorateVisual?.(box));

      inputView = inputFactory(
        {
          ...inputConfig,
          style: {
            height: '1px',
            margin: '0',
            opacity: '0',
            pointerEvents: 'none',
            position: 'absolute',
            width: '1px'
          }
        },
        (box) => {
          box.on('change', (event) => {
            if (disabledState.value) {
              return;
            }

            api.checked(Boolean(event.target?.checked));
          });
        }
      );

      const contentBox = span({
        ...boxes.content,
        style: { display: 'grid', gap: '2px', minWidth: '0' }
      });

      labelBox = span({
        ...boxes.label,
        style: {
          color: themeValue('color-text', '#172033'),
          fontWeight: '600',
          lineHeight: '1.35'
        }
      });

      descriptionBox = span({
        ...boxes.description,
        style: {
          color: themeValue('color-text-muted', '#64748b'),
          display: 'none',
          fontSize: '12px',
          lineHeight: '1.45'
        }
      });

      contentBox.child(labelBox, descriptionBox);
      rootBox.child(visualBox, inputView, contentBox);

      // 初始视觉（未勾选）：迁移前是子类构造函数里那句 `this._syncVisual(false)`
      syncVisual?.(visualBox, false);
    }
  );

  api.checked = (value) => {
    if (value === undefined) {
      return checkedState.value;
    }

    const next = Boolean(value);
    checkedState.value = next;
    applyChecked(next);
    return api;
  };

  api.value = (value) => (value === undefined ? api.checked() : api.checked(value));

  api.disabled = (value) => {
    if (value === undefined) {
      return disabledState.value;
    }

    const next = Boolean(value);
    disabledState.value = next;
    inputView.attr('disabled', next ? true : null);
    view.attr('aria-disabled', next ? 'true' : null);
    view.style('opacity', next ? '0.64' : '1');
    return api;
  };

  // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
  api.isDisabled = () => disabledState.value;

  api.required = (value) => {
    if (value === undefined) {
      return requiredState.value;
    }

    const next = Boolean(value);
    requiredState.value = next;
    inputView.attr('required', next ? true : null);
    return api;
  };

  api.indeterminate = (value) => {
    if (value === undefined) {
      return indeterminateState.value;
    }

    const next = Boolean(value);
    indeterminateState.value = next;
    inputView.prop('indeterminate', next);

    return api;
  };

  api.optionValue = (value) => {
    if (value === undefined) {
      return optionValueState.value;
    }

    optionValueState.value = resolveTextValue(value) || 'on';
    inputView.attr('value', optionValueState.value);
    return api;
  };

  api.name = (value) => {
    if (value === undefined) {
      return inputView.name();
    }

    inputView.name(value);
    view.attr('data-name', value ?? null);
    return api;
  };

  api.label = (value) => {
    if (value === undefined) {
      return labelBox.textContent();
    }

    replaceChildren(labelBox, normalizeChildren(value));
    return api;
  };

  api.text = (value) => api.label(value);
  api.content = (value) => api.label(value);

  api.description = (value) => {
    if (value === undefined) {
      return descriptionBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    descriptionBox.style('display', hasContent ? null : 'none');
    replaceChildren(descriptionBox, hasContent ? normalizeChildren(value) : []);
    return api;
  };

  // SSR 回读：挂在**内层 `<input>` 节点**上（渲染路径按节点调用；与 input / select / textarea 同口径）
  inputView.hydrateSnapshot = () => {
    if (inputView.isLanded()) {
      api.checked(inputView.prop('checked'));
    }

    return inputView;
  };

  // 元素级命令代委托（组组件按 `item.attr(…)` / `item.on(…)` 与项对话）
  delegateNodeCommands(api, view);

  return view;
}

/**
 * 布尔控件的 props 落位（迁移前 `_setupBoolean` 的等价物）。
 *
 * 顺序与迁移前逐字一致：文案（`label ?? text ?? content ?? children`）→ 描述 → 名字 → 选项值
 * （`optionValue`，或非布尔的 `value`）→ 勾选（`checked`，或布尔的 `value`）→ 必填 → 禁用。
 *
 * 注意：`indeterminate` **不在**这里处理——迁移前它是"元素配置"（写成属性），命令面才有
 * `indeterminate()`；要改这个口径得先登记（见 16 号清单的写法）。
 */
export function applyBooleanControlProps(api, props = {}) {
  const {
    checked,
    children,
    content,
    description,
    disabled,
    label: labelContent,
    name,
    optionValue,
    required,
    text,
    value
  } = props;

  if (labelContent !== undefined) {
    api.label(labelContent);
  } else if (text !== undefined) {
    api.text(text);
  } else if (content !== undefined) {
    api.content(content);
  } else if (children !== undefined) {
    api.label(children);
  }

  if (description !== undefined) {
    api.description(description);
  }

  if (name !== undefined) {
    api.name(name);
  }

  if (optionValue !== undefined) {
    api.optionValue(optionValue);
  } else if (value !== undefined && typeof value !== 'boolean') {
    api.optionValue(value);
  }

  if (checked !== undefined) {
    api.checked(checked);
  } else if (value !== undefined && typeof value === 'boolean') {
    api.checked(value);
  }

  if (required !== undefined) {
    api.required(required);
  }

  if (disabled !== undefined) {
    api.disabled(disabled);
  }

  return api;
}
function formatDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTextValue(item)).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return resolveTextValue(value);
}

function normalizeValueList(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  return Array.isArray(value)
    ? value.map((item) => resolveTextValue(item))
    : [resolveTextValue(value)];
}

function isEmptyFormValue(value, control = null) {
  // 值语义的能力约定：控件自己声明"哪些值是空"（速率 0 视为空）——不按组件身份分支
  if (typeof control?.isEmptyValue === 'function' && control.isEmptyValue(value)) {
    return true;
  }

  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function isControlRequired(control) {
  if (!control) {
    return false;
  }

  if (typeof control.required === 'function') {
    try {
      return Boolean(control.required());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('required'));
}

function isControlDisabled(control) {
  if (!control) {
    return false;
  }

  if (typeof control.disabled === 'function') {
    try {
      return Boolean(control.disabled());
    } catch {
      return false;
    }
  }

  return Boolean(control.attr?.('disabled'));
}

function assignFormValue(result, name, value) {
  if (Object.prototype.hasOwnProperty.call(result, name)) {
    const existing = result[name];

    if (Array.isArray(existing)) {
      if (Array.isArray(value)) {
        result[name] = existing.concat(value);
      } else {
        existing.push(value);
      }
      return;
    }

    result[name] = Array.isArray(value) ? [existing].concat(value) : [existing, value];
    return;
  }

  result[name] = value;
}

export {
  createClearButton,
  syncClearButton,
  formatDisplayValue,
  normalizeValueList,
  isEmptyFormValue,
  isControlRequired,
  isControlDisabled,
  assignFormValue
};
