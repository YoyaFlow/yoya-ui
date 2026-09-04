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

  it('mounts Quill on the rendered container', () => {
    const demo = QuillEditorExample();
    const el = demo.render().renderDom();

    expect(el.dataset.quillHost).toBe('true');
    expect(el.tagName).toBe('DIV');
    expect(quillInstances).toHaveLength(1);
    expect(quillInstances[0].root).toBe(el);
    expect(quillInstances[0].options.theme).toBe('snow');
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
