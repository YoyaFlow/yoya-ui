import { afterEach, describe, expect, it } from 'vitest';
import { vField } from '../index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeField(initial = 'Ada') {
  return vField((field) => {
    field.label('姓名');
    field.control((editor) => editor.vInput({ name: 'name', value: initial }));
  });
}

describe('vField floating edit', () => {
  it('renders an input-sized display box mirroring the control value', () => {
    const field = makeField('Ada');
    const el = field.renderDom();
    const display = el.querySelector('.yoya-vfield-display');
    expect(display.textContent).toContain('Ada');
    expect(display.style.minHeight).toContain('yoya-control-height-md');
    expect(display.style.display).toBe('flex');
    expect(el.querySelector('.yoya-vfield-editor').style.display).toBe('none');
  });

  it('double-click enters edit with a floating fixed editor', () => {
    const field = makeField();
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(field.mode()).toBe('edit');
    const editor = el.querySelector('.yoya-vfield-editor');
    expect(editor.style.display).not.toBe('none');
    expect(editor.style.position).toBe('fixed');
  });

  it('Enter saves and restores display to the new value', () => {
    const field = makeField();
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = el.querySelector('.yoya-vfield-editor input');
    input.value = 'Zoe';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    expect(field.mode()).toBe('view');
    expect(field.value()).toBe('Zoe');
    expect(el.querySelector('.yoya-vfield-display').textContent).toContain('Zoe');
  });

  it('Escape cancels and restores the previous value', () => {
    const field = makeField('Ada');
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = el.querySelector('.yoya-vfield-editor input');
    input.value = 'Zoe';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(field.mode()).toBe('view');
    expect(field.value()).toBe('Ada');
    expect(el.querySelector('.yoya-vfield-display').textContent).toContain('Ada');
  });

  it('blurring outside the field commits', () => {
    const field = makeField();
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = el.querySelector('.yoya-vfield-editor input');
    input.value = 'Ray';
    input.dispatchEvent(new MouseEvent('blur', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    expect(field.mode()).toBe('view');
    expect(field.value()).toBe('Ray');
  });

  it('anchors the floating editor to the display box, not the whole field', () => {
    const field = makeField();
    const el = field.renderDom();
    const display = el.querySelector('.yoya-vfield-display');
    const editor = el.querySelector('.yoya-vfield-editor');

    display.getBoundingClientRect = () => ({
      bottom: 80,
      height: 34,
      left: 120,
      right: 360,
      top: 46,
      width: 240
    });

    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(editor.style.left).toBe('120px');
    expect(editor.style.top).toBe('46px');
    expect(editor.style.width).toBe('240px');
    expect(editor.style.minHeight).toBe('34px');
  });
});
