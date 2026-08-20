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
  responsiveGrid,
  spacer,
  stack,
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
