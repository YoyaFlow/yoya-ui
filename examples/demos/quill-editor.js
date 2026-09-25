import { div, vNode } from '../../src/index.js';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import '../quill-dark.css';
import { isDarkMode, watchDocsTheme } from './docs-theme.js';

const TOOLBAR = [
  [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['blockquote', 'code-block', 'link', 'image', 'video', 'formula', 'clean']
];

/**
 * Quill 胶水组件（形态 B，照 `VBadge` 的写法规格）：外壳与编辑区都写在结构里，Quill 实例
 * 挂在闭包里，初始化 / 清理走 `whenMount` / `whenDestroy`。
 */
export function vQuillEditor(content = '') {
  return vNode((api) => {
    const editor = { host: null, instance: null, stopTheme: null };

    const applyTheme = () => editor.host?.classList.toggle('quill-dark', isDarkMode());

    api.html = () => (editor.instance ? editor.instance.getSemanticHTML() : '');
    api.text = () => (editor.instance ? editor.instance.getText() : '');
    api.whenMount = (host) => {
      editor.host = host?.element?.() ?? null;

      const box = editor.host?.querySelector('[data-quill-editor]');
      if (!box || editor.instance) {
        return;
      }

      if (content) {
        box.innerHTML = content;
      }

      editor.instance = new Quill(box, {
        modules: { toolbar: TOOLBAR },
        placeholder: '写点什么，或粘贴一段内容……',
        theme: 'snow'
      });
      applyTheme();
      editor.stopTheme ??= watchDocsTheme(applyTheme);
    };
    api.whenDestroy = () => {
      editor.stopTheme?.();
      editor.stopTheme = null;
      editor.instance?.destroy?.();
      editor.instance = null;
      editor.host = null;
    };

    return div(
      {
        'data-quill-host': 'true',
        style: {
          border: '1px solid rgba(128, 128, 128, 0.35)',
          borderRadius: '10px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          width: '100%'
        }
      },
      (root) =>
        root.child(
          div({ 'data-quill-editor': 'true', style: { height: '280px' } })
        )
    );
  });
}

export function QuillEditorExample(content = '') {
  const editor = vQuillEditor(content);

  return vNode((api) => {
    api.html = () => editor.html();
    api.text = () => editor.text();

    return editor;
  });
}
