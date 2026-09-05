import { beforeEach, describe, expect, it, vi } from 'vitest';

const { FakeEditor, editorInstances } = vi.hoisted(() => {
  const editorInstances = [];

  class FakeEditor {
    constructor(config) {
      this.config = config;
      this.markdown = config.initialValue;
      this.changeHandler = null;
      editorInstances.push(this);
    }

    on(name, handler) {
      if (name === 'change') {
        this.changeHandler = handler;
      }
    }

    getMarkdown() {
      return this.markdown;
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return { FakeEditor, editorInstances };
});

const { FakeViewer, viewerInstances } = vi.hoisted(() => {
  const viewerInstances = [];

  class FakeViewer {
    constructor(config) {
      this.config = config;
      this.setMarkdown = vi.fn();
      viewerInstances.push(this);
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return { FakeViewer, viewerInstances };
});

vi.mock('@toast-ui/editor', () => ({ default: FakeEditor }));
vi.mock('@toast-ui/editor/viewer', () => ({ default: FakeViewer }));

import { MarkdownViewerExample } from './markdown-viewer.js';

describe('Toast UI Markdown edit / view demo', () => {
  beforeEach(() => {
    editorInstances.length = 0;
    viewerInstances.length = 0;
    vi.clearAllMocks();
  });

  it('mounts editor and viewer side by side in edit mode', () => {
    const demo = MarkdownViewerExample('# 标题');
    const el = demo.render().renderDom();

    expect(el.dataset.markdownViewerHost).toBe('true');
    expect(editorInstances).toHaveLength(1);
    expect(viewerInstances).toHaveLength(1);
    expect(editorInstances[0].config.initialValue).toBe('# 标题');
    expect(viewerInstances[0].config.initialValue).toBe('# 标题');
    expect(demo.mode()).toBe('edit');
    expect(el.children[0].style.display).toBe('block');
    expect(el.children[1].style.display).toBe('block');
    expect(el.children[2].style.display).toBe('block');
    el.remove();
  });

  it('syncs editor changes into the viewer preview', () => {
    const demo = MarkdownViewerExample();
    const el = demo.render().renderDom();

    editorInstances[0].markdown = '## 更新后的内容';
    editorInstances[0].changeHandler();

    expect(viewerInstances[0].setMarkdown).toHaveBeenCalledWith(
      '## 更新后的内容'
    );
    el.remove();
  });

  it('switches between edit and readonly view modes', () => {
    const demo = MarkdownViewerExample();
    const el = demo.render().renderDom();
    const editorPanel = el.children[0];
    const divider = el.children[1];

    demo.setMode('view');
    expect(demo.mode()).toBe('view');
    expect(editorPanel.style.display).toBe('none');
    expect(divider.style.display).toBe('none');

    demo.setMode('edit');
    expect(demo.mode()).toBe('edit');
    expect(editorPanel.style.display).toBe('block');
    el.remove();
  });

  it('uses the toastui dark theme when the docs mode is dark', () => {
    const root = document.documentElement;
    root.dataset.yoyaMode = 'dark';
    const demo = MarkdownViewerExample();
    const el = demo.render().renderDom();

    try {
      expect(editorInstances[0].config.theme).toBe('dark');
      expect(viewerInstances[0].config.theme).toBe('dark');
      expect(el.children[0].classList.contains('toastui-editor-dark')).toBe(true);
      expect(el.children[2].classList.contains('toastui-editor-dark')).toBe(true);
    } finally {
      demo.destroy();
      delete root.dataset.yoyaMode;
      el.remove();
    }
  });

  it('does not create instances twice on repeated renderDom', () => {
    const demo = MarkdownViewerExample();
    const node = demo.render();

    node.renderDom();
    node.renderDom();

    expect(editorInstances).toHaveLength(1);
    expect(viewerInstances).toHaveLength(1);
  });

  it('destroys editor and viewer instances', () => {
    const demo = MarkdownViewerExample();
    const el = demo.render().renderDom();
    document.body.appendChild(el);

    demo.destroy();

    expect(editorInstances[0].destroyed).toBe(true);
    expect(viewerInstances[0].destroyed).toBe(true);
    expect(document.body.contains(el)).toBe(false);
  });
});
