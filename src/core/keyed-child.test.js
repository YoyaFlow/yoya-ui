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

  it('inserts a keyed child before an existing key', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('c', div('C'));

    const returned = list.insertBefore('b', div('B'), 'a');

    expect(returned).toBe(list);
    expect(list.children().map((child) => child.textContent())).toEqual(['B', 'A', 'C']);
  });

  it('inserts into rendered DOM at the anchored position', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('c', div('C'));
    const element = list.renderDom();

    list.insertBefore('b', div('B'), 'c');

    expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B', 'C']);
  });

  it('appends when beforeKey is null and rejects unknown or duplicate keys', () => {
    const list = div();
    list.addChild('a', div('A'));

    list.insertBefore('z', div('Z'), null);
    expect(list.children().map((child) => child.textContent())).toEqual(['A', 'Z']);
    expect(() => list.insertBefore('q', div('Q'), 'missing')).toThrow(/insertBefore\(\)/);
    expect(() => list.insertBefore('a', div('A2'))).toThrow(/duplicate key/i);
  });

  it('inserts a keyed child after an existing key', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('c', div('C'));

    const returned = list.insertAfter('b', div('B'), 'a');

    expect(returned).toBe(list);
    expect(list.children().map((child) => child.textContent())).toEqual(['A', 'B', 'C']);
  });

  it('inserts into rendered DOM at the anchored position and prepends on null', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('c', div('C'));
    const element = list.renderDom();

    list.insertAfter('b', div('B'), 'a');
    expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B', 'C']);

    list.insertAfter('head', div('H'), null);
    expect([...element.children].map((child) => child.textContent)).toEqual(['H', 'A', 'B', 'C']);
  });

  it('rejects unknown afterKey and duplicate keys', () => {
    const list = div();
    list.addChild('a', div('A'));

    expect(() => list.insertAfter('q', div('Q'), 'missing')).toThrow(/insertAfter\(\)/);
    expect(() => list.insertAfter('a', div('A2'), null)).toThrow(/duplicate key/i);
  });

  it('moves a keyed child before a reference with identity preserved', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('b', div('B'));
    list.addChild('c', div('C'));
    const element = list.renderDom();
    const nodeC = list.getChild('c');

    const returned = list.moveBefore('c', 'a');

    expect(returned).toBe(list);
    expect(list.getChild('c')).toBe(nodeC);
    expect(list.children().map((child) => child.textContent())).toEqual(['C', 'A', 'B']);
    expect([...element.children].map((child) => child.textContent)).toEqual(['C', 'A', 'B']);
    expect(element.children[0]).toBe(nodeC._el);
  });

  it('moves a keyed child to the end when beforeKey is null', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('b', div('B'));
    list.addChild('c', div('C'));
    const element = list.renderDom();

    list.moveBefore('a', null);

    expect([...element.children].map((child) => child.textContent)).toEqual(['B', 'C', 'A']);
  });

  it('moves a keyed child after a reference and to the start on null', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('b', div('B'));
    list.addChild('c', div('C'));
    const element = list.renderDom();
    const nodeA = list.getChild('a');

    list.moveAfter('a', 'c');
    expect([...element.children].map((child) => child.textContent)).toEqual(['B', 'C', 'A']);
    expect(element.children[2]).toBe(nodeA._el);

    list.moveAfter('a', null);
    expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B', 'C']);
  });

  it('treats self references as no-ops and validates inputs', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('b', div('B'));

    const before = list.moveBefore('a', 'a');
    expect(before.children().map((child) => child.textContent())).toEqual(['A', 'B']);
    expect(
      list
        .moveAfter('b', 'b')
        .children()
        .map((child) => child.textContent())
    ).toEqual(['A', 'B']);
    expect(() => list.moveBefore('missing', 'a')).toThrow(/moveBefore\(\)/);
    expect(() => list.moveAfter('a', 'missing')).toThrow(/moveAfter\(\)/);
  });

  it('replaces a keyed child at the same slot without disturbing siblings', () => {
    const list = div();
    list.addChild('a', div('A'));
    list.addChild('b', div('B-old'));
    list.addChild('c', div('C'));
    const element = list.renderDom();
    const nodeA = list.getChild('a');
    const nodeC = list.getChild('c');

    const returned = list.replaceChild('b', div('B-new'));

    expect(returned).toBe(list);
    expect(list.getChild('b').textContent()).toBe('B-new');
    expect(list.getChild('a')).toBe(nodeA);
    expect(list.getChild('c')).toBe(nodeC);
    expect(list.children().map((child) => child.textContent())).toEqual(['A', 'B-new', 'C']);
    expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B-new', 'C']);
  });

  it('rejects unknown keys for replacement', () => {
    const list = div();

    expect(() => list.replaceChild('missing', div('X'))).toThrow(/replaceChild\(\)/);
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
