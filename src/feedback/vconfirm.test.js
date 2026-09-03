import { describe, expect, it } from 'vitest';
import { vConfirm } from '../index.js';

describe('vConfirm', () => {
  it('resolves true and calls onConfirm on confirm click', async () => {
    let confirmed = false;
    const promise = vConfirm({
      title: '删除确认',
      content: '确定删除？',
      onConfirm: () => {
        confirmed = true;
      }
    });
    const dialog = document.querySelector('.yoya-vdialog');
    expect(dialog).toBeTruthy();
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent.includes('确定')
    );
    expect(confirmBtn.closest('.yoya-vstack')?.style.justifyContent).toBe('flex-end');
    confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(promise).resolves.toBe(true);
    expect(confirmed).toBe(true);
    document.body.innerHTML = '';
  });

  it('resolves false and calls onCancel on cancel click', async () => {
    let cancelled = false;
    const promise = vConfirm({
      content: '保存？',
      cancelText: '取消',
      onCancel: () => {
        cancelled = true;
      }
    });
    const dialog = document.querySelector('.yoya-vdialog');
    const cancelBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent.includes('取消')
    );
    cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await expect(promise).resolves.toBe(false);
    expect(cancelled).toBe(true);
    document.body.innerHTML = '';
  });

  it('resolves false on Escape', async () => {
    const promise = vConfirm({ content: '任意键' });
    const dialog = document.querySelector('.yoya-vdialog');
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    await expect(promise).resolves.toBe(false);
    document.body.innerHTML = '';
  });

  it('ignores repeated confirm while an async onConfirm is pending', async () => {
    let release;
    const gate = new Promise((r) => (release = r));
    const promise = vConfirm({
      content: '异步',
      onConfirm: () => gate
    });
    const dialog = document.querySelector('.yoya-vdialog');
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent.includes('确定')
    );
    confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Second click while pending is ignored
    confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    release(true);
    await expect(promise).resolves.toBe(true);
    document.body.innerHTML = '';
  });

  it('does not throw when document is unavailable (SSR guard)', async () => {
    const original = globalThis.document;
    globalThis.document = undefined;
    try {
      await expect(vConfirm({ content: 'x' })).resolves.toBe(false);
    } finally {
      globalThis.document = original;
    }
  });
});
