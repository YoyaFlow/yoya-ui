import { computed, toast, vConfirm, vDialog, vNode, vText, vTr } from '@yoyaflow/yoya-ui';
import { fieldValue } from '../../../../shared/state.rows.js';
import { RowActionButton } from '../../../../shared/ui.buttons.js';
import { DictItemFormDialog } from './dict-item-form-dialog.js';
import { statusOptions, statusText } from '../utils/options.js';

const rowStyle = {
  alignItems: 'center',
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: '88px minmax(0, 1fr)',
  minWidth: '0'
};

// 字典编辑弹窗：上半部分是字典基本信息表单，下半部分维护该字典的字典值表格。
// 字典值表格绑 state.items 句柄，增删改写入信号后自动刷新，不需要手动重建行。
export function DictEditorDialog({ state, onSubmit }) {
  const dialog = vDialog();
  const itemDialog = DictItemFormDialog({ onSubmit: saveItem });
  let editingId = null;
  let form = null;

  dialog.style('maxWidth', 'min(92vw, 880px)');

  function open(type = null) {
    editingId = type?.id ?? null;
    // 写入 state.items（ref）即刷新弹窗里的字典值表格
    state.selectType(editingId);

    const name = fieldValue(type?.name) ?? '';
    const code = fieldValue(type?.code) ?? '';
    const status = fieldValue(type?.status) ?? 'active';
    const remark = fieldValue(type?.remark) ?? '';

    dialog.content((content) => {
      content.vstack({ gap: '16px' }, (stack) => {
        stack.h3(type ? `编辑字典「${name}」` : '新增字典');

        stack.vForm((editor) => {
          form = editor;
          editor.styles({
            border: '1px solid var(--yoya-color-border, #d8dee8)',
            borderRadius: '8px',
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            padding: '16px'
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('名称').name('name').required({ message: '请填写名称' });
            item.control((control) => control.vInput({ name: 'name', value: name }));
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('编码').name('code').required({ message: '请填写编码' });
            item.control((control) => control.vInput({ name: 'code', value: code }));
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('状态').name('status');
            item.control((control) =>
              control.vSelect({ name: 'status', options: statusOptions, value: status })
            );
          });
          editor.vFormItem((item) => {
            item.styles(rowStyle);
            item.label('备注').name('remark');
            item.control((control) => control.vInput({ name: 'remark', value: remark }));
          });
        });

        stack.section((section) => {
          section.vstack({ gap: '10px' }, (items) => {
            items.hstack({ alignItems: 'center', gap: '10px' }, (toolbar) => {
              toolbar.vButton('新增字典值', (btn) => {
                btn.variant('primary');
                btn.disabled(editingId === null);
                btn.on('click', () => itemDialog.open(null));
              });
              toolbar.spacer();
              toolbar.span((count) => {
                count.style('color', 'var(--yoya-color-text-muted, #64748b)');
                count.child(vText(computed(() => `共 ${state.items.value.length} 条`)));
              });
            });
            items.p((hint) => {
              hint.style('color', 'var(--yoya-color-text-muted, #64748b)');
              hint.child(
                editingId === null ? '保存字典类型后即可添加字典值。' : '维护当前字典的字典值。'
              );
            });
            items.vTable((table) => {
              table.vThead((head) => {
                head.vTr((row) => {
                  row.vTh('标签');
                  row.vTh('值');
                  row.vTh('排序');
                  row.vTh('状态');
                  row.vTh('操作');
                });
              });
              table.vTbody((tbody) => {
                tbody.keyed(
                  state.items,
                  (item) => item.id,
                  (item) => buildItemRow(item)
                );
              });
            });
          });
        });

        stack.hstack({ gap: '10px', justifyContent: 'flex-end' }, (footer) => {
          footer.vButton('取消', (btn) => btn.on('click', () => dialog.close()));
          footer.vButton('保存', (btn) => {
            btn.variant('primary');
            btn.on('click', () => save());
          });
        });

        stack.child(itemDialog);
      });
    });

    dialog.open(true);
  }

  function buildItemRow(item) {
    return vTr((row) => {
      row.vTd(vText(item.label));
      row.vTd(vText(item.value));
      row.vTd(vText(computed(() => String(item.sort.value))));
      row.vTd(vText(computed(() => statusText[item.status.value] ?? item.status.value)));
      row.vTd((cell) => {
        cell.hstack({ gap: '8px' }, (actions) => {
          actions.child(
            RowActionButton('编辑', (btn) => btn.on('click', () => itemDialog.open(item)))
          );
          actions.child(
            RowActionButton('删除', (btn) => {
              btn.variant('danger');
              btn.on('click', () => askRemoveItem(item));
            })
          );
        });
      });
    });
  }

  async function askRemoveItem(item) {
    const ok = await vConfirm({
      title: '删除字典值',
      content: `确定删除字典值「${item.label.value}」？`,
      danger: true,
      confirmText: '删除'
    });
    if (!ok) {
      return;
    }
    await state.removeItem(item.id);
    toast.success(`已删除字典值 ${item.label.value}`);
  }

  async function saveItem(itemId, payload) {
    if (itemId === null) {
      await state.addItem(payload);
      toast.success('已新增字典值');
    } else {
      await state.editItem(itemId, payload);
      toast.success('已更新字典值');
    }
  }

  function save() {
    if (!form.validate()) {
      return;
    }
    onSubmit(editingId, form.values()).then(() => dialog.close());
  }

  // 有对外命令方法（open / close）→ 形态 B：命令写在 api 上，视图就是自己的弹窗节点
  return vNode((api) => {
    api.open = (type = null) => {
      open(type);
      return api;
    };
    api.close = () => {
      dialog.close();
      return api;
    };

    return dialog;
  });
}
