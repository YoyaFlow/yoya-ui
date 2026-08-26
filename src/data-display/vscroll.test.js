import { afterEach, describe, expect, it, vi } from 'vitest';
import { VScroll, div, vScroll } from '../index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vScroll', () => {
  it('renders items and exposes the scroll container', () => {
    const scroll = vScroll({
      block: true,
      items: ['A', 'B'],
      renderItem: (item) => div(item)
    });
    const element = scroll.renderDom();

    expect(scroll).toBeInstanceOf(VScroll);
    expect(element.classList.contains('yoya-vscroll')).toBe(true);
    expect(element.dataset.page).toBe('0');
    expect(element.dataset.blocked).toBe('true');
    expect(element.querySelectorAll('.yoya-vscroll-list > div')).toHaveLength(2);
    expect(element.textContent).toContain('A');
    expect(element.textContent).toContain('B');
  });

  it('loads more when the scroll position reaches the threshold', () => {
    const loadMore = vi.fn(({ append, block, page }) => {
      append([`第 ${page} 页`]);
      block(true);
    });
    const scroll = vScroll({
      block: true,
      items: ['初始'],
      loadMore,
      renderItem: (item) => div(item),
      threshold: 20
    });
    const element = scroll.renderDom();

    scroll.block(false);
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 200 });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(element, 'scrollTop', { configurable: true, value: 100 });
    element.dispatchEvent(new Event('scroll', { bubbles: false }));

    expect(loadMore).toHaveBeenCalledTimes(1);
    expect(scroll.page()).toBe(1);
    expect(element.querySelectorAll('.yoya-vscroll-list > div')).toHaveLength(2);

    scroll.block(true);
    element.dispatchEvent(new Event('scroll', { bubbles: false }));

    expect(loadMore).toHaveBeenCalledTimes(1);
    expect(element.dataset.blocked).toBe('true');
  });

  it('switches between loop and block loading states', () => {
    const scroll = vScroll({ block: true });
    const element = scroll.renderDom();

    expect(scroll.block()).toBe(true);

    scroll.loop(true);

    expect(scroll.loop()).toBe(true);
    expect(scroll.block()).toBe(false);
    expect(element.dataset.loop).toBe('true');
    expect(element.dataset.blocked).toBeUndefined();

    scroll.block(true);

    expect(scroll.block()).toBe(true);
    expect(scroll.loop()).toBe(false);
    expect(element.dataset.loop).toBeUndefined();
  });

  it('appends resolved results and blocks when the handler says so', async () => {
    const scroll = vScroll({
      block: true,
      items: ['A'],
      loadMore: ({ append, block }) => {
        append(['B']);
        block(true);
      },
      renderItem: (item) => div(item)
    });
    const element = scroll.renderDom();

    scroll.block(false);
    await scroll.load();

    expect(scroll.page()).toBe(1);
    expect(element.querySelectorAll('.yoya-vscroll-list > div')).toHaveLength(2);
    expect(scroll.block()).toBe(true);
    expect(element.querySelector('.yoya-vscroll-footer').textContent).toContain('没有更多了');
  });

  it('resets data, page and blocked state', () => {
    const scroll = vScroll({
      block: true,
      items: ['A', 'B'],
      renderItem: (item) => div(item)
    });
    const element = scroll.renderDom();

    scroll.reset();

    expect(scroll.page()).toBe(0);
    expect(scroll.block()).toBe(false);
    expect(scroll.items()).toEqual([]);
    expect(element.querySelectorAll('.yoya-vscroll-list > *')).toHaveLength(0);
  });

  it('registers vScroll as a parent shortcut', () => {
    const page = div((root) => {
      root.vScroll({
        block: true,
        items: ['A'],
        renderItem: (item) => div(item)
      });
    });
    const element = page.renderDom();

    expect(element.querySelector('.yoya-vscroll')).not.toBeNull();
    expect(element.querySelector('.yoya-vscroll-list > div').textContent).toBe('A');
  });
});
