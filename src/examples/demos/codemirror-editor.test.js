import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  FakeEditorView,
  editorViewInstances
} = vi.hoisted(() => {
  const editorViewInstances = [];

  class FakeEditorView {
    constructor(config) {
      this.config = config;
      this.documentValue = 'const answer = 42;';
      this.state = {
        doc: { length: 100, toString: () => this.documentValue }
      };
      this.dispatch = vi.fn((change) => {
        this.documentValue = change.changes.insert;
      });
      editorViewInstances.push(this);
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return { FakeEditorView, editorViewInstances };
});

vi.mock('codemirror', () => ({
  EditorView: FakeEditorView,
  basicSetup: {}
}));
vi.mock('@codemirror/lang-javascript', () => ({
  javascript: vi.fn(() => ({}))
}));

import { CodeMirrorExample } from './codemirror-editor.js';

/** 集成在 `whenMount` 里初始化：先落地再断言（挂到 body，销毁时一并摘掉）。 */
function mountDemo(demo) {
  demo.bindTo(document.body);
  return document.body.lastElementChild;
}

describe('CodeMirror 6 interop demo', () => {
  beforeEach(() => {
    editorViewInstances.length = 0;
    vi.clearAllMocks();
  });

  it('does not create the editor view before the host lands', () => {
    const demo = CodeMirrorExample();

    demo.renderDom();

    expect(editorViewInstances).toHaveLength(0);
    demo.destroy();
  });

  it('creates the editor view with the document and extensions', () => {
    const demo = CodeMirrorExample('const greeting = "hi";');
    const el = mountDemo(demo);

    expect(el.dataset.codemirrorHost).toBe('true');
    expect(editorViewInstances).toHaveLength(1);
    expect(editorViewInstances[0].config.parent).toBe(el);
    expect(editorViewInstances[0].config.doc).toBe('const greeting = "hi";');
    expect(editorViewInstances[0].config.extensions.length).toBeGreaterThan(1);
    demo.destroy();
  });

  it('exposes and replaces the document value', () => {
    const demo = CodeMirrorExample();
    mountDemo(demo);

    demo.setValue('export const mode = "prod";');

    expect(editorViewInstances[0].dispatch).toHaveBeenCalledOnce();
    expect(demo.value()).toBe('export const mode = "prod";');
    demo.destroy();
  });

  it('does not create a second EditorView on repeated renderDom', () => {
    const demo = CodeMirrorExample();
    mountDemo(demo);

    demo.renderDom();
    demo.renderDom();

    expect(editorViewInstances).toHaveLength(1);
    demo.destroy();
  });

  it('destroys the editor view on destroy', () => {
    const demo = CodeMirrorExample();
    const el = mountDemo(demo);

    demo.destroy();

    expect(editorViewInstances[0].destroyed).toBe(true);
    expect(document.body.contains(el)).toBe(false);
    expect(demo.value()).toBe('');
  });
});
