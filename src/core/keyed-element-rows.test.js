/**
 * 票 15 / R5-b：`keyed()` 直接吃编译产物 element 通道的行（`{ el, destroy }`）。
 *
 * 运行期优先的口径：同一份业务源码不挂编译器也成立——这里用手写的元素行工厂模拟编译产物，
 * 对账语义（同 key 复用 / 同 key 换引用原位重建 / 离场销毁 / 最小搬动）必须与节点行一致。
 */
import { describe, expect, it, vi } from 'vitest';
import { keySet } from './key-set.js';
import { ref } from './signals/handle.js';
import { div, tbody, tr } from '../html/index.js';

const elementRowFactory = (build) => (item) => {
  const data = item.data ?? item;
  const record = build(data);
  return {
    el: record.el,
    destroy: record.destroy ?? vi.fn()
  };
};

const rowElement = (id, label) => {
  const el = document.createElement('tr');
  el.setAttribute('data-id', String(id));
  el.textContent = label;
  return el;
};

const mountKeyed = (rows, build, options) => {
  const host = tbody((body) => {
    body.attr('id', 'tbody');
    body.keyed(rows, build, options);
  });
  const element = host.renderDom();
  return { element, host };
};

const idsOf = (element) =>
  [...element.querySelectorAll('tr')].map((tr) => tr.getAttribute('data-id'));

/** 子元素形状：行（data-id）与静态兄弟（data-id="tail"）一次的扁平快照。 */
const shapeOf = (element) =>
  [...element.children].map((child) => child.getAttribute('data-id')).join(',');

describe('keyed() with element rows (ticket 15)', () => {
  it('reuses the same element for the same key and data reference', () => {
    const rows = ref([]);
    const built = [];
    const build = elementRowFactory((row) => {
      const el = rowElement(row.id, row.label);
      built.push(el);
      return { el };
    });
    const { element } = mountKeyed(rows, build);

    const data = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' }
    ];
    rows.value = data;
    const first = built[0];
    expect(idsOf(element)).toEqual(['1', '2']);

    rows.value = data;
    expect(built).toHaveLength(2);
    expect(element.querySelector('tr')).toBe(first);
  });

  it('rebuilds in place when the data reference for a key changes and destroys departed rows', () => {
    const rows = ref([]);
    const destroyed = [];
    const built = [];
    const build = elementRowFactory((row) => {
      const el = rowElement(row.id, row.label);
      built.push(el);
      return { el, destroy: () => destroyed.push(row.id) };
    });
    const { element } = mountKeyed(rows, build);

    // 第 1 行保持同一引用 → 复用元素；第 2 行换引用 → 原位重建。
    const stable = { id: 1, label: 'a' };
    rows.value = [stable, { id: 2, label: 'b' }];
    rows.value = [stable, { id: 2, label: 'b!!' }];

    expect(idsOf(element)).toEqual(['1', '2']);
    expect(element.querySelectorAll('tr')[1].textContent).toBe('b!!');
    expect(built).toHaveLength(3);
    expect(destroyed).toEqual([2]); // 换引用=原位重建：旧行先销毁（退订），元素换新的

    rows.value = [stable];
    expect(idsOf(element)).toEqual(['1']);
    expect(destroyed).toEqual([2, 2]); // 离场行同样销毁
  });

  it('moves only the rows whose position changed', () => {
    const rows = ref([]);
    const built = new Map();
    const build = elementRowFactory((row) => {
      const el = rowElement(row.id, row.label);
      built.set(row.id, el);
      return { el };
    });
    const { element } = mountKeyed(rows, build);

    const data = [1, 2, 3, 4].map((id) => ({ id, label: `label ${id}` }));
    rows.value = data;

    rows.value = [data[3], data[1], data[2], data[0]];
    expect(idsOf(element)).toEqual(['4', '2', '3', '1']);
    expect(element.querySelectorAll('tr')[1]).toBe(built.get(2));
    expect(element.querySelectorAll('tr')[2]).toBe(built.get(3));

    rows.value = [];
    expect(element.querySelectorAll('tr')).toHaveLength(0);
  });

  it('rejects mixing element rows with node rows', () => {
    const rows = ref([]);
    const build = (row) =>
      row.id === 1
        ? { el: rowElement(row.id, row.label), destroy() {} }
        : tr((line) => line.child(String(row.id)));

    mountKeyed(rows, build);
    expect(() => {
      rows.value = [
        { id: 1, label: 'a' },
        { id: 2, label: 'b' }
      ];
    }).toThrow(/all elements or all nodes/);
  });

  it('refuses to serialize element rows through toHTML()', () => {
    const rows = ref([]);
    const build = (row) => ({ el: rowElement(row.id, row.label), destroy() {} });
    const { host } = mountKeyed(rows, build);

    rows.value = [{ id: 1, label: 'a' }];
    expect(() => host.toHTML()).toThrow(/element rows/);
  });

  it('works with a keySet source (compiled rows keyed by item.data.id)', () => {
    const rows = keySet([], (row) => row.id);
    const built = [];
    const build = (item) => {
      const el = rowElement(item.data.id, item.data.label);
      built.push(el);
      return { el, destroy: vi.fn() };
    };
    const { element } = mountKeyed(rows, build);

    rows.replaceAll([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' }
    ]);
    expect(idsOf(element)).toEqual(['1', '2']);

    rows.remove(1);
    expect(idsOf(element)).toEqual(['2']);
  });

  /**
   * 位置口径：元素行与节点行共用「段尾锚点」——段内行排在 keyed() 声明位置之后、
   * 该段之后第一个兄弟之前。原来的实现一律钉到容器末尾，`keyed` 后面还有内容时整段被搬到后面。
   */
  it('keeps element rows at the declared position when a sibling follows', () => {
    const rows = ref([{ id: 1, label: 'a' }]);
    const build = (row) => ({ el: rowElement(row.id, row.label), destroy: vi.fn() });
    const host = tbody((body) => {
      body.keyed(rows, build);
      body.tr((line) => line.attr('data-id', 'tail'));
    });
    const element = host.renderDom();

    rows.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' }
    ];

    expect(shapeOf(element)).toBe('1,2,tail');
  });

  it('keeps two element row segments in one parent from swallowing each other', () => {
    const first = ref([{ id: 1, label: 'a' }]);
    const second = ref([{ id: 2, label: 'b' }]);
    const host = tbody((body) => {
      body.keyed(first, (row) => ({ el: rowElement(`a${row.id}`, row.label), destroy: vi.fn() }));
      body.keyed(second, (row) => ({ el: rowElement(`b${row.id}`, row.label), destroy: vi.fn() }));
    });
    const element = host.renderDom();

    expect(shapeOf(element)).toBe('a1,b2');

    first.value = [
      { id: 1, label: 'a' },
      { id: 3, label: 'c' }
    ];
    expect(shapeOf(element)).toBe('a1,a3,b2');
  });

  it('keeps two element row segments ordered when a sibling follows both', () => {
    const first = ref([]);
    const second = ref([]);
    const host = tbody((body) => {
      body.keyed(first, (row) => ({ el: rowElement(`a${row.id}`, row.label), destroy: vi.fn() }));
      body.keyed(second, (row) => ({ el: rowElement(`b${row.id}`, row.label), destroy: vi.fn() }));
      body.tr((line) => line.attr('data-id', 'tail'));
    });
    const element = host.renderDom();

    // 后声明的段先拿到数据、先声明的段后拿到：两段各自的位置都不能被对方吞掉。
    second.value = [{ id: 2, label: 'b' }];
    first.value = [{ id: 1, label: 'a' }];

    expect(shapeOf(element)).toBe('a1,b2,tail');

    second.value = [
      { id: 2, label: 'b' },
      { id: 3, label: 'c' }
    ];
    expect(shapeOf(element)).toBe('a1,b2,b3,tail');
  });

  /** 挂载期补插：行在容器建好之前就建好时，首屏必须落地，而不是静默少掉整张列表。 */
  it('renders rows that were built before the container existed', () => {
    const rows = ref([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' }
    ]);
    const host = tbody((body) => {
      body.keyed(rows, (row) => ({ el: rowElement(row.id, row.label), destroy: vi.fn() }));
    });
    const element = host.renderDom();

    expect(shapeOf(element)).toBe('1,2');
  });

  /** 行不在视图树里，父节点销毁 / 区域重建都带不走它们：释放点必须落在 keyed 绑定上。 */
  it('destroys element rows when the owning node is destroyed', () => {
    const destroyed = [];
    const rows = ref([
      { id: 1, label: 'a' },
      { id: 2, label: 'b' }
    ]);
    const host = tbody((body) => {
      body.keyed(rows, (row) => ({
        el: rowElement(row.id, row.label),
        destroy: () => destroyed.push(row.id)
      }));
    });
    host.renderDom();

    host.destroy();

    expect(destroyed).toEqual([1, 2]);
  });

  it('destroys element rows of the previous run when a region rebuilds', () => {
    const destroyed = [];
    const rows = ref([{ id: 1, label: 'a' }]);
    const host = div((page) => {
      page.rebuildable();
      page.keyed(rows, (row) => ({
        el: rowElement(row.id, row.label),
        destroy: () => destroyed.push(row.id)
      }));
    });
    const element = host.renderDom();

    host.rebuild();

    expect(destroyed).toEqual([1]);
    expect(shapeOf(element)).toBe('1');
  });
});
