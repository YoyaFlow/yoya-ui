import { afterEach, describe, expect, it } from 'vitest';
import { vForm, vSvgIconPicker } from '../index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

async function settle(ms = 10) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('vSvgIconPicker', () => {
  it('renders trigger, dialog and icon grid', async () => {
    const picker = vSvgIconPicker({ value: 'StarOutlined' });
    const element = picker.renderDom();
    document.body.appendChild(element);

    expect(element.querySelector('[data-vsvg-icon-trigger]')).not.toBeNull();
    expect(element.querySelectorAll('.yoya-vsvg-icon-picker-cell').length).toBeGreaterThan(10);
    expect(element.querySelector('.yoya-vsvg-icon-picker-grid').style.height).toBe('360px');
    expect(picker.value()).toBe('StarOutlined');

    picker.open();
    await settle();
    const dialog = element.querySelector('.yoya-vsvg-icon-picker-dialog');
    expect(dialog.getAttribute('open')).not.toBeNull();
  });

  it('selects icon on cell click, notifies change and closes dialog', async () => {
    const changed = [];
    const picker = vSvgIconPicker({
      onChange: (name) => changed.push(name)
    });
    const element = picker.renderDom();
    document.body.appendChild(element);

    picker.open();
    await settle();
    element.querySelector('[data-icon-name="SearchOutlined"]').click();
    await settle();

    expect(picker.value()).toBe('SearchOutlined');
    expect(changed).toContain('SearchOutlined');
    expect(element.querySelector('.yoya-vsvg-icon-picker-dialog').getAttribute('open')).toBeNull();
  });

  it('restricts candidate icons via icons()', () => {
    const picker = vSvgIconPicker();
    picker.icons(['StarOutlined', 'HeartOutlined']);
    expect(picker.icons()).toEqual(['StarOutlined', 'HeartOutlined']);
    picker.value('NotOutlined');
    expect(picker.value()).toBeNull();
    picker.value('StarOutlined');
    expect(picker.value()).toBe('StarOutlined');
  });

  it('lazy loads more icons when scrolled to the bottom', async () => {
    const picker = vSvgIconPicker();
    const element = picker.renderDom();
    document.body.appendChild(element);

    const grid = element.querySelector('.yoya-vsvg-icon-picker-grid');
    const total = element.querySelectorAll('.yoya-vsvg-icon-picker-cell').length;
    expect(total).toBe(24);

    Object.defineProperty(grid, 'clientHeight', { configurable: true, value: 360 });
    Object.defineProperty(grid, 'scrollHeight', { configurable: true, value: 10000 });
    Object.defineProperty(grid, 'scrollTop', { configurable: true, value: 9900 });
    grid.dispatchEvent(new Event('scroll', { bubbles: true }));
    await settle();

    const afterAll = element.querySelectorAll('.yoya-vsvg-icon-picker-cell').length;
    expect(afterAll).toBe(picker.icons().length);
  });

  it('collects value through vForm and vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('图标').name('icon');
        item.control((editor) => editor.vSvgIconPicker({ name: 'icon', value: 'StarOutlined' }));
      });
    });
    form.renderDom();
    expect(form.values().icon).toBe('StarOutlined');
  });

  it('supports disabled, name and required control APIs', () => {
    const picker = vSvgIconPicker({ disabled: true, name: 'icon', required: true });
    const element = picker.renderDom();

    expect(picker.disabled()).toBe(true);
    expect(picker.name()).toBe('icon');
    expect(picker.required()).toBe(true);
    expect(element.querySelector('[data-vsvg-icon-trigger]').disabled).toBe(true);
    expect(element.getAttribute('data-required')).toBe('true');

    picker.disabled(false).required(false).name('');
    expect(picker.disabled()).toBe(false);
    expect(picker.required()).toBe(false);
    expect(picker.name()).toBe('');
    expect(element.querySelector('[data-vsvg-icon-trigger]').disabled).toBe(false);
  });
});
