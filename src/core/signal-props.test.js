import { afterEach, describe, expect, it } from 'vitest';
import { installSignals, ref, vButton, vInput } from '../index.js';

afterEach(() => {
  installSignals(null);
});

describe('signal props', () => {
  it('binds an input value to a signal', () => {
    const name = ref('Ada');
    const field = vInput({ value: name });
    field.renderDom();

    expect(field._input._el.value).toBe('Ada');

    name.value = 'Grace';

    expect(field._input._el.value).toBe('Grace');
  });

  it('binds placeholder and disabled props', () => {
    const hint = ref('姓名');
    const locked = ref(false);
    const field = vInput({ placeholder: hint, disabled: locked });
    field.renderDom();

    expect(field._input._el.getAttribute('placeholder')).toBe('姓名');
    expect(field._input._el.disabled).toBe(false);

    hint.value = '用户名';
    locked.value = true;

    expect(field._input._el.getAttribute('placeholder')).toBe('用户名');
    expect(field._input._el.disabled).toBe(true);
  });

  it('binds component props passed through the setup path', () => {
    const locked = ref(false);
    const button = vButton({ label: '保存', disabled: locked });
    button.renderDom();

    expect(button._el.disabled).toBe(false);

    locked.value = true;

    expect(button._el.disabled).toBe(true);
  });

  it('keeps plain prop values working', () => {
    const field = vInput({ value: 'plain', placeholder: 'p' });
    field.renderDom();

    expect(field._input._el.value).toBe('plain');
    expect(field._input._el.getAttribute('placeholder')).toBe('p');
  });

  it('renders the value during the build before the node is rendered', () => {
    const name = ref('Ada');
    const field = vInput({ value: name });

    name.value = 'Grace';

    expect(field.toHTML()).toContain('value="Ada"');
  });
});
