import { describe, expect, it } from 'vitest';
import { div } from '../index.js';
import {
  disableDevtools,
  emitDevtools,
  enableDevtools,
  getDevtoolsSnapshot,
  isDevtoolsEnabled,
  subscribeDevtools
} from '../core/devtools.js';

describe('devtools hook (core)', () => {
  it('is disabled by default and toggles on/off', () => {
    disableDevtools();
    expect(isDevtoolsEnabled()).toBe(false);
    enableDevtools();
    expect(isDevtoolsEnabled()).toBe(true);
    disableDevtools();
  });

  it('emits commit and destroy events during a node lifecycle when enabled', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    try {
      const node = div('hello');
      node.renderDom();
      node.destroy();
    } finally {
      disableDevtools();
    }
    unsubscribe();
    expect(events.some((e) => e.type === 'commit')).toBe(true);
    expect(events.some((e) => e.type === 'destroy')).toBe(true);
  });

  it('does not emit after unsubscribe', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    unsubscribe();
    try {
      const node = div('x');
      node.renderDom();
      node.destroy();
    } finally {
      disableDevtools();
    }
    expect(events).toEqual([]);
  });

  it('emitDevtools is a no-op while disabled', () => {
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    disableDevtools();
    emitDevtools({ type: 'commit', node: null });
    unsubscribe();
    expect(events).toEqual([]);
  });

  it('getDevtoolsSnapshot walks the node tree shape', () => {
    const snapshot = getDevtoolsSnapshot(div('a').child('b'));
    expect(snapshot.tagName).toBe('div');
    expect(snapshot.children).toBeDefined();
  });
});
