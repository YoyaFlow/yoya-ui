import { describe, expect, it } from 'vitest';
import { div } from '../index.js';

describe('rebuildable region', () => {
  it('rebuilds children from its setup on rerun without duplicating them', () => {
    const rows = ['a'];
    const box = div((ele) => {
      ele.rebuildable();
      rows.forEach((row) => ele.div((item) => item.text(row)));
    });
    const element = box.renderDom();
    const firstChildElement = element.firstElementChild;

    expect(element.textContent).toBe('a');
    expect(element.children.length).toBe(1);

    rows.push('b');
    box.rerun();

    expect(element.textContent).toBe('ab');
    expect(element.children.length).toBe(2);
    expect(box.renderDom()).toBe(element);
    expect(firstChildElement.parentNode).toBeNull();
  });

  it('keeps region siblings untouched', () => {
    const sibling = div('sibling');
    const box = div((ele) => {
      ele.rebuildable();
      ele.text('region');
    });
    const host = div((ele) => {
      ele.child(sibling);
      ele.child(box);
    });
    const hostElement = host.renderDom();
    const siblingElement = sibling.renderDom();

    box.rerun();

    expect(hostElement.firstElementChild).toBe(siblingElement);
    expect(siblingElement.textContent).toBe('sibling');
    expect(hostElement.lastElementChild.textContent).toBe('region');
  });

  it('keeps the previous content when the setup throws', () => {
    let fail = false;
    const box = div((ele) => {
      ele.rebuildable();
      ele.text(fail ? 'broken' : 'ok');
      if (fail) {
        throw new Error('builder failed');
      }
    });
    const element = box.renderDom();

    fail = true;

    expect(() => box.rerun()).toThrow('builder failed');
    expect(element.textContent).toBe('ok');
    expect(box.children().length).toBe(1);
  });

  it('rejects rebuildable() without a setup builder and rerun() without marking', () => {
    expect(() => div().rebuildable()).toThrow(/setup builder/);
    expect(() => div().rerun()).toThrow(/rebuildable\(\)/);
  });

  it('skips rebuild while the predicate is false and records the pending rebuild', () => {
    let allow = false;
    let sequence = 1;
    const box = div((ele) => {
      ele.rebuildable(() => allow);
      ele.text(`v${sequence}`);
    });
    const element = box.renderDom();

    sequence = 2;
    box.rerun();

    expect(element.textContent).toBe('v1');
    expect(box.regionPending()).toBe(true);

    allow = true;
    box.rerun();

    expect(element.textContent).toBe('v2');
    expect(box.regionPending()).toBe(false);
  });

  it('lets force bypass the predicate', () => {
    let sequence = 1;
    const box = div((ele) => {
      ele.rebuildable(() => false);
      ele.text(`v${sequence}`);
    });
    const element = box.renderDom();

    sequence = 2;
    box.rerun({ force: true });

    expect(element.textContent).toBe('v2');
    expect(box.regionPending()).toBe(false);
  });

  it('re-runs keyed children without duplicate key errors', () => {
    const rows = ['k1'];
    const box = div((ele) => {
      ele.rebuildable();
      rows.forEach((row) => ele.addChild(row, div(row)));
    });
    const element = box.renderDom();

    expect(() => box.rerun()).not.toThrow();
    expect(element.textContent).toBe('k1');
    expect(element.children.length).toBe(1);
  });
});
