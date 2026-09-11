import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { disableDevtools, enableDevtools, subscribeDevtools } from './devtools.js';
import { div } from '../index.js';
import { vStateNode } from './state-node.js';

describe('vStateNode deprecation notice', () => {
  let events = [];
  let unsubscribe = null;

  beforeEach(() => {
    events = [];
    enableDevtools();
    unsubscribe = subscribeDevtools((event) => {
      if (event.type === 'deprecated') {
        events.push(event);
      }
    });
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    disableDevtools();
  });

  it('reports the deprecated api once with its alternative', () => {
    vStateNode({ render: () => div() });
    vStateNode({ render: () => div() });

    expect(events).toHaveLength(1);
    expect(events[0].api).toBe('vStateNode');
    expect(events[0].alternative).toMatch(/ref/);
  });
});
