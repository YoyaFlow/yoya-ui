import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { CloseOutlined, UserOutlined } from '../svg/icons.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  resolveTextValue,
  themeValue
} from '../components/shared.js';

export class VAvatarUpload extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._accept = 'image/*';
    this._disabled = false;
    this._name = '';
    this._objectUrl = null;
    this._shape = 'circle';
    this._size = 96;
    this._value = null;
    this._input = new HtmlElementNode('input')
      .attr({ accept: 'image/*', tabindex: '-1', type: 'file' })
      .style('display', 'none');
    this._preview = new HtmlElementNode('div')
      .className('yoya-vavatar-upload-preview')
      .attr({ role: 'button', tabindex: '0' });
    this._remove = new HtmlElementNode('button')
      .className('yoya-vavatar-upload-remove')
      .attr({ 'aria-label': '移除头像', title: '移除', type: 'button' })
      .child(CloseOutlined().styles({ height: '12px', width: '12px' }))
      .style('display', 'none');

    this.className(componentClass, 'yoya-vavatar-upload');
    this.styles({
      display: 'inline-grid',
      gap: '8px',
      justifyItems: 'center',
      minWidth: '0'
    });
    this.child(this._input, this._preview, this._remove);

    this._input.on('change', () => this._handleInputChange());
    this._preview.on('click', () => this._openPicker());
    this._preview.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this._openPicker();
      }
    });
    this._preview.on('dragenter', (event) => {
      event.preventDefault();
      this._setDragging(true);
    });
    this._preview.on('dragover', (event) => {
      event.preventDefault();
      this._setDragging(true);
    });
    this._preview.on('dragleave', () => this._setDragging(false));
    this._preview.on('drop', (event) => this._handleDrop(event));
    this._remove.on('click', (event) => {
      event.stopPropagation();
      this.remove();
    });

    this._setupAvatarUpload(setup);
    this._sync();
  }

  name(value) {
    if (value === undefined) {
      return this._name;
    }

    this._name = resolveTextValue(value);
    return this;
  }

  accept(value) {
    if (value === undefined) {
      return this._accept;
    }

    this._accept = value ? String(value) : 'image/*';
    this._input.attr('accept', this._accept);
    this.attr('data-accept', this._accept);
    return this;
  }

  shape(value) {
    if (value === undefined) {
      return this._shape;
    }

    this._shape = value === 'square' ? 'square' : 'circle';
    this.attr('data-shape', this._shape);
    this._syncPreviewSize();
    return this;
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = Math.max(32, Number(value) || 96);
    this.attr('data-size', String(this._size));
    this._syncPreviewSize();
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this._disabled;
    }

    this._disabled = Boolean(value);
    this.attr('data-disabled', this._disabled ? 'true' : null);
    this._preview.attr('aria-disabled', this._disabled ? 'true' : null);
    this._preview.attr('tabindex', this._disabled ? '-1' : '0');
    this._input.attr('disabled', this._disabled ? true : null);
    this._sync();
    return this;
  }

  value(value) {
    if (value === undefined) {
      return this._value;
    }

    this._value = value instanceof File ? value : null;
    this._sync();
    this._emitChange();
    return this;
  }

  files(value) {
    if (value === undefined) {
      return this._value ? [this._value] : [];
    }

    const next = Array.isArray(value) ? value[0] : value;
    return this.value(next);
  }

  items(value) {
    return this.files(value);
  }

  addFiles(fileList) {
    if (!fileList || this._disabled) {
      return this;
    }

    const file = Array.from(fileList).find((item) => this._acceptsFile(item));
    if (file) {
      this.value(file);
    }
    return this;
  }

  remove() {
    if (this._value) {
      this.value(null);
    }
    return this;
  }

  clear() {
    return this.remove();
  }

  destroy() {
    this._releaseObjectUrl();
    return super.destroy();
  }

  _openPicker() {
    if (!this._disabled) {
      this._input._el?.click();
    }
  }

  _handleInputChange() {
    if (this._input._el?.files) {
      this.addFiles(this._input._el.files);
    }
    if (this._input._el) {
      this._input._el.value = '';
    }
  }

  _handleDrop(event) {
    event.preventDefault();
    this._setDragging(false);

    if (!this._disabled && event.dataTransfer?.files) {
      this.addFiles(event.dataTransfer.files);
    }
  }

  _setDragging(dragging) {
    this._preview.attr('data-dragging', dragging ? 'true' : null);
  }

  _acceptsFile(file) {
    const rules = this._accept
      .split(',')
      .map((rule) => rule.trim().toLowerCase())
      .filter(Boolean);
    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();

    return rules.some((rule) => {
      if (rule === '*' || rule === '*/*') {
        return true;
      }
      if (rule.startsWith('.')) {
        return fileName.endsWith(rule);
      }
      if (rule.endsWith('/*')) {
        return fileType.startsWith(rule.slice(0, -1));
      }
      return fileType === rule;
    });
  }

  _sync() {
    this._releaseObjectUrl();
    replaceChildren(this._preview, []);
    this.attr('data-has-value', this._value ? 'true' : null);
    this._remove.style('display', this._value ? null : 'none');

    if (this._value) {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        this._objectUrl = URL.createObjectURL(this._value);
      }
      this._preview.child(
        new HtmlElementNode('img')
          .className('yoya-vavatar-upload-image')
          .attr({ alt: '头像预览', src: this._objectUrl || '' })
      );
    } else {
      this._preview.child(
        new HtmlElementNode('div')
          .className('yoya-vavatar-upload-fallback')
          .child(
            UserOutlined().styles({
              color: themeValue('color-text-muted', '#64748b'),
              height: '28px',
              width: '28px'
            }),
            new HtmlElementNode('span').className('yoya-vavatar-upload-hint').text('点击上传头像')
          )
      );
    }

    this._syncPreviewSize();
    return this;
  }

  _syncPreviewSize() {
    this._preview.styles({
      borderRadius: this._shape === 'square' ? '10px' : '50%',
      height: `${this._size}px`,
      width: `${this._size}px`
    });
  }

  _releaseObjectUrl() {
    if (
      this._objectUrl &&
      typeof URL !== 'undefined' &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      URL.revokeObjectURL(this._objectUrl);
    }
    this._objectUrl = null;
  }

  _emitChange() {
    if (!this._el) {
      return;
    }

    const EventClass = this._el.ownerDocument?.defaultView?.Event || Event;
    this._el.dispatchEvent(new EventClass('change', { bubbles: true }));
  }

  _setupAvatarUpload(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { accept, disabled, files, name, shape, size, value, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (name !== undefined) {
        this.name(name);
      }
      if (accept !== undefined) {
        this.accept(accept);
      }
      if (shape !== undefined) {
        this.shape(shape);
      }
      if (size !== undefined) {
        this.size(size);
      }
      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      const initialValue = value ?? files?.[0];
      if (initialValue !== undefined) {
        this.value(initialValue);
      }

      return;
    }

    this.child(setup);
  }
}

export function vAvatarUpload(first = null, second = null, third = null) {
  return createComponentFactory(VAvatarUpload, first, second, third);
}

registerChildFactories(HtmlElementNode, { vAvatarUpload });
