import { describe, expect, it, vi } from 'vitest';
import { VUpload, div, vForm, vUpload } from '../index.js';

function createFile(name = 'a.txt', type = 'text/plain') {
  return new File(['content'], name, { type });
}

function findUpload(node) {
  if (node instanceof VUpload) {
    return node;
  }

  for (const child of node.children()) {
    const found = findUpload(child);
    if (found) {
      return found;
    }
  }

  return null;
}

describe('vUpload', () => {
  it('renders a hidden file input and a clickable dropzone', () => {
    const upload = vUpload();
    const element = upload.renderDom();

    expect(upload).toBeInstanceOf(VUpload);
    expect(element.querySelector('input[type="file"]').style.display).toBe('none');
    expect(element.querySelector('.yoya-vupload-dropzone')).not.toBeNull();
    expect(element.querySelector('.yoya-vupload-dropzone-title').textContent).toContain(
      '点击或拖拽文件'
    );
  });

  it('adds, removes, and updates file entries', () => {
    const changed = vi.fn();
    const upload = vUpload({
      files: [createFile('a.txt'), createFile('b.png', 'image/png')],
      multiple: true
    });
    upload.on('change', changed);
    const element = upload.renderDom();

    expect(upload.files()).toHaveLength(2);
    expect(upload.items()[0].name).toBe('a.txt');
    expect(element.querySelectorAll('.yoya-vupload-item')).toHaveLength(2);

    upload.remove(0);
    expect(upload.files()).toHaveLength(1);
    expect(changed).toHaveBeenCalledTimes(1);

    upload.progress(0, 40);
    upload.status(0, 'uploading');
    expect(upload.progress(0)).toBe(40);
    expect(upload.status(0)).toBe('uploading');
    expect(element.querySelector('.yoya-vupload-progress-bar').style.width).toBe('40%');
  });

  it('applies accept, multiple, and disabled behavior', () => {
    const upload = vUpload({ accept: '.txt', multiple: false });

    upload.addFiles([createFile('keep.txt'), createFile('skip.png', 'image/png')]);
    expect(upload.files()).toHaveLength(1);
    expect(upload.files()[0].name).toBe('keep.txt');

    upload.multiple(true);
    upload.disabled(true);
    upload.addFiles([createFile('blocked.txt')]);
    expect(upload.files()).toHaveLength(1);
  });

  it('accepts files from a drop event', () => {
    const upload = vUpload();
    const element = upload.renderDom();
    const dropZone = element.querySelector('.yoya-vupload-dropzone');
    const event = new Event('drop', { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'dataTransfer', {
      value: { files: [createFile('dropped.txt')] }
    });
    dropZone.dispatchEvent(event);

    expect(upload.files()).toHaveLength(1);
    expect(upload.files()[0].name).toBe('dropped.txt');
  });

  it('registers vUpload as a parent shortcut', () => {
    const page = div((root) => {
      root.vUpload({ multiple: true });
    });
    const upload = page.children()[0];

    expect(upload).toBeInstanceOf(VUpload);
    expect(upload.multiple()).toBe(true);
  });

  it('collects files through vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('附件').name('attachments');
        item.control((editor) => editor.vUpload({ multiple: true }));
      });
    });
    form.renderDom();
    const upload = findUpload(form);

    expect(upload).toBeInstanceOf(VUpload);
    upload.addFiles([createFile('a.txt'), createFile('b.png', 'image/png')]);

    expect(form.values().attachments).toHaveLength(2);
    expect(form.values().attachments[0].name).toBe('a.txt');
  });
});
