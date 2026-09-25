import { div, ref, vNode } from '../../src/index.js';
import Editor from '@toast-ui/editor';
import Viewer from '@toast-ui/editor/viewer';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';
import '../markdown-viewer-toolbar.css';
import { isDarkMode, watchDocsTheme } from './docs-theme.js';

const DEFAULT_MARKDOWN = [
  '## 实时编辑与查看',
  '',
  '左侧直接编辑 Markdown，右侧同步渲染，切换「查看模式」后只读展示整篇内容。',
  '',
  '- 编辑模式：左侧源码 + 右侧预览',
  '- 查看模式：只读渲染',
  '',
  '```js',
  'const doc = "wysiwyg & markdown";',
  '```'
].join('\n');

const HOST_STYLE = {
  border: '1px solid rgba(128, 128, 128, 0.35)',
  borderRadius: '10px',
  boxSizing: 'border-box',
  display: 'flex',
  gap: '0',
  minHeight: '440px',
  overflow: 'hidden',
  padding: '12px',
  width: '100%'
};

const TOOLBAR_ITEMS = [
  ['heading', 'bold', 'italic', 'strike'],
  ['ul', 'ol', 'quote', 'code', 'codeblock']
];

/**
 * Toast UI Markdown 胶水组件（形态 B，照 `VBadge` 的写法规格）：左编辑 / 分隔条 / 右查看三块
 * 结构一次写清，模式与分割比例是 `ref`（几何走读值绑定），编辑器实例、拖拽监听与主题观察器
 * 都在闭包里，生命周期挂 `whenMount` / `whenDestroy`。
 */
export function vMarkdownViewer(markdown = DEFAULT_MARKDOWN) {
  const mode = ref('edit');
  const ratio = ref(0.5);

  return vNode((api) => {
    const state = {
      divider: null,
      editor: null,
      editorBox: null,
      markdown,
      stopTheme: null,
      viewBox: null,
      viewer: null
    };
    const isSplit = () => mode.value === 'edit';

    const applyTheme = () => {
      const dark = isDarkMode();

      state.editorBox?.classList.toggle('toastui-editor-dark', dark);
      state.viewBox?.classList.toggle('toastui-editor-dark', dark);
      state.editorBox
        ?.querySelector('.toastui-editor-defaultUI')
        ?.classList.toggle('toastui-editor-dark', dark);
    };

    api.mode = () => mode.value;
    api.setMode = (next) => {
      if (next === 'edit' || next === 'view') {
        mode.value = next;
      }

      return api;
    };
    api.whenMount = (host) => {
      const root = host?.element?.() ?? null;

      if (!root || state.editor) {
        return;
      }

      state.editorBox = root.querySelector('[data-md-editor]');
      state.divider = root.querySelector('[data-md-divider]');
      state.viewBox = root.querySelector('[data-md-viewer]');

      const theme = isDarkMode() ? 'dark' : 'light';
      state.editor = new Editor({
        el: state.editorBox,
        height: '410px',
        hideModeSwitch: true,
        initialEditType: 'markdown',
        initialValue: state.markdown,
        previewStyle: 'tab',
        theme,
        toolbarItems: TOOLBAR_ITEMS,
        usageStatistics: false
      });
      // 双栏布局里预览由右侧 Viewer 承担，收起 Toast UI 自带的"编辑 / 预览"页签条
      const tabBar = state.editorBox?.querySelector('.toastui-editor-md-tab-container');
      if (tabBar) {
        tabBar.style.display = 'none';
      }
      state.viewer = new Viewer({
        el: state.viewBox,
        initialValue: state.markdown,
        theme
      });
      state.editor.on('change', () => {
        state.markdown = state.editor.getMarkdown();
        state.viewer.setMarkdown(state.markdown);
      });
      bindDividerDrag(state.divider, root, ratio);
      applyTheme();
      state.stopTheme ??= watchDocsTheme(applyTheme);
    };
    api.whenDestroy = () => {
      state.stopTheme?.();
      state.stopTheme = null;
      state.editor?.destroy();
      state.editor = null;
      state.viewer?.destroy();
      state.viewer = null;
      state.editorBox = null;
      state.viewBox = null;
      state.divider = null;
    };

    return div({ 'data-markdown-viewer-host': 'true', style: HOST_STYLE }, (root) => {
      root.child(
        div({
          'data-md-editor': 'true',
          style: {
            display: () => (isSplit() ? 'block' : 'none'),
            flex: () => (isSplit() ? `${ratio.value} 1 0%` : '0 1 0%'),
            minWidth: '0',
            overflow: 'hidden'
          }
        })
      );
      root.child(
        div({
          'data-md-divider': 'true',
          style: {
            background: 'rgba(128, 128, 128, 0.2)',
            borderRadius: '3px',
            cursor: 'col-resize',
            display: () => (isSplit() ? 'block' : 'none'),
            flex: '0 0 10px',
            touchAction: 'none'
          }
        })
      );
      root.child(
        div({
          'data-md-viewer': 'true',
          style: {
            display: 'block',
            flex: () => (isSplit() ? `${1 - ratio.value} 1 0%` : '1 1 100%'),
            minWidth: '0',
            overflow: 'hidden'
          }
        })
      );
    });
  });
}

/**
 * 分隔条拖拽：容器左右各留 12px 内边距、条宽 10px，比例按可用宽度换算，
 * 钳在 25% ~ 75%（两侧都留得住内容）。比例写 `ref`，几何由面板上的读值绑定跟。
 */
function bindDividerDrag(divider, root, ratio) {
  if (!divider) {
    return;
  }

  divider.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    divider.setPointerCapture?.(event.pointerId);
    root.style.cursor = 'col-resize';
    root.style.userSelect = 'none';

    const onMove = (moveEvent) => {
      if (!divider.hasPointerCapture?.(moveEvent.pointerId)) {
        return;
      }

      const rect = root.getBoundingClientRect();
      const usable = rect.width - 24 - 10;
      const next = (moveEvent.clientX - rect.left - 12) / usable;
      ratio.value = Math.min(0.75, Math.max(0.25, next));
    };
    const onUp = () => {
      divider.removeEventListener('pointermove', onMove);
      divider.removeEventListener('pointerup', onUp);
      divider.removeEventListener('pointercancel', onUp);
      root.style.cursor = '';
      root.style.userSelect = '';
    };

    divider.addEventListener('pointermove', onMove);
    divider.addEventListener('pointerup', onUp);
    divider.addEventListener('pointercancel', onUp);
  });
}

export function MarkdownViewerExample(markdown = DEFAULT_MARKDOWN) {
  const viewer = vMarkdownViewer(markdown);

  return vNode((api) => {
    api.mode = () => viewer.mode();
    api.setMode = (mode) => viewer.setMode(mode);

    return viewer;
  });
}
