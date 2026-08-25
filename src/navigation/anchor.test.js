import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VAnchor, VAnchorItem, div, vAnchor } from '../index.js';

describe('vAnchor', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders a semantic anchor list with links', () => {
    const anchor = vAnchor({
      ariaLabel: '文档目录',
      items: [
        { href: '#start', title: '开始' },
        { href: '#api', title: 'API' }
      ],
      offset: 24
    });
    const element = anchor.renderDom();
    const items = element.querySelectorAll('.yoya-vanchor-item');

    expect(anchor).toBeInstanceOf(VAnchor);
    expect(element.tagName).toBe('NAV');
    expect(element.getAttribute('aria-label')).toBe('文档目录');
    expect(element.dataset.offset).toBe('24');
    expect(items).toHaveLength(2);
    expect(anchor.items()[0]).toBeInstanceOf(VAnchorItem);
    expect(items[0].querySelector('a').textContent).toBe('开始');
    expect(items[0].querySelector('a').getAttribute('href')).toBe('#start');

    anchor.destroy();
  });

  it('supports declarative callbacks and nested anchor items', () => {
    const anchor = vAnchor((root) => {
      root.ariaLabel('文档目录');
      root.offset(16);
      root.vAnchorItem((item) => {
        item.title('基础');
        item.href('#base');
        item.nested((sub) => {
          sub.vAnchorItem({ href: '#base-api', title: 'API' });
          sub.vAnchorItem({ href: '#base-events', title: '事件' });
        });
      });
      root.vAnchorItem(['自定义', '#custom']);
    });
    const element = anchor.renderDom();
    const visibleChildren = [...element.querySelectorAll('.yoya-vanchor-children')].filter(
      (node) => node.style.display !== 'none'
    );

    expect(element.querySelectorAll('.yoya-vanchor-item')).toHaveLength(4);
    expect(visibleChildren).toHaveLength(1);
    expect(element.querySelector('.yoya-vanchor-children .yoya-vanchor-link').textContent).toBe(
      'API'
    );

    anchor.destroy();
  });

  it('marks the active anchor and supports manual active changes', () => {
    const anchor = vAnchor({
      items: [
        { href: '#a', title: 'A' },
        { href: '#b', title: 'B' }
      ]
    });
    anchor.active('#b');
    const element = anchor.renderDom();
    const items = element.querySelectorAll('.yoya-vanchor-item');

    expect(anchor.active()).toBe('#b');
    expect(items[1].dataset.active).toBe('true');
    expect(items[1].getAttribute('aria-current')).toBe('true');

    anchor.active('#a');

    expect(items[0].dataset.active).toBe('true');
    expect(items[1].dataset.active).toBeUndefined();

    anchor.destroy();
  });

  it('scrolls to the target and activates the clicked anchor', () => {
    const originalScrollTo = window.scrollTo;
    const scrollTo = vi.fn();
    const page = div((root) => {
      root.section((section) => {
        section.id('section-a');
        section.style('height', '320px');
      });
      root.section((section) => {
        section.id('section-b');
        section.style('height', '320px');
      });
      root.vAnchor((anchor) => {
        anchor.offset(20);
        anchor.vAnchorItem({ href: '#section-a', title: 'A' });
        anchor.vAnchorItem({ href: '#section-b', title: 'B' });
      });
    });
    const anchor = page.children().find((child) => child instanceof VAnchor);
    const element = page.renderDom();
    document.body.appendChild(element);
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });

    element.querySelectorAll('.yoya-vanchor-link')[1].click();

    expect(anchor.active()).toBe('#section-b');
    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: expect.any(Number) });

    Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalScrollTo });
    page.destroy();
  });

  it('replaces items and registers anchor factories as parent shortcuts', () => {
    const page = div((root) => {
      root.vAnchor((anchor) => {
        anchor.vAnchorItem('A');
      });
    });
    const anchor = page.children()[0];

    expect(anchor).toBeInstanceOf(VAnchor);
    anchor.items([
      { href: '#x', title: 'X' },
      { href: '#y', title: 'Y' }
    ]);
    const element = page.renderDom();

    expect(element.querySelectorAll('.yoya-vanchor-item')).toHaveLength(2);
    expect(element.textContent).toContain('X');
    expect(element.textContent).toContain('Y');

    page.destroy();
  });

  it('tracks the active anchor from scroll positions', () => {
    const page = div((root) => {
      root.section((section) => {
        section.id('section-a');
        section.style('height', '320px');
      });
      root.section((section) => {
        section.id('section-b');
        section.style('height', '320px');
      });
      root.vAnchor((anchor) => {
        anchor.offset(20);
        anchor.vAnchorItem({ href: '#section-a', title: 'A' });
        anchor.vAnchorItem({ href: '#section-b', title: 'B' });
      });
    });
    const anchor = page.children().find((child) => child instanceof VAnchor);
    const element = page.renderDom();
    document.body.appendChild(element);
    const sections = element.querySelectorAll('section');

    vi.spyOn(sections[0], 'getBoundingClientRect').mockReturnValue({ top: -200 });
    vi.spyOn(sections[1], 'getBoundingClientRect').mockReturnValue({ top: 120 });
    window.dispatchEvent(new Event('scroll'));

    expect(anchor.active()).toBe('#section-a');

    vi.spyOn(sections[1], 'getBoundingClientRect').mockReturnValue({ top: -40 });
    window.dispatchEvent(new Event('scroll'));

    expect(anchor.active()).toBe('#section-b');

    page.destroy();
  });
});
