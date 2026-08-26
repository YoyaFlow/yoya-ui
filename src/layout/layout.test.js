import { describe, expect, it } from 'vitest';
import {
  center,
  container,
  createVBodyPage,
  divider,
  div,
  flex,
  grid,
  hstack,
  mobileLayout,
  responsiveGrid,
  spacer,
  stack,
  vCol,
  vContainer,
  vMobileLayout,
  vRow,
  vBody,
  vstack
} from '../index.js';

describe('layout components', () => {
  it('creates flex, stack, hstack, vstack, and center layout nodes', () => {
    const toolbar = flex({
      gap: '12px',
      align: 'center',
      justify: 'space-between',
      wrap: true,
      children: [div('left'), div('right')]
    });

    const toolbarElement = toolbar.renderDom();

    expect(toolbar.tagName()).toBe('div');
    expect(toolbarElement.classList.contains('yoya-flex')).toBe(true);
    expect(toolbarElement.style.display).toBe('flex');
    expect(toolbarElement.style.gap).toBe('12px');
    expect(toolbarElement.style.alignItems).toBe('center');
    expect(toolbarElement.style.justifyContent).toBe('space-between');
    expect(toolbarElement.style.flexWrap).toBe('wrap');
    expect(toolbarElement.textContent).toBe('leftright');

    expect(stack({ gap: '8px' }).renderDom().style.flexDirection).toBe('column');
    expect(vstack({ gap: '8px' }).renderDom().style.flexDirection).toBe('column');
    expect(hstack({ gap: '8px' }).renderDom().style.flexDirection).toBe('row');
    expect(center().renderDom().style.alignItems).toBe('center');
    expect(center().renderDom().style.justifyContent).toBe('center');
  });

  it('creates grid, container, spacer, and divider layout nodes', () => {
    const dashboardGrid = grid({
      columns: 3,
      gap: '16px',
      children: [div('A'), div('B'), div('C')]
    });

    const gridElement = dashboardGrid.renderDom();

    expect(gridElement.style.display).toBe('grid');
    expect(gridElement.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(gridElement.style.gap).toBe('16px');

    const shell = container({ maxWidth: '960px', paddingInline: '24px' }).renderDom();
    expect(shell.classList.contains('yoya-container')).toBe(true);
    expect(shell.style.maxWidth).toBe('960px');
    expect(shell.style.marginLeft).toBe('auto');
    expect(shell.style.marginRight).toBe('auto');
    expect(shell.style.paddingLeft).toBe('24px');
    expect(shell.style.paddingRight).toBe('24px');

    expect(spacer().renderDom().style.flexGrow).toBe('1');

    const verticalDivider = divider({ orientation: 'vertical' }).renderDom();
    expect(verticalDivider.getAttribute('role')).toBe('separator');
    expect(verticalDivider.getAttribute('aria-orientation')).toBe('vertical');
    expect(verticalDivider.style.alignSelf).toBe('stretch');
  });

  it('creates a 24-column vRow / vCol grid with gutter and offsets', () => {
    const row = vRow({ gutter: 20, justify: 'space-between', align: 'center' }, (root) => {
      root.vCol({ span: 6, offset: 2 }, (col) => col.text('A'));
      root.vCol({ span: 8, push: 4, pull: 2 }, 'B');
      root.vCol({ span: 24 }, 'C');
    });
    const rowElement = row.renderDom();
    const [a, b, c] = rowElement.children;

    expect(rowElement.classList.contains('yoya-vrow')).toBe(true);
    expect(rowElement.style.display).toBe('flex');
    expect(rowElement.style.flexWrap).toBe('wrap');
    expect(rowElement.style.justifyContent).toBe('space-between');
    expect(rowElement.style.alignItems).toBe('center');

    expect(a.classList.contains('yoya-vcol')).toBe(true);
    expect(parseFloat(a.style.width)).toBeCloseTo(25);
    expect(parseFloat(a.style.marginLeft)).toBeCloseTo(8.333333);
    expect(a.style.paddingLeft).toBe('10px');
    expect(a.style.paddingRight).toBe('10px');

    expect(parseFloat(b.style.width)).toBeCloseTo(33.333333);
    expect(parseFloat(b.style.left)).toBeCloseTo(16.666667);
    expect(parseFloat(b.style.right)).toBeCloseTo(8.333333);
    expect(b.style.position).toBe('relative');

    expect(parseFloat(c.style.width)).toBeCloseTo(100);
  });

  it('registers vRow and vCol as parent shortcuts and serializes for SSR', () => {
    const root = vRow((row) => {
      row.vCol({ span: 12, children: [div('A')] });
    });

    expect(root.children()[0].renderDom().style.width).toBe('50%');
    expect(vRow({ gutter: 16, children: [vCol({ span: 8, offset: 2 }, 'B')] }).toHTML()).toContain(
      'class="yoya-layout yoya-vrow"'
    );
  });

  it('switches vCol spans at Element-style responsive breakpoints and cleans up', () => {
    const originalWidth = window.innerWidth;
    const originalAdd = window.addEventListener;
    const originalRemove = window.removeEventListener;
    const listeners = new Map();
    window.addEventListener = (type, listener) => listeners.set(type, listener);
    window.removeEventListener = (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    };

    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
      const col = vCol({ xs: 12, md: 6, xl: 3 });
      const element = col.renderDom();

      expect(parseFloat(element.style.width)).toBeCloseTo(25);
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
      listeners.get('resize')();
      expect(parseFloat(element.style.width)).toBeCloseTo(50);

      col.destroy();
      expect(listeners.has('resize')).toBe(false);
    } finally {
      window.addEventListener = originalAdd;
      window.removeEventListener = originalRemove;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('creates a container shell with semantic header, aside, main, and footer', () => {
    const shell = vContainer((root) => {
      root.vHeader({ height: 64 }, 'Header');
      root.vMain('Content');
      root.vFooter({ height: 48 }, 'Footer');
    });
    const shellElement = shell.renderDom();

    expect(shellElement.classList.contains('yoya-vcontainer')).toBe(true);
    expect(shellElement.style.flexDirection).toBe('column');
    expect(shellElement.querySelector('header').classList.contains('yoya-vheader')).toBe(true);
    expect(shellElement.querySelector('header').style.height).toBe('64px');
    expect(shellElement.querySelector('main').textContent).toBe('Content');
    expect(shellElement.querySelector('footer').style.height).toBe('48px');

    const rowShell = vContainer((root) => {
      root.vAside({ width: 240 }, 'Nav');
      root.vMain('Workspace');
    });
    const rowShellElement = rowShell.renderDom();

    expect(rowShellElement.style.flexDirection).toBe('row');
    expect(rowShellElement.querySelector('aside').classList.contains('yoya-vaside')).toBe(true);
    expect(rowShellElement.querySelector('aside').style.width).toBe('240px');
    expect(rowShellElement.querySelector('main').textContent).toBe('Workspace');
  });

  it('supports viewport, sticky, fill, and independent scrolling regions', () => {
    const shell = vContainer((root) => {
      root.viewport();
      root.vHeader({ height: 48, sticky: true }, 'Header');
      root.vContainer((body) => {
        body.fill();
        body.vAside({ scrollable: true, width: 200 }, 'Nav');
        body.vMain({ scrollable: true }, 'Content');
      });
    });
    const shellElement = shell.renderDom();
    const bodyElement = shellElement.querySelector('.yoya-vheader').nextElementSibling;
    const aside = bodyElement.querySelector('.yoya-vaside');
    const main = bodyElement.querySelector('.yoya-vmain');

    expect(shellElement.style.height).toContain('100');
    expect(shellElement.style.overflow).toBe('hidden');
    expect(shellElement.querySelector('.yoya-vheader').style.position).toBe('sticky');
    expect(bodyElement.style.flex).toBe('1 1 auto');
    expect(bodyElement.style.overflow).toBe('hidden');
    expect(aside.style.overflow).toBe('auto');
    expect(aside.style.height).toBe('100%');
    expect(main.style.overflow).toBe('auto');
    expect(main.style.height).toBe('100%');
  });

  it('registers layout factories as parent shortcut methods', () => {
    const root = container((page) => {
      page.vstack((body) => {
        body.hstack((row) => {
          row.span('Name');
          row.spacer();
          row.strong('Ada');
        });
        body.divider();
        body.grid({ columns: '1fr 1fr', gap: '10px', children: [div('A'), div('B')] });
      });
    });

    const [body] = root.children();
    const [row, line, cards] = body.children();

    expect(body.renderDom().classList.contains('yoya-vstack')).toBe(true);
    expect(row.renderDom().classList.contains('yoya-hstack')).toBe(true);
    expect(row.children()[1].renderDom().classList.contains('yoya-spacer')).toBe(true);
    expect(line.renderDom().classList.contains('yoya-divider')).toBe(true);
    expect(cards.renderDom().style.gridTemplateColumns).toBe('1fr 1fr');
  });

  it('serializes layout styles for server-rendered HTML', () => {
    const root = flex({ gap: '12px', children: [div('A')] });

    expect(root.toHTML()).toBe(
      '<div class="yoya-layout yoya-flex" style="display:flex; gap:12px"><div>A</div></div>'
    );
  });

  it('creates responsive grids with minimum columns and parent shortcuts', () => {
    const cards = responsiveGrid({
      minColumnWidth: 240,
      gap: '16px',
      children: [div('A'), div('B')]
    });
    const element = cards.renderDom();

    expect(element.classList.contains('yoya-responsive-grid')).toBe(true);
    expect(element.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(240px, 1fr))');
    expect(element.style.gap).toBe('16px');
    expect(element.textContent).toBe('AB');
    expect(
      container((root) => root.responsiveGrid({ minColumnWidth: '18rem' })).children()[0]
    ).toBeDefined();
  });

  it('serializes responsive grid styles consistently for SSR', () => {
    const root = responsiveGrid({ minColumnWidth: '14rem', gap: '12px', children: [div('A')] });

    expect(root.toHTML()).toBe(
      '<div class="yoya-layout yoya-responsive-grid" style="display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(14rem, 1fr))"><div>A</div></div>'
    );
  });

  it('changes responsive grid columns at configured breakpoints and cleans up', () => {
    const originalWidth = window.innerWidth;
    const originalAdd = window.addEventListener;
    const originalRemove = window.removeEventListener;
    const listeners = new Map();
    window.addEventListener = (type, listener) => listeners.set(type, listener);
    window.removeEventListener = (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    };

    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
      const root = responsiveGrid({
        minColumnWidth: 220,
        breakpoints: [
          { minWidth: 600, columns: 2 },
          { minWidth: 1000, columns: 4 }
        ]
      });
      const element = root.renderDom();

      expect(element.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
      listeners.get('resize')();
      expect(element.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');

      root.destroy();
      expect(listeners.has('resize')).toBe(false);
    } finally {
      window.addEventListener = originalAdd;
      window.removeEventListener = originalRemove;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('normalizes object-form responsive grid breakpoints', () => {
    const root = responsiveGrid({ breakpoints: { 600: 2, 1000: 4 } });

    expect(root.breakpoints()).toEqual([
      { minWidth: 600, columns: 2 },
      { minWidth: 1000, columns: 4 }
    ]);
    root.destroy();
  });

  it('switches mobile layout regions between row and column at the breakpoint', () => {
    const originalWidth = window.innerWidth;
    const originalAdd = window.addEventListener;
    const originalRemove = window.removeEventListener;
    const listeners = new Map();
    window.addEventListener = (type, listener) => listeners.set(type, listener);
    window.removeEventListener = (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    };

    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
      const layout = mobileLayout({ breakpoint: 768, asideWidth: 240, mobileGap: 12 }, (shell) => {
        shell.vAside({ width: 180 }, 'Nav');
        shell.vMain('Content');
      });
      const element = layout.renderDom();
      const aside = element.querySelector('.yoya-vaside');
      const main = element.querySelector('.yoya-vmain');

      expect(element.classList.contains('yoya-mobile-layout')).toBe(true);
      expect(element.classList.contains('yoya-vmobile-layout')).toBe(true);
      expect(element.dataset.mobileLayout).toBe('false');
      expect(element.style.flexDirection).toBe('row');
      expect(aside.style.width).toBe('240px');
      expect(main.style.flex).toBe('1 1 auto');

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 });
      listeners.get('resize')();

      expect(element.dataset.mobileLayout).toBe('true');
      expect(element.style.flexDirection).toBe('column');
      expect(element.style.gap).toBe('12px');
      expect(aside.style.position).toBe('fixed');
      expect(aside.style.width).toBe('320px');
      expect(aside.style.maxWidth).toBe('84vw');
      expect(aside.style.transform).toContain('translateX(-100%)');
      expect(aside.getAttribute('aria-hidden')).toBe('true');
      expect(main.style.width).toBe('100%');
      expect(layout.mobile()).toBe(true);

      const toggle = element.querySelector('.yoya-vmobile-layout-toggle');
      const backdrop = element.querySelector('.yoya-vmobile-layout-backdrop');
      expect(toggle.style.display).toBe('inline-flex');
      expect(backdrop.style.display).toBe('none');

      toggle.click();

      expect(element.dataset.asideOpen).toBe('true');
      expect(aside.style.transform).toBe('translateX(0)');
      expect(aside.getAttribute('aria-hidden')).toBeNull();
      expect(backdrop.style.display).toBe('block');

      layout.closeAside();
      expect(backdrop.style.display).toBe('none');
      expect(element.dataset.asideOpen).toBeUndefined();

      layout.drawer(false);
      expect(aside.style.width).toBe('100%');
      expect(aside.style.position).toBe('');
      expect(main.style.width).toBe('');

      layout.destroy();
      expect(listeners.has('resize')).toBe(false);
    } finally {
      window.addEventListener = originalAdd;
      window.removeEventListener = originalRemove;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('supports mobile direction, viewport, safe area, and the vMobileLayout alias', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 480 });
    const layout = mobileLayout({
      breakpoint: 900,
      direction: 'row',
      mobileDirection: 'column-reverse',
      gap: 8,
      mobileGap: 16,
      viewport: true,
      safeArea: true
    });
    const element = layout.renderDom();

    expect(element.dataset.mobileLayout).toBe('true');
    expect(element.style.flexDirection).toBe('column-reverse');
    expect(element.style.gap).toBe('16px');
    expect(element.style.height).toContain('100');
    expect(layout._safeArea).toBe(true);

    layout.safeArea(false).viewport(false).breakpoint(500).direction('row', 'column');

    expect(element.style.height).toBe('');
    expect(element.style.flexDirection).toBe('column');
    const alias = vMobileLayout({ breakpoint: 640 });
    const aliasElement = alias.renderDom();
    expect(aliasElement.classList.contains('yoya-mobile-layout')).toBe(true);
    expect(aliasElement.classList.contains('yoya-vmobile-layout')).toBe(true);
    layout.destroy();
    alias.destroy();
  });

  it('creates a page body with stable surface and content hooks', () => {
    const page = vBody({
      background: '#eef2ff',
      gap: '20px',
      maxWidth: 960,
      padding: '24px',
      children: [div('Header'), div('Content')]
    });
    const element = page.renderDom();
    const content = element.querySelector('.yoya-vbody-content');

    expect(element.classList.contains('yoya-vbody')).toBe(true);
    expect(element.getAttribute('data-page-body')).toBe('true');
    expect(element.style.background).toBe('rgb(238, 242, 255)');
    expect(element.style.padding).toBe('24px');
    expect(content.style.maxWidth).toBe('960px');
    expect(content.style.gap).toBe('20px');
    expect(content.textContent).toBe('HeaderContent');
    expect(
      container((root) => root.vBody('Local'))
        .children()[0]
        .renderDom().textContent
    ).toBe('Local');
  });

  it('serializes page body styles for server rendering', () => {
    expect(vBody({ maxWidth: '72rem', children: div('Page') }).toHTML()).toContain(
      'class="yoya-layout yoya-vbody"'
    );
    expect(vBody({ maxWidth: '72rem', children: div('Page') }).toHTML()).toContain(
      'class="yoya-vbody-content"'
    );
    expect(vBody({ maxWidth: '72rem', children: div('Page') }).toHTML()).toContain(
      'max-width:72rem'
    );
  });

  it('mounts vBody locally and only uses document.body through the explicit page entry', () => {
    document.body.innerHTML = '<div id="existing"></div><div id="local"></div>';

    vBody('Local page').bindTo('#local');
    const fullPage = createVBodyPage('Full page');

    expect(document.querySelector('#existing')).not.toBeNull();
    expect(document.querySelector('#local .yoya-vbody-content').textContent).toBe('Local page');
    expect(document.body.lastElementChild).toBe(fullPage.renderDom());
    expect(document.body.lastElementChild.textContent).toBe('Full page');
  });
});
