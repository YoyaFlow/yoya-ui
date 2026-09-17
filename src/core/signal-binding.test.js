import { afterEach, describe, expect, it } from 'vitest';
import { ViewNode, computed, div, input, installSignals, li, ref, ul, vText } from '../index.js';
import { defaultAdapter } from './signals/engine.js';

afterEach(() => {
  installSignals(null);
});

/**
 * 订阅计数适配器：按 source 统计活跃订阅数，用来验证绑定销毁后退订。
 * 故意不带 createComputed——守的是「引擎没有原生派生」时 core 自实现派生那条路径。
 */
function installSubscriptionSpy() {
  const active = new Map();

  installSignals({
    ...defaultAdapter,
    createComputed: undefined,
    subscribe(source, listener) {
      active.set(source, (active.get(source) ?? 0) + 1);
      const dispose = defaultAdapter.subscribe(source, listener);

      return () => {
        active.set(source, active.get(source) - 1);
        dispose();
      };
    }
  });

  return (handle) => active.get(handle._source) ?? 0;
}

describe('signal value bindings', () => {
  it('renders the current signal value into SSR html', () => {
    const count = ref(3);
    const box = div((el) => el.attr('data-count', count));

    expect(box.toHTML()).toBe('<div data-count="3"></div>');
  });

  it('updates the attribute in place when the signal changes', () => {
    const count = ref(0);
    const box = div((el) => el.attr('data-count', count));
    const element = box.renderDom();
    const before = box._el;

    count.value = 5;

    expect(element.getAttribute('data-count')).toBe('5');
    expect(box._el).toBe(before);
  });

  it('does not subscribe before the node is rendered', () => {
    const count = ref(0);
    const box = div((el) => el.attr('data-count', count));

    count.value = 2;

    expect(box.toHTML()).toBe('<div data-count="0"></div>');
  });

  it('updates bound text in place', () => {
    const count = ref(1);
    const label = vText(count);
    const root = div((el) => el.child(label));
    const element = root.renderDom();
    const textNode = element.firstChild;

    count.value = 2;

    expect(textNode.textContent).toBe('2');
    expect(element.firstChild).toBe(textNode);
  });

  it('updates bound styles in place', () => {
    const width = ref('10px');
    const box = div((el) => el.style('width', width));
    const element = box.renderDom();

    width.value = '20px';

    expect(element.style.width).toBe('20px');
  });

  it('keeps derived values in sync through computed', () => {
    const count = ref(2);
    const double = computed(() => count.value * 2);
    const box = div((el) => el.attr('data-double', double));
    const element = box.renderDom();

    count.value = 3;

    expect(element.getAttribute('data-double')).toBe('6');
  });

  it('stops updating after the node is destroyed', () => {
    const count = ref(0);
    const box = div((el) => el.attr('data-count', count));
    const element = box.renderDom();

    box.destroy();
    count.value = 9;

    expect(element.getAttribute('data-count')).toBe('0');
  });

  it('ignores writes when the value is unchanged', () => {
    const count = ref(1);
    let writes = 0;
    const box = div((el) => {
      el.attr('data-count', count);
      const original = el.attr.bind(el);
      el.attr = (name, value) => {
        if (name === 'data-count' && value !== undefined) {
          writes += 1;
        }
        return original(name, value);
      };
    });
    box.renderDom();

    count.value = 1;

    expect(writes).toBe(1);
  });

  it('keeps working when a bound node is a plain ViewNode child', () => {
    const count = ref(1);
    const child = vText(count);
    const root = div((el) => el.child(child));
    root.renderDom();

    count.value = 4;

    expect(child.textContent()).toBe('4');
    expect(child instanceof ViewNode).toBe(true);
  });

  it('toggles a class from a boolean signal', () => {
    const active = ref(false);
    const box = div((el) => el.toggleClass('is-active', active));
    const element = box.renderDom();

    expect(element.className).not.toContain('is-active');

    active.value = true;
    expect(element.className).toContain('is-active');

    active.value = false;
    expect(element.className).not.toContain('is-active');
  });

  it('skips the value property write when the dom already matches', () => {
    const name = ref('');
    const field = input((el) => el.attr('value', name));
    const element = field.renderDom();
    let writes = 0;
    let current = 'Ada';

    Object.defineProperty(element, 'value', {
      configurable: true,
      get: () => current,
      set: (next) => {
        writes += 1;
        current = next;
      }
    });

    name.value = 'Ada';

    expect(writes).toBe(0);

    name.value = 'Grace';

    expect(writes).toBe(1);
    expect(current).toBe('Grace');
  });

  it('releases row computeds once the keyed rows are gone (core fallback derivation)', () => {
    const subscriptionsFor = installSubscriptionSpy();
    const selected = ref(null);
    const rows = ref([{ id: 1 }, { id: 2 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) =>
          li(String(row.id)).toggleClass(
            'danger',
            computed(() => selected.value === row.id)
          )
      );
    });
    list.renderDom();

    expect(subscriptionsFor(selected)).toBe(2);

    rows.value = [];

    // 行销毁后行内派生对长命信号的订阅必须全部退掉，否则整行数据被一起留住
    expect(subscriptionsFor(selected)).toBe(0);
  });

  it('does not keep row derivations alive after the keyed rows are gone', () => {
    const selected = ref(null);
    const rows = ref([{ id: 1 }, { id: 2 }]);
    let runs = 0;
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) =>
          li(String(row.id)).toggleClass(
            'danger',
            computed(() => {
              runs += 1;
              return selected.value === row.id;
            })
          )
      );
    });
    list.renderDom();
    const runsAfterBuild = runs;

    rows.value = [];
    selected.value = 1;

    // 行销毁后写长命信号：历史派生既不该被唤醒，也不该被它钉住
    expect(runs).toBe(runsAfterBuild);
  });
});
