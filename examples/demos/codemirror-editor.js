import { div, vNode } from '@yoyaflow/yoya-ui';
import { Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { isDarkMode, watchDocsTheme } from './docs-theme.js';

const INITIAL_DOC = [
  '// 配置片段：yoya-ui + CodeMirror 6',
  'export function createPage(requestState) {',
  "  return div((page) => page.p('Hello CodeMirror'));",
  '}'
].join('\n');

/**
 * CodeMirror 6 胶水组件（形态 B，照 `VBadge` 的写法规格）：结构纯声明，编辑器实例与主题观察器
 * 都是闭包状态，生命周期挂 `whenMount` / `whenDestroy`，宿主元素从钩子上下文现取。
 */
export function vCodeMirror(doc = INITIAL_DOC) {
  return vNode((api) => {
    const editor = { host: null, stopTheme: null, theme: new Compartment(), view: null };

    const applyTheme = () => {
      editor.view?.dispatch({
        effects: editor.theme.reconfigure(isDarkMode() ? oneDark : [])
      });
    };

    api.value = () => (editor.view ? editor.view.state.doc.toString() : '');
    api.setValue = (next) => {
      editor.view?.dispatch({
        changes: { from: 0, insert: next, to: editor.view.state.doc.length }
      });
      return api;
    };
    api.whenMount = (host) => {
      editor.host = host?.element?.() ?? null;
      editor.view ??= new EditorView({
        doc,
        extensions: [basicSetup, javascript(), editor.theme.of(isDarkMode() ? oneDark : [])],
        parent: editor.host
      });
      editor.stopTheme ??= watchDocsTheme(applyTheme);
    };
    api.whenDestroy = () => {
      editor.stopTheme?.();
      editor.stopTheme = null;
      editor.view?.destroy();
      editor.view = null;
      editor.host = null;
    };

    return div({ 'data-codemirror-host': 'true' });
  });
}

export function CodeMirrorExample(doc = INITIAL_DOC) {
  const editor = vCodeMirror(doc);

  return vNode((api) => {
    api.value = () => editor.value();
    api.setValue = (next) => editor.setValue(next);

    return editor;
  });
}
