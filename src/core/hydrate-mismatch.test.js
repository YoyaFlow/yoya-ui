import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { disableDevtools, enableDevtools, subscribeDevtools } from './devtools.js';
import { div } from '../index.js';
import { hydrate } from './ssr.js';

describe('hydration mismatch observability', () => {
  let events = [];
  let unsubscribe = null;

  beforeEach(() => {
    events = [];
    enableDevtools();
    unsubscribe = subscribeDevtools((event) => {
      if (event.type === 'hydrate-mismatch') {
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

  it('reports a tag mismatch before replacing the server node', () => {
    const target = document.createElement('div');
    target.innerHTML = '<span>server</span>';
    const page = div((root) => root.div((inner) => inner.span('client')));

    hydrate(page, target);

    expect(events).toHaveLength(1);
    expect(events[0].expected).toBe('div');
    expect(events[0].existing).toBe('span');
  });

  it('reports a node-type mismatch for text slots', () => {
    const target = document.createElement('div');
    target.innerHTML = '<div><div><em>server</em></div></div>';
    const page = div((root) => root.div((inner) => inner.child('client')));

    hydrate(page, target);

    expect(events).toHaveLength(1);
    expect(events[0].expected).toBe('#text');
    expect(events[0].existing).toBe('em');
  });

  it('stays quiet when the server markup matches', () => {
    const target = document.createElement('div');
    target.innerHTML = '<div><div><span>ok</span></div></div>';
    const page = div((root) => root.div((inner) => inner.span('ok')));

    hydrate(page, target);

    expect(events).toHaveLength(0);
  });
});
