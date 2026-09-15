import { describe, expect, it } from 'vitest';
import { div, input, ref, section } from '../index.js';

describe('mounted condition adoption', () => {
  it('omits server HTML and detached DOM when the condition is false', () => {
    const visible = ref(false);
    const box = section((node) => {
      node.div((panel) => {
        panel.mounted(visible);
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
        panel.mounted(visible);
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
    host.addChild('k', div((node) => {
      node.mounted(visible);
      node.attr('data-keyed', 'true');
    }));
    const lazy = div({ mounted: visible });
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
      node.mounted(() => shown);
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

  it('rejects bad conditions and redeclaration after adoption', () => {
    const visible = ref(true);
    const host = div();
    const panel = div((node) => node.mounted(visible));
    host.child(panel);
    host.renderDom();

    expect(() => div().mounted(true)).toThrow(/signal handle or a zero-argument function/i);
    expect(() => div((node) => node.mounted('yes'))).toThrow(
      /signal handle or a zero-argument function/i
    );
    expect(() => panel.mounted(visible)).toThrow(/adopted/i);
  });

  it('adopts a mounted declaration on replaceChild replacements', () => {
    const visible = ref(true);
    const list = div();
    list.addChild('b', div('B-old'));
    list.renderDom();

    list.replaceChild('b', div((node) => {
      node.mounted(visible);
      node.attr('data-new', 'true');
    }));

    visible.value = false;
    expect(list.children()[0]._el.parentNode).toBeNull();

    visible.value = true;
    expect(list.children()[0]._el.parentNode).toBe(list._el);
  });

  it('does not reattach during the clearChildren removal window', () => {
    const visible = ref(false);
    const host = div();
    const box = div((panel) => panel.mounted(visible));
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
    const box = div((panel) => panel.mounted(visible));
    host.child(box);
    host.renderDom();

    expect(() => host.destroy()).not.toThrow();
    expect(() => host.destroy()).not.toThrow();
  });
});
