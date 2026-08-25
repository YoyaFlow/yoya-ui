import { describe, expect, it } from 'vitest';
import { VBreadcrumb, div, vBreadcrumb, vBreadcrumbItem } from '../index.js';

describe('vBreadcrumb', () => {
  it('renders a semantic breadcrumb with links, separators, and the current page', () => {
    const breadcrumb = vBreadcrumb({
      ariaLabel: '服务导航',
      separator: '/',
      items: [
        { href: '#/console', label: '控制台' },
        { href: '#/services', label: '服务列表' },
        { active: true, label: 'api-gateway' }
      ]
    });
    const element = breadcrumb.renderDom();
    const items = element.querySelectorAll('.yoya-vbreadcrumb-item');

    expect(breadcrumb).toBeInstanceOf(VBreadcrumb);
    expect(element.tagName).toBe('NAV');
    expect(element.getAttribute('aria-label')).toBe('服务导航');
    expect(element.dataset.separator).toBe('/');
    expect(element.querySelector('ol')).not.toBeNull();
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('a').textContent).toBe('控制台');
    expect(items[0].querySelector('a').getAttribute('href')).toBe('#/console');
    expect(items[1].querySelector('a').textContent).toBe('服务列表');
    expect(items[2].querySelector('.yoya-vbreadcrumb-current').textContent).toBe('api-gateway');
    expect(items[2].getAttribute('aria-current')).toBe('page');
    expect(items[2].dataset.current).toBe('true');
    expect(items[0].querySelector('.yoya-vbreadcrumb-separator').textContent).toBe('/');
    expect(items[2].querySelector('.yoya-vbreadcrumb-separator').style.display).toBe('none');
    expect(items[2].querySelector('a').style.display).toBe('none');
  });

  it('supports declarative callbacks and vBreadcrumbItem shortcuts', () => {
    const breadcrumb = vBreadcrumb((root) => {
      root.ariaLabel('后台导航');
      root.separator('›');
      root.vBreadcrumbItem((item) => {
        item.label('控制台');
        item.href('/console');
      });
      root.vBreadcrumbItem(['部署任务', '/deploy']);
      root.vBreadcrumbItem((item) => {
        item.label('发布');
        item.active(true);
      });
    });
    const element = breadcrumb.renderDom();
    const visibleLinks = [...element.querySelectorAll('a')].filter(
      (link) => link.style.display !== 'none'
    );

    expect(breadcrumb.items()).toHaveLength(3);
    expect(visibleLinks).toHaveLength(2);
    expect(
      element.querySelector('.yoya-vbreadcrumb-item[data-current="true"]').textContent
    ).toContain('发布');
  });

  it('switches links to current text when active changes', () => {
    const first = vBreadcrumbItem({ href: '/console', label: '控制台' });
    const second = vBreadcrumbItem({ active: true, label: '服务详情' });
    const breadcrumb = vBreadcrumb({ children: [first, second] });
    const element = breadcrumb.renderDom();
    const items = element.querySelectorAll('.yoya-vbreadcrumb-item');

    expect(items[1].querySelector('a').style.display).toBe('none');
    expect(items[1].querySelector('.yoya-vbreadcrumb-current').style.display).not.toBe('none');

    first.active(true);
    second.active(false);
    second.href('/services');

    expect(items[0].querySelector('.yoya-vbreadcrumb-current').style.display).not.toBe('none');
    expect(items[1].querySelector('a').getAttribute('href')).toBe('/services');
    expect(items[1].querySelector('a').style.display).not.toBe('none');
  });

  it('replaces items and updates the separator and item count', () => {
    const breadcrumb = vBreadcrumb({ items: ['首页', '列表'] });

    breadcrumb.items([
      { href: '/workbench', label: '工作台' },
      { active: true, label: '当前' }
    ]);
    const element = breadcrumb.renderDom();

    expect(element.dataset.itemCount).toBe('2');
    expect(breadcrumb.items()).toHaveLength(2);
    expect(element.querySelectorAll('.yoya-vbreadcrumb-item')).toHaveLength(2);
    expect(element.querySelector('a').textContent).toBe('工作台');

    breadcrumb.separator(' / ');

    expect(element.dataset.separator).toBe(' / ');
    expect(element.querySelector('.yoya-vbreadcrumb-separator').textContent).toBe(' / ');
  });

  it('registers breadcrumb factories as parent shortcuts', () => {
    const page = div((root) => {
      root.vBreadcrumb((breadcrumb) => {
        breadcrumb.vBreadcrumbItem('首页');
        breadcrumb.vBreadcrumbItem({ active: true, label: '设置' });
      });
    });
    const element = page.renderDom();
    const breadcrumb = page.children()[0];

    expect(breadcrumb).toBeInstanceOf(VBreadcrumb);
    expect(element.querySelector('.yoya-vbreadcrumb')).not.toBeNull();
    expect(element.querySelectorAll('.yoya-vbreadcrumb-item')).toHaveLength(2);
  });
});
