import { afterEach, describe, expect, it } from 'vitest';
import { computed, div, ref } from '../../index.js';
import { disableDevtools, enableDevtools, subscribeDevtools } from '../devtools.js';

afterEach(() => {
  disableDevtools();
});

function signalWriteEvents(events) {
  return events.filter((event) => event.type === 'signal-write');
}

describe('devtools signal-write events', () => {
  it('reports previous / next values with a stable signalId when writing a ref', () => {
    enableDevtools();
    const events = [];
    subscribeDevtools((event) => events.push(event));

    const count = ref(1);
    count.value = 2;
    count.value = 3;

    const writes = signalWriteEvents(events);
    expect(writes).toHaveLength(2);
    expect(writes[0].previous).toBe(1);
    expect(writes[0].next).toBe(2);
    expect(writes[1].previous).toBe(2);
    expect(writes[1].next).toBe(3);
    expect(writes[1].signalId).toBe(writes[0].signalId);
  });

  it('stays silent when the written value is unchanged', () => {
    enableDevtools();
    const events = [];
    subscribeDevtools((event) => events.push(event));

    const count = ref(5);
    count.value = 5;
    count.value = 5;

    expect(signalWriteEvents(events)).toHaveLength(0);
  });

  it('does not report while devtools is disabled', () => {
    disableDevtools();
    const events = [];
    subscribeDevtools((event) => events.push(event));

    const count = ref(1);
    count.value = 2;

    expect(signalWriteEvents(events)).toHaveLength(0);
  });

  it('counts value bindings and region dependencies as dependents', () => {
    enableDevtools();
    const events = [];
    subscribeDevtools((event) => events.push(event));

    const count = ref(0);
    const box = div((ele) => {
      ele.rebuildable(() => false);
      ele.attr('data-count', count); // 值绑定依赖
      ele.text(count.value >= 0 ? 'stable' : 'neg'); // 区域构建期直读依赖
    });
    box.renderDom();

    count.value = 1;
    const withRegion = signalWriteEvents(events).at(-1);
    expect(withRegion.dependents).toBe(2);

    box.destroy();
    count.value = 2;
    const afterDestroy = signalWriteEvents(events).at(-1);
    expect(afterDestroy.dependents).toBe(0);
  });

  it('does not emit for computed handle writes (they throw instead)', () => {
    enableDevtools();
    const events = [];
    subscribeDevtools((event) => events.push(event));

    const count = ref(1);
    const doubled = computed(() => count.value * 2);
    expect(doubled.value).toBe(2);
    expect(() => {
      doubled.value = 8;
    }).toThrow(TypeError);

    expect(signalWriteEvents(events)).toHaveLength(0);
  });
});
