import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@toast-ui/editor/viewer', () => ({ default: FakeViewer }));

import { MarkdownViewerExample } from './markdown-viewer.js';

describe('Toast UI Viewer interop demo', () => {
  beforeEach(() => {
    viewerInstances.length = 0;
    vi.clearAllMocks();
  });

  it('mounts the viewer with initial markdown on the container', () => {
    const demo = MarkdownViewerExample('# 标题');
    const el = demo.render().renderDom();

    expect(el.dataset.markdownViewerHost).toBe('true');
    expect(viewerInstances).toHaveLength(1);
    expect(viewerInstances[0].config.el).toBe(el);
    expect(viewerInstances[0].config.initialValue).toBe('# 标题');
    el.remove();
  });

  it('switches the markdown content through setMarkdown', () => {
    const demo = MarkdownViewerExample();
    const el = demo.render().renderDom();

    demo.setMarkdown('## 第二篇');

    expect(viewerInstances[0].setMarkdown).toHaveBeenCalledWith('## 第二篇');
    el.remove();
  });

  it('does not create a second viewer on repeated renderDom', () => {
    const demo = MarkdownViewerExample();
    const node = demo.render();

    node.renderDom();
    node.renderDom();

    expect(viewerInstances).toHaveLength(1);
  });

  it('cleans up the viewer instance on destroy', () => {
    const demo = MarkdownViewerExample();
    const el = demo.render().renderDom();
    document.body.appendChild(el);

    demo.destroy();

    expect(viewerInstances[0].destroyed).toBe(true);
    expect(document.body.contains(el)).toBe(false);
    expect(() => demo.setMarkdown('# 新文档')).not.toThrow();
  });
});
