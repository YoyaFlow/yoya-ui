import { describe, expect, it, vi } from 'vitest';
import { VTagsInput, div, vForm, vTagsInput } from '../index.js';

function findTagsInput(node) {
  if (node instanceof VTagsInput) {
    return node;
  }

  for (const child of node.children()) {
    const found = findTagsInput(child);
    if (found) {
      return found;
    }
  }

  return null;
}

function typeAndEnter(element, text) {
  const input = element.querySelector('[data-vtags-input]');
  input.value = text;
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
  return input;
}

describe('vTagsInput', () => {
  it('renders an empty input and placeholder', () => {
    const tags = vTagsInput({ placeholder: '添加标签' });
    const element = tags.renderDom();

    expect(tags).toBeInstanceOf(VTagsInput);
    expect(element.classList.contains('yoya-vtags-input')).toBe(true);
    expect(element.querySelector('[data-vtags-input]').placeholder).toBe('添加标签');
    expect(tags.value()).toEqual([]);
  });

  it('adds tags on Enter and comma, deduplicates and clears the field', () => {
    const onChange = vi.fn();
    const tags = vTagsInput({ onChange });
    const element = tags.renderDom();

    typeAndEnter(element, 'vue');
    expect(tags.value()).toEqual(['vue']);
    expect(element.querySelector('[data-vtags-input]').value).toBe('');
    expect(element.querySelector('[data-vtags-tag="vue"]').textContent).toContain('vue');

    typeAndEnter(element, 'react');
    typeAndEnter(element, 'vue');
    expect(tags.value()).toEqual(['vue', 'react']);
    expect(onChange).toHaveBeenLastCalledWith(['vue', 'react'], tags);
  });

  it('removes tags with the × button and backspace', () => {
    const tags = vTagsInput({ value: ['a', 'b'] });
    const element = tags.renderDom();

    element.querySelector('[data-vtags-tag="a"] [data-vtags-remove]').click();
    expect(tags.value()).toEqual(['b']);

    const input = element.querySelector('[data-vtags-input]');
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' }));
    expect(tags.value()).toEqual([]);
  });

  it('exposes disabled/name/required', () => {
    const tags = vTagsInput({ disabled: true, name: 'tags', required: true });
    const element = tags.renderDom();

    expect(tags.disabled()).toBe(true);
    expect(tags.name()).toBe('tags');
    expect(tags.required()).toBe(true);
    expect(element.querySelector('[data-vtags-input]').disabled).toBe(true);

    tags.disabled(false);
    expect(tags.disabled()).toBe(false);
  });

  it('registers vTagsInput as a parent shortcut', () => {
    const page = div((root) => {
      root.vTagsInput({ value: ['x'] });
    });
    const tags = page.children()[0];

    expect(tags).toBeInstanceOf(VTagsInput);
    expect(tags.value()).toEqual(['x']);
  });

  it('collects and applies values through vForm and vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('标签').name('tags');
        item.control((editor) => editor.vTagsInput({ name: 'tags', value: ['a'] }));
      });
    });
    form.renderDom();
    const tags = findTagsInput(form);

    expect(form.values().tags).toEqual(['a']);

    tags.value(['a', 'b']);
    expect(form.values().tags).toEqual(['a', 'b']);

    form.values({ tags: ['c'] });
    expect(tags.value()).toEqual(['c']);
  });
});
