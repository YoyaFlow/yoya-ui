import { describe, expect, it, vi } from 'vitest';
import { createGenUI } from '../../src/genui/index.js';

async function clickSubmit(surface) {
  const target = document.createElement('div');
  surface.bindTo(target);
  target.querySelector('button').click();
  await Promise.resolve();
}

describe('collect：提交数据收集', () => {
  it('collect 在事件触发时拍 DataModel 子树快照进 params.data', async () => {
    const submit = vi.fn();
    const genui = createGenUI({ actions: { submit } });
    const surface = genui.fromJson({
      data: { order: { sku: '500ml', qty: 2, remark: '早上好' } },
      root: {
        type: 'button',
        props: { label: '提交' },
        on: {
          click: {
            $action: 'submit',
            params: { data: { collect: '@:/order' } }
          }
        }
      }
    });

    await clickSubmit(surface);
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { data: { sku: '500ml', qty: 2, remark: '早上好' } }
      })
    );

    surface.data.write('/order/qty', 3);
    await clickSubmit(surface);
    expect(submit).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: { data: { sku: '500ml', qty: 3, remark: '早上好' } } })
    );
  });

  it('fields 按映射重组，transform 只调用宿主注册函数', async () => {
    const submit = vi.fn();
    const genui = createGenUI({
      actions: { submit },
      functions: {
        payload: (data) => ({ ...data, source: 'genui' })
      }
    });
    const surface = genui.fromJson({
      data: { order: { sku: '500ml', qty: 2 }, ui: { locale: 'zh-CN' } },
      root: {
        type: 'button',
        on: {
          click: {
            $action: 'submit',
            params: {
              data: {
                fields: {
                  sku: '@:/order/sku',
                  quantity: '@:/order/qty',
                  locale: '@:/ui/locale'
                },
                transform: 'payload'
              }
            }
          }
        }
      }
    });

    await clickSubmit(surface);
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          data: { sku: '500ml', quantity: 2, locale: 'zh-CN', source: 'genui' }
        }
      })
    );
  });

  it('collect 动作被 validate gate 拦截，数据修正后才派发', async () => {
    const submit = vi.fn();
    const genui = createGenUI({
      actions: { submit },
      functions: { required: ({ value }) => String(value ?? '').trim() !== '' }
    });
    const surface = genui.fromJson({
      data: { form: { name: '' } },
      validate: {
        '@:/form/name': [
          {
            call: 'required',
            args: { value: '@:/form/name' },
            message: '必填'
          }
        ]
      },
      root: {
        type: 'button',
        on: {
          click: {
            $action: 'submit',
            params: { data: { collect: '@:/form' } }
          }
        }
      }
    });

    await clickSubmit(surface);
    expect(submit).not.toHaveBeenCalled();

    surface.data.write('/form/name', '小明');
    await clickSubmit(surface);
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ params: { data: { name: '小明' } } })
    );
  });

  it('collect 与 fields 不能混用', () => {
    const genui = createGenUI();

    expect(() =>
      genui.fromJson({
        root: {
          type: 'button',
          on: {
            click: {
              $action: 'submit',
              params: { data: { collect: '@:/order', fields: { sku: '@:/order/sku' } } }
            }
          }
        }
      })
    ).toThrow(/collect 与 fields 不能混用/);
  });
});
