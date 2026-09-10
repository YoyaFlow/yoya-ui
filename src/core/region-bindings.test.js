import { describe, expect, it } from 'vitest';
import { div } from '../index.js';

describe('rebuildable region bindings', () => {
  it('flushes region bindings while the predicate refuses a rebuild', () => {
    const data = { count: 1 };
    let allow = false;
    const box = div((ele) => {
      ele.rebuildable(() => allow);
      ele.attr('data-count', () => String(data.count));
      ele.text('stable');
    });
    const element = box.renderDom();

    expect(element.getAttribute('data-count')).toBe('1');

    data.count = 2;
    box.rerun();

    expect(element.getAttribute('data-count')).toBe('2');
    expect(element.textContent).toBe('stable');
    expect(box.regionPending()).toBe(true);

    allow = true;
    box.rerun();

    expect(box.regionPending()).toBe(false);
    expect(element.getAttribute('data-count')).toBe('2');
  });

  it('keeps focus when values are flushed and loses it only on a real rebuild', () => {
    const data = { label: 'first' };
    let allow = false;
    const box = div((ele) => {
      ele.rebuildable(() => allow);
      ele.input((field) => {
        field.attr('data-label', () => data.label);
      });
    });
    const element = box.renderDom();
    const fieldElement = element.querySelector('input');

    document.body.appendChild(element);
    fieldElement.focus();
    expect(document.activeElement).toBe(fieldElement);

    data.label = 'second';
    box.rerun();

    expect(document.activeElement).toBe(fieldElement);
    expect(fieldElement.getAttribute('data-label')).toBe('second');

    allow = true;
    box.rerun();

    expect(document.activeElement).not.toBe(fieldElement);
    element.remove();
  });

  it('releases the previous bindings and never duplicates them', () => {
    const data = { count: 1 };
    const box = div((ele) => {
      ele.rebuildable();
      ele.div((row) => {
        row.attr('data-count', () => String(data.count));
      });
    });
    const element = box.renderDom();
    const previousChild = box.children()[0];
    const initialBindings = box._regionScope.bindings.length;

    data.count = 2;
    box.rerun();

    expect(box._regionScope.bindings.length).toBe(initialBindings);
    expect(previousChild._deleted).toBe(true);
    expect(element.firstElementChild.getAttribute('data-count')).toBe('2');
  });

  it('does not leak bindings from a failed rebuild', () => {
    let fail = false;
    const box = div((ele) => {
      ele.rebuildable();
      ele.div((row) => row.attr('data-x', () => 'x'));
      if (fail) {
        throw new Error('builder failed');
      }
    });
    box.renderDom();
    const initialBindings = box._regionScope.bindings.length;
    expect(initialBindings).toBeGreaterThan(0);
    fail = true;

    expect(() => box.rerun()).toThrow('builder failed');
    expect(box._regionScope.bindings.length).toBe(initialBindings);
  });
});
