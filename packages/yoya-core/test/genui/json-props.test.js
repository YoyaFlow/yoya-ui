/**
 * JSON 活值 props：组件拿 `@:/路径` 的句柄后按相对路径下钻（`series.at('0/value')`）。
 *
 * 两条要守的语义：
 * - 下钻到数据模型背书的句柄时，读写落在**那条路径自己的源**上 —— 只改那条路径，
 *   也只被那条路径唤醒（不然每次无关字段变化都会把派生整条重算一遍，图表就白重绘）；
 * - 端到端：schema → 组件按路径读 → 宿主写数据 / 组件写回，DOM 与模型都跟着走。
 */
import { describe, expect, it } from 'vitest';
import { asSignalJson, computed, ref, span, vNode, vText } from '../../src/index.js';
import { createGenUI } from '../../src/genui/index.js';
import { DataModel } from '../../src/genui/runtime/data-model.js';

/** 中性夹具：一个 JSON 位，读第 0 行做文本，命令写回第 0 行。 */
function MetricFixture(props = {}) {
  const series = asSignalJson(props.series ?? []);
  const text = computed(() => String(series.at('0/value').value ?? ''));

  return vNode((api) => {
    api.setFirst = (next) => {
      series.at('0/value').value = next;
      return api;
    };

    return span({ vn: 'MetricFixture' }, (node) => node.child(vText(text)));
  });
}

/** 普通值（没有数据模型背书）也走同一条路径口径。 */
describe('asSignalJson 的路径下钻', () => {
  it('对普通对象下钻，写入是不可变替换', () => {
    const series = asSignalJson(ref([{ value: 1 }]));

    series.at('0/value').value = 2;

    expect(series.value).toEqual([{ value: 2 }]);
  });
});

describe('JSON 位挂在数据模型上', () => {
  it('写入只改那条路径，不整根替换', () => {
    const data = new DataModel({ series: [{ value: 1 }] });
    const changes = [];
    data.subscribe((change) => changes.push(change.path));

    const series = asSignalJson(data.cell('/series'));
    series.at('0/value').value = 7;

    expect(data.read('/series/0/value')).toBe(7);
    expect(changes).toEqual(['/series/0/value']);
  });

  it('只被读到的那条路径唤醒：无关字段变化不重算', () => {
    const data = new DataModel({ series: [{ note: 'a', value: 1 }] });
    const series = asSignalJson(data.cell('/series'));
    let runs = 0;
    const first = computed(() => {
      runs += 1;
      return series.at('0/value').value;
    });
    const stop = first.subscribe(() => {});

    data.write('/series/0/note', 'b');

    expect(runs).toBe(1);
    stop();
  });
});

describe('端到端：JSON props 走 GenUI 数据模型', () => {
  function mount() {
    const genui = createGenUI();
    genui.registerComponent('MetricFixture', { factory: MetricFixture });

    const surface = genui.fromJson({
      data: { series: [{ value: 1 }] },
      root: {
        id: 'metric',
        type: 'MetricFixture',
        props: { series: { $bind: '/series' } }
      }
    });
    const target = document.createElement('div');
    surface.bindTo(target);

    return { surface, target };
  }

  it('宿主写数据 → 视图跟着变', () => {
    const { surface, target } = mount();

    expect(target.textContent).toBe('1');

    surface.data.write('/series/0/value', 42);

    expect(target.textContent).toBe('42');
  });

  it('组件写回 → 模型跟着变，且只改那条路径', () => {
    const { surface, target } = mount();
    const changes = [];
    surface.data.subscribe((change) => changes.push(change.path));

    surface.nodeById('metric').setFirst(42);

    expect(target.textContent).toBe('42');
    expect(surface.data.read('/series/0/value')).toBe(42);
    expect(changes).toEqual(['/series/0/value']);
  });
});
