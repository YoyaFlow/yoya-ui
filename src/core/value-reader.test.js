import { describe, expect, it } from 'vitest';
import { div, ref, vInput, vText } from '../index.js';

/**
 * 值位置口径（正式支持两条路）：
 * - 元素值位置（attr / style / styles / toggleClass / vText / mountable）接受字面值、信号句柄、零参闭包；
 *   句柄与闭包走同一条绑定管线，闭包读到的信号变化会驱动该位置更新。
 * - 组件 props 是配置位，只接受字面值与信号句柄；零参闭包显式报错，不静默串成源码文本。
 * - `child(fn)` 是组件渲染槽，不是文本值位置：文本闭包要写 `vText(fn)`。
 */
describe('element value positions', () => {
  it('accepts handles and zero-argument readers alike', () => {
    const count = ref(2);
    const element = div((node) => {
      node.attr('data-handle', count);
      node.attr('data-reader', () => count.value * 2);
      node.style('width', () => `${count.value}px`);
      node.toggleClass('is-many', () => count.value > 1);
      node.child(vText(() => `count=${count.value}`));
    }).renderDom();

    expect(element.getAttribute('data-handle')).toBe('2');
    expect(element.getAttribute('data-reader')).toBe('4');
    expect(element.style.width).toBe('2px');
    expect(element.classList.contains('is-many')).toBe(true);
    expect(element.textContent).toBe('count=2');

    count.value = 3;

    expect(element.getAttribute('data-handle')).toBe('3');
    expect(element.getAttribute('data-reader')).toBe('6');
    expect(element.style.width).toBe('3px');
    expect(element.textContent).toBe('count=3');
  });

  it('re-evaluates readers without signal dependencies on flush', () => {
    let outside = 1;
    const node = div((element) => element.attr('data-n', () => outside));
    const dom = node.renderDom();

    outside = 2;
    node.flush();

    expect(dom.getAttribute('data-n')).toBe('2');
  });

  it('accepts readers for mountable conditions', () => {
    let visible = false;
    const host = div((element) => {
      element.child(
        div((panel) => {
          panel.mountable(() => visible);
          panel.child('面板');
        })
      );
    });
    const dom = host.renderDom();

    expect(dom.textContent).toBe('');

    visible = true;
    host.flush();

    expect(dom.textContent).toBe('面板');
  });

  it('keeps child(fn) for component slots, so text readers go through vText(fn)', () => {
    expect(() => div((node) => node.child(() => '文本')).toHTML()).toThrow(/ViewNode/);
    expect(div((node) => node.child(vText(() => '文本'))).toHTML()).toBe('<div>文本</div>');
  });

  it('rejects parameterized readers with a migration error', () => {
    expect(() => div((node) => node.attr('data-x', (value) => value))).toThrow(
      /parameterized value/
    );
    expect(() => vText((value) => value)).toThrow(/parameterized value/);
  });
});

describe('component props', () => {
  it('binds signal handles', () => {
    const name = ref('初始');
    const element = div((node) => node.child(vInput({ name: 'x', value: name }))).renderDom();
    const input = element.querySelector('input');

    expect(input.value).toBe('初始');

    name.value = '改过';

    expect(input.value).toBe('改过');
  });

  it('rejects zero-argument readers instead of stringifying them', () => {
    const name = ref('初始');

    expect(() => vInput({ name: 'x', value: () => name.value })).toThrow(
      /does not accept a function/
    );
  });
});
