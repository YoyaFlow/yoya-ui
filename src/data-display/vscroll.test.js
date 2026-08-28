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
    expect(element.dataset.virtual).toBeUndefined();
    expect(element.querySelectorAll('.yoya-vscroll-list > div')).toHaveLength(2);
    expect(element.textContent).toContain('A');
    expect(element.textContent).toContain('B');
  });

  it('forces virtual mode when enabled explicitly', () => {
    const scroll = vScroll({
      items: ['A'],
      renderItem: (item) => div(item),
      virtual: true
    });
    const element = scroll.renderDom();

    expect(scroll.virtual()).toBe(true);
    expect(element.dataset.virtual).toBe('true');
    expect(element.querySelectorAll('.yoya-vscroll-virtual-item')).toHaveLength(1);
  });

  it('virtualizes large item lists and keeps a real scroll height', () => {
    const items = Array.from({ length: 1000 }, (_, index) => `项目 ${index}`);
    const scroll = vScroll({
      block: true,
      itemHeight: 40,
      items,
      overscan: 2,
      renderItem: (item) => div(item)
    });
    const element = scroll.renderDom();

    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 200 });
    Object.defineProperty(element, 'scrollTop', { configurable: true, value: 0 });
    element.dispatchEvent(new Event('scroll', { bubbles: false }));

    let wrappers = element.querySelectorAll('.yoya-vscroll-list > .yoya-vscroll-virtual-item');

    expect(element.dataset.virtual).toBe('true');
    expect(scroll.itemHeight()).toBe(40);
    expect(scroll.overscan()).toBe(2);
    expect(wrappers).toHaveLength(6);
    expect(wrappers[0].dataset.index).toBe('0');
    expect(element.querySelector('.yoya-vscroll-list').style.height).toBe('48016px');

    Object.defineProperty(element, 'scrollTop', { configurable: true, value: 480 });
    element.dispatchEvent(new Event('scroll', { bubbles: false }));

    wrappers = element.querySelectorAll('.yoya-vscroll-list > .yoya-vscroll-virtual-item');
    expect(wrappers).toHaveLength(9);
    expect(wrappers[0].dataset.index).toBe('7');
    expect(wrappers[wrappers.length - 1].dataset.index).toBe('15');

    const html = scroll.toHTML();
    expect(html.match(/yoya-vscroll-virtual-item/g)).toHaveLength(1000);
    expect(html).toContain('项目 999');

    scroll.virtual(false);

    expect(element.dataset.virtual).toBeUndefined();
    expect(element.querySelectorAll('.yoya-vscroll-list > div')).toHaveLength(1000);
  });

  it('virtualizes appended data without rendering every row', () => {
    const scroll = vScroll({
      block: true,
      itemHeight: 30,
      items: ['A'],
      overscan: 2,
      renderItem: (item) => div(item)
    });
    const element = scroll.renderDom();

    scroll.append(Array.from({ length: 100 }, (_, index) => `第 ${index + 2} 项`));

    expect(scroll.items()).toHaveLength(101);
    expect(element.querySelectorAll('.yoya-vscroll-virtual-item')).toHaveLength(2);
    expect(element.querySelector('.yoya-vscroll-virtual-item').getAttribute('aria-setsize')).toBe(
      '101'
    );
    expect(element.querySelector('.yoya-vscroll-list').style.height).toBe('3854px');
  });

  it('keeps static content non-virtualized', () => {
    const scroll = vScroll((scroller) => {
      scroller.content((list) => {
        list.div('A');
        list.div('B');
      });
    });
    const element = scroll.renderDom();

    expect(element.dataset.virtual).toBeUndefined();
    expect(element.querySelectorAll('.yoya-vscroll-list > div')).toHaveLength(2);
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
