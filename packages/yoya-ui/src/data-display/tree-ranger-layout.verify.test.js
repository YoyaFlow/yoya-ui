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
    const element = browser.renderDom();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const panels = element.querySelectorAll('[vn~="VSplitPanel"]');
    const dividers = element.querySelectorAll('[vn~="VSplitPanelDivider"]');
    const seconds = element.querySelectorAll('[vn~="VSplitPanelSecond"]');
    const columns = element.querySelectorAll('[vn~="VTreeRangerColumn"]');

    expect(panels.length).toBe(2);
    expect(dividers.length).toBe(2);
    expect(columns.length).toBe(3);
    expect(seconds[0].querySelector('[vn~="VSplitPanel"]')).not.toBeNull();
  });
});
