import { beforeEach, describe, expect, it, vi } from 'vitest';

const { FakeQuill, quillInstances } = vi.hoisted(() => {
  const quillInstances = [];

  class FakeQuill {
    constructor(root, options) {
      this.root = root;
      this.options = options;
      this.htmlValue = '<p>hello yoya-ui</p>';
      this.textValue = 'hello yoya-ui';
      quillInstances.push(this);
    }

    getSemanticHTML() {
      return this.htmlValue;
    }

    getText() {
      return this.textValue;
    }

    destroy() {
      this.destroyed = true;
      this.root = null;
    }
  }

  return { FakeQuill, quillInstances };
});

vi.mock('quill', () => ({ default: FakeQuill }));

import { QuillEditorExample } from './quill-editor.js';

describe('Quill editor interop demo', () => {
  beforeEach(() => {
    quillInstances.length = 0;
  });

  it('mounts Quill on the rendered container with a rich toolbar', () => {
    const demo = QuillEditorExample();
    const el = demo.render().renderDom();
    const editorEl = el.querySelector('[data-quill-editor]');
    const toolbar = quillInstances[0].options.modules.toolbar;
    const flat = toolbar.flat(Infinity).map((item) =>
      typeof item === 'string' ? item : JSON.stringify(item)
    );

    expect(el.dataset.quillHost).toBe('true');
    expect(quillInstances[0].root).toBe(editorEl);
    expect(quillInstances[0].options.theme).toBe('snow');
    expect(flat.some((item) => item.includes('color'))).toBe(true);
    expect(flat.some((item) => item.includes('background'))).toBe(true);
    expect(flat).toContain('strike');
    expect(flat).toContain('code-block');
    expect(flat).toContain('image');
    expect(flat.some((item) => item.includes('align'))).toBe(true);
    expect(flat.some((item) => item.includes('indent'))).toBe(true);
    el.remove();
  });

  it('exposes html and text from the editor instance', () => {
    const demo = QuillEditorExample();
    const el = demo.render().renderDom();
    quillInstances[0].htmlValue = '<p>updated</p>';
    quillInstances[0].textValue = 'updated';

    expect(demo.html()).toBe('<p>updated</p>');
    expect(demo.text()).toBe('updated');
    el.remove();
  });

  it('does not re-initialize Quill when renderDom runs again', () => {
    const demo = QuillEditorExample();
    const node = demo.render();

    node.renderDom();
    node.renderDom();

    expect(quillInstances).toHaveLength(1);
  });

  it('adds the standalone quill-dark class when the docs mode is dark', () => {
    const root = document.documentElement;
    root.dataset.yoyaMode = 'dark';
    const demo = QuillEditorExample();
    const el = demo.render().renderDom();

    try {
      expect(el.classList.contains('quill-dark')).toBe(true);
      expect(el.style.borderRadius).toBe('10px');
    } finally {
      demo.destroy();
      delete root.dataset.yoyaMode;
      el.remove();
    }
  });

  it('clears the editor reference after destroy', () => {
    const demo = QuillEditorExample();
    const el = demo.render().renderDom();
    document.body.appendChild(el);

    demo.destroy();

    expect(quillInstances[0].destroyed).toBe(true);
    expect(document.body.contains(el)).toBe(false);
    expect(demo.html()).toBe('');
    expect(demo.text()).toBe('');
  });
});
