/**
 * 元素级操作 API（票 16 第 114 / 115 条）：组件碰 DOM 的唯一口子——
 * `focus()` / `owns(target)` / `prop(name[, value])`，组件代码里不再出现 `_el` / `renderDom()`。
 */
import { describe, expect, it } from 'vitest';
import { button as buttonTag, div, input } from '../index.js';

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
});
