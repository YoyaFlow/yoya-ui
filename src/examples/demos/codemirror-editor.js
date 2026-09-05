import { HtmlElementNode } from '../../index.js';
import { Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';

const INITIAL_DOC = [
  '// 配置片段：yoya-ui + CodeMirror 6',
  'export function createPage(requestState) {',
  "  return div((page) => page.p('Hello CodeMirror'));",
  '}'
].join('\n');

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

export class CodeMirrorDemoNode extends HtmlElementNode {
  constructor(doc = INITIAL_DOC) {
    super('div', null);
    this._onMediaChange = null;
    this._doc = doc;
    this._themeCompartment = new Compartment();
    this._themeObserver = null;
    this._view = null;
    this.attr('data-codemirror-host', 'true');
  }

  renderDom() {
    const element = super.renderDom();
    if (this._view) {
      return element;
    }
    this._view = new EditorView({
      doc: this._doc,
      extensions: [
        basicSetup,
        javascript(),
        this._themeCompartment.of(isDarkMode() ? oneDark : [])
      ],
      parent: element
    });
    this._watchTheme();
    return element;
  }

  _applyTheme() {
    if (!this._view) {
      return;
    }
    this._view.dispatch({
      effects: this._themeCompartment.reconfigure(isDarkMode() ? oneDark : [])
    });
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
    this._themeObserver?.disconnect();
    this._themeObserver = null;
    if (typeof window !== 'undefined' && this._onMediaChange) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeEventListener?.('change', this._onMediaChange);
      this._onMediaChange = null;
    }
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
