import { afterEach, describe, expect, it, vi } from 'vitest';
import { vDialog } from './dialog.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vDialog', () => {
  it('renders content and toggles open state', () => {
    const dialog = vDialog((sheet) => {
      sheet.content((content) => {
        content.text('确认发布');
      });
    });

    const element = dialog.renderDom();

    expect(element.tagName).toBe('DIALOG');
    expect(element.querySelector('.yoya-vdialog-content').textContent).toContain('确认发布');

    dialog.open(true);
    expect(element.hasAttribute('open')).toBe(true);
    expect(element.getAttribute('data-open')).toBe('true');

    dialog.close();
    expect(element.hasAttribute('open')).toBe(false);
    expect(element.getAttribute('data-open')).toBe(null);
  });

  it('opens after an initially closed render without keeping display none', () => {
    const dialog = vDialog({ open: false });
    const element = dialog.renderDom();
    let opened = false;

    document.body.appendChild(element);
    element.showModal = () => {
      opened = true;
      element.setAttribute('open', '');
    };

    dialog.open(true);

    expect(opened).toBe(true);
    expect(element.hasAttribute('open')).toBe(true);
    expect(element.style.display).toBe('');
  });

  it('opens an initially open dialog as a modal after it is connected', async () => {
    const dialog = vDialog({ open: true });
    const element = dialog.renderDom();
    let opened = false;

    element.showModal = () => {
      opened = true;
      element.setAttribute('open', '');
    };

    document.body.appendChild(element);
    await Promise.resolve();

    expect(opened).toBe(true);
    expect(element.hasAttribute('open')).toBe(true);
  });

  it('shows a close button by default and closes on click', () => {
    const dialog = vDialog((sheet) => {
      sheet.content((content) => content.text('确认发布'));
    });
    const element = dialog.renderDom();
    const closeButton = element.querySelector('.yoya-vdialog-close');

    expect(closeButton).toBeTruthy();
    dialog.open(true);
    expect(element.getAttribute('data-open')).toBe('true');
    closeButton.click();
    expect(element.getAttribute('data-open')).toBe(null);
  });

  it('hides the close button when closable is false', () => {
    const dialog = vDialog({ closable: false });
    const element = dialog.renderDom();

    expect(element.querySelector('.yoya-vdialog-header').style.display).toBe('none');
  });

  it('invokes onClose when the dialog closes and not on repeat close', () => {
    const onClose = vi.fn();
    const dialog = vDialog({ onClose });
    dialog.renderDom();

    dialog.open(true);
    dialog.close();
    expect(onClose).toHaveBeenCalledTimes(1);

    dialog.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
