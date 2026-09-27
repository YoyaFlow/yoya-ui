import { describe, expect, it, vi } from 'vitest';
import { ref, vNode, vText } from '../../src/index.js';
import { button } from '../../src/html/index.js';
import { createGenUI } from '../../src/genui/index.js';
import { normalizeSugarDeep } from '../../src/genui/protocol/references.js';
import { resolveWritableReference } from '../../src/genui/runtime/references.js';

function VAssignable({ value = 0, onSelect = null } = {}, setup = null) {
  const state = ref(value);

  return vNode((api) => {
    api.value = (next) => {
      if (next === undefined) {
        return state.value;
      }

      state.value = next;
      return api;
    };

    const root = button({}, (box) => box.child(vText(state)));
    const exposedHost = new Proxy(root, {
      get(target, property, receiver) {
        return property === 'value' ? api.value : Reflect.get(target, property, receiver);
      }
    });

    setup?.(exposedHost);
    root.on('click', () => onSelect?.(state.value));
    return root;
  });
}

function createFixture(options = {}) {
  const genui = createGenUI(options);

  genui.registerComponent('vAssignable', {
    events: { select: { channel: 'callback', prop: 'onSelect', payload: '' } },
    expose: { value: 'value' },
    factory: VAssignable
  });
  return genui;
}

describe('事件位赋值映射归一化', () => {
  it('引用键映射归一成 assign 动作，源值保持表达式', () => {
    expect(
      normalizeSugarDeep({
        on: { change: { '@:/qty': '#:/value', '@:/note': { $arg: 'label' } } }
      })
    ).toEqual({
      on: {
        change: {
          $action: 'assign',
          params: {
            assignments: [
              { target: '@:/qty', value: { $bind: 'value', $from: '#nearest' } },
              { target: '@:/note', value: { $arg: 'label' } }
            ]
          }
        }
      }
    });
  });

  it('引用键与 $action 混用是明确错误', () => {
    const genui = createFixture();

    expect(() =>
      genui.fromJson({
        root: {
          type: 'vAssignable',
          on: { select: { '@:/amount': '#:/value', $action: 'noop' } }
        }
      })
    ).toThrow(/事件处理器不能同时使用赋值映射和 \$action/);
  });
});

describe('事件位赋值映射', () => {
  it('回调组件可用 #:/value 直接写入数据路径', async () => {
    const listener = vi.fn();
    const genui = createFixture();
    const surface = genui.fromJson({
      data: { amount: 0 },
      root: {
        type: 'vAssignable',
        props: { value: 7 },
        on: { select: { '@:/amount': '#:/value' } }
      }
    });

    surface.on('action', listener);

    const target = document.createElement('div');
    surface.bindTo(target);
    target.querySelector('button').click();
    await Promise.resolve();

    expect(surface.data.read('/amount')).toBe(7);
    expect(listener.mock.calls[0][0]).toMatchObject({
      name: 'assign',
      params: { assignments: [{ path: '/amount', value: 7 }] }
    });
  });

  it('repeat 行内目标按当前行作用域解析', async () => {
    const genui = createFixture();
    const surface = genui.fromJson({
      data: {
        items: [
          { value: 1, qty: 0 },
          { value: 2, qty: 0 }
        ]
      },
      root: {
        type: 'div',
        repeat: { $each: '@:/items' },
        template: {
          type: 'vAssignable',
          props: { value: '@:value' },
          on: { select: { '@:qty': '#:/value' } }
        }
      }
    });
    const target = document.createElement('div');

    surface.bindTo(target);
    const buttons = target.querySelectorAll('button');
    buttons[1].click();
    await Promise.resolve();

    expect(surface.data.read('/items/0/qty')).toBe(0);
    expect(surface.data.read('/items/1/qty')).toBe(2);
  });

  it('只写 data 作用域：组件域与宿主保管者目标不可写', () => {
    expect(() => resolveWritableReference('#gauge:/value', { scope: null })).toThrow(
      /只支持写入数据域/
    );
    expect(() => resolveWritableReference('@i18n:/x', { scope: null })).toThrow(/只支持写入数据域/);
  });
});
