import { describe, expect, it, vi } from 'vitest';
import { computed, div, ref } from '@yoyaflow/yoya-core';
import { vForm, vInput, vSelect, vSlider, vTextarea, vTimer, vTimerRange } from '../index.js';

// 控件值位传句柄时的自动双向绑定（vInput({ value: name })）。
//
// 组件内置的回写 handler 与调用方的 onInput / onChange 在同一条多 handler 登记表上共存：
// 内置的先登记（先写回句柄），用户的后登记（读到的是已更新的值）；两侧都做值相等判断，
// 所以不会互相回声，也不会在打字时反复写 DOM。

const mount = (node) => div((root) => root.child(node)).bindTo(document.body);

const type = (element, next) => {
  element.value = next;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

const choose = (element, next) => {
  element.value = next;
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('control value two-way binding', () => {
  it('writes the handle on input and the DOM on handle writes', () => {
    const name = ref('a');
    const input = vInput({ value: name });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    type(field, 'ab');
    expect(name.value).toBe('ab');

    name.value = 'cd';
    expect(field.value).toBe('cd');

    host.destroy();
  });

  it('does not echo the write back into the DOM', () => {
    const name = ref('');
    const input = vInput({ value: name });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');
    const setAttribute = vi.spyOn(field, 'setAttribute');

    type(field, 'hello');

    expect(name.value).toBe('hello');
    expect(setAttribute).not.toHaveBeenCalledWith('value', 'hello');
    expect(field.value).toBe('hello');

    host.destroy();
  });

  it('keeps the user handler and the built-in write-back on the same event', () => {
    const name = ref('');
    const seen = [];
    const input = vInput({
      value: name,
      onInput: () => seen.push(name.value)
    });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    type(field, 'x');

    // 内置回写先登记 → 用户的 handler 读到的是写回后的值
    expect(seen).toEqual(['x']);
    expect(name.value).toBe('x');

    host.destroy();
  });

  it('writes back when the control is cleared programmatically', () => {
    const name = ref('draft');
    const input = vInput({ value: name });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    input.clear();

    expect(name.value).toBe('');
    expect(field.value).toBe('');
    host.destroy();
  });

  it('writes the handle when the control is written programmatically', () => {
    const name = ref('a');
    const input = vInput({ value: name });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    input.value('b');
    expect(field.value).toBe('b');
    expect(name.value).toBe('b');

    host.destroy();
  });

  it('keeps the handle in step through vForm collect and backfill', () => {
    const service = ref('api-gateway');
    const form = vForm((form) => {
      form.vFormItem((item) => {
        item.label('服务名').name('service');
        item.control((editor) => editor.vInput({ name: 'service', value: service }));
      });
    });
    const host = mount(form);
    const field = host.renderDom().querySelector('input');

    type(field, 'gateway');
    expect(form.values()).toEqual({ service: 'gateway' });
    expect(service.value).toBe('gateway');

    // 回填：控件与句柄一起走（句柄是唯一真源）
    form.values({ service: 'api' });
    expect(field.value).toBe('api');
    expect(service.value).toBe('api');

    host.destroy();
  });

  it('keeps the lowercase oninput option and the built-in write-back side by side', () => {
    const name = ref('');
    const seen = [];
    const input = vInput({
      value: name,
      oninput: () => seen.push(name.value)
    });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    type(field, 'typed');

    expect(name.value).toBe('typed');
    expect(seen).toEqual(['typed']);

    host.destroy();
  });

  it('does not rewrite the DOM when the same value comes back', () => {
    const name = ref('same');
    const input = vInput({ value: name });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');
    const setAttribute = vi.spyOn(field, 'setAttribute');

    name.value = 'same';
    input.value('same');
    type(field, 'same');

    expect(setAttribute).not.toHaveBeenCalled();
    expect(name.value).toBe('same');

    host.destroy();
  });

  it('keeps one-way binding for read-only derived handles', () => {
    const name = ref('a');
    const upper = computed(() => name.value.toUpperCase());
    const input = vInput({ value: upper });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    name.value = 'b';
    expect(field.value).toBe('B');

    // 派生句柄没有回写目标：输入事件不炸，也不改动派生值
    expect(() => type(field, 'zz')).not.toThrow();
    expect(upper.value).toBe('B');

    host.destroy();
  });

  it('does the same for vTextarea', () => {
    const draft = ref('');
    const area = vTextarea({ value: draft });
    const host = mount(area);
    const field = host.renderDom().querySelector('textarea');

    type(field, 'lines');
    expect(draft.value).toBe('lines');

    draft.value = 'next';
    expect(field.value).toBe('next');

    host.destroy();
  });

  it('parses number inputs to numbers（按 type 自动 parse）', () => {
    const qty = ref(1);
    const input = vInput({ type: 'number', value: qty });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    type(field, '5');
    expect(qty.value).toBe(5); // 数字，不是 "5"

    // 数据侧写回 DOM 后类型不漂：仍是 number
    qty.value = 7;
    expect(field.value).toBe('7');

    // 解析不出（浏览器把 number 框里的非法串归一成空串）→ 保留原串，不塞 NaN
    type(field, '');
    expect(qty.value).toBe('');

    host.destroy();
  });

  it('keeps text inputs as strings', () => {
    const code = ref('');
    const input = vInput({ value: code });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    type(field, '12');
    expect(code.value).toBe('12');

    host.destroy();
  });

  it('does the same for vSelect', () => {
    const selected = ref('a');
    const select = vSelect({
      value: selected,
      options: [
        ['a', 'A'],
        ['b', 'B']
      ]
    });
    const host = mount(select);
    const field = host.renderDom().querySelector('select');

    choose(field, 'b');
    expect(selected.value).toBe('b');

    selected.value = 'a';
    expect(field.value).toBe('a');

    select.clear();
    expect(selected.value).toBe('');
    expect(field.value).toBe('');

    host.destroy();
  });

  it('does the same for vSlider and keeps its numeric value', () => {
    const level = ref(10);
    const slider = vSlider({ value: level, min: 0, max: 100, step: 5 });
    const host = mount(slider);
    const field = host.renderDom().querySelector('input[type="range"]');

    type(field, '25');
    expect(level.value).toBe(25);
    expect(field.value).toBe('25');

    level.value = 35;
    expect(field.value).toBe('35');
    expect(slider.value()).toBe(35);

    slider.value(42);
    expect(level.value).toBe(40);
    expect(field.value).toBe('40');

    host.destroy();
  });

  it('keeps date and time controls bound through vTimer', () => {
    const when = ref('2026-09-28T10:30');
    const timer = vTimer({ mode: 'datetime-local', value: when });
    const host = mount(timer);
    const field = host.renderDom().querySelector('input');

    type(field, '2026-09-28T11:45');
    expect(when.value).toBe('2026-09-28T11:45');

    when.value = '2026-09-29T08:15';
    expect(field.value).toBe('2026-09-29T08:15');

    host.destroy();
  });

  it('keeps date and time ranges bound through vTimerRange', () => {
    const range = ref({
      start: '2026-09-28T10:30',
      end: '2026-09-28T11:30'
    });
    const timerRange = vTimerRange({ mode: 'datetime-local', value: range });
    const host = mount(timerRange);
    const fields = [...host.renderDom().querySelectorAll('input')];

    expect(fields.map((field) => field.value)).toEqual(['2026-09-28T10:30', '2026-09-28T11:30']);

    fields[1].value = '2026-09-28T12:45';
    fields[1].dispatchEvent(new Event('input', { bubbles: true }));
    fields[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(range.value).toEqual({
      start: '2026-09-28T10:30',
      end: '2026-09-28T12:45'
    });

    range.value = {
      start: '2026-09-29T08:15',
      end: '2026-09-29T09:15'
    };
    expect(fields.map((field) => field.value)).toEqual(['2026-09-29T08:15', '2026-09-29T09:15']);

    host.destroy();
  });
  it('leaves plain literal values one-way', () => {
    const input = vInput({ value: 'fixed' });
    const host = mount(input);
    const field = host.renderDom().querySelector('input');

    type(field, 'typed');
    expect(input.value()).toBe('typed');

    host.destroy();
  });
});
