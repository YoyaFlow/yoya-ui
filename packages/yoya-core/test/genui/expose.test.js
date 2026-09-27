import { describe, expect, it } from 'vitest';
import { ref, vNode, vText } from '../../src/index.js';
import { div } from '../../src/html/index.js';
import { createGenUI } from '../../src/genui/index.js';
import { extractGenuiWiring } from '../../src/genui/kitgen/index.js';

function VProbe({ value = 0 } = {}, setup = null) {
  const state = ref(value);

  return vNode((api) => {
    api.value = (next) => {
      if (next === undefined) {
        return state.value;
      }

      state.value = next;
      return api;
    };

    const root = div({}, (box) => box.child(vText(state)));
    const exposedHost = new Proxy(root, {
      get(target, property, receiver) {
        return property === 'value' ? api.value : Reflect.get(target, property, receiver);
      }
    });

    setup?.(exposedHost);
    return root;
  });
}

describe('组件数据暴露', () => {
  it('kitgen 解析 @genui.expose 标签', () => {
    const source = `/**
 * @genui.expose value command=value
 */
export const vProbe = createComponentShortcut(VProbe);`;

    expect(extractGenuiWiring(source, source.indexOf('export const'))).toEqual({
      events: {},
      expose: { value: 'value' },
      props: {}
    });
  });

  it('无 id 组件也能给子级暴露最近数据，数据绑定变化会同步暴露句柄', () => {
    const genui = createGenUI();

    genui.registerComponent('vProbe', {
      factory: VProbe,
      expose: { value: 'value' }
    });

    const surface = genui.fromJson({
      data: { amount: 7 },
      root: {
        type: 'div',
        children: [
          {
            type: 'vProbe',
            props: { value: '@:/amount' },
            children: [{ type: 'p', text: '#:/value' }]
          }
        ]
      }
    });
    const target = document.createElement('div');

    surface.bindTo(target);
    expect([...target.querySelectorAll('p')].map((node) => node.textContent)).toEqual(['7']);

    surface.data.write('/amount', 9);
    expect([...target.querySelectorAll('p')].map((node) => node.textContent)).toEqual(['9']);
  });

  it('#id 与最近组件引用都能读到 expose 声明的数据', () => {
    const genui = createGenUI();

    genui.registerComponent('vProbe', {
      factory: VProbe,
      expose: { value: 'value' }
    });

    const surface = genui.fromJson({
      root: {
        type: 'div',
        children: [
          {
            type: 'vProbe',
            id: 'probe',
            props: { value: 7 },
            children: [{ type: 'p', text: '#:/value' }]
          },
          { type: 'p', text: '#probe:/value' }
        ]
      }
    });
    const target = document.createElement('div');

    surface.bindTo(target);

    expect([...target.querySelectorAll('p')].map((node) => node.textContent)).toEqual(['7', '7']);
  });
});
