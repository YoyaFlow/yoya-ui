/**
 * 接线通道（票 03）：每个模型面 prop 只走**一条**通道。
 *
 * - **值通道**：代码里归一过的位（`asSignal` / `asSignalJson` 调用点）——句柄已经直传给组件，
 *   宿主**不再**按同名命令重放（否则同一份值两条通道同时生效，谁说了算不明、还多跑一轮）；
 * - **命令通道**：没归一的位按今天的行为走同名命令重放，行为完全不变。
 *
 * 注册信息里的 `valueProps` 就是构建期（kitgen 扫归一调用点）产出的声明。
 */
import { describe, expect, it } from 'vitest';
import { asSignal, computed, ref, span, vNode, vText } from '../../src/index.js';
import { createGenUI } from '../../src/genui/index.js';

/** 同名命令被调用的次数（组件 api 与视图节点不是同一个对象，用模块级计数器观察）。 */
let replayed = [];

/** 值通道夹具：归一 + 一个同名命令（用来证明命令没被重放）。 */
function ValueChannelFixture(props = {}) {
  const value = asSignal(props.value ?? 0);
  const text = computed(() => String(value.value ?? ''));

  return vNode((api) => {
    api.value = (next) => {
      replayed.push(next);
      return api;
    };

    return span({ vn: 'ValueChannelFixture' }, (node) => node.child(vText(text)));
  });
}

/** 命令通道夹具：只吃构建期一份快照，靠同名命令重放更新。 */
function CommandChannelFixture(props = {}) {
  const text = ref(String(props.value ?? 0));

  return vNode((api) => {
    api.value = (next) => {
      replayed.push(next);
      text.value = String(next ?? '');
      return api;
    };

    return span({ vn: 'CommandChannelFixture' }, (node) => node.child(vText(text)));
  });
}

function mount(factory, registration) {
  const genui = createGenUI();
  genui.registerComponent(registration.name, { factory, ...registration.extra });

  const surface = genui.fromJson({
    data: { x: 1 },
    root: {
      id: 'probe',
      type: registration.name,
      props: { value: { $bind: '/x' } }
    }
  });
  const target = document.createElement('div');
  surface.bindTo(target);

  return { surface, target };
}

describe('值通道 / 命令通道', () => {
  beforeEach(() => {
    replayed = [];
  });

  it('归一过的位：句柄直传生效，同名命令不被重放', () => {
    const { surface, target } = mount(ValueChannelFixture, {
      name: 'ValueChannelFixture',
      extra: { valueProps: ['value'] }
    });

    expect(target.textContent).toBe('1');

    surface.data.write('/x', 2);

    expect(target.textContent).toBe('2');
    expect(replayed).toEqual([]);
  });

  it('没归一的位：仍按同名命令重放（今天的行为不变）', () => {
    const { surface, target } = mount(CommandChannelFixture, {
      name: 'CommandChannelFixture',
      extra: {}
    });

    expect(target.textContent).toBe('1');

    surface.data.write('/x', 2);

    expect(target.textContent).toBe('2');
    // 今天是「构建期先喂一次 + 数据变化再喂一次」，命令通道保持这个行为不变
    expect(replayed).toEqual([1, 2]);
  });
});
