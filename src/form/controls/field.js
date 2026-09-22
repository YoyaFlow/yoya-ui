import { vButton } from '../../actions/button.js';
import { viewRootOf } from '../../core/node.js';
import { vNode } from '../../core/v-node.js';
import { button, div } from '../../html/index.js';
import {
  createComponentShortcut,
  normalizeChildren,
  replaceChildren,
  setupContentSlot,
  themeBorder,
  themeValue
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

    const labelBox = div({
      style: {
        color: themeValue('color-text-strong', '#111827'),
        flex: '1 1 auto',
        fontWeight: '700',
        lineHeight: '1.35'
      },
      vn: 'VFieldLabel'
    });
    const displayBox = div({
      style: {
        alignItems: 'center',
        border: themeBorder('color-border', '#d8dee8'),
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: themeValue('color-text', '#172033'),
        display: 'flex',
        minHeight: 'var(--yoya-control-height-md, 34px)',
        padding: '0 12px',
        width: '100%'
      },
      vn: 'VFieldDisplay'
    });
    const editorBox = div({
      style: {
        background: themeValue('color-surface', '#ffffff'),
        borderRadius: '6px',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18)',
        boxSizing: 'border-box',
        display: 'none',
        left: '0',
        minHeight: 'var(--yoya-control-height-md, 34px)',
        minWidth: '0',
        padding: '0',
        position: 'absolute',
        top: '0',
        width: '100%',
        zIndex: 'var(--yoya-z-overlay, 1200)'
      },
      vn: 'VFieldEditor'
    });
    const hintBox = div({
      style: {
        color: themeValue('color-text-muted', '#64748b'),
        display: 'none',
        fontSize: '12px',
        lineHeight: '1.45'
      },
      vn: 'VFieldHint'
    });
    const errorBox = div({
      style: {
        color: themeValue('color-text-danger', '#b91c1c'),
        display: 'none',
        fontSize: '12px',
        lineHeight: '1.45'
      },
      vn: 'VFieldError'
    });
    // 动作按钮复用 vButton：身份写多值（部件 + 组件），样式仍归自己
    const actionButton = vButton('✎').size('small').variant('secondary');
    actionButton.setup({ vn: 'VFieldAction VButton' });
    actionButton.attr({
      'aria-hidden': 'true',
      'aria-label': '编辑',
      tabindex: '-1',
      title: '编辑'
    });
    actionButton.styles({
      flexShrink: '0',
      gap: '0',
      minWidth: '32px',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 120ms ease'
    });
    const confirmButton = button({
      'aria-hidden': 'true',
      'aria-label': '确认',
      style: {
        background: 'transparent',
        border: '0',
        color: themeValue('color-primary', '#1f6feb'),
        cursor: 'pointer',
        font: 'inherit',
        fontWeight: '700',
        lineHeight: '1.35',
        opacity: '0',
        padding: '0 4px',
        pointerEvents: 'none'
      },
      tabindex: '-1',
      title: '确认',
      type: 'button',
      vn: 'VFieldConfirm'
    }).child('✓');
    const cancelButton = button({
      'aria-hidden': 'true',
      'aria-label': '取消',
      style: {
        background: 'transparent',
        border: '0',
        color: themeValue('color-text-secondary', '#6f6f6f'),
        cursor: 'pointer',
        font: 'inherit',
        fontWeight: '700',
        lineHeight: '1.35',
        opacity: '0',
        padding: '0 4px',
        pointerEvents: 'none'
      },
      tabindex: '-1',
      title: '取消',
      type: 'button',
      vn: 'VFieldCancel'
    }).child('✕');

    const node = div(
      {
        'data-mode': 'view',
        style: { display: 'grid', gap: '8px', minWidth: '0', position: 'relative' },
        vn: 'VField'
      },
      (root) =>
        root.child(
          div(
            {
              style: {
                alignItems: 'center',
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between',
                minWidth: '0'
              },
              vn: 'VFieldHeader'
            },
            (header) => header.child(labelBox, actionButton, confirmButton, cancelButton)
          ),
          displayBox,
          editorBox,
          hintBox,
          errorBox
        )
    );

    /** 编辑面：textarea 控件去掉自己的边框与背景（写控件内部样式，字段没有别的手段）。 */
    const syncEditorSurface = () => {
      const control = currentControl();
      const unit = control ? (viewRootOf(control) ?? control) : null;

      if (!unit?._input || unit._input._tagName !== 'textarea') {
        return api;
      }

      unit._input.style('border', '0');
      unit._input.style('boxShadow', null);
      unit._input.style('background', 'transparent');
      return api;
    };

    /** 编辑面吸在查看面上：读元素走公共取用方法，未落地时不动。 */
    const positionEditor = () => {
      // 未落地（还没建 DOM）时不动：`_el` 只读判定与 VTableWrapper 的首屏口径一致
      if (!node._el) {
        return api;
      }

      const fieldElement = node.renderDom();
      const anchor = displayBox.renderDom() || fieldElement;
      const fieldRect = fieldElement.getBoundingClientRect();
      const rect = anchor.getBoundingClientRect();

      editorBox.styles({
        left: `${rect.left - fieldRect.left}px`,
        minHeight: `${rect.height}px`,
        top: `${rect.top - fieldRect.top}px`,
        width: `${rect.width}px`
      });
      return api;
    };

    const focusEditor = () => {
      const editorElement = editorBox.renderDom();
      const field = editorElement?.querySelector('input, textarea, select');

      if (field && typeof field.focus === 'function') {
        field.focus();
      }
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
      actionButton.style('opacity', entryVisible ? '1' : '0');
      actionButton.style('pointerEvents', entryVisible ? null : 'none');

      [confirmButton, cancelButton].forEach((buttonNode) => {
        const actionLabel = buttonNode === confirmButton ? '确认' : '取消';

        buttonNode.attr({
          'aria-hidden': editing ? null : 'true',
          'aria-label': actionLabel,
          tabindex: editing ? null : '-1',
          title: actionLabel
        });
        buttonNode.style('opacity', editing ? '1' : '0');
        buttonNode.style('pointerEvents', editing ? null : 'none');
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
      hintBox.style('display', hasContent ? null : 'none');
      replaceChildren(hintBox, hasContent ? normalizeChildren(value) : []);
      return api;
    };

    api.error = (value) => {
      if (value === undefined) {
        return errorBox.textContent();
      }

      const hasContent = value !== null && value !== undefined && value !== '';

      errorBox.style('display', hasContent ? null : 'none');
      node.attr('data-error', hasContent ? 'true' : null);
      hintBox.style('display', hasContent ? 'none' : state.hintVisible ? null : 'none');
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
        displayBox.style('visibility', 'hidden');
        editorBox.style('display', null);
        positionEditor();
        focusEditor();
      } else {
        editorBox.style('display', 'none');
        displayBox.style('visibility', null);
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
