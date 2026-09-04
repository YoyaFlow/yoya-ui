import { HtmlElementNode, div } from '../../index.js';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

export class QuillEditorNode extends HtmlElementNode {
  constructor(content = '') {
    super('div', null);
    this._content = content;
    this._editor = null;
    this._editorContainer = div();
    this._editorContainer.attr('data-quill-editor', 'true');
    this._editorContainer.styles({ height: '240px' });
    this.attr('data-quill-host', 'true');
    this.child(this._editorContainer);
  }

  renderDom() {
    const element = super.renderDom();
    if (this._editor) {
      return element;
    }
    const editorElement = this._editorContainer.renderDom();
    if (this._content) {
      editorElement.innerHTML = this._content;
    }
    this._editor = new Quill(editorElement, {
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'clean']
        ]
      },
      placeholder: '写点什么，或粘贴一段内容……',
      theme: 'snow'
    });
    return element;
  }

  html() {
    return this._editor ? this._editor.getSemanticHTML() : '';
  }

  text() {
    return this._editor ? this._editor.getText() : '';
  }

  destroy() {
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
