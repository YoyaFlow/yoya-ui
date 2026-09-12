import { describe, expect, it } from 'vitest';
import * as yoya from '../index.js';

describe('htmls namespace', () => {
  it('exposes the same factory references as the named exports', () => {
    expect(yoya.htmls.div).toBe(yoya.div);
    expect(yoya.htmls.button).toBe(yoya.button);
    expect(yoya.htmls.span).toBe(yoya.span);
    expect(yoya.htmls.styleTag).toBe(yoya.styleTag);
  });

  it('keeps the <html> tag factory reachable as htmls.html', () => {
    expect(yoya.htmls.html).toBe(yoya.html);
  });

  it('exposes every WHATWG tag factory plus the style alias', () => {
    expect(Object.keys(yoya.htmls).length).toBeGreaterThan(100);
    Object.values(yoya.htmls).forEach((factory) => {
      expect(factory).toBeTypeOf('function');
    });
    expect(yoya.htmls.style).toBeTypeOf('function');
    expect(yoya.htmls.varTag).toBeTypeOf('function');
  });

  it('builds nodes that render like the named factories', () => {
    const node = yoya.htmls.div((root) => root.span('hello'));
    expect(node.toHTML()).toBe('<div><span>hello</span></div>');
  });
});
