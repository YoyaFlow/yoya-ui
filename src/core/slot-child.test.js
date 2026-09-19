/**
 * 票 42 / T4：槽位子组件 —— 独立创建、延迟挂载、按显式槽名路由。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { div, span, vNode } from '../index.js';
import { defineSlotChild } from './slot.js';

let warnSpy = null;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

const mountToHost = (node) => {
  document.body.innerHTML = '';
  const host = document.createElement('div');
  document.body.appendChild(host);
  node.bindTo(host);
  return host;
};

/** 槽位子组件：独立创建 → 带 t-head 归属标记。 */
const StatusHead = defineSlotChild((label) => span((head) => head.className('head').child(label)), {
  slot: 't-head'
});

const Panel = () =>
  vNode(() =>
    div((root) => {
      root.span({ slot: 't-head' }, 'default-head');
      root.span('body');
    })
  );

describe('slot child components', () => {
  it('creates independently and routes when attached later', () => {
    const panel = Panel();
    const head = StatusHead('来自用户的头部'); // 独立创建：此时没有父组件

    expect(head.attr('slot')).toBe('t-head');
    expect(head.toHTML()).toContain('来自用户的头部');

    panel.child(head); // 延迟挂载：按标记路由

    const host = mountToHost(panel);
    // 信封不进 DOM：槽位元素保留自己的标签，拿到信封的子节点与类名；默认内容被替换
    expect(host.innerHTML).toContain('来自用户的头部');
    expect(host.innerHTML).not.toContain('default-head');
    expect(host.querySelector('[slot="t-head"]').getAttribute('class')).toContain('head');
    expect(host.innerHTML).toContain('<span>body</span>');
  });

  it('keeps an explicit marker on the created node', () => {
    const head = StatusHead('x');
    head.attr('slot', 'other');

    expect(head.attr('slot')).toBe('other');
  });

  it('does not mount when the parent has no such slot', () => {
    const plain = vNode(() => div('just-body'));
    plain.child(StatusHead('lost'));

    const host = mountToHost(plain);

    expect(host.innerHTML).toBe('<div>just-body</div>');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('keeps instances independent', () => {
    const first = Panel();
    const second = Panel();
    first.child(StatusHead('A'));
    second.child(StatusHead('B'));

    const host = mountToHost(div((root) => root.child(first, second)));

    expect(host.innerHTML).toContain('A');
    expect(host.innerHTML).toContain('B');
  });

  it('rejects a second carrier for the same slot', () => {
    const panel = Panel();
    mountToHost(panel);
    panel.child(StatusHead('first'));

    expect(() => panel.child(StatusHead('second'))).toThrow(/already received content/);
  });
});
