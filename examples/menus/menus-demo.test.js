import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const pagePath = resolve('examples/menus/index.html');

describe('standalone menus example', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('provides a standalone page with object-component demos and generated source', async () => {
    expect(existsSync(pagePath)).toBe(true);

    const html = readFileSync(pagePath, 'utf8');
    const modulePath = './menus-demo.js';
    const { menuDemoComponents, renderMenusExample } = await import(/* @vite-ignore */ modulePath);
    const { navigationCategory } = await import('../components/demos/navigation.js');
    const context = {
      toast: { error() {}, info() {}, success() {}, warning() {} }
    };

    document.body.innerHTML = '<main id="app"></main>';
    const root = renderMenusExample('#app');

    expect(html).toContain('<title>yoya-ui 菜单组件演示</title>');
    expect(html).toContain('src="./menus-demo.js"');
    expect(menuDemoComponents).toBe(navigationCategory.demos);
    expect(menuDemoComponents).toHaveLength(4);
    menuDemoComponents.forEach(({ component }) => {
      const instance = component(context);
      expect(typeof instance.render).toBe('function');
      expect(component.toString()).toMatch(
        new RegExp(`function ${component.name}\\([^)]*\\)\\s*{[\\s\\S]*return\\s*{\\s*render\\(\\)`)
      );
    });

    expect(root.commit().id).toBe('menus-demo');
    expect(document.querySelectorAll('[data-menu-example]')).toHaveLength(4);
    document.querySelectorAll('[data-menu-example]').forEach((example) => {
      const [preview, source] = example.children;

      expect(example.children).toHaveLength(2);
      expect(preview.hasAttribute('data-menu-preview')).toBe(true);
      expect(source.querySelector('[data-source-example]')).not.toBeNull();
    });
    expect(document.querySelectorAll('[data-source-example]')).toHaveLength(4);
    expect(document.querySelector('.yoya-vmenu-group')).not.toBeNull();
    expect(document.querySelector('.yoya-vmenu-divider')).not.toBeNull();
    expect(document.querySelector('.yoya-vsubmenu')).not.toBeNull();
    expect(document.querySelector('.yoya-vdropdown-menu')).not.toBeNull();
    expect(document.querySelector('.yoya-vcontext-menu')).not.toBeNull();
    expect(document.querySelector('.yoya-vsidebar')).not.toBeNull();
    expect(document.body.textContent).toContain('命令菜单');
    expect(document.body.textContent).toContain('嵌套菜单');
    expect(document.body.textContent).toContain('浮层菜单');
    expect(document.body.textContent).toContain('后台侧栏');

    const sources = Array.from(
      document.querySelectorAll('[data-source-example]'),
      (source) => source.textContent
    ).join('\n');
    expect(sources).toContain('menu.vMenuGroup');
    expect(sources).toContain('menu.vMenuDivider');
    expect(sources).toContain('menu.vSubMenu');
    expect(sources).toContain('body.vSidebar');

    expect(html).toContain(
      '.menu-example {\n        display: grid;\n        grid-template-columns: 1fr;'
    );
    expect(html).toContain(
      '.source-panel {\n        display: grid;\n        box-sizing: border-box;'
    );
  });
});
