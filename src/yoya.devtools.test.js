import { afterEach, describe, expect, it } from 'vitest';
import { div } from './index.js';
import {
  disableDevtools,
  enableDevtools,
  getDevtoolsSnapshot,
  isDevtoolsEnabled,
  subscribeDevtools
} from './yoya.devtools.js';

afterEach(() => {
  disableDevtools();
});

describe('devtools public entry', () => {
  it('exports the opt-in runtime API from the standalone subpath', () => {
    expect(enableDevtools).toBeTypeOf('function');
    expect(disableDevtools).toBeTypeOf('function');
    expect(isDevtoolsEnabled).toBeTypeOf('function');
    expect(subscribeDevtools).toBeTypeOf('function');
    expect(getDevtoolsSnapshot).toBeTypeOf('function');
  });

  it('keeps devtools control functions out of the main UI entry', async () => {
    const ui = await import('./index.js');
    expect(ui.enableDevtools).toBeUndefined();
    expect(ui.subscribeDevtools).toBeUndefined();
  });

  it('is disabled by default and toggles on/off', () => {
    disableDevtools();
    expect(isDevtoolsEnabled()).toBe(false);
    enableDevtools();
    expect(isDevtoolsEnabled()).toBe(true);
    disableDevtools();
    expect(isDevtoolsEnabled()).toBe(false);
  });

  it('emits commit and destroy events during a node lifecycle when enabled', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const node = div('hello');
    node.renderDom();
    node.destroy();
    unsubscribe();

    expect(events.some((event) => event.type === 'commit')).toBe(true);
    expect(events.some((event) => event.type === 'destroy')).toBe(true);
  });

  it('delivers nothing while disabled or after unsubscribe', () => {
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const node = div('x');
    node.renderDom();
    node.destroy();

    enableDevtools();
    unsubscribe();
    const second = div('y');
    second.renderDom();
    second.destroy();

    expect(events).toEqual([]);
  });

  it('isolates listener errors so they never break rendering', () => {
    enableDevtools();
    const unsubscribe = subscribeDevtools(() => {
      throw new Error('devtools listener exploded');
    });

    const node = div('safe');
    expect(() => {
      node.renderDom();
      node.destroy();
    }).not.toThrow();

    unsubscribe();
  });

  it('does not change SSR output or emit during toHTML', () => {
    const events = [];
    const node = div('server');
    const before = node.toHTML();

    enableDevtools();
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const same = node.toHTML();
    unsubscribe();

    expect(same).toBe(before);
    expect(events).toEqual([]);
  });
});
