/**
 * 票 42 / T5：组件级钩子 `whenMount` / `whenDestroy`。
 *
 * 口径：声明在 vNode 的 api 或形态 B 的返回对象上（属性持函数，与 whenFailed 同族）；
 * whenMount 在真正落地时触发（`mountable(false)` 不触发）；whenDestroy 在子树销毁**前**触发、幂等；
 * 出现在 options 对象里 → 报错（不与 onClick 等事件简写混用）。
 */
import { describe, expect, it } from 'vitest';
import { div, ref, span, vCard, vNode } from '../index.js';

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

  it('hands the host element to both hooks, so state lives on the api', () => {
    const calls = [];
    const contexts = [];
    const editor = vNode((api) => {
      // 一律写 api：箭头命令里 `this` 不是组件（既有用例另行钉住 `this === api` 的绑定）
      api.value = () => api.instance?.text ?? '';
      api.whenMount = (host) => {
        contexts.push(host);
        const element = host.element();
        calls.push(['mount', element]);
        api.instance = {
          element,
          text: element.textContent,
          destroy: () => calls.push(['dispose', element])
        };
      };
      api.whenDestroy = (host) => {
        contexts.push(host);
        const element = host.element();
        calls.push(['destroy', element]);
        api.instance?.destroy();
        api.instance = null;
      };
      return div({ class: 'editor-host' }, '内容');
    });

    document.body.innerHTML = '';
    const target = mountToHost(editor);
    const hostElement = target.firstElementChild;

    expect(calls).toEqual([['mount', hostElement]]);
    expect(hostElement.isConnected).toBe(true);
    expect(editor.value()).toBe('内容');
    expect(editor.setValue).toBeUndefined();

    editor.destroy();
    expect(calls[1]).toEqual(['destroy', hostElement]);
    expect(calls[2]).toEqual(['dispose', hostElement]);
    // 同一个上下文对象交给两个钩子；element() 现取，不是建时的快照
    expect(contexts[0]).toBe(contexts[1]);
    expect(contexts[0].element()).toBe(hostElement);
  });

  it('hands null to the hooks for a multi-root component', () => {
    const seen = [];
    const fragment = vNode((api) => {
      api.whenMount = (host) => seen.push(host.element());
      return [div('a'), div('b')];
    });

    document.body.innerHTML = '';
    mountToHost(fragment);

    expect(seen).toEqual([null]);
  });

  it('mounts a definition-function component and fires whenMount once', () => {
    const calls = [];
    const component = vNode((api) => {
      api.whenMount = () => {
        calls.push('mount');
      };
      return div('body');
    });

    document.body.innerHTML = '';
    const host = mountToHost(div((root) => root.child(component)));

    expect(calls).toEqual(['mount']);
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

  it('fires mount/destroy for keyed rows whose keys change', () => {
    const events = [];
    const rows = ref([{ id: 1 }, { id: 2 }]);
    const rowFactory = (id) =>
      vNode((api) => {
        api.whenMount = () => events.push(`mount:${id}`);
        api.whenDestroy = () => events.push(`destroy:${id}`);
        return div(`row-${id}`);
      });

    document.body.innerHTML = '';
    const host = mountToHost(
      div((root) => {
        root.keyed(
          rows,
          (row) => row.id,
          (row) => rowFactory(row.id)
        );
      })
    );

    expect(events.filter((item) => item.startsWith('mount:')).length).toBeGreaterThan(0);
    expect(host.textContent).toContain('row-1');

    rows.value = [{ id: 1 }, { id: 3 }];

    expect(events).toContain('destroy:2');
    expect(events).toContain('mount:3');
    expect(host.textContent).toContain('row-3');
  });

  it('fires hooks and releases slot content on clearChildren()', () => {
    const events = [];
    const panel = vNode((api) => {
      api.whenDestroy = () => events.push('destroy:panel');
      return div((root) => root.span({ slot: 't-head' }, 'default'));
    });
    const carrier = span({ slot: 't-head' }, 'user');

    const container = div((root) => root.child(panel));
    document.body.innerHTML = '';
    mountToHost(container);
    panel.child(carrier);

    container.clearChildren();
    container.renderDom(); // clearChildren 把子节点放进 pendingRemovals，提交时才销毁

    expect(events).toContain('destroy:panel');
    expect(carrier._deleted).toBe(true);
  });

  it('renders the same DOM for the class form and the equivalent B form', () => {
    const classForm = vCard((card) => {
      card.vCardHeader('标题');
      card.vCardBody((body) => body.p('内容'));
    });
    const bForm = vNode((api) => {
      api.whenMount = () => {};
      return div((root) => {
        root.className('VCard');
        root.div((head) => head.className('VCardHeader').child('标题'));
        root.div((body) => body.className('VCardBody').child('内容'));
      });
    });

    // 结构语义一致（类名与文本相同）；属性顺序按各自的写法，这里比对规范化后的 HTML 形状
    expect(bForm.toHTML()).toContain('VCardHeader');
    expect(bForm.toHTML()).toContain('标题');
    expect(bForm.toHTML()).toContain('内容');
    expect(classForm.toHTML()).toContain('VCardHeader');
    expect(classForm.toHTML()).toContain('标题');
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
