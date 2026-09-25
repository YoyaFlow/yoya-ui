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

/** 集成在 `whenMount` 里初始化：先落地再断言（挂到 body，销毁时一并摘掉）。 */
function mountDemo(demo) {
  demo.bindTo(document.body);
  return document.body.lastElementChild;
}

describe('Quill editor interop demo', () => {
  beforeEach(() => {
    quillInstances.length = 0;
  });

  it('does not create the editor before the host lands', () => {
    const demo = QuillEditorExample();

    demo.renderDom();

    expect(quillInstances).toHaveLength(0);
    demo.destroy();
  });

  it('mounts Quill on the rendered container with a rich toolbar', () => {
    const demo = QuillEditorExample();
    const el = mountDemo(demo);
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
    demo.destroy();
  });

  it('exposes html and text from the editor instance', () => {
    const demo = QuillEditorExample();
    mountDemo(demo);
    quillInstances[0].htmlValue = '<p>updated</p>';
    quillInstances[0].textValue = 'updated';

    expect(demo.html()).toBe('<p>updated</p>');
    expect(demo.text()).toBe('updated');
    demo.destroy();
  });

  it('does not re-initialize Quill when renderDom runs again', () => {
    const demo = QuillEditorExample();
    mountDemo(demo);

    demo.renderDom();
    demo.renderDom();

    expect(quillInstances).toHaveLength(1);
    demo.destroy();
  });

  it('adds the standalone quill-dark class when the docs mode is dark', () => {
    const root = document.documentElement;
    root.dataset.yoyaMode = 'dark';
    const demo = QuillEditorExample();
    const el = mountDemo(demo);

    try {
      expect(el.classList.contains('quill-dark')).toBe(true);
      expect(el.style.borderRadius).toBe('10px');
    } finally {
      demo.destroy();
      delete root.dataset.yoyaMode;
    }
  });

  it('clears the editor reference after destroy', () => {
    const demo = QuillEditorExample();
    const el = mountDemo(demo);

    demo.destroy();

    expect(quillInstances[0].destroyed).toBe(true);
    expect(document.body.contains(el)).toBe(false);
    expect(demo.html()).toBe('');
    expect(demo.text()).toBe('');
  });
});
