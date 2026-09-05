import { afterEach, describe, expect, it } from 'vitest';
import { disableDevtools, getDevtoolsDom } from '../../yoya.devtools.js';
import { DevtoolsInspectorDemo } from './devtools-inspector.js';

afterEach(() => {
  disableDevtools();
});

describe('devtools inspector demo', () => {
  it('opens a persistent overlay, reports events and preserves state on hide', () => {
    const demo = DevtoolsInspectorDemo();
    const element = demo.render().renderDom();
    const overlay = element.querySelector('[data-devtools-overlay]');

    expect(overlay.style.display).toBe('none');
    element.querySelector('[data-devtools-open]').click();

    expect(overlay.style.display).not.toBe('none');
    expect(element.querySelector('[data-devtools-status]').textContent).toContain('已启用');
    expect(element.querySelectorAll('[data-devtools-tree-row]').length).toBeGreaterThan(1);
    const treeRowsAfterOpen = element.querySelectorAll('[data-devtools-tree-row]').length;

    element.querySelector('[data-devtools-refresh]').click();
    expect(element.querySelectorAll('[data-devtools-tree-row]').length).toBe(treeRowsAfterOpen);

    element.querySelector('[data-devtools-toggle]').click();
    element.querySelector('[data-devtools-toggle]').click();
    expect(element.querySelectorAll('[data-devtools-tree-row]').length).toBe(treeRowsAfterOpen);

    const plusButton = [...element.querySelectorAll('button')].find((button) =>
      button.textContent.includes('+1')
    );
    plusButton.click();

    const eventText = [...element.querySelectorAll('[data-devtools-event]')].map((node) =>
      node.textContent
    );
    expect(eventText.some((text) => text.includes('状态更新'))).toBe(true);
    expect(
      eventText.some((text) => text.includes('文本') && text.includes('0 → 1'))
    ).toBe(true);

    const stateTab = element.querySelector('[data-devtools-tab="state"]');
    stateTab.click();
    const stateRows = [...element.querySelectorAll('[data-devtools-state-row]')].map((node) =>
      node.textContent
    );
    expect(stateRows.some((text) => text.includes('"count":1'))).toBe(true);

    const treeTab = element.querySelector('[data-devtools-tab="tree"]');
    treeTab.click();
    const componentButton = [...element.querySelectorAll('.devtools-tree-button')].find((button) =>
      button.textContent.includes('component')
    );
    componentButton.click();
    expect(
      JSON.parse(element.querySelector('[data-devtools-detail]').textContent).state
    ).toEqual({
      count: 1,
      mode: 'normal'
    });

    const filter = element.querySelector('[data-devtools-filter]');
    filter.value = 'text';
    filter.dispatchEvent(new Event('change'));
    const filteredEvents = [...element.querySelectorAll('[data-devtools-event]')];
    expect(filteredEvents.length).toBeGreaterThan(0);
    expect(filteredEvents.every((node) => node.dataset.devtoolsEventType === 'text')).toBe(true);
    filter.value = 'all';
    filter.dispatchEvent(new Event('change'));

    const treeButton = element.querySelector('.devtools-tree-button');
    const treeDomId = Number(treeButton.dataset.devtoolsTreeId);
    treeButton.click();
    expect(element.querySelector('[data-devtools-detail]')).toBeTruthy();
    expect(getDevtoolsDom(treeDomId).style.outline).toContain('2px');

    const eventsBeforeHide = element.querySelectorAll('[data-devtools-event]').length;
    element.querySelector('[data-devtools-close]').click();
    expect(overlay.style.display).toBe('none');

    element.querySelector('[data-devtools-open]').click();
    expect(overlay.style.display).not.toBe('none');
    expect(element.querySelectorAll('[data-devtools-event]').length).toBe(eventsBeforeHide);
    expect(element.querySelector('[data-devtools-status]').textContent).toContain('已启用');

    demo.destroy();
  });
});
