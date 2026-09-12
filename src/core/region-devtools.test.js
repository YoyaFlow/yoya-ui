import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { div, ref } from '../index.js';
import { disableDevtools, enableDevtools, subscribeDevtools } from './devtools.js';

describe('rebuildable region devtools events', () => {
  let events = [];
  let unsubscribe = null;

  beforeEach(() => {
    disableDevtools();
    events = [];
    enableDevtools();
    unsubscribe = subscribeDevtools((event) => {
      if (event.type === 'region') {
        events.push(event);
      }
    });
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    disableDevtools();
  });

  it('reports manual rebuilds and value-only flushes', () => {
    const data = { n: 1 };
    let allow = false;
    const box = div((ele) => {
      ele.rebuildable(() => allow);
      ele.attr('data-n', () => String(data.n));
    });
    box.renderDom();
    events = [];

    box.rebuild();
    allow = true;
    box.rebuild();

    expect(events.map((event) => [event.action, event.trigger])).toEqual([
      ['flush', 'manual'],
      ['rebuild', 'manual']
    ]);
  });

  it('marks automatic rebuilds with the signal trigger', () => {
    const n = ref(0);
    const region = div((ele) => {
      ele.rebuildable();
      ele.text(`n=${n.value}`);
    });
    region.renderDom();
    events = [];

    n.value = 1;

    expect(events.map((event) => [event.action, event.trigger])).toEqual([['rebuild', 'signal']]);
    expect(events[0].nodeId).toBeTypeOf('number');
  });
});
