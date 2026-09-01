import { describe, expect, it } from 'vitest';
import { VMasonry, vMasonry } from '../index.js';

describe('vMasonry', () => {
  it('renders a masonry container with columns and gap', () => {
    const masonry = vMasonry((node) => {
      node.div('A');
      node.div('B');
      node.div('C');
      node.div('D');
    });
    const element = masonry.renderDom();

    expect(masonry).toBeInstanceOf(VMasonry);
    expect(element.classList.contains('yoya-vmasonry')).toBe(true);
    expect(element.style.columnCount).toBe('3');
    expect(element.style.columnGap).toBe('16px');
    expect(element.children.length).toBe(4);
  });

  it('updates column count and gap', () => {
    const masonry = vMasonry().columns(2).gap(24);
    const element = masonry.renderDom();

    expect(element.style.columnCount).toBe('2');
    expect(element.style.columnGap).toBe('24px');
    expect(element.dataset.columns).toBe('2');
  });

  it('switches to responsive column width mode', () => {
    const masonry = vMasonry({ minColumnWidth: 240 });
    const element = masonry.renderDom();

    expect(element.style.columnCount).toBe('auto');
    expect(element.style.columnWidth).toBe('240px');
  });

  it('serializes deterministically for SSR', () => {
    const html = vMasonry({ children: '内容' }).toHTML();

    expect(html).toContain('yoya-vmasonry');
  });
});
