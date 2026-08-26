import { describe, expect, it, vi } from 'vitest';
import { VRate, div, vField, vForm, vRate } from '../index.js';

function findRate(node) {
  if (node instanceof VRate) {
    return node;
  }

  for (const child of node.children()) {
    const found = findRate(child);
    if (found) {
      return found;
    }
  }

  return null;
}

describe('vRate', () => {
  it('renders stars and a hidden range input', () => {
    const rate = vRate({ count: 5, value: 3 });
    const element = rate.renderDom();

    expect(rate).toBeInstanceOf(VRate);
    expect(element.classList.contains('yoya-vrate')).toBe(true);
    expect(element.querySelectorAll('.yoya-vrate-star')).toHaveLength(5);
    expect(element.querySelector('.yoya-vrate-input').type).toBe('range');
    expect(element.querySelector('.yoya-vrate-input').style.display).toBe('none');
    expect(rate.value()).toBe(3);
    expect(element.querySelector('[data-value="3"]').getAttribute('aria-checked')).toBe('true');
  });

  it('selects a star, emits change, and clears when clicking the selected star', () => {
    const changed = vi.fn();
    const rate = vRate({ value: 3 });
    rate.on('change', changed);
    const element = rate.renderDom();

    element.querySelector('[data-value="4"]').click();

    expect(rate.value()).toBe(4);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0].detail).toBe(4);

    element.querySelector('[data-value="4"]').click();

    expect(rate.value()).toBe(0);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('blocks interaction while disabled or readonly', () => {
    const rate = vRate({ disabled: true, value: 3 });
    const element = rate.renderDom();

    element.querySelector('[data-value="4"]').click();
    expect(rate.value()).toBe(3);
    expect(element.querySelector('.yoya-vrate-stars').getAttribute('aria-disabled')).toBe('true');

    rate.disabled(false).readonly(true);
    element.querySelector('[data-value="4"]').click();
    expect(rate.value()).toBe(3);
    expect(element.querySelector('.yoya-vrate-stars').getAttribute('aria-readonly')).toBe('true');

    rate.readonly(false);
    element.querySelector('[data-value="4"]').click();
    expect(rate.value()).toBe(4);
  });

  it('supports half values and rounds when half mode is disabled', () => {
    const rate = vRate({ allowHalf: true, count: 5, value: 3.5 });
    const element = rate.renderDom();

    expect(rate.value()).toBe(3.5);
    expect(element.querySelector('[data-value="4"]').dataset.half).toBe('true');
    expect(element.querySelector('[data-value="4"]').getAttribute('aria-checked')).toBe('true');

    rate.allowHalf(false);
    expect(rate.value()).toBe(4);
  });

  it('updates count, character, size, name, required, and error states', () => {
    const rate = vRate({
      character: '●',
      count: 7,
      error: true,
      name: 'score',
      required: true,
      size: 26,
      value: 6
    });
    const element = rate.renderDom();

    expect(rate.count()).toBe(7);
    expect(rate.character()).toBe('●');
    expect(rate.size()).toBe(26);
    expect(rate.name()).toBe('score');
    expect(rate.required()).toBe(true);
    expect(rate.error()).toBe(true);
    expect(element.querySelectorAll('.yoya-vrate-star')).toHaveLength(7);
    expect(element.querySelector('.yoya-vrate-star-base').textContent).toBe('●');
    expect(element.querySelector('.yoya-vrate-input').name).toBe('score');
    expect(element.querySelector('.yoya-vrate-input').required).toBe(true);
    expect(element.querySelector('.yoya-vrate-stars').getAttribute('aria-invalid')).toBe('true');
  });

  it('registers vRate as a parent shortcut', () => {
    const page = div((root) => {
      root.vRate({ value: 2 });
    });
    const rate = page.children()[0];

    expect(rate).toBeInstanceOf(VRate);
    expect(rate.value()).toBe(2);
  });

  it('collects and applies values through vForm and vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('评分').name('score');
        item.control((editor) => editor.vRate({ name: 'score', value: 4 }));
      });
    });
    form.renderDom();
    const rate = findRate(form);

    expect(form.values().score).toBe(4);

    rate.value(2);
    expect(form.values().score).toBe(2);

    form.values({ score: 5 });
    expect(rate.value()).toBe(5);
  });

  it('validates required ratings and works as a vField editor', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('评分').name('score').required({ message: '请选择评分' });
        item.control((editor) => editor.vRate({ name: 'score' }));
      });
    });
    form.renderDom();

    expect(form.validate()).toBe(false);
    findRate(form).value(2);
    expect(form.validate()).toBe(true);

    const field = vField({
      label: '评分',
      value: 4,
      control: (editor) => editor.vRate({ name: 'score', value: 4 })
    });
    const fieldElement = field.renderDom();

    expect(field.control()).toBeInstanceOf(VRate);
    expect(field.value()).toBe(4);
    expect(fieldElement.querySelector('.yoya-vfield-display').textContent).toBe('4');

    field.mode('edit');
    field.value(2);
    expect(field.value()).toBe(2);
  });
});
