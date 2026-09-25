/**
 * 元素级操作 API（票 16 第 114 / 115 条）：组件碰 DOM 的唯一口子——
 * `focus()` / `owns(target)` / `prop(name[, value])`，组件代码里不再出现 `_el` / `renderDom()`。
 */
import { describe, expect, it } from 'vitest';
import { button as buttonTag, div, input } from '@yoyaflow/yoya-core';
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
