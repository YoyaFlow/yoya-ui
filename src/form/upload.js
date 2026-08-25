import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { CloseOutlined, UploadOutlined } from '../svg/icons.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  resolveTextValue,
  setupContentSlot,
  themeValue
} from '../components/shared.js';

export class VUpload extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._accept = '';
    this._disabled = false;
    this._multiple = false;
    this._name = '';
    this._files = [];
    this._input = new HtmlElementNode('input')
      .attr({ tabindex: '-1', type: 'file' })
      .style('display', 'none');
    this._dropZone = new HtmlElementNode('div')
      .className('yoya-vupload-dropzone')
      .attr({ role: 'button', tabindex: '0' });
    this._list = new HtmlElementNode('ul').className('yoya-vupload-list');

    this.className(componentClass, 'yoya-vupload');
    this.styles({
      display: 'grid',
      gap: '10px',
      minWidth: '0',
      width: '100%'
    });
    this.child(this._input, this._dropZone, this._list);

    this._input.on('change', () => this._handleInputChange());
    this._dropZone.on('click', () => this._openPicker());
    this._dropZone.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this._openPicker();
      }
    });
    this._dropZone.on('dragenter', (event) => {
      event.preventDefault();
      this._setDragging(true);
    });
    this._dropZone.on('dragover', (event) => {
      event.preventDefault();
      this._setDragging(true);
    });
    this._dropZone.on('dragleave', () => this._setDragging(false));
    this._dropZone.on('drop', (event) => this._handleDrop(event));

    this._setupUpload(setup);
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

    this._accept = value ? String(value) : '';
    this._input.attr('accept', this._accept || null);
    this.attr('data-accept', this._accept || null);
    return this;
  }

  multiple(value) {
    if (value === undefined) {
      return this._multiple;
    }

    const enabled = Boolean(value);
    this._multiple = enabled;
    this._input.attr('multiple', enabled ? true : null);
    this.attr('data-multiple', enabled ? 'true' : null);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this._disabled;
    }

    const enabled = Boolean(value);
    this._disabled = enabled;
    this.attr('data-disabled', enabled ? 'true' : null);
    this._dropZone.attr('aria-disabled', enabled ? 'true' : null);
    this._dropZone.attr('tabindex', enabled ? '-1' : '0');
    this._input.attr('disabled', enabled ? true : null);
    this._sync();
    return this;
  }

  files(value) {
    if (value === undefined) {
      return this._files.map((entry) => entry.file);
    }

    this._files = normalizeFileEntries(value);
    this._sync();
    this._emitChange();
    return this;
  }

  items(value) {
    if (value === undefined) {
      return this._files.slice();
    }

    return this.files(value);
  }

  value(value) {
    return this.files(value);
  }

  addFiles(fileList) {
    if (!fileList || this._disabled) {
      return this;
    }

    if (!this._multiple) {
      this._files = [];
    }

    Array.from(fileList)
      .filter((file) => this._acceptsFile(file))
      .forEach((file) => {
        this._files.push({
          file,
          name: file.name,
          progress: 0,
          size: file.size,
          status: 'ready'
        });
      });
    this._sync();
    this._emitChange();
    return this;
  }

  remove(indexOrName) {
    const index = Number.isInteger(indexOrName)
      ? indexOrName
      : this._files.findIndex((entry) => entry.name === indexOrName);

    if (index >= 0 && index < this._files.length) {
      this._files.splice(index, 1);
      this._sync();
      this._emitChange();
    }

    return this;
  }

  clear() {
    if (this._files.length > 0) {
      this._files = [];
      this._sync();
      this._emitChange();
    }
    return this;
  }

  status(index, value) {
    const entry = this._files[index];
    if (entry && value !== undefined) {
      entry.status = resolveTextValue(value);
      this._sync();
    }
    return entry ? entry.status : null;
  }

  progress(index, value) {
    const entry = this._files[index];
    if (entry && value !== undefined) {
      entry.progress = Math.max(0, Math.min(100, Number(value) || 0));
      this._sync();
    }
    return entry ? entry.progress : null;
  }

  dropZone(setup) {
    if (setup === undefined) {
      return this._dropZone;
    }

    setupContentSlot(this._dropZone, setup);
    return this;
  }

  _openPicker() {
    if (this._disabled) {
      return;
    }

    this._input._el?.click();
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

    if (this._disabled) {
      return;
    }

    if (event.dataTransfer?.files) {
      this.addFiles(event.dataTransfer.files);
    }
  }

  _setDragging(dragging) {
    this._dropZone.attr('data-dragging', dragging ? 'true' : null);
  }

  _acceptsFile(file) {
    if (!this._accept) {
      return true;
    }

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
    this.attr('data-count', String(this._files.length));
    this._dropZone.attr('data-disabled', this._disabled ? 'true' : null);

    if (this._dropZone.children().length === 0) {
      this._dropZone.child(
        UploadOutlined().styles({
          color: themeValue('color-primary', '#2563eb'),
          height: '28px',
          width: '28px'
        }),
        new HtmlElementNode('span')
          .className('yoya-vupload-dropzone-title')
          .text('点击或拖拽文件到此处'),
        new HtmlElementNode('span')
          .className('yoya-vupload-dropzone-hint')
          .text(this._multiple ? '支持选择多个文件' : '支持选择单个文件')
      );
    }

    replaceChildren(
      this._list,
      this._files.map((entry, index) => this._createItem(entry, index))
    );
    return this;
  }

  _createItem(entry, index) {
    const item = new HtmlElementNode('li')
      .className('yoya-vupload-item')
      .attr({ 'data-file-index': String(index) });
    const info = new HtmlElementNode('div').className('yoya-vupload-item-info');
    const name = new HtmlElementNode('strong').className('yoya-vupload-item-name').text(entry.name);
    const meta = new HtmlElementNode('span')
      .className('yoya-vupload-item-meta')
      .text(`${formatFileSize(entry.size)} · ${entry.status}`);
    const progress = new HtmlElementNode('div')
      .className('yoya-vupload-progress')
      .attr('data-status', entry.status)
      .style('display', entry.status === 'uploading' ? null : 'none');
    const progressBar = new HtmlElementNode('span')
      .className('yoya-vupload-progress-bar')
      .style('width', `${entry.progress}%`);
    const remove = new HtmlElementNode('button')
      .className('yoya-vupload-remove')
      .attr({ 'aria-label': `删除 ${entry.name}`, title: '删除', type: 'button' })
      .on('click', () => this.remove(index));

    progress.child(progressBar);
    info.child(name, meta, progress);
    remove.child(CloseOutlined().styles({ height: '12px', width: '12px' }));
    item.child(info, remove);
    return item;
  }

  _emitChange() {
    if (!this._el) {
      return;
    }

    const EventClass = this._el.ownerDocument?.defaultView?.Event || Event;
    this._el.dispatchEvent(new EventClass('change', { bubbles: true }));
  }

  _setupUpload(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        accept,
        children,
        disabled,
        dropZone,
        files,
        items,
        multiple,
        name,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (name !== undefined) {
        this.name(name);
      }
      if (accept !== undefined) {
        this.accept(accept);
      }
      if (multiple !== undefined) {
        this.multiple(multiple);
      }
      if (disabled !== undefined) {
        this.disabled(disabled);
      }
      if (dropZone !== undefined) {
        this.dropZone(dropZone);
      } else if (children !== undefined) {
        this.dropZone(children);
      }

      const initialFiles = items ?? files;
      if (initialFiles !== undefined) {
        this.files(initialFiles);
      }

      return;
    }

    this.dropZone(setup);
  }
}

export function vUpload(first = null, second = null, third = null) {
  return createComponentFactory(VUpload, first, second, third);
}

registerChildFactories(HtmlElementNode, { vUpload });

function normalizeFileEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (item instanceof File) {
        return {
          file: item,
          name: item.name,
          progress: 0,
          size: item.size,
          status: 'ready'
        };
      }

      if (item && typeof item === 'object' && item.file) {
        return {
          file: item.file,
          name: item.name ?? item.file.name,
          progress: Number(item.progress) || 0,
          size: item.size ?? item.file.size,
          status: item.status ?? 'ready'
        };
      }

      return null;
    })
    .filter(Boolean);
}

function formatFileSize(size) {
  const bytes = Number(size) || 0;

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
