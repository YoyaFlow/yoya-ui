import { describe, expect, it } from 'vitest';
import { createGenUI } from '../../src/genui/index.js';

describe('computed 派生声明', () => {
  it('顶层声明按 DAG 求值，依赖变化后 DOM 与数据读取同步更新', () => {
    const genui = createGenUI({
      functions: {
        multiply: ({ unit, quantity }) => unit * quantity,
        money: (value) => `¥${Number(value).toFixed(2)}`
      }
    });
    const surface = genui.fromJson({
      data: { order: { price: 268, qty: 2 } },
      computed: {
        '@:/order/total': {
          call: 'multiply',
          args: { unit: '@:/order/price', quantity: '@:/order/qty' },
          transform: 'money'
        }
      },
      root: { type: 'p', text: '@:/order/total' }
    });
    const target = document.createElement('div');

    surface.bindTo(target);

    expect(target.querySelector('p').textContent).toBe('¥536.00');
    expect(surface.data.read('/order/total')).toBe('¥536.00');

    surface.data.write('/order/qty', 3);

    expect(target.querySelector('p').textContent).toBe('¥804.00');
    expect(surface.data.read('/order/total')).toBe('¥804.00');
  });

  it('computed 可以依赖 computed，按拓扑顺序建立信号图', () => {
    const genui = createGenUI({
      functions: {
        add: ({ left, right }) => left + right,
        multiply: ({ unit, quantity }) => unit * quantity
      }
    });
    const surface = genui.fromJson({
      data: { order: { price: 100, qty: 2, fee: 7 } },
      computed: {
        '@:/order/subtotal': {
          call: 'multiply',
          args: { unit: '@:/order/price', quantity: '@:/order/qty' }
        },
        '@:/order/total': {
          call: 'add',
          args: { left: '@:/order/subtotal', right: '@:/order/fee' }
        }
      },
      root: { type: 'p', text: '@:/order/total' }
    });
    const target = document.createElement('div');

    surface.bindTo(target);
    expect(target.querySelector('p').textContent).toBe('207');

    surface.data.write('/order/price', 125);
    expect(target.querySelector('p').textContent).toBe('257');
  });

  it('computed 依赖形成环在 schema 校验阶段失败', () => {
    const genui = createGenUI({ functions: { add: ({ value }) => value } });

    expect(() =>
      genui.fromJson({
        data: {},
        computed: {
          '@:/a': { call: 'add', args: { value: '@:/b' } },
          '@:/b': { call: 'add', args: { value: '@:/a' } }
        },
        root: { type: 'p' }
      })
    ).toThrow(/computed 依赖形成环/);
  });

  it('computed 缺数据依赖在 schema 校验阶段失败', () => {
    const genui = createGenUI({ functions: { add: ({ value }) => value } });

    expect(() =>
      genui.fromJson({
        data: {},
        computed: { '@:/result': { call: 'add', args: { value: '@:/missing' } } },
        root: { type: 'p' }
      })
    ).toThrow(/computed 依赖不存在/);
  });
});
