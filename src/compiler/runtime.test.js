import { describe, expect, it, vi } from 'vitest';
import {
  bindClass,
  bindComponent,
  bindText,
  cloneFragment,
  createElementList,
  pushOff,
  setAttr
} from './runtime.js';
import { applyAttribute } from '../core/node.js';
import { span } from '../html/index.js';
import { computed, ref } from '../core/signals/handle.js';

describe('cloneFragment', () => {
  it('clones one template per shape and keeps clones independent', () => {
    const first = cloneFragment('<tr data-item-id="1"><td>0</td></tr>');
    expect(first.outerHTML).toBe('<tr data-item-id="1"><td>0</td></tr>');

    first.setAttribute('data-item-id', '2');
    first.firstElementChild.textContent = 'changed';

    const second = cloneFragment('<tr data-item-id="1"><td>0</td></tr>');
    expect(second).not.toBe(first);
    expect(second.outerHTML).toBe('<tr data-item-id="1"><td>0</td></tr>');
  });

  // 票 45：片段可以来自页面里的 inert <template data-yoya-fragment="签名">
  it('clones from the page template when the signature matches', () => {
    const host = document.createElement('div');
    host.innerHTML =
      '<template data-yoya-fragment="sig-page"><tr data-item-id="1"><td>page</td></tr></template>';
    document.body.appendChild(host);

    try {
      const element = cloneFragment('<tr data-item-id="1"><td>js</td></tr>', 'sig-page');
      expect(element.outerHTML).toBe('<tr data-item-id="1"><td>page</td></tr>');
    } finally {
      host.remove();
    }
  });

  it('falls back to the html string when the page template is missing', () => {
    const element = cloneFragment('<tr data-item-id="1"><td>js</td></tr>', 'sig-missing');
    expect(element.outerHTML).toBe('<tr data-item-id="1"><td>js</td></tr>');
  });

  it('fails loudly when a templates-only build has no page template', () => {
    expect(() => cloneFragment('', 'sig-missing')).toThrow(/fragment template/);
  });

  // 票 17 / C7：未命中也要缓存。否则"片段内联在 JS、页面没有模板块"的用法每建一行查一次 DOM。
  it('queries the page for a given signature only once, hit or miss', () => {
    const signature = 'sig-c7-cached-miss';
    const seen = () =>
      spy.mock.calls.filter(([selector]) => String(selector).includes(signature)).length;
    const spy = vi.spyOn(document, 'querySelector');

    for (let index = 0; index < 5; index += 1) {
      cloneFragment(`<tr><td>${signature}</td></tr>`, signature);
    }

    expect(seen()).toBe(1);
    spy.mockRestore();
  });
});

describe('bindText', () => {
  // 票 13：片段里的文本位置是**注释锚点**（相邻文本会被 HTML 解析合并，注释不会）
  it('turns a comment anchor into a real text node in place', () => {
    const host = document.createElement('div');
    host.innerHTML = 'a<!---->b';
    const anchor = host.childNodes[1];
    const label = ref('mid');

    const off = bindText(anchor, label);
    expect(host.childNodes).toHaveLength(3);
    expect(host.childNodes[1].nodeType).toBe(3);
    expect(host.textContent).toBe('amidb');

    label.value = 'next';
    expect(host.textContent).toBe('anextb');
    off();
  });

  it('writes the handle value and follows later writes until unsubscribed', () => {
    const label = ref('a');
    const element = document.createElement('td');

    const off = bindText(element, label);
    expect(element.textContent).toBe('a');

    label.value = 'b';
    expect(element.textContent).toBe('b');

    off();
    label.value = 'c';
    expect(element.textContent).toBe('b');
  });

  it('writes plain values once and normalizes null / undefined', () => {
    const element = document.createElement('td');

    expect(bindText(element, 7)).toBeNull();
    expect(element.textContent).toBe('7');

    expect(bindText(element, null)).toBeNull();
    expect(element.textContent).toBe('');
  });

  it('follows zero-argument readers like the node DSL does', () => {
    const source = ref('a');
    const element = document.createElement('td');
    const off = bindText(element, () => source.value);

    expect(element.textContent).toBe('a');
    source.value = 'b';
    expect(element.textContent).toBe('b');
    off();
    source.value = 'c';
    expect(element.textContent).toBe('b');
  });

  it('rejects a node passed into a text position instead of writing garbage', () => {
    const element = document.createElement('td');

    expect(() => bindText(element, span('body'))).toThrow(/received a node/);
  });

  // 覆盖度缺口 2：数组 / 对象在编译期认不出来时（值来自数据），运行期也不能静默写 String(x)
  it('rejects an array or object passed into a text position', () => {
    const element = document.createElement('td');

    expect(() => bindText(element, ['a', 'b'])).toThrow(/received an array/);
    expect(() => bindText(element, { text: 'a' })).toThrow(/received an object/);
    expect(element.textContent).toBe('');

    // 句柄仍然与通用路径同口径（String(value)），不在这里拦
    const rows = ref(['a', 'b']);
    bindText(element, rows);
    expect(element.textContent).toBe('a,b');
  });
});

describe('bindClass', () => {
  it('toggles the class from a handle and unsubscribes', () => {
    const selected = computed(() => false);
    const element = document.createElement('li');
    const flag = ref(false);
    const off = bindClass(element, 'danger', flag);

    expect(element.classList.contains('danger')).toBe(false);
    flag.value = true;
    expect(element.classList.contains('danger')).toBe(true);
    off();
    flag.value = false;
    expect(element.classList.contains('danger')).toBe(true);

    expect(bindClass(element, 'is-on', true)).toBeNull();
    expect(element.classList.contains('is-on')).toBe(true);
    expect(selected.value).toBe(false);
  });

  it('follows zero-argument readers', () => {
    const source = ref(false);
    const element = document.createElement('li');
    bindClass(element, 'danger', () => source.value);

    expect(element.classList.contains('danger')).toBe(false);
    source.value = true;
    expect(element.classList.contains('danger')).toBe(true);
  });
});

describe('setAttr', () => {
  it('matches the core attribute semantics for plain and boolean values', () => {
    const cases = [
      ['data-x', 'value'],
      ['data-x', 3],
      ['data-x', null],
      ['data-x', undefined],
      ['data-x', false],
      ['disabled', true],
      ['disabled', false],
      ['value', 'text']
    ];

    for (const [name, value] of cases) {
      const compiled = document.createElement('input');
      const generic = document.createElement('input');
      setAttr(compiled, name, value);
      applyAttribute(generic, name, value);
      expect(compiled.outerHTML, `${name}=${String(value)}`).toBe(generic.outerHTML);
    }
  });

  it('follows zero-argument readers for a live attribute', () => {
    const source = ref('a');
    const element = document.createElement('input');
    const off = setAttr(element, 'value', () => source.value);

    expect(element.getAttribute('value')).toBe('a');
    source.value = 'b';
    expect(element.getAttribute('value')).toBe('b');
    off();
    source.value = 'c';
    expect(element.getAttribute('value')).toBe('b');
  });
});

describe('pushOff', () => {
  it('collects unsubscribe functions and ignores plain values', () => {
    const offs = [];
    const off = () => {};

    expect(pushOff(offs, off)).toBe(off);
    expect(pushOff(offs, null)).toBeNull();
    expect(offs).toEqual([off]);
  });
});

describe('bindComponent', () => {
  const mountSlot = (html) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return { host, slot: host.firstElementChild };
  };

  it('uses the registered binder when the version hash matches', () => {
    const { slot } = mountSlot('<span class="dot"></span>');
    const calls = [];
    const off = () => {};
    const entry = {
      hash: 'h1',
      bind: (root, values) => {
        calls.push([root, values]);
        return off;
      }
    };

    expect(bindComponent(entry, slot, [{ tone: 'x' }], 'h1')).toBe(off);
    expect(calls).toEqual([[slot, [{ tone: 'x' }]]]);
  });

  it('falls back to the generic component when the binder refuses the shape', () => {
    const { host, slot } = mountSlot('<span class="stale"></span>');
    const entry = {
      hash: 'h1',
      bind: () => null,
      render: (props) => span((dot) => dot.className('dot').child(props.label))
    };

    const off = bindComponent(entry, slot, [{ label: 'x' }], 'h1');

    expect(slot.isConnected).toBe(false);
    expect(host.innerHTML).toBe('<span class="dot">x</span>');
    expect(typeof off).toBe('function');
  });

  it('falls back when the registry entry is from another build', () => {
    const { host, slot } = mountSlot('<span class="stale"></span>');
    let usedBinder = false;
    const entry = {
      hash: 'next',
      bind: () => {
        usedBinder = true;
        return () => {};
      },
      render: (props) => span((dot) => dot.child(props.label))
    };

    bindComponent(entry, slot, [{ label: 'v2' }], 'previous');

    expect(usedBinder).toBe(false);
    expect(host.innerHTML).toBe('<span>v2</span>');
  });

  it('renders definition-function components on the fallback path', () => {
    const { host, slot } = mountSlot('<span class="stale"></span>');
    const entry = {
      hash: 'h1',
      bind: () => null,
      render: (props) => span((pill) => pill.child(props.label))
    };

    bindComponent(entry, slot, [{ label: 'pill' }], 'h1');

    expect(host.innerHTML).toBe('<span>pill</span>');
  });

  it('throws a descriptive error when the entry cannot be resolved at all', () => {
    const { slot } = mountSlot('<span></span>');

    expect(() => bindComponent(undefined, slot, [], 'h1')).toThrow(/component registry/i);
  });
});

describe('createElementList', () => {
  const Cards = () => {
    const built = [];
    const build = (data) => {
      const el = document.createElement('li');
      el.textContent = String(data.id);
      const row = { el, data: null, destroy: vi.fn() };
      built.push(row);
      return row;
    };
    return { build, built };
  };

  const data = (...ids) => ids.map((id) => ({ id }));

  it('reuses the element for the same key and data reference', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build, built } = Cards();
    const rows = data(1, 2);

    list.sync(rows, build);
    const elements = list.elements();
    expect(list.size).toBe(2);
    // 票 18 / C8：默认不写键镜像属性（行 DOM 与参考实现一致）；要定位行时显式打开。
    expect(container.children[0].hasAttribute('data-row-key')).toBe(false);

    list.sync(rows, build);
    expect(list.elements()).toEqual(elements);
    expect(built[0].destroy).not.toHaveBeenCalled();
    expect(list.data()).toEqual(rows);
  });

  it('writes the key mirror attribute only when asked (ticket 18)', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id, {
      keyAttribute: 'data-row-key'
    });
    const { build } = Cards();

    list.sync(data(1, 2), build);

    expect(container.children[0].getAttribute('data-row-key')).toBe('1');
    expect(container.children[1].getAttribute('data-row-key')).toBe('2');
  });

  it('rebuilds in place when the data reference for a key changes', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build, built } = Cards();

    list.sync(data(1, 2), build);
    const previous = built[0];

    list.sync([{ id: 1 }, { id: 2 }], build);
    expect(previous.destroy).toHaveBeenCalledTimes(1);
    expect(list.elements()).toHaveLength(2);
    expect(list.elements()[0]).not.toBe(previous.el);
    expect(container.children[0].textContent).toBe('1');
    expect(container.children[1].textContent).toBe('2');
  });

  it('destroys and detaches rows whose key left', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build, built } = Cards();
    const rows = data(1, 2, 3);

    list.sync(rows, build);
    const leaving = built[0];
    list.sync([rows[1], rows[2]], build);

    expect(leaving.destroy).toHaveBeenCalledTimes(1);
    expect(leaving.el.parentNode).toBeNull();
    expect(container.children).toHaveLength(2);
    expect(list.data()).toEqual([rows[1], rows[2]]);
  });

  it('moves only the rows that changed position', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build } = Cards();
    const rows = data(1, 2, 3, 4, 5);

    list.sync(rows, build);
    const insertBefore = vi.spyOn(container, 'insertBefore');

    list.sync([rows[4], rows[1], rows[2], rows[3], rows[0]], build);
    expect(insertBefore).toHaveBeenCalledTimes(2);
    expect(list.data().map((row) => row.id)).toEqual([5, 2, 3, 4, 1]);
    expect([...container.children].map((el) => el.textContent)).toEqual(['5', '2', '3', '4', '1']);
  });

  it('rejects duplicate keys', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build } = Cards();

    expect(() => list.sync(data(1, 1), build)).toThrow(TypeError);
  });

  it('clears the container on destroy and stays idempotent', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build, built } = Cards();

    list.sync(data(1, 2), build);
    list.destroy();
    expect(container.children).toHaveLength(0);
    expect(list.size).toBe(0);
    built.forEach((row) => expect(row.destroy).toHaveBeenCalledTimes(1));

    list.destroy();
    built.forEach((row) => expect(row.destroy).toHaveBeenCalledTimes(1));
  });
});
