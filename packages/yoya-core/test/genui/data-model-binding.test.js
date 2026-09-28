/**
 * 模型背书句柄：`data.cell(path)` 写下去 = 写数据模型，不是只改一个信号。
 *
 * 这条缝对应组件侧的双向绑定（`value` 位置传句柄）：控件把值写回句柄时，
 * 模型根 / 快照 / 父路径读 / 之后创建的 cell / 订阅者 / 派生都必须跟着走。
 */
import { describe, expect, it, vi } from 'vitest';
import { ref } from '../../src/index.js';
import { isWritableSignal } from '../../src/core/signals/handle.js';
import { DataModel } from '../../src/genui/runtime/data-model.js';
import { computed } from '../../src/index.js';

describe('DataModel 模型背书句柄', () => {
  it('写 cell 句柄就是写模型：快照 / 父路径 / 订阅者 / 之后创建的 cell 都跟上', () => {
    const data = new DataModel({ form: { name: '' } });
    const changes = [];
    data.subscribe((change) => changes.push(change.path));
    const cell = data.cell('/form/name');

    cell.value = 'typed';

    expect(data.snapshot()).toEqual({ form: { name: 'typed' } });
    expect(data.read('/form/name')).toBe('typed');
    // 之前没人读过 /form：这个 cell 是写完之后才创建的，必须也拿到新值
    expect(data.cell('/form').value).toEqual({ name: 'typed' });
    expect(changes).toContain('/form/name');
  });

  it('句柄是可写句柄（组件侧 isWritableSignal 才接双向绑定）', () => {
    const data = new DataModel({ a: 1 });
    expect(isWritableSignal(data.cell('/a'))).toBe(true);
  });

  it('同值写入不重复通知（幂等，避免回声）', () => {
    const data = new DataModel({ a: 'x' });
    const listener = vi.fn();
    data.subscribe(listener);
    const cell = data.cell('/a');

    cell.value = 'y';
    cell.value = 'y';

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('句柄写进数据落的是值，不是句柄（asSignal 防嵌套 ref）', () => {
    const data = new DataModel({ note: '' });
    const inner = ref('inner');

    data.write('/note', inner);

    expect(data.snapshot().note).toBe('inner');
    expect(data.read('/note')).toBe('inner');
  });

  it('模型写下去的值会下发到已有 cell（且不递归）', () => {
    const data = new DataModel({ form: { name: 'a' } });
    const cell = data.cell('/form/name');

    data.write('/form/name', 'b');
    expect(cell.value).toBe('b');

    data.replace({ form: { name: 'c' } });
    expect(cell.value).toBe('c');
    expect(data.snapshot()).toEqual({ form: { name: 'c' } });
  });

  it('派生跟着 cell 写入更新', () => {
    const data = new DataModel({ price: 2, qty: 3 });
    const total = computed(() => data.cell('/price').value * data.cell('/qty').value);
    data.defineComputed('/total', total);

    expect(data.read('/total')).toBe(6);

    data.cell('/price').value = 5;

    expect(data.read('/total')).toBe(15);
    expect(data.snapshot()).toEqual({ price: 5, qty: 3 });
  });
});
