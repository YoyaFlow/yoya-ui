import { registerChildFactories } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import {
  HtmlElementNode,
  button as buttonTag,
  div,
  input as inputTag,
  li,
  span,
  strong,
  ul
} from '../html/index.js';
import { CloseOutlined, UploadOutlined } from '../svg/icons.js';
import {
  createComponentShortcut,
  isPlainObject,
  replaceChildren,
  resolveTextValue,
  setupContentSlot,
  themeValue
} from '../components/shared.js';

/**
 * 上传控件（形态 B，票 15 §4）：视图根是外壳 `div` + 隐藏的 file 输入 + 拖拽区 + 文件列表。
 *
 * - 身份写在结构里：根 `vn: 'VUpload'`、拖拽区 `vn: 'VUploadDropzone'`（标题 / 提示
 *   `VUploadDropzoneTitle` / `VUploadDropzoneHint`）、列表 `vn: 'VUploadList'`、
 *   每项 `VUploadItem`（`VUploadItemInfo` / `VUploadItemName` / `VUploadItemMeta` /
 *   `VUploadProgress` / `VUploadProgressBar` / `VUploadRemove`）；
 * - 状态与命令收进 `vNode` 闭包；`change` 原生事件仍从视图根派发（DOM 事件语义不变）；
 * - 拖拽区内容通道 `dropZone(setup)` 按 `setupContentSlot` 口径整体替换（取用器：无参返回拖拽区节点）；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupUpload` 同口径）。
 */
export function VUpload() {
  return vNode((api) => {
    const state = {
      accept: '',
      disabled: false,
      files: [],
      multiple: false,
      name: ''
    };
    let hintNode = null;

    const input = inputTag({ style: { display: 'none' } }).attr({ tabindex: '-1', type: 'file' });
    const dropZone = div({ vn: 'VUploadDropzone' }).attr({ role: 'button', tabindex: '0' });
    const fileList = ul({ vn: 'VUploadList' });
    const node = div({ vn: 'VUpload' }).styles({
      display: 'grid',
      gap: '10px',
      minWidth: '0',
      width: '100%'
    });

    node.child(input, dropZone, fileList);

    const hintText = () => (state.multiple ? '支持选择多个文件' : '支持选择单个文件');

    const syncHint = () => {
      if (hintNode) {
        replaceChildren(hintNode, [hintText()]);
      }
    };

    const createItem = (entry, index) => {
      const item = li({ vn: 'VUploadItem' }).attr({ 'data-file-index': String(index) });
      const info = div({ vn: 'VUploadItemInfo' });
      const name = strong({ vn: 'VUploadItemName' }).child(entry.name);
      const meta = span({ vn: 'VUploadItemMeta' }).child(
        `${formatFileSize(entry.size)} · ${entry.status}`
      );
      const progress = div({ vn: 'VUploadProgress' })
        .attr('data-status', entry.status)
        .style('display', entry.status === 'uploading' ? null : 'none');
      const progressBar = span({ vn: 'VUploadProgressBar' }).style('width', `${entry.progress}%`);
      const removeButton = buttonTag({ vn: 'VUploadRemove' }).attr({
        'aria-label': `删除 ${entry.name}`,
        title: '删除',
        type: 'button'
      });

      progress.child(progressBar);
      info.child(name, meta, progress);
      removeButton.child(CloseOutlined().styles({ height: '12px', width: '12px' }));
      removeButton.on('click', () => api.remove(index));
      item.child(info, removeButton);
      return item;
    };

    const sync = () => {
      node.attr('data-count', String(state.files.length));
      dropZone.attr('data-disabled', state.disabled ? 'true' : null);

      if (dropZone.children().length === 0) {
        hintNode = span({ vn: 'VUploadDropzoneHint' }).child(hintText());
        dropZone.child(
          UploadOutlined().styles({
            color: themeValue('color-primary', '#2563eb'),
            height: '28px',
            width: '28px'
          }),
          span({ vn: 'VUploadDropzoneTitle' }).child('点击或拖拽文件到此处'),
          hintNode
        );
      }

      replaceChildren(
        fileList,
        state.files.map((entry, index) => createItem(entry, index))
      );
    };

    const emitChange = () => {
      if (!node._el) {
        return;
      }

      const EventClass = node._el.ownerDocument?.defaultView?.Event || Event;

      node._el.dispatchEvent(new EventClass('change', { bubbles: true }));
    };

    const setDragging = (dragging) => {
      dropZone.attr('data-dragging', dragging ? 'true' : null);
    };

    const openPicker = () => {
      if (state.disabled) {
        return;
      }

      input._el?.click();
    };

    const acceptsFile = (file) => {
      if (!state.accept) {
        return true;
      }

      const rules = state.accept
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
    };

    const addFiles = (fileListValue) => {
      if (!fileListValue || state.disabled) {
        return;
      }

      const acceptedFiles = Array.from(fileListValue).filter((file) => acceptsFile(file));

      if (acceptedFiles.length === 0) {
        return;
      }

      if (!state.multiple) {
        state.files = [];
      }

      acceptedFiles.forEach((file) => {
        state.files.push({
          file,
          name: file.name,
          progress: 0,
          size: file.size,
          status: 'ready'
        });
      });
      sync();
      emitChange();
    };

    input.on('change', () => {
      if (input._el?.files) {
        addFiles(input._el.files);
      }
      if (input._el) {
        input._el.value = '';
      }
    });
    dropZone.on('click', () => openPicker());
    dropZone.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    });
    dropZone.on('dragenter', (event) => {
      event.preventDefault();
      setDragging(true);
    });
    dropZone.on('dragover', (event) => {
      event.preventDefault();
      setDragging(true);
    });
    dropZone.on('dragleave', () => setDragging(false));
    dropZone.on('drop', (event) => {
      event.preventDefault();
      setDragging(false);

      if (state.disabled) {
        return;
      }

      if (event.dataTransfer?.files) {
        addFiles(event.dataTransfer.files);
      }
    });

    api.name = (value) => {
      if (value === undefined) {
        return state.name;
      }

      state.name = resolveTextValue(value);
      return api;
    };

    api.accept = (value) => {
      if (value === undefined) {
        return state.accept;
      }

      state.accept = value ? String(value) : '';
      input.attr('accept', state.accept || null);
      node.attr('data-accept', state.accept || null);
      return api;
    };

    api.multiple = (value) => {
      if (value === undefined) {
        return state.multiple;
      }

      const enabled = Boolean(value);

      state.multiple = enabled;
      input.attr('multiple', enabled ? true : null);
      node.attr('data-multiple', enabled ? 'true' : null);
      // 提示文案是 multiple 的派生态：挂载后再改也要跟着走（原先只写一次，会停在旧态）
      syncHint();
      return api;
    };

    api.disabled = (value) => {
      if (value === undefined) {
        return state.disabled;
      }

      const enabled = Boolean(value);

      state.disabled = enabled;
      node.attr('data-disabled', enabled ? 'true' : null);
      dropZone.attr('aria-disabled', enabled ? 'true' : null);
      dropZone.attr('tabindex', enabled ? '-1' : '0');
      input.attr('disabled', enabled ? true : null);
      sync();
      return api;
    };

    api.files = (value) => {
      if (value === undefined) {
        return state.files.map((entry) => entry.file);
      }

      state.files = normalizeFileEntries(value);
      sync();
      emitChange();
      return api;
    };

    api.items = (value) => {
      if (value === undefined) {
        return state.files.slice();
      }

      return api.files(value);
    };

    api.value = (value) => api.files(value);

    api.addFiles = (fileListValue) => {
      addFiles(fileListValue);
      return api;
    };

    api.remove = (indexOrName) => {
      const index = Number.isInteger(indexOrName)
        ? indexOrName
        : state.files.findIndex((entry) => entry.name === indexOrName);

      if (index >= 0 && index < state.files.length) {
        state.files.splice(index, 1);
        sync();
        emitChange();
      }

      return api;
    };

    api.clear = () => {
      if (state.files.length > 0) {
        state.files = [];
        sync();
        emitChange();
      }
      return api;
    };

    api.status = (index, value) => {
      const entry = state.files[index];

      if (entry && value !== undefined) {
        entry.status = resolveTextValue(value);
        sync();
      }
      return entry ? entry.status : null;
    };

    api.progress = (index, value) => {
      const entry = state.files[index];

      if (entry && value !== undefined) {
        entry.progress = Math.max(0, Math.min(100, Number(value) || 0));
        sync();
      }
      return entry ? entry.progress : null;
    };

    /** 拖拽区内容通道：无参返回拖拽区节点，有参整体替换它的内容（取用器口径）。 */
    api.dropZone = (setup) => {
      if (setup === undefined) {
        return dropZone;
      }

      setupContentSlot(dropZone, setup);
      return api;
    };

    /** 对象 / 内容 = 拖拽区内容（旧 `_setupUpload` 的兜底分支）。 */
    api.setupString = (setup) => api.dropZone(setup);

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupUpload` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const {
        accept,
        children,
        disabled,
        dropZone: dropZoneSetup,
        files,
        items,
        multiple,
        name,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (name !== undefined) {
        api.name(name);
      }
      if (accept !== undefined) {
        api.accept(accept);
      }
      if (multiple !== undefined) {
        api.multiple(multiple);
      }
      if (disabled !== undefined) {
        api.disabled(disabled);
      }
      if (dropZoneSetup !== undefined) {
        api.dropZone(dropZoneSetup);
      } else if (children !== undefined) {
        api.dropZone(children);
      }

      const initialFiles = items ?? files;
      if (initialFiles !== undefined) {
        api.files(initialFiles);
      }

      return api;
    };

    sync();
    return node;
  });
}

export const vUpload = createComponentShortcut(VUpload);

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
