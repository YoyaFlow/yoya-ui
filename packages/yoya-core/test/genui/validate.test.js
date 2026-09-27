import { describe, expect, it } from 'vitest';
import { createGenUI } from '../../src/genui/index.js';

describe('validate：校验声明', () => {
  it('失败规则把 message 物化到 /ui/errors 路径镜像，数据修正后自动清空', () => {
    const genui = createGenUI({
      functions: {
        matches: ({ value, pattern }) => new RegExp(pattern).test(value ?? ''),
        required: ({ value }) => String(value ?? '').trim() !== ''
      }
    });
    const surface = genui.fromJson({
      data: { form: { username: '' } },
      validate: {
        '@:/form/username': [
          {
            call: 'required',
            args: { value: '@:/form/username' },
            message: '用户名不能为空'
          },
          {
            call: 'matches',
            args: {
              value: '@:/form/username',
              pattern: '^[a-z0-9_]{3,20}$'
            },
            message: '用户名格式不正确'
          }
        ]
      },
      root: { type: 'p', text: '@:/ui/errors/form/username' }
    });
    const target = document.createElement('div');

    surface.bindTo(target);
    expect(target.querySelector('p').textContent).toBe('用户名不能为空');
    expect(surface.data.read('/ui/errors/form/username')).toBe('用户名不能为空');

    surface.data.write('/form/username', 'abc');
    expect(surface.data.read('/ui/errors/form/username')).toBeNull();

    surface.data.write('/form/username', '!');
    expect(target.querySelector('p').textContent).toBe('用户名格式不正确');
  });

  it('message 支持数据引用，可随文案状态变化', () => {
    const genui = createGenUI({
      functions: { required: ({ value }) => String(value ?? '').trim() !== '' }
    });
    const surface = genui.fromJson({
      data: { form: { name: '' }, i18n: { required: '必填项' } },
      validate: {
        '@:/form/name': [
          {
            call: 'required',
            args: { value: '@:/form/name' },
            message: '@:/i18n/required'
          }
        ]
      },
      root: { type: 'p', text: '@:/ui/errors/form/name' }
    });
    const target = document.createElement('div');

    surface.bindTo(target);
    expect(target.querySelector('p').textContent).toBe('必填项');

    surface.data.write('/i18n/required', '不能为空');
    expect(target.querySelector('p').textContent).toBe('不能为空');
  });

  it('validate 规则必须是数据域目标与规则数组', () => {
    const genui = createGenUI();

    expect(() =>
      genui.fromJson({
        validate: {
          '#name:/value': [{ call: 'required', args: {}, message: 'x' }]
        },
        root: { type: 'p' }
      })
    ).toThrow(/validate 目标必须是数据域绝对引用/);

    expect(() =>
      genui.fromJson({
        validate: { '@:/name': { call: 'required', args: {}, message: 'x' } },
        root: { type: 'p' }
      })
    ).toThrow(/validate 规则必须是数组/);
  });
});
