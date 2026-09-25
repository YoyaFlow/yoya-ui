import { afterEach, describe, expect, it } from 'vitest';
import { installSignals, ref, vButton, vInput } from '@yoyaflow/yoya-ui';

afterEach(() => {
  installSignals(null);
});

describe('signal props', () => {
  it('binds an input value to a signal', () => {
    const name = ref('Ada');
    const field = vInput({ value: name });
    const input = field.renderDom().querySelector('input');

    expect(input.value).toBe('Ada');

    name.value = 'Grace';

    expect(input.value).toBe('Grace');
  });

  it('binds placeholder and disabled props', () => {
    const hint = ref('姓名');
    const locked = ref(false);
    const field = vInput({ placeholder: hint, disabled: locked });
    const input = field.renderDom().querySelector('input');

    expect(input.getAttribute('placeholder')).toBe('姓名');
    expect(input.disabled).toBe(false);

    hint.value = '用户名';
    locked.value = true;

    expect(input.getAttribute('placeholder')).toBe('用户名');
    expect(input.disabled).toBe(true);
  });

  it('binds component props passed through the setup path', () => {
    const locked = ref(false);
    const button = vButton({ label: '保存', disabled: locked });
    const element = button.renderDom();

    expect(element.disabled).toBe(false);

    locked.value = true;

    expect(element.disabled).toBe(true);
  });

  it('keeps plain prop values working', () => {
    const field = vInput({ value: 'plain', placeholder: 'p' });
    const input = field.renderDom().querySelector('input');

    expect(input.value).toBe('plain');
    expect(input.getAttribute('placeholder')).toBe('p');
  });

  it('renders the value during the build before the node is rendered', () => {
    const name = ref('Ada');
    const field = vInput({ value: name });

    name.value = 'Grace';

    expect(field.toHTML()).toContain('value="Ada"');
  });
});
