import { afterEach, describe, expect, it } from 'vitest';
import { div, installSignals, ref } from '../index.js';

afterEach(() => {
  installSignals(null);
});

describe('signal-driven regions', () => {
  it('rebuilds the region when a tracked signal changes', () => {
    const rows = ref(['a']);
    const list = div((el) => {
      el.rebuildable();
      rows.value.forEach((row) => el.div(row));
    });
    const element = list.renderDom();
    const firstChild = element.firstChild;

    expect(element.children).toHaveLength(1);

    rows.value = ['a', 'b'];

    expect(element.children).toHaveLength(2);
    expect(element.textContent).toBe('ab');
    expect(element.firstChild).not.toBe(firstChild);
  });

  it('does not subscribe before the region is rendered', () => {
    const rows = ref(['a']);
    const list = div((el) => {
      el.rebuildable();
      rows.value.forEach((row) => el.div(row));
    });

    rows.value = ['a', 'b'];

    expect(list.toHTML()).toBe('<div><div>a</div></div>');
  });

  it('ignores signals that the region did not read', () => {
    const other = ref(0);
    const rows = ref(['a']);
    const root = div((el) => {
      el.attr('data-other', other);
      el.div((list) => {
        list.rebuildable();
        rows.value.forEach((row) => list.div(row));
      });
    });
    const element = root.renderDom();
    const region = root._children[0];
    const regionChild = region._el.firstChild;

    other.value = 1;

    expect(region._el.firstChild).toBe(regionChild);
    expect(element.getAttribute('data-other')).toBe('1');
  });

  it('lets the rebuild predicate defer structure changes', () => {
    const busy = ref(true);
    const count = ref(1);
    const list = div((el) => {
      el.rebuildable(() => !busy.value);
      el.span(String(count.value));
    });
    list.renderDom();

    count.value = 2;

    expect(list.textContent()).toBe('1');
    expect(list.rebuildPending()).toBe(true);

    busy.value = false;
    list.rebuild();

    expect(list.textContent()).toBe('2');
  });

  it('stops rebuilding after the region is destroyed', () => {
    const rows = ref(['a']);
    const list = div((el) => {
      el.rebuildable();
      rows.value.forEach((row) => el.div(row));
    });
    list.renderDom();
    expect(list._regionSubs.length).toBeGreaterThan(0);

    list.destroy();

    expect(list._regionSubs).toHaveLength(0);

    rows.value = ['a', 'b'];

    expect(list.children()).toHaveLength(0);
  });

  it('refreshes the tracked dependencies on each rebuild', () => {
    const useFirst = ref(true);
    const first = ref('one');
    const second = ref('two');
    const list = div((el) => {
      el.rebuildable();
      el.span(useFirst.value ? first.value : second.value);
    });
    list.renderDom();

    expect(list.textContent()).toBe('one');

    useFirst.value = false;
    expect(list.textContent()).toBe('two');

    second.value = 'TWO';
    expect(list.textContent()).toBe('TWO');

    first.value = 'ONE';
    expect(list.textContent()).toBe('TWO');
  });
});
