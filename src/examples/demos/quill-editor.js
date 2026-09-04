import { HtmlElementNode } from '../../index.js';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

export class QuillEditorNode extends HtmlElementNode {
  constructor(content = '') {
    super('div', null);
    this._content = content;
    this._editor = null;
    this.attr('data-quill-host', 'true');
    this.styles({ background: '#fff', height: '240px' });
  }

  renderDom() {
    const element = super.renderDom();
    if (this._content) {
      element.innerHTML = this._content;
    }
    this._editor = new Quill(element, {
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
