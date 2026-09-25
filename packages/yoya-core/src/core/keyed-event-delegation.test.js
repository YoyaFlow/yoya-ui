import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, li, ref, ul, vNode } from '@yoyaflow/yoya-core';

const click = (target) => {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const fire = (target, type) => {
  target.dispatchEvent(new Event(type));
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('keyed segment event delegation', () => {
  it('attaches one listener on the segment root instead of one per row', () => {
    const rows = ref([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        () => li((item) => item.on('click', () => {}))
      );
    });
    const element = list.renderDom();

    // 段根只挂一个 click 监听器；每行节点是委托描述符（_delegate），没有自己的 _events
    expect(list._delegates.listeners.size).toBe(1);
    expect(list._delegates.listeners.has('click')).toBe(true);
    for (const rowNode of list.children()) {
      expect(rowNode._delegate.event).toBe('click');
      expect(rowNode._events).toBeUndefined();
    }
    void element;
  });

  it('dispatches inside-out with node this, real target and emulated currentTarget', () => {
    const calls = [];
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        () =>
          li((item) => {
            item.span((icon) =>
              icon.on('click', function (event) {
                calls.push({
                  order: 'inner',
                  thisIsIcon: this === icon,
                  currentTargetIsIcon: event.currentTarget === icon._el,
                  targetIsIcon: event.target === icon._el
                });
              })
            );
            item.on('click', function (event) {
              calls.push({
                order: 'outer',
                thisIsItem: this === item,
                currentTargetIsItem: event.currentTarget === item._el
              });
            });
          })
      );
    });
    const element = list.renderDom();
    const iconElement = element.querySelector('span');

    click(iconElement);

    expect(calls).toEqual([
      { order: 'inner', thisIsIcon: true, currentTargetIsIcon: true, targetIsIcon: true },
      { order: 'outer', thisIsItem: true, currentTargetIsItem: true }
    ]);
  });

  it('stops inside-out dispatch and native bubbling when a row handler stops propagation', () => {
    const calls = [];
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        () =>
          li((item) => {
            item.span((icon) =>
              icon.on('click', (event) => {
                calls.push('inner');
                event.stopPropagation();
              })
            );
            item.on('click', () => calls.push('outer'));
          })
      );
    });
    const element = list.renderDom();
    const documentHandler = vi.fn();
    document.addEventListener('click', documentHandler);

    try {
      click(element.querySelector('span'));
    } finally {
      document.removeEventListener('click', documentHandler);
    }

    expect(calls).toEqual(['inner']);
    expect(documentHandler).not.toHaveBeenCalled();
  });

  it('keeps only the latest handler per event and removes it with off()', () => {
    const calls = [];
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        () =>
          li((item) => {
            item.on('click', () => calls.push('first'));
            item.on('click', () => calls.push('second'));
          })
      );
    });
    const element = list.renderDom();
    const rowNode = list.children()[0];

    click(element.firstChild);
    expect(calls).toEqual(['second']);

    rowNode.off('click');
    click(element.firstChild);
    expect(calls).toEqual(['second']);
  });

  it('falls back to per-element binding for once / capture / non-bubbling events', () => {
    const calls = [];
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        () =>
          li((item) => {
            item.span((icon) => icon.on('click', () => calls.push('once'), { once: true }));
            item.on('click', () => calls.push('bubble'));
            item.on('focus', () => calls.push('focus'), { capture: true });
            item.tabIndex = 0;
          })
      );
    });
    const element = list.renderDom();
    const rowElement = element.firstChild;
    const rowNode = list.children()[0];
    const iconNode = rowNode.children()[0];

    // once 与非冒泡事件都回落成逐元素绑定；无 options 的 click 仍然走委托
    expect(iconNode._events?.has('click')).toBe(true);
    expect(rowNode._events?.has('focus')).toBe(true);
    expect(rowNode._delegate.event).toBe('click');

    click(element.querySelector('span'));
    click(element.querySelector('span'));
    fire(rowElement, 'focus');

    // once 只触发一次；非冒泡的 focus 只有逐元素绑定才能收到
    expect(calls.filter((entry) => entry === 'once')).toHaveLength(1);
    expect(calls.filter((entry) => entry === 'bubble')).toHaveLength(2);
    expect(calls).toContain('focus');
  });

  it('follows the key across reorders and takes the new handler when a row is replaced', () => {
    const calls = [];
    const rows = ref([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' }
    ]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li((item) => item.on('click', () => calls.push(row.label)))
      );
    });
    const element = list.renderDom();

    rows.value = [rows.peek()[1], rows.peek()[0]];
    click(element.children[0]);
    click(element.children[1]);

    expect(calls).toEqual(['B', 'A']);

    calls.length = 0;
    rows.value = [{ id: 'b', label: 'B2' }, rows.peek()[1]];
    click(element.children[0]);

    expect(calls).toEqual(['B2']);
  });

  it('does not double-dispatch after a region rebuild', () => {
    const calls = [];
    const rows = ref([{ id: 1 }]);
    const tick = ref(0);
    const region = div((node) => {
      node.rebuildable();
      node.attr('data-tick', String(tick.value));
      node.ul((list) => {
        list.keyed(
          rows,
          (row) => row.id,
          (row) => li((item) => item.on('click', () => calls.push(`row-${row.id}`)))
        );
      });
    });
    const element = region.renderDom();

    tick.value = 1;
    region.rebuild();

    click(element.querySelector('li'));

    expect(calls).toEqual(['row-1']);
  });

  it('keeps working for elements built outside the row builder (component render)', () => {
    const calls = [];
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        () => vNode(() => li((item) => item.on('click', () => calls.push('component'))))
      );
    });
    const element = list.renderDom();

    click(element.querySelector('li'));

    expect(calls).toEqual(['component']);
  });

  it('leaves non-keyed event binding on the original path', () => {
    const calls = [];
    const list = div((node) => {
      node.span((item) => item.on('click', () => calls.push('plain')));
    });
    const element = list.renderDom();
    const spanElement = element.querySelector('span');
    const spanNode = list.children()[0];

    click(spanElement);

    expect(calls).toEqual(['plain']);
    expect(spanNode._events.has('click')).toBe(true);
    expect(spanNode._delegate).toBeUndefined();
    expect(list._delegates).toBeUndefined();
  });
});
