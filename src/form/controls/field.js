import { HtmlElementNode } from '../../html/index.js';
import { VButton } from '../../actions/button.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  setupContentSlot,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { formatDisplayValue } from './shared.js';
import { applyControlValue, findFieldControl, readControlValue } from './form-values.js';

export class VField extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._mode = 'view';
    this._control = null;
    this._hintVisible = false;
    this._hovered = false;
    this._headerBox = new HtmlElementNode('div').className('yoya-vfield-header');
    this._displayBox = new HtmlElementNode('div').className('yoya-vfield-display');
    this._editorBox = new HtmlElementNode('div')
      .className('yoya-vfield-editor')
      .style('display', 'none');
    this._labelBox = new HtmlElementNode('div').className('yoya-vfield-label');
    this._hintBox = new HtmlElementNode('div')
      .className('yoya-vfield-hint')
      .style('display', 'none');
    this._errorBox = new HtmlElementNode('div')
      .className('yoya-vfield-error')
      .style('display', 'none');
    this._actionButton = new VButton('✎')
      .className('yoya-vfield-action')
      .size('small')
      .variant('secondary')
      .attr({ tabindex: '-1', 'aria-hidden': 'true' })
      .on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.mode(this._mode === 'edit' ? 'view' : 'edit');
      });
    this._confirmButton = new HtmlElementNode('button')
      .className('yoya-vfield-confirm')
      .attr({ type: 'button', 'aria-label': '确认', title: '确认' })
      .child('✓')
      .styles({
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
      })
      .on('click', () => this.view());
    this._cancelButton = new HtmlElementNode('button')
      .className('yoya-vfield-cancel')
      .attr({ type: 'button', 'aria-label': '取消', title: '取消' })
      .child('✕')
      .styles({
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
      })
      .on('click', () => this.cancel());

    this.className(componentClass, 'yoya-vfield');
    this.styles({
      display: 'grid',
      gap: '8px',
      minWidth: '0',
      position: 'relative'
    });
    this._headerBox.styles({
      alignItems: 'center',
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between',
      minWidth: '0'
    });
    this._labelBox.styles({
      color: themeValue('color-text-strong', '#111827'),
      flex: '1 1 auto',
      fontWeight: '700',
      lineHeight: '1.35'
    });
    this._displayBox.styles({
      alignItems: 'center',
      border: themeBorder('color-border', '#d8dee8'),
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: themeValue('color-text', '#172033'),
      display: 'flex',
      minHeight: 'var(--yoya-control-height-md, 34px)',
      padding: '0 12px',
      width: '100%'
    });
    this._editorBox.styles({
      background: themeValue('color-surface', '#ffffff'),
      borderRadius: '6px',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18)',
      boxSizing: 'border-box',
      left: '0',
      minHeight: 'var(--yoya-control-height-md, 34px)',
      minWidth: '0',
      padding: '0',
      position: 'absolute',
      top: '0',
      width: '100%',
      zIndex: 'var(--yoya-z-overlay, 1200)'
    });
    this._hintBox.styles({
      color: themeValue('color-text-muted', '#64748b'),
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._errorBox.styles({
      color: themeValue('color-text-danger', '#b91c1c'),
      fontSize: '12px',
      lineHeight: '1.45'
    });
    this._actionButton.styles({
      flexShrink: '0',
      gap: '0',
      minWidth: '32px',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 120ms ease'
    });
    this._headerBox.child(
      this._labelBox,
      this._actionButton,
      this._confirmButton,
      this._cancelButton
    );
    this.child(this._headerBox, this._displayBox, this._editorBox, this._hintBox, this._errorBox);
    this.on('mouseenter', () => {
      this._hovered = true;
      this._syncActionButton();
    });
    this.on('mouseleave', () => {
      this._hovered = false;
      this._syncActionButton();
    });
    this._setupField(setup);
    this._syncActionButton();
    this.on('dblclick', (event) => {
      if (event.defaultPrevented) {
        return;
      }
      if (this._mode === 'view' && this.control()) {
        this.edit();
      }
    });
  }

  renderDom() {
    const element = super.renderDom();
    if (this._mode === 'edit') {
      this._positionEditor();
      this._focusEditor();
    }
    return element;
  }

  _syncEditorSurface() {
    const control = this.control();
    if (!control || !control._input || control._input._tagName !== 'textarea') {
      return this;
    }
    control._input.style('border', '0');
    control._input.style('boxShadow', null);
    control._input.style('background', 'transparent');
    return this;
  }

  _positionEditor() {
    if (!this._el) {
      return this;
    }
    const anchor = this._displayBox._el || this._el;
    const fieldRect = this._el.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    this._editorBox.styles({
      left: rect.left - fieldRect.left + 'px',
      minHeight: rect.height + 'px',
      top: rect.top - fieldRect.top + 'px',
      width: rect.width + 'px'
    });
    return this;
  }

  _focusEditor() {
    if (!this._editorBox._el) {
      return this;
    }
    const field = this._editorBox._el.querySelector('input, textarea, select');
    if (field && typeof field.focus === 'function') {
      field.focus();
    }
    return this;
  }

  label(value) {
    if (value === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(value));
    return this;
  }

  hint(value) {
    if (value === undefined) {
      return this._hintBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._hintVisible = hasContent;
    this._hintBox.style('display', this._hintVisible ? null : 'none');
    replaceChildren(this._hintBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  error(value) {
    if (value === undefined) {
      return this._errorBox.textContent();
    }

    const hasContent = value !== null && value !== undefined && value !== '';
    this._errorBox.style('display', hasContent ? null : 'none');
    this.attr('data-error', hasContent ? 'true' : null);
    this._hintBox.style('display', hasContent ? 'none' : this._hintVisible ? null : 'none');
    replaceChildren(this._errorBox, hasContent ? normalizeChildren(value) : []);
    return this;
  }

  display(value) {
    if (value === undefined) {
      return this._displayBox.textContent();
    }

    if (typeof value === 'function') {
      setupContentSlot(this._displayBox, value);
      return this;
    }

    replaceChildren(this._displayBox, normalizeChildren(value));
    return this;
  }

  formatter(handler) {
    if (handler === undefined) {
      return this._formatter;
    }

    this._formatter = typeof handler === 'function' ? handler : null;
    if (this._mode === 'view') {
      this._syncDisplayFromControl();
    }
    return this;
  }

  displayClass(...classes) {
    if (classes.length === 0) {
      return this._displayBox.className();
    }

    this._displayBox.className(...classes);
    return this;
  }

  displayStyle(value) {
    if (value === undefined) {
      return this._displayBox.styles();
    }

    this._displayBox.styles(value);
    return this;
  }

  control(setup) {
    if (setup === undefined) {
      return this._control ?? findFieldControl(this._editorBox);
    }

    setupContentSlot(this._editorBox, setup);
    this._control = findFieldControl(this._editorBox);
    this._syncEditorSurface();

    if (this._mode === 'view') {
      this._syncDisplayFromControl();
    }

    this._syncActionButton();

    return this;
  }

  editor(setup) {
    return this.control(setup);
  }

  value(value) {
    const control = this.control();

    if (value === undefined) {
      return control ? readControlValue(control) : this._displayBox.textContent();
    }

    if (control) {
      applyControlValue(control, value);
    } else {
      this.display(value);
    }

    if (this._mode === 'view') {
      this._syncDisplayFromControl();
    }

    return this;
  }

  mode(value) {
    if (value === undefined) {
      return this._mode;
    }

    this._mode = value === 'edit' ? 'edit' : 'view';
    this.attr('data-mode', this._mode);

    if (this._mode === 'edit') {
      this._editSnapshot = this.control() ? readControlValue(this.control()) : null;
      this._displayBox.style('visibility', 'hidden');
      this._editorBox.style('display', null);
      this._positionEditor();
      this._focusEditor();
    } else {
      this._editorBox.style('display', 'none');
      this._displayBox.style('visibility', null);
      this._syncDisplayFromControl();
    }

    this._syncActionButton();

    return this;
  }

  view() {
    return this.mode('view');
  }

  edit() {
    return this.mode('edit');
  }

  cancel() {
    const control = this.control();
    if (control && this._editSnapshot !== null && this._editSnapshot !== undefined) {
      applyControlValue(control, this._editSnapshot);
    }
    this._editSnapshot = null;
    return this.view();
  }

  _syncDisplayFromControl() {
    const control = this.control();

    if (!control) {
      return this;
    }

    const value = readControlValue(control);
    const content = this._formatter ? this._formatter(value, this) : formatDisplayValue(value);

    replaceChildren(this._displayBox, normalizeChildren(content ?? value));
    return this;
  }

  _syncActionButton() {
    if (!this._actionButton) {
      return this;
    }

    const hasControl = Boolean(this.control());
    const editing = this._mode === 'edit';
    const entryVisible = hasControl && !editing && this._hovered;

    this._actionButton.label('✎');
    this._actionButton.attr({
      'aria-hidden': entryVisible ? null : 'true',
      'aria-label': '编辑',
      title: '编辑'
    });
    this._actionButton.attr('tabindex', entryVisible ? null : '-1');
    this._actionButton.style('opacity', entryVisible ? '1' : '0');
    this._actionButton.style('pointerEvents', entryVisible ? null : 'none');

    [this._confirmButton, this._cancelButton].forEach((button) => {
      if (!button) {
        return;
      }
      const actionLabel = button === this._confirmButton ? '确认' : '取消';
      button.attr({
        'aria-hidden': editing ? null : 'true',
        'aria-label': actionLabel,
        title: actionLabel
      });
      button.attr('tabindex', editing ? null : '-1');
      button.style('opacity', editing ? '1' : '0');
      button.style('pointerEvents', editing ? null : 'none');
    });

    return this;
  }

  _setupField(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
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
        this.setup(elementConfig);
      }

      if (label !== undefined) {
        this.label(label);
      }

      if (hint !== undefined) {
        this.hint(hint);
      }

      if (display !== undefined) {
        this.display(display);
      }

      if (formatter !== undefined) {
        this.formatter(formatter);
      }

      if (displayClass !== undefined) {
        this.displayClass(...(Array.isArray(displayClass) ? displayClass : [displayClass]));
      }

      if (displayStyle !== undefined) {
        this.displayStyle(displayStyle);
      }

      if (editor !== undefined) {
        this.editor(editor);
      } else if (control !== undefined) {
        this.control(control);
      } else if (children !== undefined) {
        this.editor(children);
      }

      if (value !== undefined) {
        this.value(value);
      }

      if (error !== undefined) {
        this.error(error);
      }

      if (mode !== undefined) {
        this.mode(mode);
      }

      return;
    }

    this.display(setup);
  }
}

export function vField(first = null, second = null, third = null) {
  return createComponentFactory(VField, first, second, third, arguments);
}
