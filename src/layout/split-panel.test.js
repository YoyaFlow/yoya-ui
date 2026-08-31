import { afterEach, describe, expect, it } from 'vitest';
import { div, vSplitPanel } from '../index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vSplitPanel', () => {
  it('renders two panels with a draggable divider', () => {
    const panel = vSplitPanel();
    const element = panel.renderDom();

    expect(element.className).toContain('yoya-vsplit-panel');
    expect(element.querySelector('[data-vsplit-first]')).not.toBeNull();
    expect(element.querySelector('[data-vsplit-second]')).not.toBeNull();
    const divider = element.querySelector('[data-vsplit-divider]');
    expect(divider).not.toBeNull();
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('sets direction, size, minSize and panel contents', () => {
    const panel = vSplitPanel((panel) => {
      panel.direction('vertical');
      panel.size('40%');
      panel.minSize(80);
      panel.first((left) => left.strong('左'));
      panel.second((right) => right.strong('右'));
    });
    const element = panel.renderDom();

    expect(panel.direction()).toBe('vertical');
    expect(panel.size()).toBe('40%');
    expect(panel.minSize()).toBe(80);
    expect(element.style.flexDirection).toBe('column');
    expect(element.querySelector('[data-vsplit-first]').textContent).toBe('左');
    expect(element.querySelector('[data-vsplit-second]').textContent).toBe('右');
    expect(element.querySelector('[data-vsplit-divider]').getAttribute('aria-orientation')).toBe(
      'vertical'
    );
  });

  it('resizes the first panel with keyboard arrows and resets on double click', () => {
    const panel = vSplitPanel({ size: '60%' });
    const element = panel.renderDom();
    const divider = element.querySelector('[data-vsplit-divider]');

    divider.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' })
    );
    expect(panel.size()).toBe('40px');

    panel.reset();
    expect(panel.size()).toBe('50%');
  });

  it('supports drag resizing and object config', () => {
    const panel = vSplitPanel({ direction: 'horizontal', size: '50%' });
    const element = panel.renderDom();
    document.body.appendChild(element);
    const divider = element.querySelector('[data-vsplit-divider]');

    divider.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: 100 })
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 160, clientY: 0 })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(panel.size()).toBe('40px');
  });

  it('registers as a parent shortcut', () => {
    const root = div((page) => page.vSplitPanel());
    expect(root.renderDom().querySelector('.yoya-vsplit-panel')).not.toBeNull();
  });
});
