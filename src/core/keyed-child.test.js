import { describe, expect, it } from 'vitest';
import { div } from '../index.js';

describe('keyed children', () => {
  it('stores children by key and mirrors data-row-key on element children', () => {
    const list = div();
    const first = div().attr('data-id', 'a');

    list.addChild('u1', first);
    list.addChild('u2', div());
    list.addChild('t1', 'hello');

    expect(list.getChild('u1')).toBe(first);
    expect(list.getChild('t1').textContent()).toBe('hello');

    const element = list.renderDom();

    expect(element.childNodes.length).toBe(3);
    expect(element.children[0].getAttribute('data-row-key')).toBe('u1');
    expect(element.children[1].getAttribute('data-row-key')).toBe('u2');
  });

  it('rejects duplicate keys', () => {
    const list = div();

    list.addChild('u1', div());

    expect(() => list.addChild('u1', div())).toThrow(/duplicate key/i);
  });

  it('removes keyed children from the tree and the DOM', () => {
    const list = div();
    const first = div().attr('data-id', 'a');

    list.addChild('u1', first);
    list.addChild('u2', div());
    const element = list.renderDom();

    list.removeChild('u1');

    expect(list.getChild('u1')).toBeNull();
    expect(list.children()).not.toContain(first);
    expect(element.querySelector('[data-row-key="u1"]')).toBeNull();
    expect(element.children.length).toBe(1);
  });
});
