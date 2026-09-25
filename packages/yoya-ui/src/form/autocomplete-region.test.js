import { describe, expect, it } from 'vitest';
import { vAutocomplete } from '../index.js';

const source = ['JavaScript', 'TypeScript', 'Vue', 'React', 'Svelte'];

async function flushSuggestions() {
  await Promise.resolve();
  await Promise.resolve();
}

async function typeQuery(element, query) {
  const input = element.querySelector('[data-vautocomplete-input]');
  input.value = query;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushSuggestions();
  return input;
}

describe('vAutocomplete rebuildable list', () => {
  it('defers rebuilding the option list while the pointer is over it', async () => {
    const autocomplete = vAutocomplete({ source });
    const element = autocomplete.renderDom();
    const input = await typeQuery(element, 'vu');
    const list = element.querySelector('[data-vautocomplete-list]');
    const firstOption = list.querySelector('[data-vautocomplete-option]');

    expect(firstOption).not.toBeNull();

    list.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));

    input.value = 'java';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    expect(list.querySelector('[data-vautocomplete-option]')).toBe(firstOption);

    list.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

    expect(list.querySelector('[data-vautocomplete-option]')).not.toBe(firstOption);
    expect(list.querySelector('[data-vautocomplete-option="JavaScript"]')).not.toBeNull();
  });

  it('rebuilds the option list while the pointer is elsewhere', async () => {
    const autocomplete = vAutocomplete({ source });
    const element = autocomplete.renderDom();
    const input = await typeQuery(element, 'vu');
    const list = element.querySelector('[data-vautocomplete-list]');
    const firstOption = list.querySelector('[data-vautocomplete-option]');

    input.value = 'java';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushSuggestions();

    expect(list.querySelector('[data-vautocomplete-option]')).not.toBe(firstOption);
    expect(list.querySelectorAll('[data-vautocomplete-option]')).toHaveLength(1);
  });
});
