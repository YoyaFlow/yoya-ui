import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, vColorPicker } from '../index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vColorPicker', () => {
  it('renders a trigger and a closed custom popup with palette, alpha and effect', () => {
    const element = vColorPicker().renderDom();

    expect(element.className).toContain('yoya-vcolor-picker');
    expect(element.querySelector('[data-vcolor-trigger]')).not.toBeNull();
    const popup = element.querySelector('[data-vcolor-popup]');
    expect(popup).not.toBeNull();
    expect(popup.style.display).toBe('none');
    expect(element.querySelector('[data-vcolor-palette] [data-vcolor-swatch]')).not.toBeNull();
    expect(element.querySelector('[data-vcolor-alpha]')).not.toBeNull();
    expect(element.querySelector('[data-vcolor-effect]')).not.toBeNull();
    expect(element.querySelector('[data-vcolor-selected]')).not.toBeNull();
  });

  it('opens the popup, selects a palette color and notifies change handlers', () => {
    const onChange = vi.fn();
    const picker = vColorPicker({ onChange, value: '#123456' });
    const element = picker.renderDom();

    expect(picker.value()).toBe('#123456');
    expect(picker.alpha()).toBe(100);
    expect(element.querySelector('[data-vcolor-trigger-text]').textContent).toBe('#123456 100%');

    element.querySelector('[data-vcolor-trigger]').click();
    expect(element.querySelector('[data-vcolor-popup]').style.display).not.toBe('none');
    expect(element.querySelector('[data-vcolor-popup]').style.position).toBe('fixed');
    expect(element.querySelector('[data-vcolor-trigger]').getAttribute('aria-expanded')).toBe(
      'true'
    );

    element.querySelector('[data-vcolor-palette] [data-vcolor-swatch="#3b82f6"]').click();

    expect(picker.value()).toBe('#3b82f6');
    expect(element.querySelector('[data-vcolor-selected-text]').textContent).toBe('#3b82f6 100%');
    expect(onChange).toHaveBeenCalledWith('#3b82f6', 100, picker);

    picker.close();
    expect(element.querySelector('[data-vcolor-popup]').style.display).toBe('none');
  });

  it('adjusts alpha and reflects the selected color effect', () => {
    const onChange = vi.fn();
    const picker = vColorPicker({ onChange, value: '#2563eb' });
    const element = picker.renderDom();

    picker.alpha(50);

    expect(picker.alpha()).toBe(50);
    expect(picker.rgba()).toBe('rgba(37, 99, 235, 0.5)');
    expect(element.querySelector('[data-vcolor-alpha]').getAttribute('value')).toBe('50');
    expect(element.querySelector('[data-vcolor-alpha-text]').textContent).toBe('50%');
    expect(element.querySelector('[data-vcolor-alpha]').style.writingMode).toBe('vertical-lr');
    expect(element.querySelector('[data-vcolor-effect-fill]').style.background).toContain(
      'rgba(37, 99, 235, 0.5)'
    );
    expect(onChange).toHaveBeenCalledWith('#2563eb', 50, picker);

    const alphaInput = element.querySelector('[data-vcolor-alpha]');
    alphaInput.value = '25';
    alphaInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(picker.alpha()).toBe(25);
    expect(element.querySelector('[data-vcolor-effect-fill]').style.background).toContain(
      'rgba(37, 99, 235, 0.25)'
    );
  });

  it('clears the selected color from the popup with the clear button', () => {
    const onChange = vi.fn();
    const picker = vColorPicker({ onChange, value: '#2563eb' });
    const element = picker.renderDom();

    element.querySelector('[data-vcolor-clear-selected]').click();

    expect(picker.value()).toBeNull();
    expect(picker.rgba()).toBeNull();
    expect(element.querySelector('[data-vcolor-selected-text]').textContent).toBe('未选择');
    expect(onChange).toHaveBeenCalledWith(null, 100, picker);
  });

  it('registers the parent shortcut', () => {
    const root = div((page) => page.vColorPicker());
    expect(root.renderDom().querySelector('.yoya-vcolor-picker')).not.toBeNull();
  });
});
