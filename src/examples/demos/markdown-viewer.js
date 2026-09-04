import { HtmlElementNode } from '../../index.js';
import Viewer from '@toast-ui/editor/viewer';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';

const DEFAULT_MARKDOWN = [
  '## Markdown 查看',
  '',
  'yoya-ui 直接操作真实 DOM，因此任何能挂载到 DOM 节点的库都可以无缝嵌入：',
  '',
  '- 富文本：Quill',
  '- 数据表格：AG Grid Community',
  '- 地图：Leaflet',
  '- 代码编辑：CodeMirror 6',
  '',
  '```js',
  'const glue = "real DOM first";',
  '```'
].join('\n');

export class MarkdownViewerDemoNode extends HtmlElementNode {
  constructor(markdown = DEFAULT_MARKDOWN) {
    super('div', null);
    this._markdown = markdown;
    this._viewer = null;
    this.attr('data-markdown-viewer-host', 'true');
    this.className('yoya-example-markdown-viewer');
  }

  renderDom() {
    const element = super.renderDom();
    this._viewer = new Viewer({
      el: element,
      initialValue: this._markdown
    });
    return element;
  }

  setMarkdown(markdown) {
    this._viewer?.setMarkdown(markdown);
  }

  destroy() {
    if (this._viewer) {
      this._viewer.destroy();
      this._viewer = null;
    }
    return super.destroy();
  }
}

export function MarkdownViewerExample(markdown = DEFAULT_MARKDOWN) {
  let node = null;

  return {
    render() {
      node = new MarkdownViewerDemoNode(markdown);
      return node;
    },
    setMarkdown(next) {
      node?.setMarkdown(next);
    },
    destroy() {
      node?.destroy();
      node = null;
    }
  };
}
