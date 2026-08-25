import { describe, expect, it, vi } from 'vitest';
import { VMenu, VNavbar, div, vNavbar } from '../index.js';

describe('vNavbar', () => {
  it('renders a horizontal navigation bar with brand, menu, and actions', () => {
    const clicked = vi.fn();
    const navbar = vNavbar({
      ariaLabel: '产品主导航',
      menuContent(menu) {
        menu.vMenuItem((item) => {
          item.id('navbar-home');
          item.text('概览');
          item.active(true);
        });
        menu.vMenuItem((item) => item.text('组件'));
      },
      title: 'yoya-ui',
      subtitle: '设计系统',
      actions(actions) {
        actions.vButton((button) => {
          button.label('登录');
          button.variant('primary');
          button.on('click', clicked);
        });
      }
    });

    const element = navbar.renderDom();
    const menu = element.querySelector('.yoya-vnavbar-menu');
    const items = element.querySelectorAll('.yoya-vmenu-item');

    expect(navbar).toBeInstanceOf(VNavbar);
    expect(navbar.menuContent()).toBeInstanceOf(VMenu);
    expect(element.tagName).toBe('NAV');
    expect(element.getAttribute('role')).toBe('navigation');
    expect(element.getAttribute('aria-label')).toBe('产品主导航');
    expect(element.querySelector('.yoya-vnavbar-brand').textContent).toBe('yoya-ui设计系统');
    expect(menu.getAttribute('role')).toBe('menubar');
    expect(menu.dataset.orientation).toBe('horizontal');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('aria-current')).toBe('page');
    expect(items[0].classList.contains('yoya-vmenu-item')).toBe(true);
    expect(element.querySelector('.yoya-vnavbar-actions .yoya-vbutton-label').textContent).toBe(
      '登录'
    );

    element.querySelector('.yoya-vnavbar-actions button').click();

    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('registers navbar as a parent shortcut and keeps horizontal menu separators', () => {
    const page = div((root) => {
      root.vNavbar((navbar) => {
        navbar.ariaLabel('工作台导航');
        navbar.brand((brand) => {
          brand.strong('控制台');
          brand.span('Workspace');
        });
        navbar.menuContent((menu) => {
          menu.vMenuItem('概览');
          menu.vMenuDivider();
          menu.vMenuItem('文档');
        });
      });
    });

    const element = page.renderDom();

    expect(element.querySelector('.yoya-vnavbar')).not.toBeNull();
    expect(element.querySelector('.yoya-vnavbar-brand').textContent).toBe('控制台Workspace');
    expect(element.querySelector('.yoya-vnavbar-menu').dataset.orientation).toBe('horizontal');
    expect(element.querySelector('.yoya-vnavbar-menu').getAttribute('role')).toBe('menubar');
    expect(element.querySelector('.yoya-vmenu-divider').getAttribute('aria-orientation')).toBe(
      'vertical'
    );
  });

  it('centers labels in horizontal navbar menu items', () => {
    const navbar = vNavbar((root) => {
      root.title('yoya-ui');
      root.menuContent((menu) => {
        menu.vMenuItem('概览');
        menu.vMenuItem('组件');
      });
    });

    const element = navbar.renderDom();
    const item = element.querySelector('.yoya-vnavbar-menu .yoya-vmenu-item');

    expect(item.classList.contains('yoya-vmenu-item')).toBe(true);
    expect(element.querySelector('.yoya-vnavbar-menu').dataset.orientation).toBe('horizontal');
  });

  it('keeps custom brand content when subtitle is also configured', () => {
    const navbar = vNavbar({
      brand(brand) {
        brand.strong('控制台');
      },
      subtitle: 'Workspace',
      menuContent(menu) {
        menu.vMenuItem('概览');
      }
    });

    const element = navbar.renderDom();

    expect(element.querySelector('.yoya-vnavbar-brand-custom').style.display).toBe('');
    expect(element.querySelector('.yoya-vnavbar-brand').textContent).toBe('控制台');
  });

  it('uses polished top bar defaults for height, shadow, brand divider, and actions', () => {
    const navbar = vNavbar({
      title: 'yoya-ui',
      menuContent(menu) {
        menu.vMenuItem('概览');
        menu.vMenuItem('组件');
      },
      actions(actions) {
        actions.vButton('登录');
      }
    });

    const element = navbar.renderDom();
    const brand = element.querySelector('.yoya-vnavbar-brand');
    const actions = element.querySelector('.yoya-vnavbar-actions');

    expect(element.classList.contains('yoya-vnavbar')).toBe(true);
    expect(actions.classList.contains('yoya-vnavbar-actions')).toBe(true);
    expect(brand.style.borderRight).toContain('1px solid');
    expect(brand.style.borderRight).toContain('var(--yoya-color-border-faint');
  });

  it('omits the brand divider until brand content is configured', () => {
    const navbar = vNavbar({
      menuContent(menu) {
        menu.vMenuItem('概览');
      }
    });

    const element = navbar.renderDom();
    const brand = element.querySelector('.yoya-vnavbar-brand');

    expect(brand.style.borderRight).toBe('');

    navbar.brand((customBrand) => {
      customBrand.strong('控制台');
    });

    expect(brand.style.borderRight).toContain('1px solid');
    expect(brand.style.borderRight).toContain('var(--yoya-color-border-faint');
  });
});
