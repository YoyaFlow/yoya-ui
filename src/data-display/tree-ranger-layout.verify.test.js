import { describe, expect, it } from 'vitest';
import { vTreeRanger } from '../index.js';

function makeBrowser() {
  return vTreeRanger({
    columns: [
      {
        title: '一',
        load: () =>
          Promise.resolve(
            Array.from({ length: 50 }, (_, index) => ({ id: index, name: `A${index}` }))
          ),
        renderItem: (item) => item.name,
        itemKey: (item) => item.id
      }
    ]
  });
}

describe('vTreeRanger layout verify', () => {
  it('keeps both split dividers and nested columns independent', async () => {
    const browser = makeBrowser();
    const element = browser.render().renderDom();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const panels = element.querySelectorAll('.yoya-vsplit-panel');
    const dividers = element.querySelectorAll('.yoya-vsplit-panel-divider');
    const firsts = element.querySelectorAll('.yoya-vsplit-panel-first');
    const seconds = element.querySelectorAll('.yoya-vsplit-panel-second');
    const columns = element.querySelectorAll('.yoya-vtreeranger-column');

    const info = [
      ['panels', panels.length],
      ['dividers', dividers.length],
      ['columns', columns.length],
      ['root flexDirection', element.style.flexDirection],
      ['outer panel', panels[0]?.getAttribute('style')],
      ['outer second', seconds[0]?.getAttribute('style')],
      ['inner panel', panels[1]?.getAttribute('style')],
      ['divider0', dividers[0]?.getAttribute('style')],
      ['divider1', dividers[1]?.getAttribute('style')],
      ['col1', columns[1]?.getAttribute('style')],
      ['col2', columns[2]?.getAttribute('style')]
    ]
      .map(([key, value]) => `${key}: ${value ?? 'null'}`)
      .join('\n');
    throw new Error(`LAYOUT INFO\n${info}`);

    expect(panels.length).toBe(2);
    expect(dividers.length).toBe(2);
    expect(columns.length).toBe(3);
    expect(seconds[0].querySelector('.yoya-vsplit-panel')).not.toBeNull();
  });
});
