import { describe, expect, it } from 'vitest';
import { center, container, divider, div, flex, grid, hstack, spacer, stack, vstack } from '../index.js';

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
});
