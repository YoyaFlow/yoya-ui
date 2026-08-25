import { describe, expect, it } from 'vitest';
import { VAvatarUpload, div, vAvatarUpload, vForm } from '../index.js';

function createImageFile(name = 'avatar.png', type = 'image/png') {
  return new File(['image'], name, { type });
}

function findAvatarUpload(node) {
  if (node instanceof VAvatarUpload) {
    return node;
  }

  for (const child of node.children()) {
    const found = findAvatarUpload(child);
    if (found) {
      return found;
    }
  }

  return null;
}

describe('vAvatarUpload', () => {
  it('renders a preview area and hidden file input', () => {
    const upload = vAvatarUpload();
    const element = upload.renderDom();

    expect(upload).toBeInstanceOf(VAvatarUpload);
    expect(element.querySelector('input[type="file"]').style.display).toBe('none');
    expect(element.querySelector('.yoya-vavatar-upload-preview')).not.toBeNull();
    expect(element.querySelector('.yoya-vavatar-upload-hint').textContent).toBe('点击上传头像');
  });

  it('sets, reads, and removes an avatar file', () => {
    const upload = vAvatarUpload();
    const element = upload.renderDom();
    const file = createImageFile();

    upload.value(file);
    expect(upload.value()).toBe(file);
    expect(upload.files()).toEqual([file]);
    expect(upload.items()[0]).toBe(file);
    expect(element.querySelector('.yoya-vavatar-upload-image')).not.toBeNull();

    upload.remove();
    expect(upload.value()).toBeNull();
    expect(upload.files()).toEqual([]);
    expect(element.querySelector('.yoya-vavatar-upload-hint').textContent).toBe('点击上传头像');
  });

  it('applies accept, disabled, shape, and size behavior', () => {
    const upload = vAvatarUpload({ accept: '.png', shape: 'square', size: 120 });

    expect(upload.accept()).toBe('.png');
    expect(upload.shape()).toBe('square');
    expect(upload.size()).toBe(120);

    upload.addFiles([createImageFile('skip.jpg', 'image/jpeg'), createImageFile('keep.png')]);
    expect(upload.value().name).toBe('keep.png');

    upload.disabled(true);
    upload.addFiles([createImageFile('blocked.png')]);
    expect(upload.value().name).toBe('keep.png');
    expect(upload.disabled()).toBe(true);
  });

  it('registers vAvatarUpload as a parent shortcut', () => {
    const page = div((root) => {
      root.vAvatarUpload({ shape: 'square' });
    });
    const upload = page.children()[0];

    expect(upload).toBeInstanceOf(VAvatarUpload);
    expect(upload.shape()).toBe('square');
  });

  it('collects the avatar file through vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('头像').name('avatar');
        item.control((editor) => editor.vAvatarUpload());
      });
    });
    form.renderDom();
    const upload = findAvatarUpload(form);
    const file = createImageFile();

    upload.value(file);

    expect(form.values().avatar).toBe(file);
  });
});
