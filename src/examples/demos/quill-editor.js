import { HtmlElementNode, div } from '../../index.js';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import '../quill-dark.css';

function isDarkMode() {
  if (typeof document === 'undefined') {
    return false;
  }
  const mode = document.documentElement?.dataset.yoyaMode;
  if (mode === 'dark') {
    return true;
  }
  if (mode === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

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

export class QuillEditorNode extends HtmlElementNode {
  constructor(content = '') {
    super('div', null);
    this._content = content;
    this._editor = null;
    this._editorContainer = div();
    this._editorContainer.attr('data-quill-editor', 'true');
    this._editorContainer.styles({ height: '280px' });
    this._onMediaChange = null;
    this._ready = false;
    this._themeObserver = null;
    this.attr('data-quill-host', 'true');
    this.styles({
      border: '1px solid rgba(128, 128, 128, 0.35)',
      borderRadius: '10px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      width: '100%'
    });
    this.child(this._editorContainer);
  }

  renderDom() {
    const element = super.renderDom();
    if (this._ready) {
      return element;
    }
    const editorElement = this._editorContainer.renderDom();
    if (this._content) {
      editorElement.innerHTML = this._content;
    }
    this._editor = new Quill(editorElement, {
      modules: { toolbar: TOOLBAR },
      placeholder: '写点什么，或粘贴一段内容……',
      theme: 'snow'
    });
    this._applyTheme();
    this._watchTheme();
    this._ready = true;
    return element;
  }

  _applyTheme() {
    if (!this._el) {
      return;
    }
    this._el.classList.toggle('quill-dark', isDarkMode());
  }

  _watchTheme() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }
    if (!this._themeObserver) {
      this._themeObserver = new MutationObserver(() => this._applyTheme());
      this._themeObserver.observe(document.documentElement, {
        attributeFilter: ['data-yoya-mode'],
        attributes: true
      });
    }
    if (
      !this._onMediaChange &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      this._onMediaChange = () => this._applyTheme();
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener?.('change', this._onMediaChange);
    }
  }

  html() {
    return this._editor ? this._editor.getSemanticHTML() : '';
  }

  text() {
    return this._editor ? this._editor.getText() : '';
  }

  destroy() {
    this._themeObserver?.disconnect();
    this._themeObserver = null;
    if (typeof window !== 'undefined' && this._onMediaChange) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeEventListener?.('change', this._onMediaChange);
      this._onMediaChange = null;
    }
    if (this._editor) {
      this._editor.destroy?.();
      this._editor = null;
    }
    return super.destroy();
  }
}

export function QuillEditorExample(content = '') {
  let node = null;

  return {
    render() {
      node = new QuillEditorNode(content);
      return node;
    },
    html() {
      return node ? node.html() : '';
    },
    text() {
      return node ? node.text() : '';
    },
    destroy() {
      node?.destroy();
      node = null;
    }
  };
}
