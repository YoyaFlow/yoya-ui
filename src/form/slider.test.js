import { describe, expect, it, vi } from 'vitest';
import { VSlider, div, vForm, vSlider } from '../index.js';

function findSlider(node) {
  if (node instanceof VSlider) {
    return node;
  }

  for (const child of node.children()) {
    const found = findSlider(child);
    if (found) {
      return found;
    }
  }

  return null;
}

describe('vSlider', () => {
  it('renders a range input with min/max/step and a value label', () => {
    const slider = vSlider({ max: 200, min: 10, step: 5, value: 60 });
    const element = slider.renderDom();

    expect(slider).toBeInstanceOf(VSlider);
    expect(element.classList.contains('yoya-vslider')).toBe(true);

    const input = element.querySelector('[data-vslider-input]');
    expect(input.type).toBe('range');
    expect(input.min).toBe('10');
    expect(input.max).toBe('200');
    expect(input.step).toBe('5');
    expect(input.value).toBe('60');
    expect(element.querySelector('[data-vslider-value]').textContent).toBe('60');
  });

  it('clamps values into the min/max/step range', () => {
    const slider = vSlider({ max: 100, min: 0, step: 10, value: 120 });
    expect(slider.value()).toBe(100);

    slider.value(-5);
    expect(slider.value()).toBe(0);

    slider.value(37);
    expect(slider.value()).toBe(40);
  });

  it('notifies change handlers and syncs the DOM input', () => {
    const onChange = vi.fn();
    const slider = vSlider({ onChange, value: 30 });
    const element = slider.renderDom();

    slider.value(70);

    expect(onChange).toHaveBeenCalledWith(70, slider);
    expect(element.querySelector('[data-vslider-input]').value).toBe('70');
    expect(element.querySelector('[data-vslider-value]').textContent).toBe('70');
  });

  it('updates the value on user input events', () => {
    const slider = vSlider();
    const element = slider.renderDom();
    const input = element.querySelector('[data-vslider-input]');

    input.value = '45';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(slider.value()).toBe(45);
  });

  it('exposes disabled/name/required and hides the value label', () => {
    const slider = vSlider({ disabled: true, name: 'volume', required: true, showValue: false });
    const element = slider.renderDom();

    expect(slider.disabled()).toBe(true);
    expect(slider.name()).toBe('volume');
    expect(slider.required()).toBe(true);
    expect(element.querySelector('[data-vslider-input]').disabled).toBe(true);
    expect(element.querySelector('[data-vslider-input]').name).toBe('volume');
    expect(element.querySelector('[data-vslider-value]').style.display).toBe('none');

    slider.disabled(false);
    expect(slider.disabled()).toBe(false);
    expect(element.querySelector('[data-vslider-input]').disabled).toBe(false);
  });

  it('switches to a vertical layout with a bottom-up range input', () => {
    const slider = vSlider({ max: 100, min: 0, step: 1, value: 60, vertical: true });
    const element = slider.renderDom();

    expect(slider.vertical()).toBe(true);
    expect(element.getAttribute('data-vertical')).toBe('true');
    expect(element.style.flexDirection).toBe('column');
    expect(element.style.height).toBe('180px');

    const input = element.querySelector('[data-vslider-input]');
    expect(input.style.writingMode).toBe('vertical-lr');
    expect(input.style.direction).toBe('rtl');
    expect(input.style.height).toBe('100%');
    expect(element.querySelector('[data-vslider-value]').style.textAlign).toBe('center');

    slider.vertical(false);
    expect(slider.vertical()).toBe(false);
    expect(element.getAttribute('data-vertical')).toBeNull();
    expect(element.style.flexDirection).toBe('row');
    expect(input.style.writingMode).toBe('');
  });

  it('registers vSlider as a parent shortcut', () => {
    const page = div((root) => {
      root.vSlider({ value: 20 });
    });
    const slider = page.children()[0];

    expect(slider).toBeInstanceOf(VSlider);
    expect(slider.value()).toBe(20);
  });

  it('collects and applies values through vForm and vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('音量').name('volume');
        item.control((editor) => editor.vSlider({ name: 'volume', value: 30 }));
      });
    });
    form.renderDom();
    const slider = findSlider(form);

    expect(form.values().volume).toBe(30);

    slider.value(80);
    expect(form.values().volume).toBe(80);

    form.values({ volume: 15 });
    expect(slider.value()).toBe(15);
  });

  it('registers inside vFormItem via a function control', () => {
    const form = vForm((root) => {
      root.vFormItem({
        label: '音量',
        name: 'volume',
        control: (editor) => editor.vSlider({ value: 60 })
      });
    });
    form.renderDom();

    expect(form.values().volume).toBe(60);
  });
});
