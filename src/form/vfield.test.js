import { afterEach, describe, expect, it } from 'vitest';
import { vBadge, vField } from '../index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeField(initial = 'Ada') {
  return vField((field) => {
    field.label('姓名');
    field.control((editor) => editor.vInput({ name: 'name', value: initial }));
  });
}

describe('vField floating edit', () => {
  it('renders an input-sized display box mirroring the control value', () => {
    const field = makeField('Ada');
    const el = field.renderDom();
    const display = el.querySelector('[vn~="VFieldDisplay"]');
    expect(display.textContent).toContain('Ada');
    expect(display.style.minHeight).toContain('yoya-control-height-md');
    expect(display.style.display).toBe('flex');
    expect(el.querySelector('[vn~="VFieldEditor"]').style.display).toBe('none');
  });

  it('double-click enters edit with an editor anchored to the field', () => {
    const field = makeField();
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(field.mode()).toBe('edit');
    const editor = el.querySelector('[vn~="VFieldEditor"]');
    expect(editor.style.display).not.toBe('none');
    expect(el.style.position).toBe('relative');
    expect(editor.style.position).toBe('absolute');
  });

  it('confirm button saves and restores display to the new value', () => {
    const field = makeField();
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = el.querySelector('[vn~="VFieldEditor"] input');
    input.value = 'Zoe';
    el.querySelector('[vn~="VFieldConfirm"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(field.mode()).toBe('view');
    expect(field.value()).toBe('Zoe');
    expect(el.querySelector('[vn~="VFieldDisplay"]').textContent).toContain('Zoe');
  });

  it('cancel button cancels and restores the previous value', () => {
    const field = makeField('Ada');
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = el.querySelector('[vn~="VFieldEditor"] input');
    input.value = 'Zoe';
    el.querySelector('[vn~="VFieldCancel"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(field.mode()).toBe('view');
    expect(field.value()).toBe('Ada');
    expect(el.querySelector('[vn~="VFieldDisplay"]').textContent).toContain('Ada');
  });

  it('focus loss does not close the editor; confirm saves', () => {
    const field = makeField();
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = el.querySelector('[vn~="VFieldEditor"] input');
    input.value = 'Ray';
    input.dispatchEvent(new MouseEvent('blur', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    expect(field.mode()).toBe('edit');
    el.querySelector('[vn~="VFieldConfirm"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(field.mode()).toBe('view');
    expect(field.value()).toBe('Ray');
  });

  it('anchors the floating editor to the display box, not the whole field', () => {
    const field = makeField();
    const el = field.renderDom();
    const display = el.querySelector('[vn~="VFieldDisplay"]');
    const editor = el.querySelector('[vn~="VFieldEditor"]');

    display.getBoundingClientRect = () => ({
      bottom: 80,
      height: 34,
      left: 120,
      right: 360,
      top: 46,
      width: 240
    });

    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(editor.style.left).toBe('120px');
    expect(editor.style.top).toBe('46px');
    expect(editor.style.width).toBe('240px');
    expect(editor.style.minHeight).toBe('34px');
  });

  it('display accepts a function setup for custom content', () => {
    const field = vField((item) => {
      item.label('负责人');
      item.display((box) => {
        box.strong('SRE');
        box.child(' 团队');
      });
    });
    const el = field.renderDom();
    const display = el.querySelector('[vn~="VFieldDisplay"]');
    expect(display.querySelector('strong')?.textContent).toBe('SRE');
    expect(display.textContent).toContain('团队');
  });

  it('formatter customizes how the control value renders in view mode', () => {
    const field = makeField('Ada');
    field.formatter((value) => vBadge(String(value)).status('success'));
    const el = field.renderDom();
    expect(el.querySelector('[vn~="VFieldDisplay"] .yoya-vbadge')).toBeTruthy();
    expect(el.querySelector('[vn~="VFieldDisplay"]').textContent).toContain('Ada');

    // edit then save: formatting persists (still a badge), value updated
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = el.querySelector('[vn~="VFieldEditor"] input');
    input.value = 'Zoe';
    el.querySelector('[vn~="VFieldConfirm"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(el.querySelector('[vn~="VFieldDisplay"] .yoya-vbadge')).toBeTruthy();
    expect(el.querySelector('[vn~="VFieldDisplay"]').textContent).toContain('Zoe');
  });

  it('displayClass and displayStyle customize the display box', () => {
    const field = makeField();
    const el = field.renderDom();
    const display = el.querySelector('[vn~="VFieldDisplay"]');
    expect(display.getAttribute('vn')).toBe('VFieldDisplay');
    field.displayClass('my-display');
    field.displayStyle({ color: 'rgb(220, 38, 38)' });
    expect(el.querySelector('[vn~="VFieldDisplay"]').classList.contains('my-display')).toBe(true);
    expect(el.querySelector('[vn~="VFieldDisplay"]').style.color).toBe('rgb(220, 38, 38)');
  });

  it('hides the display box behind the floating editor in edit mode', () => {
    const field = makeField();
    field.displayStyle({ minHeight: '72px' });
    const el = field.renderDom();
    const display = el.querySelector('[vn~="VFieldDisplay"]');

    expect(display.style.visibility).not.toBe('hidden');
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(display.style.visibility).toBe('hidden');

    el.querySelector('[vn~="VFieldCancel"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(display.style.visibility).not.toBe('hidden');
  });

  it('removes the textarea inline border inside the floating editor', () => {
    const field = vField((item) => {
      item.label('备注');
      item.control((editor) => editor.vTextarea({ name: 'notes', value: '第一行' }));
    });
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const textarea = el.querySelector('[vn~="VFieldEditor"] textarea');
    expect(textarea.style.border).not.toContain('1px');
  });

  it('Enter keeps editing inside a textarea; focusout saves', () => {
    const field = vField((item) => {
      item.label('备注');
      item.control((editor) => editor.vTextarea({ name: 'notes', value: '第一行' }));
    });
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const textarea = el.querySelector('[vn~="VFieldEditor"] textarea');
    textarea.value = '第一行\n第二行';
    textarea.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    expect(field.mode()).toBe('edit');

    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    expect(field.mode()).toBe('edit');

    el.querySelector('[vn~="VFieldConfirm"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(field.mode()).toBe('view');
    expect(field.value()).toBe('第一行\n第二行');
  });

  it('mouse interactions inside the floating editor do not close it', async () => {
    const field = vField((item) => {
      item.label('能力');
      item.control((editor) =>
        editor.vCheckboxes({
          name: 'capabilities',
          options: [
            { label: '监控告警', value: 'monitor' },
            { label: '自动扩容', value: 'scale' },
            { label: '日志采集', value: 'log' }
          ],
          value: ['monitor']
        })
      );
    });
    const el = field.renderDom();
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(field.mode()).toBe('edit');

    const boxes = el.querySelectorAll('[vn~="VFieldEditor"] input[type="checkbox"]');
    boxes[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    boxes[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    boxes[1].dispatchEvent(new Event('change', { bubbles: true }));
    // any focusout that follows an inside-editor interaction is ignored
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(field.mode()).toBe('edit');

    // let the interaction microtask drain; the editor must stay open
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(field.mode()).toBe('edit');

    // clicking outside still does not close; only confirm does
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    expect(field.mode()).toBe('edit');
    el.querySelector('[vn~="VFieldConfirm"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(field.mode()).toBe('view');
  });
});
