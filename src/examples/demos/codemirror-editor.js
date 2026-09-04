import { HtmlElementNode } from '../../index.js';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';

const INITIAL_DOC = [
  '// 配置片段：yoya-ui + CodeMirror 6',
  'export function createPage(requestState) {',
  "  return div((page) => page.p('Hello CodeMirror'));",
  '}'
].join('\n');

export class CodeMirrorDemoNode extends HtmlElementNode {
  constructor(doc = INITIAL_DOC) {
    super('div', null);
    this._doc = doc;
    this._view = null;
    this.attr('data-codemirror-host', 'true');
    this.styles({ border: '1px solid var(--yoya-color-border, #d8dee6)' });
  }

  renderDom() {
    const element = super.renderDom();
    if (this._view) {
      return element;
    }
    this._view = new EditorView({
      doc: this._doc,
      extensions: [basicSetup, javascript()],
      parent: element
    });
    return element;
  }

  value() {
    return this._view ? this._view.state.doc.toString() : '';
  }

  setValue(doc) {
    if (!this._view) {
      return;
    }
    this._view.dispatch({
      changes: { from: 0, insert: doc, to: this._view.state.doc.length }
    });
  }

  destroy() {
    if (this._view) {
      this._view.destroy();
      this._view = null;
    }
    return super.destroy();
  }
}

export function CodeMirrorExample(doc = INITIAL_DOC) {
  let node = null;

  return {
    render() {
      node = new CodeMirrorDemoNode(doc);
      return node;
    },
    setValue(next) {
      node?.setValue(next);
    },
    value() {
      return node ? node.value() : '';
    },
    destroy() {
      node?.destroy();
      node = null;
    }
  };
}
