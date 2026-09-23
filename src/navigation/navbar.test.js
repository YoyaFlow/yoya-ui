import { describe, expect, it, vi } from 'vitest';
import { div, hasComponentIdentity, ref, span, vNavbar } from '../index.js';

const NAVBAR = "[vn~='VNavbar']";
const BRAND = "[vn~='VNavbarBrand']";
const TITLE = "[vn~='VNavbarBrandTitle']";

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
    const menu = element.querySelector("[vn~='VMenu']");
    const items = element.querySelectorAll("[vn~='VMenuItem']");

    expect(hasComponentIdentity(navbar, 'VNavbar')).toBe(true);
    expect(hasComponentIdentity(navbar.menuContent(), 'VMenu')).toBe(true);
    expect(element.tagName).toBe('NAV');
    expect(element.getAttribute('role')).toBe('navigation');
    expect(element.getAttribute('aria-label')).toBe('产品主导航');
    expect(menu.getAttribute('aria-label')).toBe('产品主导航菜单');
    expect(menu.dataset.orientation).toBe('horizontal');
    expect(menu.getAttribute('role')).toBe('menubar');
    // 标题 / 副标题按内容条件挂载（迁移前 CSS 的 display: none 会让它们永远看不见，见 16 号第 85 条）
    expect(element.querySelector(TITLE).textContent).toBe('yoya-ui');
    expect(element.querySelector("[vn~='VNavbarBrandSubtitle']").textContent).toBe('设计系统');
    expect(element.querySelector(BRAND).textContent).toBe('yoya-ui设计系统');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('aria-current')).toBe('page');
    expect(
      // 按钮族还没做属性化迁移（单独一刀），标签位暂时还是类名
      element.querySelector("[vn~='VNavbarActions'] .yoya-vbutton-label").textContent
    ).toBe('登录');

    element.querySelector("[vn~='VNavbarActions'] button").click();

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
    const menu = element.querySelector("[vn~='VMenu']");

    expect(element.querySelector(NAVBAR)).not.toBeNull();
    expect(element.querySelector(BRAND).textContent).toBe('控制台Workspace');
    expect(menu.dataset.orientation).toBe('horizontal');
    expect(menu.getAttribute('role')).toBe('menubar');
    expect(element.querySelector("[vn~='VMenuDivider']").getAttribute('aria-orientation')).toBe(
      'vertical'
    );
  });

  it('switches to the custom brand box and back, and draws the divider only with brand content', () => {
    const navbar = vNavbar({
      menuContent(menu) {
        menu.vMenuItem('概览');
      }
    });
    const element = navbar.renderDom();
    const brand = element.querySelector(BRAND);

    expect(element.querySelector("[vn~='VNavbarBrandDefault']")).not.toBeNull();
    expect(element.querySelector("[vn~='VNavbarBrandCustom']")).toBeNull();
    expect(brand.hasAttribute('data-divider')).toBe(false);

    navbar.brand((customBrand) => {
      customBrand.strong('控制台');
    });

    expect(brand.textContent).toBe('控制台');
    expect(brand.dataset.divider).toBe('true');
    expect(element.querySelector("[vn~='VNavbarBrandCustom']")).not.toBeNull();
    expect(element.querySelector("[vn~='VNavbarBrandDefault']")).toBeNull();

    // `brand(null)` = 回到默认品牌；默认盒里没有内容，分割线随之摘掉
    navbar.brand(null);

    expect(element.querySelector("[vn~='VNavbarBrandDefault']")).not.toBeNull();
    expect(element.querySelector("[vn~='VNavbarBrandCustom']")).toBeNull();
    expect(brand.hasAttribute('data-divider')).toBe(false);
  });

  it('keeps title / subtitle props live and rejects node content in the commands', () => {
    const title = ref('yoya-ui');
    const subtitle = ref('Workspace');
    const navbar = vNavbar({ subtitle, title });
    const element = navbar.renderDom();

    expect(element.querySelector(TITLE).textContent).toBe('yoya-ui');
    expect(element.querySelector("[vn~='VNavbarBrandSubtitle']").textContent).toBe('Workspace');

    title.value = '运维中心';
    subtitle.value = '不显示了';

    expect(element.querySelector(TITLE).textContent).toBe('运维中心');
    expect(element.querySelector("[vn~='VNavbarBrandSubtitle']").textContent).toBe('不显示了');

    // 空内容 = 那一块条件挂载（离开 DOM）
    subtitle.value = '';

    expect(element.querySelector("[vn~='VNavbarBrandSubtitle']")).toBeNull();
    expect(navbar.subtitle()).toBe('');

    navbar.subtitle('设计系统');

    expect(element.querySelector("[vn~='VNavbarBrandSubtitle']").textContent).toBe('设计系统');
    expect(() => navbar.title(span('节点标题'))).toThrow(/props\.title/);
    expect(() => navbar.subtitle(span('节点副标题'))).toThrow(/props\.subtitle/);

    navbar.destroy();
  });

  it('marks the navbar sticky through the root state attribute', () => {
    const navbar = vNavbar({ title: 'yoya-ui', sticky: true });
    const element = navbar.renderDom();

    expect(element.dataset.sticky).toBe('true');

    navbar.sticky(false);

    expect(element.hasAttribute('data-sticky')).toBe(false);

    navbar.sticky();

    expect(element.dataset.sticky).toBe('true');
  });

  it('keeps aria-label on the root and the inner menu in sync', () => {
    const navbar = vNavbar({ menuContent: (menu) => menu.vMenuItem('概览') });
    const element = navbar.renderDom();

    expect(element.getAttribute('aria-label')).toBe('导航栏');
    expect(element.querySelector("[vn~='VMenu']").getAttribute('aria-label')).toBe('导航栏菜单');

    navbar.ariaLabel('后台导航');

    expect(element.getAttribute('aria-label')).toBe('后台导航');
    expect(element.querySelector("[vn~='VMenu']").getAttribute('aria-label')).toBe('后台导航菜单');
    expect(navbar.ariaLabel()).toBe('后台导航');
  });
});
