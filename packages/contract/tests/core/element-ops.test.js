/**
 * 元素级操作 API（票 16 第 114 / 115 条）：组件碰 DOM 的唯一口子——
 * `focus()` / `owns(target)` / `prop(name[, value])`，组件代码里不再出现 `_el` / `renderDom()`。
 */
import { describe, expect, it } from 'vitest';
import { button as buttonTag, div, input, ref, vNode } from '@yoyaflow/yoya-core';
// 本用例断言"组件命令遮蔽同名操作 API"——遮蔽由快线注册的组件提供，
// 所以它是**跨包契约**而不是 core 的自有验收（拆包时从 packages/yoya-core 挪来）。
import '@yoyaflow/yoya-ui';

describe('元素级操作 API', () => {
  it('focus() 把焦点交给落地元素，未落地时无事发生', () => {
    const button = buttonTag('按钮');

    expect(() => button.focus()).not.toThrow();

    const element = button.renderDom();
    document.body.appendChild(element);
    button.focus();

    expect(document.activeElement).toBe(element);
  });

  it('owns(target) 判包含，未落地为 false', () => {
    const box = div((root) => root.child(div({ id: 'inner' }, '内部')));

    expect(box.owns(document.body)).toBe(false);

    const element = box.renderDom();
    document.body.appendChild(element);
    const inner = element.querySelector('#inner');

    expect(box.owns(inner)).toBe(true);
    expect(box.owns(document.body)).toBe(false);
  });

  it('prop(name[, value]) 读写 DOM property（写不成属性的那些）', () => {
    const box = input({ attrs: { type: 'checkbox' } });
    const element = box.renderDom();

    expect(box.prop('indeterminate')).toBe(false);

    box.prop('indeterminate', true);
    expect(element.indeterminate).toBe(true);
    expect(element.hasAttribute('indeterminate')).toBe(false);
  });

  it('组件命令可以遮蔽同名操作 API（不报命名冲突）', () => {
    const node = div((root) => {
      root.vMenuItem('甲');
    }).renderDom();
    const item = node.querySelector('[vn~="VMenuItem"]');

    // 菜单项自己定义了 `focus()` 命令：点它不该抛"命令撞节点 API"
    expect(item).not.toBeNull();
    expect(() => item.focus?.()).not.toThrow();
  });

  it('isLanded() 判落地，未落地读不到元素', () => {
    const box = div((root) => root.child(div({ id: 'inner' })));

    expect(box.isLanded()).toBe(false);
    expect(box.measure()).toBe(null);
    expect(box.prop('offsetWidth')).toBe(undefined);

    const element = box.renderDom();
    document.body.appendChild(element);

    expect(box.isLanded()).toBe(true);
    expect(box.measure()).not.toBe(null);
  });

  it('rect() 量自己的元素，emit() 派发原生 / 自定义事件', () => {
    const box = div('内容');
    const element = box.renderDom();
    document.body.appendChild(element);

    const seen = [];
    element.addEventListener('yoya:probe', (event) => seen.push(event.detail));
    element.addEventListener('change', () => seen.push('change'));

    box.emit('change');
    box.emit('yoya:probe', 42);

    expect(seen).toEqual(['change', 42]);
    expect(box.measure().width).toBe(0);
  });

  it('invoke() 调原生方法；replaceChildren() 真清空（DOM 立刻换）', () => {
    let clicked = 0;
    const box = div((root) => {
      root.child(div({ id: 'old' }));
      root.on('click', () => {
        clicked += 1;
      });
    });
    const element = box.renderDom();
    document.body.appendChild(element);

    box.invoke('click');
    expect(clicked).toBe(1);

    box.replaceChildren(div({ id: 'next' }));

    expect(element.querySelector('#old')).toBe(null);
    expect(element.querySelector('#next')).not.toBe(null);
    expect(box.children()).toHaveLength(1);
  });
});

/**
 * 按名字调用（`call` / `apply`）：节点自己的方法（组件命令 / 结构方法）当场调，
 * 元素那一路（节点上没有的名字 / 元素级口子）落到已落地元素上；**没落地时先记下、
 * 落地后补跑一次**——调用点不用自己写 `isLanded()` 守卫。
 */
describe('按名字调用 call() / apply()', () => {
  it('call(name, …) 当场调节点自己的方法（结构 / 命令）', () => {
    const box = div((root) => root.child(div({ id: 'old' })));

    box.call('child', div({ id: 'next' }));

    expect(box.children()).toHaveLength(2);
    expect(box.renderDom().querySelector('#next')).not.toBe(null);
  });

  it('call(name) 把节点上没有的名字落到已落地元素的原生方法', () => {
    let clicked = 0;
    const box = div((root) => {
      root.on('click', () => {
        clicked += 1;
      });
    });
    document.body.appendChild(box.renderDom());

    box.call('click');

    expect(clicked).toBe(1);
  });

  it('apply(name, args) 是数组参数版', () => {
    const box = div();
    const element = box.renderDom();
    document.body.appendChild(element);

    box.apply('setAttribute', ['data-probe', 'ok']);

    expect(element.getAttribute('data-probe')).toBe('ok');
  });

  it('未落地也不丢：先排队，落地那一趟补跑一次', () => {
    let clicked = 0;
    const box = div((root) => {
      root.on('click', () => {
        clicked += 1;
      });
    });

    expect(box.call('click')).toBe(undefined);
    expect(clicked).toBe(0);

    const host = div((root) => root.child(box));
    host.bindTo(document.body);

    expect(clicked).toBe(1);
  });

  it('组件自己的 call / apply 命令不被新口子顶掉', () => {
    const node = vNode((api) => {
      api.call = (name) => `命令:${name}`;
      api.apply = (name) => `命令:${name}`;
      return div('内容');
    });

    expect(node.call('甲')).toBe('命令:甲');
    expect(node.apply('乙')).toBe('命令:乙');
  });

  it('call(name, …) 落到组件自己的命令上（组件节点）', () => {
    const node = vNode((api) => {
      api.bump = (value) => value * 2;
      return div('内容');
    });

    expect(node.call('bump', 21)).toBe(42);
  });

  it('名字在节点和元素上都没有：返回 undefined（与 invoke 同口径）', () => {
    const box = div();
    document.body.appendChild(box.renderDom());

    expect(box.call('not-a-method')).toBe(undefined);
  });

  it('参数用错当场报错：名字要字符串、apply 要数组', () => {
    const box = div();

    expect(() => box.call(1)).toThrow(TypeError);
    expect(() => box.apply('attr', 'data-x')).toThrow(TypeError);
  });

  it('没落地就销毁：排下的调用跟节点一起丢掉，不报错', () => {
    let clicked = 0;
    const box = div((root) => {
      root.on('click', () => {
        clicked += 1;
      });
    });

    box.call('click');
    box.destroy();

    expect(clicked).toBe(0);
  });

  it('补跑过的调用不再跑第二次：重新落地那一趟不重复、不报错', () => {
    let clicked = 0;
    const visible = ref(true);
    const box = div((root) => {
      root.on('click', () => {
        clicked += 1;
      });
    });
    box.mountable(visible);
    box.call('click');

    const host = div((root) => root.child(box));
    host.bindTo(document.body);

    expect(clicked).toBe(1);

    visible.value = false;
    visible.value = true;

    expect(clicked).toBe(1);
  });
});
