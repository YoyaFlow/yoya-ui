import { describe, expect, it, vi } from 'vitest';
import {
  bindClass,
  bindText,
  cloneFragment,
  createElementList,
  pushOff,
  setAttr
} from './runtime.js';
import { applyAttribute } from '../core/node.js';
import { computed, ref } from '../core/signals/handle.js';

describe('cloneFragment', () => {
  it('clones one template per shape and keeps clones independent', () => {
    const first = cloneFragment('<tr data-row-id="1"><td>0</td></tr>');
    expect(first.outerHTML).toBe('<tr data-row-id="1"><td>0</td></tr>');

    first.setAttribute('data-row-id', '2');
    first.firstElementChild.textContent = 'changed';

    const second = cloneFragment('<tr data-row-id="1"><td>0</td></tr>');
    expect(second).not.toBe(first);
    expect(second.outerHTML).toBe('<tr data-row-id="1"><td>0</td></tr>');
  });
});

describe('bindText', () => {
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

describe('createElementList', () => {
  const buildRows = () => {
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
    const { build, built } = buildRows();
    const rows = data(1, 2);

    list.sync(rows, build);
    const elements = list.elements();
    expect(list.size).toBe(2);
    expect(container.children[0].getAttribute('data-row-key')).toBe('1');

    list.sync(rows, build);
    expect(list.elements()).toEqual(elements);
    expect(built[0].destroy).not.toHaveBeenCalled();
    expect(list.data()).toEqual(rows);
  });

  it('rebuilds in place when the data reference for a key changes', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build, built } = buildRows();

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
    const { build, built } = buildRows();
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
    const { build } = buildRows();
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
    const { build } = buildRows();

    expect(() => list.sync(data(1, 1), build)).toThrow(TypeError);
  });

  it('clears the container on destroy and stays idempotent', () => {
    const container = document.createElement('ul');
    const list = createElementList(container, (row) => row.id);
    const { build, built } = buildRows();

    list.sync(data(1, 2), build);
    list.destroy();
    expect(container.children).toHaveLength(0);
    expect(list.size).toBe(0);
    built.forEach((row) => expect(row.destroy).toHaveBeenCalledTimes(1));

    list.destroy();
    built.forEach((row) => expect(row.destroy).toHaveBeenCalledTimes(1));
  });
});
