import { describe, expect, it } from 'vitest';
import { createAccess, div, i18nText, ref, vText, withAccess, withContext } from '../index.js';
import {
  disableDevtools,
  emitDevtools,
  enableDevtools,
  getDevtoolsDom,
  getDevtoolsScope,
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

  it('labels events with human-readable node descriptions', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const node = div('hello');
    node.renderDom();
    node.destroy();

    const commit = events.find((event) => event.type === 'commit');
    const destroy = events.find((event) => event.type === 'destroy');
    expect(commit.nodeLabel).toBe('div');
    expect(destroy.nodeLabel).toBe('div');
    unsubscribe();
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

  it('getDevtoolsSnapshot returns a plain element/text tree', () => {
    const snapshot = getDevtoolsSnapshot(div().attr('role', 'banner').child('b'));
    expect(snapshot.kind).toBe('element');
    expect(snapshot.tagName).toBe('div');
    expect(snapshot.attrs).toEqual({ role: 'banner' });
    expect(snapshot.children).toHaveLength(1);
    expect(snapshot.children[0].kind).toBe('text');
    expect(snapshot.children[0].text).toBe('b');
  });

  it('exposes keyed children through their mirrored data attribute', () => {
    const root = div().addChild('row-1', div('r'));
    const snapshot = getDevtoolsSnapshot(root);
    expect(snapshot.children[0].kind).toBe('element');
    expect(snapshot.children[0].attrs['data-row-key']).toBe('row-1');
  });

  it('shows component boundaries and multi-root fragments', () => {
    const fragment = {
      render: () => [div('first'), div('second')]
    };
    const root = div().child(fragment);
    root.renderDom();

    const snapshot = getDevtoolsSnapshot(root);
    const component = snapshot.children[0];
    expect(component.kind).toBe('component');
    expect(component.children.map((child) => child.tagName)).toEqual(['div', 'div']);
    expect(component.children.map((child) => child.children[0].text)).toEqual(['first', 'second']);
  });

  it('assigns stable ids and resolves rendered DOM by id until destroy', () => {
    enableDevtools();
    const root = div('hello');
    const element = root.renderDom();
    const first = getDevtoolsSnapshot(root).id;
    const second = getDevtoolsSnapshot(root).id;

    expect(second).toBe(first);
    expect(getDevtoolsDom(first)).toBe(element);

    root.destroy();
    expect(getDevtoolsDom(first)).toBeNull();
  });

  it('resolves text node DOM by id and clears it on destroy', () => {
    enableDevtools();
    const root = div().child('label');
    root.renderDom();
    const snapshot = getDevtoolsSnapshot(root);
    const textNodeId = snapshot.children[0].id;

    expect(getDevtoolsDom(textNodeId).nodeType).toBe(3);

    root.destroy();
    expect(getDevtoolsDom(textNodeId)).toBeNull();
  });

  it('emits one mount commit and stays silent on repeated unchanged renders', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));

    const node = div('x');
    node.renderDom();
    node.renderDom();
    node.renderDom();

    const commits = events.filter((event) => event.type === 'commit');
    expect(commits).toHaveLength(1);
    expect(commits[0].kind).toBe('mount');
    unsubscribe();
    node.destroy();
  });

  it('reports mounted attr/class/style mutations immediately', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const node = div('a');
    node.renderDom();

    node.attr('title', 'hi');
    node.className('active');
    node.style('color', 'red');

    const attrs = events.filter((event) => event.type === 'attr');
    const styles = events.filter((event) => event.type === 'style');
    expect(attrs.map((event) => event.name)).toEqual(['title', 'class']);
    expect(attrs[0]).toMatchObject({ name: 'title', previous: undefined, next: 'hi' });
    expect(styles).toHaveLength(1);
    expect(styles[0]).toMatchObject({ name: 'color', previous: undefined, next: 'red' });
    unsubscribe();
    node.destroy();
  });

  it('reports mounted text changes as text events', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const textNode = vText('before');
    const root = div().child(textNode);
    root.renderDom();

    textNode.textContent('after');

    const textEvents = events.filter((event) => event.type === 'text');
    expect(textEvents).toHaveLength(1);
    expect(textEvents[0]).toMatchObject({ from: 'before', to: 'after' });
    unsubscribe();
    root.destroy();
  });

  it('reports keyed child removal and carries child node ids', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const root = div().addChild('row', div('cell'));
    root.renderDom();
    const childId = getDevtoolsSnapshot(root).children[0].id;

    root.removeChild('row');

    const childEvents = events.filter((event) => event.type === 'child');
    expect(childEvents).toHaveLength(1);
    expect(childEvents[0].removed).toContain(childId);
    unsubscribe();
    root.destroy();
  });

  it('numbers every event with a monotonic seq and the node id', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const node = div('a');
    node.renderDom();
    node.attr('title', 'x');
    node.destroy();

    expect(events.length).toBeGreaterThan(2);
    const seqs = events.map((event) => event.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    events.forEach((event) => {
      expect(event.nodeId).toBeTypeOf('number');
    });
    unsubscribe();
  });

  it('reports signal writes with before/after values and dependent count', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const count = ref(0);
    const root = div((ele) => ele.attr('data-count', count));
    root.renderDom();

    count.value = 1;

    const writeEvents = events.filter((event) => event.type === 'signal-write');
    expect(writeEvents).toHaveLength(1);
    expect(writeEvents[0]).toMatchObject({ previous: 0, next: 1, dependents: 1 });
    expect(writeEvents[0].signalId).toBeTypeOf('number');
    unsubscribe();
    root.destroy();
  });

  it('reports handle.update() through the same signal-write event', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const count = ref(0);
    const root = div((ele) => ele.attr('data-count', count));
    root.renderDom();

    count.update((value) => value + 2);

    const writeEvents = events.filter((event) => event.type === 'signal-write');
    expect(writeEvents[0]).toMatchObject({ previous: 0, next: 2 });
    unsubscribe();
    root.destroy();
  });

  it('pairs signal writes with the text events they cause', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const label = ref('before');
    const root = div((ele) => ele.child(vText(label)));
    root.renderDom();

    label.value = 'after';

    const writeEvents = events.filter((event) => event.type === 'signal-write');
    const textEvents = events.filter((event) => event.type === 'text');
    expect(writeEvents).toHaveLength(1);
    expect(textEvents.some((event) => event.from === 'before' && event.to === 'after')).toBe(true);
    unsubscribe();
    root.destroy();
  });

  it('keeps unmounted signal writes safe when devtools emits', () => {
    enableDevtools();
    const events = [];
    const unsubscribe = subscribeDevtools((event) => events.push(event));
    const count = ref(0);

    expect(() => {
      count.value = 5;
    }).not.toThrow();
    expect(events.some((event) => event.type === 'signal-write')).toBe(true);
    unsubscribe();
  });

  it('reports declared access and its effective permission state', () => {
    enableDevtools();
    const access = createAccess({ permissions: ['r.doc:edit'] });
    let node;
    withAccess(access, () => {
      node = div().access('doc:edit');
    });

    const id = getDevtoolsSnapshot(node).id;
    expect(getDevtoolsScope(id)).toMatchObject({
      access: { code: 'doc:edit', level: 'write' },
      permissionState: 'readonly'
    });
  });

  it('captures Context layers for nodes built while devtools is enabled', () => {
    enableDevtools();
    let node;
    withContext({ user: { name: 'Ada' } }, () => {
      node = div('x');
    });

    const id = getDevtoolsSnapshot(node).id;
    expect(getDevtoolsScope(id).context.user).toEqual({ name: 'Ada' });
  });

  it('does not capture Context for nodes built before devtools is enabled', () => {
    disableDevtools();
    let node;
    withContext({ user: { name: 'Bob' } }, () => {
      node = div('x');
    });

    enableDevtools();
    const id = getDevtoolsSnapshot(node).id;
    expect(getDevtoolsScope(id).context).toBeNull();
  });

  it('surfaces the i18n language of translated text nodes', () => {
    enableDevtools();
    const root = div().child(i18nText('welcome'));
    root.renderDom();
    const id = getDevtoolsSnapshot(root).children[0].id;

    expect(getDevtoolsScope(id).i18n).toMatchObject({
      key: 'welcome',
      language: 'zh-CN'
    });
  });

  it('returns null for scope queries of destroyed nodes', () => {
    enableDevtools();
    const node = div('x');
    node.renderDom();
    const id = getDevtoolsSnapshot(node).id;
    node.destroy();

    expect(getDevtoolsScope(id)).toBeNull();
  });
});
