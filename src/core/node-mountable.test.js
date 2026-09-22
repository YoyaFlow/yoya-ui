import { describe, expect, it } from 'vitest';
import { div, li, ref, section, ul } from '../index.js';
import { dependentCount } from './signals/observe.js';

describe('mountable condition adoption', () => {
  it('omits server HTML and detached DOM when the condition is false', () => {
    const visible = ref(false);
    const box = section((node) => {
      node.div((panel) => {
        panel.mountable(visible);
        panel.attr('data-panel', 'true');
      });
    });

    expect(box.toHTML()).toBe('<section></section>');

    const element = box.renderDom();
    expect(element.querySelector('[data-panel]')).toBeNull();
    expect(box.children()[0]._el).not.toBeNull();
  });

  it('reattaches at its child slot and preserves input state', () => {
    const visible = ref(false);
    const box = section((node) => {
      node.div('before');
      node.div((panel) => {
        panel.mountable(visible);
        panel.input((field) => field.attr('name', 'keyword'));
      });
      node.div('after');
    });
    const element = box.renderDom();
    const panelNode = box.children()[1];

    visible.value = true;
    expect(element.textContent).toBe('beforeafter');

    const field = element.querySelector('input');
    field.value = 'yoya';
    visible.value = false;
    expect(element.querySelector('input')).toBeNull();

    visible.value = true;
    const restored = element.querySelector('input');
    expect(restored.value).toBe('yoya');
    expect(element.childNodes[1]).toBe(panelNode._el);
  });

  it('supports keyed insertion, setup object form, and isMounted', () => {
    const visible = ref(true);
    const host = div();
    host.addChild(
      'k',
      div((node) => {
        node.mountable(visible);
        node.attr('data-keyed', 'true');
      })
    );
    const lazy = div({ mountable: visible });
    host.child(lazy);
    const element = host.renderDom();

    expect(element.children).toHaveLength(2);
    expect(host.getChild('k').isMounted()).toBe(true);
    expect(lazy.isMounted()).toBe(true);

    visible.value = false;
    expect(element.children).toHaveLength(0);
    expect(host.getChild('k').isMounted()).toBe(false);
    expect(lazy.isMounted()).toBe(false);
    expect(lazy._el).not.toBeNull();
  });

  it('supports zero-argument closures refreshed by parent flush', () => {
    let shown = false;
    const host = div();
    const panel = div((node) => {
      node.mountable(() => shown);
      node.attr('data-closure', 'true');
    });
    host.child(panel);
    const element = host.renderDom();

    expect(panel.isMounted()).toBe(false);
    expect(element.querySelector('[data-closure]')).toBeNull();

    shown = true;
    host.flush();

    expect(panel.isMounted()).toBe(true);
    expect(element.querySelector('[data-closure]')).not.toBeNull();
  });

  it('replaces the condition any time and rejects bad conditions', () => {
    const visible = ref(true);
    const hidden = ref(false);
    const host = div();
    const panel = div((node) => {
      node.mountable(visible);
      node.attr('data-panel', 'true');
    });
    host.child(panel);
    const element = host.renderDom();

    expect(element.querySelector('[data-panel]')).not.toBeNull();

    expect(() => div().mountable('yes')).toThrow(/signal handle.*boolean.*zero-argument function/i);
    expect(() => div((node) => node.mountable('yes'))).toThrow(
      /signal handle.*boolean.*zero-argument function/i
    );

    // 入树后随时替换：句柄 → 句柄、句柄 → 常量都立即生效
    panel.mountable(hidden);
    expect(panel.isMounted()).toBe(false);
    expect(element.querySelector('[data-panel]')).toBeNull();

    panel.mountable(true);
    expect(panel.isMounted()).toBe(true);
    expect(element.querySelector('[data-panel]')).not.toBeNull();

    panel.mountable(false);
    expect(panel.isMounted()).toBe(false);
    expect(element.querySelector('[data-panel]')).toBeNull();

    expect(panel.mountable()).toBe(panel);
    expect(panel.isMounted()).toBe(true);
    expect(element.querySelector('[data-panel]')).not.toBeNull();
  });

  it('defaults to mounted when mountable() is called without a condition', () => {
    const host = div();
    const panel = div((node) => {
      node.mountable();
      node.attr('data-panel', 'true');
    });
    host.child(panel);
    const element = host.renderDom();

    expect(panel.isMounted()).toBe(true);
    expect(element.querySelector('[data-panel]')).not.toBeNull();

    panel.mountable(false);
    expect(element.querySelector('[data-panel]')).toBeNull();
  });

  it('keeps a false condition when the child is re-inserted outside a builder', () => {
    const host = div();
    const panel = div((node) => {
      node.mountable(false);
      node.attr('data-panel', 'true');
    });
    const element = host.renderDom();

    host.child(panel);
    expect(element.querySelector('[data-panel]')).toBeNull();

    // 构建之外的重新插入（clearChildren + child）不能把条件为假的子节点挂进 DOM：
    // 释放旧挂载绑定会把 _childMountStates 里的状态清掉，必须发生在登记新绑定之前。
    host.clearChildren().child([panel]);
    expect(panel.isMounted()).toBe(false);
    expect(element.querySelector('[data-panel]')).toBeNull();
  });

  it('adopts a mountable declaration on replaceChild replacements', () => {
    const visible = ref(true);
    const list = div();
    list.addChild('b', div('B-old'));
    list.renderDom();

    list.replaceChild(
      'b',
      div((node) => {
        node.mountable(visible);
        node.attr('data-new', 'true');
      })
    );

    visible.value = false;
    expect(list.children()[0]._el.parentNode).toBeNull();

    visible.value = true;
    expect(list.children()[0]._el.parentNode).toBe(list._el);
  });

  it('does not reattach during the clearChildren removal window', () => {
    const visible = ref(false);
    const host = div();
    const box = div((panel) => panel.mountable(visible));
    host.child(box);
    const element = host.renderDom();

    host.clearChildren();
    visible.value = true;
    host.commit();

    expect(element.children).toHaveLength(0);
  });

  it('destroys safely from the detached state', () => {
    const visible = ref(false);
    const host = div();
    const box = div((panel) => panel.mountable(visible));
    host.child(box);
    host.renderDom();

    expect(() => host.destroy()).not.toThrow();
    expect(() => host.destroy()).not.toThrow();
  });

  it('keeps an unmounted child out of the DOM when it is added after render', () => {
    const visible = ref(false);
    const host = div();
    const element = host.renderDom();
    const panel = div('panel');
    panel.mountable(visible);

    host.child(panel);

    expect(element.textContent).toBe('');
    expect(panel.isMounted()).toBe(false);
    expect(panel._el).not.toBeNull();

    visible.value = true;
    expect(element.textContent).toBe('panel');
  });

  it('releases the mount binding when a keyed row is destroyed', () => {
    const visible = ref(true);
    const rows = ref([{ id: 1 }, { id: 2 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(String(row.id)).mountable(visible)
      );
    });
    list.renderDom();

    expect(dependentCount(visible._source)).toBe(2);

    rows.value = [];

    // 列表容器长命：行销毁时必须同时释放父节点为它登记的挂载绑定，
    // 否则已销毁的行会被绑定闭包一直钉在内存里
    expect(dependentCount(visible._source)).toBe(0);
  });

  it('releases the mount binding when a plain child is destroyed', () => {
    const visible = ref(true);
    const host = div();
    const panel = div('panel');
    panel.mountable(visible);
    host.child(panel);
    host.renderDom();

    expect(dependentCount(visible._source)).toBe(1);

    panel.destroy();

    expect(dependentCount(visible._source)).toBe(0);
  });
});
