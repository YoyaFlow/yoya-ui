import { describe, expect, it, vi } from 'vitest';
import * as yoya from '../index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const svgElementFactories = [
  ['circle', 'circle'],
  ['clipPath', 'clipPath'],
  ['defs', 'defs'],
  ['desc', 'desc'],
  ['ellipse', 'ellipse'],
  ['filter', 'filter'],
  ['foreignObject', 'foreignObject'],
  ['g', 'g'],
  ['image', 'image'],
  ['line', 'line'],
  ['linearGradient', 'linearGradient'],
  ['marker', 'marker'],
  ['mask', 'mask'],
  ['metadata', 'metadata'],
  ['path', 'path'],
  ['pattern', 'pattern'],
  ['polygon', 'polygon'],
  ['polyline', 'polyline'],
  ['radialGradient', 'radialGradient'],
  ['rect', 'rect'],
  ['set', 'set'],
  ['stop', 'stop'],
  ['a', 'a'],
  ['script', 'script'],
  ['style', 'style'],
  ['switch', 'switch'],
  ['text', 'text'],
  ['title', 'title'],
  ['symbol', 'symbol'],
  ['textPath', 'textPath'],
  ['tspan', 'tspan'],
  ['use', 'use'],
  ['view', 'view']
];

describe('SVG element factories', () => {
  it('exports svg as the only public SVG tag entry', () => {
    const icon = yoya.svg();
    const element = icon.renderDom();
    const svgOnlyFactoryNames = svgElementFactories
      .map(([factoryName]) => factoryName)
      .filter((factoryName) => !['a', 'script', 'style', 'text', 'title'].includes(factoryName));

    expect(yoya.svg).toBeTypeOf('function');
    expect(icon.tagName()).toBe('svg');
    expect(element.namespaceURI).toBe(SVG_NS);
    expect(element.tagName).toBe('svg');

    svgOnlyFactoryNames.forEach((exportName) => {
      expect(yoya[exportName], `${exportName} should stay scoped to svg nodes`).toBeUndefined();
    });

    expect(yoya.a().tagName()).toBe('a');
    expect(yoya.script().tagName()).toBe('script');
    expect(yoya.style().tagName()).toBe('style');
    expect(yoya.title().tagName()).toBe('title');
    expect(yoya.text('plain').textContent()).toBe('plain');
  });

  it('builds nested SVG trees through svg-local child methods', () => {
    const icon = yoya.svg((root) => {
      root.className('status-icon');
      root.attr({ viewBox: '0 0 24 24', role: 'img' });
      root.title('服务状态');

      root.defs((defs) => {
        defs.linearGradient((gradient) => {
          gradient.id('status-gradient');
          gradient.stop({ offset: '0%', 'stop-color': '#1f6feb' });
          gradient.stop({ offset: '100%', 'stop-color': '#2da44e' });
        });
      });

      root.g((group) => {
        group.attr('fill', 'none');
        group.circle({ cx: 12, cy: 12, r: 9, stroke: 'url(#status-gradient)' });
        group.path({ d: 'M8 12l2.5 2.5L16 9', stroke: 'currentColor', 'stroke-width': 2 });
        group.text((label) => {
          label.attr({ x: 12, y: 22, 'text-anchor': 'middle' });
          label.text('OK');
        });
      });
    });

    const element = icon.renderDom();

    expect(element.getAttribute('class')).toBe('status-icon');
    expect(element.querySelector('title').namespaceURI).toBe(SVG_NS);
    expect(element.querySelector('linearGradient').namespaceURI).toBe(SVG_NS);
    expect(element.querySelector('circle').getAttribute('stroke')).toBe('url(#status-gradient)');
    expect(element.querySelector('path').getAttribute('stroke-width')).toBe('2');
    expect(element.querySelector('text').textContent).toBe('OK');
  });

  it('uses original SVG tag names without inheriting HTML child factories', () => {
    const icon = yoya.svg((root) => {
      root.title('SVG title');
      root.text('SVG text');
      root.style('.status-text { font-weight: 700; }');
      root.a((link) => {
        link.attr('href', '#details');
        link.text((label) => {
          label.attr({ x: 4, y: 18 });
          label.text('Details');
        });
      });
      root.script('console.log("svg scope")');
      root.switch((branch) => {
        branch.g();
      });
    });

    const children = icon.children();

    expect(children.map((child) => child.tagName())).toEqual(['title', 'text', 'style', 'a', 'script', 'switch']);
    expect(children[0].textContent()).toBe('SVG title');
    expect(children[1].textContent()).toBe('SVG text');
    expect(children[2].textContent()).toBe('.status-text { font-weight: 700; }');
    expect(children[3].children()[0].tagName()).toBe('text');
    expect(icon.div).toBeUndefined();
    expect(icon.button).toBeUndefined();
  });

  it('keeps SVG attrs, styles, events, and HTML serialization aligned', () => {
    const handleClick = vi.fn();
    let mark = null;
    const icon = yoya.svg((root) => {
      root.circle((circle) => {
        mark = circle;
        circle.className('metric-point');
        circle.attr({ cx: 10, cy: 12, r: 5 });
        circle.style('fill', 'red');
        circle.on('click', handleClick);
      });
    });

    icon.renderDom();
    const element = mark.renderDom();
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    mark.className('active');
    mark.attr('r', 8);
    mark.style('fill', 'blue');

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(element.getAttribute('class')).toBe('metric-point active');
    expect(element.getAttribute('r')).toBe('8');
    expect(element.style.fill).toBe('blue');
    expect(mark.toHTML()).toBe(
      '<circle class="metric-point active" cx="10" cy="12" r="8" style="fill:blue"></circle>'
    );
  });

  it('adds only the svg tag shortcut to HTML parent nodes', () => {
    const root = yoya.div((page) => {
      page.style('display', 'grid');
      page.title('HTML title');
      page.svg((icon) => {
        icon.title('SVG title');
        icon.text('SVG text');
      });
    });

    const [htmlTitle, icon] = root.children();

    expect(root.style('display')).toBe('grid');
    expect(root.circle).toBeUndefined();
    expect(root.path).toBeUndefined();
    expect(yoya.text('plain').textContent()).toBe('plain');
    expect(yoya.title('HTML').tagName()).toBe('title');
    expect(yoya.switch).toBeUndefined();
    expect(htmlTitle.tagName()).toBe('title');
    expect(icon.children().map((child) => child.tagName())).toEqual(['title', 'text']);
  });
});
