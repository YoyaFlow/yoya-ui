import { registerChildFactories } from '../core/node.js';
import { vNode } from '../core/v-node.js';
import {
  HtmlElementNode,
  button as buttonTag,
  div,
  img,
  input as inputTag,
  span
} from '../html/index.js';
import { CloseOutlined, UserOutlined } from '../svg/icons.js';
import {
  createComponentShortcut,
  isPlainObject,
  replaceChildren,
  resolveTextValue,
  themeValue
} from '../components/shared.js';

/**
 * 头像上传（形态 B，票 15 §4）：视图根是外壳 `div` + 隐藏的 file 输入 + 预览区 + 移除按钮。
 *
 * - 身份写在结构里：根 `vn: 'VAvatarUpload'`、预览区 `vn: 'VAvatarUploadPreview'`、
 *   移除按钮 `vn: 'VAvatarUploadRemove'`、预览图 `vn: 'VAvatarUploadImage'`、
 *   空态 `VAvatarUploadFallback`（提示 `VAvatarUploadHint`）；
 * - 状态与命令收进 `vNode` 闭包；预览内容**按需建**：有值时建 `<img>`、没值时建空态；
 * - 元素级时机：旧 `destroy()` 里释放 object URL 改 `whenDestroy`；
 * - props 分派：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupAvatarUpload` 同口径）。
 */
export function VAvatarUpload() {
  return vNode((api, self) => {
    const state = {
      accept: 'image/*',
      disabled: false,
      name: '',
      objectUrl: null,
      shape: 'circle',
      size: 96,
      value: null
    };

    const input = inputTag({ style: { display: 'none' } }).attr({
      accept: 'image/*',
      tabindex: '-1',
      type: 'file'
    });
    const preview = div({ vn: 'VAvatarUploadPreview' }).attr({
      role: 'button',
      tabindex: '0'
    });
    const removeButton = buttonTag({ vn: 'VAvatarUploadRemove' })
      .attr({ 'aria-label': '移除头像', title: '移除', type: 'button' })
      .child(CloseOutlined().styles({ height: '12px', width: '12px' }))
      .style('display', 'none');
    const node = div({ vn: 'VAvatarUpload' }).styles({
      display: 'inline-grid',
      gap: '8px',
      justifyItems: 'center',
      minWidth: '0'
    });

    node.child(input, preview, removeButton);

    const releaseObjectUrl = () => {
      if (
        state.objectUrl &&
        typeof URL !== 'undefined' &&
        typeof URL.revokeObjectURL === 'function'
      ) {
        URL.revokeObjectURL(state.objectUrl);
      }
      state.objectUrl = null;
    };

    const syncPreviewSize = () => {
      preview.styles({
        borderRadius: state.shape === 'square' ? '10px' : '50%',
        height: `${state.size}px`,
        width: `${state.size}px`
      });
    };

    const sync = () => {
      releaseObjectUrl();
      replaceChildren(preview, []);
      node.attr('data-has-value', state.value ? 'true' : null);
      removeButton.style('display', state.value ? null : 'none');

      if (state.value) {
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          state.objectUrl = URL.createObjectURL(state.value);
        }
        preview.child(
          img({ vn: 'VAvatarUploadImage' }).attr({
            alt: '头像预览',
            src: state.objectUrl || ''
          })
        );
      } else {
        preview.child(
          div({ vn: 'VAvatarUploadFallback' }).child(
            UserOutlined().styles({
              color: themeValue('color-text-muted', '#64748b'),
              height: '28px',
              width: '28px'
            }),
            span({ vn: 'VAvatarUploadHint' }).child('点击上传头像')
          )
        );
      }

      syncPreviewSize();
    };

    const emitChange = () => {
      node.emit('change');
    };

    const setDragging = (dragging) => {
      preview.attr('data-dragging', dragging ? 'true' : null);
    };

    const openPicker = () => {
      if (!state.disabled) {
        input.invoke('click');
      }
    };

    const acceptsFile = (file) => {
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

    const addFiles = (fileList) => {
      if (!fileList || state.disabled) {
        return;
      }

      const file = Array.from(fileList).find((item) => acceptsFile(item));

      if (file) {
        api.value(file);
      }
    };

    input.on('change', () => {
      const files = input.prop('files');

      if (files) {
        addFiles(files);
      }

      input.prop('value', '');
    });
    preview.on('click', () => openPicker());
    preview.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    });
    preview.on('dragenter', (event) => {
      event.preventDefault();
      setDragging(true);
    });
    preview.on('dragover', (event) => {
      event.preventDefault();
      setDragging(true);
    });
    preview.on('dragleave', () => setDragging(false));
    preview.on('drop', (event) => {
      event.preventDefault();
      setDragging(false);

      if (!state.disabled && event.dataTransfer?.files) {
        addFiles(event.dataTransfer.files);
      }
    });
    removeButton.on('click', (event) => {
      event.stopPropagation();
      api.remove();
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

      state.accept = value ? String(value) : 'image/*';
      input.attr('accept', state.accept);
      node.attr('data-accept', state.accept);
      return api;
    };

    api.shape = (value) => {
      if (value === undefined) {
        return state.shape;
      }

      state.shape = value === 'square' ? 'square' : 'circle';
      node.attr('data-shape', state.shape);
      syncPreviewSize();
      return api;
    };

    api.size = (value) => {
      if (value === undefined) {
        return state.size;
      }

      state.size = Math.max(32, Number(value) || 96);
      node.attr('data-size', String(state.size));
      syncPreviewSize();
      return api;
    };

    api.disabled = (value) => {
      if (value === undefined) {
        return state.disabled;
      }

      state.disabled = Boolean(value);
      node.attr('data-disabled', state.disabled ? 'true' : null);
      preview.attr('aria-disabled', state.disabled ? 'true' : null);
      preview.attr('tabindex', state.disabled ? '-1' : '0');
      input.attr('disabled', state.disabled ? true : null);
      sync();
      return api;
    };

    api.value = (value) => {
      if (value === undefined) {
        return state.value;
      }

      state.value = value instanceof File ? value : null;
      sync();
      emitChange();
      return api;
    };

    api.files = (value) => {
      if (value === undefined) {
        return state.value ? [state.value] : [];
      }

      const next = Array.isArray(value) ? value[0] : value;

      return api.value(next);
    };

    api.items = (value) => api.files(value);

    api.addFiles = (fileList) => {
      addFiles(fileList);
      return api;
    };

    api.remove = () => {
      if (state.value) {
        api.value(null);
      }
      return api;
    };

    api.clear = () => api.remove();

    /** 字符串 / 数字 = 根内容（旧 `_setupAvatarUpload` 的兜底分支）。 */
    api.setupString = (setup) => {
      self.node().child(setup);
      return api;
    };

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupAvatarUpload` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { accept, disabled, files, name, shape, size, value, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }

      if (name !== undefined) {
        api.name(name);
      }
      if (accept !== undefined) {
        api.accept(accept);
      }
      if (shape !== undefined) {
        api.shape(shape);
      }
      if (size !== undefined) {
        api.size(size);
      }
      if (disabled !== undefined) {
        api.disabled(disabled);
      }

      const initialValue = value ?? files?.[0];
      if (initialValue !== undefined) {
        api.value(initialValue);
      }

      return api;
    };

    // 旧 `destroy()` 猴补的等价物：释放 object URL
    api.whenDestroy = () => {
      releaseObjectUrl();
    };

    sync();
    return node;
  });
}

export const vAvatarUpload = createComponentShortcut(VAvatarUpload);

registerChildFactories(HtmlElementNode, { vAvatarUpload });
