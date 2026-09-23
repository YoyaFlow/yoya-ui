import { describe, expect, it } from 'vitest';
import { hasComponentIdentity, ref, vMasonry } from '../index.js';

const MASONRY = "[vn~='VMasonry']";

const customProp = (element, name) => element.style.getPropertyValue(name);

describe('vMasonry', () => {
  it('renders a masonry container with columns and gap', () => {
    const masonry = vMasonry((node) => {
      node.div('A');
      node.div('B');
      node.div('C');
      node.div('D');
    });
    const element = masonry.renderDom();

    expect(hasComponentIdentity(masonry, 'VMasonry')).toBe(true);
    expect(element.getAttribute('vn')).toContain('VMasonry');
    // 列几何走 CSS 变量 + `yoya.ui.css` 的规则（JS 不写行内样式）
    expect(element.style.columnCount).toBe('');
    expect(customProp(element, '--yoya-masonry-columns')).toBe('3');
    expect(customProp(element, '--yoya-masonry-gap')).toBe('16px');
    expect(element.dataset.columns).toBe('3');
    expect(element.children.length).toBe(4);
  });

  it('updates column count and gap', () => {
    const masonry = vMasonry().columns(2).gap(24);
    const element = masonry.renderDom();

    expect(masonry.columns()).toBe(2);
    expect(masonry.gap()).toBe(24);
    expect(element.dataset.columns).toBe('2');
    expect(customProp(element, '--yoya-masonry-columns')).toBe('2');
    expect(customProp(element, '--yoya-masonry-gap')).toBe('24px');
  });

  it('switches to responsive column width mode', () => {
    const masonry = vMasonry({ minColumnWidth: 240 });
    const element = masonry.renderDom();

    expect(masonry.minColumnWidth()).toBe(240);
    expect(element.dataset.columnMode).toBe('responsive');
    expect(customProp(element, '--yoya-masonry-column-width')).toBe('240px');
    expect(element.style.columnCount).toBe('');

    masonry.minColumnWidth(null);

    expect(element.hasAttribute('data-column-mode')).toBe(false);
    expect(customProp(element, '--yoya-masonry-column-width')).toBe('auto');
  });

  it('keeps prop handles live', () => {
    const columns = ref(2);
    const gap = ref(12);
    const masonry = vMasonry({ columns, gap });
    const element = masonry.renderDom();

    expect(customProp(element, '--yoya-masonry-columns')).toBe('2');

    columns.value = 4;
    gap.value = 20;

    expect(element.dataset.columns).toBe('4');
    expect(customProp(element, '--yoya-masonry-columns')).toBe('4');
    expect(customProp(element, '--yoya-masonry-gap')).toBe('20px');

    masonry.destroy();
  });

  it('serializes deterministically for SSR', () => {
    const html = vMasonry({ children: '内容' }).toHTML();

    expect(html).toContain('vn="VMasonry"');
    expect(html).toContain('内容');
    expect(html).not.toContain('yoya-vmasonry');
    expect(MASONRY).toContain('VMasonry');
  });
});
