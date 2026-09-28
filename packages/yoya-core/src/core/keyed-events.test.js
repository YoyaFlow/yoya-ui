import { describe, expect, it, vi } from 'vitest';
import { div, input, li, ref, ul, vNode } from '@yoyaflow/yoya-core';

const fire = (target, type) => {
  target.dispatchEvent(new Event(type, { bubbles: true }));
};

/**
 * 带 key 的事件名（`price.change` / `orderItem.click`）：DOM 事件先进节点**唯一的派发函数**，
 * 再按「来源键 + DOM 类型」分发给登记项。
 * 来源键取事件目标向上（含节点自己的元素）最近的 `data-row-key`（引擎键镜像）或控件名 `name`。
 */
describe('keyed event names', () => {
  it('dispatches by the data-row-key of the source subtree', () => {
    const price = vi.fn();
    const quantity = vi.fn();
    const box = div((root) => {
      root.on('price.change', price);
      root.on('quantity.change', quantity);
      root.addChild(
        'price',
        div((field) => field.child(input()))
      );
      root.addChild(
        'quantity',
        div((field) => field.child(input()))
      );
    });
    const element = box.renderDom();
    const fields = element.querySelectorAll('input');

    fire(fields[0], 'change');
    fire(fields[1], 'change');
    fire(fields[1], 'change');

    expect(price).toHaveBeenCalledTimes(1);
    expect(quantity).toHaveBeenCalledTimes(2);
  });

  it('dispatches by the control name for form controls', () => {
    const onPriceChange = vi.fn();
    const form = div((root) => {
      root.on('price.change', onPriceChange);
      root.input({ name: 'price' });
      root.input({ name: 'quantity' });
    });
    const element = form.renderDom();

    fire(element.querySelectorAll('input')[0], 'change');
    expect(onPriceChange).toHaveBeenCalledTimes(1);

    fire(element.querySelectorAll('input')[1], 'change');
    expect(onPriceChange).toHaveBeenCalledTimes(1);
  });

  it('fires the plain type handler and the keyed handler together, in registration order', () => {
    const calls = [];
    const box = div((root) => {
      root.on('change', () => calls.push('plain'));
      root.on('price.change', () => calls.push('keyed'));
      root.input({ name: 'price' });
    });
    const element = box.renderDom();

    fire(element.querySelector('input'), 'change');

    expect(calls).toEqual(['plain', 'keyed']);
  });

  it('keeps a keyed event scoped to its own source key', () => {
    const calls = [];
    const box = div((root) => {
      root.on('orderItem.click', () => calls.push('item'));
      root.div((row) =>
        row.attr('name', 'orderItem').child(div((inner) => inner.attr('data-role', 'label')))
      );
    });
    const element = box.renderDom();

    fire(element.querySelector('[data-role="label"]'), 'click');
    expect(calls).toEqual(['item']);
  });

  it('resolves the nearest source key when keyed sources nest', () => {
    const calls = [];
    const box = div((root) => {
      root.on('outer.click', () => calls.push('outer'));
      root.on('inner.click', () => calls.push('inner'));
      root.div((outer) =>
        outer
          .attr('data-row-key', 'outer')
          .child(div((inner) => inner.attr('data-row-key', 'inner')))
      );
    });
    const element = box.renderDom();

    fire(element.querySelector('[data-row-key="inner"]'), 'click');

    expect(calls).toEqual(['inner']);
  });

  it('dispatches a keyed name that was emitted directly', () => {
    const handler = vi.fn();
    const card = div((root) => root.on('price.change', handler));
    card.renderDom();

    card.emit('price.change', { value: 12 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: 12 });
  });

  it('works through a component root (on() delegates to the view root)', () => {
    const seen = [];
    const component = vNode(() =>
      div((root) => {
        root.input({ name: 'orderItem' });
      })
    );

    component.on('orderItem.click', function (event) {
      seen.push({ target: event.target.name, type: event.type });
    });

    const element = component.renderDom();
    fire(element.querySelector('input'), 'click');

    expect(seen).toEqual([{ target: 'orderItem', type: 'click' }]);
  });

  it('follows keyed rows inside a keyed list', () => {
    const calls = [];
    const rows = ref([{ id: 'price', value: 1 }]);
    const list = ul((node) => {
      node.on('price.change', () => calls.push('price'));
      node.keyed(
        rows,
        (row) => row.id,
        () => li((item) => item.child(input()))
      );
    });
    const element = list.renderDom();

    fire(element.querySelector('input'), 'change');
    element.querySelectorAll('input')[0].value = '2';
    fire(element.querySelector('input'), 'change');

    expect(calls).toEqual(['price', 'price']);
  });

  it('only pays for key resolution when a keyed name is registered', () => {
    const node = div();
    const element = node.renderDom();
    const plain = vi.fn();
    const keyed = vi.fn();

    node.on('click', plain);
    expect(node._events.get('click')[0].sourceKey).toBeNull();

    node.on('row.click', keyed);
    expect(node._events.get('click').length).toBe(1);
    expect(node._events.get('row.click')[0].sourceKey).toBe('row');
    // 两个名字共用同一个 DOM 类型监听器；点分名再加一个按整名的（emit 通道）
    expect(node._domAdapters.size).toBe(2);

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(plain).toHaveBeenCalledTimes(1);
    expect(keyed).not.toHaveBeenCalled();
  });
});
