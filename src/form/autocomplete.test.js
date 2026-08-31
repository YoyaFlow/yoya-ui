import { describe, expect, it, vi } from 'vitest';
import { VAutocomplete, div, vAutocomplete, vForm } from '../index.js';

const source = ['JavaScript', 'TypeScript', 'Vue', 'React', 'Svelte'];

function findAutocomplete(node) {
  if (node instanceof VAutocomplete) {
    return node;
  }

  for (const child of node.children()) {
    const found = findAutocomplete(child);
    if (found) {
      return found;
    }
  }

  return null;
}

async function flushSuggestions() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('vAutocomplete', () => {
  it('renders an input and a closed suggestion list', () => {
    const autocomplete = vAutocomplete({ placeholder: '搜索技术栈', source });
    const element = autocomplete.renderDom();

    expect(autocomplete).toBeInstanceOf(VAutocomplete);
    expect(element.classList.contains('yoya-vautocomplete')).toBe(true);
    expect(element.querySelector('[data-vautocomplete-input]').placeholder).toBe('搜索技术栈');
    expect(element.querySelector('[data-vautocomplete-list]').style.display).toBe('none');
    expect(element.querySelector('[data-vautocomplete-list]').style.position).toBe('fixed');
  });

  it('filters suggestions while typing and selects with a click', async () => {
    const onChange = vi.fn();
    const autocomplete = vAutocomplete({ onChange, source });
    const element = autocomplete.renderDom();
    const input = element.querySelector('[data-vautocomplete-input]');

    input.value = 'Type';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    const list = element.querySelector('[data-vautocomplete-list]');
    expect(list.style.display).not.toBe('none');
    expect(list.querySelectorAll('[data-vautocomplete-option]')).toHaveLength(1);
    expect(list.style.position).toBe('fixed');
    expect(list.style.left).toBe('0px');
    expect(list.style.top).toBe('6px');
    expect(list.style.width).toBe('180px');

    list
      .querySelector('[data-vautocomplete-option="TypeScript"]')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(autocomplete.value()).toBe('TypeScript');
    expect(onChange).toHaveBeenLastCalledWith('TypeScript', autocomplete);
    expect(list.style.display).toBe('none');
  });

  it('selects suggestions with keyboard arrows and Enter', async () => {
    const autocomplete = vAutocomplete({ source });
    const element = autocomplete.renderDom();
    const input = element.querySelector('[data-vautocomplete-input]');

    input.value = 're';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    expect(autocomplete.value()).toBe('React');
  });

  it('selects a suggestion with a full mouse click sequence', async () => {
    const onChange = vi.fn();
    const autocomplete = vAutocomplete({ onChange, source });
    const element = autocomplete.renderDom();
    const input = element.querySelector('[data-vautocomplete-input]');

    input.value = 'vue';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    const option = element.querySelector('[data-vautocomplete-option="Vue"]');
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(autocomplete.value()).toBe('Vue');
    expect(onChange).toHaveBeenLastCalledWith('Vue', autocomplete);
    expect(element.querySelector('[data-vautocomplete-list]').style.display).toBe('none');
    expect(input.value).toBe('Vue');
  });

  it('reopens the suggestion list when clicking the focused input again', async () => {
    const autocomplete = vAutocomplete({ source });
    const element = autocomplete.renderDom();
    const input = element.querySelector('[data-vautocomplete-input]');

    input.value = 'rea';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    element
      .querySelector('[data-vautocomplete-option="React"]')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(element.querySelector('[data-vautocomplete-list]').style.display).toBe('none');

    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushSuggestions();

    const list = element.querySelector('[data-vautocomplete-list]');
    expect(list.style.display).not.toBe('none');
    expect(list.querySelector('[data-vautocomplete-option="React"]')).not.toBeNull();
  });

  it('highlights options on hover without rebuilding the list nodes', async () => {
    const autocomplete = vAutocomplete({ source });
    const element = autocomplete.renderDom();
    const input = element.querySelector('[data-vautocomplete-input]');

    input.value = 'v';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    const option = element.querySelector('[data-vautocomplete-option="Vue"]');
    option.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    expect(element.querySelector('[data-vautocomplete-option="Vue"]')).toBe(option);
    expect(option.style.background).not.toBe('');
  });

  it('uses a function source and honors a custom limit', async () => {
    const autocomplete = vAutocomplete({
      limit: 2,
      source: (query) =>
        source.filter((item) => item.toLowerCase().includes(String(query).toLowerCase())),
      value: 's'
    });
    const element = autocomplete.renderDom();

    autocomplete._openSuggestions();
    await flushSuggestions();

    const list = element.querySelector('[data-vautocomplete-list]');
    expect(list.querySelectorAll('[data-vautocomplete-option]').length).toBeGreaterThan(0);
    expect(list.querySelectorAll('[data-vautocomplete-option]').length).toBeLessThanOrEqual(2);
  });

  it('exposes disabled/name/required and skips suggestions while disabled', async () => {
    const autocomplete = vAutocomplete({ disabled: true, name: 'stack', required: true, source });
    const element = autocomplete.renderDom();

    expect(autocomplete.disabled()).toBe(true);
    expect(autocomplete.name()).toBe('stack');
    expect(autocomplete.required()).toBe(true);
    expect(element.querySelector('[data-vautocomplete-input]').disabled).toBe(true);

    const input = element.querySelector('[data-vautocomplete-input]');
    input.value = 'vue';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    expect(element.querySelector('[data-vautocomplete-list]').style.display).toBe('none');
  });

  it('registers vAutocomplete as a parent shortcut', () => {
    const page = div((root) => {
      root.vAutocomplete({ source, value: 'Vue' });
    });
    const autocomplete = page.children()[0];

    expect(autocomplete).toBeInstanceOf(VAutocomplete);
    expect(autocomplete.value()).toBe('Vue');
  });

  it('collects and applies values through vForm and vFormItem', () => {
    const form = vForm((root) => {
      root.vFormItem((item) => {
        item.label('技术栈').name('stack');
        item.control((editor) => editor.vAutocomplete({ name: 'stack', source, value: 'Vue' }));
      });
    });
    form.renderDom();
    const autocomplete = findAutocomplete(form);

    expect(form.values().stack).toBe('Vue');

    autocomplete.value('React');
    expect(form.values().stack).toBe('React');

    form.values({ stack: 'Svelte' });
    expect(autocomplete.value()).toBe('Svelte');
  });
});
