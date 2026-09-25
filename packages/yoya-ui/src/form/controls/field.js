import { vButton } from '../../actions/button.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { button, div } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  normalizeChildren,
  replaceChildren,
  setupContentSlot
} from '../../components/shared.js';
import { formatDisplayValue } from './shared.js';
import { applyControlValue, findFieldControl, readControlValue } from './form-values.js';

/**
 * 字段：查看态 / 编辑态两套面 + 浮动编辑。
 *
 * - 形态 B：状态（当前态 / 悬停 / 提示可见 / 编辑快照 / 格式化器）与命令都在闭包里，
 *   视图由结构返回；身份写在结构里（`vn: 'VField'` + 各部件自己的 `vn`），不再有类名与
 *   `defineComponentIdentity`（票 15 §4）。
 * - 控件是**投递进来的内容**（`control(setup)` 进编辑面），字段没有它的句柄：
 *   按自己造出来的编辑面找（`findFieldControl`，见 16 号清单第 15 条的取用器口径）。
 * - 落位与聚焦在 `whenMount` / 切态时做，读元素一律走 `renderDom()`（不再读 `_el`）。
 */
export function VField() {
  return vNode((api) => {
    const state = {
      control: null,
      editSnapshot: null,
      formatter: null,
      hintVisible: false,
      hovered: false,
      mode: 'view'
    };

    // 各块的静态样式在 `yoya.ui.css`（R5）：JS 只留状态绑定与量测结果
    const labelBox = div({ vn: 'VFieldLabel' });
    const displayBox = div({ vn: 'VFieldDisplay' });
    const editorBox = div({ vn: 'VFieldEditor' });
    const hintBox = div({ vn: 'VFieldHint' });
    const errorBox = div({ vn: 'VFieldError' });
    // 动作按钮复用 vButton：身份写多值（部件 + 组件），样式仍归自己
    const actionButton = vButton('✎').size('small').variant('secondary');
    actionButton.setup({ vn: 'VFieldAction VButton' });
    actionButton.attr({
      'aria-hidden': 'true',
      'aria-label': '编辑',
      tabindex: '-1',
      title: '编辑'
    });
    const confirmButton = button({
      'aria-hidden': 'true',
      'aria-label': '确认',
      tabindex: '-1',
      title: '确认',
      type: 'button',
      vn: 'VFieldConfirm'
    }).child('✓');
    const cancelButton = button({
      'aria-hidden': 'true',
      'aria-label': '取消',
      tabindex: '-1',
      title: '取消',
      type: 'button',
      vn: 'VFieldCancel'
    }).child('✕');

    const node = div(
      {
        'data-mode': 'view',
        vn: 'VField'
      },
      (root) =>
        root.child(
          div({ vn: 'VFieldHeader' }, (header) =>
            header.child(labelBox, actionButton, confirmButton, cancelButton)
          ),
          displayBox,
          editorBox,
          hintBox,
          errorBox
        )
    );

    /** 编辑面：textarea 控件去掉自己的边框与背景（走控件的 `inputUnit()` 取用方法，不解包视图根）。 */
    const syncEditorSurface = () => {
      const control = currentControl();
      const unit = typeof control?.inputUnit === 'function' ? control.inputUnit() : null;

      if (unit?.tagName?.() !== 'textarea') {
        return api;
      }

      unit.style('border', '0');
      unit.style('boxShadow', null);
      unit.style('background', 'transparent');
      return api;
    };

    /** 编辑面吸在查看面上：读元素走公共取用方法，未落地时不动。 */
    const positionEditor = () => {
      // 未落地（还没建 DOM）时不动：判定走引擎口子，与 VTableWrapper 的首屏口径一致
      if (!node.isLanded()) {
        return api;
      }

      // 已经落地了：量测走 `measure()`（锚点优先查看面，没有就用字段自己）
      const fieldRect = node.measure();
      const rect = (displayBox.isLanded() ? displayBox.measure() : null) || fieldRect;

      editorBox.styles({
        left: `${rect.left - fieldRect.left}px`,
        minHeight: `${rect.height}px`,
        top: `${rect.top - fieldRect.top}px`,
        width: `${rect.width}px`
      });
      return api;
    };

    const focusEditor = () => {
      // 编辑面里第一个可聚焦控件；不为"取元素"提前把 DOM 建出来
      editorBox.focusFirst();
      return api;
    };

    const currentControl = () => state.control ?? findFieldControl(editorBox);

    const syncDisplayFromControl = () => {
      const control = currentControl();

      if (!control) {
        return api;
      }

      const value = readControlValue(control);
      const content = state.formatter ? state.formatter(value, api) : formatDisplayValue(value);

      replaceChildren(displayBox, normalizeChildren(content ?? value));
      return api;
    };

    const syncActionButton = () => {
      const hasControl = Boolean(currentControl());
      const editing = state.mode === 'edit';
      const entryVisible = hasControl && !editing && state.hovered;

      actionButton.attr({
        'aria-hidden': entryVisible ? null : 'true',
        'aria-label': '编辑',
        tabindex: entryVisible ? null : '-1',
        title: '编辑'
      });
      // 显隐几何归 CSS（`[data-action='true']` 规则）
      node.attr('data-action', entryVisible ? 'true' : null);

      [confirmButton, cancelButton].forEach((buttonNode) => {
        const actionLabel = buttonNode === confirmButton ? '确认' : '取消';

        buttonNode.attr({
          'aria-hidden': editing ? null : 'true',
          'aria-label': actionLabel,
          tabindex: editing ? null : '-1',
          title: actionLabel
        });
      });

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

      state.hintVisible = hasContent;
      node.attr('data-hint', hasContent ? 'true' : null);
      replaceChildren(hintBox, hasContent ? normalizeChildren(value) : []);
      return api;
    };

    api.error = (value) => {
      if (value === undefined) {
        return errorBox.textContent();
      }

      const hasContent = value !== null && value !== undefined && value !== '';

      node.attr('data-error', hasContent ? 'true' : null);
      replaceChildren(errorBox, hasContent ? normalizeChildren(value) : []);
      return api;
    };

    api.display = (value) => {
      if (value === undefined) {
        return displayBox.textContent();
      }

      if (typeof value === 'function') {
        setupContentSlot(displayBox, value);
        return api;
      }

      replaceChildren(displayBox, normalizeChildren(value));
      return api;
    };

    api.formatter = (handler) => {
      if (handler === undefined) {
        return state.formatter;
      }

      state.formatter = typeof handler === 'function' ? handler : null;
      if (state.mode === 'view') {
        syncDisplayFromControl();
      }
      return api;
    };

    api.displayClass = (...classes) => {
      if (classes.length === 0) {
        return displayBox.className();
      }

      displayBox.className(...classes);
      return api;
    };

    api.displayStyle = (value) => {
      if (value === undefined) {
        return displayBox.styles();
      }

      displayBox.styles(value);
      return api;
    };

    api.control = (setup) => {
      if (setup === undefined) {
        return currentControl();
      }

      setupContentSlot(editorBox, setup);
      state.control = findFieldControl(editorBox);
      syncEditorSurface();

      if (state.mode === 'view') {
        syncDisplayFromControl();
      }
      syncActionButton();

      return api;
    };

    api.editor = (setup) => api.control(setup);

    api.value = (value) => {
      const control = currentControl();

      if (value === undefined) {
        return control ? readControlValue(control) : displayBox.textContent();
      }

      if (control) {
        applyControlValue(control, value);
      } else {
        api.display(value);
      }

      if (state.mode === 'view') {
        syncDisplayFromControl();
      }
      return api;
    };

    api.mode = (value) => {
      if (value === undefined) {
        return state.mode;
      }

      state.mode = value === 'edit' ? 'edit' : 'view';
      node.attr('data-mode', state.mode);

      if (state.mode === 'edit') {
        const control = currentControl();

        state.editSnapshot = control ? readControlValue(control) : null;
        // 查看面留位 / 编辑面显隐由 `[data-mode='edit']` 的 CSS 规则接管
        positionEditor();
        focusEditor();
      } else {
        syncDisplayFromControl();
      }

      syncActionButton();
      return api;
    };

    api.view = () => api.mode('view');
    api.edit = () => api.mode('edit');

    api.cancel = () => {
      const control = currentControl();

      if (control && state.editSnapshot !== null && state.editSnapshot !== undefined) {
        applyControlValue(control, state.editSnapshot);
      }

      state.editSnapshot = null;
      return api.view();
    };

    /** props：字段自己的键走命令，其余键按元素 options 写（与旧 `_setupField` 同口径）。 */
    api.setupObject = (setup) => {
      const {
        children,
        control,
        display,
        displayClass,
        displayStyle,
        editor,
        error,
        formatter,
        hint,
        label,
        mode,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (label !== undefined) {
        api.label(label);
      }

      if (hint !== undefined) {
        api.hint(hint);
      }

      if (display !== undefined) {
        api.display(display);
      }

      if (formatter !== undefined) {
        api.formatter(formatter);
      }

      if (displayClass !== undefined) {
        api.displayClass(...(Array.isArray(displayClass) ? displayClass : [displayClass]));
      }

      if (displayStyle !== undefined) {
        api.displayStyle(displayStyle);
      }

      if (editor !== undefined) {
        api.editor(editor);
      } else if (control !== undefined) {
        api.control(control);
      } else if (children !== undefined) {
        api.editor(children);
      }

      if (value !== undefined) {
        api.value(value);
      }

      if (error !== undefined) {
        api.error(error);
      }

      if (mode !== undefined) {
        api.mode(mode);
      }

      return api;
    };

    /** 字符串 / 数字 / 节点 = 查看态内容（旧 `_setupField` 的兜底分支）。 */
    api.setupString = (value) => api.display(value);

    node.on('mouseenter', () => {
      state.hovered = true;
      syncActionButton();
    });
    node.on('mouseleave', () => {
      state.hovered = false;
      syncActionButton();
    });
    node.on('dblclick', (event) => {
      if (event.defaultPrevented) {
        return;
      }
      if (state.mode === 'view' && currentControl()) {
        api.edit();
      }
    });
    actionButton.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      api.mode(state.mode === 'edit' ? 'view' : 'edit');
    });
    confirmButton.on('click', () => api.view());
    cancelButton.on('click', () => api.cancel());

    // 落地后补一次：编辑态要吸在查看面上并聚焦（与旧 renderDom 收口同一时机）
    api.whenMount = () => {
      if (state.mode === 'edit') {
        positionEditor();
        focusEditor();
      }
    };

    syncActionButton();
    return node;
  });
}

export const vField = createComponentShortcut(VField);
