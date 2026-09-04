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

describe('CodeMirror 6 interop demo', () => {
  beforeEach(() => {
    editorViewInstances.length = 0;
    vi.clearAllMocks();
  });

  it('creates the editor view with the document and extensions', () => {
    const demo = CodeMirrorExample('const greeting = "hi";');
    const el = demo.render().renderDom();

    expect(el.dataset.codemirrorHost).toBe('true');
    expect(editorViewInstances).toHaveLength(1);
    expect(editorViewInstances[0].config.parent).toBe(el);
    expect(editorViewInstances[0].config.doc).toBe('const greeting = "hi";');
    expect(editorViewInstances[0].config.extensions.length).toBeGreaterThan(1);
    el.remove();
  });

  it('exposes and replaces the document value', () => {
    const demo = CodeMirrorExample();
    const el = demo.render().renderDom();

    demo.setValue('export const mode = "prod";');

    expect(editorViewInstances[0].dispatch).toHaveBeenCalledOnce();
    expect(demo.value()).toBe('export const mode = "prod";');
    el.remove();
  });

  it('destroys the editor view on destroy', () => {
    const demo = CodeMirrorExample();
    const el = demo.render().renderDom();
    document.body.appendChild(el);

    demo.destroy();

    expect(editorViewInstances[0].destroyed).toBe(true);
    expect(document.body.contains(el)).toBe(false);
    expect(demo.value()).toBe('');
  });
});
