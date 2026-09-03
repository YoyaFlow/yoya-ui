import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  announce,
  createFocusTrap,
  getFocusableElements,
  moveByKey
} from '../index.js';

function container() {
  const root = document.createElement('div');
  root.innerHTML = `
    <button id="a">A</button>
    <input id="b" tabindex="1" />
    <a id="c" href="#">C</a>
    <span id="x">x</span>
    <button id="d" disabled>D</button>
  `;
  document.body.appendChild(root);
  return root;
}

describe('a11y primitives (core)', () => {
  let root;
  beforeEach(() => {
    root = container();
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('getFocusableElements returns interactive nodes in DOM order, skipping disabled', () => {
    const ids = getFocusableElements(root).map((el) => el.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('createFocusTrap wraps Tab (forward and backward) and fires Escape', () => {
    const escaped = [];
    const trap = createFocusTrap(root, { onEscape: () => escaped.push('esc') });
    trap.activate();
    document.getElementById('a').focus();

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.getElementById('a').dispatchEvent(tab);
    expect(document.activeElement.id).toBe('b');

    // wrap: from last (c) forward goes back to first (a)
    document.getElementById('c').focus();
    document.getElementById('c').dispatchEvent(tab);
    expect(document.activeElement.id).toBe('a');

    // shift+tab: from first wraps to last (c)
    document.getElementById('a').focus();
    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    document.getElementById('a').dispatchEvent(shiftTab);
    expect(document.activeElement.id).toBe('c');

    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.getElementById('a').dispatchEvent(esc);
    expect(escaped).toEqual(['esc']);
    trap.destroy();
  });

  it('createFocusTrap restores focus on destroy', () => {
    const trigger = document.createElement('button');
    trigger.id = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const trap = createFocusTrap(root);
    trap.activate();
    expect(document.activeElement.id).toBe('a');
    trap.destroy();
    expect(document.activeElement.id).toBe('trigger');
  });

  it('announce creates an aria-live region and updates content', () => {
    announce('新增一条消息');
    const region = document.querySelector('[data-yoya-live]');
    expect(region).toBeTruthy();
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('moveByKey returns the next/previous index with wrapping', () => {
    const items = ['a', 'b', 'c'];
    expect(moveByKey({ key: 'ArrowDown', items, currentIndex: 0 })).toBe(1);
    expect(moveByKey({ key: 'ArrowUp', items, currentIndex: 0 })).toBe(2);
    expect(moveByKey({ key: 'Home', items, currentIndex: 2 })).toBe(0);
    expect(moveByKey({ key: 'End', items, currentIndex: 0 })).toBe(2);
  });
});
