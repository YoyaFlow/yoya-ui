import { describe, expect, it } from 'vitest';
import * as yoya from '../index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('svg icon library', () => {
  it('exports independent named icon functions', () => {
    expect(yoya.SearchOutlined).toBeTypeOf('function');
    expect(yoya.SettingsOutlined).toBeTypeOf('function');
    expect(yoya.TrashOutlined).toBeTypeOf('function');
    expect(yoya.FolderOpenOutlined).toBeTypeOf('function');
    expect(yoya.SearchOutlined.name).toBe('SearchOutlined');
  });

  it('renders each icon as its own 24x24 stroke svg node', () => {
    const first = yoya.SearchOutlined();
    const second = yoya.SearchOutlined();
    const firstElement = first.renderDom();

    expect(first).not.toBe(second);
    expect(first.tagName()).toBe('svg');
    expect(firstElement.namespaceURI).toBe(SVG_NS);
    expect(firstElement.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(firstElement.getAttribute('fill')).toBe('none');
    expect(firstElement.getAttribute('stroke')).toBe('currentColor');
    expect(firstElement.getAttribute('stroke-width')).toBe('2');
    expect(firstElement.getAttribute('aria-hidden')).toBe('true');
    expect(firstElement.style.width).toBe('24px');
    expect(firstElement.style.height).toBe('24px');
    expect(firstElement.querySelector('circle')).not.toBeNull();

    first.attr('data-marker', 'one');
    expect(second.attr('data-marker')).toBeUndefined();
  });

  it('renders a recognizable trash icon with vertical lines', () => {
    const element = yoya.TrashOutlined().renderDom();
    const paths = Array.from(element.querySelectorAll('path'), (path) => path.getAttribute('d'));

    expect(paths).toContain('M10 10v6');
    expect(paths).toContain('M14 10v6');
  });

  it('keeps SVG icon children scoped to the svg node', () => {
    expect(yoya.div().HomeOutlined).toBeUndefined();

    const page = yoya.div((root) => {
      root.child(yoya.HomeOutlined());
    });
    const icon = page.renderDom().querySelector('svg');

    expect(icon).not.toBeNull();
    expect(icon.namespaceURI).toBe(SVG_NS);
  });
});
