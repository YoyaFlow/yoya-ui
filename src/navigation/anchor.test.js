import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { div, hasComponentIdentity, ref, span, vAnchor, vAnchorItem } from '../index.js';

const ITEM = '[vn~="VAnchorItem"]';
const LINK = '[vn~="VAnchorLink"]';
const CHILDREN = '[vn~="VAnchorChildren"]';

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
    const items = element.querySelectorAll(ITEM);

    expect(hasComponentIdentity(anchor, 'VAnchor')).toBe(true);
    expect(element.tagName).toBe('NAV');
    expect(element.getAttribute('aria-label')).toBe('文档目录');
    expect(element.dataset.offset).toBe('24');
    expect(items).toHaveLength(2);
    expect(hasComponentIdentity(anchor.items()[0], 'VAnchorItem')).toBe(true);
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
      root.vAnchorItem({ href: '#custom', title: '自定义' });
    });
    const element = anchor.renderDom();
    // 空子列表由 CSS `:empty` 规则隐藏，这里按"有没有子项"数
    const visibleChildren = [...element.querySelectorAll(CHILDREN)].filter(
      (node) => node.childElementCount > 0
    );

    expect(element.querySelectorAll(ITEM)).toHaveLength(4);
    expect(visibleChildren).toHaveLength(1);
    expect(element.querySelector(`${CHILDREN} ${LINK}`).textContent).toBe('API');
    expect(element.querySelector(`${LINK}[href="#custom"]`).textContent).toBe('自定义');

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
    const items = element.querySelectorAll(ITEM);

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
    const anchor = page.children().find((child) => hasComponentIdentity(child, 'VAnchor'));
    const element = page.renderDom();
    document.body.appendChild(element);
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });

    element.querySelectorAll(LINK)[1].click();

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

    expect(hasComponentIdentity(anchor, 'VAnchor')).toBe(true);
    anchor.items([
      { href: '#x', title: 'X' },
      { href: '#y', title: 'Y' }
    ]);
    const element = page.renderDom();

    expect(element.querySelectorAll(ITEM)).toHaveLength(2);
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
    const anchor = page.children().find((child) => hasComponentIdentity(child, 'VAnchor'));
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

  it('keeps prop handles live and mirrors state on attributes', () => {
    const title = ref('开始');
    const href = ref('#start');
    const offset = ref(16);
    const active = ref(null);
    const anchor = vAnchor({
      activeHref: active,
      items: [{ href, title }],
      offset
    });
    const element = anchor.renderDom();
    const link = element.querySelector(LINK);
    const item = anchor.items()[0];

    expect(element.dataset.itemCount).toBe('1');
    expect(element.dataset.offset).toBe('16');
    expect(link.textContent).toBe('开始');
    expect(link.getAttribute('href')).toBe('#start');

    // 句柄 props 是活值：写状态就落 DOM（读值绑定，不是构建期快照）
    title.value = '基础用法';
    href.value = '#basic';
    offset.value = 24;
    active.value = '#basic';

    expect(link.textContent).toBe('基础用法');
    expect(link.getAttribute('href')).toBe('#basic');
    expect(element.dataset.offset).toBe('24');
    expect(element.dataset.activeHref).toBe('#basic');
    expect(item.attr('data-active')).toBe('true');

    anchor.destroy();
  });

  it('pushes the current anchor down into nested items', () => {
    const anchor = vAnchor((root) => {
      root.vAnchorItem((item) => {
        item.title('基础');
        item.href('#base');
        item.nested((sub) => sub.vAnchorItem({ href: '#api', title: 'API' }));
      });
    });
    anchor.active('#api');
    const element = anchor.renderDom();
    const items = element.querySelectorAll(ITEM);

    // 项账归造它的一方：导航推给项、项推给子项（容器态因此能到嵌套层）
    expect(items).toHaveLength(2);
    expect(items[0].dataset.active).toBeUndefined();
    expect(items[1].dataset.active).toBe('true');
    expect(anchor.items()[0].items()[0].href()).toBe('#api');

    anchor.active('#base');

    expect(items[0].dataset.active).toBe('true');
    expect(items[1].dataset.active).toBeUndefined();

    anchor.destroy();
  });

  it('takes node titles from props and rejects them in the title command', () => {
    const item = vAnchorItem({ href: '#api', title: span('节点标题') });
    const element = item.renderDom();

    expect(element.querySelector(LINK).textContent).toBe('节点标题');
    expect(() => item.title(span('其它'))).toThrow(/props\.title/);

    item.destroy();
  });

  it('accepts a single item value and mirrors the child state bit', () => {
    const anchor = vAnchor((root) => {
      root.items('#only');
      root.vAnchorItem({
        href: '#base',
        nested: [{ href: '#api', title: 'API' }],
        title: '基础'
      });
    });
    const element = anchor.renderDom();
    const items = element.querySelectorAll(ITEM);

    expect(element.dataset.itemCount).toBe('2');
    expect(items[0].querySelector(LINK).textContent).toBe('#only');
    expect(items[0].dataset.hasChildren).toBeUndefined();
    expect(items[1].dataset.hasChildren).toBe('true');
    expect(anchor.items()[1].items()).toHaveLength(1);

    anchor.destroy();
  });

  it('still accepts children as the item-list alias', () => {
    const anchor = vAnchor({ children: [{ href: '#legacy', title: '旧键' }] });
    const element = anchor.renderDom();

    expect(element.dataset.itemCount).toBe('1');
    expect(element.querySelector(LINK).getAttribute('href')).toBe('#legacy');

    anchor.destroy();
  });
});
