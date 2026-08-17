import { describe, expect, it } from 'vitest';
import * as yoya from '../index.js';

const htmlElementFactories = [
  ['a', 'a'],
  ['abbr', 'abbr'],
  ['address', 'address'],
  ['area', 'area'],
  ['article', 'article'],
  ['aside', 'aside'],
  ['audio', 'audio'],
  ['b', 'b'],
  ['base', 'base'],
  ['bdi', 'bdi'],
  ['bdo', 'bdo'],
  ['blockquote', 'blockquote'],
  ['body', 'body'],
  ['br', 'br'],
  ['button', 'button'],
  ['canvas', 'canvas'],
  ['caption', 'caption'],
  ['cite', 'cite'],
  ['code', 'code'],
  ['col', 'col'],
  ['colgroup', 'colgroup'],
  ['data', 'data'],
  ['datalist', 'datalist'],
  ['dd', 'dd'],
  ['del', 'del'],
  ['details', 'details'],
  ['dfn', 'dfn'],
  ['dialog', 'dialog'],
  ['div', 'div'],
  ['dl', 'dl'],
  ['dt', 'dt'],
  ['em', 'em'],
  ['embed', 'embed'],
  ['fieldset', 'fieldset'],
  ['figcaption', 'figcaption'],
  ['figure', 'figure'],
  ['footer', 'footer'],
  ['form', 'form'],
  ['h1', 'h1'],
  ['h2', 'h2'],
  ['h3', 'h3'],
  ['h4', 'h4'],
  ['h5', 'h5'],
  ['h6', 'h6'],
  ['head', 'head'],
  ['header', 'header'],
  ['hgroup', 'hgroup'],
  ['hr', 'hr'],
  ['html', 'html'],
  ['i', 'i'],
  ['iframe', 'iframe'],
  ['img', 'img'],
  ['input', 'input'],
  ['ins', 'ins'],
  ['kbd', 'kbd'],
  ['label', 'label'],
  ['legend', 'legend'],
  ['li', 'li'],
  ['link', 'link'],
  ['main', 'main'],
  ['map', 'map'],
  ['mark', 'mark'],
  ['menu', 'menu'],
  ['meta', 'meta'],
  ['meter', 'meter'],
  ['nav', 'nav'],
  ['noscript', 'noscript'],
  ['object', 'object'],
  ['ol', 'ol'],
  ['optgroup', 'optgroup'],
  ['option', 'option'],
  ['output', 'output'],
  ['p', 'p'],
  ['picture', 'picture'],
  ['pre', 'pre'],
  ['progress', 'progress'],
  ['q', 'q'],
  ['rp', 'rp'],
  ['rt', 'rt'],
  ['ruby', 'ruby'],
  ['s', 's'],
  ['samp', 'samp'],
  ['script', 'script'],
  ['search', 'search'],
  ['section', 'section'],
  ['select', 'select'],
  ['selectedcontent', 'selectedcontent'],
  ['slot', 'slot'],
  ['small', 'small'],
  ['source', 'source'],
  ['span', 'span'],
  ['strong', 'strong'],
  ['style', 'style'],
  ['sub', 'sub'],
  ['summary', 'summary'],
  ['sup', 'sup'],
  ['table', 'table'],
  ['tbody', 'tbody'],
  ['td', 'td'],
  ['template', 'template'],
  ['textarea', 'textarea'],
  ['tfoot', 'tfoot'],
  ['th', 'th'],
  ['thead', 'thead'],
  ['time', 'time'],
  ['title', 'title'],
  ['tr', 'tr'],
  ['track', 'track'],
  ['u', 'u'],
  ['ul', 'ul'],
  ['varTag', 'var'],
  ['video', 'video'],
  ['wbr', 'wbr']
];

const voidElementNames = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr'
];

const childShortcutFactories = htmlElementFactories.map(([exportName, tagName]) => [
  exportName === 'style' ? 'styleTag' : exportName,
  tagName
]);

describe('HTML element factories', () => {
  it('exports factories for all conforming HTML elements', () => {
    htmlElementFactories.forEach(([exportName, tagName]) => {
      const factory = yoya[exportName];

      expect(factory, `${exportName} factory`).toBeTypeOf('function');
      expect(factory().tagName()).toBe(tagName);
      expect(factory().renderDom().tagName.toLowerCase()).toBe(tagName);
    });
  });

  it('registers every HTML factory as a parent shortcut method', () => {
    const root = yoya.div((page) => {
      childShortcutFactories.forEach(([methodName, tagName]) => {
        page[methodName](tagName === 'var' ? 'x' : null);
      });
    });

    expect(root.children().map((child) => child.tagName())).toEqual(
      childShortcutFactories.map(([, tagName]) => tagName)
    );
    expect(root.style('display', 'grid').style('display')).toBe('grid');
    expect(yoya.styleTag().tagName()).toBe('style');
    expect(root.toHTML()).toContain('<var>x</var>');
  });

  it('serializes all HTML void elements without closing tags', () => {
    voidElementNames.forEach((tagName) => {
      expect(yoya[tagName]('ignored').toHTML()).toBe(`<${tagName}>`);
    });
  });
});
