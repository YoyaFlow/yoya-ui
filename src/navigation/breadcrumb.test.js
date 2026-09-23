import { describe, expect, it } from 'vitest';
import { div, hasComponentIdentity, ref, span, vBreadcrumb, vBreadcrumbItem } from '../index.js';

const ITEM = "[vn~='VBreadcrumbItem']";
const LINK = "[vn~='VBreadcrumbLink']";
const CURRENT = "[vn~='VBreadcrumbCurrent']";
const SEPARATOR = "[vn~='VBreadcrumbSeparator']";

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
    const items = element.querySelectorAll(ITEM);

    expect(hasComponentIdentity(breadcrumb, 'VBreadcrumb')).toBe(true);
    expect(element.tagName).toBe('NAV');
    expect(element.getAttribute('aria-label')).toBe('服务导航');
    expect(element.dataset.separator).toBe('/');
    expect(element.dataset.itemCount).toBe('3');
    expect(element.querySelector('ol')).not.toBeNull();
    expect(items).toHaveLength(3);
    // 有地址又不是当前项 = 链接位；当前项 = 文本位（两块的显隐由 `[data-mode]` 规则给）
    expect(items[0].dataset.mode).toBe('link');
    expect(items[0].querySelector(LINK).textContent).toBe('控制台');
    expect(items[0].querySelector(LINK).getAttribute('href')).toBe('#/console');
    expect(items[1].querySelector(LINK).textContent).toBe('服务列表');
    expect(items[2].dataset.mode).toBe('text');
    expect(items[2].querySelector(CURRENT).textContent).toBe('api-gateway');
    expect(items[2].querySelector(LINK).hasAttribute('href')).toBe(false);
    expect(items[2].getAttribute('aria-current')).toBe('page');
    expect(items[2].dataset.current).toBe('true');
    expect(items[0].querySelector(SEPARATOR).textContent).toBe('/');
    // 最后一项的分隔符由 `[vn~='VBreadcrumbItem']:last-child > [vn~='VBreadcrumbSeparator']` 规则隐掉
    expect(items[2].querySelector(SEPARATOR)).not.toBeNull();
  });

  it('supports declarative callbacks and vBreadcrumbItem shortcuts', () => {
    const breadcrumb = vBreadcrumb((root) => {
      root.ariaLabel('后台导航');
      root.separator('›');
      root.vBreadcrumbItem((item) => {
        item.label('控制台');
        item.href('/console');
      });
      root.vBreadcrumbItem({ href: '/deploy', label: '部署任务' });
      root.vBreadcrumbItem((item) => {
        item.label('发布');
        item.active(true);
      });
    });
    const element = breadcrumb.renderDom();
    const items = element.querySelectorAll(ITEM);
    const links = [...items].filter((item) => item.dataset.mode === 'link');

    expect(breadcrumb.items()).toHaveLength(3);
    expect(links).toHaveLength(2);
    expect(element.querySelector(`${ITEM}[data-current='true']`).textContent).toContain('发布');
  });

  it('switches links to current text when active changes', () => {
    const first = vBreadcrumbItem({ href: '/console', label: '控制台' });
    const second = vBreadcrumbItem({ active: true, label: '服务详情' });
    const breadcrumb = vBreadcrumb({ children: [first, second] });
    const element = breadcrumb.renderDom();
    const items = element.querySelectorAll(ITEM);

    expect(items[0].dataset.mode).toBe('link');
    expect(items[1].dataset.mode).toBe('text');

    first.active(true);
    second.active(false);
    second.href('/services');

    expect(items[0].dataset.mode).toBe('text');
    expect(items[0].querySelector(CURRENT).textContent).toBe('控制台');
    expect(items[1].dataset.mode).toBe('link');
    expect(items[1].querySelector(LINK).getAttribute('href')).toBe('/services');
    expect(items[1].hasAttribute('aria-current')).toBe(false);
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
    expect(element.querySelectorAll(ITEM)).toHaveLength(2);
    expect(element.querySelector('a').textContent).toBe('工作台');

    breadcrumb.separator(' / ');

    expect(element.dataset.separator).toBe(' / ');
    expect(element.querySelector(SEPARATOR).textContent).toBe(' / ');

    // `null` / 空串都回落到默认分隔符（与迁移前同口径）
    breadcrumb.separator(null);

    expect(breadcrumb.separator()).toBe('›');
    expect(element.dataset.separator).toBe('›');
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

    expect(hasComponentIdentity(breadcrumb, 'VBreadcrumb')).toBe(true);
    expect(element.querySelector("[vn~='VBreadcrumb']")).not.toBeNull();
    expect(element.querySelectorAll(ITEM)).toHaveLength(2);
  });

  it('keeps prop handles live and mirrors state on attributes', () => {
    const label = ref('初始层级');
    const href = ref('/start');
    const active = ref(false);
    const separator = ref('/');
    const item = vBreadcrumbItem({ active, href, label });
    const breadcrumb = vBreadcrumb({ items: [item], separator });
    const element = breadcrumb.renderDom();
    const li = element.querySelector(ITEM);

    expect(li.dataset.mode).toBe('link');
    expect(li.querySelector(LINK).textContent).toBe('初始层级');
    expect(li.querySelector(LINK).getAttribute('href')).toBe('/start');

    // 句柄 props 是活值：写状态就落 DOM（链接位与当前位两端都跟）
    label.value = '已更新';
    href.value = '/next';
    separator.value = '·';

    expect(li.querySelector(LINK).textContent).toBe('已更新');
    expect(li.querySelector(LINK).getAttribute('href')).toBe('/next');
    expect(li.querySelector(CURRENT).textContent).toBe('已更新');
    expect(li.querySelector(SEPARATOR).textContent).toBe('·');
    expect(element.dataset.separator).toBe('·');

    active.value = true;

    expect(li.dataset.mode).toBe('text');
    expect(li.dataset.current).toBe('true');
    expect(li.getAttribute('aria-current')).toBe('page');
    // 地址照旧留在链接位上（迁移前也只切显隐，不摘 href；隐藏的链接位由 CSS 移出渲染树）
    expect(li.querySelector(LINK).getAttribute('href')).toBe('/next');

    breadcrumb.destroy();
  });

  it('reconciles the level list by identity instead of rebuilding it', () => {
    const first = vBreadcrumbItem({ label: '一级' });
    const second = vBreadcrumbItem({ href: '/two', label: '二级' });
    const breadcrumb = vBreadcrumb({ items: [first] });
    const element = breadcrumb.renderDom();
    const firstLi = element.querySelector(ITEM);

    first.label('一级（改）');
    breadcrumb.vBreadcrumbItem(second);

    const items = breadcrumb.items();
    const lis = element.querySelectorAll(ITEM);

    // 留下来的项还挂在原来的节点与 DOM 上（不重建、不整段重排）
    expect(items[0]).toBe(first);
    expect(items[1]).toBe(second);
    expect(lis[0]).toBe(firstLi);
    expect(lis[0].querySelector(CURRENT).textContent).toBe('一级（改）');
    expect(element.dataset.itemCount).toBe('2');

    // 整批替换：同一个项实例复用，离场的销毁
    breadcrumb.items([first]);

    expect(breadcrumb.items()).toHaveLength(1);
    expect(element.querySelector(ITEM)).toBe(firstLi);
    expect(element.dataset.itemCount).toBe('1');

    breadcrumb.destroy();
  });

  it('takes node labels from props and rejects them in the content commands', () => {
    const item = vBreadcrumbItem({ href: '/node', label: span('节点文案') });
    const element = item.renderDom();

    // 节点只能挂一处：落进构建期可见的那个盒（这里是链接位）
    expect(element.querySelector(LINK).textContent).toBe('节点文案');
    expect(() => item.label(span('其它'))).toThrow(/props\.label/);

    item.destroy();
  });

  it('renders anonymous child content without counting it as a level', () => {
    const breadcrumb = vBreadcrumb((root) => {
      root.vBreadcrumbItem('显式层级');
      root.child(vBreadcrumbItem({ label: '匿名层级' }));
    });
    const element = breadcrumb.renderDom();

    // 匿名投递照旧落进列表（不丢弃、不改落包装层），但不进层级账
    expect(element.querySelectorAll(ITEM)).toHaveLength(2);
    expect(element.dataset.itemCount).toBe('1');
    expect(breadcrumb.items()).toHaveLength(1);
  });
});
