import { HtmlElementNode } from '../../index.js';
import Editor from '@toast-ui/editor';
import Viewer from '@toast-ui/editor/viewer';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/toastui-editor-viewer.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';

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

export class MarkdownViewerDemoNode extends HtmlElementNode {
  constructor(markdown = DEFAULT_MARKDOWN) {
    super('div', null);
    this._divider = null;
    this._editor = null;
    this._editorHost = null;
    this._markdown = markdown;
    this._mode = 'edit';
    this._onMediaChange = null;
    this._ratio = 0.5;
    this._ready = false;
    this._themeObserver = null;
    this._viewer = null;
    this._viewerHost = null;
    this.attr('data-markdown-viewer-host', 'true');
    this.styles({
      border: '1px solid rgba(128, 128, 128, 0.35)',
      borderRadius: '10px',
      boxSizing: 'border-box',
      display: 'flex',
      gap: '0',
      minHeight: '440px',
      overflow: 'hidden',
      padding: '12px',
      width: '100%'
    });
  }

  renderDom() {
    const element = super.renderDom();
    if (this._ready) {
      return element;
    }

    const theme = isDarkMode() ? 'dark' : 'light';
    this._editorHost = document.createElement('div');
    this._editorHost.style.flex = '1 1 50%';
    this._editorHost.style.minWidth = '0';
    this._editorHost.style.overflow = 'hidden';
    this._viewerHost = document.createElement('div');
    this._viewerHost.style.flex = '1 1 50%';
    this._viewerHost.style.minWidth = '0';
    this._viewerHost.style.overflow = 'hidden';
    this._divider = document.createElement('div');
    this._divider.style.background = 'rgba(128, 128, 128, 0.2)';
    this._divider.style.borderRadius = '3px';
    this._divider.style.cursor = 'col-resize';
    this._divider.style.flex = '0 0 10px';
    this._divider.style.touchAction = 'none';
    element.append(this._editorHost, this._divider, this._viewerHost);
    this._bindDivider();

    this._editor = new Editor({
      el: this._editorHost,
      height: '410px',
      hideModeSwitch: true,
      initialEditType: 'markdown',
      initialValue: this._markdown,
      previewStyle: 'tab',
      toolbarItems: [
        ['heading', 'bold', 'italic', 'strike'],
        ['ul', 'ol', 'quote', 'code', 'codeblock']
      ],
      theme,
      usageStatistics: false
    });
    const tabBar = this._editorHost.querySelector('.toastui-editor-md-tab-container');
    if (tabBar) {
      tabBar.style.display = 'none';
    }
    this._viewer = new Viewer({
      el: this._viewerHost,
      initialValue: this._markdown,
      theme
    });
    this._editor.on('change', () => {
      this._markdown = this._editor.getMarkdown();
      this._viewer.setMarkdown(this._markdown);
    });

    this._applyTheme();
    this._layout();
    this._watchTheme();
    this._ready = true;
    return element;
  }

  _layout() {
    if (!this._editorHost || !this._viewerHost) {
      return;
    }
    const split = this._mode === 'edit';
    this._editorHost.style.display = split ? 'block' : 'none';
    this._editorHost.style.flex = split ? `${this._ratio} 1 0%` : '0 1 0%';
    this._divider.style.display = split ? 'block' : 'none';
    this._viewerHost.style.display = 'block';
    this._viewerHost.style.flex = split
      ? `${1 - this._ratio} 1 0%`
      : '1 1 100%';
  }

  _bindDivider() {
    const divider = this._divider;

    divider.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      divider.setPointerCapture?.(event.pointerId);
      this._el.style.cursor = 'col-resize';
      this._el.style.userSelect = 'none';

      const onMove = (moveEvent) => {
        if (!divider.hasPointerCapture?.(moveEvent.pointerId)) {
          return;
        }
        const rect = this._el.getBoundingClientRect();
        const usable = rect.width - 24 - 10;
        const next = (moveEvent.clientX - rect.left - 12) / usable;
        this._ratio = Math.min(0.75, Math.max(0.25, next));
        this._layout();
      };
      const onUp = () => {
        divider.removeEventListener('pointermove', onMove);
        divider.removeEventListener('pointerup', onUp);
        divider.removeEventListener('pointercancel', onUp);
        this._el.style.cursor = '';
        this._el.style.userSelect = '';
      };
      divider.addEventListener('pointermove', onMove);
      divider.addEventListener('pointerup', onUp);
      divider.addEventListener('pointercancel', onUp);
    });
  }

  setMode(mode) {
    if (mode !== 'edit' && mode !== 'view') {
      return;
    }
    this._mode = mode;
    this._layout();
  }

  mode() {
    return this._mode;
  }

  _applyTheme() {
    if (!this._editorHost || !this._viewerHost) {
      return;
    }
    const dark = isDarkMode();
    this._editorHost.classList.toggle('toastui-editor-dark', dark);
    this._viewerHost.classList.toggle('toastui-editor-dark', dark);
    const editorUi = this._editorHost.querySelector('.toastui-editor-defaultUI');
    if (editorUi) {
      editorUi.classList.toggle('toastui-editor-dark', dark);
    }
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
      this._editor.destroy();
      this._editor = null;
    }
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
    setMode(mode) {
      node?.setMode(mode);
    },
    mode() {
      return node ? node.mode() : 'edit';
    },
    destroy() {
      node?.destroy();
      node = null;
    }
  };
}
