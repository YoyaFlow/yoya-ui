/**
 * 票 42 / T5：组件级钩子 `whenMount` / `whenDestroy`。
 *
 * 口径：声明在 vNode 的 api 或形态 B 的返回对象上（属性持函数，与 whenFailed 同族）；
 * whenMount 在真正落地时触发（`mountable(false)` 不触发）；whenDestroy 在子树销毁**前**触发、幂等；
 * 出现在 options 对象里 → 报错（不与 onClick 等事件简写混用）。
 */
import { describe, expect, it } from 'vitest';
import { div, ref, span, vNode } from '../index.js';

const mountToHost = (node, host = null) => {
  const target = host ?? document.createElement('div');
  document.body.appendChild(target);
  node.bindTo(target);
  return target;
};

describe('component hooks', () => {
  it('fires whenMount with the api as this, after the element lands', () => {
    const calls = [];
    let seen = null;
    const card = vNode((api) => {
      api.whenMount = function onMount() {
        calls.push('mount');
        seen = { self: this, attached: cardRef._el?.parentNode != null };
      };
      return div('body');
    });
    const cardRef = card;

    document.body.innerHTML = '';
    expect(calls).toEqual([]);

    mountToHost(card);

    expect(calls).toEqual(['mount']);
    expect(seen.self).toBe(card._component === undefined ? card : seen.self);
    expect(seen.attached).toBe(true);
  });

  it('does not treat api.whenMount as a command method', () => {
    const card = vNode((api) => {
      api.whenMount = () => {};
      api.bump = () => 1;
      return div('x');
    });

    expect(typeof card.bump).toBe('function');
    expect(card.whenMount).toBeUndefined();
  });

  it('supports shape B component objects (child(componentObject))', () => {
    const calls = [];
    const component = {
      render: () => div('body'),
      whenMount() {
        calls.push(['mount', this === component]);
      },
      whenDestroy() {
        calls.push(['destroy', this === component]);
      }
    };

    document.body.innerHTML = '';
    const host = mountToHost(div((root) => root.child(component)));

    expect(calls).toEqual([['mount', true]]);
    expect(host.innerHTML).toContain('body');

    document.body.innerHTML = '';
    expect(calls).toHaveLength(1);
  });

  it('runs whenDestroy before the subtree is torn down, exactly once', () => {
    const events = [];
    const card = vNode((api) => {
      api.whenDestroy = () => {
        events.push(`destroy:${card._el?.isConnected ? 'attached' : 'detached'}`);
      };
      return div((root) => root.span('body'));
    });

    document.body.innerHTML = '';
    mountToHost(card);
    expect(events).toEqual([]);

    card.destroy();
    card.destroy();

    expect(events).toEqual(['destroy:attached']);
  });

  it('rejects hooks placed in an options object', () => {
    expect(() => div({ whenMount: () => {} })).toThrow(/component hook/);
    expect(() => div({ whenDestroy: () => {} })).toThrow(/component hook/);
  });

  it('keeps whenFailed working as an options key (a node method, not a hook)', () => {
    const node = div({ whenFailed: () => null });
    expect(typeof node.whenFailed).toBe('function');
  });

  it('reports a throwing whenMount without unmounting or falling back', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const card = vNode((api) => {
      api.whenMount = () => {
        throw new Error('mount boom');
      };
      return div('body');
    });

    document.body.innerHTML = '';
    const host = mountToHost(card);

    expect(host.innerHTML).toContain('body');
    expect(card._el.parentNode).toBe(host);
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('whenMount');
    errorSpy.mockRestore();
  });

  it('reports a throwing whenDestroy and still finishes the cleanup', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const child = span('child');
    const card = vNode((api) => {
      api.whenDestroy = () => {
        throw new Error('destroy boom');
      };
      return div((root) => root.child(child));
    });

    document.body.innerHTML = '';
    mountToHost(card);

    card.destroy();
    card.destroy();

    expect(child._deleted).toBe(true);
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('whenDestroy');
    errorSpy.mockRestore();
  });

  it('defers whenMount while mountable is false and fires on real landing', () => {
    const calls = [];
    const visible = ref(false);
    const card = vNode((api) => {
      api.whenMount = () => calls.push('mount');
      return div('body');
    });
    card.mountable(visible);

    document.body.innerHTML = '';
    mountToHost(div((root) => root.child(card)));
    expect(calls).toEqual([]);

    visible.value = true;
    expect(calls).toEqual(['mount']);
  });
});
